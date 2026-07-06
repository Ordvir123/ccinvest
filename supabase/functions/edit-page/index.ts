// Supabase Edge Function: edit-page
// -------------------------------------------------------------
// Apply a natural-language correction to an EXISTING PageContent using the
// Anthropic API + a JSON Patch (RFC 6902) approach.
//
// Why a patch (not a full rewrite): asking the model to re-emit the entire
// content JSON silently drops media URLs and numbers. Instead the model returns
// a small list of patch ops; we validate them server-side, block edits to
// protected media paths unless explicitly requested, apply the patch to a deep
// clone, and re-validate the result against the full PageContent schema.
//
// Required secret (set with the Supabase CLI / dashboard):
//   ANTHROPIC_API_KEY
//
// Deploy:  supabase functions deploy edit-page
// Secret:  supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
// -------------------------------------------------------------

import { z } from "https://esm.sh/zod@3.23.8";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { applyPatch, deepClone } from "https://esm.sh/fast-json-patch@3.1.1";

// Hard caps to prevent AI-cost abuse via huge payloads.
const MAX_INSTRUCTION_LENGTH = 4_000;
const MAX_CONTENT_LENGTH = 60_000;
const MAX_HISTORY_TURNS = 10;
const MAX_ASSETS = 18;

// ---- Input asset schema (already uploaded to the public page-media bucket) ----
const assetSchema = z.object({
  url: z.string().url(),
  kind: z.enum(["image", "pdf"]),
  filename: z.string(),
});
type Asset = z.infer<typeof assetSchema>;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ANTHROPIC_MODEL = "claude-sonnet-4-6";

// ---- PageContent schema (mirrors src/types/page.ts — edge fns can't import src) ----
const mediaSchema = z.object({ url: z.string(), alt: z.string().optional() });
const statSchema = z.object({
  value: z.string(),
  label: z.string(),
  icon: z.string().optional(),
});
const detailRowSchema = z.object({
  presetKey: z.string().optional(),
  linked: z.boolean().optional(),
  label: z.string().optional(),
  icon: z.string().optional(),
  value: z.string().optional(),
});
const unitAttachmentSchema = z.object({
  url: z.string(),
  type: z.enum(["image", "pdf"]),
});
const unitSchema = z.object({
  name: z.string(),
  unit_type: z.string().optional(),
  unit_number: z.string().optional(),
  floor: z.string().optional(),
  orientation: z.string().optional(),
  rooms: z.string().optional(),
  area_m2: z.string().optional(),
  balcony_m2: z.string().optional(),
  parking: z.string().optional(),
  description: z.string().optional(),
  price: z.string().optional(),
  image: mediaSchema.optional(),
  attachment: unitAttachmentSchema.optional(),
  features: z.array(z.string()).optional(),
  specs: z.array(detailRowSchema).optional(),
  featureRows: z.array(detailRowSchema).optional(),
});
const videoSchema = z.object({
  title: z.string().optional(),
  youtube_id: z.string(),
});
const langMap = z.record(z.string()).optional();

const pageContentSchema = z.object({
  category: z.enum(["apartment", "project"]).optional(),
  hero: z.object({
    kicker: z.string().optional(),
    kicker_i18n: langMap,
    title: z.string(),
    subtitle: z.string().optional(),
    price: z.string().optional(),
    cta_label: z.string().optional(),
    cta_label_i18n: langMap,
    background: mediaSchema.optional(),
  }),
  stats: z.array(statSchema),
  location: z
    .object({
      heading: z.string().optional(),
      text: z.string().optional(),
      map_query: z.string().optional(),
      name_i18n: langMap,
    })
    .optional(),
  about: z
    .object({
      heading: z.string().optional(),
      body: z.string().optional(),
      features: z.array(z.string()).optional(),
      feature_icons: z.array(z.string()).optional(),
    })
    .optional(),
  gallery: z.array(mediaSchema),
  wide_images: z.array(mediaSchema).optional(),
  section_order: z.array(z.string()).optional(),
  hidden_sections: z.array(z.string()).optional(),
  units: z.array(unitSchema).optional(),
  apartment: unitSchema.optional(),
  apartment_image_side: z.enum(["left", "right"]).optional(),
  apartment_title: z.string().optional(),
  apartment_title_icon: z.string().optional(),
  videos: z.array(videoSchema).optional(),
  contact: z
    .object({
      heading: z.string().optional(),
      heading_i18n: langMap,
    })
    .optional(),
});

// ---- Patch schema (RFC 6902 ops) ----
const patchOpSchema = z
  .object({
    op: z.enum(["add", "replace", "remove", "move", "copy"]),
    path: z.string().min(1),
    value: z.unknown().optional(),
    from: z.string().optional(),
  })
  .superRefine((op, ctx) => {
    if (!op.path.startsWith("/")) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Invalid path "${op.path}".` });
    }
    if ((op.op === "add" || op.op === "replace") && op.value === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Op "${op.op}" requires a value.` });
    }
    if ((op.op === "move" || op.op === "copy") && (!op.from || !op.from.startsWith("/"))) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Op "${op.op}" requires a valid "from".` });
    }
  });

const modelOutputSchema = z.object({
  patch: z.array(patchOpSchema),
  summary: z.string(),
});

const historyTurnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  text: z.string(),
});

// Paths whose media we protect from removal/replacement/move.
const PROTECTED_FRAGMENTS = [
  "/gallery",
  "/wide_images",
  "/background",
  "/image",
  "/attachment",
  "/youtube_id",
  "/og_image",
];

// Keywords (fr / he / en) that signal the user explicitly wants media changes.
const MEDIA_KEYWORDS = [
  "image",
  "photo",
  "gallery",
  "video",
  "galerie",
  "vidéo",
  "תמונה",
  "תמונות",
  "גלריה",
  "וידאו",
  "סרטון",
];

const SYSTEM_PROMPT = `You edit a real-estate landing page's content by producing a JSON Patch (RFC 6902), NOT a full rewrite.

You receive:
1. The CURRENT content as a JSON object.
2. An INSTRUCTION describing the change to make.

You MUST return ONLY a JSON object of this EXACT shape (no markdown, no prose, no code fences):
{
  "patch": [ /* array of RFC-6902 operations */ ],
  "summary": "one-sentence human summary of the change, in the SAME language as the instruction"
}

PATCH RULES — follow exactly:
* NEVER return the full content. Emit the smallest set of ops that satisfies the instruction.
* Each op is { "op": "replace"|"add"|"remove"|"move"|"copy", "path": "/...", "value"?: ..., "from"?: "/..." }.
* Paths target locations inside the content object, e.g. /hero/title, /units/2/price, /stats/1/label, /about/body.
* "replace"/"add" require "value". "move"/"copy" require "from".
* Do NOT translate. Keep the existing source language unless the instruction explicitly asks to rewrite copy.
* Do NOT touch media (images, gallery, wide_images, backgrounds, attachments, youtube_id) unless the instruction explicitly asks about media.
* If ATTACHED ASSETS are provided (listed below), you MAY place them into the content with "add"/"replace" ops. Use ONLY the EXACT asset URLs given — NEVER invent, guess, modify or shorten a URL. Each asset URL may be used AT MOST ONCE. Media objects use the shape { "url": "...", "alt"?: "..." }; unit attachments use { "url": "...", "type": "image"|"pdf" }. Place gallery photos into /gallery, panoramic shots into /wide_images, a hero photo into /hero/background, and floor plans into the matching /units/N/attachment (or /apartment/attachment).
* If the instruction is ambiguous or cannot be applied, return an empty patch array and explain in the summary.
* Use plain hyphens "-" only. Do NOT introduce em dashes or en dashes.`;

function stripFences(s: string): string {
  return s
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

/**
 * Robustly parse a JSON object out of a model response. Handles code fences and
 * any leading/trailing prose the model may emit around the JSON object by
 * falling back to the substring between the first "{" and the last "}".
 */
function parseModelJson(raw: string): unknown {
  const cleaned = stripFences(raw);
  try {
    return JSON.parse(cleaned);
  } catch {
    /* fall through to substring extraction */
  }
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      /* give up */
    }
  }
  return null;
}

async function callAnthropic(
  apiKey: string,
  contentJson: string,
  instruction: string,
  sourceLang: string | undefined,
  history: { role: "user" | "assistant"; text: string }[],
  assets: Asset[],
) {
  const messages: { role: "user" | "assistant"; content: unknown }[] = [];
  for (const turn of history) {
    messages.push({ role: turn.role, content: turn.text });
  }

  const images = assets.filter((a) => a.kind === "image");
  const pdfs = assets.filter((a) => a.kind === "pdf");
  const ordered = [...images, ...pdfs];

  const textBlock =
    (sourceLang ? `Source language: ${sourceLang}\n\n` : "") +
    (ordered.length
      ? `ATTACHED ASSETS (use these EXACT URLs, each at most once):\n${ordered
          .map((a, i) => `Asset ${i + 1}: ${a.filename} - ${a.url}`)
          .join("\n")}\n\n`
      : "") +
    `CURRENT CONTENT:\n"""\n${contentJson}\n"""\n\n` +
    `INSTRUCTION:\n"""\n${instruction}\n"""`;

  if (ordered.length) {
    const blocks: unknown[] = [];
    for (const img of images) {
      blocks.push({ type: "image", source: { type: "url", url: img.url } });
    }
    for (const pdf of pdfs) {
      blocks.push({ type: "document", source: { type: "url", url: pdf.url } });
    }
    blocks.push({ type: "text", text: textBlock });
    messages.push({ role: "user", content: blocks });
  } else {
    messages.push({ role: "user", content: textBlock });
  }

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
      messages,
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
    if (!apiKey) return json({ error: "Server is missing ANTHROPIC_API_KEY." }, 500);

    // Require an authenticated user — cost-bearing, admin-only endpoint.
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const supaUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!token || !supaUrl || !serviceKey) return json({ error: "Unauthorized." }, 401);
    const authClient = createClient(supaUrl, serviceKey);
    const { data: userData, error: authError } = await authClient.auth.getUser(token);
    if (authError || !userData?.user) return json({ error: "Unauthorized." }, 401);

    // ---- Parse + validate input ----
    const input = await req.json().catch(() => null);
    if (!input || typeof input !== "object") return json({ error: "Invalid request body." }, 400);

    const instruction =
      typeof input.instruction === "string" ? input.instruction.trim() : "";
    if (!instruction) return json({ error: "No instruction provided." }, 400);
    if (instruction.length > MAX_INSTRUCTION_LENGTH) {
      return json({ error: "Instruction exceeds the maximum allowed length." }, 400);
    }

    const content = input.content;
    if (!content || typeof content !== "object") {
      return json({ error: "No content provided." }, 400);
    }
    const contentJson = JSON.stringify(content);
    if (contentJson.length > MAX_CONTENT_LENGTH) {
      return json({ error: "Page content is too large for AI editing." }, 400);
    }

    const sourceLang = ["fr", "he", "en"].includes(input.source_lang ?? input.sourceLang)
      ? (input.source_lang ?? input.sourceLang)
      : undefined;

    let history: { role: "user" | "assistant"; text: string }[] = [];
    if (Array.isArray(input.history)) {
      const parsedHistory = z.array(historyTurnSchema).safeParse(input.history);
      if (!parsedHistory.success) return json({ error: "Invalid history." }, 400);
      history = parsedHistory.data.slice(-MAX_HISTORY_TURNS);
    }

    // ---- Parse + validate attached assets (already in the page-media bucket) ----
    let assets: Asset[] = [];
    if (input.assets !== undefined) {
      const parsedAssets = z.array(assetSchema).max(MAX_ASSETS).safeParse(input.assets);
      if (!parsedAssets.success) return json({ error: "Invalid assets payload." }, 400);
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
    const assetUrls = new Set(assets.map((a) => a.url));

    // ---- Call model, parse patch JSON, retry once on parse failure ----
    let parsed: unknown = null;
    let lastRaw = "";
    for (let attempt = 0; attempt < 2; attempt++) {
      const result = await callAnthropic(apiKey, contentJson, instruction, sourceLang, history, assets);
      if (!result.ok) {
        if (result.status === 401) return json({ error: "Invalid Anthropic API key." }, 502);
        if (result.status === 429)
          return json({ error: "Rate limited by the AI provider. Try again shortly." }, 429);
        return json({ error: `AI provider error (${result.status}).` }, 502);
      }
      lastRaw = result.text;
      parsed = parseModelJson(result.text);
      if (parsed !== null) break;
    }
    if (parsed === null) {
      console.error("[edit-page] JSON parse failed. Raw:", lastRaw.slice(0, 500));
      return json({ error: "The AI response could not be parsed. Please try again." }, 502);
    }

    const validatedOutput = modelOutputSchema.safeParse(parsed);
    if (!validatedOutput.success) {
      console.error("[edit-page] model output invalid:", validatedOutput.error.message);
      return json({ error: "The AI returned an invalid patch." }, 502);
    }
    const { patch, summary } = validatedOutput.data;

    // ---- Protected-path guard ----
    // Reject remove/replace/move ops that target protected media paths, UNLESS
    // the instruction explicitly mentions media (keyword check, case-insensitive).
    const instructionLower = instruction.toLowerCase();
    const mediaRequested =
      assets.length > 0 ||
      MEDIA_KEYWORDS.some((k) => instructionLower.includes(k.toLowerCase()));
    if (!mediaRequested) {
      for (const op of patch) {
        const touchesProtected =
          PROTECTED_FRAGMENTS.some((f) => op.path.includes(f)) ||
          (op.op === "move" && op.from
            ? PROTECTED_FRAGMENTS.some((f) => op.from!.includes(f))
            : false);
        if (touchesProtected && (op.op === "remove" || op.op === "replace" || op.op === "move")) {
          return json(
            {
              error: `The change was blocked because it edits protected media (${op.path}). Mention the image/photo/gallery/video explicitly to allow it.`,
            },
            422,
          );
        }
      }
    }

    // ---- Apply the patch to a deep clone ----
    let result: unknown;
    try {
      const clone = deepClone(content);
      result = applyPatch(clone, patch as any, /*validate*/ true, /*mutate*/ true).newDocument;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Patch could not be applied.";
      console.error("[edit-page] patch apply failed:", message);
      return json({ error: `Patch could not be applied: ${message}` }, 422);
    }

    // ---- Validate the RESULT against the full schema ----
    const validatedResult = pageContentSchema.safeParse(result);
    if (!validatedResult.success) {
      console.error("[edit-page] result schema invalid:", validatedResult.error.message);
      return json({ error: "The edited content did not match the expected shape." }, 422);
    }

    // ---- Media-URL safety net ----
    // Any media URL in the RESULT that was not already in the original content
    // must be one of the attached asset URLs. This blocks the model from
    // inventing URLs or smuggling in foreign ones via the patch.
    const collectUrls = (value: unknown, out: Set<string>) => {
      if (Array.isArray(value)) {
        for (const v of value) collectUrls(v, out);
      } else if (value && typeof value === "object") {
        for (const [k, v] of Object.entries(value)) {
          if (k === "url" && typeof v === "string") out.add(v);
          else collectUrls(v, out);
        }
      }
    };
    const originalUrls = new Set<string>();
    collectUrls(content, originalUrls);
    const resultUrls = new Set<string>();
    collectUrls(validatedResult.data, resultUrls);
    for (const u of resultUrls) {
      if (!originalUrls.has(u) && !assetUrls.has(u)) {
        return json(
          { error: "The edit tried to add a media URL that was not attached. Please try again." },
          422,
        );
      }
    }

    const changedPaths = patch.map((op) => op.path);
    return json({ content: validatedResult.data, summary, changedPaths });
  } catch (err) {
    console.error("[edit-page] unexpected error:", err);
    return json({ error: "Unexpected server error." }, 500);
  }
});
