import { supabase } from "@/integrations/supabase/client";
import { translatePageContent } from "@/lib/translate-page.functions";
import type { PageContent, ReadingLang } from "@/types/page";

/* ============================================================
 * Stable source hash — MUST match the edge function's canonicalJson + sha256.
 * ============================================================ */
function canonicalJson(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  if (typeof value === "object") {
    const keys = Object.keys(value as Record<string, unknown>).sort();
    return (
      "{" +
      keys
        .map((k) => JSON.stringify(k) + ":" + canonicalJson((value as Record<string, unknown>)[k]))
        .join(",") +
      "}"
    );
  }
  return JSON.stringify(value);
}

export async function sourceHash(content: PageContent): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonicalJson(content)),
  );
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* ============================================================
 * Translatable field enumeration (dot-paths).
 * Numbers/prices/areas, URLs, youtube_id, map_query are intentionally excluded.
 * ============================================================ */
export type TransField = { path: string; label: string; source: string };

export function listTranslatableFields(c: PageContent): TransField[] {
  const out: TransField[] = [];
  const push = (path: string, label: string, v?: string) => {
    if (v && v.trim()) out.push({ path, label, source: v });
  };

  // hero.kicker and hero.cta_label are authored per-locale (kicker_i18n /
  // cta_label_i18n) — not machine-translated here.
  push("hero.title", "Hero · Title", c.hero?.title);
  push("hero.subtitle", "Hero · Subtitle", c.hero?.subtitle);

  (c.stats ?? []).forEach((s, i) => push(`stats.${i}.label`, `Stat ${i + 1} · Label`, s.label));

  push("location.heading", "Location · Heading", c.location?.heading);
  push("location.text", "Location · Text", c.location?.text);

  push("about.heading", "About · Heading", c.about?.heading);
  push("about.body", "About · Body", c.about?.body);
  (c.about?.features ?? []).forEach((f, i) =>
    push(`about.features.${i}`, `About · Feature ${i + 1}`, f),
  );

  (c.gallery ?? []).forEach((m, i) => push(`gallery.${i}.alt`, `Gallery ${i + 1} · Alt`, m.alt));

  (c.units ?? []).forEach((u, i) => {
    // Free-text title fallback only; dictionary-driven type/number, numeric
    // attributes, orientation and parking codes are localized by the template.
    if (!u.unit_type) push(`units.${i}.name`, `Unit ${i + 1} · Name`, u.name);
    push(`units.${i}.description`, `Unit ${i + 1} · Description`, u.description);
    (u.features ?? []).forEach((f, j) =>
      push(`units.${i}.features.${j}`, `Unit ${i + 1} · Feature ${j + 1}`, f),
    );
    // Custom (unlinked) detail-row labels are the only translatable spec text.
    (u.specs ?? []).forEach((r, j) => {
      if (r.linked === false || !r.presetKey)
        push(`units.${i}.specs.${j}.label`, `Unit ${i + 1} · Detail ${j + 1} label`, r.label);
    });
    // Custom (unlinked) feature-row texts.
    (u.featureRows ?? []).forEach((r, j) => {
      if (r.linked === false || !r.presetKey)
        push(`units.${i}.featureRows.${j}.value`, `Unit ${i + 1} · Feature ${j + 1}`, r.value);
    });
  });

  // Single apartment block (apartment-type pages). Same logic as a unit.
  const apt = c.apartment;
  if (apt) {
    if (!apt.unit_type) push("apartment.name", "Apartment · Name", apt.name);
    push("apartment.description", "Apartment · Description", apt.description);
    (apt.features ?? []).forEach((f, j) =>
      push(`apartment.features.${j}`, `Apartment · Feature ${j + 1}`, f),
    );
    (apt.specs ?? []).forEach((r, j) => {
      if (r.linked === false || !r.presetKey)
        push(`apartment.specs.${j}.label`, `Apartment · Detail ${j + 1} label`, r.label);
    });
    (apt.featureRows ?? []).forEach((r, j) => {
      if (r.linked === false || !r.presetKey)
        push(`apartment.featureRows.${j}.value`, `Apartment · Feature ${j + 1}`, r.value);
    });
  }

  (c.videos ?? []).forEach((v, i) => push(`videos.${i}.title`, `Video ${i + 1} · Title`, v.title));

  // contact.heading is authored per-locale (heading_i18n) — not machine-translated.
  return out;
}

/* ============================================================
 * dot-path get/set on plain objects (clones via structuredClone).
 * ============================================================ */
export function getPath<T = unknown>(obj: unknown, path: string): T | undefined {
  return path
    .split(".")
    .reduce<unknown>((acc, key) => (acc == null ? acc : (acc as Record<string, unknown>)[key]), obj) as
    | T
    | undefined;
}

export function setPath<T extends object>(obj: T, path: string, val: unknown): T {
  const next = structuredClone(obj);
  const keys = path.split(".");
  let cur: Record<string, unknown> = next as Record<string, unknown>;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (cur[k] == null || typeof cur[k] !== "object") {
      cur[k] = /^\d+$/.test(keys[i + 1]) ? [] : {};
    }
    cur = cur[k] as Record<string, unknown>;
  }
  cur[keys[keys.length - 1]] = val;
  return next;
}

/* ============================================================
 * Translation row access + cache resolution.
 * ============================================================ */
export type TranslationRow = {
  content: PageContent;
  source_hash: string | null;
  locked_fields: string[];
};

export async function fetchTranslationRow(
  pageId: string,
  lang: ReadingLang,
): Promise<TranslationRow | null> {
  const { data, error } = await supabase
    .from("page_translations")
    .select("content, source_hash, locked_fields")
    .eq("page_id", pageId)
    .eq("lang", lang)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    content: (data.content ?? {}) as PageContent,
    source_hash: (data.source_hash as string | null) ?? null,
    locked_fields: Array.isArray(data.locked_fields) ? (data.locked_fields as string[]) : [],
  };
}

/** Merge translated detail rows over source: keep structure/icon/values from
 * source; take translated custom text only. Falls back to source rows. */
function mergeRows(
  srcRows: import("@/types/page").DetailRow[] | undefined,
  trRows: import("@/types/page").DetailRow[] | undefined,
  textField: "label" | "value",
): import("@/types/page").DetailRow[] | undefined {
  if (!Array.isArray(srcRows)) return srcRows;
  return srcRows.map((r, i) => {
    const custom = r.linked === false || !r.presetKey;
    const translatedText = trRows?.[i]?.[textField];
    return {
      presetKey: r.presetKey,
      linked: r.linked,
      icon: r.icon,
      label: textField === "label" && custom ? translatedText ?? r.label : r.label,
      value:
        textField === "value" && custom
          ? translatedText ?? r.value
          : r.value,
    };
  });
}

/**
 * Re-attach non-translatable fields (images + chosen icons) from the source
 * onto a translated copy. The AI translation only returns text fields, so media
 * URLs (hero background, unit images) and manual icon choices must be restored
 * here to stay consistent across languages.
 */
export function preserveStableFields(
  source: PageContent,
  translated: PageContent,
): PageContent {
  const out = structuredClone(translated) as PageContent;
  // Hero kicker + CTA are authored per-locale; restore base + i18n from source so
  // the renderer picks the authored locale value (or falls back to the source).
  out.hero = {
    ...out.hero,
    kicker: source.hero?.kicker,
    kicker_i18n: source.hero?.kicker_i18n,
    cta_label: source.hero?.cta_label,
    cta_label_i18n: source.hero?.cta_label_i18n,
  };
  if (source.hero?.background) {
    out.hero = { ...out.hero, background: source.hero.background };
  }
  if (Array.isArray(out.stats)) {
    out.stats = out.stats.map((s, i) => ({
      ...s,
      icon: source.stats?.[i]?.icon ?? s.icon,
    }));
  }
  if (out.about && source.about?.feature_icons) {
    out.about = { ...out.about, feature_icons: source.about.feature_icons };
  }
  if (Array.isArray(out.units)) {
    out.units = out.units.map((u, i) => {
      const src = source.units?.[i];
      if (!src) return u;
      return {
        ...u,
        // Stable, non-AI-translated unit fields (dictionary codes, numbers, media).
        unit_type: src.unit_type,
        unit_number: src.unit_number,
        floor: src.floor,
        orientation: src.orientation,
        rooms: src.rooms,
        area_m2: src.area_m2,
        balcony_m2: src.balcony_m2,
        parking: src.parking,
        price: src.price,
        image: src.image ?? u.image,
        attachment: src.attachment,
        specs: mergeRows(src.specs, u.specs, "label"),
        featureRows: mergeRows(src.featureRows, u.featureRows, "value"),
      };
    });
  }
  // Single apartment: restore stable (non-AI-translated) fields + media, and the
  // image-side toggle (a layout choice, never translated).
  if (out.apartment && source.apartment) {
    const src = source.apartment;
    out.apartment = {
      ...out.apartment,
      unit_type: src.unit_type,
      unit_number: src.unit_number,
      floor: src.floor,
      orientation: src.orientation,
      rooms: src.rooms,
      area_m2: src.area_m2,
      balcony_m2: src.balcony_m2,
      parking: src.parking,
      price: src.price,
      image: src.image ?? out.apartment.image,
      attachment: src.attachment,
      specs: mergeRows(src.specs, out.apartment.specs, "label"),
      featureRows: mergeRows(src.featureRows, out.apartment.featureRows, "value"),
    };
  } else if (source.apartment) {
    out.apartment = source.apartment;
  }

  out.apartment_image_side = source.apartment_image_side;
  // Apartment section heading + icon are admin-chosen, never machine-translated.
  out.apartment_title = source.apartment_title;
  out.apartment_title_icon = source.apartment_title_icon;
  // Per-locale proper names are authored manually, not machine-translated.
  if (source.location?.name_i18n) {
    out.location = { ...out.location, name_i18n: source.location.name_i18n };
  }
  // Contact heading is authored per-locale; restore base + i18n from source.
  out.contact = {
    ...out.contact,
    heading: source.contact?.heading,
    heading_i18n: source.contact?.heading_i18n,
  };
  return out;
}

/**
 * Visitor-facing resolve: translate (and cache via the edge function) when
 * needed, otherwise return the cached translation. Caching/writes happen inside
 * the edge function with service privileges.
 */
export async function resolveTranslation(
  pageId: string,
  content: PageContent,
  sourceLang: ReadingLang,
  targetLang: ReadingLang,
  opts?: { force?: boolean },
): Promise<PageContent> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error("You must be signed in to translate.");

  const result = await translatePageContent({
    data: {
      content: content as Record<string, unknown>,
      sourceLang,
      targetLang,
      pageId,
      force: opts?.force ?? false,
      accessToken,
    },
  });
  const translated = (result?.content ?? {}) as PageContent;
  return preserveStableFields(content, translated);
}

/**
 * Admin save: write a manually-curated translation row and mark it fresh by
 * bumping source_hash to the current source. Runs as the authenticated admin.
 */
export async function saveTranslation(
  pageId: string,
  lang: ReadingLang,
  content: PageContent,
  lockedFields: string[],
  hash: string,
): Promise<void> {
  const { error } = await supabase.from("page_translations").upsert(
    {
      page_id: pageId,
      lang,
      content,
      source_hash: hash,
      locked_fields: lockedFields,
    },
    { onConflict: "page_id,lang" },
  );
  if (error) throw error;
}
