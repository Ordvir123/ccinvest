import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { WhatsAppButton } from "@/components/site/WhatsAppButton";
import { ProjectCard } from "@/components/site/ProjectCard";
import { ContactForm } from "@/components/page/ContactForm";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { listPublishedPages } from "@/lib/pages";
import { SITE_ORIGIN } from "@/lib/site";
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
      { property: "og:url", content: `${SITE_ORIGIN}/` },
    ],
    links: [{ rel: "canonical", href: `${SITE_ORIGIN}/` }],
  }),
  component: Home,
});

function useCountUp(target: string | number, duration = 1500) {
  const isNumber = typeof target === 'number';
  const match = !isNumber ? String(target).match(/^(\D*)(\d+)(\D*)$/) : null;
  const prefix = match?.[1] ?? '';
  const numTarget = match ? parseInt(match[2], 10) : (isNumber ? target : 0);
  const suffix = match?.[3] ?? '';

  // Start from the final value so server-rendered HTML, crawlers and no-JS
  // visitors see the real numbers (they used to see "0%").
  const [value, setValue] = useState<string | number>(target);
  const ref = useRef<HTMLDivElement>(null);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || (!isNumber && !match)) return;
    // Already on screen at load → keep the final value, no animation.
    if (el.getBoundingClientRect().top < window.innerHeight) return;
    setValue(isNumber ? 0 : prefix + '0' + suffix);
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setAnimate(true);
          obs.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    obs.observe(el);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!animate) return;
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
  }, [animate, numTarget, isNumber, prefix, suffix, duration]);

  return { value, ref };
}

function StatItem({ value, label }: { value: string | number; label: string }) {
  const { value: v, ref } = useCountUp(value);
  return (
    <div ref={ref} className="border-s border-white/15 ps-4 md:ps-6">
      <div className="font-display text-5xl font-semibold tracking-tight text-cta md:text-6xl">{v}</div>
      <div className="mt-2 text-sm leading-snug text-primary-foreground/75">
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
    queryFn: () => listPublishedPages(),
  });

  const count = projects?.length ?? 0;
  const featured = (projects ?? []).slice(0, 6);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      {/* Hero */}
      <section className="relative isolate flex min-h-[calc(100svh-4rem)] w-full flex-col overflow-hidden md:min-h-[88vh]">
        <img
          src={heroImage}
          alt="Tel Aviv luxury apartment"
          width={1920}
          height={1080}
          decoding="async"
          fetchPriority="high"
          className="animate-hero-zoom absolute inset-0 -z-10 h-full w-full object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-[oklch(0.18_0.04_265/0.3)]" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-3/4 bg-gradient-to-t from-[oklch(0.16_0.04_265/0.88)] via-[oklch(0.16_0.04_265/0.4)] to-transparent" />
        <div className="container relative mx-auto mt-auto px-5 pb-12 pt-32 md:px-10 md:pb-20">
          <div className="max-w-3xl text-primary-foreground">
            <p
              className="animate-rise mb-5 inline-flex rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-medium tracking-wide text-white/90 backdrop-blur"
              style={{ animationDelay: "120ms" }}
            >
              {t("public.hero.eyebrow")}
            </p>
            <h1
              className="animate-rise font-display text-[2.6rem] leading-[1] !text-primary-foreground [text-shadow:0_2px_24px_oklch(0.15_0.03_265/0.35)] sm:text-6xl md:text-7xl lg:text-8xl"
              style={{ animationDelay: "220ms" }}
            >
              {t("public.hero.title")}
            </h1>
            <p
              className="animate-rise mt-6 max-w-xl text-lg leading-relaxed text-primary-foreground/90 md:text-xl"
              style={{ animationDelay: "340ms" }}
            >
              {t("public.hero.subtitle")}
            </p>
            <div className="animate-rise mt-8" style={{ animationDelay: "460ms" }}>
              <Button
                asChild
                size="lg"
                className="h-12 rounded-full bg-cta px-7 text-base font-medium text-cta-foreground shadow-lg shadow-black/20 transition-transform hover:-translate-y-0.5 hover:bg-cta/90"
              >
                <Link to="/appartements">{t("public.hero.cta")}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="bg-primary py-12 text-primary-foreground md:py-20">
        <div className="container mx-auto grid grid-cols-2 gap-x-6 gap-y-10 px-5 md:grid-cols-4 md:px-10">
          <StatItem value="98%" label={t("public.stats.satisfaction")} />
          <StatItem value={12} label={t("public.stats.experience")} />
          <StatItem value="350+" label={t("public.stats.deals")} />
          <StatItem value="150+" label={t("public.stats.aliyah")} />
        </div>
      </section>

      {/* Projects */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto mb-8 flex items-end justify-between gap-6 px-5 md:mb-12 md:px-10">
          <div>
            <h2 className="section-title">{t("public.properties.title")}</h2>
            <p className="mt-3 text-muted-foreground">{t("public.properties.subtitle")}</p>
          </div>
          {featured.length > 0 && (
            <Link
              to="/appartements"
              className="hidden shrink-0 rounded-full border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-secondary md:inline-flex"
            >
              {t("public.properties.viewAll")}
            </Link>
          )}
        </div>
        {isLoading ? (
          <div className="container mx-auto grid gap-6 px-5 md:grid-cols-2 md:px-10 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-80 rounded-3xl" />
            ))}
          </div>
        ) : featured.length === 0 ? (
          <p className="container mx-auto px-5 py-10 text-muted-foreground md:px-10">
            {t("public.properties.empty")}
          </p>
        ) : (
          <>
            {/* Phones: swipe sideways with the next card peeking in. */}
            <div className="container mx-auto flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-5 px-5 pb-4 [scrollbar-width:none] md:grid md:snap-none md:grid-cols-2 md:gap-6 md:overflow-visible md:px-10 lg:grid-cols-3">
              {featured.map((p) => (
                <div key={p.slug} className="w-[84%] shrink-0 snap-start md:w-auto">
                  <ProjectCard project={p} />
                </div>
              ))}
            </div>
            <div className="container mx-auto mt-6 px-5 md:hidden">
              <Link
                to="/appartements"
                className="flex h-12 items-center justify-center rounded-full border border-border text-sm font-medium transition-colors active:bg-secondary"
              >
                {t("public.properties.viewAll")}
              </Link>
            </div>
          </>
        )}
      </section>

      {/* About teaser */}
      <section className="bg-secondary py-16 md:py-24">
        <div className="container mx-auto max-w-3xl px-5 md:px-10">
          <h2 className="section-title mb-6">
            {t("public.about.title")}
          </h2>
          <div className="mb-8 whitespace-pre-line text-lg leading-relaxed text-muted-foreground">
            {t("public.about.body")}
          </div>
          <Button asChild variant="default" size="lg" className="h-12 rounded-full px-7">
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
      <WhatsAppButton />
    </div>
  );
}
