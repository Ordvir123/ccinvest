import { cn } from "@/lib/utils";
import { Flag } from "@/components/Flag";
import { READING_LANGS, type ReadingLang } from "@/types/page";

interface Props {
  value: ReadingLang;
  onChange: (lang: ReadingLang) => void;
}

/** Floating visitor reading-language switcher (flags). */
export function ReadingLanguageSwitcher({ value, onChange }: Props) {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex items-center gap-1 rounded-full border border-border bg-card/90 p-1 shadow-lg backdrop-blur ltr:right-5 rtl:left-5 rtl:right-auto">
      {READING_LANGS.map((lang) => (
        <button
          key={lang}
          type="button"
          onClick={() => onChange(lang)}
          aria-pressed={value === lang}
          aria-label={lang.toUpperCase()}
          className={cn(
            "flex items-center rounded-full p-1.5 transition-all",
            value === lang ? "ring-2 ring-primary" : "opacity-60 hover:opacity-100",
          )}
        >
          <Flag code={lang} className="h-4 w-6 rounded-sm" />
        </button>
      ))}
    </div>
  );
}
