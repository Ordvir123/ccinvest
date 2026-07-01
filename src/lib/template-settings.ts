import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";

/**
 * Global template settings shared across all landing pages.
 *
 * Stored as a JSON blob on a reserved row in the `pages` table (slug below),
 * published so the anonymous public renderer can read it. This avoids a
 * schema change while reusing the existing pages RLS policies.
 */
export const TEMPLATE_SETTINGS_SLUG = "__template_settings__";

export type ApartmentTitleOption = {
  /** Display text of the heading option (authored in any language). */
  label: string;
  /** Icon name (from the shared icon set) shown beside the heading. */
  icon: string;
};

export type TemplateSettings = {
  /** Logo shown in the landing-page hero. */
  brandLogoUrl: string;
  /** Brand name (used as logo alt text). */
  brandName: string;
  /** Primary brand color (hex). Empty = use the theme default. */
  primaryColor: string;
  /** Default hero CTA label when a page does not define one. */
  defaultCtaLabel: string;
  /** Default contact-section heading when a page does not define one. */
  defaultContactHeading: string;
  /** Background image for the contact section. Empty = bundled default. */
  contactBgUrl: string;
  /** Reusable heading options for the "About the apartment" section. */
  apartmentTitleOptions: ApartmentTitleOption[];
};

export const DEFAULT_APARTMENT_TITLE_OPTIONS: ApartmentTitleOption[] = [
  { label: "À propos de l'appartement", icon: "home" },
];

export const DEFAULT_TEMPLATE_SETTINGS: TemplateSettings = {
  brandLogoUrl: "/brand/cc-invest-logo.png",
  brandName: "CC Invest",
  primaryColor: "",
  defaultCtaLabel: "",
  defaultContactHeading: "",
  contactBgUrl: "",
  apartmentTitleOptions: DEFAULT_APARTMENT_TITLE_OPTIONS,
};

function normalize(raw: unknown): TemplateSettings {
  const v = (raw ?? {}) as Partial<TemplateSettings>;
  return {
    brandLogoUrl: v.brandLogoUrl?.trim() || DEFAULT_TEMPLATE_SETTINGS.brandLogoUrl,
    brandName: v.brandName?.trim() || DEFAULT_TEMPLATE_SETTINGS.brandName,
    primaryColor: v.primaryColor?.trim() || "",
    defaultCtaLabel: v.defaultCtaLabel?.trim() || "",
    defaultContactHeading: v.defaultContactHeading?.trim() || "",
    contactBgUrl: v.contactBgUrl?.trim() || "",
  };
}

/** Read the global template settings (anon-readable on the public site). */
export async function fetchTemplateSettings(): Promise<TemplateSettings> {
  if (!isSupabaseConfigured) return { ...DEFAULT_TEMPLATE_SETTINGS };
  try {
    const { data, error } = await supabase
      .from("pages")
      .select("content")
      .eq("slug", TEMPLATE_SETTINGS_SLUG)
      .maybeSingle();
    if (error) throw error;
    const settings = (data?.content as { settings?: unknown } | null)?.settings;
    return normalize(settings);
  } catch (err) {
    console.warn("[template-settings] falling back to defaults:", err);
    return { ...DEFAULT_TEMPLATE_SETTINGS };
  }
}

/** Persist the global template settings (admin only). */
export async function saveTemplateSettings(
  settings: TemplateSettings,
): Promise<TemplateSettings> {
  const normalized = normalize(settings);
  // The reserved row reuses the page schema; only `content.settings` matters.
  const content = {
    settings: normalized,
    hero: { title: "Template settings" },
    stats: [],
    gallery: [],
  };

  const { data: existing, error: lookupError } = await supabase
    .from("pages")
    .select("id")
    .eq("slug", TEMPLATE_SETTINGS_SLUG)
    .maybeSingle();
  if (lookupError) throw lookupError;

  if (existing?.id) {
    const { error } = await supabase
      .from("pages")
      .update({ content })
      .eq("id", existing.id as string);
    if (error) throw error;
  } else {
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("pages").insert({
      slug: TEMPLATE_SETTINGS_SLUG,
      source_lang: "he",
      status: "published",
      content,
      seo: {},
      created_by: userData.user?.id ?? null,
    });
    if (error) throw error;
  }

  return normalized;
}
