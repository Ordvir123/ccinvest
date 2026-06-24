-- ============================================================
-- SLICE 5 — migrate single-language seo -> per-language seo
-- ============================================================
-- The `seo` jsonb used to be flat: { meta_title, meta_description, canonical }.
-- It is now per-language: { "<lang>": { meta_title, meta_description,
--   canonical, og_title, og_description, og_image } }.
--
-- This transform is IDEMPOTENT: it only rewrites rows whose seo still has a
-- top-level "meta_title" (the legacy shape) and folds those fields under the
-- page's source language. Rows already migrated (no top-level meta_title) are
-- left untouched. Nothing is fabricated — empty fields stay absent.

UPDATE public.pages
SET seo = jsonb_build_object(
  source_lang,
  (
    SELECT jsonb_object_agg(k, v)
    FROM jsonb_each(seo) AS e(k, v)
    WHERE k IN ('meta_title', 'meta_description', 'canonical',
                'og_title', 'og_description', 'og_image')
      AND v IS NOT NULL
      AND v::text <> '""'
  )
)
WHERE seo ? 'meta_title';

-- Note: the app also normalizes legacy seo at read time (see normalizeSeo in
-- src/types/page.ts), so the UI is safe to use even before this runs.
