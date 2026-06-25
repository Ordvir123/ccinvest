// Supabase Edge Function: submit-lead
// -------------------------------------------------------------
// Public contact-form endpoint. Validates input server-side, inserts the
// lead with the service role, then sends a notification email via Resend.
// The lead is ALWAYS saved even if the email fails (we never lose a lead).
//
// Required secrets:
//   SUPABASE_URL                (auto-provided)
//   SUPABASE_SERVICE_ROLE_KEY   (auto-provided)
//   RESEND_API_KEY              (set manually)
//
// Deploy:  supabase functions deploy submit-lead
// Secret:  supabase secrets set RESEND_API_KEY=re_...
// -------------------------------------------------------------

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const LEAD_RECIPIENTS = ["sarah@ccinvest.co.il", "corinne@ccinvest.co.il"];
const FROM = "CC Invest <no-reply@ccinvest.co.il>";
const SITE_ORIGIN = "https://ccinvest.lovable.app";

// Simple in-memory rate limit per IP (best-effort; resets on cold start).
const RATE: Map<string, { count: number; ts: number }> = new Map();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;

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

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = RATE.get(ip);
  if (!entry || now - entry.ts > WINDOW_MS) {
    RATE.set(ip, { count: 1, ts: now });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (rateLimited(ip)) {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "Validation failed", details: parsed.error.flatten() }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  const data = parsed.data;

  // Honeypot: pretend success, silently drop.
  if (data.company && data.company.trim().length > 0) {
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // 1) Insert the lead first — this must succeed before anything else.
  const { data: lead, error: insertError } = await supabase
    .from("leads")
    .insert({
      page_id: data.page_id ?? null,
      page_slug: data.page_slug || null,
      name: data.name,
      phone: data.phone || null,
      email: data.email,
      message: data.message || null,
      lang: data.lang || null,
      status: "new",
    })
    .select("id")
    .single();

  if (insertError) {
    console.error("[submit-lead] insert failed:", insertError);
    return new Response(JSON.stringify({ error: "Could not save lead" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 2) Send the notification email (non-blocking for the lead). If this fails,
  //    we still return success because the lead is already saved.
  let emailWarning: string | null = null;
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    emailWarning = "RESEND_API_KEY not configured";
    console.warn("[submit-lead] " + emailWarning);
  } else {
    const title = data.project_title || data.page_slug || "Unknown project";
    const liveLink = data.page_slug
      ? `${SITE_ORIGIN}/${data.page_slug}`
      : SITE_ORIGIN;
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
      if (!resp.ok) {
        emailWarning = `Resend responded ${resp.status}: ${await resp.text()}`;
        console.error("[submit-lead] " + emailWarning);
      }
    } catch (err) {
      emailWarning = `Email send error: ${err instanceof Error ? err.message : String(err)}`;
      console.error("[submit-lead] " + emailWarning);
    }
  }

  // Never leak internal email-provider error details to the client. Detailed
  // errors are logged server-side above; expose only a generic boolean flag.
  return new Response(
    JSON.stringify({ ok: true, id: lead.id, emailSent: emailWarning === null }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
