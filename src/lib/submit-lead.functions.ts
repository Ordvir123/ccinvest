import { createServerFn } from "@tanstack/react-start";
import { getRequestIP } from "@tanstack/start-server-core";
import { z } from "zod";


/**
 * Public lead-capture endpoint (contact form on landing pages).
 *
 * Inserts the lead with the service-role key (RLS-bypass), then best-effort
 * sends a notification email via Resend. The lead is ALWAYS saved even if the
 * email fails — we never lose a lead.
 */

import { SITE_ORIGIN } from "@/lib/site";

// Best-effort in-memory per-IP rate limiter. State lives inside a single
// Cloudflare Worker isolate, so this is not distributed — but combined with
// the honeypot it blocks the easy burst-abuse case without new infra.
const RATE: Map<string, { count: number; ts: number }> = new Map();
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_PER_WINDOW = 5;
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = RATE.get(ip);
  if (!entry || now - entry.ts > RATE_WINDOW_MS) {
    RATE.set(ip, { count: 1, ts: now });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_MAX_PER_WINDOW;
}

const leadSchema = z.object({
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().max(60).optional().default(""),
  email: z.string().trim().email().max(255),
  message: z.string().trim().max(2000).optional().default(""),
  lang: z.string().trim().max(8).optional().default(""),
  page_id: z.string().uuid().optional().nullable(),
  page_slug: z.string().trim().max(200).optional().default(""),
  project_title: z.string().trim().max(300).optional().default(""),
  // Honeypot: must stay empty.
  company: z.string().optional().default(""),
});

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const submitLeadFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => leadSchema.parse(input))
  .handler(async ({ data }) => {
    // Honeypot: pretend success, silently drop.
    if (data.company && data.company.trim().length > 0) {
      return { ok: true, emailSent: false };
    }

    // Best-effort per-IP rate limit.
    try {
      const ip = getRequestIP({ xForwardedFor: true }) ?? "unknown";
      if (rateLimited(ip)) throw new Error("Too many requests. Please try again in a minute.");
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("Too many")) throw err;
      // Request context unavailable — skip rate limit rather than block legitimate leads.
    }


    const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    // Canonical name is SUPABASE_SERVICE_ROLE_KEY (matches edge functions'
    // auto-injected name). Keep EXTERNAL_SUPABASE_SERVICE_ROLE_KEY as a
    // transition-period fallback until the workspace secret is renamed.
    const serviceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ??
      process.env.EXTERNAL_SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      console.error("[submit-lead] Missing Supabase URL or service role key.");
      throw new Error("Could not save lead.");
    }


    // 1) Insert the lead (service role bypasses RLS).
    const insertRes = await fetch(`${url}/rest/v1/leads`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        page_id: data.page_id ?? null,
        page_slug: data.page_slug || null,
        name: data.name,
        phone: data.phone || null,
        email: data.email,
        message: data.message || null,
        lang: data.lang || null,
        status: "new",
      }),
    });

    if (!insertRes.ok) {
      const body = await insertRes.text().catch(() => "");
      console.error("[submit-lead] insert failed", insertRes.status, body.slice(0, 500));
      throw new Error("Could not save lead.");
    }

    // 2) Notify by email (best-effort; never blocks the lead). The email is sent
    //    from Sarah's own Google account by a small Apps Script web app
    //    (see docs/lead-notifications.md) — no mail provider or DNS records needed.
    let emailSent = false;
    const hookUrl = process.env.LEADS_WEBHOOK_URL;
    const hookSecret = process.env.LEADS_WEBHOOK_SECRET;
    if (hookUrl && hookSecret) {
      const title = data.project_title || data.page_slug || "Site";
      const liveLink = data.page_slug ? `${SITE_ORIGIN}/${data.page_slug}` : SITE_ORIGIN;
      const html = `
        <h2>Nouveau lead — ${esc(title)}</h2>
        <p><strong>Nom :</strong> ${esc(data.name)}</p>
        <p><strong>Téléphone :</strong> ${esc(data.phone || "—")}</p>
        <p><strong>Email :</strong> ${esc(data.email)}</p>
        <p><strong>Message :</strong><br>${esc(data.message || "—").replace(/\n/g, "<br>")}</p>
        <hr>
        <p><strong>Page :</strong> <a href="${esc(liveLink)}">${esc(title)}</a></p>
        <p><strong>Langue :</strong> ${esc(data.lang || "—")}</p>
      `;
      try {
        const resp = await fetch(hookUrl, {
          method: "POST",
          headers: { "Content-Type": "text/plain" },
          body: JSON.stringify({
            secret: hookSecret,
            subject: `Nouveau lead — ${title}`,
            html,
            replyTo: data.email,
          }),
        });
        emailSent = resp.ok;
        if (!resp.ok) console.error("[submit-lead] webhook error", resp.status);
      } catch (err) {
        console.error("[submit-lead] webhook send error", err);
      }
    } else {
      console.warn("[submit-lead] LEADS_WEBHOOK_URL/SECRET not configured — email skipped.");
    }

    return { ok: true, emailSent };
  });
