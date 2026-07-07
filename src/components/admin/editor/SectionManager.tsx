import { Eye, EyeOff, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDragReorder } from "@/components/admin/reorder";
import {
  SECTION_LABELS,
  isSectionHidden,
  type SectionKey,
} from "@/lib/page-sections";
import type { PageContent } from "@/types/page";

/**
 * Compact, pinned list of the page's sections: drag to reorder
 * (writes section_order), eye toggle per section (writes hidden_sections),
 * click a name to scroll the editor to that section's card.
 *
 * Hero is intentionally excluded — it always renders first on the public page
 * and must never be hideable or reorderable, so it is not in `orderedKeys`.
 */
export function SectionManager({
  orderedKeys,
  content,
  onReorder,
  onToggle,
  onSelect,
}: {
  orderedKeys: SectionKey[];
  content: PageContent;
  onReorder: (next: SectionKey[]) => void;
  onToggle: (key: SectionKey) => void;
  onSelect: (key: SectionKey) => void;
}) {
  const { rowProps, dragIndex, overIndex } = useDragReorder(orderedKeys, onReorder);

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="mb-1 font-medium text-foreground">Page sections</p>
      <p className="mb-3 text-xs text-muted-foreground">
        Drag to reorder. Use the eye to show or hide. Click a name to jump to its editor.
      </p>
      <div className="space-y-1">
        {orderedKeys.map((key, i) => {
          const hidden = isSectionHidden(content, key);
          return (
            <div
              key={key}
              {...rowProps(i)}
              className={cn(
                "flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-sm",
                overIndex === i && dragIndex !== i && "ring-2 ring-primary",
                dragIndex === i && "opacity-50",
              )}
            >
              <GripVertical
                className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground active:cursor-grabbing"
                aria-hidden
              />
              <button
                type="button"
                onClick={() => onSelect(key)}
                className={cn(
                  "min-w-0 flex-1 truncate text-left hover:text-primary",
                  hidden && "text-muted-foreground line-through",
                )}
              >
                {SECTION_LABELS[key]}
              </button>
              <button
                type="button"
                onClick={() => onToggle(key)}
                aria-label={hidden ? "Show section" : "Hide section"}
                title={hidden ? "Show section" : "Hide section"}
                className="shrink-0 rounded p-1 text-muted-foreground hover:text-foreground"
              >
                {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
