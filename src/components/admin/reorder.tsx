import { useState, type ReactNode } from "react";
import { GripVertical, ArrowUpDown, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Native HTML5 drag-and-drop reordering for a list of items. */
export function useDragReorder<T>(items: T[], onReorder: (next: T[]) => void) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const rowProps = (i: number) => ({
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      setDragIndex(i);
      e.dataTransfer.effectAllowed = "move";
    },
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      setOverIndex(i);
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      if (dragIndex === null || dragIndex === i) {
        setDragIndex(null);
        setOverIndex(null);
        return;
      }
      const next = items.slice();
      const [moved] = next.splice(dragIndex, 1);
      next.splice(i, 0, moved);
      onReorder(next);
      setDragIndex(null);
      setOverIndex(null);
    },
    onDragEnd: () => {
      setDragIndex(null);
      setOverIndex(null);
    },
  });

  return { rowProps, dragIndex, overIndex };
}

/** Compact drag-to-reorder list shown while a list is in "reorder mode". */
export function ReorderList<T>({
  items,
  getLabel,
  onReorder,
}: {
  items: T[];
  getLabel: (item: T, index: number) => ReactNode;
  onReorder: (next: T[]) => void;
}) {
  const { rowProps, overIndex, dragIndex } = useDragReorder(items, onReorder);
  if (items.length === 0)
    return <p className="text-xs text-muted-foreground">Nothing to reorder yet.</p>;
  return (
    <div className="space-y-1.5 rounded-md border border-dashed border-primary/50 bg-primary/5 p-2">
      {items.map((it, i) => (
        <div
          key={i}
          {...rowProps(i)}
          className={cn(
            "flex cursor-grab items-center gap-2 rounded-md border border-border bg-card px-2 py-2 text-sm active:cursor-grabbing",
            overIndex === i && dragIndex !== i && "ring-2 ring-primary",
            dragIndex === i && "opacity-50",
          )}
        >
          <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="min-w-0 flex-1 truncate">{getLabel(it, i)}</span>
        </div>
      ))}
    </div>
  );
}

/** Toggle button to enter/leave a list's reorder mode. */
export function ReorderToggle({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return (
    <Button type="button" variant={active ? "secondary" : "outline"} size="sm" onClick={onToggle}>
      {active ? <Check className="h-4 w-4" /> : <ArrowUpDown className="h-4 w-4" />}
      {active ? "Done reordering" : "Reorder"}
    </Button>
  );
}
