import { Check, Sparkles, X } from "lucide-react";
import { useState } from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ICON_NAMES, getIcon } from "@/lib/page-icons";
import {
  GRADIENTS,
  SOLID_COLORS,
  colorSwatchCss,
  getGradientKey,
  gradientToken,
} from "@/lib/icon-colors";
import { cn } from "@/lib/utils";

const AUTO = "__auto__";

/**
 * Icon picker with optional color swatch.
 *
 * - Always renders the icon dropdown (auto or one of the curated icons).
 * - When `onColorChange` is provided, also renders a color swatch button that
 *   opens a popover with 30 curated solid colors + 20 gradients, plus a
 *   "Default" tile that clears the color.
 */
export function IconPicker({
  value,
  onChange,
  color,
  onColorChange,
}: {
  value?: string;
  onChange: (name: string | undefined) => void;
  /** Current color: hex "#rrggbb" or gradient token "grad:<key>". */
  color?: string;
  /** When provided, render the color swatch. Undefined value clears the color. */
  onColorChange?: (color: string | undefined) => void;
}) {
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
      {onColorChange && <ColorSwatchPicker color={color} onChange={onColorChange} />}
    </div>
  );
}

function ColorSwatchPicker({
  color,
  onChange,
}: {
  color?: string;
  onChange: (color: string | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const hasColor = typeof color === "string" && color.length > 0;
  const swatchBg = colorSwatchCss(color) ??
    "conic-gradient(from 0deg, #ef4444, #f59e0b, #10b981, #3b82f6, #a855f7, #ef4444)";
  const gradKey = getGradientKey(color);

  const pick = (v: string | undefined) => {
    onChange(v);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-input bg-background transition hover:bg-accent"
          title={hasColor ? "Change icon color" : "Pick icon color"}
          aria-label="Pick icon color"
        >
          <span
            className="h-4 w-4 rounded-sm border border-border"
            style={{ background: swatchBg }}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[280px] p-3">
        <button
          type="button"
          onClick={() => pick(undefined)}
          className={cn(
            "mb-2 flex w-full items-center justify-between rounded-md border border-input px-2 py-1.5 text-xs transition hover:bg-accent",
            !hasColor && "border-primary bg-accent",
          )}
        >
          <span className="flex items-center gap-2">
            <X className="h-3.5 w-3.5" />
            Default (theme)
          </span>
          {!hasColor && <Check className="h-3.5 w-3.5 text-primary" />}
        </button>

        <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Colors
        </p>
        <div className="grid grid-cols-10 gap-1.5">
          {SOLID_COLORS.map((c) => {
            const active = !gradKey && color?.toLowerCase() === c.toLowerCase();
            return (
              <Swatch
                key={c}
                active={active}
                title={c}
                background={c}
                onClick={() => pick(c)}
              />
            );
          })}
        </div>

        <p className="mb-1.5 mt-3 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Gradients
        </p>
        <div className="grid grid-cols-10 gap-1.5">
          {GRADIENTS.map((g) => {
            const active = gradKey === g.key;
            return (
              <Swatch
                key={g.key}
                active={active}
                title={g.label}
                background={`linear-gradient(135deg, ${g.stops.join(", ")})`}
                onClick={() => pick(gradientToken(g.key))}
              />
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Swatch({
  active,
  title,
  background,
  onClick,
}: {
  active: boolean;
  title: string;
  background: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={cn(
        "relative h-6 w-6 rounded-md border border-border transition hover:scale-110",
        active && "ring-2 ring-primary ring-offset-1",
      )}
      style={{ background }}
    >
      {active && (
        <Check className="absolute inset-0 m-auto h-3.5 w-3.5 text-white drop-shadow" />
      )}
    </button>
  );
}

// Re-export for callers that used the old Button import indirectly.
export { Button };
