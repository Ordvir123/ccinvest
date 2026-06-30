import { supabase } from "@/integrations/supabase/client";
import { emptyPageContent } from "@/lib/pages";
import { applyPageEdit } from "@/lib/edit-page.functions";
import type { PageContent } from "@/types/page";

export type EditLang = "fr" | "he" | "en";

/**
 * Apply a natural-language correction to an existing PageContent via Lovable AI.
 * Returns a complete, normalized PageContent. Throws a user-friendly Error.
 */
export async function applyAiEdit(
  content: PageContent,
  instruction: string,
  sourceLang?: EditLang,
): Promise<PageContent> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error("You must be signed in to use AI editing.");

  const result = await applyPageEdit({
    data: { content, instruction, sourceLang, accessToken },
  });

  const next = (result?.content ?? {}) as Partial<PageContent>;
  // Guard the shape so a malformed AI response can never corrupt the editor.
  const base = emptyPageContent();
  return {
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
}
