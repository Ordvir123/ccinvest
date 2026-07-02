import { useState, type ReactNode } from "react";
import { ChevronDown, Eye, EyeOff } from "lucide-react";

import { cn } from "@/lib/utils";

/** Collapsible card section used to group editor fields. */
export function SectionCard({
  title,
  description,
  defaultOpen = true,
  children,
  visible,
  onToggleVisible,
  headerLeft,
  collapsedForReorder = false,
}: {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: ReactNode;
  /** When defined, shows an eye toggle. false = hidden on the public page. */
  visible?: boolean;
  onToggleVisible?: () => void;
  /** Optional node on the far left of the header (e.g. a drag handle). */
  headerLeft?: ReactNode;
  /** Force the body closed (used while reordering sections). */
  collapsedForReorder?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const isOpen = open && !collapsedForReorder;
  const hidden = visible === false;
  return (
    <div className={cn("rounded-lg border border-border bg-card", hidden && "opacity-60")}>
      <div className="flex w-full items-center gap-2 px-4 py-3">
        {headerLeft}
        <button
          type="button"
          onClick={() => {
            if (!collapsedForReorder) setOpen((v) => !v);
          }}
          className="flex flex-1 items-center justify-between gap-2 text-start"
        >
          <span>
            <span className="block font-medium text-foreground">{title}</span>
            {description && (
              <span className="block text-xs text-muted-foreground">{description}</span>
            )}
          </span>
          {!collapsedForReorder && (
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                open && "rotate-180",
              )}
            />
          )}
        </button>
        {onToggleVisible && (
          <button
            type="button"
            onClick={onToggleVisible}
            className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
            title={
              hidden ? "Hidden on the page — click to show" : "Shown on the page — click to hide"
            }
            aria-label={hidden ? "Show section" : "Hide section"}
          >
            {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      {isOpen && <div className="space-y-4 border-t border-border p-4">{children}</div>}
    </div>
  );
}

/** A labelled field wrapper. */
export function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
