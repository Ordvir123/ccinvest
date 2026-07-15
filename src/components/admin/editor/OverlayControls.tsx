import { Field } from "@/components/admin/editor-parts";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEFAULT_HERO_OVERLAY, HERO_OVERLAY_COLORS } from "@/lib/hero-overlay";
import type { HeroOverlay, HeroOverlayColor } from "@/types/page";

/**
 * Reusable overlay/fade controls (opacity, direction, color).
 * Used by both the Hero section and the About section.
 */
export function OverlayControls({
  value,
  onChange,
  label = "Overlay / fade",
}: {
  value?: HeroOverlay;
  onChange: (next: HeroOverlay) => void;
  label?: string;
}) {
  const opacity = value?.opacity ?? DEFAULT_HERO_OVERLAY.opacity;
  const color = value?.color ?? DEFAULT_HERO_OVERLAY.color;
  const direction = value?.direction ?? DEFAULT_HERO_OVERLAY.direction;
  const update = (p: Partial<HeroOverlay>) =>
    onChange({ opacity, color, direction, ...p });
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="mb-3 text-sm font-medium text-foreground">{label}</p>
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
        <Select
          value={direction}
          onValueChange={(v) => update({ direction: v as HeroOverlay["direction"] })}
        >
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
