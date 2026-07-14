import { Fragment, useEffect, useState } from "react";
import { ChevronRight, FileText, EyeOff } from "lucide-react";
import {
  orderedSectionIds,
  isSectionHidden,
  sectionLabel,
  getSectionData,
  getSectionLayout,
  getSectionType,
  effectiveLayout,
  layoutGroupSize,
  isCarouselLayout,
  carouselShowsArrows,
  carouselShowsDots,
  type SectionKey,
} from "@/lib/page-sections";

import { cn } from "@/lib/utils";

import { getIcon, guessIcon } from "@/lib/page-icons";
import { heroOverlayStyle } from "@/lib/hero-overlay";
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
  type CarouselApi,
} from "@/components/ui/carousel";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  hasItems,
  hasText,
  type AboutData,
  type Media,
  type PageContent,
  type ReadingLang,
  type SpecPreset,
  type Stat,
  type Unit,
  type Video,
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
  const overlay = heroOverlayStyle(hero.overlay);
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
          {overlay ? (
            <div className="absolute inset-0" style={overlay} />
          ) : (
            <>
              {/* Dark overlay keeps hero text readable over any image. */}
              <div className="absolute inset-0 bg-gradient-overlay" />
              <div className="absolute inset-0 bg-[oklch(0.18_0.04_265/0.55)]" />
            </>
          )}
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

/** Split an array into consecutive groups of `size`. */
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * <img> that hides itself when the source fails to load (404, network error,
 * moved storage object, …). Prevents "broken image" placeholders from leaking
 * into published pages when a storage object goes missing.
 */
function SafeImg({
  onFail,
  ...rest
}: React.ImgHTMLAttributes<HTMLImageElement> & { onFail?: () => void }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <img
      {...rest}
      onError={(e) => {
        setFailed(true);
        onFail?.();
        rest.onError?.(e);
      }}
    />
  );
}

/** Single image cell, optionally clickable (gallery lightbox) and framed. */
function MediaCell({
  img,
  index,
  onClick,
  framed,
  aspect,
}: {
  img: Media;
  index: number;
  onClick?: (i: number) => void;
  framed: boolean;
  aspect?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  const image = (
    <SafeImg
      src={img.url}
      alt={img.alt ?? `Image ${index + 1}`}
      loading="lazy"
      onFail={() => setFailed(true)}
      className={cn(
        "block h-full w-full object-cover transition-transform duration-300",
        onClick && "hover:scale-[1.03]",
        aspect,
      )}
    />
  );
  const cls = cn("block h-full w-full overflow-hidden", framed && "rounded-lg border border-border");
  return onClick ? (
    <button type="button" onClick={() => onClick(index)} className={cls}>
      {image}
    </button>
  ) : (
    <div className={cls}>{image}</div>
  );
}

/**
 * Render a list of images using a layout preset. Strict patterns repeat in
 * groups; the caller (via `effectiveLayout`) guarantees the count fits the
 * preset, so no leftover-degradation logic is needed. Dir-aware presets
 * (asym-pair, one-large-two-stack, one-large-three-stack) place the large
 * image first in DOM order so it sits on the reading-start side automatically
 * (left in LTR, right in RTL).
 */
function MediaLayout({
  images,
  layout,
  framed,
  gap = "gap-4",
  onImageClick,
}: {
  images: Media[];
  layout: string;
  framed: boolean;
  gap?: string;
  onImageClick?: (i: number) => void;
}) {
  const cell = (img: Media, i: number, aspect?: string) => (
    <MediaCell key={i} img={img} index={i} onClick={onImageClick} framed={framed} aspect={aspect} />
  );

  // Full-width stack.
  if (layout === "stacked") {
    return <div className={cn("flex flex-col", gap)}>{images.map((img, i) => cell(img, i))}</div>;
  }

  // Uniform column grids — no grouping.
  if (layout === "grid-3" || layout === "grid-2") {
    const cols = layout === "grid-3" ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2";
    const aspect = layout === "grid-3" ? "aspect-[4/3]" : "aspect-video";
    return (
      <div className={cn("grid grid-cols-1", cols, gap)}>
        {images.map((img, i) => cell(img, i, aspect))}
      </div>
    );
  }

  // Masonry — natural image heights across CSS columns.
  if (layout === "masonry") {
    return (
      <div className={cn("columns-1 sm:columns-2 lg:columns-3", gap)}>
        {images.map((img, i) => (
          <div key={i} className={cn("mb-4 break-inside-avoid")}>
            {cell(img, i)}
          </div>
        ))}
      </div>
    );
  }

  const size = layoutGroupSize(layout);
  const groups = chunk(images, size);

  return (
    <div className={cn("flex flex-col", gap)}>
      {groups.map((g, gi) => {
        const base = gi * size;

        if (layout === "two-landscape" || layout === "two-portrait") {
          const aspect = layout === "two-portrait" ? "aspect-[3/4]" : "aspect-[4/3]";
          return (
            <div key={gi} className={cn("grid grid-cols-2", gap)}>
              {g.map((img, j) => cell(img, base + j, aspect))}
            </div>
          );
        }

        // asym-pair: 2/3 + 1/3, alternating the wide side each row (zigzag).
        if (layout === "asym-pair") {
          const wideFirst = gi % 2 === 0;
          return (
            <div key={gi} className={cn("grid grid-cols-3", gap)}>
              {wideFirst ? (
                <>
                  <div className="col-span-2">{cell(g[0], base, "aspect-[4/3]")}</div>
                  <div className="col-span-1">{cell(g[1], base + 1, "h-full")}</div>
                </>
              ) : (
                <>
                  <div className="col-span-1">{cell(g[0], base, "h-full")}</div>
                  <div className="col-span-2">{cell(g[1], base + 1, "aspect-[4/3]")}</div>
                </>
              )}
            </div>
          );
        }

        // one-large-two-stack: large on start side (dir-aware) + column of 2.
        if (layout === "one-large-two-stack") {
          return (
            <div key={gi} className={cn("grid md:grid-cols-2", gap)}>
              <div className="aspect-[4/3] md:aspect-auto">{cell(g[0], base, "h-full")}</div>
              <div className={cn("grid grid-rows-2", gap)}>
                {cell(g[1], base + 1, "h-full")}
                {cell(g[2], base + 2, "h-full")}
              </div>
            </div>
          );
        }

        if (layout === "two-top-one-wide") {
          return (
            <div key={gi} className={cn("flex flex-col", gap)}>
              <div className={cn("grid grid-cols-2", gap)}>
                {cell(g[0], base, "aspect-[4/3]")}
                {cell(g[1], base + 1, "aspect-[4/3]")}
              </div>
              {cell(g[2], base + 2, "aspect-video")}
            </div>
          );
        }

        if (layout === "one-wide-two-bottom") {
          return (
            <div key={gi} className={cn("flex flex-col", gap)}>
              {cell(g[0], base, "aspect-video")}
              <div className={cn("grid grid-cols-2", gap)}>
                {cell(g[1], base + 1, "aspect-[4/3]")}
                {cell(g[2], base + 2, "aspect-[4/3]")}
              </div>
            </div>
          );
        }

        // one-large-three-stack: large on start side (dir-aware) + column of 3.
        if (layout === "one-large-three-stack") {
          return (
            <div key={gi} className={cn("grid md:grid-cols-2", gap)}>
              <div className="aspect-[4/3] md:aspect-auto">{cell(g[0], base, "h-full")}</div>
              <div className={cn("grid grid-rows-3", gap)}>
                {cell(g[1], base + 1, "h-full")}
                {cell(g[2], base + 2, "h-full")}
                {cell(g[3], base + 3, "h-full")}
              </div>
            </div>
          );
        }

        if (layout === "one-wide-three-cols") {
          return (
            <div key={gi} className={cn("flex flex-col", gap)}>
              {cell(g[0], base, "aspect-video")}
              <div className={cn("grid grid-cols-3", gap)}>
                {cell(g[1], base + 1, "aspect-[4/3]")}
                {cell(g[2], base + 2, "aspect-[4/3]")}
                {cell(g[3], base + 3, "aspect-[4/3]")}
              </div>
            </div>
          );
        }

        if (layout === "two-over-three") {
          return (
            <div key={gi} className={cn("flex flex-col", gap)}>
              <div className={cn("grid grid-cols-2", gap)}>
                {cell(g[0], base, "aspect-[4/3]")}
                {cell(g[1], base + 1, "aspect-[4/3]")}
              </div>
              <div className={cn("grid grid-cols-3", gap)}>
                {cell(g[2], base + 2, "aspect-[4/3]")}
                {cell(g[3], base + 3, "aspect-[4/3]")}
                {cell(g[4], base + 4, "aspect-[4/3]")}
              </div>
            </div>
          );
        }

        if (layout === "one-wide-2x2") {
          return (
            <div key={gi} className={cn("flex flex-col", gap)}>
              {cell(g[0], base, "aspect-video")}
              <div className={cn("grid grid-cols-2", gap)}>
                {cell(g[1], base + 1, "aspect-[4/3]")}
                {cell(g[2], base + 2, "aspect-[4/3]")}
                {cell(g[3], base + 3, "aspect-[4/3]")}
                {cell(g[4], base + 4, "aspect-[4/3]")}
              </div>
            </div>
          );
        }

        // Unknown → full-width cells (defensive; effectiveLayout prevents this).
        return (
          <div key={gi} className={cn("flex flex-col", gap)}>
            {g.map((img, j) => cell(img, base + j))}
          </div>
        );
      })}
    </div>
  );
}


function Gallery({
  gallery,
  labels,
  layout,
}: {
  gallery: PageContent["gallery"];
  labels: Record<string, string>;
  layout?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  if (!hasItems(gallery)) return null;

  // No stored layout → keep the legacy carousel (pixel-identical). A stored
  // "carousel-*" value renders a configurable slider; any other stored value
  // renders as a CSS grid; unknown / non-fitting values fall back safely.
  const effective = layout === undefined ? undefined : effectiveLayout("gallery", layout, gallery.length);
  const useGrid = effective !== undefined && !isCarouselLayout(effective);
  const openLightbox = (i: number) => {
    setActive(i);
    setOpen(true);
  };

  return (
    <Section>
      <h2 className="mb-8 text-center text-3xl text-ink md:text-4xl">{labels.gallery}</h2>
      {useGrid ? (
        <div className="mx-auto w-full max-w-5xl">
          <MediaLayout
            images={gallery}
            layout={effective!}
            framed
            onImageClick={openLightbox}
          />
        </div>
      ) : isCarouselLayout(effective) ? (
        <GalleryCarousel
          gallery={gallery}
          showArrows={carouselShowsArrows(effective!)}
          showDots={carouselShowsDots(effective!)}
          onImageClick={openLightbox}
        />
      ) : (
        <Carousel opts={{ loop: true }} className="mx-auto w-full max-w-4xl">
          <CarouselContent>
            {gallery.map((img, i) => (
              <CarouselItem key={i} className="md:basis-2/3">
                <button
                  type="button"
                  onClick={() => openLightbox(i)}
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
      )}

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

/** Configurable single-slide gallery carousel (arrows / dots / both). */
function GalleryCarousel({
  gallery,
  showArrows,
  showDots,
  onImageClick,
}: {
  gallery: PageContent["gallery"];
  showArrows: boolean;
  showDots: boolean;
  onImageClick: (i: number) => void;
}) {
  const [api, setApi] = useState<CarouselApi>();
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setSelected(api.selectedScrollSnap());
    onSelect();
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  return (
    <div className="mx-auto w-full max-w-4xl">
      <Carousel opts={{ loop: true }} setApi={setApi} className="w-full">
        <CarouselContent>
          {gallery.map((img, i) => (
            <CarouselItem key={i}>
              <button
                type="button"
                onClick={() => onImageClick(i)}
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
        {showArrows && (
          <>
            <CarouselPrevious />
            <CarouselNext />
          </>
        )}
      </Carousel>
      {showDots && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {gallery.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to image ${i + 1}`}
              onClick={() => api?.scrollTo(i)}
              className={cn(
                "h-2 w-2 rounded-full transition-colors",
                i === selected ? "bg-ink" : "bg-muted-foreground/40 hover:bg-muted-foreground/70",
              )}
            />
          ))}
        </div>
      )}
    </div>
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
  const [planFailed, setPlanFailed] = useState(false);
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
        <SafeImg
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

        {plan?.url && plan.type === "image" && !planFailed && (
          <button
            type="button"
            onClick={() => setPlanOpen(true)}
            className="mt-4 block overflow-hidden rounded-md border border-border"
          >
            <SafeImg
              src={plan.url}
              alt={labels.floorPlan}
              loading="lazy"
              onFail={() => setPlanFailed(true)}
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
  const [planFailed, setPlanFailed] = useState(false);
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
function WideImages({
  images,
  layout,
}: {
  images?: PageContent["wide_images"];
  layout?: string;
}) {
  if (!hasItems(images)) return null;

  // Absent → legacy edge-to-edge stack (pixel-identical). Stored values resolve
  // to a fitting preset; "stacked" also renders as the edge-to-edge stack.
  const effective = layout === undefined ? "stacked" : effectiveLayout("wide_images", layout, images!.length);


  if (effective === "stacked") {
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

  return (
    <section className="w-full">
      <MediaLayout images={images!} layout={effective} framed={false} gap="gap-1" />
    </section>
  );
}

/**
 * Public "About" section: heading, multi-paragraph body (split on blank lines),
 * and a features grid with per-feature icons. RTL is inherited from the page
 * `dir`, so no per-element direction handling is needed.
 */
function About({ about }: { about?: PageContent["about"] }) {
  if (!about) return null;
  const features = (about.features ?? []).filter((f) => hasText(f));
  const paragraphs = hasText(about.body)
    ? about.body!.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
    : [];
  if (!hasText(about.heading) && paragraphs.length === 0 && features.length === 0) {
    return null;
  }
  return (
    <Section>
      <div className="mx-auto max-w-3xl text-center">
        {hasText(about.heading) && (
          <h2 className="text-3xl text-ink md:text-4xl">{about.heading}</h2>
        )}
        {paragraphs.length > 0 && (
          <div className="mt-6 space-y-4">
            {paragraphs.map((p, i) => (
              <p key={i} className="text-lg leading-relaxed text-muted-foreground">
                {p}
              </p>
            ))}
          </div>
        )}
      </div>
      {features.length > 0 && (
        <ul className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => {
            const FIcon =
              getIcon(about.feature_icons?.[i]) ?? getIcon(guessIcon(f, "sparkles"));
            return (
              <li
                key={i}
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 text-start"
              >
                {FIcon && (
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <FIcon className="h-4 w-4" aria-hidden />
                  </span>
                )}
                <span className="text-sm font-medium text-foreground">{f}</span>
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}

/**
 * Preview-only wrapper: tags a rendered section with data-section-key, shows a
 * hover outline + name badge, dims hidden sections, and forwards clicks. Only
 * used inside the admin editor preview — never in the public page output.
 */
function PreviewSection({
  sectionId,
  label,
  hidden,
  onSelect,
  children,
}: {
  sectionId: string;
  label: string;
  hidden: boolean;
  onSelect?: (id: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div
      data-section-key={sectionId}
      onClick={() => onSelect?.(sectionId)}
      className={cn(
        "group/preview relative cursor-pointer",
        hidden && "opacity-40 grayscale",
      )}
    >
      {/* Hover outline */}
      <div className="pointer-events-none absolute inset-0 z-30 ring-inset ring-2 ring-transparent transition-colors group-hover/preview:ring-primary/70" />
      {/* Section-name badge on hover */}
      <div className="pointer-events-none absolute left-3 top-3 z-40 rounded-md bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground opacity-0 shadow transition-opacity group-hover/preview:opacity-100">
        {label}
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
  /** Called when a section instance is clicked in preview mode. */
  onSectionSelect?: (id: string) => void;
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

  // Resolve a section instance id to its rendered node. Base ids read the
  // existing content fields; duplicate ids read their extra_sections data.
  const renderById = (id: string): React.ReactNode => {
    const type = getSectionType(id);
    switch (type) {
      case "about":
        return <About about={getSectionData(content, id) as AboutData | undefined} />;
      case "stats":
        return <Stats stats={(getSectionData(content, id) as Stat[] | undefined) ?? []} />;
      case "gallery":
        return (
          <Gallery
            gallery={(getSectionData(content, id) as Media[] | undefined) ?? []}
            labels={labels}
            layout={getSectionLayout(content, id)}
          />
        );
      case "wide_images":
        return (
          <WideImages
            images={getSectionData(content, id) as Media[] | undefined}
            layout={getSectionLayout(content, id)}
          />
        );
      case "videos":
        return <Videos videos={getSectionData(content, id) as Video[] | undefined} labels={labels} />;
      case "location":
        return content.location &&
          (hasText(content.location.text) || hasText(content.location.map_query)) ? (
          <LocationBlock location={content.location} labels={labels} lang={lang} />
        ) : null;
      case "listing":
        return content.category === "project" ? (
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
        ) : null;
      case "contact":
        return (
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
        );
      default:
        return null;
    }
  };

  return (
    <main className="bg-background" style={brandStyle}>
      {/* Hero always renders first and is intentionally NOT part of the
          reorderable/hideable section list (absent from SectionKey/SectionManager). */}
      <Hero hero={content.hero} settings={settings} lang={lang} />
      {orderedSectionIds(content).map((id) => {
        const hidden = isSectionHidden(content, id);
        if (!preview) {
          return hidden ? null : <Fragment key={id}>{renderById(id)}</Fragment>;
        }
        return (
          <PreviewSection
            key={id}
            sectionId={id}
            label={sectionLabel(content, id)}
            hidden={hidden}
            onSelect={onSectionSelect}
          >
            {renderById(id)}
          </PreviewSection>
        );
      })}
    </main>

  );
}

