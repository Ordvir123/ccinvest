import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

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
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="container mx-auto max-w-3xl flex-1 px-4 py-20">
        <h1 className="mb-6 font-display text-4xl md:text-5xl">
          {t("public.about.title")}
        </h1>
        <div className="whitespace-pre-line text-lg leading-relaxed text-muted-foreground">
          {t("public.about.body")}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
