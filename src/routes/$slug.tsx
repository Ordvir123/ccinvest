import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { PageRenderer } from "@/components/page/PageRenderer";
import { ReadingLanguageSwitcher } from "@/components/page/ReadingLanguageSwitcher";
import { fetchPublishedPage } from "@/lib/pages";
import { resolveTranslation } from "@/lib/translate";
import { isRtlReading, type ReadingLang } from "@/types/page";

export const Route = createFileRoute("/$slug")({
  component: ProjectPage,
});

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

  // Translate on-the-fly (cached server-side after first request).
  const translationQuery = useQuery({
    queryKey: ["page-translation", page?.id, activeLang],
    queryFn: () => resolveTranslation(page!.id, page!.content, sourceLang, activeLang),
    enabled: needsTranslation,
    staleTime: Infinity,
    retry: false,
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

  const isTranslating = needsTranslation && translationQuery.isLoading;
  const translated = needsTranslation ? translationQuery.data : null;
  // While translating (first switch) keep showing the source content underneath.
  const content = translated ?? page.content;

  return (
    <>
      {page.seo?.meta_title && <title>{page.seo.meta_title}</title>}
      {page.seo?.meta_description && (
        <meta name="description" content={page.seo.meta_description} />
      )}

      <PageRenderer content={content} />

      {isTranslating && (
        <div className="fixed bottom-20 z-40 flex items-center gap-2 rounded-md border border-border bg-card/95 px-3 py-1.5 text-xs text-muted-foreground shadow ltr:right-5 rtl:left-5">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          {activeLang === "he" ? "מתרגם…" : "Translating…"}
        </div>
      )}

      {needsTranslation && translationQuery.isError && (
        <div className="fixed bottom-20 z-40 rounded-md border border-destructive/40 bg-card/95 px-3 py-1.5 text-xs text-destructive shadow ltr:right-5 rtl:left-5">
          {(translationQuery.error as Error)?.message ?? "Translation failed."}
        </div>
      )}

      <ReadingLanguageSwitcher value={activeLang} onChange={setLang} />
    </>
  );
}
