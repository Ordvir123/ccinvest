import { Input } from "@/components/ui/input";
import { Field } from "@/components/admin/editor-parts";
import { READING_LANGS, isRtlReading } from "@/types/page";
import {
  CONTACT_HEADING_PLACEHOLDERS,
  LANG_LABELS,
} from "@/components/admin/editor/shared";
import type { PageEditorState } from "@/components/admin/editor/usePageEditorState";

export function ContactSection({ s }: { s: PageEditorState }) {
  const { content, patchContact } = s;
  return (
    <Field
      label="Heading (per language)"
      hint="Shown above the contact form. Enter each language; empty locales fall back to the source language."
    >
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {READING_LANGS.map((l) => (
          <Input
            key={l}
            dir={isRtlReading(l) ? "rtl" : "ltr"}
            aria-label={`Contact heading (${LANG_LABELS[l]})`}
            placeholder={CONTACT_HEADING_PLACEHOLDERS[l]}
            value={content.contact?.heading_i18n?.[l] ?? ""}
            onChange={(e) =>
              patchContact({
                heading_i18n: { ...(content.contact?.heading_i18n ?? {}), [l]: e.target.value },
              })
            }
          />
        ))}
      </div>
    </Field>
  );
}
