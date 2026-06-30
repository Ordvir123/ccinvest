import { supabase } from "@/integrations/supabase/client";
import { emptyPageContent } from "@/lib/pages";
import { extractPageContent } from "@/lib/extract-page.functions";
import type { PageContent } from "@/types/page";

export type ExtractLang = "fr" | "he" | "en";
export type ExtractCategory = "apartment" | "project";

/**
 * Extract a partial PageContent from raw text using Lovable AI (server-side).
 * Throws an Error with a user-friendly message on failure.
 */
export async function extractPageFromText(
  text: string,
  opts?: { sourceLang?: ExtractLang; category?: ExtractCategory },
): Promise<Partial<PageContent>> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error("You must be signed in to use AI extraction.");

  const result = await extractPageContent({
    data: { text, sourceLang: opts?.sourceLang, category: opts?.category, accessToken },
  });
  return (result?.content ?? {}) as Partial<PageContent>;
}


/**
 * Deep-merge an AI partial into a complete PageContent, preserving the exact
 * schema shape and leaving anything the AI omitted as empty/editable.
 * `category` decides whether AI-found units populate the repeatable Units list
 * (project) or the single apartment block (apartment).
 */
export function mergeAiContent(
  partial: Partial<PageContent>,
  category: ExtractCategory = "project",
): PageContent {
  const base = emptyPageContent();
  const p = partial ?? {};

  const merged: PageContent = {
    category,
    hero: { ...base.hero, ...(p.hero ?? {}) },
    stats: p.stats?.length ? p.stats : base.stats,
    location: { ...base.location, ...(p.location ?? {}) },
    about: {
      ...base.about,
      ...(p.about ?? {}),
      features: p.about?.features?.length ? p.about.features : base.about?.features ?? [],
    },
    gallery: base.gallery, // AI never provides images
    units: [],
    apartment: base.apartment,
    apartment_image_side: base.apartment_image_side,
    videos: p.videos?.length ? p.videos : base.videos,
    contact: { ...base.contact, ...(p.contact ?? {}) },
  };

  if (category === "project") {
    merged.units = p.units?.length ? p.units : base.units;
  } else {
    // Single apartment: take the first extracted unit, keep a clean type.
    const first = p.units?.[0];
    merged.apartment = first
      ? { ...base.apartment, ...first, unit_type: first.unit_type ?? "apartment" }
      : base.apartment;
  }

  return merged;
}
