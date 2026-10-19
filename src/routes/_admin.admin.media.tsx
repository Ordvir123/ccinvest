import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Copy, FileText, Loader2, Trash2, Upload } from "lucide-react";

import { Section } from "@/components/ui/section";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/lib/image-compress";
import { deleteMedia, uploadMedia } from "@/lib/media";
import { SITE_ORIGIN } from "@/lib/site";

export const Route = createFileRoute("/_admin/admin/media")({
  component: MediaView,
});

type MediaRow = {
  id: string;
  key: string;
  url: string;
  folder: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  created_at: string;
};

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const cleanFolder = (s: string) =>
  s.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

/**
 * Media library: upload all of a page's photos/PDFs into one folder (the page
 * slug). Claude reads this folder from the `media` table when building the page.
 */
function MediaView() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [folder, setFolder] = useState("");
  const [busy, setBusy] = useState<{ done: number; total: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const slug = cleanFolder(folder);

  const { data: slugs = [] } = useQuery({
    queryKey: ["page-slugs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("pages")
        .select("slug")
        .neq("slug", "__template_settings__")
        .order("updated_at", { ascending: false });
      return (data ?? []).map((r) => r.slug as string);
    },
  });

  const { data: files = [], isLoading } = useQuery({
    queryKey: ["media", slug],
    enabled: slug.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("media")
        .select("*")
        .eq("folder", slug)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as MediaRow[];
    },
  });

  const upload = useCallback(
    async (list: File[]) => {
      if (!slug) {
        toast.error(t("media.needFolder"));
        return;
      }
      const accepted = list.filter((f) => ACCEPTED.includes(f.type));
      if (accepted.length === 0) return;
      setBusy({ done: 0, total: accepted.length });
      let failed = 0;
      for (const [i, file] of accepted.entries()) {
        try {
          const toUpload = file.type === "application/pdf" ? file : await compressImage(file);
          await uploadMedia(toUpload, slug);
        } catch (err) {
          failed += 1;
          console.error(err);
        }
        setBusy({ done: i + 1, total: accepted.length });
      }
      setBusy(null);
      await qc.invalidateQueries({ queryKey: ["media", slug] });
      if (failed) toast.error(t("media.someFailed", { count: failed }));
      else toast.success(t("media.uploaded", { count: accepted.length }));
    },
    [slug, qc, t],
  );

  // Ctrl/⌘+V anywhere on the page pastes images into the current folder.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const pasted = Array.from(e.clipboardData?.files ?? []);
      if (pasted.length) {
        e.preventDefault();
        void upload(pasted);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [upload]);

  const remove = async (row: MediaRow) => {
    if (!confirm(t("media.confirmDelete"))) return;
    await deleteMedia(row.url);
    await qc.invalidateQueries({ queryKey: ["media", slug] });
  };

  return (
    <Section>
      <h1 className="mb-2 font-display text-3xl">{t("media.title")}</h1>
      <p className="mb-8 max-w-2xl text-muted-foreground">{t("media.intro")}</p>

      <label className="mb-2 block text-sm font-medium" htmlFor="media-folder">
        {t("media.folder")}
      </label>
      <Input
        id="media-folder"
        list="media-slugs"
        dir="ltr"
        className="mb-1 max-w-md"
        placeholder="rue-allenby"
        value={folder}
        onChange={(e) => setFolder(e.target.value)}
      />
      <datalist id="media-slugs">
        {slugs.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      {slug && slug !== folder.trim() && (
        <p className="mb-4 text-xs text-muted-foreground" dir="ltr">
          → {slug}
        </p>
      )}

      <button
        type="button"
        disabled={!slug || !!busy}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void upload(Array.from(e.dataTransfer.files));
        }}
        className={`mt-4 flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-10 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
          dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/60"
        }`}
      >
        {busy ? (
          <>
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>
              {busy.done} / {busy.total}
            </span>
          </>
        ) : (
          <>
            <Upload className="h-6 w-6" />
            <span className="font-medium">{t("media.drop")}</span>
            <span className="text-xs text-muted-foreground">JPG · PNG · WEBP · PDF</span>
          </>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED.join(",")}
        className="hidden"
        onChange={(e) => {
          void upload(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />

      {slug && (
        <div className="mt-10">
          <h2 className="mb-4 text-lg font-medium">
            {t("media.inFolder", { count: files.length })}{" "}
            <span className="font-mono text-sm text-muted-foreground" dir="ltr">
              {slug}
            </span>
          </h2>
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {files.map((f) => (
                <Card key={f.id} className="overflow-hidden">
                  <div className="aspect-[4/3] bg-muted">
                    {f.content_type.startsWith("image/") ? (
                      <img src={f.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <FileText className="h-10 w-10 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <CardContent className="flex items-center gap-1 p-2">
                    <span className="min-w-0 flex-1 truncate text-xs" dir="ltr" title={f.filename}>
                      {f.filename}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      aria-label={t("media.copy")}
                      onClick={() => {
                        void navigator.clipboard.writeText(`${SITE_ORIGIN}${f.url}`);
                        toast.success(t("media.copied"));
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive"
                      aria-label={t("media.delete")}
                      onClick={() => void remove(f)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </Section>
  );
}
