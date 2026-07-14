import { Sparkles, X } from "lucide-react";
import { useId } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ICON_NAMES, getIcon } from "@/lib/page-icons";
import { cn } from "@/lib/utils";

const AUTO = "__auto__";

/**
 * Icon picker with optional color swatch.
 *
 * - Always renders the icon dropdown (auto or one of the curated icons).
 * - When `onColorChange` is provided, also renders a small color swatch that
 *   opens a native color input, plus a clear button to fall back to the
 *   default (currentColor / brand primary at the render site).
 */
export function IconPicker({
  value,
  onChange,
  color,
  onColorChange,
}: {
  value?: string;
  onChange: (name: string | undefined) => void;
  /** Current color as CSS color string (e.g. "#0f172a"). Empty = default. */
  color?: string;
  /** When provided, render the color swatch. Undefined value clears the color. */
  onColorChange?: (color: string | undefined) => void;
}) {
  const inputId = useId();
  const hasColor = typeof color === "string" && color.length > 0;
  return (
    <div className="flex shrink-0 items-center gap-1">
      <Select
        value={value || AUTO}
        onValueChange={(v) => onChange(v === AUTO ? undefined : v)}
      >
        <SelectTrigger className="w-[64px] shrink-0 px-2" aria-label="Icon">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={AUTO}>
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> Auto
            </span>
          </SelectItem>
          {ICON_NAMES.map((name) => {
            const Icon = getIcon(name)!;
            return (
              <SelectItem key={name} value={name}>
                <span className="flex items-center gap-2 capitalize">
                  <Icon className="h-4 w-4" /> {name}
                </span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      {onColorChange && (
        <div className="flex items-center gap-0.5">
          <label
            htmlFor={inputId}
            className={cn(
              "flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-md border border-input bg-background transition hover:bg-accent",
            )}
            title={hasColor ? `Icon color: ${color}` : "Pick icon color"}
            aria-label="Pick icon color"
          >
            <span
              className="h-4 w-4 rounded-sm border border-border"
              style={{
                background: hasColor
                  ? color
                  : "conic-gradient(from 0deg, #ef4444, #f59e0b, #10b981, #3b82f6, #a855f7, #ef4444)",
              }}
            />
          </label>
          <input
            id={inputId}
            type="color"
            value={hasColor ? color! : "#3b82f6"}
            onChange={(e) => onColorChange(e.target.value)}
            className="sr-only"
          />
          {hasColor && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-muted-foreground"
              title="Clear color"
              aria-label="Clear icon color"
              onClick={() => onColorChange(undefined)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
