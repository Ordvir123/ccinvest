import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { normalizeSearch, type PublishedCard } from "@/lib/pages";
import { ProjectCard } from "@/components/site/ProjectCard";

export type ListingSearch = { q?: string; price?: PriceBand; sort?: SortKey };
export type PriceBand = "u3" | "3-5" | "5-8" | "8p";
export type SortKey = "new" | "asc" | "desc";

const BANDS: { id: PriceBand; min: number; max: number; label: string }[] = [
  { id: "u3", min: 0, max: 3_000_000, label: "< 3M ₪" },
  { id: "3-5", min: 3_000_000, max: 5_000_000, label: "3–5M ₪" },
  { id: "5-8", min: 5_000_000, max: 8_000_000, label: "5–8M ₪" },
  { id: "8p", min: 8_000_000, max: Infinity, label: "8M+ ₪" },
];

/** Validates ?q=&price=&sort= for the listing routes. */
export function validateListingSearch(s: Record<string, unknown>): ListingSearch {
  const out: ListingSearch = {};
  if (typeof s.q === "string" && s.q.trim()) out.q = s.q.slice(0, 80);
  if (BANDS.some((b) => b.id === s.price)) out.price = s.price as PriceBand;
  if (s.sort === "asc" || s.sort === "desc") out.sort = s.sort;
  return out;
}

const T = {
  fr: {
    search: "Rechercher une rue, un quartier…",
    price: "Prix",
    any: "Tous",
    sort: "Trier",
    new: "Plus récents",
    asc: "Prix croissant",
    desc: "Prix décroissant",
    count: (n: number) => (n === 1 ? "1 bien" : `${n} biens`),
    none: "Aucun bien ne correspond à votre recherche.",
    reset: "Effacer les filtres",
  },
  he: {
    search: "חיפוש רחוב, שכונה…",
    price: "מחיר",
    any: "הכל",
    sort: "מיון",
    new: "החדשים ביותר",
    asc: "מחיר עולה",
    desc: "מחיר יורד",
    count: (n: number) => (n === 1 ? "נכס אחד" : `${n} נכסים`),
    none: "אין נכסים שמתאימים לחיפוש.",
    reset: "ניקוי הסינון",
  },
  en: {
    search: "Search a street, a neighbourhood…",
    price: "Price",
    any: "All",
    sort: "Sort",
    new: "Newest",
    asc: "Price: low to high",
    desc: "Price: high to low",
    count: (n: number) => (n === 1 ? "1 property" : `${n} properties`),
    none: "No property matches your search.",
    reset: "Clear filters",
  },
};

/**
 * Search, price bands and sort over a listing grid. State lives in the URL
 * (?q=&price=&sort=) so a filtered list can be shared as a link.
 */
export function ListingBrowser({
  items,
  search,
  onSearchChange,
}: {
  items: PublishedCard[];
  search: ListingSearch;
  onSearchChange: (next: ListingSearch) => void;
}) {
  const { i18n } = useTranslation();
  const t = T[(i18n.language?.slice(0, 2) as keyof typeof T) || "fr"] ?? T.fr;

  // Typing updates the list at once; the URL follows after a short pause.
  const [text, setText] = useState(search.q ?? "");
  // Follow the URL (back button, "clear"), without fighting the user's own typing.
  useEffect(() => {
    setText((cur) => ((search.q ?? "") === cur.trim() ? cur : search.q ?? ""));
  }, [search.q]);
  useEffect(() => {
    if ((search.q ?? "") === text.trim()) return;
    const id = setTimeout(() => onSearchChange({ ...search, q: text.trim() || undefined }), 350);
    return () => clearTimeout(id);
  }, [text, search, onSearchChange]);

  const results = useMemo(() => {
    const words = normalizeSearch(text).split(/\s+/).filter(Boolean);
    const band = BANDS.find((b) => b.id === search.price);
    const list = items.filter((p) => {
      if (words.length && !words.every((w) => p.searchText.includes(w))) return false;
      if (band) {
        const v = p.priceValue;
        if (v === undefined || v < band.min || v >= band.max) return false;
      }
      return true;
    });
    if (search.sort === "asc" || search.sort === "desc") {
      const dir = search.sort === "asc" ? 1 : -1;
      // Pages without a price go last either way.
      list.sort((a, b) => {
        if (a.priceValue === undefined) return 1;
        if (b.priceValue === undefined) return -1;
        return (a.priceValue - b.priceValue) * dir;
      });
    }
    return list;
  }, [items, text, search.price, search.sort]);

  const filtered = !!text.trim() || !!search.price || !!search.sort;
  const clear = () => {
    setText("");
    onSearchChange({});
  };

  const chip = (active: boolean) =>
    cn(
      "h-10 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors",
      active
        ? "border-primary bg-primary text-primary-foreground"
        : "border-border bg-card text-foreground hover:bg-secondary",
    );

  return (
    <>
      <div className="sticky top-16 z-30 -mx-5 mb-6 border-b border-border/50 bg-background/90 px-5 py-3 backdrop-blur-lg md:static md:mx-0 md:mb-8 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <label className="relative block md:w-80">
            <span className="sr-only">{t.search}</span>
            <Search className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t.search}
              className="h-12 w-full rounded-full border border-border bg-card ps-11 pe-10 text-base shadow-sm outline-none transition-shadow placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-cta [&::-webkit-search-cancel-button]:hidden"
            />
            {text && (
              <button
                type="button"
                onClick={() => setText("")}
                aria-label={t.reset}
                className="absolute end-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </label>

          <div className="flex min-w-0 flex-1 items-center gap-2">
          <div
            role="group"
            aria-label={t.price}
            className="-ms-5 flex min-w-0 flex-1 gap-2 overflow-x-auto ps-5 [scrollbar-width:none] md:ms-0 md:ps-0"
          >
            <button
              type="button"
              aria-pressed={!search.price}
              className={chip(!search.price)}
              onClick={() => onSearchChange({ ...search, price: undefined })}
            >
              {t.any}
            </button>
            {BANDS.map((b) => (
              <button
                key={b.id}
                type="button"
                aria-pressed={search.price === b.id}
                className={chip(search.price === b.id)}
                onClick={() =>
                  onSearchChange({ ...search, price: search.price === b.id ? undefined : b.id })
                }
              >
                <span dir="ltr">{b.label}</span>
              </button>
            ))}
          </div>

          <label className="shrink-0">
            <span className="sr-only">{t.sort}</span>
            <select
              value={search.sort ?? "new"}
              onChange={(e) =>
                onSearchChange({
                  ...search,
                  sort: e.target.value === "new" ? undefined : (e.target.value as SortKey),
                })
              }
              className="h-10 w-28 rounded-full border border-border bg-card px-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-cta md:w-auto md:px-4"
            >
              <option value="new">{t.new}</option>
              <option value="asc">{t.asc}</option>
              <option value="desc">{t.desc}</option>
            </select>
          </label>
          </div>
        </div>
      </div>

      <div className="mb-5 flex items-center justify-between gap-3 text-sm text-muted-foreground" aria-live="polite">
        <span>{t.count(results.length)}</span>
        {filtered && (
          <button type="button" onClick={clear} className="font-medium text-primary underline-offset-4 hover:underline">
            {t.reset}
          </button>
        )}
      </div>

      {results.length === 0 ? (
        <div className="rounded-3xl bg-secondary px-6 py-16 text-center">
          <p className="text-muted-foreground">{t.none}</p>
          <button
            type="button"
            onClick={clear}
            className="mt-5 h-11 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground"
          >
            {t.reset}
          </button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {results.map((p, i) => (
            <div
              key={p.slug}
              className="animate-rise"
              style={{ animationDelay: `${Math.min(i, 6) * 60}ms` }}
            >
              <ProjectCard project={p} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
