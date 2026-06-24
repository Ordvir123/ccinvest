import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { PageRenderer } from "@/components/page/PageRenderer";
import { ReadingLanguageSwitcher } from "@/components/page/ReadingLanguageSwitcher";
import { fetchPublishedPage, fetchTranslation } from "@/lib/pages";
import { isRtlReading, type ReadingLang } from "@/types/page";

export const Route = createFileRoute("/$slug")({
  component: ProjectPage,
});

const FALLBACK_BADGE: Record<ReadingLang, string> = {
  fr: "Traduction à venir",
  he: "תרגום בקרוב",
  en: "Translation coming soon",
};

function ProjectPage() {
  const { slug } = Route.useParams();
  const [lang, setLang] = useState<ReadingLang | null>(null);

  const pageQuery = useQuery({
    queryKey: ["public-page", slug],
    queryFn: () => fetchPublishedPage(slug),
  });

  const page = pageQuery.data;
  const sourceLang = (page?.source_lang ?? "fr") as ReadingLang;
  const activeLang: ReadingLang = lang ?? sourceLang;
  const needsTranslation = !!page && activeLang !== sourceLang;

  const translationQuery = useQuery({
    queryKey: ["page-translation", page?.id, activeLang],
    queryFn: () => fetchTranslation(page!.id, activeLang),
    enabled: needsTranslation,
  });

  // Apply reading direction for the visitor's chosen language.
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = activeLang;
    document.documentElement.dir = isRtlReading(activeLang) ? "rtl" : "ltr";
  }, [activeLang]);

  if (pageQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        …
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
        <h1 className="text-4xl text-foreground">404</h1>
        <p className="mt-2 text-muted-foreground">Page introuvable.</p>
      </div>
    );
  }

  const translated = needsTranslation ? translationQuery.data : null;
  const content = translated ?? page.content;
  const isFallback = needsTranslation && !translated && !translationQuery.isLoading;

  return (
    <>
      {page.seo?.meta_title && <title>{page.seo.meta_title}</title>}
      {page.seo?.meta_description && (
        <meta name="description" content={page.seo.meta_description} />
      )}

      <PageRenderer content={content} />

      {isFallback && (
        <div className="fixed bottom-20 right-5 z-40 rounded-md border border-border bg-card/90 px-3 py-1.5 text-xs text-muted-foreground shadow ltr:right-5 rtl:left-5 rtl:right-auto">
          {FALLBACK_BADGE[activeLang]}
        </div>
      )}

      <ReadingLanguageSwitcher value={activeLang} onChange={setLang} />
    </>
  );
}
