// Supabase Edge Function: extract-page
// -------------------------------------------------------------
// Paste raw property text (+ optional image/PDF assets) -> Claude ->
// structured PageContent JSON, with each asset placed in the right part of
// the page.
//
// Assets must already be uploaded to the PUBLIC "page-media" storage bucket;
// only their public URLs are sent to Claude (Claude fetches images/PDFs by URL).
//
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
const MAX_ASSETS = 18;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ANTHROPIC_MODEL = "claude-sonnet-4-6";

// ---- Input asset schema ----
const assetSchema = z.object({
  url: z.string().url(),
  kind: z.enum(["image", "pdf"]),
  filename: z.string(),
});
type Asset = z.infer<typeof assetSchema>;

// ---- PageContent schema (mirrors src/types/page.ts) ----
const mediaSchema = z.object({ url: z.string(), alt: z.string().optional() });
const statSchema = z.object({ value: z.coerce.string(), label: z.coerce.string() });
const unitAttachmentSchema = z.object({
  url: z.string(),
  type: z.enum(["image", "pdf"]),
});
const unitSchema = z.object({
  name: z.coerce.string(),
  floor: z.coerce.string().optional(),
  orientation: z.coerce.string().optional(),
  rooms: z.coerce.string().optional(),
  area_m2: z.coerce.string().optional(),
  balcony_m2: z.coerce.string().optional(),
  parking: z.coerce.string().optional(),
  description: z.coerce.string().optional(),
  price: z.coerce.string().optional(),
  image: mediaSchema.optional(),
  attachment: unitAttachmentSchema.optional(),
  features: z.array(z.coerce.string()).optional(),
});
const videoSchema = z.object({
  title: z.string().optional(),
  youtube_id: z.string(),
});

const pageContentSchema = z.object({
  hero: z
    .object({
      kicker: z.coerce.string().optional(),
      title: z.coerce.string().optional(),
      subtitle: z.coerce.string().optional(),
      price: z.coerce.string().optional(),
      cta_label: z.coerce.string().optional(),
      background: mediaSchema.optional(),
    })
    .optional(),
  stats: z.array(statSchema).optional(),
  location: z
    .object({
      heading: z.coerce.string().optional(),
      text: z.coerce.string().optional(),
      map_query: z.coerce.string().optional(),
    })
    .optional(),
  about: z
    .object({
      heading: z.coerce.string().optional(),
      body: z.coerce.string().optional(),
      features: z.array(z.coerce.string()).optional(),
    })
    .optional(),
  gallery: z.array(mediaSchema).optional(),
  gallery_layout: z.string().optional(),
  wide_images: z.array(mediaSchema).optional(),
  wide_images_layout: z.string().optional(),
  units: z.array(unitSchema).optional(),
  apartment: unitSchema.optional(),
  videos: z.array(videoSchema).optional(),
  contact: z.object({ heading: z.coerce.string().optional() }).optional(),
  // Tolerate duplicated section instances (the model is not asked to create
  // them, but existing pages passed back through must not be rejected).
  extra_sections: z
    .array(
      z.object({
        id: z.string(),
        type: z.enum(["about", "gallery", "wide_images", "videos", "stats"]),
        data: z.union([
          z.object({
            heading: z.coerce.string().optional(),
            body: z.coerce.string().optional(),
            features: z.array(z.coerce.string()).optional(),
            feature_icons: z.array(z.coerce.string()).optional(),
          }),
          z.array(mediaSchema),
          z.array(videoSchema),
          z.array(statSchema),
        ]),
        layout: z.string().optional(),
      }),
    )
    .optional(),
});

const BASE_RULES = `You extract a real-estate landing page from inputs (pasted text, and optionally image/PDF assets) into a strict JSON object.

OUTPUT SHAPE (TypeScript), include ONLY fields you can fill from the inputs:
{
  content: {
    hero: { kicker?, title?, subtitle?, price?, cta_label?, background?: { url, alt? } },
    stats: [{ value, label }],
    location: { heading?, text?, map_query? },
    about: { heading?, body?, features?: string[] },
    gallery: [{ url, alt? }],
    wide_images: [{ url, alt? }],
    units: [{ name, floor?, orientation?, rooms?, area_m2?, balcony_m2?, parking?, description?, price?, features?: string[], image?: { url, alt? }, attachment?: { url, type: "image"|"pdf" } }],
    videos: [{ title?, youtube_id }],
    contact: { heading? }
  },
  unplaced?: string[]   // asset URLs you could not confidently place
}

CRITICAL EXTRACTION RULES — follow exactly:
* Output ONLY valid JSON. No markdown, no prose, no code fences.
* Use ONLY information explicitly present in the inputs.
* If a field is not clearly stated, OMIT it entirely. Do NOT guess, infer, approximate, or fill from general knowledge. An absent field is correct; a fabricated field is a failure.
* Never invent prices, sizes, dates, names, or map coordinates.
* Preserve the source language of the text; do NOT translate.
* videos: include an entry only when an explicit YouTube URL is present; extract the 11-char id into youtube_id.
* map_query: only if a clear street/location is stated; else omit.`;

const MEDIA_RULES = `MEDIA PLACEMENT RULES — follow exactly:
* Use ONLY the EXACT asset URLs provided in the "Assets" list below. NEVER invent, guess, modify, or shorten a URL.
* Each asset URL may be used AT MOST ONCE across the entire output. Do NOT reuse the same URL in two places.
* hero.background: the single most impressive establishing/exterior shot (a building facade or wide establishing photo). One image only.
* gallery: interior and detail photos, best first. Give each a short French alt text describing the photo.
* wide_images: up to 2 clearly panoramic/landscape images (very wide aspect, sweeping views). If none clearly qualify, leave it empty/omit it.
* Floor plans (technical drawings — an image OR a PDF): attach to the matching unit as unit.attachment { url, type }. Match by unit name/number visible in the drawing or in the filename. If you cannot confidently match a floor plan to a unit, do NOT guess — put its URL in the top-level "unplaced" array.
* Brochure PDFs (marketing documents with descriptive text): read their text and use it as source content for hero/about/units/stats under the SAME extraction rules as the pasted text.
* Any asset you do not place anywhere goes into "unplaced".`;

const STRICT_COPY_RULE = `COPY MODE: strict — extraction only. Do NOT rewrite, polish, or expand copy. Use wording from the inputs.`;

const ENHANCED_COPY_RULE = `COPY MODE: enhanced — you MAY polish and expand MARKETING copy (hero.subtitle, about.body, unit descriptions) in an elegant, understated luxury real-estate tone, in French. This applies to descriptive prose ONLY. Factual data (prices, areas, floors, addresses, room counts, unit counts, dates, names) must come ONLY from the inputs and must NEVER be invented or altered.`;

function buildSystemPrompt(copyMode: "strict" | "enhanced"): string {
  return [
    BASE_RULES,
    MEDIA_RULES,
    copyMode === "enhanced" ? ENHANCED_COPY_RULE : STRICT_COPY_RULE,
  ].join("\n\n");
}

function stripFences(s: string): string {
  return s
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

async function callAnthropic(
  apiKey: string,
  text: string,
  sourceLang: string | undefined,
  assets: Asset[],
  copyMode: "strict" | "enhanced",
) {
  // Content blocks: image blocks first, then PDF (document) blocks, then text.
  const images = assets.filter((a) => a.kind === "image");
  const pdfs = assets.filter((a) => a.kind === "pdf");
  const ordered = [...images, ...pdfs];

  const blocks: unknown[] = [];
  for (const img of images) {
    blocks.push({ type: "image", source: { type: "url", url: img.url } });
  }
  for (const pdf of pdfs) {
    blocks.push({ type: "document", source: { type: "url", url: pdf.url } });
  }

  // Numbered asset manifest so the model can reference assets precisely.
  const assetLines = ordered
    .map((a, i) => `Asset ${i + 1}: ${a.filename} - ${a.url}`)
    .join("\n");

  const textParts: string[] = [];
  if (sourceLang) textParts.push(`Source language: ${sourceLang}`);
  if (ordered.length) {
    textParts.push(
      `Assets (use these EXACT URLs, each at most once):\n${assetLines}`,
    );
  }
  if (text) textParts.push(`Property text:\n"""\n${text}\n"""`);
  blocks.push({ type: "text", text: textParts.join("\n\n") });

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
      system: buildSystemPrompt(copyMode),
      messages: [{ role: "user", content: blocks }],
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

// Drop any media URL inside the content that is not one of the input assets.
// This is a hard safety net against the model inventing or reusing URLs.
function dropForeignMedia(
  content: Record<string, unknown>,
  allowed: Set<string>,
): Record<string, unknown> {
  const okMedia = (m: unknown): boolean =>
    !!m &&
    typeof m === "object" &&
    typeof (m as { url?: unknown }).url === "string" &&
    allowed.has((m as { url: string }).url);

  const hero = content.hero as Record<string, unknown> | undefined;
  if (hero && hero.background && !okMedia(hero.background)) {
    delete hero.background;
  }

  if (Array.isArray(content.gallery)) {
    content.gallery = content.gallery.filter(okMedia);
    if ((content.gallery as unknown[]).length === 0) delete content.gallery;
  }
  if (Array.isArray(content.wide_images)) {
    content.wide_images = content.wide_images.filter(okMedia);
    if ((content.wide_images as unknown[]).length === 0) delete content.wide_images;
  }

  const cleanUnit = (unit: Record<string, unknown>) => {
    if (unit.image && !okMedia(unit.image)) delete unit.image;
    const att = unit.attachment as { url?: unknown } | undefined;
    if (att && !(typeof att.url === "string" && allowed.has(att.url))) {
      delete unit.attachment;
    }
  };
  if (Array.isArray(content.units)) {
    for (const u of content.units) {
      if (u && typeof u === "object") cleanUnit(u as Record<string, unknown>);
    }
  }
  if (content.apartment && typeof content.apartment === "object") {
    cleanUnit(content.apartment as Record<string, unknown>);
  }

  return content;
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

    // Require an authenticated user — this is an admin-only, cost-bearing endpoint.
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const supaUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!token || !supaUrl || !serviceKey) {
      return json({ error: "Unauthorized." }, 401);
    }
    const authClient = createClient(supaUrl, serviceKey);
    const { data: userData, error: authError } = await authClient.auth.getUser(token);
    if (authError || !userData?.user) {
      return json({ error: "Unauthorized." }, 401);
    }

    const input = await req.json().catch(() => null);
    const text = typeof input?.text === "string" ? input.text.trim() : "";
    const sourceLang = ["fr", "he", "en"].includes(input?.source_lang)
      ? input.source_lang
      : undefined;
    const copyMode: "strict" | "enhanced" =
      input?.copyMode === "enhanced" ? "enhanced" : "strict";

    // Validate assets.
    let assets: Asset[] = [];
    if (input?.assets !== undefined) {
      const parsedAssets = z.array(assetSchema).max(MAX_ASSETS).safeParse(input.assets);
      if (!parsedAssets.success) {
        return json({ error: "Invalid assets payload." }, 400);
      }
      assets = parsedAssets.data;
    }

    // SECURITY: every asset URL must live in THIS project's public page-media
    // bucket. This prevents the function being used to fetch arbitrary URLs.
    const allowedPrefix = `${supaUrl}/storage/v1/object/public/page-media/`;
    for (const a of assets) {
      if (!a.url.startsWith(allowedPrefix)) {
        return json(
          { error: "Asset URLs must point to the page-media storage bucket." },
          400,
        );
      }
    }

    if (!text && assets.length === 0) {
      return json({ error: "No text or assets provided." }, 400);
    }
    if (text.length > MAX_TEXT_LENGTH) {
      return json({ error: "Text exceeds the maximum allowed length." }, 400);
    }

    // Call model, parse JSON, retry once on parse failure.
    let parsed: unknown = null;
    let lastRaw = "";
    for (let attempt = 0; attempt < 2; attempt++) {
      const result = await callAnthropic(apiKey, text, sourceLang, assets, copyMode);
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

    if (parsed === null || typeof parsed !== "object") {
      console.error("[extract-page] JSON parse failed. Raw:", lastRaw.slice(0, 500));
      return json({ error: "The AI response could not be parsed. Please try again." }, 502);
    }

    // The model returns { content, unplaced? }. Tolerate it returning the
    // content object directly (older shape) by falling back.
    const obj = parsed as Record<string, unknown>;
    const rawContent =
      obj.content && typeof obj.content === "object" ? obj.content : obj;

    // Validate (strip unknown fields), then prune empties.
    const validated = pageContentSchema.safeParse(rawContent);
    if (!validated.success) {
      console.error("[extract-page] schema validation failed:", validated.error.message);
      return json({ error: "The AI response did not match the expected shape." }, 502);
    }

    const pruned = (prune(validated.data) ?? {}) as Record<string, unknown>;

    // Hard safety net: strip any media URL that is not one of the input assets.
    const allowedUrls = new Set(assets.map((a) => a.url));
    dropForeignMedia(pruned, allowedUrls);

    // Collect unplaced asset URLs the model reported (only real, allowed URLs).
    let unplaced: string[] | undefined;
    if (Array.isArray(obj.unplaced)) {
      const list = obj.unplaced.filter(
        (u): u is string => typeof u === "string" && allowedUrls.has(u),
      );
      if (list.length) unplaced = Array.from(new Set(list));
    }

    return json(unplaced ? { content: pruned, unplaced } : { content: pruned });
  } catch (err) {
    console.error("[extract-page] unexpected error:", err);
    return json({ error: "Unexpected server error." }, 500);
  }
});
