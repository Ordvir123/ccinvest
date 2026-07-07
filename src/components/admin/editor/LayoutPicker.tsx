import { cn } from "@/lib/utils";
import {
  LAYOUT_LABELS,
  defaultLayoutForType,
  layoutsForType,
} from "@/lib/page-sections";
import type { PageEditorState } from "@/components/admin/editor/usePageEditorState";

/** Minimal gray-rectangle schematic drawn for each layout preset. */
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
    case "one-wide":
    case "stack":
      shapes = (
        <>
          {R(2, 3, 36, 7)}
          {R(2, 12, 36, 7)}
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
    case "two-top-one-wide":
      shapes = (
        <>
          {R(2, 2, 17, 9)}
          {R(21, 2, 17, 9)}
          {R(2, 13, 36, 9)}
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
 * Visual layout picker for a gallery / wide_images section instance. Shows only
 * the presets valid for the section type; the selected card gets a primary ring.
 */
export function LayoutPicker({
  s,
  id,
  type,
}: {
  s: PageEditorState;
  id: string;
  type: "gallery" | "wide_images";
}) {
  const presets = layoutsForType(type);
  const current = s.getLayout(id) ?? defaultLayoutForType(type);

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-foreground">Layout</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {presets.map((preset) => {
          const selected = current === preset;
          return (
            <button
              key={preset}
              type="button"
              onClick={() => s.setLayout(id, preset)}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-lg border bg-card p-2 text-center transition-colors hover:border-primary/60",
                selected ? "border-primary ring-2 ring-primary" : "border-border",
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
