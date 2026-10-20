import { cn } from "@/lib/utils";
import { Flag } from "@/components/Flag";
import { READING_LANGS, type ReadingLang } from "@/types/page";

interface Props {
  value: ReadingLang;
  onChange: (lang: ReadingLang) => void;
  /** Float over the hero photo (property pages) instead of a bar above it. */
  overlay?: boolean;
}

/** Visitor reading-language switcher (flags). */
export function ReadingLanguageSwitcher({ value, onChange, overlay }: Props) {
  return (
    <div
      className={cn(
        overlay
          ? "absolute end-5 top-6 z-30 flex items-center gap-1 rounded-full bg-black/25 p-1 backdrop-blur-md md:end-[max(2.5rem,calc((100%-72rem)/2))] md:top-10"
          : "flex w-full items-center justify-center gap-2 border-b border-border/40 bg-background py-3",
      )}
    >
      {READING_LANGS.map((lang) => (
        <button
          key={lang}
          type="button"
          onClick={() => onChange(lang)}
          aria-pressed={value === lang}
          aria-label={lang.toUpperCase()}
          className={cn(
            "flex items-center rounded-full p-1.5 transition-all",
            overlay
              ? value === lang
                ? "bg-white/90 shadow-sm"
                : "opacity-75 hover:bg-white/20 hover:opacity-100"
              : value === lang
                ? "ring-1 ring-primary"
                : "opacity-60 hover:opacity-100",
          )}
        >
          <Flag code={lang} className="h-4 w-6 rounded-sm" />
        </button>
      ))}
    </div>
  );
}
