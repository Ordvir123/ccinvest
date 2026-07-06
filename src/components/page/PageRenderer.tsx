import { Fragment, useState } from "react";
import { ChevronRight, FileText, EyeOff } from "lucide-react";
import {
  orderedSectionKeys,
  isSectionHidden,
  SECTION_LABELS,
  type SectionKey,
} from "@/lib/page-sections";
import { cn } from "@/lib/utils";

import { getIcon, guessIcon } from "@/lib/page-icons";
import {
  unitTitle,
  ABOUT_APARTMENT_HEADING,
  rowLabel,
  rowIcon,
  rowValue,
  featureRowText,
  migrateUnitSpecs,
  migrateUnitFeatures,
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
import {
  hasItems,
  hasText,
  type PageContent,
  type ReadingLang,
  type SpecPreset,
  type Unit,
} from "@/types/page";
import { ContactForm } from "@/components/page/ContactForm";
import { DEFAULT_TEMPLATE_SETTINGS, type TemplateSettings } from "@/lib/template-settings";

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
          <p className="eyebrow mb-5 text-xs text-primary-foreground/80">{kicker}</p>
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
            <div
              key={i}
              className="flex flex-col items-center px-3 py-8 text-center md:px-4 md:py-10"
            >
              {Icon && (
                <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
              )}
              <div className="font-serif text-3xl text-ink md:text-5xl">{s.value}</div>
              <div className="eyebrow mt-2 text-[0.65rem] text-steel">{s.label}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/**
 * Remove precise house numbers from a map query so the embed points at the
 * street/area, not the exact building — visitors can't lift the owner's exact
 * address from the map or open it in Google Maps for the pinpoint.
 */
function approximateMapQuery(query: string): string {
  return query
    .replace(/\b\d+\b/g, " ") // drop standalone house/zip numbers
    .replace(/\s*,\s*,+/g, ", ") // collapse empty comma segments
    .replace(/\s{2,}/g, " ")
    .replace(/\s*,\s*/g, ", ")
    .replace(/^[\s,]+|[\s,]+$/g, "")
    .trim();
}

function LocationBlock({
  location,
  labels,
  lang,
}: {
  location: NonNullable<PageContent["location"]>;
  labels: Record<string, string>;
  lang: ReadingLang;
}) {
  const hasMap = hasText(location.map_query);
  const properName = location.name_i18n?.[lang];
  const mapArea = hasMap ? approximateMapQuery(location.map_query!) : "";
  return (
    <Section>
      <div className="grid items-center gap-10 md:grid-cols-2">
        <div>
          {hasText(properName) && <p className="eyebrow mb-2 text-sm text-primary">{properName}</p>}
          <h2 className="text-3xl text-ink md:text-4xl">{labels.location}</h2>
          {hasText(location.text) && (
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">{location.text}</p>
          )}
        </div>
        {hasMap && (
          <div className="relative overflow-hidden rounded-lg border border-border shadow-sm">
            <iframe
              title={labels.location}
              className="h-[340px] w-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://maps.google.com/maps?q=${encodeURIComponent(mapArea)}&t=m&z=14&output=embed`}
            />
            {/* Transparent overlay blocks click-through to "View larger map",
                directions, and dragging — keeping the exact address private. */}
            <div className="absolute inset-0" aria-hidden />
          </div>
        )}
      </div>
    </Section>
  );
}

function Gallery({
  gallery,
  labels,
}: {
  gallery: PageContent["gallery"];
  labels: Record<string, string>;
}) {
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
  specPresets,
  featurePresets,
}: {
  unit: Unit;
  labels: Record<string, string>;
  lang: ReadingLang;
  specPresets: SpecPreset[];
  featurePresets: SpecPreset[];
}) {
  const [planOpen, setPlanOpen] = useState(false);
  const title = unitTitle(unit, lang);
  const visibleRows = (unit.specs ?? migrateUnitSpecs(unit))
    .map((r) => ({
      label: rowLabel(r, lang, specPresets),
      value: rowValue(r, lang, specPresets),
      icon: rowIcon(r, specPresets),
    }))
    .filter((r) => hasText(r.value));
  const featureItems = (unit.featureRows ?? migrateUnitFeatures(unit))
    .map((r) => ({
      text: featureRowText(r, lang, featurePresets),
      icon: rowIcon(r, featurePresets),
    }))
    .filter((r) => hasText(r.text));
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
            {visibleRows.map((r, ri) => {
              const RowIcon = getIcon(r.icon);
              return (
                <div key={ri} className="flex justify-between gap-2 border-b border-border/60 pb-1">
                  <dt className="flex items-center gap-1.5 text-muted-foreground">
                    {RowIcon && <RowIcon className="h-4 w-4 shrink-0 text-primary" aria-hidden />}
                    {r.label}
                  </dt>
                  <dd className="font-medium text-foreground">{r.value}</dd>
                </div>
              );
            })}
          </dl>
        )}
        {hasText(unit.description) && (
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{unit.description}</p>
        )}
        {featureItems.length > 0 && (
          <ul className="mt-4 space-y-1.5">
            {featureItems.map((f, i) => {
              const FIcon = getIcon(f.icon);
              return (
                <li key={i} className="flex items-center gap-2 text-sm text-foreground">
                  {FIcon ? (
                    <FIcon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-primary rtl:rotate-180" aria-hidden />
                  )}
                  {f.text}
                </li>
              );
            })}
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
  specPresets,
  featurePresets,
}: {
  units: PageContent["units"];
  labels: Record<string, string>;
  lang: ReadingLang;
  specPresets: SpecPreset[];
  featurePresets: SpecPreset[];
}) {
  if (!hasItems(units)) return null;
  return (
    <section className="bg-secondary">
      <Section>
        <h2 className="mb-10 text-center text-3xl text-ink md:text-4xl">{labels.units}</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {units!.map((u, i) => (
            <UnitCard
              key={i}
              unit={u}
              labels={labels}
              lang={lang}
              specPresets={specPresets}
              featurePresets={featurePresets}
            />
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
  heading,
  headingIcon,
  labels,
  lang,
  specPresets,
  featurePresets,
}: {
  apartment: Unit;
  imageSide: "left" | "right";
  heading?: string;
  headingIcon?: string;
  labels: Record<string, string>;
  lang: ReadingLang;
  specPresets: SpecPreset[];
  featurePresets: SpecPreset[];
}) {
  const [planOpen, setPlanOpen] = useState(false);
  const title = unitTitle(apartment, lang);
  const visibleRows = (apartment.specs ?? migrateUnitSpecs(apartment))
    .map((r) => ({
      label: rowLabel(r, lang, specPresets),
      value: rowValue(r, lang, specPresets),
      icon: rowIcon(r, specPresets),
    }))
    .filter((r) => hasText(r.value));
  const featureItems = (apartment.featureRows ?? migrateUnitFeatures(apartment))
    .map((r) => ({
      text: featureRowText(r, lang, featurePresets),
      icon: rowIcon(r, featurePresets),
    }))
    .filter((r) => hasText(r.text));
  const plan = apartment.attachment;

  // DOM order is details → image (mobile stacks details first, image below).
  // On desktop, "left" puts the image first; RTL mirrors via flex-row + dir.
  const imageOrder = imageSide === "left" ? "md:order-1" : "md:order-2";
  const detailsOrder = imageSide === "left" ? "md:order-2" : "md:order-1";

  return (
    <section className="bg-secondary">
      <Section>
        {(() => {
          const HeadingIcon = getIcon(headingIcon);
          const text = hasText(heading)
            ? heading
            : (ABOUT_APARTMENT_HEADING[lang] ?? ABOUT_APARTMENT_HEADING.fr);
          return (
            <h2 className="mb-10 flex items-center justify-center gap-3 text-center text-3xl text-ink md:text-4xl">
              {HeadingIcon && <HeadingIcon className="h-7 w-7 shrink-0 text-primary" aria-hidden />}
              {text}
            </h2>
          );
        })()}
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-0 md:flex-row md:items-stretch">
            <div className={`flex flex-col p-6 md:w-1/2 md:p-10 ${detailsOrder}`}>
              <h3 className="font-serif text-3xl text-ink md:text-4xl">{title}</h3>
              {hasText(apartment.price) && (
                <p className="mt-2 text-xl font-semibold text-primary">{apartment.price}</p>
              )}
              {visibleRows.length > 0 && (
                <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4">
                  {visibleRows.map((r, ri) => {
                    const RowIcon = getIcon(r.icon);
                    return (
                      <div
                        key={ri}
                        className="flex flex-col gap-0.5 border-b border-border/60 pb-2"
                      >
                        <dt className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
                          {RowIcon && (
                            <RowIcon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                          )}
                          {r.label}
                        </dt>
                        <dd className="text-base font-medium text-foreground">{r.value}</dd>
                      </div>
                    );
                  })}
                </dl>
              )}
              {hasText(apartment.description) && (
                <p className="mt-6 text-base leading-relaxed text-muted-foreground">
                  {apartment.description}
                </p>
              )}
              {featureItems.length > 0 && (
                <ul className="mt-6 space-y-2">
                  {featureItems.map((f, i) => {
                    const FIcon = getIcon(f.icon);
                    return (
                      <li key={i} className="flex items-center gap-2 text-foreground">
                        {FIcon ? (
                          <FIcon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                        ) : (
                          <ChevronRight
                            className="h-4 w-4 text-primary rtl:rotate-180"
                            aria-hidden
                          />
                        )}
                        {f.text}
                      </li>
                    );
                  })}
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

function Videos({
  videos,
  labels,
}: {
  videos: PageContent["videos"];
  labels: Record<string, string>;
}) {
  if (!hasItems(videos)) return null;
  return (
    <Section>
      <h2 className="mb-10 text-center text-3xl text-ink md:text-4xl">{labels.videos}</h2>
      <div className="mx-auto flex max-w-5xl flex-wrap justify-center gap-8">
        {videos!.map((v, i) => (
          <figure key={i} className="w-full max-w-2xl md:w-[calc(50%-1rem)]">
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

/** Full-bleed images spanning the whole screen width, stacked vertically. */
function WideImages({ images }: { images?: PageContent["wide_images"] }) {
  if (!hasItems(images)) return null;
  return (
    <section className="w-full">
      {images!.map((img, i) => (
        <img
          key={i}
          src={img.url}
          alt={img.alt ?? ""}
          loading="lazy"
          className="block w-full object-cover"
        />
      ))}
    </section>
  );
}

/**
 * Preview-only wrapper: tags a rendered section with data-section-key, shows a
 * hover outline + name badge, dims hidden sections, and forwards clicks. Only
 * used inside the admin editor preview — never in the public page output.
 */
function PreviewSection({
  sectionKey,
  hidden,
  onSelect,
  children,
}: {
  sectionKey: SectionKey;
  hidden: boolean;
  onSelect?: (key: SectionKey) => void;
  children: React.ReactNode;
}) {
  return (
    <div
      data-section-key={sectionKey}
      onClick={() => onSelect?.(sectionKey)}
      className={cn(
        "group/preview relative cursor-pointer",
        hidden && "opacity-40 grayscale",
      )}
    >
      {/* Hover outline */}
      <div className="pointer-events-none absolute inset-0 z-30 ring-inset ring-2 ring-transparent transition-colors group-hover/preview:ring-primary/70" />
      {/* Section-name badge on hover */}
      <div className="pointer-events-none absolute left-3 top-3 z-40 rounded-md bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground opacity-0 shadow transition-opacity group-hover/preview:opacity-100">
        {SECTION_LABELS[sectionKey]}
      </div>
      {/* Persistent "hidden" badge for hidden sections */}
      {hidden && (
        <div className="pointer-events-none absolute right-3 top-3 z-40 inline-flex items-center gap-1 rounded-md bg-foreground/80 px-2 py-0.5 text-xs font-medium text-background shadow">
          <EyeOff className="h-3 w-3" /> hidden
        </div>
      )}
      {children}
    </div>
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
  /**
   * Admin editor preview mode: wraps each section with a clickable overlay and
   * renders hidden sections dimmed instead of removing them. Off by default so
   * the public page output stays pixel-identical.
   */
  preview?: boolean;
  /** Called when a section is clicked in preview mode. */
  onSectionSelect?: (key: SectionKey) => void;
};

export function PageRenderer({
  content,
  interactive = false,
  pageId,
  slug,
  lang = "fr",
  settings = DEFAULT_TEMPLATE_SETTINGS,
  preview = false,
  onSectionSelect,
}: PageRendererProps) {
  const labels = LABELS[lang] ?? LABELS.fr;
  const brandStyle = hasText(settings.primaryColor)
    ? ({
        "--primary": settings.primaryColor,
        "--primary-glow": settings.primaryColor,
        "--gradient-brand": `linear-gradient(135deg, ${settings.primaryColor}, ${settings.primaryColor})`,
      } as React.CSSProperties)
    : undefined;

  const nodes: Record<SectionKey, React.ReactNode> = {
    stats: <Stats stats={content.stats} />,
    location:
      content.location &&
      (hasText(content.location.text) || hasText(content.location.map_query)) ? (
        <LocationBlock location={content.location} labels={labels} lang={lang} />
      ) : null,
    listing:
      content.category === "project" ? (
        <Units
          units={content.units}
          labels={labels}
          lang={lang}
          specPresets={settings.specPresets}
          featurePresets={settings.featurePresets}
        />
      ) : content.apartment &&
        (hasText(content.apartment.unit_type) ||
          hasText(content.apartment.name) ||
          hasText(content.apartment.description) ||
          hasText(content.apartment.price) ||
          hasItems(content.apartment.specs) ||
          hasItems(content.apartment.featureRows) ||
          hasText(content.apartment.image?.url)) ? (
        <ApartmentSection
          apartment={content.apartment}
          imageSide={content.apartment_image_side === "left" ? "left" : "right"}
          heading={content.apartment_title}
          headingIcon={content.apartment_title_icon}
          labels={labels}
          lang={lang}
          specPresets={settings.specPresets}
          featurePresets={settings.featurePresets}
        />
      ) : null,
    gallery: <Gallery gallery={content.gallery} labels={labels} />,
    wide_images: <WideImages images={content.wide_images} />,
    videos: <Videos videos={content.videos} labels={labels} />,
    contact: (
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
    ),
  };

  return (
    <main className="bg-background" style={brandStyle}>
      <Hero hero={content.hero} settings={settings} lang={lang} />
      {orderedSectionKeys(content).map((key) =>
        isSectionHidden(content, key) ? null : <Fragment key={key}>{nodes[key]}</Fragment>,
      )}
    </main>
  );
}

