import { supabase } from "@/integrations/supabase/client";
import { emptyPageContent } from "@/lib/pages";
import type { PageContent } from "@/types/page";

export type ExtractLang = "fr" | "he" | "en";

/**
 * Call the `extract-page` edge function and return a partial PageContent.
 * Throws an Error with a user-friendly message on failure.
 */
export async function extractPageFromText(
  text: string,
  sourceLang?: ExtractLang,
): Promise<Partial<PageContent>> {
  const { data, error } = await supabase.functions.invoke("extract-page", {
    body: { text, source_lang: sourceLang },
  });

  if (error) {
    // Edge function returned a non-2xx; try to surface its JSON { error }.
    let message = error.message || "AI extraction failed.";
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx && typeof ctx.json === "function") {
        const body = await ctx.json();
        if (body?.error) message = body.error;
      }
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  if (data?.error) throw new Error(data.error as string);
  return (data?.content ?? {}) as Partial<PageContent>;
}

/**
 * Deep-merge an AI partial into a complete PageContent, preserving the exact
 * schema shape and leaving anything the AI omitted as empty/editable.
 */
export function mergeAiContent(partial: Partial<PageContent>): PageContent {
  const base = emptyPageContent();
  const p = partial ?? {};

  return {
    hero: { ...base.hero, ...(p.hero ?? {}) },
    stats: p.stats?.length ? p.stats : base.stats,
    location: { ...base.location, ...(p.location ?? {}) },
    about: {
      ...base.about,
      ...(p.about ?? {}),
      features: p.about?.features?.length ? p.about.features : base.about?.features ?? [],
    },
    gallery: base.gallery, // AI never provides images
    units: p.units?.length ? p.units : base.units,
    videos: p.videos?.length ? p.videos : base.videos,
    contact: { ...base.contact, ...(p.contact ?? {}) },
  };
}
