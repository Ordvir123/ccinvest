import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { ContactForm } from "@/components/page/ContactForm";
import type { ReadingLang } from "@/types/page";
import teamPortrait from "@/assets/team-portrait.png.asset.json";

const READING = ["fr", "he", "en"] as const;
const toReadingLang = (l: string): ReadingLang =>
  (READING as readonly string[]).includes(l) ? (l as ReadingLang) : "fr";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "À propos — CC Invest" },
      {
        name: "description",
        content: "Découvrez notre équipe d'investissement immobilier à Tel Aviv.",
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  const { t, i18n } = useTranslation();
  const lang = toReadingLang(i18n.language);
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="container mx-auto max-w-3xl px-4 py-20">
          <h1 className="mb-6 font-display text-4xl md:text-5xl">
            {t("public.about.title")}
          </h1>
          <div className="whitespace-pre-line text-lg leading-relaxed text-muted-foreground">
            {t("public.about.body")}
          </div>
          <div className="mt-12 rounded-lg bg-background py-10">
            <img
              src={teamPortrait.url}
              alt={t("public.about.title")}
              className="mx-auto w-full max-w-sm rounded-lg"
            />
          </div>
        </div>
        <ContactForm
          interactive
          pageId={null}
          lang={lang}
          projectTitle={t("app.name")}
          heading={t("public.contact.title")}
          subheading={t("public.contact.subtitle")}
        />
      </main>
      <SiteFooter />
    </div>
  );
}
