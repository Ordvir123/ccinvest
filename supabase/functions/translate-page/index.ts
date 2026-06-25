// Supabase Edge Function: translate-page
// -------------------------------------------------------------
// On-the-fly translation with a DB cache (page_translations).
//
// Required secret (same pattern as extract-page):
//   ANTHROPIC_API_KEY
// Auto-injected by Supabase (used for the privileged cache write):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Deploy:  supabase functions deploy translate-page
// -------------------------------------------------------------

import { z } from "https://esm.sh/zod@3.23.8";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

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
  image: mediaSchema.optional(),
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

const LANG_NAMES: Record<string, string> = {
  fr: "French",
  he: "Hebrew",
  en: "English",
};

function systemPrompt(source: string, target: string) {
  return `You translate the human-readable text values of a real-estate landing page JSON object from ${LANG_NAMES[source] ?? source} to ${LANG_NAMES[target] ?? target}.

RULES — follow exactly:
* Translate ONLY human-readable text values.
* Preserve the JSON structure and ALL keys EXACTLY. Same shape in, same shape out.
* DO NOT translate or alter: image URLs (url), youtube_id, map_query, and numeric-only values such as prices, areas (m²), room counts. Keep prices and areas exactly as-is.
* Proper nouns (street names, project names, neighborhoods, architect or bank names) stay in their original form — do not localize them.
* If a field is empty or absent in the source, keep it empty or absent. Never invent content.
* Output ONLY valid JSON matching the input shape. No prose, no markdown, no code fences.`;
}

function stripFences(s: string): string {
  return s
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

// Stable canonical JSON (sorted keys) — MUST match the client implementation.
function canonicalJson(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  if (typeof value === "object") {
    const keys = Object.keys(value as Record<string, unknown>).sort();
    return (
      "{" +
      keys
        .map((k) => JSON.stringify(k) + ":" + canonicalJson((value as any)[k]))
        .join(",") +
      "}"
    );
  }
  return JSON.stringify(value);
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
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

// ---- dot-path helpers for locked-field preservation ----
function getPath(obj: any, path: string): unknown {
  return path.split(".").reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}
function setPath(obj: any, path: string, val: unknown): void {
  const keys = path.split(".");
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (cur[k] == null || typeof cur[k] !== "object") cur[k] = /^\d+$/.test(keys[i + 1]) ? [] : {};
    cur = cur[k];
  }
  cur[keys[keys.length - 1]] = val;
}

async function callAnthropic(apiKey: string, content: unknown, source: string, target: string) {
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
      system: systemPrompt(source, target),
      messages: [
        { role: "user", content: "Translate this JSON:\n" + JSON.stringify(content) },
      ],
    }),
  });
  if (!res.ok) {
    return { ok: false as const, status: res.status };
  }
  const data = await res.json();
  const out = (data?.content ?? [])
    .filter((b: any) => b?.type === "text")
    .map((b: any) => b.text)
    .join("");
  return { ok: true as const, text: out as string };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });

  try {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) return json({ error: "Server is missing ANTHROPIC_API_KEY." }, 500);

    const input = await req.json().catch(() => null);
    const content = input?.content;
    const sourceLang = input?.source_lang;
    const targetLang = input?.target_lang;
    const pageId: string | undefined = input?.page_id || undefined;
    const force = Boolean(input?.force);

    if (!content || typeof content !== "object") return json({ error: "No content provided." }, 400);
    if (JSON.stringify(content).length > 50_000) {
      return json({ error: "Content exceeds the maximum allowed size." }, 400);
    }
    if (!sourceLang || !targetLang) return json({ error: "Missing source_lang/target_lang." }, 400);
    if (sourceLang === targetLang) return json({ content });

    const hash = await sha256Hex(canonicalJson(content));

    // Service client for privileged cache reads/writes (anon stays read-only).
    const supaUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const admin =
      pageId && supaUrl && serviceKey ? createClient(supaUrl, serviceKey) : null;

    let existing: { content: any; source_hash: string | null; locked_fields: string[] } | null = null;
    if (admin && pageId) {
      const { data } = await admin
        .from("page_translations")
        .select("content, source_hash, locked_fields")
        .eq("page_id", pageId)
        .eq("lang", targetLang)
        .maybeSingle();
      if (data) {
        existing = {
          content: data.content ?? {},
          source_hash: data.source_hash ?? null,
          locked_fields: Array.isArray(data.locked_fields) ? data.locked_fields : [],
        };
      }
    }

    // Cache hit: fresh hash and not forced.
    if (existing && existing.source_hash === hash && !force) {
      return json({ content: existing.content, cached: true });
    }

    // Translate.
    let parsed: unknown = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      const result = await callAnthropic(apiKey, content, sourceLang, targetLang);
      if (!result.ok) {
        if (result.status === 401) return json({ error: "Invalid Anthropic API key." }, 502);
        if (result.status === 429) return json({ error: "Rate limited by the AI provider. Try again shortly." }, 429);
        return json({ error: `AI provider error (${result.status}).` }, 502);
      }
      try {
        parsed = JSON.parse(stripFences(result.text));
        break;
      } catch {
        parsed = null;
      }
    }
    if (parsed === null) return json({ error: "The AI response could not be parsed. Please try again." }, 502);

    const validated = pageContentSchema.safeParse(parsed);
    if (!validated.success) return json({ error: "The AI response did not match the expected shape." }, 502);

    let translated = (prune(validated.data) ?? {}) as Record<string, unknown>;

    // Preserve locked fields from the existing manual translation.
    const locked = existing?.locked_fields ?? [];
    for (const path of locked) {
      const lockedVal = getPath(existing?.content, path);
      if (lockedVal !== undefined) setPath(translated, path, lockedVal);
    }

    // Upsert cache (privileged). Skip silently if no admin client (preview/unsaved).
    if (admin && pageId) {
      await admin
        .from("page_translations")
        .upsert(
          {
            page_id: pageId,
            lang: targetLang,
            content: translated,
            source_hash: hash,
            locked_fields: locked,
          },
          { onConflict: "page_id,lang" },
        );
    }

    return json({ content: translated, cached: false });
  } catch (err) {
    console.error("[translate-page] unexpected error:", err);
    return json({ error: "Unexpected server error." }, 500);
  }
});
