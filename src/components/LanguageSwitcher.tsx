import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { applyDocumentDirection, UI_LANG_STORAGE_KEY, type UiLang } from "@/i18n";

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const current = (i18n.resolvedLanguage ?? "fr") as UiLang;

  const onChange = (value: string) => {
    window.localStorage.setItem(UI_LANG_STORAGE_KEY, value);
    i18n.changeLanguage(value);
    applyDocumentDirection(value);
  };

  return (
    <div className="flex items-center gap-2">
      <Languages className="h-4 w-4 text-muted-foreground" aria-hidden />
      <Select value={current} onValueChange={onChange}>
        <SelectTrigger className="w-[140px]" aria-label={t("language.label")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="fr">{t("language.fr")}</SelectItem>
          <SelectItem value="he">{t("language.he")}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
