import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { PageContent } from "@/types/page";

/**
 * Apply a natural-language correction to an EXISTING PageContent using Lovable AI.
 * The model receives the current content JSON plus an instruction and returns the
 * full, modified content. It must preserve every field it is not explicitly asked
 * to change — especially media URLs, youtube ids, numbers, and structure.
 *
 * Auth: the caller passes its Supabase access token; we verify it so this
 * cost-bearing endpoint is not fully public.
 */

const MAX_INSTRUCTION_LENGTH = 4_000;
const MAX_CONTENT_LENGTH = 60_000;

const inputSchema = z.object({
  content: z.unknown(),
  instruction: z.string().min(1).max(MAX_INSTRUCTION_LENGTH),
  sourceLang: z.enum(["fr", "he", "en"]).optional(),
  accessToken: z.string().min(1),
});

const SYSTEM_PROMPT = `You edit a real-estate landing page's content JSON based on a user instruction.

You receive:
1. The CURRENT content as a JSON object (the exact shape you must return).
2. An INSTRUCTION describing the change to make.

RULES — follow exactly:
* Output ONLY valid JSON — the complete, updated content object. No markdown, no prose, no code fences.
* Return the FULL object, keeping the SAME shape and ALL existing keys.
* Change ONLY what the instruction asks for. Preserve every other field byte-for-byte.
* NEVER drop, alter, or invent: image/media URLs, "background", "image", "attachment", "gallery", "youtube_id", "map_query", "feature_icons", "icon", "category", "unit_type", "unit_number", or any numeric values you are not asked to change.
* Do NOT translate. Keep the existing source language unless the instruction explicitly asks to rewrite copy.
* If the instruction is ambiguous or cannot be applied, return the content unchanged.
* Use plain hyphens "-" only. Do NOT introduce em dashes or en dashes.`;

function stripFences(s: string): string {
  return s
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

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

export const applyPageEdit = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }) => {
    const authed = await verifyUser(data.accessToken);
    if (!authed) throw new Error("Unauthorized.");

    const contentJson = JSON.stringify(data.content ?? {});
    if (contentJson.length > MAX_CONTENT_LENGTH) {
      throw new Error("Page content is too large for AI editing.");
    }

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Server is missing LOVABLE_API_KEY.");

    const userPrompt =
      (data.sourceLang ? `Source language: ${data.sourceLang}\n\n` : "") +
      `CURRENT CONTENT:\n"""\n${contentJson}\n"""\n\n` +
      `INSTRUCTION:\n"""\n${data.instruction}\n"""`;

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
        console.error("[edit-page] gateway error", res.status, body.slice(0, 500));
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

    if (parsed === null || typeof parsed !== "object") {
      console.error("[edit-page] JSON parse failed. Raw:", lastRaw.slice(0, 500));
      throw new Error("The AI response could not be parsed. Please try again.");
    }

    return { content: parsed as PageContent };
  });
