// Shared model for the page's reorderable / toggleable content sections.
import type { PageContent } from "@/types/page";

/**
 * Keys for every content section that actually renders on the public page.
 * `listing` maps to Units (project pages) or the single Apartment block
 * (apartment pages). Hero is intentionally excluded — it always renders first.
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

/**
 * Effective section order: honour the saved order, but insert any base keys
 * missing from it at their canonical DEFAULT_SECTION_ORDER index (not appended
 * at the end) — so existing pages get a newly-added section like About right
 * after the hero rather than after Contact.
 */
export function orderedSectionKeys(content: PageContent): SectionKey[] {
  const saved = (content.section_order ?? []).filter((k): k is SectionKey =>
    DEFAULT_SECTION_ORDER.includes(k as SectionKey),
  );
  const result: SectionKey[] = [...saved];
  DEFAULT_SECTION_ORDER.forEach((key, defaultIdx) => {
    if (result.includes(key)) return;
    // Find the insertion point: after the previous default key that is present.
    let insertAt = result.length;
    for (let i = 0; i < result.length; i++) {
      if (DEFAULT_SECTION_ORDER.indexOf(result[i]) > defaultIdx) {
        insertAt = i;
        break;
      }
    }
    result.splice(insertAt, 0, key);
  });
  return result;
}

export function isSectionHidden(content: PageContent, key: SectionKey): boolean {
  return (content.hidden_sections ?? []).includes(key);
}
