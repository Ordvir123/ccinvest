import { Languages } from "lucide-react";

import { cn } from "@/lib/utils";
import { READING_LANGS, type ReadingLang } from "@/types/page";

const LABELS: Record<ReadingLang, string> = { fr: "FR", he: "HE", en: "EN" };

interface Props {
  value: ReadingLang;
  onChange: (lang: ReadingLang) => void;
}

/** Floating visitor reading-language switcher (separate from the admin UI language). */
export function ReadingLanguageSwitcher({ value, onChange }: Props) {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex items-center gap-1 rounded-full border border-border bg-card/90 p-1 shadow-lg backdrop-blur ltr:right-5 rtl:left-5 rtl:right-auto">
      <Languages className="mx-1 h-4 w-4 text-muted-foreground" aria-hidden />
      {READING_LANGS.map((lang) => (
        <button
          key={lang}
          type="button"
          onClick={() => onChange(lang)}
          aria-pressed={value === lang}
          className={cn(
            "rounded-full px-3 py-1 text-sm font-medium transition-colors",
            value === lang
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted",
          )}
        >
          {LABELS[lang]}
        </button>
      ))}
    </div>
  );
}
