# Slice 6 — Publish, prerender & lead capture

## 1. Database
Run `db/slice6.sql` in the Supabase SQL editor (creates the `leads` table,
grants, and RLS: anon INSERT only, authenticated read/update).

## 2. Edge functions
```bash
supabase functions deploy og --no-verify-jwt
supabase functions deploy submit-lead --no-verify-jwt
# also ensure the earlier slices are deployed:
supabase functions deploy extract-page
supabase functions deploy translate-page
```

## 3. Secrets
```bash
supabase secrets set RESEND_API_KEY=re_xxx
```
`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically to
edge functions.

## 4. Resend sending domain
Verify the `ccinvest.co.il` domain in Resend (add SPF/DKIM DNS records) so
mail from `no-reply@ccinvest.co.il` is accepted. Lead notifications go to
**sarah@ccinvest.co.il** and **corinne@ccinvest.co.il** with `Reply-To` set
to the prospect's email.

## How it works
- **Publish flow:** the editor "Publish"/"Unpublish" buttons flip
  `pages.status`. Publishing validates slug (present + unique) and hero title.
  "Copy share link" supports `?lang=fr|he|en`.
- **Scraper prerender:** the `/$slug` route resolves per-language SEO in its
  SSR loader and emits `<title>`, description, canonical, Open Graph + Twitter
  tags server-side (fallback to source language; og:image falls back to cover
  then first gallery/unit image, always absolute https). Humans hydrate into
  the full SPA. The `og` edge function provides the same HTML for any UA-based
  bot routing you wish to add at the CDN/host level.
- **Lead capture:** the public contact form posts to the `submit-lead` edge
  function (honeypot + per-IP rate limit). The lead is saved first; the email
  is best-effort — a failed email never loses the lead.
- **URL preservation:** slugs match the old WordPress paths
  (e.g. `/montefiore-allenby`). `sitemap.xml` (with hreflang alternates) and
  `robots.txt` are served from the app.
