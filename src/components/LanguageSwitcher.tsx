import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import { Flag } from "@/components/Flag";
import {
  applyDocumentDirection,
  SUPPORTED_UI_LANGS,
  UI_LANG_STORAGE_KEY,
  type UiLang,
} from "@/i18n";

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const current = (i18n.resolvedLanguage ?? "fr") as UiLang;

  const onChange = (value: UiLang) => {
    window.localStorage.setItem(UI_LANG_STORAGE_KEY, value);
    i18n.changeLanguage(value);
    applyDocumentDirection(value);
  };

  return (
    <div className="inline-flex items-center gap-2">
      {SUPPORTED_UI_LANGS.map((lang) => (
        <button
          key={lang}
          type="button"
          aria-label={lang}
          onClick={() => onChange(lang)}
          className={cn(
            "rounded-md border transition-all p-1",
            current === lang
              ? "border-primary ring-1 ring-primary"
              : "border-transparent opacity-70 hover:opacity-100 hover:border-border",
          )}
        >
          <Flag code={lang} />
        </button>
      ))}
    </div>
  );
}
