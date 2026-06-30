import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Plus, Trash2, ArrowUp, ArrowDown, Save, Globe, EyeOff, Copy, ExternalLink, Monitor, Smartphone, RefreshCw, Sparkles, Loader2 } from "lucide-react";
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

import { PageRenderer } from "@/components/page/PageRenderer";
import { SectionCard, Field } from "@/components/admin/editor-parts";
import { SingleImageUpload, GalleryUpload, UnitFileUpload } from "@/components/admin/MediaUpload";
import { IconPicker } from "@/components/admin/IconPicker";
import {
  UNIT_TYPES,
  ORIENTATION_CODES,
  PARKING_CODES,
  UNIT_TYPE_OPTION_LABELS,
  ORIENTATION_OPTION_LABELS,
  PARKING_OPTION_LABELS,
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
import { applyAiEdit, type EditLang } from "@/lib/edit-page";
import {
  READING_LANGS,
  isRtlReading,
  normalizeSeo,
  type Page,
  type PageContent,
  type PageSeo,
  type PageStatus,
  type ReadingLang,
  type Stat,
  type Unit,
  type Video,
} from "@/types/page";

const SOURCE_LANGS = ["fr", "he", "en"] as const;
const SITE_ORIGIN = "https://ccinvest.lovable.app";

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
    initialPage?.source_lang ?? initialSourceLang ?? "fr",
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
    normalizeSeo(initialPage?.seo, initialPage?.source_lang ?? initialSourceLang ?? "fr"),
  );
  const [previewLang, setPreviewLang] = useState<ReadingLang>(
    (initialPage?.source_lang as ReadingLang) ?? (initialSourceLang as ReadingLang) ?? "fr",
  );
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [saving, setSaving] = useState(false);

  // AI corrections (apply a natural-language change to the current content).
  const [aiInstruction, setAiInstruction] = useState("");
  const [aiRunning, setAiRunning] = useState(false);
  const [aiUndo, setAiUndo] = useState<PageContent | null>(null);

  const runAiEdit = async () => {
    if (!aiInstruction.trim()) {
      toast.error("Describe the change you want first.");
      return;
    }
    setAiRunning(true);
    const before = content;
    try {
      const next = await applyAiEdit(content, aiInstruction.trim(), sourceLang as EditLang);
      setContent(next);
      setAiUndo(before);
      setAiInstruction("");
      toast.success("AI applied your change. Review the preview, then save.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI edit failed.");
    } finally {
      setAiRunning(false);
    }
  };

  const undoAiEdit = () => {
    if (!aiUndo) return;
    setContent(aiUndo);
    setAiUndo(null);
    toast.success("Reverted the AI change.");
  };



  // Convenient typed updaters.
  const patch = (p: Partial<PageContent>) => setContent((c) => ({ ...c, ...p }));
  const patchHero = (p: Partial<PageContent["hero"]>) =>
    setContent((c) => ({ ...c, hero: { ...c.hero, ...p } }));
  const patchLocation = (p: Partial<NonNullable<PageContent["location"]>>) =>
    setContent((c) => ({ ...c, location: { ...c.location, ...p } }));
  const patchAbout = (p: Partial<NonNullable<PageContent["about"]>>) =>
    setContent((c) => ({ ...c, about: { ...c.about, ...p } }));

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
  const formPanel = (
    <div className="space-y-4">
      <SectionCard
        title="AI corrections"
        description="Describe a change in plain language and AI will apply it to the fields below. Review the preview, then save."
      >
        <Field
          label="Instruction"
          hint="e.g. “Change the hero subtitle to mention sea views” or “Shorten the about text”. Images and prices are preserved."
        >
          <Textarea
            rows={3}
            value={aiInstruction}
            onChange={(e) => setAiInstruction(e.target.value)}
            placeholder="Describe the correction to apply to this page…"
            disabled={aiRunning}
          />
        </Field>
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" onClick={runAiEdit} disabled={aiRunning}>
            {aiRunning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Applying…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Apply with AI
              </>
            )}
          </Button>
          {aiUndo && !aiRunning && (
            <Button type="button" size="sm" variant="outline" onClick={undoAiEdit}>
              <RefreshCw className="h-4 w-4" /> Undo AI change
            </Button>
          )}
        </div>
      </SectionCard>


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
        <Field
          label="Listing page"
          hint="Choose where this page appears on the public site."
        >
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
        <Field label="Kicker">
          <Input value={content.hero.kicker ?? ""} onChange={(e) => patchHero({ kicker: e.target.value })} />
        </Field>
        <Field label="Title" required>
          <Input value={content.hero.title} onChange={(e) => onTitleChange(e.target.value)} />
        </Field>
        <Field label="Subtitle">
          <Input value={content.hero.subtitle ?? ""} onChange={(e) => patchHero({ subtitle: e.target.value })} />
        </Field>
        <Field label="Price">
          <Input value={content.hero.price ?? ""} onChange={(e) => patchHero({ price: e.target.value })} />
        </Field>
        <Field label="CTA label">
          <Input value={content.hero.cta_label ?? ""} onChange={(e) => patchHero({ cta_label: e.target.value })} />
        </Field>
        <Field label="Background image" hint="Optional. Shown behind the hero with a dark overlay for readability.">
          <SingleImageUpload
            slug={slug}
            value={content.hero.background}
            onChange={(background) => patchHero({ background })}
            disabled={!canUpload}
          />
        </Field>
      </SectionCard>


      <SectionCard title="Stats" description="Repeatable value + label rows. Icons auto-match the label; override per row.">
        {(content.stats ?? []).map((s, i) => (
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
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => patch({ stats: [...content.stats, { value: "", label: "" } as Stat] })}
        >
          <Plus className="h-4 w-4" /> Add stat
        </Button>
      </SectionCard>

      <SectionCard title="Location" defaultOpen={false}>
        <Field label="Heading">
          <Input value={content.location?.heading ?? ""} onChange={(e) => patchLocation({ heading: e.target.value })} />
        </Field>
        <Field label="Text">
          <Textarea rows={3} value={content.location?.text ?? ""} onChange={(e) => patchLocation({ text: e.target.value })} />
        </Field>
        <Field label="Map query" hint="Used to build a Google Maps embed.">
          <Input value={content.location?.map_query ?? ""} onChange={(e) => patchLocation({ map_query: e.target.value })} />
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
      </SectionCard>

      <SectionCard title="About" defaultOpen={false}>
        <Field label="Heading">
          <Input value={content.about?.heading ?? ""} onChange={(e) => patchAbout({ heading: e.target.value })} />
        </Field>
        <Field label="Body">
          <Textarea rows={4} value={content.about?.body ?? ""} onChange={(e) => patchAbout({ body: e.target.value })} />
        </Field>
        <Field label="Features" hint="Icons auto-match the text; override per row.">
          <div className="space-y-2">
            {(content.about?.features ?? []).map((f, i) => (
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
                    const icons = (content.about?.feature_icons ?? []).filter((_, idx) => idx !== i);
                    patchAbout({
                      features: (content.about?.features ?? []).filter((_, idx) => idx !== i),
                      feature_icons: icons,
                    });
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => patchAbout({ features: [...(content.about?.features ?? []), ""] })}
            >
              <Plus className="h-4 w-4" /> Add feature
            </Button>
          </div>
        </Field>
      </SectionCard>


      <SectionCard title="Gallery" defaultOpen={false}>
        <GalleryUpload
          slug={slug}
          value={content.gallery ?? []}
          onChange={(gallery) => patch({ gallery })}
          disabled={!canUpload}
        />
      </SectionCard>

      <SectionCard title="Units" description="Repeatable apartment blocks." defaultOpen={false}>
        <div className="space-y-4">
          {(content.units ?? []).map((u, i) => (
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
              onRemove={() => patch({ units: (content.units ?? []).filter((_, idx) => idx !== i) })}
            />
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => patch({ units: [...(content.units ?? []), { name: "" } as Unit] })}
          >
            <Plus className="h-4 w-4" /> Add unit
          </Button>
        </div>
      </SectionCard>

      <SectionCard title="Videos" description="YouTube links (any format)." defaultOpen={false}>
        <div className="space-y-3">
          {(content.videos ?? []).map((v, i) => (
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
              onRemove={() => patch({ videos: (content.videos ?? []).filter((_, idx) => idx !== i) })}
            />
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => patch({ videos: [...(content.videos ?? []), { youtube_id: "" } as Video] })}
          >
            <Plus className="h-4 w-4" /> Add video
          </Button>
        </div>
      </SectionCard>

      <SectionCard title="Contact" defaultOpen={false}>
        <Field label="Heading">
          <Input
            value={content.contact?.heading ?? ""}
            onChange={(e) => patch({ contact: { heading: e.target.value } })}
          />
        </Field>
      </SectionCard>

      <SectionCard
        title="SEO & social"
        description="Authored per language. Empty fields stay empty."
        defaultOpen={false}
      >
        <SeoEditor seo={seo} onChange={setSeo} slug={slug} content={content} />
      </SectionCard>

    </div>
  );

  /* ---------- preview panel ---------- */
  const previewPanel = (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">Reading language:</span>
          {READING_LANGS.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setPreviewLang(l)}
              className={cn(
                "rounded px-2 py-0.5 text-xs font-medium",
                previewLang === l ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
              )}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="ms-auto flex items-center gap-1 rounded-md border border-border p-0.5">
          <button
            type="button"
            onClick={() => setPreviewDevice("desktop")}
            aria-pressed={previewDevice === "desktop"}
            aria-label="Desktop preview"
            className={cn(
              "rounded px-2 py-1",
              previewDevice === "desktop" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
            )}
          >
            <Monitor className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setPreviewDevice("mobile")}
            aria-pressed={previewDevice === "mobile"}
            aria-label="Mobile preview"
            className={cn(
              "rounded px-2 py-1",
              previewDevice === "mobile" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
            )}
          >
            <Smartphone className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="max-h-[calc(100vh-12rem)] overflow-auto rounded-lg border border-border bg-muted/30 p-2">
        <div
          dir={isRtlReading(previewLang) ? "rtl" : "ltr"}
          className={cn(
            "mx-auto overflow-hidden bg-background transition-all",
            previewDevice === "mobile" ? "w-[390px] max-w-full rounded-2xl border border-border shadow-lg" : "w-full",
          )}
        >
          <PageRenderer content={content} lang={previewLang} />
        </div>
      </div>
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
          <Badge variant={status === "published" ? "default" : status === "archived" ? "outline" : "secondary"}>
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
          {/* Desktop: two panes. Mobile: tabs. */}
          <div className="hidden flex-1 gap-6 p-4 md:flex md:p-6">
            <div className="w-1/2 min-w-0">{formPanel}</div>
            <div className="w-1/2 min-w-0">{previewPanel}</div>
          </div>

          <div className="flex-1 p-4 md:hidden">
            <Tabs defaultValue="form">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="form">Form</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>
              <TabsContent value="form" className="mt-4">
                {formPanel}
              </TabsContent>
              <TabsContent value="preview" className="mt-4">
                {previewPanel}
              </TabsContent>
            </Tabs>
          </div>
        </TabsContent>

        <TabsContent value="translations" className="mt-0 p-4 md:p-6">
          <TranslationsTab
            pageId={pageId}
            source={cleanContent(content)}
            sourceLang={sourceLang}
          />
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
}: {
  index: number;
  unit: Unit;
  slug: string;
  canUpload: boolean;
  onChange: (u: Unit) => void;
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(true);
  const set = (p: Partial<Unit>) => onChange({ ...unit, ...p });
  const numericFields: [keyof Unit, string, boolean, string][] = [
    // [key, label, allowDecimal, placeholder]
    ["floor", "Floor (number only, 0 = ground)", false, "1"],
    ["rooms", "Rooms (number only)", false, "2"],
    ["area_m2", "Area (m², number only)", true, "61"],
    ["balcony_m2", "Balcony (m², number only)", true, "6.5"],
  ];
  const sanitizeNumeric = (val: string, allowDecimal: boolean) => {
    let s = val.replace(/[^\d.,]/g, "").replace(",", ".");
    if (!allowDecimal) return s.replace(/\./g, "");
    const parts = s.split(".");
    if (parts.length > 2) s = parts[0] + "." + parts.slice(1).join("");
    return s;
  };
  const NONE = "__none__";
  const title =
    (unit.unit_type
      ? `${UNIT_TYPE_OPTION_LABELS[unit.unit_type]}${unit.unit_number ? " " + unit.unit_number : ""}`
      : unit.name?.trim()) || `Unit ${index + 1}`;

  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <button type="button" className="text-sm font-medium text-foreground" onClick={() => setOpen((v) => !v)}>
          {title}
        </button>
        <MoveRemove onUp={onUp} onDown={onDown} onRemove={onRemove} />
      </div>
      {open && (
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Unit type">
              <Select
                value={unit.unit_type ?? NONE}
                onValueChange={(v) =>
                  set({ unit_type: v === NONE ? undefined : (v as Unit["unit_type"]) })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>— (use custom name)</SelectItem>
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
                value={unit.unit_number ?? ""}
                onChange={(e) => set({ unit_number: e.target.value })}
                placeholder="4"
              />
            </Field>
          </div>
          {!unit.unit_type && (
            <Field label="Custom name" hint="Used when no unit type is selected.">
              <Input value={unit.name} onChange={(e) => set({ name: e.target.value })} />
            </Field>
          )}
          <div className="grid grid-cols-2 gap-2">
            {numericFields.map(([key, label]) => (
              <Field key={key} label={label}>
                <Input
                  inputMode="numeric"
                  value={(unit[key] as string) ?? ""}
                  onChange={(e) => set({ [key]: e.target.value } as Partial<Unit>)}
                />
              </Field>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Orientation">
              <Select
                value={unit.orientation ?? NONE}
                onValueChange={(v) => set({ orientation: v === NONE ? undefined : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>—</SelectItem>
                  {ORIENTATION_CODES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {ORIENTATION_OPTION_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Parking">
              <Select
                value={unit.parking ?? NONE}
                onValueChange={(v) => set({ parking: v === NONE ? undefined : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>—</SelectItem>
                  {PARKING_CODES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {PARKING_OPTION_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Price">
            <Input value={unit.price ?? ""} onChange={(e) => set({ price: e.target.value })} />
          </Field>
          <Field label="Description">
            <Textarea rows={2} value={unit.description ?? ""} onChange={(e) => set({ description: e.target.value })} />
          </Field>
          <Field label="Features">
            <div className="space-y-2">
              {(unit.features ?? []).map((f, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={f}
                    onChange={(e) => {
                      const next = (unit.features ?? []).slice();
                      next[i] = e.target.value;
                      set({ features: next });
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => set({ features: (unit.features ?? []).filter((_, idx) => idx !== i) })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => set({ features: [...(unit.features ?? []), ""] })}>
                <Plus className="h-4 w-4" /> Add feature
              </Button>
            </div>
          </Field>
          <Field label="Image">
            <SingleImageUpload slug={slug} value={unit.image} onChange={(image) => set({ image })} disabled={!canUpload} />
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
            <Input value={video.title ?? ""} onChange={(e) => onChange({ ...video, title: e.target.value })} />
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
          {raw && !id && <p className="text-xs text-destructive">Could not detect a valid YouTube id.</p>}
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
