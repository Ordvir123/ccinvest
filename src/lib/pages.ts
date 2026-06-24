import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { SEED_PAGES } from "@/lib/seed/montefiore-allenby";
import type { Page, PageContent, ReadingLang } from "@/types/page";

export type ResolvedPage = {
  page: Page;
  /** Content for the chosen reading language. */
  content: PageContent;
  lang: ReadingLang;
  /** True when we showed source content because no translation exists yet. */
  isFallback: boolean;
};

/** Fetch a published page by slug (anon-readable). Falls back to local seed. */
export async function fetchPublishedPage(slug: string): Promise<Page | null> {
  // Env not wired yet — use the local seed so the renderer is demonstrable.
  if (!isSupabaseConfigured) return SEED_PAGES[slug] ?? null;
  try {
    const { data, error } = await supabase
      .from("pages")
      .select("id, slug, status, source_lang, content, seo")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();

    if (error) throw error;
    if (data) return data as Page;
  } catch (err) {
    // Network/env not configured yet — fall through to seed.
    console.warn("[pages] falling back to local seed:", err);
  }
  return SEED_PAGES[slug] ?? null;
}

/** Look up a translation; returns null when none exists (Slice 4 fills these). */
export async function fetchTranslation(
  pageId: string,
  lang: ReadingLang,
): Promise<PageContent | null> {
  try {
    const { data, error } = await supabase
      .from("page_translations")
      .select("content")
      .eq("page_id", pageId)
      .eq("lang", lang)
      .maybeSingle();

    if (error) throw error;
    return (data?.content as PageContent) ?? null;
  } catch (err) {
    console.warn("[pages] translation lookup failed:", err);
    return null;
  }
}

/** Resolve the content to display for a given reading language. */
export async function resolvePage(slug: string, lang: ReadingLang): Promise<ResolvedPage | null> {
  const page = await fetchPublishedPage(slug);
  if (!page) return null;

  if (lang === page.source_lang) {
    return { page, content: page.content, lang, isFallback: false };
  }

  const translated = await fetchTranslation(page.id, lang);
  if (translated) {
    return { page, content: translated, lang, isFallback: false };
  }
  // Graceful fallback to source content until Slice 4 populates translations.
  return { page, content: page.content, lang, isFallback: true };
}
