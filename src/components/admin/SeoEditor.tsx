import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/admin/editor-parts";
import { SingleImageUpload } from "@/components/admin/MediaUpload";
import { cn } from "@/lib/utils";
import {
  READING_LANGS,
  hasText,
  type PageContent,
  type PageSeo,
  type ReadingLang,
  type SeoFields,
} from "@/types/page";

const TITLE_MAX = 60;
const DESC_MAX = 155;
const DOMAIN = "ccinvest.lovable.app";

function CharCount({ value, max }: { value?: string; max: number }) {
  const len = (value ?? "").length;
  return (
    <span
      className={cn(
        "text-xs",
        len > max ? "text-destructive" : "text-muted-foreground",
      )}
    >
      {len}/{max}
    </span>
  );
}

/**
 * Per-language SEO + social card authoring.
 * Empty fields stay empty (never fabricated). Auto-suggest only fills a blank
 * field on focus from the source content / sibling fields.
 */
export function SeoEditor({
  seo,
  onChange,
  slug,
  content,
}: {
  seo: PageSeo;
  onChange: (next: PageSeo) => void;
  slug: string;
  content: PageContent;
}) {
  const [lang, setLang] = useState<ReadingLang>("fr");

  const fields: SeoFields = (seo[lang] as SeoFields) ?? {};

  const setField = (key: keyof SeoFields, value?: string) => {
    const nextLang: SeoFields = { ...fields, [key]: value };
    onChange({ ...seo, [lang]: nextLang });
  };

  // Auto-suggestions sourced from the (source-language) content + sibling fields.
  const suggest = {
    meta_title: content.hero.title?.trim(),
    meta_description:
      content.hero.subtitle?.trim() || content.about?.body?.trim()?.slice(0, DESC_MAX),
    canonical: slug ? `/${slug}` : "",
    og_title: fields.meta_title?.trim(),
    og_description: fields.meta_description?.trim(),
  };

  const fillIfEmpty = (key: keyof typeof suggest) => {
    if (!hasText(fields[key]) && hasText(suggest[key])) {
      setField(key, suggest[key]);
    }
  };

  const shareImage =
    fields.og_image || content.gallery?.find((m) => hasText(m.url))?.url;
  const shareTitle =
    fields.og_title || fields.meta_title || content.hero.title?.trim();
  const shareDesc = fields.og_description || fields.meta_description;

  return (
    <div className="space-y-4">
      {/* Language picker */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground">Language:</span>
        {READING_LANGS.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLang(l)}
            className={cn(
              "rounded px-2 py-0.5 text-xs font-medium",
              lang === l
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>

      <Field label="Meta title" hint="Auto-suggested from the hero title; editable.">
        <Input
          value={fields.meta_title ?? ""}
          onChange={(e) => setField("meta_title", e.target.value)}
          onFocus={() => fillIfEmpty("meta_title")}
        />
        <CharCount value={fields.meta_title} max={TITLE_MAX} />
      </Field>

      <Field label="Meta description" hint="Auto-suggested from subtitle/about; editable.">
        <Textarea
          rows={3}
          value={fields.meta_description ?? ""}
          onChange={(e) => setField("meta_description", e.target.value)}
          onFocus={() => fillIfEmpty("meta_description")}
        />
        <CharCount value={fields.meta_description} max={DESC_MAX} />
      </Field>

      <Field label="Canonical" hint="Auto-suggested from the slug; editable.">
        <Input
          value={fields.canonical ?? ""}
          onChange={(e) => setField("canonical", e.target.value)}
          onFocus={() => fillIfEmpty("canonical")}
          placeholder={slug ? `/${slug}` : "/<slug>"}
        />
      </Field>

      <hr className="hairline" />

      <p className="text-sm font-medium text-foreground">Social share card</p>

      <Field
        label="Cover image"
        hint="Used for og:image / Twitter. If empty, the first gallery image is used."
      >
        <SingleImageUpload
          slug={slug}
          value={fields.og_image ? { url: fields.og_image, alt: shareTitle } : undefined}
          onChange={(media) => setField("og_image", media?.url)}
          disabled={!slug}
        />
      </Field>

      <Field label="Social title" hint="Auto-suggested from meta title; editable.">
        <Input
          value={fields.og_title ?? ""}
          onChange={(e) => setField("og_title", e.target.value)}
          onFocus={() => fillIfEmpty("og_title")}
        />
      </Field>

      <Field label="Social description" hint="Auto-suggested from meta description; editable.">
        <Textarea
          rows={2}
          value={fields.og_description ?? ""}
          onChange={(e) => setField("og_description", e.target.value)}
          onFocus={() => fillIfEmpty("og_description")}
        />
      </Field>

      {/* Live share preview (WhatsApp / Facebook style) */}
      <div>
        <p className="mb-2 text-xs text-muted-foreground">Share preview ({lang.toUpperCase()})</p>
        <div className="max-w-sm overflow-hidden rounded-lg border border-border bg-card">
          {shareImage ? (
            <img
              src={shareImage}
              alt=""
              className="aspect-[1.91/1] w-full object-cover"
            />
          ) : (
            <div className="flex aspect-[1.91/1] w-full items-center justify-center bg-secondary text-xs text-muted-foreground">
              No image
            </div>
          )}
          <div className="space-y-1 p-3">
            <p className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">
              {DOMAIN}
            </p>
            <p className="line-clamp-2 text-sm font-semibold text-foreground">
              {hasText(shareTitle) ? shareTitle : "Untitled project"}
            </p>
            {hasText(shareDesc) && (
              <p className="line-clamp-2 text-xs text-muted-foreground">{shareDesc}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
