import { supabase } from "@/integrations/supabase/client";
import { emptyPageContent } from "@/lib/pages";
import type { PageContent } from "@/types/page";

export type ExtractLang = "fr" | "he" | "en";
export type ExtractCategory = "apartment" | "project";
export type CopyMode = "strict" | "enhanced";

/** A media asset (already uploaded to page-media) sent to the AI for placement. */
export type ExtractAsset = { url: string; kind: "image" | "pdf"; filename: string };

export type ExtractResult = {
  content: Partial<PageContent>;
  /** Asset URLs the AI could not confidently place — surfaced for manual use. */
  unplaced: string[];
};

/**
 * Extract a partial PageContent from raw text (+ optional image/PDF assets)
 * using the `extract-page` edge function. Throws a user-friendly Error.
 */
export async function extractPageFromText(
  text: string,
  opts?: {
    sourceLang?: ExtractLang;
    category?: ExtractCategory;
    copyMode?: CopyMode;
    assets?: ExtractAsset[];
  },
): Promise<ExtractResult> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error("You must be signed in to use AI extraction.");

  const { data, error } = await supabase.functions.invoke("extract-page", {
    body: {
      text,
      source_lang: opts?.sourceLang,
      category: opts?.category,
      copyMode: opts?.copyMode ?? "strict",
      assets: opts?.assets ?? [],
    },
  });

  if (error) {
    // Surface the edge function's JSON { error } message when available.
    let message = error.message ?? "AI extraction failed.";
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

  return {
    content: (data?.content ?? {}) as Partial<PageContent>,
    unplaced: Array.isArray(data?.unplaced) ? (data.unplaced as string[]) : [],
  };
}

/**
 * Deep-merge an AI partial into a complete PageContent, preserving the exact
 * schema shape and leaving anything the AI omitted as empty/editable.
 * `category` decides whether AI-found units populate the repeatable Units list
 * (project) or the single apartment block (apartment).
 *
 * Media coming from the AI (hero.background, gallery, wide_images and per-unit
 * attachment/image) are merged through so the editor is prefilled with them.
 */
export function mergeAiContent(
  partial: Partial<PageContent>,
  category: ExtractCategory = "project",
): PageContent {
  const base = emptyPageContent();
  const p = partial ?? {};

  const merged: PageContent = {
    category,
    // hero.background (when present) flows through this spread.
    hero: { ...base.hero, ...(p.hero ?? {}) },
    stats: p.stats?.length ? p.stats : base.stats,
    location: { ...base.location, ...(p.location ?? {}) },
    about: {
      ...base.about,
      ...(p.about ?? {}),
      features: p.about?.features?.length ? p.about.features : base.about?.features ?? [],
    },
    gallery: p.gallery?.length ? p.gallery : base.gallery,
    wide_images: p.wide_images?.length ? p.wide_images : base.wide_images,
    units: [],
    apartment: base.apartment,
    apartment_image_side: base.apartment_image_side,
    videos: p.videos?.length ? p.videos : base.videos,
    contact: { ...base.contact, ...(p.contact ?? {}) },
  };

  if (category === "project") {
    // Units (incl. any AI-attached attachment/image) flow through as-is.
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
