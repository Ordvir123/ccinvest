import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { PageRenderer } from "@/components/page/PageRenderer";
import { ReadingLanguageSwitcher } from "@/components/page/ReadingLanguageSwitcher";
import { fetchPageById } from "@/lib/pages";
import { fetchTemplateSettings } from "@/lib/template-settings";
import { resolveTranslation } from "@/lib/translate";
import { useAuth } from "@/integrations/supabase/use-auth";
import { isRtlReading, READING_LANGS, type ReadingLang } from "@/types/page";

export const Route = createFileRoute("/preview/$id")({
  // Draft preview reads the page by id under the admin's session (RLS), so it
  // must run client-side only — never prerender, never index.
  ssr: false,
  validateSearch: (search: Record<string, unknown>): { lang?: ReadingLang } => {
    const lang = search.lang as string | undefined;
    return READING_LANGS.includes(lang as ReadingLang)
      ? { lang: lang as ReadingLang }
      : {};
  },
  head: () => ({ meta: [{ name: "robots", content: "noindex, nofollow" }] }),
  component: PreviewPage,
});

function PreviewPage() {
  const { id } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [lang, setLang] = useState<ReadingLang | null>(search.lang ?? null);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/admin/login", replace: true });
  }, [authLoading, user, navigate]);

  const pageQuery = useQuery({
    queryKey: ["preview-page", id],
    queryFn: () => fetchPageById(id),
    enabled: !!user,
  });

  const settingsQuery = useQuery({
    queryKey: ["template-settings"],
    queryFn: fetchTemplateSettings,
    staleTime: 5 * 60 * 1000,
  });

  const page = pageQuery.data;
  const sourceLang = (page?.source_lang ?? "fr") as ReadingLang;
  const activeLang: ReadingLang = lang ?? sourceLang;
  const needsTranslation = !!page && activeLang !== sourceLang;

  const translationQuery = useQuery({
    queryKey: ["preview-translation", page?.id, activeLang],
    queryFn: () => resolveTranslation(page!.id, page!.content, sourceLang, activeLang),
    enabled: needsTranslation,
    staleTime: Infinity,
    retry: false,
  });

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = activeLang;
    document.documentElement.dir = isRtlReading(activeLang) ? "rtl" : "ltr";
  }, [activeLang]);

  if (authLoading || (!!user && pageQuery.isLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        …
      </div>
    );
  }

  if (!user) return null;

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
  const isTranslating = needsTranslation && translationQuery.isLoading;

  return (
    <>
      <div className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-amber-500 px-4 py-1.5 text-center text-xs font-medium text-amber-950">
        {activeLang === "he"
          ? "תצוגה מקדימה של טיוטה — לא מפורסם"
          : activeLang === "fr"
            ? "Aperçu du brouillon — non publié"
            : "Draft preview — not published"}
      </div>
      <ReadingLanguageSwitcher value={activeLang} onChange={setLang} />
      <PageRenderer
        content={content}
        interactive
        pageId={page.id}
        slug={page.slug}
        lang={activeLang}
        settings={settingsQuery.data}
      />

      {isTranslating && (
        <div className="fixed bottom-5 z-40 flex items-center gap-2 rounded-md border border-border bg-card/95 px-3 py-1.5 text-xs text-muted-foreground shadow ltr:right-5 rtl:left-5">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          {activeLang === "he" ? "מתרגם…" : "Translating…"}
        </div>
      )}

      {needsTranslation && translationQuery.isError && (
        <div className="fixed bottom-5 z-40 rounded-md border border-destructive/40 bg-card/95 px-3 py-1.5 text-xs text-destructive shadow ltr:right-5 rtl:left-5">
          {(translationQuery.error as Error)?.message ?? "Translation failed."}
        </div>
      )}
    </>
  );
}
