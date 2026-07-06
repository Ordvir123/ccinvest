import { Input } from "@/components/ui/input";
import { Field } from "@/components/admin/editor-parts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PageContent } from "@/types/page";
import { SOURCE_LANGS } from "@/components/admin/editor/shared";
import type { PageEditorState } from "@/components/admin/editor/usePageEditorState";

export function MetaSection({ s }: { s: PageEditorState }) {
  const {
    slug,
    setSlugTouched,
    onSlugChange,
    checkSlugUnique,
    slugError,
    publicUrl,
    sourceLang,
    setSourceLang,
    content,
    patch,
  } = s;
  return (
    <>
      <Field label="Slug" required hint={`Public URL: ${publicUrl}`}>
        <Input
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            onSlugChange(e.target.value);
          }}
          onBlur={checkSlugUnique}
          placeholder="montefiore-allenby"
        />
        {slugError && <p className="text-xs text-destructive">{slugError}</p>}
      </Field>
      <Field label="Source language">
        <Select value={sourceLang} onValueChange={setSourceLang}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SOURCE_LANGS.map((l) => (
              <SelectItem key={l} value={l}>
                {l.toUpperCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Listing page" hint="Choose where this page appears on the public site.">
        <Select
          value={content.category ?? "apartment"}
          onValueChange={(v) => patch({ category: v as PageContent["category"] })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="apartment">Apartments (/appartements)</SelectItem>
            <SelectItem value="project">Projects (/projects)</SelectItem>
          </SelectContent>
        </Select>
      </Field>
    </>
  );
}
