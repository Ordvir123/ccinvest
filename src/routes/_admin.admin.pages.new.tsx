import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Sparkles,
  PencilLine,
  Loader2,
  Building2,
  Home,
  UploadCloud,
  FileText,
  X,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";

import { PageEditor } from "@/components/admin/PageEditor";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  extractPageFromText,
  mergeAiContent,
  type ExtractCategory,
  type CopyMode,
  type ExtractAsset,
} from "@/lib/extract-page";
import { supabase } from "@/integrations/supabase/client";
import { PAGE_MEDIA_BUCKET, removePageMedia } from "@/lib/pages";
import { compressImage } from "@/lib/image-compress";
import type { PageContent } from "@/types/page";

export const Route = createFileRoute("/_admin/admin/pages/new")({
  component: NewPage,
});

type Mode = "choose" | "ai" | "manual";

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const PDF_TYPE = "application/pdf";
const MAX_IMAGES = 15;
const MAX_PDFS = 3;
const MAX_PDF_BYTES = 20 * 1024 * 1024; // 20MB

type AssetKind = "image" | "pdf";
type AssetStatus = "uploading" | "done" | "error";

type DraftAsset = {
  id: string;
  file: File;
  kind: AssetKind;
  filename: string;
  status: AssetStatus;
  url?: string;
  previewUrl?: string; // object URL for image thumbnails
  error?: string;
};

async function uploadDraftFile(file: File, kind: AssetKind): Promise<string> {
  const toUpload = kind === "image" ? await compressImage(file) : file;
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const folder = `drafts/${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const path = `${folder}/${safeName}`;
  const { error } = await supabase.storage
    .from(PAGE_MEDIA_BUCKET)
    .upload(path, toUpload, { cacheControl: "3600", upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from(PAGE_MEDIA_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

function NewPage() {
  const [mode, setMode] = useState<Mode>("choose");
  const [text, setText] = useState("");
  const [category, setCategory] = useState<ExtractCategory>("project");
  const [copyMode, setCopyMode] = useState<CopyMode>("strict");
  const [processing, setProcessing] = useState(false);
  const [prefill, setPrefill] = useState<PageContent | null>(null);
  const [assets, setAssets] = useState<DraftAsset[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [unplaced, setUnplaced] = useState<string[]>([]);
  const [unplacedDismissed, setUnplacedDismissed] = useState(false);
  const [emptyFields, setEmptyFields] = useState<string[]>([]);
  const [emptyFieldsDismissed, setEmptyFieldsDismissed] = useState(false);
  const [detectedCategory, setDetectedCategory] = useState<ExtractCategory>("project");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const setAsset = (id: string, patch: Partial<DraftAsset>) =>
    setAssets((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));

  const startUpload = async (asset: DraftAsset) => {
    setAsset(asset.id, { status: "uploading", error: undefined });
    try {
      const url = await uploadDraftFile(asset.file, asset.kind);
      setAsset(asset.id, { status: "done", url });
    } catch (err) {
      setAsset(asset.id, {
        status: "error",
        error: err instanceof Error ? err.message : "Upload failed.",
      });
    }
  };

  const addFiles = (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    // Current counts to enforce limits across successive drops.
    let imageCount = assets.filter((a) => a.kind === "image").length;
    let pdfCount = assets.filter((a) => a.kind === "pdf").length;
    const toAdd: DraftAsset[] = [];

    for (const file of files) {
      const isImage = ACCEPTED_IMAGE_TYPES.includes(file.type);
      const isPdf = file.type === PDF_TYPE;
      if (!isImage && !isPdf) {
        toast.error(`${file.name}: unsupported type. Use JPG, PNG, WEBP or PDF.`);
        continue;
      }
      if (isImage) {
        if (imageCount >= MAX_IMAGES) {
          toast.error(`Max ${MAX_IMAGES} images.`);
          continue;
        }
        imageCount++;
      } else {
        if (pdfCount >= MAX_PDFS) {
          toast.error(`Max ${MAX_PDFS} PDFs.`);
          continue;
        }
        if (file.size > MAX_PDF_BYTES) {
          toast.error(`${file.name}: PDF exceeds 20MB.`);
          continue;
        }
        pdfCount++;
      }
      toAdd.push({
        id: crypto.randomUUID(),
        file,
        kind: isImage ? "image" : "pdf",
        filename: file.name,
        status: "uploading",
        previewUrl: isImage ? URL.createObjectURL(file) : undefined,
      });
    }

    if (!toAdd.length) return;
    setAssets((prev) => [...prev, ...toAdd]);
    // Kick off uploads.
    toAdd.forEach((a) => void startUpload(a));
  };

  const removeAsset = (id: string) => {
    setAssets((prev) => {
      const target = prev.find((a) => a.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      if (target?.url) void removePageMedia(target.url); // best-effort cleanup
      return prev.filter((a) => a.id !== id);
    });
  };

  const runAi = async () => {
    const uploading = assets.some((a) => a.status === "uploading");
    if (uploading) {
      toast.error("Wait for uploads to finish.");
      return;
    }
    const readyAssets: ExtractAsset[] = assets
      .filter((a) => a.status === "done" && a.url)
      .map((a) => ({ url: a.url!, kind: a.kind, filename: a.filename }));

    if (!text.trim() && readyAssets.length === 0) {
      toast.error("Paste some text or add at least one file.");
      return;
    }

    setProcessing(true);
    try {
      const {
        content,
        unplaced: unplacedUrls,
        emptyFields: empties,
        detectedCategory: detected,
      } = await extractPageFromText(text, {
        category,
        copyMode,
        assets: readyAssets,
      });
      setPrefill(mergeAiContent(content, detected));
      setUnplaced(unplacedUrls);
      setUnplacedDismissed(false);
      setEmptyFields(empties);
      setEmptyFieldsDismissed(false);
      setDetectedCategory(detected);
      const note =
        detected !== category
          ? ` Detected this as a ${detected === "project" ? "multi-unit project" : "single apartment"}.`
          : "";
      toast.success(
        `AI built the page in French.${note} Review the empty-fields list, then translate to HE/EN.`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI extraction failed.");
    } finally {
      setProcessing(false);
    }
  };

  // Manual pages are authored in Hebrew by default (most common). The AI flow
  // detects the pasted language and always outputs French, so it stays "fr".
  if (mode === "manual") return <PageEditor initialSourceLang="he" />;
  if (prefill) {
    const unplacedItems = unplaced.map((url) => {
      const match = assets.find((a) => a.url === url);
      return { url, filename: match?.filename ?? url };
    });
    return (
      <>
        {unplacedItems.length > 0 && !unplacedDismissed && (
          <div className="mx-auto mt-4 max-w-5xl px-4 md:px-8">
            <div className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium text-foreground">
                  These files could not be placed automatically — add them manually.
                </p>
                <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  {unplacedItems.map((item) => (
                    <li key={item.url}>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary underline underline-offset-2"
                      >
                        {item.filename}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
              <button
                type="button"
                onClick={() => setUnplacedDismissed(true)}
                className="shrink-0 rounded p-1 text-muted-foreground hover:text-foreground"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
        {emptyFields.length > 0 && !emptyFieldsDismissed && (
          <div className="mx-auto mt-4 max-w-5xl px-4 md:px-8">
            <div className="flex items-start gap-3 rounded-lg border border-sky-500/40 bg-sky-500/10 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium text-foreground">
                  The source didn't state these fields — complete them manually (
                  {detectedCategory === "project" ? "project" : "apartment"}):
                </p>
                <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  {emptyFields.map((f) => (
                    <li key={f} className="rounded bg-sky-500/10 px-2 py-0.5">
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <button
                type="button"
                onClick={() => setEmptyFieldsDismissed(true)}
                className="shrink-0 rounded p-1 text-muted-foreground hover:text-foreground"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
        <PageEditor initialContent={prefill} initialSourceLang="fr" showAiNote />
      </>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">New page</h1>
        <p className="text-sm text-muted-foreground">
          Start from raw text with AI, or fill the form manually.
        </p>
      </header>

      {/* Mode toggle */}
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setMode("ai")}
          className={cn(
            "flex items-start gap-3 rounded-lg border p-4 text-left transition",
            mode === "ai"
              ? "border-primary bg-primary/5 ring-1 ring-primary"
              : "border-border hover:border-primary/50",
          )}
        >
          <Sparkles className="mt-0.5 h-5 w-5 text-primary" />
          <span>
            <span className="block font-medium text-foreground">Start from text (AI)</span>
            <span className="block text-sm text-muted-foreground">
              Paste a property description; AI fills what it finds.
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => setMode("manual")}
          className={cn(
            "flex items-start gap-3 rounded-lg border p-4 text-left transition",
            "border-border hover:border-primary/50",
          )}
        >
          <PencilLine className="mt-0.5 h-5 w-5 text-primary" />
          <span>
            <span className="block font-medium text-foreground">Fill manually</span>
            <span className="block text-sm text-muted-foreground">
              Start with an empty form and enter everything yourself.
            </span>
          </span>
        </button>
      </div>

      {mode === "ai" && (
        <div className="space-y-4 rounded-lg border border-border p-4">
          <div className="grid gap-4 md:grid-cols-[1fr_auto]">
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">
                Paste the property text in any language
              </label>
              <p className="text-xs text-muted-foreground">
                The language is detected automatically and the page is built in French.
              </p>
            </div>
            <div className="space-y-1">
              <span className="block text-sm font-medium text-foreground">Property type</span>
              <div className="inline-flex rounded-md border border-border p-1">
                <button
                  type="button"
                  onClick={() => setCategory("apartment")}
                  className={cn(
                    "flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition",
                    category === "apartment"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Home className="h-4 w-4" /> Apartments
                </button>
                <button
                  type="button"
                  onClick={() => setCategory("project")}
                  className={cn(
                    "flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition",
                    category === "project"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Building2 className="h-4 w-4" /> Projects
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                {category === "apartment"
                  ? "Single listing (/appartements) — one apartment section."
                  : "Building (/projects) — repeatable units section."}
              </p>
            </div>
          </div>

          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste the raw property description here…"
            rows={10}
            className="resize-y"
          />

          {/* Copy mode toggle */}
          <div className="space-y-2">
            <span className="block text-sm font-medium text-foreground">Writing mode</span>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setCopyMode("strict")}
                className={cn(
                  "rounded-lg border p-3 text-left transition",
                  copyMode === "strict"
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:border-primary/50",
                )}
              >
                <span className="block text-sm font-medium text-foreground">Strict extract</span>
                <span className="block text-xs text-muted-foreground">
                  Only facts from the inputs — no rewriting.
                </span>
              </button>
              <button
                type="button"
                onClick={() => setCopyMode("enhanced")}
                className={cn(
                  "rounded-lg border p-3 text-left transition",
                  copyMode === "enhanced"
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:border-primary/50",
                )}
              >
                <span className="block text-sm font-medium text-foreground">Enhanced copy</span>
                <span className="block text-xs text-muted-foreground">
                  Refined luxury tone; facts still from inputs only.
                </span>
              </button>
            </div>
          </div>

          {/* Dropzone */}
          <div className="space-y-2">
            <span className="block text-sm font-medium text-foreground">
              Images &amp; brochures (optional)
            </span>
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
              }}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition",
                dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
              )}
            >
              <UploadCloud className="h-6 w-6 text-muted-foreground" />
              <p className="text-sm text-foreground">
                Drag &amp; drop files here, or click to select
              </p>
              <p className="text-xs text-muted-foreground">
                JPG, PNG, WEBP, PDF · up to {MAX_IMAGES} images and {MAX_PDFS} PDFs (PDF max 20MB)
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) addFiles(e.target.files);
                e.target.value = ""; // allow re-selecting the same file
              }}
            />

            {assets.length > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {assets.map((a) => (
                  <div
                    key={a.id}
                    className="relative overflow-hidden rounded-lg border border-border bg-card"
                  >
                    <button
                      type="button"
                      onClick={() => removeAsset(a.id)}
                      className="absolute right-1 top-1 z-10 rounded-full bg-background/80 p-1 text-muted-foreground shadow hover:text-foreground"
                      aria-label={`Remove ${a.filename}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>

                    {a.kind === "image" && a.previewUrl ? (
                      <div className="aspect-video w-full bg-muted">
                        <img
                          src={a.previewUrl}
                          alt={a.filename}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex aspect-video w-full items-center justify-center bg-muted">
                        <FileText className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}

                    <div className="space-y-1 p-2">
                      <p className="truncate text-xs text-foreground" title={a.filename}>
                        {a.filename}
                      </p>
                      {a.status === "uploading" && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" /> Uploading…
                        </div>
                      )}
                      {a.status === "uploading" && (
                        <div className="h-1 w-full overflow-hidden rounded bg-muted">
                          <div className="h-full w-1/2 animate-pulse rounded bg-primary" />
                        </div>
                      )}
                      {a.status === "done" && (
                        <p className="text-xs text-emerald-600">Uploaded</p>
                      )}
                      {a.status === "error" && (
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-xs text-destructive">
                            {a.error ?? "Failed"}
                          </span>
                          <button
                            type="button"
                            onClick={() => void startUpload(a)}
                            className="flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            <RotateCcw className="h-3 w-3" /> Retry
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button type="button" onClick={runAi} disabled={processing}>
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Processing…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Process with AI
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            AI extracts only facts present in the inputs and writes the page in French.
            Use the Translations tab for Hebrew and English. Missing fields stay empty
            for you to complete. Nothing is saved or published automatically.
          </p>
        </div>
      )}
    </div>
  );
}
