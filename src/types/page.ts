// CC Invest — content schema (source of truth). Use these types everywhere.

export type Media = { url: string; alt?: string };

export type Stat = { value: string; label: string };

export type Unit = {
  name: string;
  floor?: string;
  orientation?: string;
  rooms?: string;
  area_m2?: string;
  balcony_m2?: string;
  parking?: string;
  description?: string;
  price?: string;
  image?: Media;
  features?: string[];
};

export type Video = { title?: string; youtube_id: string };

export type PageContent = {
  hero: {
    kicker?: string;
    title: string;
    subtitle?: string;
    price?: string;
    cta_label?: string;
    /** Optional hero background image. */
    background?: Media;
  };
  stats: Stat[];
  location?: { heading?: string; text?: string; map_query?: string };
  about?: { heading?: string; body?: string; features?: string[] };
  gallery: Media[];
  units?: Unit[];
  videos?: Video[];
  contact?: { heading?: string };
};

/** SEO + social fields authored per reading language. */
export type SeoFields = {
  meta_title?: string;
  meta_description?: string;
  canonical?: string;
  og_title?: string;
  og_description?: string;
  /** Social share image (og:image / twitter image). */
  og_image?: string;
};

/** Per-language SEO map. May also hold legacy flat fields (pre-Slice-5). */
export type PageSeo = Partial<Record<ReadingLang, SeoFields>> & {
  /** @deprecated legacy single-language fields, migrated to seo.<source_lang>. */
  meta_title?: string;
  meta_description?: string;
  canonical?: string;
};

export type PageStatus = "draft" | "published";

export type Page = {
  id: string;
  slug: string;
  status: PageStatus;
  source_lang: string;
  content: PageContent;
  seo: PageSeo;
};

export type ReadingLang = "fr" | "he" | "en";

export const READING_LANGS: ReadingLang[] = ["fr", "he", "en"];

export const RTL_READING_LANGS: ReadingLang[] = ["he"];

export function isRtlReading(lang: string): boolean {
  return RTL_READING_LANGS.includes(lang as ReadingLang);
}

/** Helpers enforcing the core render rule: only render non-empty data. */
export const hasText = (v?: string | null): v is string =>
  typeof v === "string" && v.trim().length > 0;

export const hasItems = <T>(arr?: T[] | null): arr is T[] =>
  Array.isArray(arr) && arr.length > 0;

/**
 * Idempotent migration: legacy flat seo ({ meta_title, ... }) becomes
 * seo.<sourceLang>.*. Already per-language objects pass through untouched.
 * Empty fields stay empty — nothing is fabricated.
 */
export function normalizeSeo(
  seo: PageSeo | null | undefined,
  sourceLang: string = "fr",
): Partial<Record<ReadingLang, SeoFields>> {
  const lang = (READING_LANGS.includes(sourceLang as ReadingLang)
    ? sourceLang
    : "fr") as ReadingLang;
  if (!seo) return {};

  const out: Partial<Record<ReadingLang, SeoFields>> = {};
  for (const l of READING_LANGS) {
    const v = (seo as Record<string, unknown>)[l];
    if (v && typeof v === "object") out[l] = { ...(v as SeoFields) };
  }

  // Fold any legacy flat fields into the source language (without clobbering).
  const legacy: SeoFields = {
    meta_title: seo.meta_title,
    meta_description: seo.meta_description,
    canonical: seo.canonical,
  };
  const hasLegacy = Object.values(legacy).some((x) => hasText(x as string));
  if (hasLegacy) {
    out[lang] = { ...legacy, ...(out[lang] ?? {}) };
  }
  return out;
}

/** Resolve SEO fields for a reading language (no source fallback here). */
export function seoForLang(
  seo: PageSeo | null | undefined,
  sourceLang: string,
  lang: ReadingLang,
): SeoFields {
  const norm = normalizeSeo(seo, sourceLang);
  return norm[lang] ?? {};
}

export const emptySeoFields = (): SeoFields => ({});
