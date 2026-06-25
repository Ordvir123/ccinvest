// Supabase Edge Function: extract-page
// -------------------------------------------------------------
// Paste raw property text -> Claude -> structured PageContent JSON.
// The Anthropic key lives ONLY here, in function secrets.
//
// Required secret (set with the Supabase CLI / dashboard):
//   ANTHROPIC_API_KEY
//
// Deploy:  supabase functions deploy extract-page
// Secret:  supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
// -------------------------------------------------------------

import { z } from "https://esm.sh/zod@3.23.8";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

// Hard cap on input text to prevent AI-cost abuse via huge payloads.
const MAX_TEXT_LENGTH = 20_000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ANTHROPIC_MODEL = "claude-sonnet-4-6";

// ---- PageContent schema (mirrors src/types/page.ts) ----
const mediaSchema = z.object({ url: z.string(), alt: z.string().optional() });
const statSchema = z.object({ value: z.string(), label: z.string() });
const unitSchema = z.object({
  name: z.string(),
  floor: z.string().optional(),
  orientation: z.string().optional(),
  rooms: z.string().optional(),
  area_m2: z.string().optional(),
  balcony_m2: z.string().optional(),
  parking: z.string().optional(),
  description: z.string().optional(),
  price: z.string().optional(),
  features: z.array(z.string()).optional(),
});
const videoSchema = z.object({
  title: z.string().optional(),
  youtube_id: z.string(),
});

const pageContentSchema = z.object({
  hero: z
    .object({
      kicker: z.string().optional(),
      title: z.string().optional(),
      subtitle: z.string().optional(),
      price: z.string().optional(),
      cta_label: z.string().optional(),
    })
    .optional(),
  stats: z.array(statSchema).optional(),
  location: z
    .object({
      heading: z.string().optional(),
      text: z.string().optional(),
      map_query: z.string().optional(),
    })
    .optional(),
  about: z
    .object({
      heading: z.string().optional(),
      body: z.string().optional(),
      features: z.array(z.string()).optional(),
    })
    .optional(),
  gallery: z.array(mediaSchema).optional(),
  units: z.array(unitSchema).optional(),
  videos: z.array(videoSchema).optional(),
  contact: z.object({ heading: z.string().optional() }).optional(),
});

const SYSTEM_PROMPT = `You extract a real-estate landing page from raw text into a strict JSON object.

OUTPUT SHAPE (TypeScript), include ONLY fields you can fill from the text:
{
  hero: { kicker?, title?, subtitle?, price?, cta_label? },
  stats: [{ value, label }],
  location: { heading?, text?, map_query? },
  about: { heading?, body?, features?: string[] },
  gallery: [],            // ALWAYS empty — images are never in text; never invent URLs
  units: [{ name, floor?, orientation?, rooms?, area_m2?, balcony_m2?, parking?, description?, price?, features?: string[] }],
  videos: [{ title?, youtube_id }],   // empty unless an explicit YouTube URL appears
  contact: { heading? }
}

CRITICAL RULES — follow exactly:
* Output ONLY valid JSON. No markdown, no prose, no code fences.
* Use ONLY information explicitly present in the text.
* If a field is not clearly stated, OMIT it entirely. Do NOT guess, infer, approximate, or fill from general knowledge. An absent field is correct; a fabricated field is a failure.
* Never invent prices, sizes, dates, names, URLs, or map coordinates.
* Preserve the source language of the text; do NOT translate.
* gallery MUST be [] (empty array).
* videos: include an entry only when an explicit YouTube URL is present; extract the 11-char id into youtube_id.
* map_query: only if a clear street/location is stated; else omit.`;

function stripFences(s: string): string {
  return s
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

async function callAnthropic(apiKey: string, text: string, sourceLang?: string) {
  const userPrompt =
    (sourceLang ? `Source language: ${sourceLang}\n\n` : "") +
    `Property text:\n"""\n${text}\n"""`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { ok: false as const, status: res.status, body };
  }
  const data = await res.json();
  const out = (data?.content ?? [])
    .filter((b: any) => b?.type === "text")
    .map((b: any) => b.text)
    .join("");
  return { ok: true as const, text: out as string };
}

// Recursively drop empty strings, empty arrays, and empty objects.
function prune(value: unknown): unknown {
  if (typeof value === "string") {
    const s = value.trim();
    return s.length ? s : undefined;
  }
  if (Array.isArray(value)) {
    const arr = value.map(prune).filter((v) => v !== undefined);
    return arr.length ? arr : undefined;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      const pv = prune(v);
      if (pv !== undefined) out[k] = pv;
    }
    return Object.keys(out).length ? out : undefined;
  }
  return value;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });

  try {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return json({ error: "Server is missing ANTHROPIC_API_KEY." }, 500);
    }

    const input = await req.json().catch(() => null);
    const text = typeof input?.text === "string" ? input.text.trim() : "";
    const sourceLang = ["fr", "he", "en"].includes(input?.source_lang)
      ? input.source_lang
      : undefined;

    if (!text) return json({ error: "No text provided." }, 400);

    // Call model, parse JSON, retry once on parse failure.
    let parsed: unknown = null;
    let lastRaw = "";
    for (let attempt = 0; attempt < 2; attempt++) {
      const result = await callAnthropic(apiKey, text, sourceLang);
      if (!result.ok) {
        if (result.status === 401) return json({ error: "Invalid Anthropic API key." }, 502);
        if (result.status === 429) return json({ error: "Rate limited by the AI provider. Try again shortly." }, 429);
        return json({ error: `AI provider error (${result.status}).` }, 502);
      }
      lastRaw = result.text;
      try {
        parsed = JSON.parse(stripFences(result.text));
        break;
      } catch {
        parsed = null; // retry
      }
    }

    if (parsed === null) {
      console.error("[extract-page] JSON parse failed. Raw:", lastRaw.slice(0, 500));
      return json({ error: "The AI response could not be parsed. Please try again." }, 502);
    }

    // Validate (strip unknown fields), then prune empties.
    const validated = pageContentSchema.safeParse(parsed);
    if (!validated.success) {
      console.error("[extract-page] schema validation failed:", validated.error.message);
      return json({ error: "The AI response did not match the expected shape." }, 502);
    }

    const pruned = (prune(validated.data) ?? {}) as Record<string, unknown>;
    // gallery is never extracted from text.
    delete pruned.gallery;

    return json({ content: pruned });
  } catch (err) {
    console.error("[extract-page] unexpected error:", err);
    return json({ error: "Unexpected server error." }, 500);
  }
});
