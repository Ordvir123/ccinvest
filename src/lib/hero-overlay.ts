import type { CSSProperties } from "react";
import type { HeroOverlay, HeroOverlayColor } from "@/types/page";

/** Brand-token RGB values for overlay colors (navy gradient family + black). */
export const HERO_OVERLAY_COLORS: Record<HeroOverlayColor, { label: string; rgb: string }> = {
  navy: { label: "Navy", rgb: "5, 40, 111" }, // #05286F
  deep_navy: { label: "Deep navy", rgb: "1, 31, 103" }, // #011F67
  black: { label: "Black", rgb: "0, 0, 0" },
};

export const DEFAULT_HERO_OVERLAY: Required<HeroOverlay> = {
  opacity: 0.55,
  color: "navy",
  direction: "both",
};

/**
 * Build the inline style for the hero overlay from the (optional) config.
 * Returns null when no overlay config is present so the renderer keeps its
 * legacy default overlay.
 */
export function heroOverlayStyle(overlay?: HeroOverlay): CSSProperties | null {
  if (!overlay) return null;
  const opacity = clamp01(overlay.opacity ?? DEFAULT_HERO_OVERLAY.opacity);
  const rgb = HERO_OVERLAY_COLORS[overlay.color ?? DEFAULT_HERO_OVERLAY.color].rgb;
  const direction = overlay.direction ?? DEFAULT_HERO_OVERLAY.direction;

  const strong = `rgba(${rgb}, ${opacity})`;
  const soft = `rgba(${rgb}, ${(opacity * 0.15).toFixed(3)})`;

  switch (direction) {
    case "none":
      return { backgroundColor: strong };
    case "top":
      return { backgroundImage: `linear-gradient(to bottom, ${strong}, ${soft})` };
    case "bottom":
      return { backgroundImage: `linear-gradient(to top, ${strong}, ${soft})` };
    case "both":
    default:
      return {
        backgroundImage: `linear-gradient(to bottom, ${strong}, ${soft} 50%, ${strong})`,
      };
  }
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}
