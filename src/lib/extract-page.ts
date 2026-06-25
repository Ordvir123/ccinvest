import { supabase } from "@/integrations/supabase/client";
import { emptyPageContent } from "@/lib/pages";
import { extractPageContent } from "@/lib/extract-page.functions";
import type { PageContent } from "@/types/page";

export type ExtractLang = "fr" | "he" | "en";

/**
 * Extract a partial PageContent from raw text using Lovable AI (server-side).
 * Throws an Error with a user-friendly message on failure.
 */
export async function extractPageFromText(
  text: string,
  sourceLang?: ExtractLang,
): Promise<Partial<PageContent>> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error("You must be signed in to use AI extraction.");

  const result = await extractPageContent({
    data: { text, sourceLang, accessToken },
  });
  return (result?.content ?? {}) as Partial<PageContent>;
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
