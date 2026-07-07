import { cn } from "@/lib/utils";
import {
  LAYOUT_LABELS,
  LAYOUT_PRESET_MAP,
  defaultLayoutForType,
  layoutsForType,
  layoutFits,
} from "@/lib/page-sections";
import type { PageEditorState } from "@/components/admin/editor/usePageEditorState";

/** Gray-rectangle schematic drawn for each layout preset (viewBox 40×24). */
function LayoutSchematic({ preset }: { preset: string }) {
  const R = (x: number, y: number, w: number, h: number) => (
    <rect
      key={`${x}-${y}-${w}-${h}`}
      x={x}
      y={y}
      width={w}
      height={h}
      rx={1.5}
      className="fill-muted-foreground/35"
    />
  );

  let shapes: React.ReactNode = null;
  switch (preset) {
    case "stacked":
      shapes = (
        <>
          {R(2, 2, 36, 6)}
          {R(2, 9, 36, 6)}
          {R(2, 16, 36, 6)}
        </>
      );
      break;
    case "grid-2":
      shapes = (
        <>
          {R(2, 3, 17, 9)}
          {R(21, 3, 17, 9)}
          {R(2, 14, 17, 9)}
          {R(21, 14, 17, 9)}
        </>
      );
      break;
    case "grid-3":
      shapes = (
        <>
          {R(2, 2, 10, 8)}
          {R(15, 2, 10, 8)}
          {R(28, 2, 10, 8)}
          {R(2, 12, 10, 8)}
          {R(15, 12, 10, 8)}
          {R(28, 12, 10, 8)}
        </>
      );
      break;
    case "masonry":
      shapes = (
        <>
          {R(2, 2, 10, 12)}
          {R(2, 15, 10, 7)}
          {R(15, 2, 10, 7)}
          {R(15, 10, 10, 12)}
          {R(28, 2, 10, 10)}
          {R(28, 13, 10, 9)}
        </>
      );
      break;
    case "two-landscape":
      shapes = (
        <>
          {R(2, 6, 17, 12)}
          {R(21, 6, 17, 12)}
        </>
      );
      break;
    case "two-portrait":
      shapes = (
        <>
          {R(6, 2, 12, 20)}
          {R(22, 2, 12, 20)}
        </>
      );
      break;
    case "asym-pair":
      shapes = (
        <>
          {R(2, 4, 23, 16)}
          {R(27, 4, 11, 16)}
        </>
      );
      break;
    case "one-large-two-stack":
      shapes = (
        <>
          {R(2, 2, 20, 20)}
          {R(24, 2, 14, 9)}
          {R(24, 13, 14, 9)}
        </>
      );
      break;
    case "two-top-one-wide":
      shapes = (
        <>
          {R(2, 2, 17, 9)}
          {R(21, 2, 17, 9)}
          {R(2, 13, 36, 9)}
        </>
      );
      break;
    case "one-wide-two-bottom":
      shapes = (
        <>
          {R(2, 2, 36, 9)}
          {R(2, 13, 17, 9)}
          {R(21, 13, 17, 9)}
        </>
      );
      break;
    case "one-large-three-stack":
      shapes = (
        <>
          {R(2, 2, 20, 20)}
          {R(24, 2, 14, 5.3)}
          {R(24, 9.3, 14, 5.3)}
          {R(24, 16.6, 14, 5.3)}
        </>
      );
      break;
    case "one-wide-three-cols":
      shapes = (
        <>
          {R(2, 2, 36, 9)}
          {R(2, 13, 10, 9)}
          {R(15, 13, 10, 9)}
          {R(28, 13, 10, 9)}
        </>
      );
      break;
    case "two-over-three":
      shapes = (
        <>
          {R(2, 2, 17, 9)}
          {R(21, 2, 17, 9)}
          {R(2, 13, 10, 9)}
          {R(15, 13, 10, 9)}
          {R(28, 13, 10, 9)}
        </>
      );
      break;
    case "one-wide-2x2":
      shapes = (
        <>
          {R(2, 2, 36, 7)}
          {R(2, 11, 17, 5.5)}
          {R(21, 11, 17, 5.5)}
          {R(2, 17.5, 17, 5.5)}
          {R(21, 17.5, 17, 5.5)}
        </>
      );
      break;
    default:
      shapes = R(2, 2, 36, 20);
  }

  return (
    <svg viewBox="0 0 40 24" className="h-12 w-full" aria-hidden>
      {shapes}
    </svg>
  );
}

/**
 * Visual layout picker for a gallery / wide_images section instance. Presets
 * that do not fit the current image count render disabled with an explanatory
 * tooltip; only valid presets are clickable.
 */
export function LayoutPicker({
  s,
  id,
  type,
  count,
}: {
  s: PageEditorState;
  id: string;
  type: "gallery" | "wide_images";
  count: number;
}) {
  const presets = layoutsForType(type);
  const current = s.getLayout(id) ?? defaultLayoutForType(type);

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-foreground">Layout</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {presets.map((preset) => {
          const def = LAYOUT_PRESET_MAP[preset];
          const fits = layoutFits(preset, count);
          const selected = current === preset;
          const tooltip = fits
            ? (LAYOUT_LABELS[preset] ?? preset)
            : def?.flexible
              ? `Requires at least ${def.minCount} images (currently ${count})`
              : `Requires multiples of ${def?.groupSize ?? 1} images (currently ${count})`;
          return (
            <button
              key={preset}
              type="button"
              disabled={!fits}
              title={tooltip}
              onClick={() => fits && s.setLayout(id, preset)}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-lg border bg-card p-2 text-center transition-colors",
                fits ? "hover:border-primary/60" : "cursor-not-allowed opacity-40",
                selected && fits ? "border-primary ring-2 ring-primary" : "border-border",
              )}
            >
              <span className="flex h-12 w-full items-center justify-center rounded bg-muted/50 px-1">
                <LayoutSchematic preset={preset} />
              </span>
              <span className="text-[0.7rem] leading-tight text-muted-foreground">
                {LAYOUT_LABELS[preset] ?? preset}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
