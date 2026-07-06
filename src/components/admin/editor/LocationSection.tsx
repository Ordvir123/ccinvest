import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/admin/editor-parts";
import { READING_LANGS } from "@/types/page";
import type { PageEditorState } from "@/components/admin/editor/usePageEditorState";

export function LocationSection({ s }: { s: PageEditorState }) {
  const { content, patchLocation } = s;
  return (
    <>
      <Field label="Heading">
        <Input
          value={content.location?.heading ?? ""}
          onChange={(e) => patchLocation({ heading: e.target.value })}
        />
      </Field>
      <Field label="Text">
        <Textarea
          rows={3}
          value={content.location?.text ?? ""}
          onChange={(e) => patchLocation({ text: e.target.value })}
        />
      </Field>
      <Field label="Map query" hint="Used to build a Google Maps embed.">
        <Input
          value={content.location?.map_query ?? ""}
          onChange={(e) => patchLocation({ map_query: e.target.value })}
        />
      </Field>
      <Field
        label="Street / location name (per language)"
        hint="Proper nouns (Montefiore, Allenby…). Entered manually per locale — never machine-translated."
      >
        <div className="grid grid-cols-3 gap-2">
          {READING_LANGS.map((l) => (
            <Input
              key={l}
              placeholder={l.toUpperCase()}
              value={content.location?.name_i18n?.[l] ?? ""}
              onChange={(e) =>
                patchLocation({
                  name_i18n: { ...(content.location?.name_i18n ?? {}), [l]: e.target.value },
                })
              }
            />
          ))}
        </div>
      </Field>
      {content.location?.map_query && (
        <iframe
          title="Map preview"
          className="h-48 w-full rounded-md border border-border"
          loading="lazy"
          src={`https://maps.google.com/maps?q=${encodeURIComponent(content.location.map_query)}&t=m&z=15&output=embed`}
        />
      )}
    </>
  );
}
