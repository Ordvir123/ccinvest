import { ArrowUp, ArrowDown, Trash2, Link2, Link2Off } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ReadingLang } from "@/types/page";

export const SOURCE_LANGS = ["fr", "he", "en"] as const;
export const SITE_ORIGIN = "https://ccinvest.lovable.app";

/** Localized placeholders (guidance only — admin's entered value wins). */
export const KICKER_PLACEHOLDERS: Record<ReadingLang, string> = {
  fr: "À VENDRE - TLV",
  he: "למכירה - תל אביב",
  en: "FOR SALE - TLV",
};
export const CTA_PLACEHOLDERS: Record<ReadingLang, string> = {
  fr: "Contact",
  he: "צור קשר",
  en: "Contact",
};
export const CONTACT_HEADING_PLACEHOLDERS: Record<ReadingLang, string> = {
  fr: "Plus d'informations sur ce projet ?",
  he: "מידע נוסף על פרויקט זה?",
  en: "More information on this project?",
};
export const LANG_LABELS: Record<ReadingLang, string> = {
  fr: "Français",
  he: "עברית",
  en: "English",
};

export const CUSTOM_PRESET = "__custom__";

export function MoveRemove({
  onUp,
  onDown,
  onRemove,
}: {
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex gap-1">
      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onUp}>
        <ArrowUp className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onDown}>
        <ArrowDown className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onRemove}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function moveItem<T>(arr: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir;
  if (j < 0 || j >= arr.length) return arr;
  const next = arr.slice();
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

export const sanitizeNum = (val: string, allowDecimal = true) => {
  let s = val.replace(/[^\d.,]/g, "").replace(",", ".");
  if (!allowDecimal) return s.replace(/\./g, "");
  const parts = s.split(".");
  if (parts.length > 2) s = parts[0] + "." + parts.slice(1).join("");
  return s;
};

/** Chain link/unlink toggle (like the aspect-ratio lock in design tools). */
export function LinkToggle({
  linked,
  disabled,
  onToggle,
}: {
  linked: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      disabled={disabled}
      onClick={onToggle}
      className={cn("h-9 w-9 shrink-0", linked ? "text-primary" : "text-muted-foreground")}
      aria-label={linked ? "Unlink label & icon from preset" : "Link label & icon to preset"}
      title={
        linked
          ? "Linked to preset — click to edit label & icon"
          : "Custom — click to relink to preset"
      }
    >
      {linked ? <Link2 className="h-4 w-4" /> : <Link2Off className="h-4 w-4" />}
    </Button>
  );
}
