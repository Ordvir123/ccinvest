import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ChevronDown, Copy, FileText, Filter, Loader2, PencilLine, Trash2, Upload } from "lucide-react";

import { Section } from "@/components/ui/section";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/lib/image-compress";
import { deleteMedia, uploadMedia } from "@/lib/media";
import { responsiveProps } from "@/lib/responsive-image";
import { SITE_ORIGIN } from "@/lib/site";

type Search = { page?: string };

export const Route = createFileRoute("/_admin/admin/media")({
  validateSearch: (s: Record<string, unknown>): Search =>
    typeof s.page === "string" ? { page: s.page } : {},
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
  page_id: string | null;
  kind: "photo" | "plan" | "document" | null;
  width: number | null;
  height: number | null;
  created_at: string;
};

type PageOption = { id: string; slug: string; title: string; status: string };

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const NEW_PAGE = "__new__";
const UNASSIGNED = "__none__";
const cleanFolder = (s: string) =>
  s.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

/**
 * Media library. Upload straight into a page's media (or a folder for a page
 * Claude hasn't created yet — it is linked automatically when the page with
 * that slug appears). Browse all media, filtered by one or more pages.
 */
function MediaView() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const search = Route.useSearch();
  const [target, setTarget] = useState<string>(search.page ?? "");
  const [newFolder, setNewFolder] = useState("");
  const [filter, setFilter] = useState<string[]>(search.page ? [search.page] : []);
  const [busy, setBusy] = useState<{ done: number; total: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: pages = [] } = useQuery({
    queryKey: ["media-pages"],
    queryFn: async (): Promise<PageOption[]> => {
      const { data } = await supabase
        .from("pages")
        .select("id, slug, status, content")
        .neq("slug", "__template_settings__")
        .order("updated_at", { ascending: false });
      return (data ?? []).map((p) => ({
        id: p.id as string,
        slug: p.slug as string,
        status: p.status as string,
        title:
          ((p.content as { hero?: { title?: string } } | null)?.hero?.title || "").trim() ||
          (p.slug as string),
      }));
    },
  });
  const pageById = useMemo(() => new Map(pages.map((p) => [p.id, p])), [pages]);

  const { data: files = [], isLoading } = useQuery({
    queryKey: ["media-all"],
    queryFn: async (): Promise<MediaRow[]> => {
      const { data, error } = await supabase
        .from("media")
        .select("id, key, url, folder, filename, content_type, size_bytes, page_id, kind, width, height, created_at")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as MediaRow[];
    },
  });

  // Where an upload goes: an existing page, or a folder named after a future page.
  const folderSlug = target === NEW_PAGE ? cleanFolder(newFolder) : pageById.get(target)?.slug ?? "";
  const targetPageId = target && target !== NEW_PAGE ? target : undefined;
  const canUpload = !!folderSlug;

  const upload = useCallback(
    async (list: File[]) => {
      if (!canUpload) {
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
          await uploadMedia(toUpload, folderSlug, { pageId: targetPageId });
        } catch (err) {
          failed += 1;
          console.error(err);
        }
        setBusy({ done: i + 1, total: accepted.length });
      }
      setBusy(null);
      await qc.invalidateQueries({ queryKey: ["media-all"] });
      if (targetPageId && !filter.includes(targetPageId) && filter.length) {
        setFilter((f) => [...f, targetPageId]);
      }
      if (failed) toast.error(t("media.someFailed", { count: failed }));
      else toast.success(t("media.uploaded", { count: accepted.length }));
    },
    [canUpload, folderSlug, targetPageId, filter, qc, t],
  );

  // Ctrl/⌘+V anywhere on the screen pastes images into the selected page.
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
    await qc.invalidateQueries({ queryKey: ["media-all"] });
  };

  // Group files by page (or by folder for files not linked to a page yet).
  const groups = useMemo(() => {
    const map = new Map<string, { key: string; label: string; page?: PageOption; rows: MediaRow[] }>();
    for (const f of files) {
      const page = f.page_id ? pageById.get(f.page_id) : undefined;
      const key = page ? page.id : `${UNASSIGNED}:${f.folder}`;
      if (!map.has(key)) {
        map.set(key, { key, page, label: page ? page.title : f.folder, rows: [] });
      }
      map.get(key)!.rows.push(f);
    }
    let list = [...map.values()];
    if (filter.length) {
      list = list.filter((g) =>
        g.page ? filter.includes(g.page.id) : filter.includes(UNASSIGNED),
      );
    }
    // Most recently uploaded group first.
    return list.sort(
      (a, b) => +new Date(b.rows[b.rows.length - 1].created_at) - +new Date(a.rows[a.rows.length - 1].created_at),
    );
  }, [files, pageById, filter]);

  const toggleFilter = (id: string) =>
    setFilter((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));

  return (
    <Section>
      <h1 className="mb-2 font-display text-3xl">{t("media.title")}</h1>
      <p className="mb-8 max-w-2xl text-muted-foreground">{t("media.intro")}</p>

      {/* ---------- Upload ---------- */}
      <div className="rounded-lg border border-border bg-card p-4 md:p-6">
        <label className="mb-2 block text-sm font-medium">{t("media.uploadTo")}</label>
        <div className="flex flex-col gap-3 md:flex-row">
          <Select value={target} onValueChange={setTarget}>
            <SelectTrigger className="md:max-w-md">
              <SelectValue placeholder={t("media.choosePage")} />
            </SelectTrigger>
            <SelectContent>
              {pages.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.title}
                  {p.status !== "published" && (
                    <span className="ms-2 text-xs text-muted-foreground">({t(`media.status.${p.status}`)})</span>
                  )}
                </SelectItem>
              ))}
              {pages.length > 0 && <SelectSeparator />}
              <SelectItem value={NEW_PAGE}>{t("media.newPage")}</SelectItem>
            </SelectContent>
          </Select>
          {target === NEW_PAGE && (
            <div className="md:max-w-xs md:flex-1">
              <Input
                dir="ltr"
                placeholder="rue-dizengoff"
                value={newFolder}
                onChange={(e) => setNewFolder(e.target.value)}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {folderSlug ? (
                  <>
                    {t("media.newPageHint")} <code dir="ltr">{folderSlug}</code>
                  </>
                ) : (
                  t("media.newPageHelp")
                )}
              </p>
            </div>
          )}
        </div>

        <button
          type="button"
          disabled={!canUpload || !!busy}
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
          className={`mt-4 flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
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
      </div>

      {/* ---------- Browse ---------- */}
      <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-medium">{t("media.library", { count: files.length })}</h2>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4" />
              {filter.length ? t("media.filtered", { count: filter.length }) : t("media.allPages")}
              <ChevronDown className="h-4 w-4 opacity-60" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 p-2">
            <div className="max-h-80 space-y-1 overflow-y-auto">
              {pages.map((p) => (
                <label key={p.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent">
                  <Checkbox checked={filter.includes(p.id)} onCheckedChange={() => toggleFilter(p.id)} />
                  <span className="truncate">{p.title}</span>
                </label>
              ))}
              <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent">
                <Checkbox checked={filter.includes(UNASSIGNED)} onCheckedChange={() => toggleFilter(UNASSIGNED)} />
                <span className="text-muted-foreground">{t("media.unassigned")}</span>
              </label>
            </div>
            {filter.length > 0 && (
              <Button variant="ghost" size="sm" className="mt-1 w-full" onClick={() => setFilter([])}>
                {t("media.clearFilter")}
              </Button>
            )}
          </PopoverContent>
        </Popover>
      </div>

      {isLoading ? (
        <Loader2 className="mt-6 h-5 w-5 animate-spin" />
      ) : groups.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">{t("media.empty")}</p>
      ) : (
        <div className="mt-4 space-y-10">
          {groups.map((g) => (
            <div key={g.key}>
              <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h3 className="font-display text-xl">{g.label}</h3>
                <span className="text-sm text-muted-foreground">
                  {t("media.files", { count: g.rows.length })}
                </span>
                {g.page ? (
                  <Link
                    to="/admin/pages/$id"
                    params={{ id: g.page.id }}
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <PencilLine className="h-3.5 w-3.5" /> {t("media.editPage")}
                  </Link>
                ) : (
                  <Badge variant="secondary">{t("media.waitingForPage")}</Badge>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {g.rows.map((f) => (
                  <MediaTile key={f.id} file={f} onRemove={() => void remove(f)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

function MediaTile({ file, onRemove }: { file: MediaRow; onRemove: () => void }) {
  const { t } = useTranslation();
  const isImage = file.content_type.startsWith("image/");
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="relative aspect-[4/3] bg-muted">
        {isImage ? (
          <img
            src={file.url}
            {...responsiveProps(file.url, "240px")}
            alt=""
            loading="lazy"
            className={`h-full w-full ${file.kind === "plan" ? "object-contain bg-white" : "object-cover"}`}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <FileText className="h-10 w-10 text-muted-foreground" />
          </div>
        )}
        {file.kind && file.kind !== "photo" && (
          <Badge className="absolute start-2 top-2" variant="secondary">
            {t(`media.kind.${file.kind}`)}
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-1 p-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs" dir="ltr" title={file.filename}>
            {file.filename}
          </p>
          {file.width && file.height && (
            <p className="text-[11px] text-muted-foreground" dir="ltr">
              {file.width}×{file.height}
            </p>
          )}
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          aria-label={t("media.copy")}
          onClick={() => {
            void navigator.clipboard.writeText(`${SITE_ORIGIN}${file.url}`);
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
          onClick={onRemove}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
