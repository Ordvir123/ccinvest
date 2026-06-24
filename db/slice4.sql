-- Slice 4 — translation engine support
-- Adds per-field lock tracking to page_translations.
-- source_hash already exists (slice1). Run this against your Supabase project.

alter table public.page_translations
  add column if not exists locked_fields jsonb not null default '[]'::jsonb;

-- locked_fields: array of dot-path strings (e.g. ["hero.title","about.body"])
-- whose manually-edited translated values must NOT be overwritten by
-- auto-translation. The translate-page edge function preserves these.
