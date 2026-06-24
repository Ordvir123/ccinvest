import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import fr from "./locales/fr.json";
import he from "./locales/he.json";

export const SUPPORTED_UI_LANGS = ["fr", "he"] as const;
export type UiLang = (typeof SUPPORTED_UI_LANGS)[number];

export const RTL_LANGS: UiLang[] = ["he"];

export function isRtl(lang: string): boolean {
  return RTL_LANGS.includes(lang as UiLang);
}

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: {
        fr: { translation: fr },
        he: { translation: he },
      },
      fallbackLng: "fr",
      supportedLngs: SUPPORTED_UI_LANGS as unknown as string[],
      interpolation: { escapeValue: false },
      detection: {
        // Persist chosen UI language in localStorage.
        order: ["localStorage", "navigator"],
        lookupLocalStorage: "cc-invest-ui-lang",
        caches: ["localStorage"],
      },
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
