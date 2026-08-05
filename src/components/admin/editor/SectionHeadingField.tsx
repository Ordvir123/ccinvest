import { Input } from "@/components/ui/input";
import { Field } from "@/components/admin/editor-parts";
import { READING_LANGS, isRtlReading, type ReadingLang } from "@/types/page";
import { LANG_LABELS } from "@/components/admin/editor/shared";
import { getSectionType, type SectionKey } from "@/lib/page-sections";
import type { PageEditorState } from "@/components/admin/editor/usePageEditorState";

/** Default (built-in) heading shown on the public page, per section + locale. */
const DEFAULT_HEADINGS: Partial<Record<SectionKey, Record<ReadingLang, string>>> = {
  gallery: { fr: "Galerie", he: "גלריה", en: "Gallery" },
  videos: { fr: "Vidéos", he: "סרטונים", en: "Videos" },
  location: { fr: "Emplacement idéal", he: "מיקום אידיאלי", en: "Ideal location" },
  listing: { fr: "Appartements disponibles", he: "דירות זמינות", en: "Available apartments" },
};

const NO_DEFAULT: Record<ReadingLang, string> = {
  fr: "Aucun titre (laisser vide)",
  he: "ללא כותרת",
  en: "No heading",
};

/**
 * Per-locale heading override for a section instance. Empty locales fall back
 * to the built-in translated heading (or to no heading when there isn't one).
 */
export function SectionHeadingField({ s, id }: { s: PageEditorState; id: string }) {
  const type = getSectionType(id);
  const defaults = DEFAULT_HEADINGS[type];
  const map = s.content.section_headings?.[id] ?? {};
  return (
    <Field
      label="Section heading (per language)"
      hint="Overrides the default title shown on the public page. Empty locales keep the default."
    >
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {READING_LANGS.map((l) => (
          <Input
            key={l}
            dir={isRtlReading(l) ? "rtl" : "ltr"}
            aria-label={`Section heading (${LANG_LABELS[l]})`}
            placeholder={defaults?.[l] ?? NO_DEFAULT[l]}
            value={map[l] ?? ""}
            onChange={(e) => s.setSectionHeading(id, l, e.target.value)}
          />
        ))}
      </div>
    </Field>
  );
}
