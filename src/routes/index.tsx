import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { ProjectCard } from "@/components/site/ProjectCard";
import { ContactForm } from "@/components/page/ContactForm";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { listPublishedPages } from "@/lib/pages";
import type { ReadingLang } from "@/types/page";
import heroImage from "@/assets/hero-apartment.jpg";

const READING = ["fr", "he", "en"] as const;
const toReadingLang = (l: string): ReadingLang =>
  (READING as readonly string[]).includes(l) ? (l as ReadingLang) : "fr";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CC Invest — Premium Real Estate" },
      {
        name: "description",
        content: "Discover CC Invest's curated real estate projects in Tel Aviv.",
      },
      { property: "og:title", content: "CC Invest — Premium Real Estate" },
      {
        property: "og:description",
        content: "Discover CC Invest's curated real estate projects in Tel Aviv.",
      },
      { property: "og:url", content: "https://ccinvest.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://ccinvest.lovable.app/" }],
  }),
  component: Home,
});

function useCountUp(target: string | number, duration = 1500) {
  const isNumber = typeof target === 'number';
  const match = !isNumber ? String(target).match(/^(\D*)(\d+)(\D*)$/) : null;
  const prefix = match?.[1] ?? '';
  const numTarget = match ? parseInt(match[2], 10) : (isNumber ? target : 0);
  const suffix = match?.[3] ?? '';
  const initial = isNumber ? 0 : (match ? prefix + '0' + suffix : target);

  const [value, setValue] = useState<string | number>(initial);
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setInView(true);
      },
      { threshold: 0.4 },
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const currentNum = Math.floor(p * numTarget);
      setValue(isNumber ? currentNum : prefix + currentNum + suffix);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, numTarget, isNumber, prefix, suffix, duration]);

  return { value, ref };
}

function StatItem({ value, label }: { value: string | number; label: string }) {
  const { value: v, ref } = useCountUp(value);
  return (
    <div ref={ref} className="text-center">
      <div className="font-display text-4xl text-cta md:text-5xl">{v}</div>
      <div className="mt-2 text-xs uppercase tracking-wider text-primary-foreground/70 md:text-sm">
        {label}
      </div>
    </div>
  );
}

function Home() {
  const { t, i18n } = useTranslation();
  const lang = toReadingLang(i18n.language);

  const { data: projects, isLoading } = useQuery({
    queryKey: ["published-pages"],
    queryFn: listPublishedPages,
  });

  const count = projects?.length ?? 0;
  const featured = (projects ?? []).slice(0, 6);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      {/* Hero */}
      <section className="relative h-[85vh] min-h-[560px] w-full overflow-hidden">
        <img
          src={heroImage}
          alt="Tel Aviv luxury apartment"
          width={1920}
          height={1080}
          decoding="async"
          fetchPriority="high"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-overlay" />
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="container relative z-10 mx-auto flex h-full items-end px-4 pb-20">
          <div className="max-w-2xl text-primary-foreground">
            <p className="mb-4 text-sm uppercase tracking-[0.3em] text-cta">
              {t("public.hero.eyebrow")}
            </p>
            <h1 className="font-display text-4xl leading-tight !text-primary-foreground [text-shadow:0_2px_14px_oklch(0.15_0.03_265/0.55)] md:text-6xl lg:text-7xl">
              {t("public.hero.title")}
            </h1>
            <p className="mt-6 text-lg text-primary-foreground/85 md:text-xl">
              {t("public.hero.subtitle")}
            </p>
            <Button
              asChild
              size="lg"
              className="mt-8 bg-cta uppercase tracking-wider text-cta-foreground hover:bg-cta/90"
            >
              <Link to="/appartements">{t("public.hero.cta")}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="bg-primary py-12 text-primary-foreground md:py-16">
        <div className="container mx-auto grid grid-cols-2 gap-8 px-4 md:grid-cols-4">
          <StatItem value="98%" label={t("public.stats.satisfaction")} />
          <StatItem value={12} label={t("public.stats.experience")} />
          <StatItem value="350+" label={t("public.stats.deals")} />
          <StatItem value="150+" label={t("public.stats.aliyah")} />
        </div>
      </section>

      {/* Projects */}
      <section className="container mx-auto px-4 py-20">
        <div className="mb-12 text-center">
          <h2 className="font-display text-3xl md:text-4xl">
            {t("public.properties.title")}
          </h2>
          <p className="mt-2 text-muted-foreground">
            {t("public.properties.subtitle")}
          </p>
        </div>
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-80" />
            ))}
          </div>
        ) : featured.length === 0 ? (
          <p className="py-10 text-center text-muted-foreground">
            {t("public.properties.empty")}
          </p>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {featured.map((p) => (
                <ProjectCard key={p.slug} project={p} />
              ))}
            </div>
            <div className="mt-10 text-center">
              <Button asChild variant="outline" size="lg">
                <Link to="/appartements">{t("public.properties.viewAll")}</Link>
              </Button>
            </div>
          </>
        )}
      </section>

      {/* About teaser */}
      <section className="bg-secondary py-20">
        <div className="container mx-auto max-w-3xl px-4 text-center">
          <h2 className="mb-6 font-display text-3xl md:text-4xl">
            {t("public.about.title")}
          </h2>
          <div className="mb-8 whitespace-pre-line text-lg leading-relaxed text-muted-foreground">
            {t("public.about.body")}
          </div>
          <Button asChild variant="default" size="lg">
            <Link to="/about">{t("public.about.cta")}</Link>
          </Button>
        </div>
      </section>

      <ContactForm
        interactive
        pageId={null}
        lang={lang}
        projectTitle={t("app.name")}
        heading={t("public.contact.title")}
        subheading={t("public.contact.subtitle")}
      />

      <SiteFooter />
    </div>
  );
}
