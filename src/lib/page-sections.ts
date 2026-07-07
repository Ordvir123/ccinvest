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
