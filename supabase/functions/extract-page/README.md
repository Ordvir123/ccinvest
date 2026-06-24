# extract-page edge function

Server-side AI ingestion for Slice 3. Paste raw property text → Claude →
structured `PageContent` JSON used to pre-fill the editor form.

## Required secret

The Anthropic key lives ONLY in the edge function secrets — never in client code:

```
ANTHROPIC_API_KEY
```

Set it with:

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```

## Deploy

```bash
supabase functions deploy extract-page
```

## Contract

- Input: `{ text: string, source_lang?: 'fr' | 'he' | 'en' }`
- Output: `{ content: PageContent }` (partial — only facts present in the text)
- Errors: `{ error: string }` with appropriate HTTP status (400 / 429 / 500 / 502)

The function uses model `claude-sonnet-4-6`, parses/validates the JSON with zod,
strips unknown fields, drops empty values, and never invents data. `gallery` is
always empty (images never come from text).
