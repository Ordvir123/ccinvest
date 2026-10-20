import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { PageRenderer } from "@/components/page/PageRenderer";
import { ReadingLanguageSwitcher } from "@/components/page/ReadingLanguageSwitcher";
import { SiteFooter } from "@/components/site/SiteFooter";
import { WhatsAppButton } from "@/components/site/WhatsAppButton";
import { useTranslation } from "react-i18next";
import { fetchPublishedPage } from "@/lib/pages";
import { fetchTemplateSettings } from "@/lib/template-settings";
import { resolveTranslation } from "@/lib/translate";
import {
  isRtlReading,
  seoForLang,
  hasText,
  READING_LANGS,
  type ReadingLang,
} from "@/types/page";

import { SITE_ORIGIN, absoluteUrl } from "@/lib/site";
import { isManagedImage } from "@/lib/responsive-image";
const OG_LOCALE: Record<ReadingLang, string> = {
  fr: "fr_FR",
  he: "he_IL",
  en: "en_US",
};

type HeadData = {
  found: boolean;
  slug: string;
  lang: ReadingLang;
  source?: ReadingLang;
  price?: string;
  category?: string;
  title?: string;
  description?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  canonical: string;
  pageUrl: string;
};

export const Route = createFileRoute("/$slug")({
  validateSearch: (search: Record<string, unknown>): { lang?: ReadingLang } => {
    const lang = search.lang as string | undefined;
    return READING_LANGS.includes(lang as ReadingLang)
      ? { lang: lang as ReadingLang }
      : {};
  },
  loaderDeps: ({ search }) => ({ lang: search.lang }),
  // SSR head resolution so scrapers (WhatsApp/Facebook/Google) get correct,
  // per-language meta tags even though they don't run JS. Humans still get the
  // full interactive SPA that hydrates below.
  loader: async ({ params, deps }): Promise<HeadData> => {
    const page = await fetchPublishedPage(params.slug);
    if (!page) {
      return {
        found: false,
        slug: params.slug,
        lang: "fr",
        canonical: `${SITE_ORIGIN}/${params.slug}`,
        pageUrl: `${SITE_ORIGIN}/${params.slug}`,
      };
    }
    const source = (page.source_lang ?? "fr") as ReadingLang;
    const lang = (deps.lang as ReadingLang) ?? source;

    const seoActive = seoForLang(page.seo, source, lang);
    const seoSource = seoForLang(page.seo, source, source);
    const pick = (
      k: "meta_title" | "meta_description" | "canonical" | "og_title" | "og_description" | "og_image",
    ) => (hasText(seoActive[k]) ? seoActive[k] : seoSource[k]);

    const title = pick("meta_title") ?? page.content.hero?.title;
    const description = pick("meta_description") ?? page.content.hero?.subtitle;
    const ogTitle = pick("og_title") ?? title;
    const ogDescription = pick("og_description") ?? description;
    // Share image: explicit og_image, else the hero photo (what the page opens on),
    // else the first gallery/apartment/unit image. Managed images use the 960px
    // copy so WhatsApp/Facebook previews load fast (WhatsApp skips images > ~300KB).
    let ogImage =
      pick("og_image") ??
      (hasText(page.content.hero?.background?.url) ? page.content.hero.background!.url : undefined) ??
      page.content.gallery?.find((m) => hasText(m.url))?.url ??
      (hasText(page.content.apartment?.image?.url) ? page.content.apartment!.image!.url : undefined) ??
      page.content.units?.find((u) => hasText(u.image?.url))?.image?.url;
    if (hasText(ogImage)) {
      if (isManagedImage(ogImage) && !ogImage.includes("?")) ogImage = `${ogImage}?w=960`;
      ogImage = absoluteUrl(ogImage);
    }

    const suffix = lang !== source ? `?lang=${lang}` : "";
    return {
      found: true,
      slug: params.slug,
      lang,
      source,
      price: page.content.hero?.price ?? page.content.apartment?.price,
      category: page.content.category,
      title,
      description,
      ogTitle,
      ogDescription,
      ogImage,
      canonical: pick("canonical") ?? `${SITE_ORIGIN}/${params.slug}${suffix}`,
      pageUrl: `${SITE_ORIGIN}/${params.slug}${suffix}`,
    };
  },
  head: ({ loaderData }) => {
    const d = loaderData;
    if (!d || !d.found) return {};
    const meta: Array<Record<string, string>> = [];
    if (hasText(d.title)) meta.push({ title: d.title });
    if (hasText(d.description)) meta.push({ name: "description", content: d.description });
    if (hasText(d.ogTitle)) meta.push({ property: "og:title", content: d.ogTitle });
    if (hasText(d.ogDescription))
      meta.push({ property: "og:description", content: d.ogDescription });
    meta.push({ property: "og:type", content: "website" });
    meta.push({ property: "og:url", content: d.pageUrl });
    meta.push({ property: "og:locale", content: OG_LOCALE[d.lang] ?? "fr_FR" });
    meta.push({ name: "twitter:card", content: "summary_large_image" });
    if (hasText(d.ogTitle)) meta.push({ name: "twitter:title", content: d.ogTitle });
    if (hasText(d.ogDescription))
      meta.push({ name: "twitter:description", content: d.ogDescription });
    if (hasText(d.ogImage)) {
      meta.push({ property: "og:image", content: d.ogImage });
      meta.push({ name: "twitter:image", content: d.ogImage });
    }
    const links: Array<Record<string, string>> = [
      { rel: "canonical", href: d.canonical },
      // The bare URL is the source language; other languages use ?lang=.
      ...READING_LANGS.map((l) => ({
        rel: "alternate",
        hreflang: l,
        href: `${SITE_ORIGIN}/${d.slug}${l !== (d.source ?? "fr") ? `?lang=${l}` : ""}`,
      })),
      { rel: "alternate", hreflang: "x-default", href: `${SITE_ORIGIN}/${d.slug}` },
    ];
    // Structured data so Google understands this is a property for sale.
    const priceNumber = hasText(d.price) ? Number(d.price.replace(/[^\d]/g, "")) : NaN;
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "RealEstateListing",
      name: d.ogTitle ?? d.title,
      description: d.ogDescription ?? d.description,
      url: d.pageUrl,
      ...(hasText(d.ogImage) ? { image: d.ogImage } : {}),
      inLanguage: d.lang,
      ...(priceNumber > 0
        ? { offers: { "@type": "Offer", price: priceNumber, priceCurrency: "ILS" } }
        : {}),
      provider: { "@type": "RealEstateAgent", name: "Corinne Cohen Invest", url: SITE_ORIGIN },
    };
    const scripts = [
      {
        type: "application/ld+json",
        children: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
      },
    ];
    return { meta, links, scripts };
  },
  component: ProjectPage,
});

function ProjectPage() {
  const { slug } = Route.useParams();
  const search = Route.useSearch();
  const [lang, setLang] = useState<ReadingLang | null>(search.lang ?? null);

  const pageQuery = useQuery({
    queryKey: ["public-page", slug],
    queryFn: () => fetchPublishedPage(slug),
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

  // Translate on-the-fly (cached server-side after first request).
  const translationQuery = useQuery({
    queryKey: ["page-translation", page?.id, activeLang],
    queryFn: () => resolveTranslation(page!.id, page!.content, sourceLang, activeLang),
    enabled: needsTranslation,
    staleTime: Infinity,
    retry: false,
  });

  // Apply reading direction for the visitor's chosen language, and keep the
  // site chrome (footer) in the same language.
  const { i18n } = useTranslation();
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = activeLang;
    document.documentElement.dir = isRtlReading(activeLang) ? "rtl" : "ltr";
    if (i18n.language !== activeLang) void i18n.changeLanguage(activeLang);
  }, [activeLang, i18n]);

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
        <p className="eyebrow text-sm text-muted-foreground">404</p>
        <h1 className="mt-2 text-3xl text-ink md:text-4xl">Ce bien n'est plus disponible</h1>
        <p className="mt-3 max-w-md text-muted-foreground">
          Il a peut-être été vendu. Découvrez nos autres appartements et projets à Tel Aviv.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <a
            href="/appartements"
            className="rounded-md bg-cta px-5 py-2.5 text-sm font-medium uppercase tracking-wider text-cta-foreground hover:bg-cta/90"
          >
            Nos appartements
          </a>
          <a
            href="/projects"
            className="rounded-md border border-border px-5 py-2.5 text-sm font-medium hover:bg-accent"
          >
            Nos projets
          </a>
        </div>
        <WhatsAppButton />
      </div>
    );
  }

  const isTranslating = needsTranslation && translationQuery.isLoading;
  const translated = needsTranslation ? translationQuery.data : null;
  // While translating (first switch) keep showing the source content underneath.
  const content = translated ?? page.content;

  return (
    <>
      <ReadingLanguageSwitcher
        value={activeLang}
        onChange={setLang}
        category={page.content.category === "project" ? "project" : "apartment"}
      />
      <PageRenderer
        content={content}
        interactive
        pageId={page.id}
        slug={page.slug}
        lang={activeLang}
        settings={settingsQuery.data}
      />
      <SiteFooter className="mt-0" />
      <WhatsAppButton lang={activeLang} title={content.hero?.title} />

      {isTranslating && (
        <div className="fixed bottom-24 z-40 flex items-center gap-2 rounded-md border border-border bg-card/95 px-3 py-1.5 text-xs text-muted-foreground shadow ltr:right-5 rtl:left-5">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          {activeLang === "he" ? "מתרגם…" : "Translating…"}
        </div>
      )}

      {needsTranslation && translationQuery.isError && (
        <div className="fixed bottom-24 z-40 rounded-md border border-destructive/40 bg-card/95 px-3 py-1.5 text-xs text-destructive shadow ltr:right-5 rtl:left-5">
          {(translationQuery.error as Error)?.message ?? "Translation failed."}
        </div>
      )}
    </>
  );
}
