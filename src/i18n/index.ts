import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import fr from "./locales/fr.json";
import he from "./locales/he.json";
import en from "./locales/en.json";

export const SUPPORTED_UI_LANGS = ["fr", "he", "en"] as const;
export type UiLang = (typeof SUPPORTED_UI_LANGS)[number];
export const UI_LANG_STORAGE_KEY = "cc-invest-ui-lang";

export const RTL_LANGS: UiLang[] = ["he"];

export function isRtl(lang: string): boolean {
  return RTL_LANGS.includes(lang as UiLang);
}

if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      resources: {
        fr: { translation: fr },
        he: { translation: he },
        en: { translation: en },
      },
      // Keep the first client render identical to SSR; persisted language is restored after mount.
      lng: "fr",
      fallbackLng: "fr",
      supportedLngs: SUPPORTED_UI_LANGS as unknown as string[],
      interpolation: { escapeValue: false },
    });
}

/** Apply dir/lang to the document for correct RTL/LTR mirroring. */
export function applyDocumentDirection(lang: string) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = lang;
  document.documentElement.dir = isRtl(lang) ? "rtl" : "ltr";
}

i18n.on("languageChanged", applyDocumentDirection);

export default i18n;
