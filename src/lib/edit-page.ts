import { supabase } from "@/integrations/supabase/client";
import { emptyPageContent } from "@/lib/pages";
import type { PageContent } from "@/types/page";

export type EditLang = "fr" | "he" | "en";

/** A media asset (already uploaded to page-media) sent to the AI for placement. */
export type EditAsset = { url: string; kind: "image" | "pdf"; filename: string };

export type AiEditResult = {
  content: PageContent;
  summary: string;
  changedPaths: string[];
};

/**
 * Apply a natural-language correction to an existing PageContent via the
 * Anthropic-backed `edit-page` edge function (JSON Patch approach).
 * Returns the complete, normalized PageContent plus a human summary and the
 * list of changed paths. Throws a user-friendly Error.
 */
export async function applyAiEdit(
  content: PageContent,
  instruction: string,
  sourceLang?: EditLang,
  history?: { role: "user" | "assistant"; text: string }[],
  assets?: EditAsset[],
): Promise<AiEditResult> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error("You must be signed in to use AI editing.");

  const { data, error } = await supabase.functions.invoke("edit-page", {
    body: { content, instruction, sourceLang, history, assets: assets ?? [] },
  });

  if (error) {
    // Surface the edge function's JSON { error } message when available.
    let message = error.message ?? "AI edit failed.";
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === "function") {
      try {
        const body = await ctx.json();
        if (body?.error) message = body.error;
      } catch {
        /* ignore parse errors */
      }
    }
    throw new Error(message);
  }

  const next = (data?.content ?? {}) as Partial<PageContent>;
  // Guard the shape so a malformed response can never corrupt the editor.
  const base = emptyPageContent();
  const merged: PageContent = {
    ...base,
    ...next,
    hero: { ...base.hero, ...(next.hero ?? {}) },
    stats: Array.isArray(next.stats) ? next.stats : base.stats,
    location: next.location ?? base.location,
    about: next.about ?? base.about,
    gallery: Array.isArray(next.gallery) ? next.gallery : base.gallery,
    units: Array.isArray(next.units) ? next.units : base.units,
    videos: Array.isArray(next.videos) ? next.videos : base.videos,
    contact: next.contact ?? base.contact,
  };

  return {
    content: merged,
    summary: typeof data?.summary === "string" ? data.summary : "",
    changedPaths: Array.isArray(data?.changedPaths) ? data.changedPaths : [],
  };
}
