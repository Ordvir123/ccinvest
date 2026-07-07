// Shared model for the page's reorderable / toggleable content sections.
//
// Sections can now appear MULTIPLE times per page (section instances). Each
// instance has a string id: for the base instance the id IS the type name
// ("gallery"); duplicates get ids "<type>#2", "<type>#3", … Base instances keep
// living in their existing PageContent fields; duplicates live in
// `content.extra_sections`. section_order / hidden_sections hold instance ids.
import type {
  AboutData,
  DuplicableSectionType,
  ExtraSection,
  ExtraSectionData,
  Media,
  PageContent,
  Stat,
  Video,
} from "@/types/page";

/**
 * Keys for every content section that actually renders on the public page.
 * `listing` maps to Units (project pages) or the single Apartment block
 * (apartment pages). Hero is intentionally excluded — it always renders first
 * and is never duplicated or hidden.
 */
export type SectionKey =
  | "about"
  | "stats"
  | "location"
  | "listing"
  | "gallery"
  | "wide_images"
  | "videos"
  | "contact";

export const DEFAULT_SECTION_ORDER: SectionKey[] = [
  "about",
  "stats",
  "location",
  "listing",
  "gallery",
  "wide_images",
  "videos",
  "contact",
];

/** English admin labels for each section (used in the editor UI). */
export const SECTION_LABELS: Record<SectionKey, string> = {
  about: "About",
  stats: "Stats",
  location: "Location",
  listing: "Apartment / Units",
  gallery: "Gallery",
  wide_images: "Wide images",
  videos: "Videos",
  contact: "Contact",
};

/** Section types that support multiple instances (duplication). */
const DUPLICABLE_TYPES: DuplicableSectionType[] = [
  "about",
  "gallery",
  "wide_images",
  "videos",
  "stats",
];

export function isDuplicable(type: string): type is DuplicableSectionType {
  return (DUPLICABLE_TYPES as string[]).includes(type);
}

/** The section type of an instance id ("gallery#2" -> "gallery"). */
export function getSectionType(id: string): SectionKey {
  return id.split("#")[0] as SectionKey;
}

/** True when the id refers to a base (non-duplicated) instance. */
export function isBaseId(id: string): boolean {
  return !id.includes("#");
}

/** All duplicate instance ids currently stored in extra_sections. */
function extraIds(content: PageContent): string[] {
  return (content.extra_sections ?? []).map((e) => e.id);
}

/** Every instance id that exists: the base keys plus any extra_sections ids. */
function existingIds(content: PageContent): Set<string> {
  return new Set<string>([...DEFAULT_SECTION_ORDER, ...extraIds(content)]);
}

/**
 * Effective section order (instance ids): honour the saved order (filtered to
 * ids that still exist), then insert any missing BASE keys at their canonical
 * DEFAULT_SECTION_ORDER index — so existing pages get a newly-added base
 * section in the right place. Any orphan duplicate ids are appended so their
 * data is never lost.
 */
export function orderedSectionIds(content: PageContent): string[] {
  const exists = existingIds(content);
  const saved = (content.section_order ?? []).filter((id) => exists.has(id));
  const result: string[] = [...saved];

  DEFAULT_SECTION_ORDER.forEach((key, defaultIdx) => {
    if (result.includes(key)) return;
    // Insert before the first later base key already present in the result.
    let insertAt = result.length;
    for (let i = 0; i < result.length; i++) {
      const k = result[i];
      if (isBaseId(k) && DEFAULT_SECTION_ORDER.indexOf(k as SectionKey) > defaultIdx) {
        insertAt = i;
        break;
      }
    }
    result.splice(insertAt, 0, key);
  });

  // Append any duplicate ids not already ordered (safety — never drop data).
  for (const id of extraIds(content)) {
    if (!result.includes(id)) result.push(id);
  }
  return result;
}

/** Label for a section instance: base label, plus " 2", " 3", … for duplicates. */
export function sectionLabel(content: PageContent, id: string): string {
  const type = getSectionType(id);
  const base = SECTION_LABELS[type];
  const sameType = orderedSectionIds(content).filter((x) => getSectionType(x) === type);
  const idx = sameType.indexOf(id);
  return idx <= 0 ? base : `${base} ${idx + 1}`;
}

export function isSectionHidden(content: PageContent, id: string): boolean {
  return (content.hidden_sections ?? []).includes(id);
}

/* ============================================================
 * Per-instance data access.
 * ============================================================ */

/** Empty data for a freshly-created instance of a given type. */
export function emptySectionData(type: DuplicableSectionType): ExtraSectionData {
  switch (type) {
    case "about":
      return {} as AboutData;
    case "gallery":
    case "wide_images":
      return [] as Media[];
    case "videos":
      return [] as Video[];
    case "stats":
      return [] as Stat[];
  }
}

/** Resolve the current data for an instance id (base field or extra entry). */
export function getSectionData(content: PageContent, id: string): ExtraSectionData | undefined {
  if (isBaseId(id)) {
    switch (id as SectionKey) {
      case "about":
        return content.about as AboutData | undefined;
      case "gallery":
        return content.gallery as Media[] | undefined;
      case "wide_images":
        return content.wide_images as Media[] | undefined;
      case "videos":
        return content.videos as Video[] | undefined;
      case "stats":
        return content.stats as Stat[] | undefined;
      default:
        return undefined;
    }
  }
  return (content.extra_sections ?? []).find((e) => e.id === id)?.data;
}

/** Return a new content object with an instance's data updated. */
export function setSectionData(
  content: PageContent,
  id: string,
  data: ExtraSectionData,
): PageContent {
  if (isBaseId(id)) {
    switch (id as SectionKey) {
      case "about":
        return { ...content, about: data as AboutData };
      case "gallery":
        return { ...content, gallery: data as Media[] };
      case "wide_images":
        return { ...content, wide_images: data as Media[] };
      case "videos":
        return { ...content, videos: data as Video[] };
      case "stats":
        return { ...content, stats: data as Stat[] };
      default:
        return content;
    }
  }
  const extras = (content.extra_sections ?? []).map((e) => (e.id === id ? { ...e, data } : e));
  return { ...content, extra_sections: extras };
}

/** Generate the next free duplicate id for a type ("gallery#2", "gallery#3"…). */
export function newInstanceId(content: PageContent, type: DuplicableSectionType): string {
  const used = new Set<string>([...DEFAULT_SECTION_ORDER, ...extraIds(content)]);
  let n = 2;
  while (used.has(`${type}#${n}`)) n += 1;
  return `${type}#${n}`;
}

/**
 * Duplicate an instance: deep-copy the SOURCE instance's current data into a
 * new extra_sections entry and insert its id in section_order right after the
 * source. Returns the new content and the new id.
 */
export function duplicateSection(
  content: PageContent,
  sourceId: string,
): { content: PageContent; newId: string } {
  const type = getSectionType(sourceId);
  if (!isDuplicable(type)) return { content, newId: sourceId };

  const sourceData = getSectionData(content, sourceId) ?? emptySectionData(type);
  const newId = newInstanceId(content, type);
  const entry: ExtraSection = {
    id: newId,
    type,
    data: structuredClone(sourceData),
  };

  const order = orderedSectionIds(content);
  const at = order.indexOf(sourceId);
  const nextOrder = [...order];
  nextOrder.splice(at < 0 ? nextOrder.length : at + 1, 0, newId);

  return {
    content: {
      ...content,
      extra_sections: [...(content.extra_sections ?? []), entry],
      section_order: nextOrder,
    },
    newId,
  };
}

/**
 * Delete a DUPLICATE instance (base instances are never deletable): removes its
 * extra_sections entry and its id from section_order / hidden_sections.
 */
export function deleteSection(content: PageContent, id: string): PageContent {
  if (isBaseId(id)) return content;
  return {
    ...content,
    extra_sections: (content.extra_sections ?? []).filter((e) => e.id !== id),
    section_order: (content.section_order ?? orderedSectionIds(content)).filter((x) => x !== id),
    hidden_sections: (content.hidden_sections ?? []).filter((x) => x !== id),
  };
}

/* ============================================================
 * Layout presets (Gallery / Wide images).
 * ============================================================ */

/**
 * Layout preset catalog. `flexible` presets work with any count once `minCount`
 * is met (incomplete last row centered). Strict patterns are selectable only
 * when count >= groupSize AND count % groupSize === 0 (the pattern repeats).
 */
export type LayoutPresetDef = {
  key: string;
  groupSize: number;
  flexible: boolean;
  minCount: number;
  /** Section types that allow this preset. */
  types: readonly ("gallery" | "wide_images")[];
};

const BOTH = ["gallery", "wide_images"] as const;
const GALLERY_ONLY = ["gallery"] as const;

export const LAYOUT_PRESETS: readonly LayoutPresetDef[] = [
  // Flexible
  { key: "stacked", groupSize: 1, flexible: true, minCount: 1, types: BOTH },
  { key: "grid-2", groupSize: 2, flexible: true, minCount: 2, types: GALLERY_ONLY },
  { key: "grid-3", groupSize: 3, flexible: true, minCount: 3, types: GALLERY_ONLY },
  { key: "masonry", groupSize: 3, flexible: true, minCount: 3, types: GALLERY_ONLY },
  // Strict patterns
  { key: "two-landscape", groupSize: 2, flexible: false, minCount: 2, types: BOTH },
  { key: "two-portrait", groupSize: 2, flexible: false, minCount: 2, types: BOTH },
  { key: "asym-pair", groupSize: 2, flexible: false, minCount: 2, types: BOTH },
  { key: "one-large-two-stack", groupSize: 3, flexible: false, minCount: 3, types: BOTH },
  { key: "two-top-one-wide", groupSize: 3, flexible: false, minCount: 3, types: BOTH },
  { key: "one-wide-two-bottom", groupSize: 3, flexible: false, minCount: 3, types: BOTH },
  { key: "one-large-three-stack", groupSize: 4, flexible: false, minCount: 4, types: BOTH },
  { key: "one-wide-three-cols", groupSize: 4, flexible: false, minCount: 4, types: BOTH },
  { key: "two-over-three", groupSize: 5, flexible: false, minCount: 5, types: BOTH },
  { key: "one-wide-2x2", groupSize: 5, flexible: false, minCount: 5, types: BOTH },
];

export const LAYOUT_PRESET_MAP: Record<string, LayoutPresetDef> = Object.fromEntries(
  LAYOUT_PRESETS.map((p) => [p.key, p]),
);

/** Legacy → current key migration so saved pages keep their look. */
const LAYOUT_MIGRATION: Record<string, string> = {
  "one-wide": "stacked",
  stack: "stacked",
};

/** Normalize any stored/legacy layout value to a current preset key. */
export function migrateLayout(layout?: string): string | undefined {
  if (!layout) return layout;
  return LAYOUT_MIGRATION[layout] ?? layout;
}

/** All gallery layout preset keys, in picker order. */
export const GALLERY_LAYOUTS = LAYOUT_PRESETS.filter((p) => p.types.includes("gallery")).map(
  (p) => p.key,
) as readonly string[];

/** Wide-images layout preset keys, in picker order. */
export const WIDE_LAYOUTS = LAYOUT_PRESETS.filter((p) => p.types.includes("wide_images")).map(
  (p) => p.key,
) as readonly string[];

export const DEFAULT_GALLERY_LAYOUT = "grid-3";
export const DEFAULT_WIDE_LAYOUT = "stacked";

/** Human labels for the layout picker. */
export const LAYOUT_LABELS: Record<string, string> = {
  stacked: "Stacked",
  "grid-2": "2 columns",
  "grid-3": "3 columns",
  masonry: "Masonry",
  "two-landscape": "Pair (landscape)",
  "two-portrait": "Pair (portrait)",
  "asym-pair": "Asymmetric pair",
  "one-large-two-stack": "One large + two",
  "two-top-one-wide": "Two + one wide",
  "one-wide-two-bottom": "One wide + two",
  "one-large-three-stack": "One large + three",
  "one-wide-three-cols": "One wide + three",
  "two-over-three": "Two over three",
  "one-wide-2x2": "One wide + 2×2",
};

/** Valid preset keys for a section type ("gallery" | "wide_images"). */
export function layoutsForType(type: string): readonly string[] {
  return type === "wide_images" ? WIDE_LAYOUTS : GALLERY_LAYOUTS;
}

/** Default layout for a section type. */
export function defaultLayoutForType(type: string): string {
  return type === "wide_images" ? DEFAULT_WIDE_LAYOUT : DEFAULT_GALLERY_LAYOUT;
}

/** Group size for a preset (1 when unknown). */
export function layoutGroupSize(key: string): number {
  return LAYOUT_PRESET_MAP[key]?.groupSize ?? 1;
}

/** Whether a preset fits a given image count. */
export function layoutFits(key: string, count: number): boolean {
  const def = LAYOUT_PRESET_MAP[migrateLayout(key) ?? ""];
  if (!def) return false;
  if (def.flexible) return count >= def.minCount;
  return count >= def.groupSize && count % def.groupSize === 0;
}

/**
 * Resolve the concrete preset the renderer should use for a stored value and
 * image count. Migrates legacy keys; if the value is unknown or does not fit,
 * falls back to the type default, then to "stacked" (which always fits).
 */
export function effectiveLayout(type: string, layout: string | undefined, count: number): string {
  const migrated = migrateLayout(layout);
  if (migrated && LAYOUT_PRESET_MAP[migrated] && layoutFits(migrated, count)) return migrated;
  const def = defaultLayoutForType(type);
  if (layoutFits(def, count)) return def;
  return "stacked";
}


/**
 * Current layout value for a gallery / wide_images instance, or undefined when
 * none is stored (renderer then keeps the legacy look). Non-media sections
 * always return undefined.
 */
export function getSectionLayout(content: PageContent, id: string): string | undefined {
  const type = getSectionType(id);
  if (type !== "gallery" && type !== "wide_images") return undefined;
  if (isBaseId(id)) {
    return type === "gallery" ? content.gallery_layout : content.wide_images_layout;
  }
  return (content.extra_sections ?? []).find((e) => e.id === id)?.layout;
}

/** Return new content with a media instance's layout preset updated. */
export function setSectionLayout(
  content: PageContent,
  id: string,
  layout: string,
): PageContent {
  const type = getSectionType(id);
  if (isBaseId(id)) {
    if (type === "gallery") return { ...content, gallery_layout: layout };
    if (type === "wide_images") return { ...content, wide_images_layout: layout };
    return content;
  }
  const extras = (content.extra_sections ?? []).map((e) =>
    e.id === id ? { ...e, layout } : e,
  );
  return { ...content, extra_sections: extras };
}
