import { useState } from "react";
import { toast } from "sonner";
import {
  Save,
  Globe,
  EyeOff,
  Eye,
  Copy,
  ExternalLink,
  RefreshCw,
  Monitor,
  PencilLine,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

import { SectionCard } from "@/components/admin/editor-parts";
import { TranslationsTab } from "@/components/admin/TranslationsTab";
import { SeoEditor } from "@/components/admin/SeoEditor";
import { AiCorrectionsPanel } from "@/components/admin/AiCorrectionsPanel";
import { cleanContent } from "@/lib/pages";
import { READING_LANGS, type Page, type PageContent, type ReadingLang } from "@/types/page";

import {
  usePageEditorState,
  isSectionHidden,
  SECTION_LABELS,
  type SectionKey,
} from "@/components/admin/editor/usePageEditorState";
import { HeroSection } from "@/components/admin/editor/HeroSection";
import { AboutSection, StatsBody } from "@/components/admin/editor/AboutSection";
import { ListingBody } from "@/components/admin/editor/UnitsSection";
import { GallerySection, WideImagesSection } from "@/components/admin/editor/GallerySection";
import { VideosSection } from "@/components/admin/editor/VideosSection";
import { LocationSection } from "@/components/admin/editor/LocationSection";
import { ContactSection } from "@/components/admin/editor/ContactSection";
import { MetaSection } from "@/components/admin/editor/MetaSection";
import { EditorPreview } from "@/components/admin/editor/EditorPreview";
import { SectionManager } from "@/components/admin/editor/SectionManager";

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
  const s = usePageEditorState({ initialPage, initialContent, initialSourceLang });
  const {
    isEdit,
    pageId,
    slug,
    sourceLang,
    status,
    publishing,
    content,
    setContent,
    seo,
    setSeo,
    saving,
    settings,
    listingIsProject,
    onSave,
    liveUrl,
    onPublish,
    onUnpublish,
    copyShareLink,
    orderedKeys,
    patch,
    toggleSection,
  } = s;

  // Mobile (<md) shows either the preview or the editor; md+ shows both panes.
  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");
  // Briefly highlight a section's editor card after it's selected in the preview.
  const [highlightKey, setHighlightKey] = useState<SectionKey | null>(null);

  const scrollToSection = (key: SectionKey) => {
    setMobileView("edit");
    // Defer so the editor pane is visible before scrolling (mobile toggle).
    requestAnimationFrame(() => {
      const el = document.getElementById(`editor-card-${key}`);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
      setHighlightKey(key);
      window.setTimeout(() => setHighlightKey((k) => (k === key ? null : k)), 1500);
    });
  };



  const sectionBodies: Record<
    SectionKey,
    { title: string; description?: string; defaultOpen?: boolean; body: React.ReactNode }
  > = {
    stats: {
      title: SECTION_LABELS.stats,
      description: "Repeatable value + label rows. Icons auto-match the label; override per row.",
      defaultOpen: true,
      body: <StatsBody s={s} />,
    },
    location: {
      title: SECTION_LABELS.location,
      defaultOpen: false,
      body: <LocationSection s={s} />,
    },
    listing: {
      title: listingIsProject ? "Units" : "About the apartment",
      description: listingIsProject
        ? "Repeatable apartment blocks."
        : "The single apartment shown on this page.",
      defaultOpen: !listingIsProject,
      body: <ListingBody s={s} />,
    },
    gallery: {
      title: SECTION_LABELS.gallery,
      defaultOpen: false,
      body: <GallerySection s={s} />,
    },
    wide_images: {
      title: SECTION_LABELS.wide_images,
      description: "Full-width images, stacked one under another across the whole screen.",
      defaultOpen: false,
      body: <WideImagesSection s={s} />,
    },
    videos: {
      title: SECTION_LABELS.videos,
      description: "YouTube links (any format).",
      defaultOpen: false,
      body: <VideosSection s={s} />,
    },
    contact: {
      title: SECTION_LABELS.contact,
      defaultOpen: false,
      body: <ContactSection s={s} />,
    },
  };

  const formPanel = (
    <div className="space-y-4">
      <AiCorrectionsPanel content={content} setContent={setContent} sourceLang={sourceLang} />

      <SectionCard title="Page meta">
        <MetaSection s={s} />
      </SectionCard>

      <SectionCard title="Hero">
        <HeroSection s={s} />
      </SectionCard>

      <SectionCard title="About" defaultOpen={false}>
        <AboutSection s={s} />
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
