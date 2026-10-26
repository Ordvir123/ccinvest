import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";

import { Section } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/lib/image-compress";
import { uploadMedia } from "@/lib/media";

/**
 * One-off import of the published pages of the old (Lovable) site.
 * Reads the old project's public API, copies every image into R2 (compressed,
 * linked to its page) and saves each page as a draft with its translations.
 * Safe to re-run: pages whose slug already exists are skipped.
 */
export const Route = createFileRoute("/_admin/admin/import")({ component: ImportView });

const OLD_URL = "https://qhcsbatifmlmefqhmcdr.supabase.co";
// Public (publishable) key of the old project — read-only access to published pages.
const OLD_KEY = "sb_publishable_aY574gJQd_8TzgDmhJ3DrA_-ndv7dEO";
const LEGACY_RE = /https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\/[^"\s\\]+/g;
// Lovable demo / empty pages that should not come back.
const SKIP_BY_DEFAULT = new Set(["__template_settings__", "montefiore-allenby", "dizengoff"]);

type OldPage = {
  id: string;
  slug: string;
  source_lang: string;
  content: Record<string, unknown>;
  seo: Record<string, unknown> | null;
  updated_at: string;
};
type OldTranslation = {
  page_id: string;
  lang: string;
  content: Record<string, unknown>;
  locked_fields: unknown;
};

const T = {
  he: {
    title: "ייבוא מהאתר הישן",
    intro:
      "הדפים שפורסמו באתר הישן נכנסים כטיוטות, עם התרגומים. כל התמונות מועתקות ומוקטנות לאחסון החדש. דף שה-slug שלו כבר קיים — מדלגים עליו.",
    loading: "טוען את האתר הישן…",
    exists: "כבר קיים",
    images: "תמונות",
    start: "ייבוא",
    running: "מייבא",
    done: "הסתיים",
    keepOpen: "להשאיר את הדף פתוח עד הסוף.",
    failed: "נכשל",
  },
  fr: {
    title: "Import depuis l'ancien site",
    intro:
      "Les pages publiées de l'ancien site sont importées en brouillon, avec leurs traductions. Les images sont copiées et compressées. Une page dont le slug existe déjà est ignorée.",
    loading: "Chargement de l'ancien site…",
    exists: "existe déjà",
    images: "images",
    start: "Importer",
    running: "Import en cours",
    done: "Terminé",
    keepOpen: "Gardez cette page ouverte jusqu'à la fin.",
    failed: "échec",
  },
  en: {
    title: "Import from the old site",
    intro:
      "Published pages of the old site come in as drafts, with their translations. Images are copied and compressed. Pages whose slug already exists are skipped.",
    loading: "Loading the old site…",
    exists: "already exists",
    images: "images",
    start: "Import",
    running: "Importing",
    done: "Done",
    keepOpen: "Keep this page open until it finishes.",
    failed: "failed",
  },
};

async function oldGet<T>(path: string): Promise<T> {
  const res = await fetch(`${OLD_URL}/rest/v1/${path}`, {
    headers: { apikey: OLD_KEY, Authorization: `Bearer ${OLD_KEY}` },
  });
  if (!res.ok) throw new Error(`Old site: ${res.status}`);
  return (await res.json()) as T;
}

const legacyUrls = (...docs: unknown[]) =>
  [...new Set(docs.flatMap((d) => JSON.stringify(d ?? {}).match(LEGACY_RE) ?? []))];

function replaceUrls<T>(doc: T, map: Map<string, string>): T {
  let s = JSON.stringify(doc);
  for (const [from, to] of map) s = s.split(from).join(to);
  return JSON.parse(s) as T;
}

async function copyFile(url: string, slug: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const blob = await res.blob();
  const name = decodeURIComponent(url.split("/").pop() ?? "file").split("?")[0];
  const file = new File([blob], name, { type: blob.type || "application/octet-stream" });
  const toUpload = file.type.startsWith("image/") ? await compressImage(file) : file;
  return uploadMedia(toUpload, slug);
}

function ImportView() {
  const { i18n } = useTranslation();
  const t = T[(i18n.language?.slice(0, 2) as keyof typeof T) ?? "fr"] ?? T.fr;

  const [pages, setPages] = useState<OldPage[] | null>(null);
  const [translations, setTranslations] = useState<OldTranslation[]>([]);
  const [existing, setExisting] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<Record<string, string>>({});
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [old, tr, mine] = await Promise.all([
          oldGet<OldPage[]>("pages?select=id,slug,source_lang,content,seo,updated_at&status=eq.published&order=updated_at.desc"),
          oldGet<OldTranslation[]>("page_translations?select=page_id,lang,content,locked_fields"),
          supabase.from("pages").select("slug"),
        ]);
        if (mine.error) throw mine.error;
        const have = new Set((mine.data ?? []).map((r) => r.slug as string));
        setExisting(have);
        setTranslations(tr);
        setPages(old);
        setSelected(new Set(old.filter((p) => !have.has(p.slug) && !SKIP_BY_DEFAULT.has(p.slug)).map((p) => p.slug)));
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, []);

  const imageCount = useMemo(() => {
    const m: Record<string, number> = {};
    for (const p of pages ?? []) {
      const tr = translations.filter((x) => x.page_id === p.id).map((x) => x.content);
      m[p.slug] = legacyUrls(p.content, ...tr).length;
    }
    return m;
  }, [pages, translations]);

  const run = async () => {
    if (!pages) return;
    setRunning(true);
    for (const page of pages) {
      if (!selected.has(page.slug)) continue;
      const set = (s: string) => setStatus((prev) => ({ ...prev, [page.slug]: s }));
      try {
        const trs = translations.filter((x) => x.page_id === page.id);
        const urls = legacyUrls(page.content, ...trs.map((x) => x.content));
        const map = new Map<string, string>();
        let n = 0;
        for (const url of urls) {
          set(`${t.images} ${n}/${urls.length}`);
          try {
            map.set(url, await copyFile(url, page.slug));
          } catch (e) {
            console.warn("[import] image failed, keeping old URL:", url, e);
          }
          n++;
        }
        const { data: created, error: insErr } = await supabase
          .from("pages")
          .insert({
            slug: page.slug,
            status: "draft",
            source_lang: page.source_lang || "fr",
            content: replaceUrls(page.content, map),
            seo: replaceUrls(page.seo ?? {}, map),
          })
          .select("id")
          .single();
        if (insErr) throw insErr;
        if (trs.length) {
          const { error: trErr } = await supabase.from("page_translations").insert(
            trs.map((x) => ({
              page_id: created.id,
              lang: x.lang,
              content: replaceUrls(x.content, map),
              source_hash: "imported",
              locked_fields: x.locked_fields ?? [],
            })),
          );
          if (trErr) throw trErr;
        }
        const missed = urls.length - map.size;
        set(missed ? `✓ (${missed} ${t.images} ${t.failed})` : "✓");
        setExisting((prev) => new Set(prev).add(page.slug));
      } catch (e) {
        set(`${t.failed}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    setRunning(false);
    setFinished(true);
  };

  const toggle = (slug: string, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(slug);
      else next.delete(slug);
      return next;
    });

  return (
    <Section className="py-8 md:py-10">
      <h1 className="text-2xl font-semibold">{t.title}</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t.intro}</p>

      {error && <p className="mt-6 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      {!pages && !error && (
        <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> {t.loading}
        </p>
      )}

      {pages && (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button onClick={run} disabled={running || finished || selected.size === 0}>
              {running && <Loader2 className="h-4 w-4 animate-spin" />}
              {running ? t.running : finished ? t.done : `${t.start} (${selected.size})`}
            </Button>
            {running && <span className="text-sm text-muted-foreground">{t.keepOpen}</span>}
          </div>
          <ul className="mt-6 divide-y divide-border rounded-lg border border-border">
            {pages.map((p) => {
              const has = existing.has(p.slug) && !status[p.slug];
              const title = (p.content as { hero?: { title?: string } })?.hero?.title ?? "";
              return (
                <li key={p.slug} className="flex items-center gap-3 px-4 py-3 text-sm">
                  <Checkbox
                    checked={selected.has(p.slug)}
                    disabled={running || finished || has}
                    onCheckedChange={(v) => toggle(p.slug, v === true)}
                    aria-label={p.slug}
                  />
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-medium">{p.slug}</span>
                    {title && <span className="text-muted-foreground"> — {title}</span>}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {status[p.slug] ?? (has ? t.exists : `${imageCount[p.slug] ?? 0} ${t.images}`)}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Section>
  );
}
