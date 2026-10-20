# CC Invest — home.ccinvest.co.il

Real-estate landing pages for Corinne Cohen Invest (Tel Aviv). Content is French first, translated to Hebrew (RTL) and English.
Pages are written by Claude in Sarah's Claude project, straight into the database; the admin is for photos, previews and small edits.

## Stack
- TanStack Start (React 19, SSR) + Tailwind v4, built with Vite, deployed to **Cloudflare Workers** (`wrangler.jsonc`).
- **Supabase** (project `snordgbqinafiitrcqcq`, org "CC Invest") — tables `pages`, `page_translations`, `media`, `page_history`, `leads`, `admin_users`. Full schema: `db/schema.sql`.
- **Cloudflare R2** bucket `ccinvest-media` (binding `MEDIA`) — every uploaded image/PDF, served at `/media/<key>`.

## Where things are
| Area | Files |
|---|---|
| Page content types (source of truth) | `src/types/page.ts` |
| Public page rendering | `src/components/page/PageRenderer.tsx`, `src/routes/$slug.tsx` |
| Listings / home / about | `src/routes/index.tsx`, `appartements.tsx`, `projects.tsx`, `about.tsx`, `src/components/site/*` |
| Admin | `src/routes/_admin*.tsx`, `src/components/admin/*` |
| Media upload / serving | `src/lib/media.ts` (client), `src/routes/api.media.ts`, `src/routes/media.$.ts`, `src/lib/image-compress.ts` |
| Contact form → leads + email | `src/components/page/ContactForm.tsx`, `src/lib/submit-lead.functions.ts`, `docs/lead-notifications.md` |
| Site URL, WhatsApp number | `src/lib/site.ts` |
| Translations | stored in `page_translations` (written by Claude); `src/lib/translate.ts` reads them |
| Claude project docs (data shape, SQL recipes) | `docs/claude-project/` |

## Rules
- Branch from the production branch, open a PR, let Cloudflare build the preview link, and merge only when Sarah or Or says so.
- Before proposing a merge: `npm install && npx tsc --noEmit && npm run build`.
- Database changes only as a migration, mirrored into `db/schema.sql`.
- Only render non-empty data (see `hasText` / `hasItems`); every visible string must work in fr / he (RTL) / en.
- Images: never bypass `compressImage` on upload; use `responsiveProps()` for new `<img>` of managed media.
- Never commit secrets. Runtime secrets live in the Cloudflare Worker settings (`.env.example` lists them).
