import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Extract a structured PageContent from raw property text using Lovable AI.
 * Replaces the old Anthropic edge function — no external key, no deploy needed.
 *
 * Auth: the caller passes its Supabase access token; we verify it against the
 * project's auth endpoint so this cost-bearing endpoint is not fully public.
 */

const MAX_TEXT_LENGTH = 20_000;

const mediaSchema = z.object({ url: z.string(), alt: z.string().optional() });
const statSchema = z.object({ value: z.string(), label: z.string() });
const detailRowSchema = z.object({
  presetKey: z.string().optional(),
  linked: z.boolean().optional(),
  label: z.string().optional(),
  icon: z.string().optional(),
  value: z.string().optional(),
});
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
  specs: z.array(detailRowSchema).optional(),
  featureRows: z.array(detailRowSchema).optional(),
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
  units: [{ name, description?, price?, specs?: [{ presetKey?, value }], featureRows?: [{ value }] }],
  videos: [{ title?, youtube_id }],   // empty unless an explicit YouTube URL appears
  contact: { heading? }
}

DETAIL ROWS:
* Put each apartment attribute in "specs" as a row { presetKey, value }. Known presetKeys: "floor", "rooms", "area" (m²), "balcony" (m²), "orientation", "parking". For anything else, omit presetKey and provide { label, value } instead.
* For "area"/"balcony" the value is the number only (no "m²"). For "floor"/"rooms" the value is the number only. For "orientation" use one of: north, south, east, west, north_east, north_west, south_east, south_west. For "parking" use "one" or "none".
* Put highlights/amenities in "featureRows" as { value } items.

CRITICAL RULES — follow exactly:
* Output ONLY valid JSON. No markdown, no prose, no code fences.
* Use ONLY information explicitly present in the text.
* If a field is not clearly stated, OMIT it entirely. Do NOT guess, infer, approximate, or fill from general knowledge. An absent field is correct; a fabricated field is a failure.
* Never invent prices, sizes, dates, names, URLs, or map coordinates.
* The source text may be in ANY language (French, Hebrew, English, etc.). Auto-detect it and ALWAYS write every output field in FRENCH. Translate any non-French content into natural, fluent French. Do NOT keep the original language.
* Keep untranslated: numbers, prices, areas, dates, image URLs, youtube_id, map_query, and proper nouns (project/street/brand names).
* MATCH THE HOUSE STYLE: when example pages are provided below, mirror their tone, sentence length, section usage, and how specs/features are phrased. Reuse the same presetKeys and feature phrasing conventions.
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

const inputSchema = z.object({
  text: z.string().min(1).max(MAX_TEXT_LENGTH),
  sourceLang: z.enum(["fr", "he", "en"]).optional(),
  category: z.enum(["apartment", "project"]).optional(),
  accessToken: z.string().min(1),
});

/** Verify the caller is a logged-in user of this Supabase project. */
async function verifyUser(accessToken: string): Promise<boolean> {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
  if (!url || !key) return false;
  try {
    const res = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: key, Authorization: `Bearer ${accessToken}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Load a few existing published pages so the model can learn the account's
 * house style (tone, section usage, spec/feature phrasing). Best-effort: on any
 * failure we simply return no examples.
 */
async function fetchStyleExamples(
  accessToken: string,
  category: string | undefined,
): Promise<string> {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
  if (!url || !key) return "";
  try {
    const params = new URLSearchParams({
      select: "content,slug",
      status: "eq.published",
      slug: "neq.__template_settings__",
      order: "updated_at.desc",
      limit: "4",
    });
    const res = await fetch(`${url}/rest/v1/pages?${params.toString()}`, {
      headers: { apikey: key, Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return "";
    const rows = (await res.json()) as { content?: Record<string, unknown> }[];
    // Strip media + heavy fields; keep only the text/structure that defines style.
    const clean = (c: Record<string, unknown>) => {
      const copy = JSON.parse(JSON.stringify(c ?? {}));
      delete copy.gallery;
      if (copy.hero) delete copy.hero.background;
      const stripImg = (u: Record<string, unknown>) => {
        if (u) {
          delete u.image;
          delete u.attachment;
        }
        return u;
      };
      if (Array.isArray(copy.units)) copy.units.forEach(stripImg);
      if (copy.apartment) stripImg(copy.apartment);
      return copy;
    };
    const examples = rows
      .map((r) => r.content)
      .filter(Boolean)
      // Prefer same-category examples first.
      .sort(
        (a, b) =>
          Number((b as Record<string, unknown>)?.category === category) -
          Number((a as Record<string, unknown>)?.category === category),
      )
      .slice(0, 2)
      .map((c) => JSON.stringify(clean(c as Record<string, unknown>)));
    if (!examples.length) return "";
    return (
      `\n\nHOUSE-STYLE EXAMPLES (existing published pages — mirror their tone, structure, and spec/feature phrasing; do NOT copy their specific facts):\n` +
      examples.map((e, i) => `Example ${i + 1}:\n${e}`).join("\n\n")
    );
  } catch {
    return "";
  }
}

export const extractPageContent = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }) => {
    const authed = await verifyUser(data.accessToken);
    if (!authed) throw new Error("Unauthorized.");

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Server is missing LOVABLE_API_KEY.");

    const unitsHint =
      data.category === "apartment"
        ? `\n\nThis page describes a SINGLE apartment. Output AT MOST ONE entry in "units" capturing that apartment's details in "specs" (floor, rooms, area, balcony, parking, orientation) and "featureRows", plus description and price. Never output multiple units.`
        : `\n\nThis page describes a PROJECT (a building). Output one entry in "units" per distinct apartment/unit you find, each with its own "specs" and "featureRows".`;

    const styleExamples = await fetchStyleExamples(data.accessToken, data.category);

    const userPrompt =
      `Detect the language of the text below and produce the page entirely in French.` +
      unitsHint +
      styleExamples +
      `\n\nProperty text:\n"""\n${data.text}\n"""`;

    let parsed: unknown = null;
    let lastRaw = "";
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Lovable-API-Key": apiKey,
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
        }),
      });

      if (!res.ok) {
        if (res.status === 429)
          throw new Error("Rate limited by the AI provider. Try again shortly.");
        if (res.status === 402)
          throw new Error("AI credits exhausted. Add credits in your workspace settings.");
        const body = await res.text().catch(() => "");
        console.error("[extract-page] gateway error", res.status, body.slice(0, 500));
        throw new Error(`AI provider error (${res.status}).`);
      }

      const out = await res.json();
      lastRaw = out?.choices?.[0]?.message?.content ?? "";
      try {
        parsed = JSON.parse(stripFences(lastRaw));
        break;
      } catch {
        parsed = null;
      }
    }

    if (parsed === null) {
      console.error("[extract-page] JSON parse failed. Raw:", lastRaw.slice(0, 500));
      throw new Error("The AI response could not be parsed. Please try again.");
    }

    const validated = pageContentSchema.safeParse(parsed);
    if (!validated.success) {
      throw new Error("The AI response did not match the expected shape.");
    }

    const pruned = (prune(validated.data) ?? {}) as Record<string, unknown>;
    delete pruned.gallery; // never extracted from text
    return { content: pruned as import("@/types/page").PageContent };
  });
