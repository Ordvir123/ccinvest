// Shared model for the page's reorderable / toggleable content sections.
import type { PageContent } from "@/types/page";

/**
 * Keys for every content section that actually renders on the public page.
 * `listing` maps to Units (project pages) or the single Apartment block
 * (apartment pages). Hero is intentionally excluded — it always renders first.
 */
export type SectionKey =
  | "stats"
  | "location"
  | "listing"
  | "gallery"
  | "wide_images"
  | "videos"
  | "contact";

export const DEFAULT_SECTION_ORDER: SectionKey[] = [
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
  stats: "Stats",
  location: "Location",
  listing: "Apartment / Units",
  gallery: "Gallery",
  wide_images: "Wide images",
  videos: "Videos",
  contact: "Contact",
};

/** Effective section order: saved order first, then any newly-added defaults. */
export function orderedSectionKeys(content: PageContent): SectionKey[] {
  const saved = (content.section_order ?? []).filter((k): k is SectionKey =>
    DEFAULT_SECTION_ORDER.includes(k as SectionKey),
  );
  const missing = DEFAULT_SECTION_ORDER.filter((k) => !saved.includes(k));
  return [...saved, ...missing];
}

export function isSectionHidden(content: PageContent, key: SectionKey): boolean {
  return (content.hidden_sections ?? []).includes(key);
}
