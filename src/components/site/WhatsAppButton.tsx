import { useTranslation } from "react-i18next";
import type { ReadingLang } from "@/types/page";
import { CONTACT_WHATSAPP } from "@/lib/site";

const GREETING: Record<ReadingLang, (title?: string) => string> = {
  fr: (t) => (t ? `Bonjour, je souhaite des informations sur « ${t} ».` : "Bonjour, je souhaite des informations."),
  he: (t) => (t ? `שלום, אשמח לפרטים על "${t}".` : "שלום, אשמח לפרטים."),
  en: (t) => (t ? `Hello, I'd like information about "${t}".` : "Hello, I'd like some information."),
};

const LABEL: Record<ReadingLang, string> = {
  fr: "Écrivez-nous sur WhatsApp",
  he: "כתבו לנו בוואטסאפ",
  en: "Message us on WhatsApp",
};

/** Floating WhatsApp button (bottom corner) with a pre-filled message in the visitor's language. */
export function WhatsAppButton({ lang, title }: { lang?: ReadingLang; title?: string }) {
  const { i18n } = useTranslation();
  const ui = i18n.language?.slice(0, 2);
  const l: ReadingLang = lang ?? (ui === "he" || ui === "en" ? ui : "fr");
  const href = `https://wa.me/${CONTACT_WHATSAPP}?text=${encodeURIComponent(GREETING[l](title))}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={LABEL[l]}
      title={LABEL[l]}
      className="fixed bottom-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ltr:right-5 rtl:left-5"
    >
      <svg viewBox="0 0 32 32" className="h-7 w-7" fill="currentColor" aria-hidden>
        <path d="M16.04 3C9.4 3 4 8.33 4 14.9c0 2.27.65 4.39 1.78 6.2L4 29l8.13-1.74a12.2 12.2 0 0 0 3.91.64h.01C22.68 27.9 28 22.57 28 16 28 9.43 22.68 3 16.04 3Zm0 22.6h-.01a10 10 0 0 1-3.6-.67l-.26-.1-4.83 1.03 1.07-4.6-.17-.27A9.6 9.6 0 0 1 6.3 14.9c0-5.3 4.37-9.6 9.74-9.6 5.36 0 9.66 4.3 9.66 10.7 0 5.3-4.3 9.6-9.66 9.6Zm5.3-7.17c-.29-.14-1.72-.84-1.99-.94-.27-.1-.46-.14-.66.15-.19.28-.75.93-.92 1.12-.17.19-.34.21-.63.07-.29-.14-1.22-.45-2.33-1.43-.86-.76-1.44-1.7-1.61-1.99-.17-.28-.02-.44.13-.58.13-.13.29-.33.43-.5.15-.17.19-.28.29-.47.1-.19.05-.36-.02-.5-.07-.14-.66-1.57-.9-2.15-.24-.56-.48-.49-.66-.5h-.56c-.19 0-.5.07-.77.36-.26.28-1 .97-1 2.37s1.03 2.75 1.17 2.94c.14.19 2.02 3.08 4.9 4.32.68.29 1.22.47 1.63.6.69.22 1.31.19 1.8.11.55-.08 1.72-.7 1.96-1.37.24-.67.24-1.25.17-1.37-.07-.12-.26-.19-.55-.33Z" />
      </svg>
    </a>
  );
}
