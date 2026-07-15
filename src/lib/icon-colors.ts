import type { CSSProperties } from "react";

/**
 * Curated palette + gradients used by the icon color picker across the editor.
 *
 * A color value stored on content is either:
 * - a hex string like "#ef4444" (solid), or
 * - a "grad:<key>" token that references one of the GRADIENTS below.
 *
 * Both formats round-trip as plain strings so no schema changes are required.
 */

export const SOLID_COLORS: string[] = [
  "#000000", "#ffffff", "#374151", "#64748b", "#94a3b8",
  "#ef4444", "#dc2626", "#f97316", "#f59e0b", "#eab308",
  "#facc15", "#84cc16", "#22c55e", "#16a34a", "#10b981",
  "#14b8a6", "#06b6d4", "#0ea5e9", "#3b82f6", "#2563eb",
  "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
  "#f43f5e", "#78350f", "#0c4a6e", "#4c1d95", "#C8A96A",
];

export type GradientDef = { key: string; label: string; stops: string[] };

export const GRADIENTS: GradientDef[] = [
  { key: "sunset",      label: "Sunset",      stops: ["#f97316", "#ec4899"] },
  { key: "ocean",       label: "Ocean",       stops: ["#06b6d4", "#3b82f6"] },
  { key: "forest",      label: "Forest",      stops: ["#22c55e", "#14b8a6"] },
  { key: "lavender",    label: "Lavender",    stops: ["#a855f7", "#6366f1"] },
  { key: "rose_gold",   label: "Rose gold",   stops: ["#f43f5e", "#f59e0b"] },
  { key: "peach",       label: "Peach",       stops: ["#fda4af", "#fdba74"] },
  { key: "mint",        label: "Mint",        stops: ["#10b981", "#84cc16"] },
  { key: "midnight",    label: "Midnight",    stops: ["#0f172a", "#4c1d95"] },
  { key: "fire",        label: "Fire",        stops: ["#dc2626", "#f59e0b"] },
  { key: "tropical",    label: "Tropical",    stops: ["#10b981", "#06b6d4"] },
  { key: "berry",       label: "Berry",       stops: ["#d946ef", "#ec4899"] },
  { key: "sky",         label: "Sky",         stops: ["#0ea5e9", "#a855f7"] },
  { key: "citrus",      label: "Citrus",      stops: ["#eab308", "#84cc16"] },
  { key: "aurora",      label: "Aurora",      stops: ["#22c55e", "#06b6d4", "#8b5cf6"] },
  { key: "sunrise",     label: "Sunrise",     stops: ["#f59e0b", "#ec4899", "#8b5cf6"] },
  { key: "cosmic",      label: "Cosmic",      stops: ["#6366f1", "#ec4899"] },
  { key: "emerald",     label: "Emerald",     stops: ["#10b981", "#059669"] },
  { key: "navy_gold",   label: "Navy gold",   stops: ["#011F67", "#C8A96A"] },
  { key: "silver",      label: "Silver",      stops: ["#94a3b8", "#e2e8f0"] },
  { key: "graphite",    label: "Graphite",    stops: ["#1f2937", "#6b7280"] },
];

const GRADIENT_MAP: Record<string, GradientDef> = Object.fromEntries(
  GRADIENTS.map((g) => [g.key, g]),
);

export const isGradientValue = (v?: string): v is string =>
  typeof v === "string" && v.startsWith("grad:");

export const getGradientKey = (v?: string): string | null =>
  isGradientValue(v) ? v.slice("grad:".length) : null;

export const gradientToken = (key: string): string => `grad:${key}`;

/** CSS `background` value that renders the color/gradient as a swatch. */
export function colorSwatchCss(value?: string): string | undefined {
  if (!value) return undefined;
  const key = getGradientKey(value);
  if (key) {
    const g = GRADIENT_MAP[key];
    if (!g) return undefined;
    return `linear-gradient(135deg, ${g.stops.join(", ")})`;
  }
  return value;
}

/**
 * Inline CSS for a rendered lucide icon. Solid colors set `color`
 * (SVG `stroke="currentColor"` inherits); gradients target the shared
 * <defs> registered by <IconGradientDefs /> via `stroke: url(#...)`.
 */
export function iconColorStyle(value?: string): CSSProperties | undefined {
  if (!value) return undefined;
  const key = getGradientKey(value);
  if (key && GRADIENT_MAP[key]) {
    return { color: "transparent", stroke: `url(#lov-grad-${key})` };
  }
  return { color: value };
}
