import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { TEMPLATE_SETTINGS_SLUG } from "@/lib/template-settings";
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
  type PageCategory,
  type PageStatus,
  type ReadingLang,
  type SeoFields,
} from "@/types/page";


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
    category: "apartment",
    hero: {
      kicker: "",
      kicker_i18n: {},
      title: "",
      subtitle: "",
      price: "",
      cta_label: "",
      cta_label_i18n: {},
    },
    stats: [],
    location: { heading: "", text: "", map_query: "" },
    about: { heading: "", body: "", features: [] },
    gallery: [],
    wide_images: [],
    units: [],
    apartment: { name: "", unit_type: "apartment" },
    apartment_image_side: "right",
    videos: [],
    contact: { heading: "", heading_i18n: {} },
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
  // Keep only locales that hold a non-empty value; drop the map if all empty.
  const cleanI18n = (
    map?: Partial<Record<ReadingLang, string>>,
  ): Partial<Record<ReadingLang, string>> | undefined => {
    if (!map) return undefined;
    const out: Partial<Record<ReadingLang, string>> = {};
    for (const l of READING_LANGS) {
      const s = keepText(map[l]);
      if (s) out[l] = s;
    }
    return Object.keys(out).length ? out : undefined;
  };

  const hero = {
    kicker: keepText(content.hero.kicker),
    kicker_i18n: cleanI18n(content.hero.kicker_i18n),
    title: t(content.hero.title),
    subtitle: keepText(content.hero.subtitle),
    price: keepText(content.hero.price),
    cta_label: keepText(content.hero.cta_label),
    cta_label_i18n: cleanI18n(content.hero.cta_label_i18n),
    background: content.hero.background?.url ? content.hero.background : undefined,
    overlay: content.hero.background?.url ? content.hero.overlay : undefined,
  };

  // Reusable per-type data cleaners (shared by base fields and extra_sections).
  const cleanStatsData = (arr?: import("@/types/page").Stat[]) =>
    (arr ?? [])
      .map((s) => ({
        value: t(s.value),
        label: t(s.label),
        icon: keepText(s.icon),
        color: keepText(s.color),
      }))
      .filter((s) => s.value || s.label);
  const cleanMediaData = (arr?: Media[]) => (arr ?? []).filter((m) => t(m.url));
  const cleanVideosData = (arr?: import("@/types/page").Video[]) =>
    (arr ?? []).filter((v) => t(v.youtube_id));
  const cleanAboutData = (a?: import("@/types/page").AboutData) => {
    const features = (a?.features ?? []).map(t).filter(Boolean);
    const icons = (a?.feature_icons ?? []).slice(0, features.length);
    const colors = (a?.feature_colors ?? []).slice(0, features.length);
    const background = a?.background?.url ? a.background : undefined;
    if (
      !a ||
      !(keepText(a.heading) || keepText(a.body) || features.length > 0 || background)
    )
      return undefined;
    return {
      heading: keepText(a.heading),
      body: keepText(a.body),
      features: features.length ? features : undefined,
      feature_icons: icons.some((x) => x) ? icons : undefined,
      feature_colors: colors.some((x) => x) ? colors : undefined,
      background,
      overlay: background ? a.overlay : undefined,
    };
  };

  const stats = cleanStatsData(content.stats);


  const locName_i18n = (() => {
    const src = content.location?.name_i18n;
    if (!src) return undefined;
    const out: Partial<Record<ReadingLang, string>> = {};
    for (const l of READING_LANGS) {
      const v = keepText(src[l]);
      if (v) out[l] = v;
    }
    return Object.keys(out).length ? out : undefined;
  })();

  const location =
    content.location &&
    (keepText(content.location.heading) ||
      keepText(content.location.text) ||
      keepText(content.location.map_query) ||
      locName_i18n)
      ? {
          heading: keepText(content.location.heading),
          text: keepText(content.location.text),
          map_query: keepText(content.location.map_query),
          name_i18n: locName_i18n,
        }
      : undefined;

  const about = cleanAboutData(content.about);


  const gallery = cleanMediaData(content.gallery);

  // Migrate legacy text in numeric fields to a bare number string.
  // "1er étage" -> "1", "6ème étage" -> "6", "RDC"/"rez-de-chaussée" -> "0",
  // "2 pièces" -> "2", "61 m²" -> "61", "50,7" -> "50.7". No number -> undefined.
  const sanitizeNumber = (v?: string, opts?: { floor?: boolean }): string | undefined => {
    const s = (v ?? "").trim();
    if (!s) return undefined;
    if (opts?.floor && /(^|\b)(rdc|rez[- ]?de[- ]?chauss)/i.test(s)) return "0";
    const m = s.replace(",", ".").match(/-?\d+(\.\d+)?/);
    return m ? m[0] : undefined;
  };
  // Migrate legacy parking text to a dictionary code.
  const sanitizeParking = (v?: string): string | undefined => {
    const s = (v ?? "").trim();
    if (!s) return undefined;
    if (s === "one" || s === "none") return s;
    if (/sans|aucun|none|ללא|^0$/i.test(s)) return "none";
    if (/place|parking|חני|space|^[1-9]/i.test(s)) return "one";
    return s;
  };

  // Clean flexible detail rows (specs). Keep rows with a value, or preset-linked.
  const cleanSpecRows = (
    rows?: import("@/types/page").DetailRow[],
  ): import("@/types/page").DetailRow[] | undefined => {
    const out = (rows ?? [])
      .map((r) => ({
        presetKey: keepText(r.presetKey),
        linked: r.linked === false ? false : undefined,
        label: r.linked === false ? keepText(r.label) : undefined,
        icon: r.linked === false ? keepText(r.icon) : undefined,
        color: keepText(r.color),
        value: keepText(r.value),
      }))
      .filter((r) => r.value || (r.presetKey && r.linked !== false));
    return out.length ? out : undefined;
  };
  // Clean feature rows. Keep rows with text, or preset-linked (text from preset).
  const cleanFeatureRows = (
    rows?: import("@/types/page").DetailRow[],
  ): import("@/types/page").DetailRow[] | undefined => {
    const out = (rows ?? [])
      .map((r) => ({
        presetKey: keepText(r.presetKey),
        linked: r.linked === false ? false : undefined,
        icon: keepText(r.icon),
        color: keepText(r.color),
        value: keepText(r.value),
      }))
      .filter((r) => r.value || (r.presetKey && r.linked !== false));
    return out.length ? out : undefined;
  };

  // Clean a single unit/apartment block (shared by units list and apartment).
  const cleanUnit = (u: import("@/types/page").Unit) => {
    const specs = cleanSpecRows(u.specs);
    const featureRows = cleanFeatureRows(u.featureRows);
    return {
      name: t(u.name),
      unit_type: u.unit_type,
      unit_number: keepText(u.unit_number),
      description: keepText(u.description),
      price: keepText(u.price),
      image: u.image?.url ? u.image : undefined,
      attachment: u.attachment?.url ? u.attachment : undefined,
      specs,
      featureRows,
      // Legacy fixed fields are only retained when the row model isn't in use.
      floor: specs ? undefined : sanitizeNumber(u.floor, { floor: true }),
      orientation: specs ? undefined : keepText(u.orientation),
      rooms: specs ? undefined : sanitizeNumber(u.rooms),
      area_m2: specs ? undefined : sanitizeNumber(u.area_m2),
      balcony_m2: specs ? undefined : sanitizeNumber(u.balcony_m2),
      parking: specs ? undefined : sanitizeParking(u.parking),
      features: featureRows ? undefined : (u.features ?? []).map(t).filter(Boolean),
    };
  };

  const category: PageContent["category"] =
    content.category === "project" ? "project" : "apartment";
  const isProject = category === "project";

  // Units only exist on project pages; the single apartment only on apartment pages.
  const units = isProject
    ? (content.units ?? []).filter((u) => t(u.name) || u.image?.url || u.unit_type).map(cleanUnit)
    : [];

  const apartment =
    !isProject && content.apartment
      ? cleanUnit({ ...content.apartment, unit_type: content.apartment.unit_type ?? "apartment" })
      : undefined;
  const apartment_image_side = content.apartment_image_side === "left" ? "left" : "right";
  const apartment_title = !isProject ? keepText(content.apartment_title) : undefined;
  const apartment_title_icon = !isProject ? keepText(content.apartment_title_icon) : undefined;
  const apartment_title_color = !isProject ? keepText(content.apartment_title_color) : undefined;

  const videos = cleanVideosData(content.videos);
  const wide_images = cleanMediaData(content.wide_images);

  const contactHeadingI18n = cleanI18n(content.contact?.heading_i18n);
  const contact =
    content.contact && (keepText(content.contact.heading) || contactHeadingI18n)
      ? { heading: keepText(content.contact.heading), heading_i18n: contactHeadingI18n }
      : undefined;

  // Preserve media layout presets for the base sections.
  const gallery_layout = keepText(content.gallery_layout);
  const wide_images_layout = keepText(content.wide_images_layout);

  // Clean duplicated section instances with the same per-type logic as bases.
  const DUPLICABLE = ["about", "gallery", "wide_images", "videos", "stats"];
  const cleanedExtras = (content.extra_sections ?? [])
    .map((e) => {
      if (!e || typeof e.id !== "string" || !e.id.trim()) return null;
      if (!DUPLICABLE.includes(e.type)) return null;
      let data: import("@/types/page").ExtraSectionData | undefined;
      switch (e.type) {
        case "about": {
          data = cleanAboutData(e.data as import("@/types/page").AboutData);
          break;
        }
        case "gallery":
        case "wide_images": {
          const media = cleanMediaData(e.data as Media[]);
          data = media.length ? media : undefined;
          break;
        }
        case "videos": {
          const vids = cleanVideosData(e.data as import("@/types/page").Video[]);
          data = vids.length ? vids : undefined;
          break;
        }
        case "stats": {
          const st = cleanStatsData(e.data as import("@/types/page").Stat[]);
          data = st.length ? st : undefined;
          break;
        }
      }
      if (!data) return null;
      const layout = keepText(e.layout);
      return { id: e.id, type: e.type, data, ...(layout ? { layout } : {}) };
    })
    .filter(Boolean) as import("@/types/page").ExtraSection[];
  const extra_sections = cleanedExtras.length ? cleanedExtras : undefined;


  return {
    category,
    hero,
    stats,
    location,
    about,
    gallery,
    gallery_layout,
    wide_images,
    wide_images_layout,
    extra_sections,
    units,
    apartment,
    apartment_image_side,
    apartment_title,
    apartment_title_icon,
    apartment_title_color,
    videos,
    contact,
    section_order: content.section_order?.length ? content.section_order : undefined,
    hidden_sections: content.hidden_sections?.length ? content.hidden_sections : undefined,
  };
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
  return uploadToBucket(file, slug);
}

export const ACCEPTED_ATTACHMENT_TYPES = [...ACCEPTED_IMAGE_TYPES, "application/pdf"];

/** Upload a unit floor-plan file: image (compressed) or PDF (as-is). */
export async function uploadUnitAttachment(
  file: File,
  slug: string,
): Promise<{ url: string; type: "image" | "pdf" }> {
  if (!ACCEPTED_ATTACHMENT_TYPES.includes(file.type)) {
    throw new Error("Unsupported file type. Use JPG, PNG, WEBP or PDF.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("File is too large (max 10MB).");
  }
  const isPdf = file.type === "application/pdf";
  const toUpload = isPdf ? file : await compressImage(file);
  const media = await uploadToBucket(toUpload, slug);
  return { url: media.url, type: isPdf ? "pdf" : "image" };
}

async function uploadToBucket(file: File, slug: string): Promise<Media> {
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
  category: PageCategory;
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
    category: c.category === "project" ? "project" : "apartment",
  };
}

/** Published pages for the public listing grids (anon-readable). */
export async function listPublishedPages(category?: PageCategory): Promise<PublishedCard[]> {
  const byCategory = (cards: PublishedCard[]) =>
    category ? cards.filter((c) => c.category === category) : cards;

  if (!isSupabaseConfigured) {
    return byCategory(
      Object.values(SEED_PAGES)
        .filter((p) => p.status === "published")
        .map(toCard),
    );
  }
  try {
    const { data, error } = await supabase
      .from("pages")
      .select("id, slug, status, source_lang, content, seo")
      .eq("status", "published")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return byCategory(
      (data ?? [])
        .filter((row) => row.slug !== TEMPLATE_SETTINGS_SLUG)
        .map((row) => toCard(row as Page)),
    );
  } catch (err) {
    console.warn("[pages] published list falling back to seed:", err);
    return byCategory(
      Object.values(SEED_PAGES)
        .filter((p) => p.status === "published")
        .map(toCard),
    );
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

/** Flip a page's status (publish/unpublish/archive/restore). Returns the new status. */
export async function setPageStatus(id: string, status: PageStatus): Promise<PageStatus> {
  const { data, error } = await supabase
    .from("pages")
    .update({ status })
    .eq("id", id)
    .select("status")
    .single();
  if (error) throw error;
  return data.status as PageStatus;
}

/** Permanently delete a page and its translations. Irreversible. */
export async function deletePage(id: string): Promise<void> {
  const { error } = await supabase.from("pages").delete().eq("id", id);
  if (error) throw error;
}

/** Find a free "<slug>-copy[-N]" slug (max 20 attempts). */
async function findCopySlug(baseSlug: string): Promise<string> {
  const first = `${baseSlug}-copy`;
  if (!(await isSlugTaken(first))) return first;
  for (let n = 2; n <= 20; n++) {
    const candidate = `${baseSlug}-copy-${n}`;
    if (!(await isSlugTaken(candidate))) return candidate;
  }
  throw new Error("Could not find a free slug for the copy. Rename the original first.");
}

/**
 * Duplicate a whole page (content + all translations) as a fresh draft.
 * Returns the new page id. Leads/analytics are never copied.
 */
export async function duplicatePage(id: string): Promise<string> {
  // Fetch the full source row so page-level columns (e.g. category) copy as-is.
  const { data: source, error: srcErr } = await supabase
    .from("pages")
    .select("*")
    .eq("id", id)
    .single();
  if (srcErr) throw srcErr;
  if (!source) throw new Error("Source page not found.");

  const src = source as Record<string, unknown>;
  const baseSlug = normalizeSlug(String(src.slug ?? "")) || "page";
  const newSlug = await findCopySlug(baseSlug);

  // Deep copy the ENTIRE content jsonb, then suffix the admin/list title.
  const content = structuredClone(src.content ?? {}) as PageContent;
  if (content.hero) {
    content.hero.title = `${(content.hero.title ?? "").trim()} (copy)`.trim();
  }

  // Build the insert from all source columns, overriding the ones that must change.
  const insertRow: Record<string, unknown> = { ...src };
  delete insertRow.id;
  delete insertRow.created_at;
  delete insertRow.updated_at;

  const { data: userData } = await supabase.auth.getUser();
  insertRow.slug = newSlug;
  insertRow.status = "draft";
  insertRow.content = content;
  insertRow.created_by = userData.user?.id ?? null;

  const { data: created, error: insErr } = await supabase
    .from("pages")
    .insert(insertRow)
    .select("id")
    .single();
  if (insErr) throw insErr;
  const newId = (created as { id: string }).id;

  // Copy all translation rows to the new page. Roll back the page on failure.
  try {
    const { data: translations, error: trErr } = await supabase
      .from("page_translations")
      .select("lang, content")
      .eq("page_id", id);
    if (trErr) throw trErr;

    if (translations && translations.length) {
      const rows = translations.map((t) => ({
        page_id: newId,
        lang: (t as { lang: string }).lang,
        content: (t as { content: unknown }).content,
      }));
      const { error: copyErr } = await supabase.from("page_translations").insert(rows);
      if (copyErr) throw copyErr;
    }
  } catch (err) {
    // Avoid half-duplicated pages: remove the just-created page row.
    await supabase.from("pages").delete().eq("id", newId);
    throw err;
  }

  return newId;
}

