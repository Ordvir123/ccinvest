import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchTemplateSettings, saveTemplateSettings } from "@/lib/template-settings";
import { ReorderList, ReorderToggle, useDragReorder } from "@/components/admin/reorder";
import {
  orderedSectionIds,
  isSectionHidden,
  SECTION_LABELS,
  getSectionData,
  setSectionData,
  getSectionLayout,
  setSectionLayout,
  duplicateSection,
  deleteSection,
  type SectionKey,
} from "@/lib/page-sections";
import { BUILTIN_SPEC_PRESETS, BUILTIN_FEATURE_PRESETS } from "@/lib/unit-i18n";
import {
  emptyPageContent,
  normalizeSlug,
  isSlugTaken,
  savePage,
  setPageStatus,
  validateForPublish,
} from "@/lib/pages";
import {
  normalizeSeo,
  type Page,
  type PageContent,
  type PageSeo,
  type PageStatus,
  type ReadingLang,
  type Unit,
} from "@/types/page";
import { SITE_ORIGIN } from "@/components/admin/editor/shared";

export { ReorderList, ReorderToggle, isSectionHidden, SECTION_LABELS };
export type { SectionKey };

export function usePageEditorState({
  initialPage,
  initialContent,
  initialSourceLang,
}: {
  initialPage?: Page;
  initialContent?: PageContent;
  initialSourceLang?: string;
}) {
  const navigate = useNavigate();
  const isEdit = !!initialPage;

  const [pageId, setPageId] = useState<string | undefined>(initialPage?.id);
  const [slug, setSlug] = useState(initialPage?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!initialPage);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [sourceLang, setSourceLang] = useState(
    initialPage?.source_lang ?? initialSourceLang ?? "he",
  );
  const [status, setStatus] = useState<PageStatus>(initialPage?.status ?? "draft");
  const [publishing, setPublishing] = useState(false);
  const [content, setContent] = useState<PageContent>(
    initialPage
      ? { ...emptyPageContent(), ...initialPage.content }
      : initialContent
        ? { ...emptyPageContent(), ...initialContent }
        : emptyPageContent(),
  );
  const [seo, setSeo] = useState<PageSeo>(
    normalizeSeo(initialPage?.seo, initialPage?.source_lang ?? initialSourceLang ?? "he"),
  );
  const [saving, setSaving] = useState(false);

  // Reusable "About the apartment" heading options managed in template settings.
  const settingsQuery = useQuery({
    queryKey: ["template-settings"],
    queryFn: fetchTemplateSettings,
  });
  const titleOptions = settingsQuery.data?.apartmentTitleOptions ?? [];
  const specPresets = settingsQuery.data?.specPresets ?? BUILTIN_SPEC_PRESETS;
  const featurePresets = settingsQuery.data?.featurePresets ?? BUILTIN_FEATURE_PRESETS;
  const CUSTOM_TITLE = "__custom__";
  const DEFAULT_TITLE = "__default__";
  const [aptTitleCustom, setAptTitleCustom] = useState(false);

  // Convenient typed updaters.
  const patch = (p: Partial<PageContent>) => setContent((c) => ({ ...c, ...p }));
  const patchHero = (p: Partial<PageContent["hero"]>) =>
    setContent((c) => ({ ...c, hero: { ...c.hero, ...p } }));
  const patchLocation = (p: Partial<NonNullable<PageContent["location"]>>) =>
    setContent((c) => ({ ...c, location: { ...c.location, ...p } }));
  const patchAbout = (p: Partial<NonNullable<PageContent["about"]>>) =>
    setContent((c) => ({ ...c, about: { ...c.about, ...p } }));
  const patchContact = (p: Partial<NonNullable<PageContent["contact"]>>) =>
    setContent((c) => ({ ...c, contact: { ...c.contact, ...p } }));
  // Update one locale of a per-locale hero map (kicker_i18n / cta_label_i18n).
  const patchHeroI18n = (
    field: "kicker_i18n" | "cta_label_i18n",
    lang: ReadingLang,
    value: string,
  ) =>
    setContent((c) => ({
      ...c,
      hero: { ...c.hero, [field]: { ...(c.hero[field] ?? {}), [lang]: value } },
    }));

  const publicUrl = slug ? `/${slug}` : "/<slug>";

  const onSlugChange = (raw: string) => {
    setSlug(normalizeSlug(raw));
    setSlugError(null);
  };

  // Pre-fill slug from hero.title until the user edits it manually.
  const onTitleChange = (title: string) => {
    patchHero({ title });
    if (!slugTouched && !slug) setSlug(normalizeSlug(title));
  };

  const checkSlugUnique = async () => {
    if (!slug) return;
    try {
      const taken = await isSlugTaken(slug, pageId);
      setSlugError(taken ? "This slug is already used by another page." : null);
    } catch (err) {
      console.warn("[editor] slug check failed", err);
    }
  };

  const canUpload = slug.length > 0;

  /**
   * Persist custom (unlinked) headings, detail rows and feature rows entered in
   * the editor as reusable options/presets in template settings — so the more
   * pages you build, the more ready-made choices you have.
   */
  const persistCustomTitleOption = async () => {
    try {
      const current = settingsQuery.data ?? (await fetchTemplateSettings());
      let changed = false;
      const nextTitles = [...(current.apartmentTitleOptions ?? [])];
      const nextSpecs = [...(current.specPresets ?? [])];
      const nextFeatures = [...(current.featurePresets ?? [])];

      // Heading option.
      const titleLabel = content.apartment_title?.trim();
      if (titleLabel && !nextTitles.some((o) => o.label.trim() === titleLabel)) {
        nextTitles.push({
          label: titleLabel,
          icon: content.apartment_title_icon?.trim() || "home",
        });
        changed = true;
      }

      // Collect custom rows from apartment + all units.
      const units: Unit[] = [
        ...(content.apartment ? [content.apartment] : []),
        ...(content.units ?? []),
      ];
      const makeLabels = (t: string) => ({ fr: t, he: t, en: t });
      for (const u of units) {
        for (const r of u.specs ?? []) {
          const isCustom = r.linked === false || !r.presetKey;
          const label = r.label?.trim();
          if (isCustom && label && !nextSpecs.some((p) => p.labels.fr.trim() === label)) {
            nextSpecs.push({
              key: `spec_${Math.random().toString(36).slice(2, 8)}`,
              icon: r.icon?.trim() || "check",
              valueKind: "text",
              labels: makeLabels(label),
            });
            changed = true;
          }
        }
        for (const r of u.featureRows ?? []) {
          const isCustom = r.linked === false || !r.presetKey;
          const text = r.value?.trim();
          if (isCustom && text && !nextFeatures.some((p) => p.labels.fr.trim() === text)) {
            nextFeatures.push({
              key: `feat_${Math.random().toString(36).slice(2, 8)}`,
              icon: r.icon?.trim() || "check",
              valueKind: "text",
              labels: makeLabels(text),
            });
            changed = true;
          }
        }
      }

      if (!changed) return;
      await saveTemplateSettings({
        ...current,
        apartmentTitleOptions: nextTitles,
        specPresets: nextSpecs,
        featurePresets: nextFeatures,
      });
      settingsQuery.refetch();
    } catch (err) {
      console.warn("[editor] failed to persist custom options", err);
    }
  };

  const onSave = async () => {
    if (!content.hero?.title?.trim()) {
      toast.error("Hero title is required.");
      console.error("[editor] onSave aborted: missing hero title");
      return;
    }
    if (!slug) {
      toast.error("A slug is required.");
      console.error("[editor] onSave aborted: missing slug");
      return;
    }
    setSaving(true);
    try {
      const taken = await isSlugTaken(slug, pageId);
      if (taken) {
        setSlugError("This slug is already used by another page.");
        toast.error("Slug already in use — choose another.");
        return;
      }
      const saved = await savePage({
        id: pageId,
        slug,
        source_lang: sourceLang,
        status,
        content,
        seo,
      });
      toast.success("Draft saved.");
      await persistCustomTitleOption();
      if (!pageId) {
        setPageId(saved.id);
        navigate({ to: "/admin/pages/$id", params: { id: saved.id }, replace: true });
      }
      return saved.id;
    } catch (err) {
      console.error("[editor] onSave failed:", err);
      toast.error(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const liveUrl = slug ? `${SITE_ORIGIN}/${slug}` : "";

  const onPublish = async () => {
    if (!content.hero?.title?.trim()) {
      toast.error("Hero title is required before publishing.");
      console.error("[editor] onPublish aborted: missing hero title");
      return;
    }
    setPublishing(true);
    try {
      const problem = await validateForPublish({ id: pageId, slug, title: content.hero.title });
      if (problem) {
        setSlugError(problem.includes("slug") ? problem : null);
        toast.error(problem);
        console.error("[editor] onPublish validation failed:", problem);
        return;
      }
      // Save AND publish in a single write so a brand-new page is created with
      // status 'published' (avoids a save→navigate→status-flip race).
      const saved = await savePage({
        id: pageId,
        slug,
        source_lang: sourceLang,
        status: "published",
        content,
        seo,
      });
      setStatus("published");
      toast.success("Page published — it's now live.");
      await persistCustomTitleOption();
      if (!pageId) {
        setPageId(saved.id);
        navigate({ to: "/admin/pages/$id", params: { id: saved.id }, replace: true });
      }
    } catch (err) {
      console.error("[editor] onPublish failed:", err);
      toast.error(err instanceof Error ? err.message : "Failed to publish.");
    } finally {
      setPublishing(false);
    }
  };


  const onUnpublish = async () => {
    if (!pageId) {
      toast.error("Save the page before unpublishing.");
      console.error("[editor] onUnpublish aborted: no page id");
      return;
    }
    setPublishing(true);
    try {
      const next = await setPageStatus(pageId, "draft");
      setStatus(next);
      toast.success("Page unpublished — now a draft.");
    } catch (err) {
      console.error("[editor] onUnpublish failed:", err);
      toast.error(err instanceof Error ? err.message : "Failed to unpublish.");
    } finally {
      setPublishing(false);
    }

  };

  const copyShareLink = async (lang?: ReadingLang) => {
    if (!liveUrl) {
      toast.error("Add a slug first.");
      return;
    }
    const url = lang ? `${liveUrl}?lang=${lang}` : liveUrl;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(`Link copied${lang ? ` (${lang.toUpperCase()})` : ""}.`);
    } catch {
      toast.error("Could not copy link.");
    }
  };

  /* ---------- form panel ---------- */
  const orderedIds = orderedSectionIds(content);
  const [sectionsReorder, setSectionsReorder] = useState(false);
  const [statsReorder, setStatsReorder] = useState(false);
  const [aboutFeatReorder, setAboutFeatReorder] = useState(false);
  const [videosReorder, setVideosReorder] = useState(false);
  const [unitsReorder, setUnitsReorder] = useState(false);

  // Hide/show a section INSTANCE (base or duplicate) by its id.
  const toggleSection = (id: string) => {
    const hidden = content.hidden_sections ?? [];
    patch({
      hidden_sections: hidden.includes(id)
        ? hidden.filter((k) => k !== id)
        : [...hidden, id],
    });
  };

  // Per-instance data access (base field or extra_sections entry).
  const getData = (id: string) => getSectionData(content, id);
  const setData = (id: string, data: ReturnType<typeof getSectionData>) =>
    setContent((c) => setSectionData(c, id, data!));

  // Per-instance layout preset (gallery / wide_images only).
  const getLayout = (id: string) => getSectionLayout(content, id);
  const setLayout = (id: string, layout: string) =>
    setContent((c) => setSectionLayout(c, id, layout));

  const duplicateInstance = (id: string) =>
    setContent((c) => duplicateSection(c, id).content);
  const deleteInstance = (id: string) => setContent((c) => deleteSection(c, id));

  const reorderSections = (next: string[]) => patch({ section_order: next });

  const listingIsProject = content.category === "project";


  return {
    settings: settingsQuery.data,
    isEdit,
    pageId,
    slug,
    setSlugTouched,
    slugError,
    sourceLang,
    setSourceLang,
    status,
    publishing,
    content,
    setContent,
    seo,
    setSeo,
    saving,
    titleOptions,
    specPresets,
    featurePresets,
    CUSTOM_TITLE,
    DEFAULT_TITLE,
    aptTitleCustom,
    setAptTitleCustom,
    patch,
    patchHero,
    patchLocation,
    patchAbout,
    patchContact,
    patchHeroI18n,
    publicUrl,
    onSlugChange,
    onTitleChange,
    checkSlugUnique,
    canUpload,
    onSave,
    liveUrl,
    onPublish,
    onUnpublish,
    copyShareLink,
    orderedIds,
    getData,
    setData,
    getLayout,
    setLayout,
    duplicateInstance,
    deleteInstance,
    reorderSections,
    sectionsReorder,
    setSectionsReorder,
    statsReorder,
    setStatsReorder,
    aboutFeatReorder,
    setAboutFeatReorder,
    videosReorder,
    setVideosReorder,
    unitsReorder,
    setUnitsReorder,
    toggleSection,
    listingIsProject,
  };
}

export type PageEditorState = ReturnType<typeof usePageEditorState>;
