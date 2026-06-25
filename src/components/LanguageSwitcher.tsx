import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  applyDocumentDirection,
  SUPPORTED_UI_LANGS,
  UI_LANG_STORAGE_KEY,
  type UiLang,
} from "@/i18n";

/** Flag per UI language: France / Israel / USA. */
const FLAGS: Record<UiLang, string> = { fr: "🇫🇷", he: "🇮🇱", en: "🇺🇸" };

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const current = (i18n.resolvedLanguage ?? "fr") as UiLang;

  const onChange = (value: UiLang) => {
    window.localStorage.setItem(UI_LANG_STORAGE_KEY, value);
    i18n.changeLanguage(value);
    applyDocumentDirection(value);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("language.label")}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
      >
        <span className="text-base leading-none" aria-hidden>
          {FLAGS[current]}
        </span>
        <span className="hidden sm:inline">{t(`language.${current}`)}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[9rem]">
        {SUPPORTED_UI_LANGS.map((lang) => (
          <DropdownMenuItem
            key={lang}
            onClick={() => onChange(lang)}
            className={cn(
              "gap-2",
              current === lang && "font-semibold text-primary",
            )}
          >
            <span className="text-base leading-none" aria-hidden>
              {FLAGS[lang]}
            </span>
            {t(`language.${lang}`)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
