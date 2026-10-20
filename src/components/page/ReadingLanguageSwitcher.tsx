import { cn } from "@/lib/utils";
import { Flag } from "@/components/Flag";
import { READING_LANGS, type ReadingLang } from "@/types/page";

interface Props {
  value: ReadingLang;
  onChange: (lang: ReadingLang) => void;
}

/**
 * Visitor reading-language switcher (flags). Rendered as the first, static
 * section above the hero on landing pages — not fixed/floating on scroll.
 */
export function ReadingLanguageSwitcher({ value, onChange }: Props) {
  return (
    <div className="flex w-full items-center justify-center gap-2 border-b border-border/40 bg-background py-3">
      {READING_LANGS.map((lang) => (
        <button
          key={lang}
          type="button"
          onClick={() => onChange(lang)}
          aria-pressed={value === lang}
          aria-label={lang.toUpperCase()}
          className={cn(
            "flex items-center rounded-md border p-1.5 transition-all",
            value === lang
              ? "border-primary ring-1 ring-primary"
              : "border-transparent opacity-60 hover:opacity-100 hover:border-border",
          )}
        >
          <Flag code={lang} className="h-4 w-6 rounded-sm" />
        </button>
      ))}
    </div>
  );
}
