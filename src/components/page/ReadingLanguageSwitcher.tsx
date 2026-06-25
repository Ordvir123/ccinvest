import { cn } from "@/lib/utils";
import { READING_LANGS, type ReadingLang } from "@/types/page";

const FLAGS: Record<ReadingLang, string> = { fr: "🇫🇷", he: "🇮🇱", en: "🇺🇸" };

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
            "flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-medium transition-colors",
            value === lang
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted",
          )}
        >
          <span className="text-base leading-none" aria-hidden>
            {FLAGS[lang]}
          </span>
        </button>
      ))}
    </div>
  );
}
