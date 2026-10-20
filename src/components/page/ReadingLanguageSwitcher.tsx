import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Flag } from "@/components/Flag";
import { READING_LANGS, type PageCategory, type ReadingLang } from "@/types/page";

interface Props {
  value: ReadingLang;
  onChange: (lang: ReadingLang) => void;
  /** When set, shows the CC logo and a "back to listing" link (property pages). */
  category?: PageCategory;
}

const BACK: Record<ReadingLang, Record<PageCategory, string>> = {
  fr: { apartment: "Tous nos appartements", project: "Tous nos projets" },
  he: { apartment: "כל הדירות", project: "כל הפרויקטים" },
  en: { apartment: "All apartments", project: "All projects" },
};

/**
 * Top bar of a property page: logo + back-to-listing link + reading-language flags.
 * Static (not sticky) so the hero keeps the full first screen.
 */
export function ReadingLanguageSwitcher({ value, onChange, category }: Props) {
  const flags = (
    <div className="flex items-center gap-2">
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
              : "border-transparent opacity-60 hover:border-border hover:opacity-100",
          )}
        >
          <Flag code={lang} className="h-4 w-6 rounded-sm" />
        </button>
      ))}
    </div>
  );

  if (!category) {
    return (
      <div className="flex w-full items-center justify-center border-b border-border/40 bg-background py-3">
        {flags}
      </div>
    );
  }

  return (
    <div className="w-full border-b border-border/40 bg-background">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            to="/"
            aria-label="CC Invest"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary font-display text-lg font-bold text-primary-foreground"
          >
            CC
          </Link>
          <Link
            to={category === "project" ? "/projects" : "/appartements"}
            className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 shrink-0 rtl:rotate-180" aria-hidden />
            <span className="truncate">{BACK[value][category]}</span>
          </Link>
        </div>
        {flags}
      </div>
    </div>
  );
}
