import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchTemplateSettings, saveTemplateSettings } from "@/lib/template-settings";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Save,
  Globe,
  EyeOff,
  Eye,
  Copy,
  ExternalLink,
  RefreshCw,
  Sparkles,
  Loader2,
  Link2,
  Link2Off,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import { cn } from "@/lib/utils";

import { SectionCard, Field } from "@/components/admin/editor-parts";
import { SingleImageUpload, GalleryUpload, UnitFileUpload } from "@/components/admin/MediaUpload";
import { IconPicker } from "@/components/admin/IconPicker";
import { ReorderList, ReorderToggle, useDragReorder } from "@/components/admin/reorder";
import {
  orderedSectionKeys,
  isSectionHidden,
  SECTION_LABELS,
  type SectionKey,
} from "@/lib/page-sections";
import { GripVertical, ArrowUpDown } from "lucide-react";
import { hasItems } from "@/types/page";
import {
  UNIT_TYPES,
  ORIENTATION_CODES,
  PARKING_CODES,
  UNIT_TYPE_OPTION_LABELS,
  ORIENTATION_OPTION_LABELS,
  PARKING_OPTION_LABELS,
  BUILTIN_SPEC_PRESETS,
  BUILTIN_FEATURE_PRESETS,
  resolvePreset,
  migrateUnitSpecs,
  migrateUnitFeatures,
} from "@/lib/unit-i18n";
import { TranslationsTab } from "@/components/admin/TranslationsTab";
import { SeoEditor } from "@/components/admin/SeoEditor";
import {
  emptyPageContent,
  normalizeSlug,
  extractYouTubeId,
  isSlugTaken,
  savePage,
  cleanContent,
  setPageStatus,
  validateForPublish,
} from "@/lib/pages";
import { AiCorrectionsPanel } from "@/components/admin/AiCorrectionsPanel";
import {
  READING_LANGS,
  isRtlReading,
  normalizeSeo,
  type DetailRow,
  type Page,
  type PageContent,
  type PageSeo,
  type PageStatus,
  type ReadingLang,
  type SpecPreset,
  type Stat,
  type Unit,
  type Video,
} from "@/types/page";

const SOURCE_LANGS = ["fr", "he", "en"] as const;
const SITE_ORIGIN = "https://ccinvest.lovable.app";

/** Localized placeholders (guidance only — admin's entered value wins). */
const KICKER_PLACEHOLDERS: Record<ReadingLang, string> = {
  fr: "À VENDRE - TLV",
  he: "למכירה - תל אביב",
  en: "FOR SALE - TLV",
};
const CTA_PLACEHOLDERS: Record<ReadingLang, string> = {
  fr: "Contact",
  he: "צור קשר",
  en: "Contact",
};
const CONTACT_HEADING_PLACEHOLDERS: Record<ReadingLang, string> = {
  fr: "Plus d'informations sur ce projet ?",
  he: "מידע נוסף על פרויקט זה?",
  en: "More information on this project?",
};
const LANG_LABELS: Record<ReadingLang, string> = { fr: "Français", he: "עברית", en: "English" };

function MoveRemove({
  onUp,
  onDown,
  onRemove,
}: {
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex gap-1">
      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onUp}>
        <ArrowUp className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onDown}>
        <ArrowDown className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onRemove}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function moveItem<T>(arr: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir;
  if (j < 0 || j >= arr.length) return arr;
  const next = arr.slice();
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

const sanitizeNum = (val: string, allowDecimal = true) => {
  let s = val.replace(/[^\d.,]/g, "").replace(",", ".");
  if (!allowDecimal) return s.replace(/\./g, "");
  const parts = s.split(".");
  if (parts.length > 2) s = parts[0] + "." + parts.slice(1).join("");
  return s;
};

/** Chain link/unlink toggle (like the aspect-ratio lock in design tools). */
function LinkToggle({
  linked,
  disabled,
  onToggle,
}: {
  linked: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      disabled={disabled}
      onClick={onToggle}
      className={cn("h-9 w-9 shrink-0", linked ? "text-primary" : "text-muted-foreground")}
      aria-label={linked ? "Unlink label & icon from preset" : "Link label & icon to preset"}
      title={
        linked
          ? "Linked to preset — click to edit label & icon"
          : "Custom — click to relink to preset"
      }
    >
      {linked ? <Link2 className="h-4 w-4" /> : <Link2Off className="h-4 w-4" />}
    </Button>
  );
}

const CUSTOM_PRESET = "__custom__";

/** Editor for flexible spec rows (Area, Rooms, Floor, …). */
function SpecRowsEditor({
  rows,
  presets,
  onChange,
}: {
  rows: DetailRow[];
  presets: SpecPreset[];
  onChange: (rows: DetailRow[]) => void;
}) {
  const [reorder, setReorder] = useState(false);
  const update = (i: number, p: Partial<DetailRow>) => {
    const next = rows.slice();
    next[i] = { ...next[i], ...p };
    onChange(next);
  };
  return (
    <div className="space-y-2">
      {reorder ? (
        <ReorderList
          items={rows}
          onReorder={onChange}
          getLabel={(row) => {
            const p = resolvePreset(row.presetKey, presets, BUILTIN_SPEC_PRESETS);
            return (p?.labels.fr || row.label || row.value || "Detail") as string;
          }}
        />
      ) : (
        rows.map((row, i) => {
          const preset = resolvePreset(row.presetKey, presets, BUILTIN_SPEC_PRESETS);
          const isCustom = !row.presetKey;
          const linked = !isCustom && row.linked !== false;
          const kind = preset?.valueKind ?? "text";
          const effIcon = linked ? preset?.icon : row.icon || preset?.icon;
          return (
            <div key={i} className="space-y-2 rounded-md border border-border p-2">
              <div className="flex items-center gap-2">
                <IconPicker
                  value={effIcon}
                  onChange={(icon) => update(i, { icon: (icon as string) ?? "" })}
                />
                <LinkToggle
                  linked={linked}
                  disabled={isCustom}
                  onToggle={() =>
                    update(i, {
                      linked: !linked,
                      label: !linked ? undefined : (preset?.labels.fr ?? ""),
                      icon: !linked ? undefined : preset?.icon,
                    })
                  }
                />
                <Select
                  value={row.presetKey ?? CUSTOM_PRESET}
                  onValueChange={(v) => {
                    if (v === CUSTOM_PRESET) {
                      update(i, {
                        presetKey: undefined,
                        linked: false,
                        label: row.label ?? "",
                        icon: effIcon,
                      });
                    } else {
                      update(i, {
                        presetKey: v,
                        linked: true,
                        label: undefined,
                        icon: undefined,
                      });
                    }
                  }}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Choose a preset" />
                  </SelectTrigger>
                  <SelectContent>
                    {presets.map((p) => (
                      <SelectItem key={p.key} value={p.key}>
                        {p.labels.fr || p.labels.en || p.labels.he || p.key}
                      </SelectItem>
                    ))}
                    <SelectItem value={CUSTOM_PRESET}>Custom text…</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              {(isCustom || !linked) && (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {READING_LANGS.map((l) => (
                    <Input
                      key={l}
                      dir={isRtlReading(l) ? "rtl" : "ltr"}
                      aria-label={`Label (${l})`}
                      placeholder={`Label (${l.toUpperCase()})`}
                      value={l === "fr" ? (row.label ?? "") : ""}
                      disabled={l !== "fr"}
                      onChange={(e) => update(i, { label: e.target.value })}
                    />
                  ))}
                </div>
              )}
              {kind === "orientation" ? (
                <Select value={row.value ?? ""} onValueChange={(v) => update(i, { value: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select orientation" />
                  </SelectTrigger>
                  <SelectContent>
                    {ORIENTATION_CODES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {ORIENTATION_OPTION_LABELS[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : kind === "parking" ? (
                <Select value={row.value ?? ""} onValueChange={(v) => update(i, { value: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select parking" />
                  </SelectTrigger>
                  <SelectContent>
                    {PARKING_CODES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {PARKING_OPTION_LABELS[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  inputMode={kind === "text" ? "text" : "decimal"}
                  placeholder="Value"
                  value={row.value ?? ""}
                  onChange={(e) =>
                    update(i, {
                      value: kind === "text" ? e.target.value : sanitizeNum(e.target.value),
                    })
                  }
                />
              )}
            </div>
          );
        })
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            onChange([...rows, { presetKey: presets[0]?.key, linked: true, value: "" }])
          }
        >
          <Plus className="h-4 w-4" /> Add detail
        </Button>
        {rows.length > 1 && (
          <ReorderToggle active={reorder} onToggle={() => setReorder((v) => !v)} />
        )}
      </div>
    </div>
  );
}

/** Editor for flexible feature rows (icon + text, preset or custom). */
function FeatureRowsEditor({
  rows,
  presets,
  onChange,
}: {
  rows: DetailRow[];
  presets: SpecPreset[];
  onChange: (rows: DetailRow[]) => void;
}) {
  const [reorder, setReorder] = useState(false);
  const update = (i: number, p: Partial<DetailRow>) => {
    const next = rows.slice();
    next[i] = { ...next[i], ...p };
    onChange(next);
  };
  return (
    <div className="space-y-2">
      {reorder ? (
        <ReorderList
          items={rows}
          onReorder={onChange}
          getLabel={(row) => {
            const p = resolvePreset(row.presetKey, presets, BUILTIN_FEATURE_PRESETS);
            return (row.value || p?.labels.fr || "Feature") as string;
          }}
        />
      ) : (
        rows.map((row, i) => {
          const preset = resolvePreset(row.presetKey, presets, BUILTIN_FEATURE_PRESETS);
          const isCustom = !row.presetKey;
          const linked = !isCustom && row.linked !== false;
          const effIcon = linked ? preset?.icon : row.icon || preset?.icon;
          return (
            <div key={i} className="space-y-2 rounded-md border border-border p-2">
              <div className="flex items-center gap-2">
                <IconPicker
                  value={effIcon}
                  onChange={(icon) => update(i, { icon: (icon as string) ?? "" })}
                />
                <LinkToggle
                  linked={linked}
                  disabled={isCustom}
                  onToggle={() =>
                    update(i, {
                      linked: !linked,
                      value: !linked ? (preset?.labels.fr ?? "") : "",
                      icon: !linked ? undefined : preset?.icon,
                    })
                  }
                />
                <Select
                  value={row.presetKey ?? CUSTOM_PRESET}
                  onValueChange={(v) => {
                    if (v === CUSTOM_PRESET)
                      update(i, { presetKey: undefined, linked: false, icon: effIcon });
                    else update(i, { presetKey: v, linked: true, value: "", icon: undefined });
                  }}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Choose a feature" />
                  </SelectTrigger>
                  <SelectContent>
                    {presets.map((p) => (
                      <SelectItem key={p.key} value={p.key}>
                        {p.labels.fr || p.labels.en || p.labels.he || p.key}
                      </SelectItem>
                    ))}
                    <SelectItem value={CUSTOM_PRESET}>Custom text…</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              {(isCustom || !linked) && (
                <Input
                  placeholder="Feature text"
                  value={row.value ?? ""}
                  onChange={(e) => update(i, { value: e.target.value })}
                />
              )}
            </div>
          );
        })
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...rows, { presetKey: undefined, linked: false, value: "" }])}
        >
          <Plus className="h-4 w-4" /> Add feature
        </Button>
        {rows.length > 1 && (
          <ReorderToggle active={reorder} onToggle={() => setReorder((v) => !v)} />
        )}
      </div>
    </div>
  );
}

export function PageEditor({
  initialPage,
  initialContent,
  initialSourceLang,
  showAiNote = false,
}: {
  initialPage?: Page;
  /** AI-prefilled content for a brand-new page (Slice 3). */
  initialContent?: PageContent;
  initialSourceLang?: string;
  showAiNote?: boolean;
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

  // AI corrections now live in <AiCorrectionsPanel /> (chat + multi-level undo).


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
    if (!content.hero.title.trim()) {
      toast.error("Hero title is required.");
      return;
    }
    if (!slug) {
      toast.error("A slug is required.");
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
      toast.error(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const liveUrl = slug ? `${SITE_ORIGIN}/${slug}` : "";

  const onPublish = async () => {
    const problem = await validateForPublish({ id: pageId, slug, title: content.hero.title });
    if (problem) {
      setSlugError(problem.includes("slug") ? problem : null);
      toast.error(problem);
      return;
    }
    setPublishing(true);
    try {
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
      toast.error(err instanceof Error ? err.message : "Failed to publish.");
    } finally {
      setPublishing(false);
    }
  };

  const onUnpublish = async () => {
    if (!pageId) return;
    setPublishing(true);
    try {
      const next = await setPageStatus(pageId, "draft");
      setStatus(next);
      toast.success("Page unpublished — now a draft.");
    } catch (err) {
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
  const orderedKeys = orderedSectionKeys(content);
  const sectionDrag = useDragReorder(orderedKeys, (next) => patch({ section_order: next }));
  const [sectionsReorder, setSectionsReorder] = useState(false);
  const [statsReorder, setStatsReorder] = useState(false);
  const [aboutFeatReorder, setAboutFeatReorder] = useState(false);
  const [videosReorder, setVideosReorder] = useState(false);
  const [unitsReorder, setUnitsReorder] = useState(false);

  const toggleSection = (key: SectionKey) => {
    const hidden = content.hidden_sections ?? [];
    patch({
      hidden_sections: hidden.includes(key)
        ? hidden.filter((k) => k !== key)
        : [...hidden, key],
    });
  };

  const listingIsProject = content.category === "project";

  const sectionBodies: Record<
    SectionKey,
    { title: string; description?: string; defaultOpen?: boolean; body: React.ReactNode }
  > = {
    stats: {
      title: SECTION_LABELS.stats,
      description: "Repeatable value + label rows. Icons auto-match the label; override per row.",
      defaultOpen: true,
      body: (
        <>
          {statsReorder ? (
            <ReorderList
              items={content.stats ?? []}
              onReorder={(stats) => patch({ stats })}
              getLabel={(s) => s.value || s.label || "Stat"}
            />
          ) : (
            (content.stats ?? []).map((s, i) => (
              <div key={i} className="flex items-end gap-2">
                <div className="space-y-1.5">
                  <span className="text-sm font-medium text-foreground">Icon</span>
                  <IconPicker
                    value={s.icon}
                    onChange={(icon) => {
                      const next = content.stats.slice();
                      next[i] = { ...next[i], icon };
                      patch({ stats: next });
                    }}
                  />
                </div>
                <div className="flex-1">
                  <Field label="Value">
                    <Input
                      value={s.value}
                      onChange={(e) => {
                        const next = content.stats.slice();
                        next[i] = { ...next[i], value: e.target.value };
                        patch({ stats: next });
                      }}
                    />
                  </Field>
                </div>
                <div className="flex-1">
                  <Field label="Label">
                    <Input
                      value={s.label}
                      onChange={(e) => {
                        const next = content.stats.slice();
                        next[i] = { ...next[i], label: e.target.value };
                        patch({ stats: next });
                      }}
                    />
                  </Field>
                </div>
                <MoveRemove
                  onUp={() => patch({ stats: moveItem(content.stats, i, -1) })}
                  onDown={() => patch({ stats: moveItem(content.stats, i, 1) })}
                  onRemove={() => patch({ stats: content.stats.filter((_, idx) => idx !== i) })}
                />
              </div>
            ))
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => patch({ stats: [...content.stats, { value: "", label: "" } as Stat] })}
            >
              <Plus className="h-4 w-4" /> Add stat
            </Button>
            {hasItems(content.stats) && content.stats.length > 1 && (
              <ReorderToggle active={statsReorder} onToggle={() => setStatsReorder((v) => !v)} />
            )}
          </div>
        </>
      ),
    },
    location: {
      title: SECTION_LABELS.location,
      defaultOpen: false,
      body: (
        <>
          <Field label="Heading">
            <Input
              value={content.location?.heading ?? ""}
              onChange={(e) => patchLocation({ heading: e.target.value })}
            />
          </Field>
          <Field label="Text">
            <Textarea
              rows={3}
              value={content.location?.text ?? ""}
              onChange={(e) => patchLocation({ text: e.target.value })}
            />
          </Field>
          <Field label="Map query" hint="Used to build a Google Maps embed.">
            <Input
              value={content.location?.map_query ?? ""}
              onChange={(e) => patchLocation({ map_query: e.target.value })}
            />
          </Field>
          <Field
            label="Street / location name (per language)"
            hint="Proper nouns (Montefiore, Allenby…). Entered manually per locale — never machine-translated."
          >
            <div className="grid grid-cols-3 gap-2">
              {READING_LANGS.map((l) => (
                <Input
                  key={l}
                  placeholder={l.toUpperCase()}
                  value={content.location?.name_i18n?.[l] ?? ""}
                  onChange={(e) =>
                    patchLocation({
                      name_i18n: { ...(content.location?.name_i18n ?? {}), [l]: e.target.value },
                    })
                  }
                />
              ))}
            </div>
          </Field>
          {content.location?.map_query && (
            <iframe
              title="Map preview"
              className="h-48 w-full rounded-md border border-border"
              loading="lazy"
              src={`https://maps.google.com/maps?q=${encodeURIComponent(content.location.map_query)}&t=m&z=15&output=embed`}
            />
          )}
        </>
      ),
    },
    listing: {
      title: listingIsProject ? "Units" : "About the apartment",
      description: listingIsProject
        ? "Repeatable apartment blocks."
        : "The single apartment shown on this page.",
      defaultOpen: !listingIsProject,
      body: listingIsProject ? (
        <div className="space-y-4">
          {unitsReorder ? (
            <ReorderList
              items={content.units ?? []}
              onReorder={(units) => patch({ units })}
              getLabel={(u, i) => u.name || u.unit_type || `Unit ${i + 1}`}
            />
          ) : (
            (content.units ?? []).map((u, i) => (
              <UnitBlock
                key={i}
                index={i}
                unit={u}
                slug={slug}
                canUpload={canUpload}
                onChange={(unit) => {
                  const next = (content.units ?? []).slice();
                  next[i] = unit;
                  patch({ units: next });
                }}
                onUp={() => patch({ units: moveItem(content.units ?? [], i, -1) })}
                onDown={() => patch({ units: moveItem(content.units ?? [], i, 1) })}
                onRemove={() =>
                  patch({ units: (content.units ?? []).filter((_, idx) => idx !== i) })
                }
                specPresets={specPresets}
                featurePresets={featurePresets}
              />
            ))
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                patch({
                  units: [...(content.units ?? []), { name: "", unit_type: "apartment" } as Unit],
                })
              }
            >
              <Plus className="h-4 w-4" /> Add unit
            </Button>
            {(content.units?.length ?? 0) > 1 && (
              <ReorderToggle active={unitsReorder} onToggle={() => setUnitsReorder((v) => !v)} />
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <Field
            label="Image side (desktop)"
            hint="Which side the main image sits on. Mirrored automatically in Hebrew (RTL)."
          >
            <Select
              value={content.apartment_image_side ?? "right"}
              onValueChange={(v) => patch({ apartment_image_side: v as "left" | "right" })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="right">Image on the right</SelectItem>
                <SelectItem value="left">Image on the left</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <UnitBlock
            index={0}
            unit={content.apartment ?? ({ name: "", unit_type: "apartment" } as Unit)}
            slug={slug}
            canUpload={canUpload}
            titleOverride="Apartment details"
            forceOpen
            specPresets={specPresets}
            featurePresets={featurePresets}
            titleNode={(() => {
              const label = content.apartment_title?.trim() ?? "";
              const matched = titleOptions.find((o) => o.label.trim() === label);
              const isCustom = aptTitleCustom || (label.length > 0 && !matched);
              const linked = !isCustom;
              const selectValue = isCustom
                ? CUSTOM_TITLE
                : matched
                  ? matched.label
                  : DEFAULT_TITLE;
              return (
                <Field
                  label="Section heading"
                  hint="Choose a preset heading (label + icon) or unlink to edit freely — new custom headings are saved as future options on save."
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <IconPicker
                        value={content.apartment_title_icon}
                        onChange={(icon) => patch({ apartment_title_icon: (icon as string) ?? "" })}
                      />
                      <LinkToggle linked={linked} onToggle={() => setAptTitleCustom((v) => !v)} />
                      <Select
                        value={selectValue}
                        onValueChange={(v) => {
                          if (v === DEFAULT_TITLE) {
                            setAptTitleCustom(false);
                            patch({ apartment_title: "", apartment_title_icon: "" });
                          } else if (v === CUSTOM_TITLE) {
                            setAptTitleCustom(true);
                          } else {
                            setAptTitleCustom(false);
                            const opt = titleOptions.find((o) => o.label === v);
                            patch({
                              apartment_title: v,
                              apartment_title_icon: opt?.icon ?? content.apartment_title_icon ?? "",
                            });
                          }
                        }}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={DEFAULT_TITLE}>
                            Default (À propos de l'appartement)
                          </SelectItem>
                          {titleOptions.map((o) => (
                            <SelectItem key={o.label} value={o.label}>
                              {o.label}
                            </SelectItem>
                          ))}
                          <SelectItem value={CUSTOM_TITLE}>Custom text…</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {isCustom && (
                      <Input
                        value={content.apartment_title ?? ""}
                        onChange={(e) => patch({ apartment_title: e.target.value })}
                        placeholder="Enter a custom heading…"
                      />
                    )}
                  </div>
                </Field>
              );
            })()}
            onChange={(apartment) => patch({ apartment })}
          />
        </div>
      ),
    },
    gallery: {
      title: SECTION_LABELS.gallery,
      defaultOpen: false,
      body: (
        <GalleryUpload
          slug={slug}
          value={content.gallery ?? []}
          onChange={(gallery) => patch({ gallery })}
          disabled={!canUpload}
        />
      ),
    },
    wide_images: {
      title: SECTION_LABELS.wide_images,
      description: "Full-width images, stacked one under another across the whole screen.",
      defaultOpen: false,
      body: (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            These images render edge-to-edge on the page (no cropping into cards).
          </p>
          <GalleryUpload
            slug={slug}
            value={content.wide_images ?? []}
            onChange={(wide_images) => patch({ wide_images })}
            disabled={!canUpload}
          />
        </div>
      ),
    },
    videos: {
      title: SECTION_LABELS.videos,
      description: "YouTube links (any format).",
      defaultOpen: false,
      body: (
        <div className="space-y-3">
          {videosReorder ? (
            <ReorderList
              items={content.videos ?? []}
              onReorder={(videos) => patch({ videos })}
              getLabel={(v, i) => v.title || v.youtube_id || `Video ${i + 1}`}
            />
          ) : (
            (content.videos ?? []).map((v, i) => (
              <VideoRow
                key={i}
                video={v}
                onChange={(video) => {
                  const next = (content.videos ?? []).slice();
                  next[i] = video;
                  patch({ videos: next });
                }}
                onUp={() => patch({ videos: moveItem(content.videos ?? [], i, -1) })}
                onDown={() => patch({ videos: moveItem(content.videos ?? [], i, 1) })}
                onRemove={() =>
                  patch({ videos: (content.videos ?? []).filter((_, idx) => idx !== i) })
                }
              />
            ))
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                patch({ videos: [...(content.videos ?? []), { youtube_id: "" } as Video] })
              }
            >
              <Plus className="h-4 w-4" /> Add video
            </Button>
            {(content.videos?.length ?? 0) > 1 && (
              <ReorderToggle active={videosReorder} onToggle={() => setVideosReorder((v) => !v)} />
            )}
          </div>
        </div>
      ),
    },
    contact: {
      title: SECTION_LABELS.contact,
      defaultOpen: false,
      body: (
        <Field
          label="Heading (per language)"
          hint="Shown above the contact form. Enter each language; empty locales fall back to the source language."
        >
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {READING_LANGS.map((l) => (
              <Input
                key={l}
                dir={isRtlReading(l) ? "rtl" : "ltr"}
                aria-label={`Contact heading (${LANG_LABELS[l]})`}
                placeholder={CONTACT_HEADING_PLACEHOLDERS[l]}
                value={content.contact?.heading_i18n?.[l] ?? ""}
                onChange={(e) =>
                  patchContact({
                    heading_i18n: { ...(content.contact?.heading_i18n ?? {}), [l]: e.target.value },
                  })
                }
              />
            ))}
          </div>
        </Field>
      ),
    },
  };

  const formPanel = (
    <div className="space-y-4">
      <AiCorrectionsPanel
        content={content}
        setContent={setContent}
        sourceLang={sourceLang}
      />


      <SectionCard title="Page meta">
        <Field label="Slug" required hint={`Public URL: ${publicUrl}`}>
          <Input
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              onSlugChange(e.target.value);
            }}
            onBlur={checkSlugUnique}
            placeholder="montefiore-allenby"
          />
          {slugError && <p className="text-xs text-destructive">{slugError}</p>}
        </Field>
        <Field label="Source language">
          <Select value={sourceLang} onValueChange={setSourceLang}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SOURCE_LANGS.map((l) => (
                <SelectItem key={l} value={l}>
                  {l.toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Listing page" hint="Choose where this page appears on the public site.">
          <Select
            value={content.category ?? "apartment"}
            onValueChange={(v) => patch({ category: v as PageContent["category"] })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="apartment">Apartments (/appartements)</SelectItem>
              <SelectItem value="project">Projects (/projects)</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </SectionCard>

      <SectionCard title="Hero">
        <Field
          label="Kicker (per language)"
          hint="Short eyebrow above the title. Enter each language; empty locales fall back to the source language."
        >
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {READING_LANGS.map((l) => (
              <Input
                key={l}
                dir={isRtlReading(l) ? "rtl" : "ltr"}
                aria-label={`Kicker (${LANG_LABELS[l]})`}
                placeholder={KICKER_PLACEHOLDERS[l]}
                value={content.hero.kicker_i18n?.[l] ?? ""}
                onChange={(e) => patchHeroI18n("kicker_i18n", l, e.target.value)}
              />
            ))}
          </div>
        </Field>
        <Field label="Title" required>
          <Input value={content.hero.title} onChange={(e) => onTitleChange(e.target.value)} />
        </Field>
        <Field label="Subtitle">
          <Input
            value={content.hero.subtitle ?? ""}
            onChange={(e) => patchHero({ subtitle: e.target.value })}
          />
        </Field>
        <Field label="Price">
          <Input
            value={content.hero.price ?? ""}
            onChange={(e) => patchHero({ price: e.target.value })}
          />
        </Field>
        <Field
          label="CTA label (per language)"
          hint="Button text. Enter each language; empty locales fall back to the source language."
        >
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {READING_LANGS.map((l) => (
              <Input
                key={l}
                dir={isRtlReading(l) ? "rtl" : "ltr"}
                aria-label={`CTA label (${LANG_LABELS[l]})`}
                placeholder={CTA_PLACEHOLDERS[l]}
                value={content.hero.cta_label_i18n?.[l] ?? ""}
                onChange={(e) => patchHeroI18n("cta_label_i18n", l, e.target.value)}
              />
            ))}
          </div>
        </Field>
        <Field
          label="Background image"
          hint="Optional. Shown behind the hero with a dark overlay for readability."
        >
          <SingleImageUpload
            slug={slug}
            value={content.hero.background}
            onChange={(background) => patchHero({ background })}
            disabled={!canUpload}
          />
        </Field>
      </SectionCard>

      <SectionCard title="About" defaultOpen={false}>
        <Field label="Heading">
          <Input
            value={content.about?.heading ?? ""}
            onChange={(e) => patchAbout({ heading: e.target.value })}
          />
        </Field>
        <Field label="Body">
          <Textarea
            rows={4}
            value={content.about?.body ?? ""}
            onChange={(e) => patchAbout({ body: e.target.value })}
          />
        </Field>
        <Field label="Features" hint="Icons auto-match the text; override per row.">
          <div className="space-y-2">
            {aboutFeatReorder ? (
              <ReorderList
                items={(content.about?.features ?? []).map((f, i) => ({
                  f,
                  icon: content.about?.feature_icons?.[i],
                }))}
                onReorder={(items) =>
                  patchAbout({
                    features: items.map((x) => x.f),
                    feature_icons: items.map((x) => x.icon as string),
                  })
                }
                getLabel={(x) => x.f || "Feature"}
              />
            ) : (
              (content.about?.features ?? []).map((f, i) => (
                <div key={i} className="flex items-center gap-2">
                  <IconPicker
                    value={content.about?.feature_icons?.[i]}
                    onChange={(icon) => {
                      const icons = (content.about?.feature_icons ?? []).slice();
                      while (icons.length <= i) icons.push(undefined as unknown as string);
                      icons[i] = icon as string;
                      patchAbout({ feature_icons: icons });
                    }}
                  />
                  <Input
                    value={f}
                    onChange={(e) => {
                      const next = (content.about?.features ?? []).slice();
                      next[i] = e.target.value;
                      patchAbout({ features: next });
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => {
                      const icons = (content.about?.feature_icons ?? []).filter(
                        (_, idx) => idx !== i,
                      );
                      patchAbout({
                        features: (content.about?.features ?? []).filter((_, idx) => idx !== i),
                        feature_icons: icons,
                      });
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => patchAbout({ features: [...(content.about?.features ?? []), ""] })}
              >
                <Plus className="h-4 w-4" /> Add feature
              </Button>
              {(content.about?.features?.length ?? 0) > 1 && (
                <ReorderToggle
                  active={aboutFeatReorder}
                  onToggle={() => setAboutFeatReorder((v) => !v)}
                />
              )}
            </div>
          </div>
        </Field>
      </SectionCard>

      {/* Section visibility + ordering */}
      <div className="rounded-lg border border-border bg-card px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-medium text-foreground">Page sections</p>
            <p className="text-xs text-muted-foreground">
              Use the eye icon to show or hide a section. Turn on reordering to drag sections into a
              new order, then save.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {sectionsReorder && (
              <Button type="button" size="sm" onClick={onSave} disabled={saving}>
                <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save changes"}
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              variant={sectionsReorder ? "secondary" : "outline"}
              onClick={() => setSectionsReorder((v) => !v)}
            >
              <ArrowUpDown className="h-4 w-4" />
              {sectionsReorder ? "Done" : "Reorder sections"}
            </Button>
          </div>
        </div>
      </div>

      {orderedKeys.map((key, i) => {
        const meta = sectionBodies[key];
        return (
          <div
            key={key}
            {...(sectionsReorder ? sectionDrag.rowProps(i) : {})}
            className={cn(
              sectionsReorder && "cursor-grab rounded-lg active:cursor-grabbing",
              sectionsReorder &&
                sectionDrag.overIndex === i &&
                sectionDrag.dragIndex !== i &&
                "ring-2 ring-primary",
              sectionsReorder && sectionDrag.dragIndex === i && "opacity-50",
            )}
          >
            <SectionCard
              title={meta.title}
              description={meta.description}
              defaultOpen={meta.defaultOpen}
              visible={!isSectionHidden(content, key)}
              onToggleVisible={() => toggleSection(key)}
              headerLeft={
                sectionsReorder ? (
                  <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                ) : undefined
              }
              collapsedForReorder={sectionsReorder}
            >
              {meta.body}
            </SectionCard>
          </div>
        );
      })}

      <SectionCard
        title="SEO & social"
        description="Authored per language. Empty fields stay empty."
        defaultOpen={false}
      >
        <SeoEditor seo={seo} onChange={setSeo} slug={slug} content={content} />
      </SectionCard>
    </div>
  );

  return (
    <div className="flex h-full min-h-screen flex-col">
      {/* Sticky action bar */}
      <div className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur md:px-6">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-foreground">
            {isEdit ? "Edit page" : "New page"}
          </h1>
          <Badge
            variant={
              status === "published" ? "default" : status === "archived" ? "outline" : "secondary"
            }
          >
            {status === "published" ? "Published" : status === "archived" ? "Archived" : "Draft"}
          </Badge>
          {status === "published" && liveUrl && (
            <a
              href={liveUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="h-3 w-3" /> {liveUrl}
            </a>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!pageId}
            onClick={() => {
              if (!pageId) {
                toast.error("Save the draft first to get a preview link.");
                return;
              }
              window.open(`/preview/${pageId}`, "_blank", "noopener");
            }}
            title={pageId ? "Open a temporary draft preview in a new tab" : "Save first"}
          >
            <Eye className="h-4 w-4" /> Preview draft
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm" disabled={!slug}>
                <Copy className="h-4 w-4" /> Copy share link
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => copyShareLink()}>
                Default ({sourceLang.toUpperCase()})
              </DropdownMenuItem>
              {READING_LANGS.map((l) => (
                <DropdownMenuItem key={l} onClick={() => copyShareLink(l)}>
                  {l.toUpperCase()}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {status === "published" ? (
            <>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={onPublish}
                disabled={publishing}
              >
                <RefreshCw className="h-4 w-4" /> {publishing ? "Updating…" : "Update"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onUnpublish}
                disabled={publishing}
              >
                <EyeOff className="h-4 w-4" /> {publishing ? "…" : "Unpublish"}
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={onPublish}
              disabled={publishing}
            >
              <Globe className="h-4 w-4" /> {publishing ? "Publishing…" : "Publish"}
            </Button>
          )}

          <Button type="button" size="sm" variant="secondary" onClick={onSave} disabled={saving}>
            <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save draft"}
          </Button>
        </div>
      </div>

      {showAiNote && (
        <div className="border-b border-border bg-primary/10 px-4 py-2 text-sm text-foreground md:px-6">
          AI filled what it found. Review and complete the empty fields — nothing was invented.
        </div>
      )}

      {/* Editor vs Translations */}
      <Tabs defaultValue="editor" className="flex-1">
        <div className="border-b border-border px-4 pt-3 md:px-6">
          <TabsList>
            <TabsTrigger value="editor">Editor</TabsTrigger>
            <TabsTrigger value="translations">Translations</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="editor" className="mt-0">
          <div className="mx-auto max-w-3xl flex-1 p-4 md:p-6">{formPanel}</div>
        </TabsContent>

        <TabsContent value="translations" className="mt-0 p-4 md:p-6">
          <TranslationsTab pageId={pageId} source={cleanContent(content)} sourceLang={sourceLang} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------- Unit block ---------- */
function UnitBlock({
  index,
  unit,
  slug,
  canUpload,
  onChange,
  onUp,
  onDown,
  onRemove,
  titleOverride,
  forceOpen = false,
  specPresets,
  featurePresets,
  titleNode,
}: {
  index: number;
  unit: Unit;
  slug: string;
  canUpload: boolean;
  onChange: (u: Unit) => void;
  onUp?: () => void;
  onDown?: () => void;
  onRemove?: () => void;
  /** When set, shows this title instead of the derived unit title. */
  titleOverride?: string;
  /** When true, the block renders expanded and without a collapse toggle. */
  forceOpen?: boolean;
  /** Spec presets from template settings (merged with built-ins). */
  specPresets: SpecPreset[];
  /** Feature presets from template settings (merged with built-ins). */
  featurePresets: SpecPreset[];
  /** Optional heading picker rendered at the top of the block. */
  titleNode?: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  const set = (p: Partial<Unit>) => onChange({ ...unit, ...p });
  const specs = unit.specs ?? migrateUnitSpecs(unit);
  const featureRows = unit.featureRows ?? migrateUnitFeatures(unit);
  // Custom name only applies to "Other" (or legacy units saved without a type).
  const isOther = !unit.unit_type || unit.unit_type === "other";
  const title =
    titleOverride ??
    ((isOther
      ? unit.name?.trim()
      : `${UNIT_TYPE_OPTION_LABELS[unit.unit_type!]}${unit.unit_number ? " " + unit.unit_number : ""}`) ||
      `Unit ${index + 1}`);
  const showControls = !!(onUp && onDown && onRemove);
  const isOpen = forceOpen || open;

  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        {forceOpen ? (
          <span className="text-sm font-medium text-foreground">{title}</span>
        ) : (
          <button
            type="button"
            className="text-sm font-medium text-foreground"
            onClick={() => setOpen((v) => !v)}
          >
            {title}
          </button>
        )}
        {showControls && <MoveRemove onUp={onUp!} onDown={onDown!} onRemove={onRemove!} />}
      </div>
      {isOpen && (
        <div className="mt-3 space-y-3">
          {titleNode}
          <div className="grid grid-cols-2 gap-2">
            <Field label="Unit type" required>
              <Select
                value={unit.unit_type ?? "apartment"}
                onValueChange={(v) => set({ unit_type: v as Unit["unit_type"] })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_TYPES.map((tpe) => (
                    <SelectItem key={tpe} value={tpe}>
                      {UNIT_TYPE_OPTION_LABELS[tpe]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Number">
              <Input
                inputMode="numeric"
                value={unit.unit_number ?? ""}
                onChange={(e) => set({ unit_number: e.target.value })}
                placeholder="№"
              />
            </Field>
          </div>
          {isOther && (
            <Field
              label="Custom name"
              hint="Shown verbatim across all languages — only used for “Other”."
            >
              <Input value={unit.name ?? ""} onChange={(e) => set({ name: e.target.value })} />
            </Field>
          )}
          <Field
            label="Details"
            hint="Add any detail rows you want. Pick a preset (label + icon), or use custom text. Click the chain to unlink and edit the label & icon."
          >
            <SpecRowsEditor
              rows={specs}
              presets={specPresets}
              onChange={(rows) => set({ specs: rows })}
            />
          </Field>
          <Field label="Price">
            <Input value={unit.price ?? ""} onChange={(e) => set({ price: e.target.value })} />
          </Field>
          <Field label="Description">
            <Textarea
              rows={2}
              value={unit.description ?? ""}
              onChange={(e) => set({ description: e.target.value })}
            />
          </Field>
          <Field
            label="Features"
            hint="Pick a preset feature (label + icon) or add custom text. Unlink to edit label & icon per row."
          >
            <FeatureRowsEditor
              rows={featureRows}
              presets={featurePresets}
              onChange={(rows) => set({ featureRows: rows })}
            />
          </Field>
          <Field label="Image">
            <SingleImageUpload
              slug={slug}
              value={unit.image}
              onChange={(image) => set({ image })}
              disabled={!canUpload}
            />
          </Field>
          <Field label="Floor plan" hint="Optional image or PDF shown on the unit card.">
            <UnitFileUpload
              slug={slug}
              value={unit.attachment}
              label="floor plan"
              onChange={(attachment) => set({ attachment })}
              disabled={!canUpload}
            />
          </Field>
        </div>
      )}
    </div>
  );
}

/* ---------- Video row ---------- */
function VideoRow({
  video,
  onChange,
  onUp,
  onDown,
  onRemove,
}: {
  video: Video;
  onChange: (v: Video) => void;
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
}) {
  const [raw, setRaw] = useState(video.youtube_id);
  const id = useMemo(() => extractYouTubeId(raw), [raw]);

  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex items-start gap-2">
        <div className="flex-1 space-y-2">
          <Field label="Title (optional)">
            <Input
              value={video.title ?? ""}
              onChange={(e) => onChange({ ...video, title: e.target.value })}
            />
          </Field>
          <Field label="YouTube URL">
            <Input
              value={raw}
              placeholder="https://youtu.be/… or watch?v=…"
              onChange={(e) => {
                setRaw(e.target.value);
                onChange({ ...video, youtube_id: extractYouTubeId(e.target.value) ?? "" });
              }}
            />
          </Field>
          {raw && !id && (
            <p className="text-xs text-destructive">Could not detect a valid YouTube id.</p>
          )}
        </div>
        <MoveRemove onUp={onUp} onDown={onDown} onRemove={onRemove} />
      </div>
      {id && (
        <img
          src={`https://img.youtube.com/vi/${id}/mqdefault.jpg`}
          alt="YouTube thumbnail"
          className="mt-2 h-24 rounded object-cover"
        />
      )}
    </div>
  );
}
