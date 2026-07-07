import { Copy, Eye, EyeOff, GripVertical, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDragReorder } from "@/components/admin/reorder";
import {
  sectionLabel,
  isSectionHidden,
  isBaseId,
  isDuplicable,
  getSectionType,
} from "@/lib/page-sections";
import type { PageContent } from "@/types/page";

/**
 * Compact, pinned list of the page's section INSTANCES: drag to reorder
 * (writes section_order), eye toggle per instance (writes hidden_sections),
 * duplicate (duplicable types only), delete (duplicates only), and click a
 * name to scroll the editor to that instance's card.
 *
 * Hero is intentionally excluded — it always renders first on the public page
 * and must never be hideable, duplicable, or reorderable.
 */
export function SectionManager({
  orderedIds,
  content,
  onReorder,
  onToggle,
  onSelect,
  onDuplicate,
  onDelete,
}: {
  orderedIds: string[];
  content: PageContent;
  onReorder: (next: string[]) => void;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const { rowProps, dragIndex, overIndex } = useDragReorder(orderedIds, onReorder);

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="mb-1 font-medium text-foreground">Page sections</p>
      <p className="mb-3 text-xs text-muted-foreground">
        Drag to reorder. Use the eye to show or hide. Duplicate repeatable sections; click a name to
        jump to its editor.
      </p>
      <div className="space-y-1">
        {orderedIds.map((id, i) => {
          const hidden = isSectionHidden(content, id);
          const type = getSectionType(id);
          const duplicable = isDuplicable(type);
          const isDuplicate = !isBaseId(id);
          return (
            <div
              key={id}
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
                onClick={() => onSelect(id)}
                className={cn(
                  "min-w-0 flex-1 truncate text-left hover:text-primary",
                  hidden && "text-muted-foreground line-through",
                )}
              >
                {sectionLabel(content, id)}
              </button>
              {duplicable && (
                <button
                  type="button"
                  onClick={() => onDuplicate(id)}
                  aria-label="Duplicate section"
                  title="Duplicate section"
                  className="shrink-0 rounded p-1 text-muted-foreground hover:text-foreground"
                >
                  <Copy className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => onToggle(id)}
                aria-label={hidden ? "Show section" : "Hide section"}
                title={hidden ? "Show section" : "Hide section"}
                className="shrink-0 rounded p-1 text-muted-foreground hover:text-foreground"
              >
                {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              {isDuplicate && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Delete "${sectionLabel(content, id)}"? This cannot be undone.`)) {
                      onDelete(id);
                    }
                  }}
                  aria-label="Delete section"
                  title="Delete section"
                  className="shrink-0 rounded p-1 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

