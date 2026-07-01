import { useState } from "react";
import { Check, ChevronRight, FileText } from "lucide-react";

import { getIcon, guessIcon } from "@/lib/page-icons";
import {
  unitTitle,
  floorValue,
  orientationValue,
  roomsValue,
  areaValue,
  parkingValue,
  ABOUT_APARTMENT_HEADING,
} from "@/lib/unit-i18n";

import { Section } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { hasItems, hasText, type PageContent, type ReadingLang, type Unit } from "@/types/page";
import { ContactForm } from "@/components/page/ContactForm";
import {
  DEFAULT_TEMPLATE_SETTINGS,
  type TemplateSettings,
} from "@/lib/template-settings";

/** Section labels translated by the page's reading language. */
const LABELS: Record<ReadingLang, Record<string, string>> = {
  fr: {
    gallery: "Galerie",
    units: "Appartements disponibles",
    videos: "Vidéos",
    location: "Emplacement idéal",
    floor: "Étage",
    orientation: "Orientation",
    rooms: "Pièces",
    surface: "Surface",
    balcony: "Balcon",
    parking: "Parking",
    notFound: "Page introuvable.",
    floorPlan: "Plan",
  },
  he: {
    gallery: "גלריה",
    units: "דירות זמינות",
    videos: "סרטונים",
    location: "מיקום אידיאלי",
    floor: "קומה",
    orientation: "כיוון",
    rooms: "חדרים",
    surface: "שטח",
    balcony: "מרפסת",
    parking: "חניה",
    notFound: "הדף לא נמצא.",
    floorPlan: "תוכנית דירה",
  },
  en: {
    gallery: "Gallery",
    units: "Available apartments",
    videos: "Videos",
    location: "Ideal location",
    floor: "Floor",
    orientation: "Orientation",
    rooms: "Rooms",
    surface: "Area",
    balcony: "Balcony",
    parking: "Parking",
    notFound: "Page not found.",
    floorPlan: "Floor plan",
  },
};


const scrollToContact = () => {
  document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
};

/** Pick a per-locale authored value, falling back to the base (source) value. */
function pickI18n(
  map: Partial<Record<ReadingLang, string>> | undefined,
  base: string | undefined,
  lang: ReadingLang,
): string | undefined {
  const v = map?.[lang];
  return hasText(v) ? v : base;
}

function Hero({
  hero,
  settings,
  lang,
}: {
  hero: PageContent["hero"];
  settings: TemplateSettings;
  lang: ReadingLang;
}) {
  const bg = hero.background?.url;
  const kicker = pickI18n(hero.kicker_i18n, hero.kicker, lang);
  const ctaResolved = pickI18n(hero.cta_label_i18n, hero.cta_label, lang);
  const ctaLabel = hasText(ctaResolved) ? ctaResolved : settings.defaultCtaLabel;
  return (
    <section className="relative overflow-hidden bg-gradient-brand text-primary-foreground">
      {bg && (
        <>
          <img
            src={bg}
            alt={hero.background?.alt ?? hero.title}
            decoding="async"
            fetchPriority="high"
            className="absolute inset-0 h-full w-full object-cover"
          />
          {/* Dark overlay keeps hero text readable over any image. */}
          <div className="absolute inset-0 bg-gradient-overlay" />
          <div className="absolute inset-0 bg-[oklch(0.18_0.04_265/0.55)]" />
        </>
      )}
      <Section className="relative z-10 flex min-h-[80vh] flex-col justify-center py-20 text-center md:py-24">
        <img
          src={settings.brandLogoUrl}
          alt={settings.brandName}
          className="mx-auto mb-8 h-20 w-auto rounded-lg bg-card px-6 py-4 shadow-sm md:mb-10 md:h-28"
        />
        {hasText(kicker) && (
          <p className="eyebrow mb-5 text-xs text-primary-foreground/80">
            {kicker}
          </p>
        )}
        <h1 className="mx-auto max-w-3xl text-balance text-4xl !text-primary-foreground [text-shadow:0_2px_12px_oklch(0.15_0.03_265/0.5)] sm:text-5xl md:text-7xl">
          {hero.title}
        </h1>
        {hasText(hero.subtitle) && (
          <p className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-primary-foreground/90 [text-shadow:0_1px_8px_oklch(0.15_0.03_265/0.45)]">
            {hero.subtitle}
          </p>
        )}
        {hasText(hero.price) && (
          <p className="mt-8 font-serif text-3xl !text-primary-foreground md:text-4xl">
            {hero.price}
          </p>
        )}
        {hasText(ctaLabel) && (
          <div className="mt-10">
            <Button
              size="lg"
              className="bg-cta uppercase tracking-wider text-cta-foreground hover:bg-cta/90"
              onClick={scrollToContact}
            >
              {ctaLabel}
            </Button>
          </div>
        )}
      </Section>
    </section>
  );
}

function Stats({ stats }: { stats: PageContent["stats"] }) {
  if (!hasItems(stats)) return null;
  return (
    <section className="border-y border-border bg-secondary">
      <div className="mx-auto grid max-w-6xl grid-cols-2 divide-x divide-border md:grid-cols-4 rtl:divide-x-reverse">
        {stats.map((s, i) => {
          // Prefer a meaningful guess from the label when no icon is set or the
          // stored icon is the generic "sparkles" default (avoids repeated icons).
          const guessed = guessIcon(s.label, "");
          const preferGuess = (!s.icon || s.icon === "sparkles") && !!guessed;
          const Icon =
            (preferGuess ? getIcon(guessed) : getIcon(s.icon)) ??
            getIcon(s.icon) ??
            getIcon(guessIcon(s.label, "sparkles"));
          return (
            <div key={i} className="flex flex-col items-center px-3 py-8 text-center md:px-4 md:py-10">
              {Icon && (
                <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
              )}
              <div className="font-serif text-3xl text-ink md:text-5xl">{s.value}</div>
              <div className="eyebrow mt-2 text-[0.65rem] text-steel">
                {s.label}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function LocationBlock({
  location,
  lang,
}: {
  location: NonNullable<PageContent["location"]>;
  lang: ReadingLang;
}) {
  const hasMap = hasText(location.map_query);
  const properName = location.name_i18n?.[lang];
  return (
    <Section>
      <div className="grid items-center gap-10 md:grid-cols-2">
        <div>
          {hasText(properName) && (
            <p className="eyebrow mb-2 text-sm text-primary">{properName}</p>
          )}
          {hasText(location.heading) && (
            <h2 className="text-3xl text-ink md:text-4xl">{location.heading}</h2>
          )}
          {hasText(location.text) && (
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">{location.text}</p>
          )}
        </div>
        {hasMap && (
          <div className="overflow-hidden rounded-lg border border-border shadow-sm">
            <iframe
              title={location.heading ?? "Map"}
              className="h-[340px] w-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://maps.google.com/maps?q=${encodeURIComponent(location.map_query!)}&t=m&z=16&output=embed`}
            />
          </div>
        )}
      </div>
    </Section>
  );
}

function About({ about }: { about: NonNullable<PageContent["about"]> }) {
  return (
    <section className="bg-secondary">
      <Section>
        <div className="mx-auto max-w-3xl text-center">
          {hasText(about.heading) && (
            <h2 className="text-3xl text-ink md:text-4xl">{about.heading}</h2>
          )}
          {hasText(about.body) && (
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground">{about.body}</p>
          )}
        </div>
        {hasItems(about.features) && (
          <ul className="mx-auto mt-10 grid max-w-3xl gap-3 sm:grid-cols-2">
            {about.features!.map((f, i) => {
              const Icon =
                getIcon(about.feature_icons?.[i]) ?? getIcon(guessIcon(f, "check")) ?? Check;
              return (
                <li key={i} className="flex items-center gap-3 text-foreground">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  {f}
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </section>
  );
}

function Gallery({ gallery, labels }: { gallery: PageContent["gallery"]; labels: Record<string, string> }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  if (!hasItems(gallery)) return null;

  return (
    <Section>
      <h2 className="mb-8 text-center text-3xl text-ink md:text-4xl">{labels.gallery}</h2>
      <Carousel opts={{ loop: true }} className="mx-auto w-full max-w-4xl">
        <CarouselContent>
          {gallery.map((img, i) => (
            <CarouselItem key={i} className="md:basis-2/3">
              <button
                type="button"
                onClick={() => {
                  setActive(i);
                  setOpen(true);
                }}
                className="block w-full overflow-hidden rounded-lg border border-border"
              >
                <img
                  src={img.url}
                  alt={img.alt ?? `Image ${i + 1}`}
                  loading="lazy"
                  className="aspect-[4/3] w-full object-cover transition-transform duration-300 hover:scale-[1.03]"
                />
              </button>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl border-none bg-transparent p-0 shadow-none">
          <DialogTitle className="sr-only">Image</DialogTitle>
          <img
            src={gallery[active]?.url}
            alt={gallery[active]?.alt ?? `Image ${active + 1}`}
            className="max-h-[85vh] w-full rounded-lg object-contain"
          />
        </DialogContent>
      </Dialog>
    </Section>
  );
}

function UnitCard({
  unit,
  labels,
  lang,
}: {
  unit: Unit;
  labels: Record<string, string>;
  lang: ReadingLang;
}) {
  const [planOpen, setPlanOpen] = useState(false);
  const title = unitTitle(unit, lang);
  const rows: [string, string | undefined][] = [
    [labels.floor, hasText(unit.floor) ? floorValue(unit.floor!, lang) : undefined],
    [labels.orientation, hasText(unit.orientation) ? orientationValue(unit.orientation!, lang) : undefined],
    [labels.rooms, hasText(unit.rooms) ? roomsValue(unit.rooms!, lang) : undefined],
    [labels.surface, hasText(unit.area_m2) ? areaValue(unit.area_m2!) : undefined],
    [labels.balcony, hasText(unit.balcony_m2) ? areaValue(unit.balcony_m2!) : undefined],
    [labels.parking, hasText(unit.parking) ? parkingValue(unit.parking!, lang) : undefined],
  ];
  const visibleRows = rows.filter(([, v]) => hasText(v));
  const plan = unit.attachment;

  return (
    <Card className="flex flex-col overflow-hidden">
      {unit.image?.url && (
        <img
          src={unit.image.url}
          alt={unit.image.alt ?? title}
          loading="lazy"
          className="aspect-video w-full object-cover"
        />
      )}
      <CardContent className="flex flex-1 flex-col p-6">
        <h3 className="font-serif text-2xl text-ink">{title}</h3>
        {hasText(unit.price) && (
          <p className="mt-1 text-lg font-semibold text-primary">{unit.price}</p>
        )}
        {visibleRows.length > 0 && (
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {visibleRows.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-2 border-b border-border/60 pb-1">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="font-medium text-foreground">{value}</dd>
              </div>
            ))}
          </dl>
        )}
        {hasText(unit.description) && (
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{unit.description}</p>
        )}
        {hasItems(unit.features) && (
          <ul className="mt-4 space-y-1.5">
            {unit.features!.map((f, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-foreground">
                <ChevronRight className="h-4 w-4 text-primary rtl:rotate-180" aria-hidden />
                {f}
              </li>
            ))}
          </ul>
        )}
        {plan?.url && plan.type === "image" && (
          <button
            type="button"
            onClick={() => setPlanOpen(true)}
            className="mt-4 block overflow-hidden rounded-md border border-border"
          >
            <img
              src={plan.url}
              alt={labels.floorPlan}
              loading="lazy"
              className="aspect-video w-full object-cover transition-transform duration-300 hover:scale-[1.03]"
            />
            <span className="block bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground">
              {labels.floorPlan}
            </span>
          </button>
        )}
        {plan?.url && plan.type === "pdf" && (
          <a
            href={plan.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-center gap-3 rounded-md border border-border bg-secondary px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary/70"
          >
            <FileText className="h-5 w-5 shrink-0 text-primary" aria-hidden />
            {labels.floorPlan}
          </a>
        )}
      </CardContent>

      {plan?.url && plan.type === "image" && (
        <Dialog open={planOpen} onOpenChange={setPlanOpen}>
          <DialogContent className="max-w-4xl border-none bg-transparent p-0 shadow-none">
            <DialogTitle className="sr-only">{labels.floorPlan}</DialogTitle>
            <img
              src={plan.url}
              alt={labels.floorPlan}
              className="max-h-[85vh] w-full rounded-lg object-contain"
            />
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}

function Units({
  units,
  labels,
  lang,
}: {
  units: PageContent["units"];
  labels: Record<string, string>;
  lang: ReadingLang;
}) {
  if (!hasItems(units)) return null;
  return (
    <section className="bg-secondary">
      <Section>
        <h2 className="mb-10 text-center text-3xl text-ink md:text-4xl">{labels.units}</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {units!.map((u, i) => (
            <UnitCard key={i} unit={u} labels={labels} lang={lang} />
          ))}
        </div>
      </Section>
    </section>
  );
}

/** Single-apartment section ("About the apartment") — wide two-column layout. */
function ApartmentSection({
  apartment,
  imageSide,
  labels,
  lang,
}: {
  apartment: Unit;
  imageSide: "left" | "right";
  labels: Record<string, string>;
  lang: ReadingLang;
}) {
  const [planOpen, setPlanOpen] = useState(false);
  const title = unitTitle(apartment, lang);
  const rows: [string, string | undefined][] = [
    [labels.floor, hasText(apartment.floor) ? floorValue(apartment.floor!, lang) : undefined],
    [labels.orientation, hasText(apartment.orientation) ? orientationValue(apartment.orientation!, lang) : undefined],
    [labels.rooms, hasText(apartment.rooms) ? roomsValue(apartment.rooms!, lang) : undefined],
    [labels.surface, hasText(apartment.area_m2) ? areaValue(apartment.area_m2!) : undefined],
    [labels.balcony, hasText(apartment.balcony_m2) ? areaValue(apartment.balcony_m2!) : undefined],
    [labels.parking, hasText(apartment.parking) ? parkingValue(apartment.parking!, lang) : undefined],
  ];
  const visibleRows = rows.filter(([, v]) => hasText(v));
  const plan = apartment.attachment;
  // DOM order is details → image (mobile stacks details first, image below).
  // On desktop, "left" puts the image first; RTL mirrors via flex-row + dir.
  const imageOrder = imageSide === "left" ? "md:order-1" : "md:order-2";
  const detailsOrder = imageSide === "left" ? "md:order-2" : "md:order-1";

  return (
    <section className="bg-secondary">
      <Section>
        <h2 className="mb-10 text-center text-3xl text-ink md:text-4xl">
          {ABOUT_APARTMENT_HEADING[lang] ?? ABOUT_APARTMENT_HEADING.fr}
        </h2>
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-0 md:flex-row md:items-stretch">
            <div className={`flex flex-col p-6 md:w-1/2 md:p-10 ${detailsOrder}`}>
              <h3 className="font-serif text-3xl text-ink md:text-4xl">{title}</h3>
              {hasText(apartment.price) && (
                <p className="mt-2 text-xl font-semibold text-primary">{apartment.price}</p>
              )}
              {visibleRows.length > 0 && (
                <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4">
                  {visibleRows.map(([label, value]) => (
                    <div key={label} className="flex flex-col gap-0.5 border-b border-border/60 pb-2">
                      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
                      <dd className="text-base font-medium text-foreground">{value}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {hasText(apartment.description) && (
                <p className="mt-6 text-base leading-relaxed text-muted-foreground">{apartment.description}</p>
              )}
              {hasItems(apartment.features) && (
                <ul className="mt-6 space-y-2">
                  {apartment.features!.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-foreground">
                      <ChevronRight className="h-4 w-4 text-primary rtl:rotate-180" aria-hidden />
                      {f}
                    </li>
                  ))}
                </ul>
              )}
              {plan?.url && plan.type === "image" && (
                <button
                  type="button"
                  onClick={() => setPlanOpen(true)}
                  className="mt-6 block overflow-hidden rounded-md border border-border"
                >
                  <img
                    src={plan.url}
                    alt={labels.floorPlan}
                    loading="lazy"
                    className="aspect-video w-full object-cover transition-transform duration-300 hover:scale-[1.03]"
                  />
                  <span className="block bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground">
                    {labels.floorPlan}
                  </span>
                </button>
              )}
              {plan?.url && plan.type === "pdf" && (
                <a
                  href={plan.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 flex items-center gap-3 rounded-md border border-border bg-background px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary/70"
                >
                  <FileText className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                  {labels.floorPlan}
                </a>
              )}
            </div>
            {apartment.image?.url && (
              <div className={`md:w-1/2 ${imageOrder}`}>
                <img
                  src={apartment.image.url}
                  alt={apartment.image.alt ?? title}
                  loading="lazy"
                  className="h-64 w-full object-cover md:h-full"
                />
              </div>
            )}
          </div>
        </Card>

        {plan?.url && plan.type === "image" && (
          <Dialog open={planOpen} onOpenChange={setPlanOpen}>
            <DialogContent className="max-w-4xl border-none bg-transparent p-0 shadow-none">
              <DialogTitle className="sr-only">{labels.floorPlan}</DialogTitle>
              <img
                src={plan.url}
                alt={labels.floorPlan}
                className="max-h-[85vh] w-full rounded-lg object-contain"
              />
            </DialogContent>
          </Dialog>
        )}
      </Section>
    </section>
  );
}




function Videos({ videos, labels }: { videos: PageContent["videos"]; labels: Record<string, string> }) {
  if (!hasItems(videos)) return null;
  return (
    <Section>
      <h2 className="mb-10 text-center text-3xl text-ink md:text-4xl">{labels.videos}</h2>
      <div className="grid gap-8 md:grid-cols-2">
        {videos!.map((v, i) => (
          <figure key={i}>
            <div className="aspect-video w-full overflow-hidden rounded-lg border border-border">
              <iframe
                className="h-full w-full"
                src={`https://www.youtube.com/embed/${v.youtube_id}`}
                title={v.title ?? `Video ${i + 1}`}
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            {hasText(v.title) && (
              <figcaption className="mt-3 text-center text-sm text-muted-foreground">
                {v.title}
              </figcaption>
            )}
          </figure>
        ))}
      </div>
    </Section>
  );
}

export type PageRendererProps = {
  content: PageContent;
  /** Lead-capture context. When omitted, the contact form is inert (preview). */
  interactive?: boolean;
  pageId?: string | null;
  slug?: string;
  lang?: ReadingLang;
  /** Global template settings (logo, colors, defaults). */
  settings?: TemplateSettings;
};

export function PageRenderer({
  content,
  interactive = false,
  pageId,
  slug,
  lang = "fr",
  settings = DEFAULT_TEMPLATE_SETTINGS,
}: PageRendererProps) {
  const labels = LABELS[lang] ?? LABELS.fr;
  const brandStyle = hasText(settings.primaryColor)
    ? ({
        "--primary": settings.primaryColor,
        "--primary-glow": settings.primaryColor,
        "--gradient-brand": `linear-gradient(135deg, ${settings.primaryColor}, ${settings.primaryColor})`,
      } as React.CSSProperties)
    : undefined;
  return (
    <main className="bg-background" style={brandStyle}>
      <Hero hero={content.hero} settings={settings} lang={lang} />
      <Stats stats={content.stats} />
      {content.location &&
        (hasText(content.location.heading) ||
          hasText(content.location.text) ||
          hasText(content.location.map_query)) && (
          <LocationBlock location={content.location} lang={lang} />
        )}
      {content.about &&
        (hasText(content.about.heading) ||
          hasText(content.about.body) ||
          hasItems(content.about.features)) && <About about={content.about} />}
      <Gallery gallery={content.gallery} labels={labels} />
      {content.category === "project" ? (
        <Units units={content.units} labels={labels} lang={lang} />
      ) : (
        content.apartment &&
        (hasText(content.apartment.unit_type) ||
          hasText(content.apartment.name) ||
          hasText(content.apartment.description) ||
          hasText(content.apartment.image?.url)) && (
          <ApartmentSection
            apartment={content.apartment}
            imageSide={content.apartment_image_side === "left" ? "left" : "right"}
            labels={labels}
            lang={lang}
          />
        )
      )}
      <Videos videos={content.videos} labels={labels} />
      <ContactForm
        heading={
          pickI18n(content.contact?.heading_i18n, content.contact?.heading, lang) ??
          (hasText(settings.defaultContactHeading) ? settings.defaultContactHeading : undefined)
        }
        interactive={interactive}
        pageId={pageId}
        slug={slug}
        projectTitle={content.hero?.title}
        lang={lang}
        backgroundUrl={settings.contactBgUrl}
      />
    </main>
  );
}

