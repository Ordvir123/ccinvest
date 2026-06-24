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
  };
  stats: Stat[];
  location?: { heading?: string; text?: string; map_query?: string };
  about?: { heading?: string; body?: string; features?: string[] };
  gallery: Media[];
  units?: Unit[];
  videos?: Video[];
  contact?: { heading?: string };
};

export type PageSeo = {
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
