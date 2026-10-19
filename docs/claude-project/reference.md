# CC Invest site — data reference & SQL recipes

Supabase project id: `snordgbqinafiitrcqcq`. Public site: `https://home.ccinvest.co.il`.
GitHub: `Ordvir123/ccinvest`. Production branch: `cloudflare-migration` (will become `main` after the switch-over — check `git branch -r` / Cloudflare if unsure).

## Tables

| table | what it holds |
|---|---|
| `pages` | `id uuid`, `slug text` (URL path, unique), `status` (`draft`/`published`/`archived`), `source_lang` (always `fr`), `content jsonb`, `seo jsonb`, `updated_at` |
| `page_translations` | `page_id`, `lang` (`he`/`en`), `content jsonb` (translated copy of `pages.content`), `source_hash text`, `locked_fields jsonb` — unique on (`page_id`,`lang`) |
| `media` | one row per uploaded file: `folder` (= page slug), `url` (`/media/...`), `filename`, `content_type`, `created_at` |
| `page_history` | automatic snapshot of the previous version before every update/delete of `pages` |
| `leads` | contact-form submissions — **read only** |

The row with slug `__template_settings__` holds global settings (spec presets, brand) — do not edit unless asked.

## `pages.content` shape

Copy the structure of `example-apartment.json` / `example-project.json`. Only non-empty fields render.

```
category: "apartment" | "project"
hero: { title, subtitle?, price?, background?: {url, alt}, overlay?: {color: "black"|"navy"|"deep_navy", opacity: 0–1, direction: "none"|"top"|"bottom"|"both"},
        kicker_i18n?: {fr, he, en}, cta_label_i18n?: {fr, he, en} }
stats: [{ value, label, icon? }]                 // short key numbers, e.g. {"value":"7","label":"étages"}
location?: { heading, text, map_query }           // map_query = address for Google Maps ("Allenby 28, Tel Aviv")
about?: { heading, body, features: [string] }
gallery: [{ url, alt }]
wide_images?: [{ url, alt }]                     // full-width images
videos?: [{ youtube_id, title? }]                // id only, e.g. "hQ5aYA_OPD8"
contact?: { heading_i18n?: {fr, he, en} }
section_headings?: { "<section id>": {fr, he, en} }   // e.g. {"gallery": {"fr":"Galerie de photos"}}

// apartment pages → a single block:
apartment: Unit
apartment_image_side?: "left" | "right"
// project pages → several units:
units: [Unit]
```

**Unit**: `name`, `unit_type?` (`apartment|penthouse|studio|duplex|other`), `unit_number?`, `floor?`, `rooms?`, `area_m2?`, `balcony_m2?`, `orientation?` (code `north|south|east|west|north_east|north_west|south_east|south_west` or free text), `parking?` (`one|none` or free text), `price?`, `description?`, `features?: [string]`, `image?: {url, alt}`, `attachment?: {url, type: "image"|"pdf"}` (floor plan).
Numbers are strings without units (`"60"`, not `"60 m²"`) — the site formats them per language.

Section order / duplicates (`section_order`, `extra_sections`, `hidden_sections`) are optional; omit them for a default layout. Section ids: `stats, location, about, listing, gallery, wide_images, videos, contact`; duplicates are `<type>#2`, `<type>#3`.

## `pages.seo` shape
```json
{ "fr": {"meta_title": "...", "meta_description": "..."}, "he": {...}, "en": {...} }
```
meta_title ≤ 60 chars, meta_description ≤ 155 chars. og_image optional (defaults to hero/gallery image).

## Translations (`page_translations.content`)
A **full copy of `pages.content`** with every human-readable text translated: hero title/subtitle, stat labels, location heading/text, about heading/body/features, image `alt`s, unit name/description/features, video titles, and the same inside `extra_sections`.
Leave URLs, numbers, prices, codes, `map_query`, `youtube_id` exactly as in the source. Street names: Hebrew spelling in `he`, Latin in `en`.
Set `source_hash` to `'claude'` and `locked_fields` to `'[]'`.

## Recipes

Use dollar-quoting (`$j$ ... $j$`) for JSON so quotes and apostrophes never need escaping.

**Media uploaded for a page**
```sql
select url, filename, content_type from media where folder = 'rue-allenby' order by created_at;
```

**Create a draft page**
```sql
insert into pages (slug, status, source_lang, content, seo)
values ('rue-allenby', 'draft', 'fr', $j${ ...content... }$j$::jsonb, $j${ ...seo... }$j$::jsonb)
returning id;
```
Slug: lowercase latin, hyphens, unique (`select 1 from pages where slug = '...'` first).

**Write / replace translations**
```sql
insert into page_translations (page_id, lang, content, source_hash, locked_fields)
values ('<page id>', 'he', $j${ ... }$j$::jsonb, 'claude', '[]'::jsonb),
       ('<page id>', 'en', $j${ ... }$j$::jsonb, 'claude', '[]'::jsonb)
on conflict (page_id, lang) do update
  set content = excluded.content, source_hash = excluded.source_hash, updated_at = now();
```

**Edit one field without touching the rest**
```sql
update pages set content = jsonb_set(content, '{hero,price}', '"4 950 000 ₪"') where slug = 'rue-allenby';
-- merge several top-level keys:
update pages set content = content || $j${"location": {...}, "about": {...}}$j$::jsonb where slug = 'rue-allenby';
```

**Publish / unpublish** (only on explicit request)
```sql
update pages set status = 'published' where slug = 'rue-allenby';
update pages set status = 'draft'     where slug = 'rue-allenby';
```

**See history and restore a previous version**
```sql
select id, op, status, changed_at from page_history
where page_id = (select id from pages where slug = 'rue-allenby') order by changed_at desc limit 10;

update pages p set content = h.content, seo = h.seo
from page_history h where h.id = <history id> and p.id = h.page_id;
```

**Pages missing translations**
```sql
select p.slug, array_agg(t.lang) langs from pages p
left join page_translations t on t.page_id = p.id
where p.slug <> '__template_settings__' group by p.slug
having count(t.lang) filter (where t.lang in ('he','en')) < 2;
```

## Code (features)
TanStack Start + React + Tailwind, deployed to Cloudflare Workers (`wrangler.jsonc`). Key places:
- `src/types/page.ts` — content types (source of truth for the shape above)
- `src/components/page/PageRenderer.tsx` — how a page renders
- `src/routes/` — pages and admin screens; `src/routes/api.media.ts`, `src/routes/media.$.ts` — media in R2
- `src/lib/site.ts` — site URL
Run `npm install`, `npx tsc --noEmit`, `npm run build` before proposing a merge.
