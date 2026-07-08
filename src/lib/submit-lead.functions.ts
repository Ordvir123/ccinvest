import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Public lead-capture endpoint (contact form on landing pages).
 *
 * Replaces the old `submit-lead` Supabase edge function, which is not deployed
 * on the external project (calls 404'd) — and anon direct inserts are blocked
 * by RLS. This server function inserts the lead with the service role key
 * (bypassing RLS) and then best-effort sends a notification email via Resend.
 * The lead is ALWAYS saved even if the email fails — we never lose a lead.
 */

const LEAD_RECIPIENTS = ["sarah@ccinvest.co.il", "corinne@ccinvest.co.il"];
const FROM = "CC Invest <no-reply@ccinvest.co.il>";
const SITE_ORIGIN = "https://ccinvest.lovable.app";

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

    const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    const serviceKey = process.env.EXTERNAL_SUPABASE_SERVICE_ROLE_KEY;
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

    // 2) Send the notification email (best-effort; never blocks the lead).
    let emailSent = false;
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      const title = data.project_title || data.page_slug || "Unknown project";
      const liveLink = data.page_slug ? `${SITE_ORIGIN}/${data.page_slug}` : SITE_ORIGIN;
      const subject = `New lead — ${title} (${data.lang || "?"})`;
      const html = `
        <h2>New lead from ${esc(title)}</h2>
        <p><strong>Name:</strong> ${esc(data.name)}</p>
        <p><strong>Phone:</strong> ${esc(data.phone || "—")}</p>
        <p><strong>Email:</strong> ${esc(data.email)}</p>
        <p><strong>Message:</strong><br>${esc(data.message || "—").replace(/\n/g, "<br>")}</p>
        <hr>
        <p><strong>Project:</strong> <a href="${esc(liveLink)}">${esc(title)}</a></p>
        <p><strong>Language:</strong> ${esc(data.lang || "—")}</p>
        <p><strong>Received:</strong> ${new Date().toISOString()}</p>
      `;
      try {
        const resp = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: FROM,
            to: LEAD_RECIPIENTS,
            reply_to: data.email,
            subject,
            html,
          }),
        });
        emailSent = resp.ok;
        if (!resp.ok) {
          console.error("[submit-lead] Resend error", resp.status, await resp.text().catch(() => ""));
        }
      } catch (err) {
        console.error("[submit-lead] email send error", err);
      }
    } else {
      console.warn("[submit-lead] RESEND_API_KEY not configured — email skipped.");
    }

    return { ok: true, emailSent };
  });
