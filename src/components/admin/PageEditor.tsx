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
    about: {
      title: SECTION_LABELS.about,
      defaultOpen: false,
      body: <AboutSection s={s} />,
    },
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

      <SectionManager
        orderedKeys={orderedKeys}
        content={content}
        onReorder={(next) => patch({ section_order: next })}
        onToggle={toggleSection}
        onSelect={scrollToSection}
      />

      <SectionCard title="Page meta">
        <MetaSection s={s} />
      </SectionCard>

      <SectionCard title="Hero">
        <HeroSection s={s} />
      </SectionCard>



      {orderedKeys.map((key) => {
        const meta = sectionBodies[key];
        return (
          <div
            key={key}
            id={`editor-card-${key}`}
            className={cn(
              "scroll-mt-4 rounded-lg transition-shadow",
              highlightKey === key && "ring-2 ring-primary ring-offset-2 ring-offset-background",
            )}
          >
            <SectionCard
              title={meta.title}
              description={meta.description}
              defaultOpen={meta.defaultOpen}
              visible={!isSectionHidden(content, key)}
              onToggleVisible={() => toggleSection(key)}
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
    <div className="flex h-full min-h-screen flex-col md:h-screen md:min-h-0 md:overflow-hidden">
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
      <Tabs defaultValue="editor" className="flex-1 md:flex md:min-h-0 md:flex-col">
        <div className="border-b border-border px-4 pt-3 md:px-6">
          <TabsList>
            <TabsTrigger value="editor">Editor</TabsTrigger>
            <TabsTrigger value="translations">Translations</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="editor" className="mt-0 md:flex md:min-h-0 md:flex-1 md:flex-col">
          {/* Mobile Preview/Edit toggle (<md) */}
          <div className="flex items-center gap-1 border-b border-border p-3 md:hidden">
            <Button
              type="button"
              size="sm"
              variant={mobileView === "edit" ? "secondary" : "ghost"}
              onClick={() => setMobileView("edit")}
            >
              <PencilLine className="h-4 w-4" /> Edit
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mobileView === "preview" ? "secondary" : "ghost"}
              onClick={() => setMobileView("preview")}
            >
              <Monitor className="h-4 w-4" /> Preview
            </Button>
          </div>

          {/* md+: fixed-height row, each pane scrolls independently. */}
          <div className="md:flex md:min-h-0 md:flex-1 md:items-stretch">
            {/* LEFT: live preview — fills the row height, scrolls internally. */}
            <div
              className={cn(
                "md:h-full md:w-1/2 md:overflow-hidden md:border-r md:border-border",
                mobileView === "preview" ? "block h-[calc(100vh-8rem)]" : "hidden md:block",
              )}
            >
              <EditorPreview
                content={content}
                lang={(sourceLang as ReadingLang) ?? "fr"}
                settings={settings}
                onSelect={scrollToSection}
              />
            </div>

            {/* RIGHT: editor panel — its own scroll container (anchor scrolling
                targets this element, not the window). */}
            <div
              id="editor-form-scroll"
              className={cn(
                "min-w-0 flex-1 p-4 md:h-full md:w-1/2 md:overflow-y-auto md:p-6",
                mobileView === "preview" && "hidden md:block",
              )}
            >
              <div className="mx-auto max-w-3xl">{formPanel}</div>
            </div>
          </div>

        </TabsContent>


        <TabsContent
          value="translations"
          className="mt-0 p-4 md:min-h-0 md:flex-1 md:overflow-y-auto md:p-6"
        >
          <TranslationsTab pageId={pageId} source={cleanContent(content)} sourceLang={sourceLang} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
