import { Input } from "@/components/ui/input";
import { Field } from "@/components/admin/editor-parts";
import { SingleImageUpload } from "@/components/admin/MediaUpload";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { READING_LANGS, isRtlReading, type HeroOverlay, type HeroOverlayColor } from "@/types/page";
import { DEFAULT_HERO_OVERLAY, HERO_OVERLAY_COLORS } from "@/lib/hero-overlay";
import {
  KICKER_PLACEHOLDERS,
  CTA_PLACEHOLDERS,
  LANG_LABELS,
} from "@/components/admin/editor/shared";
import type { PageEditorState } from "@/components/admin/editor/usePageEditorState";

export function HeroSection({ s }: { s: PageEditorState }) {
  const { content, patchHero, patchHeroI18n, onTitleChange, slug, canUpload } = s;
  return (
    <>
      <Field
        label="Kicker (per language)"
        hint="Short eyebrow above the title. Enter each language; empty locales fall back to the source language."
      >
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {READING_LANGS.map((l) => (
            <Input
              key={l}
              dir={isRtlReading(l) ? "rtl" : "ltr"}
              aria-label={`Kicker (${LANG_LABELS[l]})`}
              placeholder={KICKER_PLACEHOLDERS[l]}
              value={content.hero.kicker_i18n?.[l] ?? ""}
              onChange={(e) => patchHeroI18n("kicker_i18n", l, e.target.value)}
            />
          ))}
        </div>
      </Field>
      <Field label="Title" required>
        <Input value={content.hero.title} onChange={(e) => onTitleChange(e.target.value)} />
      </Field>
      <Field label="Subtitle">
        <Input
          value={content.hero.subtitle ?? ""}
          onChange={(e) => patchHero({ subtitle: e.target.value })}
        />
      </Field>
      <Field label="Price">
        <Input
          value={content.hero.price ?? ""}
          onChange={(e) => patchHero({ price: e.target.value })}
        />
      </Field>
      <Field
        label="CTA label (per language)"
        hint="Button text. Enter each language; empty locales fall back to the source language."
      >
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {READING_LANGS.map((l) => (
            <Input
              key={l}
              dir={isRtlReading(l) ? "rtl" : "ltr"}
              aria-label={`CTA label (${LANG_LABELS[l]})`}
              placeholder={CTA_PLACEHOLDERS[l]}
              value={content.hero.cta_label_i18n?.[l] ?? ""}
              onChange={(e) => patchHeroI18n("cta_label_i18n", l, e.target.value)}
            />
          ))}
        </div>
      </Field>
      <Field
        label="Background image"
        hint="Optional. Shown behind the hero with a dark overlay for readability."
      >
        <SingleImageUpload
          slug={slug}
          value={content.hero.background}
          onChange={(background) => patchHero({ background })}
          disabled={!canUpload}
        />
      </Field>
      {content.hero.background?.url && <OverlayControls s={s} />}
    </>
  );
}

function OverlayControls({ s }: { s: PageEditorState }) {
  const { content, patchHero } = s;
  const overlay = content.hero.overlay;
  const opacity = overlay?.opacity ?? DEFAULT_HERO_OVERLAY.opacity;
  const color = overlay?.color ?? DEFAULT_HERO_OVERLAY.color;
  const direction = overlay?.direction ?? DEFAULT_HERO_OVERLAY.direction;
  const update = (p: Partial<HeroOverlay>) =>
    patchHero({ overlay: { opacity, color, direction, ...p } });
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="mb-3 text-sm font-medium text-foreground">Overlay / fade</p>
      <Field label={`Opacity (${Math.round(opacity * 100)}%)`}>
        <Slider
          min={0}
          max={100}
          step={1}
          value={[Math.round(opacity * 100)]}
          onValueChange={([v]) => update({ opacity: v / 100 })}
        />
      </Field>
      <Field label="Direction" hint="Gradient fade origin, or flat fill.">
        <Select value={direction} onValueChange={(v) => update({ direction: v as HeroOverlay["direction"] })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="both">From top &amp; bottom</SelectItem>
            <SelectItem value="top">From top</SelectItem>
            <SelectItem value="bottom">From bottom</SelectItem>
            <SelectItem value="none">Flat</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Color">
        <Select value={color} onValueChange={(v) => update({ color: v as HeroOverlayColor })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(HERO_OVERLAY_COLORS) as HeroOverlayColor[]).map((k) => (
              <SelectItem key={k} value={k}>
                {HERO_OVERLAY_COLORS[k].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </div>
  );
}
