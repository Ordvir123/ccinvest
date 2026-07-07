// CC Invest — content schema (source of truth). Use these types everywhere.

export type Media = { url: string; alt?: string };

export type Stat = { value: string; label: string; icon?: string };

/** Closed dictionaries so admin-picked values translate reliably per locale. */
export type UnitType = "apartment" | "penthouse" | "studio" | "duplex" | "other";

export type OrientationCode =
  | "north"
  | "south"
  | "east"
  | "west"
  | "north_east"
  | "north_west"
  | "south_east"
  | "south_west";

export type ParkingCode = "one" | "none";

/** Optional per-unit preview file (floor plan): image thumbnail or PDF. */
export type UnitAttachment = { url: string; type: "image" | "pdf" };

export type Unit = {
  /** Legacy free-text title; used as fallback when unit_type is unset. */
  name: string;
  /** Dictionary-driven unit type. Rendered as "{type} {unit_number}". */
  unit_type?: UnitType;
  /** Number/identifier appended after the translated type, e.g. "4". */
  unit_number?: string;
  floor?: string;
  /** Dictionary code (north/south/...) or legacy free text. */
  orientation?: string;
  rooms?: string;
  area_m2?: string;
  balcony_m2?: string;
  /** Dictionary code (one/none) or legacy free text. */
  parking?: string;
  description?: string;
  price?: string;
  image?: Media;
  /** Optional floor-plan file (image or pdf). */
  attachment?: UnitAttachment;
  /** Legacy free-text feature list (migrated to featureRows on load). */
  features?: string[];
  /**
   * Flexible detail rows (Area, Rooms, Floor, …). When present, these fully
   * replace the fixed legacy fields above for rendering + editing.
   */
  specs?: DetailRow[];
  /** Flexible feature rows (icon + text). Replaces the legacy `features`. */
  featureRows?: DetailRow[];
};

/** How a spec value is formatted per reading language. */
export type SpecValueKind =
  | "number"
  | "area"
  | "floor"
  | "rooms"
  | "orientation"
  | "parking"
  | "text";

/**
 * A single flexible detail/feature row.
 * - `presetKey` links the row to a preset (label + icon + value formatting).
 * - `linked` true = follow the preset's label/icon; false = use overrides.
 * - `label`/`icon` are the per-row overrides used when unlinked or custom.
 * - `value` is the entered value (number, dictionary code, or free text).
 */
export type DetailRow = {
  presetKey?: string;
  linked?: boolean;
  label?: string;
  icon?: string;
  value?: string;
};

/** A reusable spec/feature preset managed in template settings. */
export type SpecPreset = {
  key: string;
  icon: string;
  /** Per-locale label so nothing leaks untranslated. */
  labels: Record<ReadingLang, string>;
  valueKind: SpecValueKind;
};

export type Video = { title?: string; youtube_id: string };

/** About section shape (also used by duplicated About instances). */
export type AboutData = {
  heading?: string;
  body?: string;
  features?: string[];
  feature_icons?: string[];
};

/** Section types that can appear multiple times per page. */
export type DuplicableSectionType = "about" | "gallery" | "wide_images" | "videos" | "stats";

/** Data payload for a duplicated instance, matching its base field's shape. */
export type ExtraSectionData = AboutData | Media[] | Video[] | Stat[];

/** A duplicated section instance stored alongside the base fields. */
export type ExtraSection = {
  id: string;
  type: DuplicableSectionType;
  data: ExtraSectionData;
};


/** Which public listing page a page belongs to. */
export type PageCategory = "apartment" | "project";

export const PAGE_CATEGORIES: PageCategory[] = ["apartment", "project"];

export type PageContent = {
  /** Public listing this page appears in. Defaults to "apartment". */
  category?: PageCategory;
  hero: {
    kicker?: string;
    /** Per-locale kicker (he/en/fr). Authored manually; falls back to `kicker`. */
    kicker_i18n?: Partial<Record<ReadingLang, string>>;
    title: string;
    subtitle?: string;
    price?: string;
    cta_label?: string;
    /** Per-locale CTA label. Authored manually; falls back to `cta_label`. */
    cta_label_i18n?: Partial<Record<ReadingLang, string>>;
    /** Optional hero background image. */
    background?: Media;
  };
  stats: Stat[];
  location?: {
    heading?: string;
    text?: string;
    map_query?: string;
    /** Per-locale proper names (streets etc.) — never machine-translated. */
    name_i18n?: Partial<Record<ReadingLang, string>>;
  };
  about?: { heading?: string; body?: string; features?: string[]; feature_icons?: string[] };
  gallery: Media[];
  /** Full-bleed "wide images" section — images span the full screen width. */
  wide_images?: Media[];
  /**
   * Extra (duplicated) section instances. Base instances keep living in their
   * own PageContent fields above; these are additional copies. Each has a
   * unique id ("<type>#2", "<type>#3", …) referenced in section_order /
   * hidden_sections, and `data` matching the base field shape of that type.
   */
  extra_sections?: ExtraSection[];
  /** Custom order of rendered content sections (instance ids from page-sections). */
  section_order?: string[];
  /** Section instance ids hidden from the public page. */
  hidden_sections?: string[];
  units?: Unit[];
  /** Single apartment block for apartment-type pages (mutually exclusive with units). */
  apartment?: Unit;
  /** Desktop image placement for the apartment section ("left"/"right" in LTR; mirrored in RTL). */
  apartment_image_side?: "left" | "right";
  /** Chosen heading for the apartment section (from settings options or free text). Empty = default per-locale heading. */
  apartment_title?: string;
  /** Icon shown beside the apartment section heading. */
  apartment_title_icon?: string;
  videos?: Video[];
  contact?: {
    heading?: string;
    /** Per-locale contact heading. Authored manually; falls back to `heading`. */
    heading_i18n?: Partial<Record<ReadingLang, string>>;
  };
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

export type PageStatus = "draft" | "published" | "archived";

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

export const hasItems = <T>(arr?: T[] | null): arr is T[] => Array.isArray(arr) && arr.length > 0;

/**
 * Idempotent migration: legacy flat seo ({ meta_title, ... }) becomes
 * seo.<sourceLang>.*. Already per-language objects pass through untouched.
 * Empty fields stay empty — nothing is fabricated.
 */
export function normalizeSeo(
  seo: PageSeo | null | undefined,
  sourceLang: string = "fr",
): Partial<Record<ReadingLang, SeoFields>> {
  const lang = (
    READING_LANGS.includes(sourceLang as ReadingLang) ? sourceLang : "fr"
  ) as ReadingLang;
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
