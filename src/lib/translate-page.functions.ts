import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * On-the-fly translation of PageContent using Lovable AI (server-side), with a
 * DB cache in page_translations. Replaces the old Anthropic edge function — no
 * external key, no deploy needed.
 *
 * Auth: the caller passes its Supabase access token; we verify it against the
 * project's auth endpoint so this cost-bearing endpoint is not fully public.
 */

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

function canonicalJson(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  if (typeof value === "object") {
    const keys = Object.keys(value as Record<string, unknown>).sort();
    return (
      "{" +
      keys
        .map((k) => JSON.stringify(k) + ":" + canonicalJson((value as Record<string, unknown>)[k]))
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

function getPath(obj: unknown, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>((acc, key) => (acc == null ? acc : (acc as Record<string, unknown>)[key]), obj);
}
function setPath(obj: Record<string, unknown>, path: string, val: unknown): void {
  const keys = path.split(".");
  let cur: Record<string, unknown> = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (cur[k] == null || typeof cur[k] !== "object") {
      cur[k] = /^\d+$/.test(keys[i + 1]) ? [] : {};
    }
    cur = cur[k] as Record<string, unknown>;
  }
  cur[keys[keys.length - 1]] = val;
}

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

const inputSchema = z.object({
  content: z.record(z.string(), z.unknown()),
  sourceLang: z.enum(["fr", "he", "en"]),
  targetLang: z.enum(["fr", "he", "en"]),
  pageId: z.string().optional(),
  force: z.boolean().optional(),
  accessToken: z.string().min(1),
});

type PageContent = import("@/types/page").PageContent;

export const translatePageContent = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }) => {
    const authed = await verifyUser(data.accessToken);
    if (!authed) throw new Error("Unauthorized.");

    const { content, sourceLang, targetLang, pageId, force } = data;

    if (JSON.stringify(content).length > 50_000) {
      throw new Error("Content exceeds the maximum allowed size.");
    }
    if (sourceLang === targetLang) {
      return { content: content as PageContent };
    }

    const hash = await sha256Hex(canonicalJson(content));

    // Cache reads/writes as the authenticated caller (RLS allows admins).
    const { createClient } = await import("@supabase/supabase-js");
    const supaUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    const supaKey =
      (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ??
      (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined);
    const admin =
      pageId && supaUrl && supaKey
        ? createClient(supaUrl, supaKey, {
            auth: { persistSession: false, autoRefreshToken: false },
            global: { headers: { Authorization: `Bearer ${data.accessToken}` } },
          })
        : null;

    let existing: { content: Record<string, unknown>; source_hash: string | null; locked_fields: string[] } | null =
      null;
    if (admin && pageId) {
      const { data: row } = await admin
        .from("page_translations")
        .select("content, source_hash, locked_fields")
        .eq("page_id", pageId)
        .eq("lang", targetLang)
        .maybeSingle();
      if (row) {
        existing = {
          content: (row.content ?? {}) as Record<string, unknown>,
          source_hash: (row.source_hash as string | null) ?? null,
          locked_fields: Array.isArray(row.locked_fields) ? (row.locked_fields as string[]) : [],
        };
      }
    }

    // Cache hit: fresh hash and not forced.
    if (existing && existing.source_hash === hash && !force) {
      return { content: existing.content as PageContent };
    }

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Server is missing LOVABLE_API_KEY.");

    let parsed: unknown = null;
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
            { role: "system", content: systemPrompt(sourceLang, targetLang) },
            { role: "user", content: "Translate this JSON:\n" + JSON.stringify(content) },
          ],
        }),
      });
      if (!res.ok) {
        if (res.status === 429) throw new Error("Rate limited by the AI provider. Try again shortly.");
        if (res.status === 402) throw new Error("AI credits exhausted. Please add credits.");
        throw new Error(`AI provider error (${res.status}).`);
      }
      const out = await res.json();
      const raw = out?.choices?.[0]?.message?.content ?? "";
      try {
        parsed = JSON.parse(stripFences(raw));
        break;
      } catch {
        parsed = null;
      }
    }
    if (parsed === null) throw new Error("The AI response could not be parsed. Please try again.");

    const validated = pageContentSchema.safeParse(parsed);
    if (!validated.success) throw new Error("The AI response did not match the expected shape.");

    const translated = (prune(validated.data) ?? {}) as Record<string, unknown>;

    // Preserve locked fields from the existing manual translation.
    const locked = existing?.locked_fields ?? [];
    for (const path of locked) {
      const lockedVal = getPath(existing?.content, path);
      if (lockedVal !== undefined) setPath(translated, path, lockedVal);
    }

    // Upsert cache (privileged). Skip silently if no admin client / unsaved page.
    if (admin && pageId) {
      await admin.from("page_translations").upsert(
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

    return { content: translated as PageContent };
  });
