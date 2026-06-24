# translate-page edge function

On-the-fly translation with a DB cache for Slice 4.

## Required secret

```
ANTHROPIC_API_KEY
```

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are auto-injected by Supabase and
used for the privileged cache write into `page_translations` (anon visitors stay
read-only via RLS).

## Deploy

```bash
supabase functions deploy translate-page
```

## Migration

Run `db/slice4.sql` once to add the `locked_fields` column to
`public.page_translations`.

## Contract

- Input: `{ content: PageContent, source_lang, target_lang, page_id?, force? }`
- Output: `{ content: PageContent, cached?: boolean }`
- When `page_id` is provided it resolves the cache:
  - cache hit when the stored `source_hash` matches the current source hash and
    `force` is false → returns cached content
  - otherwise it translates, preserves any `locked_fields`, upserts the row, and
    returns the fresh translation
- Numbers/prices/areas, image URLs, `youtube_id`, `map_query`, and proper nouns
  are preserved untranslated. Empty source fields stay empty.
