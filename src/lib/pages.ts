import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { compressImage } from "@/lib/image-compress";
import { SEED_PAGES } from "@/lib/seed/montefiore-allenby";
import {
  READING_LANGS,
  normalizeSeo,
  hasText,
  type Media,
  type Page,
  type PageContent,
  type PageSeo,
  type PageStatus,
  type ReadingLang,
  type SeoFields,
} from "@/types/page";

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
  if (!isSupabaseConfigured) return null;
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

/* ============================================================
 * SLICE 2 — admin editor data layer
 * ============================================================ */

export type PageListItem = {
  id: string;
  slug: string;
  title: string;
  status: PageStatus;
  updated_at: string;
};

export type SavePageInput = {
  id?: string;
  slug: string;
  source_lang: string;
  status: PageStatus;
  content: PageContent;
  seo: PageSeo;
};

export const PAGE_MEDIA_BUCKET = "page-media";
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // ~10MB
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Build an empty PageContent matching the schema exactly. */
export function emptyPageContent(): PageContent {
  return {
    hero: { kicker: "", title: "", subtitle: "", price: "", cta_label: "" },
    stats: [],
    location: { heading: "", text: "", map_query: "" },
    about: { heading: "", body: "", features: [] },
    gallery: [],
    units: [],
    videos: [],
    contact: { heading: "" },
  };
}

export function emptySeo(): PageSeo {
  return {};
}

/** Normalize a slug to lowercase-hyphen-no-special-chars. */
export function normalizeSlug(input: string): string {
  return input
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // drop special chars
    .replace(/[\s_]+/g, "-") // spaces/underscores -> hyphen
    .replace(/-+/g, "-") // collapse hyphens
    .replace(/^-+|-+$/g, ""); // trim leading/trailing hyphens
}

/** Extract the 11-char YouTube id from any common URL shape (or bare id). */
export function extractYouTubeId(input: string): string | null {
  if (!input) return null;
  const raw = input.trim();
  // Bare id
  if (/^[A-Za-z0-9_-]{11}$/.test(raw)) return raw;
  const patterns = [
    /(?:youtube\.com\/watch\?[^#]*?\bv=)([A-Za-z0-9_-]{11})/,
    /(?:youtu\.be\/)([A-Za-z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/,
  ];
  for (const re of patterns) {
    const m = raw.match(re);
    if (m) return m[1];
  }
  return null;
}

/** List pages for the admin table. */
export async function listPages(): Promise<PageListItem[]> {
  const { data, error } = await supabase
    .from("pages")
    .select("id, slug, status, content, updated_at")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? [])
    .filter((row) => row.slug !== TEMPLATE_SETTINGS_SLUG)
    .map((row) => {
    const content = (row.content ?? {}) as PageContent;
    return {
      id: row.id as string,
      slug: row.slug as string,
      title: content?.hero?.title?.trim() || (row.slug as string),
      status: row.status as PageStatus,
      updated_at: row.updated_at as string,
    };
  });
}

/** Load a single page (any status) by id for editing. */
export async function fetchPageById(id: string): Promise<Page | null> {
  const { data, error } = await supabase
    .from("pages")
    .select("id, slug, status, source_lang, content, seo")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return (data as Page) ?? null;
}

/** True when the slug already belongs to another page. */
export async function isSlugTaken(slug: string, excludeId?: string): Promise<boolean> {
  let query = supabase.from("pages").select("id").eq("slug", slug);
  if (excludeId) query = query.neq("id", excludeId);
  const { data, error } = await query.limit(1);
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

/** Remove empty optional fields so nothing renders placeholder text. */
export function cleanContent(content: PageContent): PageContent {
  const t = (v?: string) => (v ?? "").trim();
  const keepText = (v?: string) => {
    const s = t(v);
    return s.length > 0 ? s : undefined;
  };

  const hero = {
    kicker: keepText(content.hero.kicker),
    title: t(content.hero.title),
    subtitle: keepText(content.hero.subtitle),
    price: keepText(content.hero.price),
    cta_label: keepText(content.hero.cta_label),
    background: content.hero.background?.url ? content.hero.background : undefined,
  };

  const stats = (content.stats ?? [])
    .map((s) => ({ value: t(s.value), label: t(s.label), icon: keepText(s.icon) }))
    .filter((s) => s.value || s.label);

  const location =
    content.location &&
    (keepText(content.location.heading) ||
      keepText(content.location.text) ||
      keepText(content.location.map_query))
      ? {
          heading: keepText(content.location.heading),
          text: keepText(content.location.text),
          map_query: keepText(content.location.map_query),
        }
      : undefined;

  const aboutFeatures = (content.about?.features ?? []).map(t).filter(Boolean);
  const aboutIcons = (content.about?.feature_icons ?? []).slice(0, aboutFeatures.length);
  const about =
    content.about &&
    (keepText(content.about.heading) ||
      keepText(content.about.body) ||
      aboutFeatures.length > 0)
      ? {
          heading: keepText(content.about.heading),
          body: keepText(content.about.body),
          features: aboutFeatures.length ? aboutFeatures : undefined,
          feature_icons: aboutIcons.some((x) => x) ? aboutIcons : undefined,
        }
      : undefined;

  const gallery = (content.gallery ?? []).filter((m) => t(m.url));

  const units = (content.units ?? [])
    .filter((u) => t(u.name) || u.image?.url)
    .map((u) => {
      const feats = (u.features ?? []).map(t).filter(Boolean);
      return {
        name: t(u.name),
        floor: keepText(u.floor),
        orientation: keepText(u.orientation),
        rooms: keepText(u.rooms),
        area_m2: keepText(u.area_m2),
        balcony_m2: keepText(u.balcony_m2),
        parking: keepText(u.parking),
        description: keepText(u.description),
        price: keepText(u.price),
        image: u.image?.url ? u.image : undefined,
        features: feats.length ? feats : undefined,
      };
    });

  const videos = (content.videos ?? []).filter((v) => t(v.youtube_id));

  const contact =
    content.contact && keepText(content.contact.heading)
      ? { heading: keepText(content.contact.heading) }
      : undefined;

  return { hero, stats, location, about, gallery, units, videos, contact };
}

function cleanSeo(seo: PageSeo, sourceLang: string): PageSeo {
  const t = (v?: string) => {
    const s = (v ?? "").trim();
    return s.length ? s : undefined;
  };
  // Migrate any legacy flat fields into per-language, then trim every field.
  const norm = normalizeSeo(seo, sourceLang);
  const out: PageSeo = {};
  for (const l of READING_LANGS) {
    const f = norm[l];
    if (!f) continue;
    const cleaned: SeoFields = {
      meta_title: t(f.meta_title),
      meta_description: t(f.meta_description),
      canonical: t(f.canonical),
      og_title: t(f.og_title),
      og_description: t(f.og_description),
      og_image: t(f.og_image),
    };
    // Keep the language only if something remains.
    if (Object.values(cleaned).some((x) => x !== undefined)) out[l] = cleaned;
  }
  return out;
}

/** Insert (new) or update (existing) a page as a draft-capable record. */
export async function savePage(input: SavePageInput): Promise<Page> {
  const content = cleanContent(input.content);
  const seo = cleanSeo(input.seo, input.source_lang);

  if (input.id) {
    const { data, error } = await supabase
      .from("pages")
      .update({
        slug: input.slug,
        source_lang: input.source_lang,
        status: input.status,
        content,
        seo,
      })
      .eq("id", input.id)
      .select("id, slug, status, source_lang, content, seo")
      .single();
    if (error) throw error;
    return data as Page;
  }

  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("pages")
    .insert({
      slug: input.slug,
      source_lang: input.source_lang,
      status: input.status,
      content,
      seo,
      created_by: userData.user?.id ?? null,
    })
    .select("id, slug, status, source_lang, content, seo")
    .single();
  if (error) throw error;
  return data as Page;
}

/** Upload an image to page-media and return a Media object with the public URL. */
export async function uploadPageMedia(file: File, slug: string): Promise<Media> {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    throw new Error("Unsupported file type. Use JPG, PNG or WEBP.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("File is too large (max 10MB).");
  }
  // Auto-compress before upload so served images load fast without quality loss.
  const compressed = await compressImage(file);
  file = compressed;
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const folder = slug || `tmp-${crypto.randomUUID()}`;
  const path = `${folder}/${crypto.randomUUID()}-${safeName}`;

  const { error } = await supabase.storage
    .from(PAGE_MEDIA_BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: false });
  if (error) throw error;

  const { data } = supabase.storage.from(PAGE_MEDIA_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, alt: "" };
}

/** Delete a previously uploaded object from storage (best-effort). */
export async function removePageMedia(url: string): Promise<void> {
  const marker = `/${PAGE_MEDIA_BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return; // not a managed object (e.g. seed placeholder)
  const path = decodeURIComponent(url.slice(idx + marker.length));
  const { error } = await supabase.storage.from(PAGE_MEDIA_BUCKET).remove([path]);
  if (error) console.warn("[pages] failed to remove storage object:", error);
}

/* ============================================================
 * SLICE 5 — public home listing
 * ============================================================ */

export type PublishedCard = {
  slug: string;
  title: string;
  location?: string;
  priceFrom?: string;
  cover?: string;
};

function toCard(page: Page): PublishedCard {
  const c = page.content;
  const cover =
    c.gallery?.find((m) => hasText(m.url))?.url ??
    c.units?.find((u) => hasText(u.image?.url))?.image?.url;
  // price-from: hero price, else cheapest-looking unit price (first non-empty).
  const priceFrom = hasText(c.hero.price)
    ? c.hero.price
    : c.units?.find((u) => hasText(u.price))?.price;
  return {
    slug: page.slug,
    title: c.hero.title?.trim() || page.slug,
    location: hasText(c.location?.heading) ? c.location!.heading : undefined,
    priceFrom: priceFrom || undefined,
    cover: cover || undefined,
  };
}

/** Published pages for the public home grid (anon-readable). */
export async function listPublishedPages(): Promise<PublishedCard[]> {
  if (!isSupabaseConfigured) {
    return Object.values(SEED_PAGES)
      .filter((p) => p.status === "published")
      .map(toCard);
  }
  try {
    const { data, error } = await supabase
      .from("pages")
      .select("id, slug, status, source_lang, content, seo")
      .eq("status", "published")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row) => toCard(row as Page));
  } catch (err) {
    console.warn("[pages] published list falling back to seed:", err);
    return Object.values(SEED_PAGES)
      .filter((p) => p.status === "published")
      .map(toCard);
  }
}

/* ============================================================
 * SLICE 6 — publish flow
 * ============================================================ */

/** Minimal publish validation. Returns an error message or null when valid. */
export async function validateForPublish(input: {
  id?: string;
  slug: string;
  title: string;
}): Promise<string | null> {
  if (!input.slug?.trim()) return "A slug is required before publishing.";
  if (!input.title?.trim()) return "Hero title is required before publishing.";
  const taken = await isSlugTaken(input.slug, input.id);
  if (taken) return "This slug is already used by another page.";
  return null;
}

/** Flip a page's status (publish/unpublish). Returns the new status. */
export async function setPageStatus(
  id: string,
  status: PageStatus,
): Promise<PageStatus> {
  const { data, error } = await supabase
    .from("pages")
    .update({ status })
    .eq("id", id)
    .select("status")
    .single();
  if (error) throw error;
  return data.status as PageStatus;
}
