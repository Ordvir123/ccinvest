import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Sparkles, Save, Lock, Unlock, AlertTriangle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  listTranslatableFields,
  getPath,
  setPath,
  sourceHash,
  fetchTranslationRow,
  resolveTranslation,
  saveTranslation,
} from "@/lib/translate";
import type { PageContent, ReadingLang } from "@/types/page";

export function TranslationsTab({
  pageId,
  source,
  sourceLang,
}: {
  pageId?: string;
  source: PageContent;
  sourceLang: string;
}) {
  const targetLangs = useMemo<ReadingLang[]>(() => {
    const all: ReadingLang[] = ["fr", "he", "en"];
    return all.filter((l) => l !== sourceLang);
  }, [sourceLang]);

  const [lang, setLang] = useState<ReadingLang>(targetLangs[0] ?? "he");
  const [working, setWorking] = useState<PageContent>(() => structuredClone(source));
  const [locked, setLocked] = useState<Set<string>>(new Set());
  const [rowHash, setRowHash] = useState<string | null>(null);
  const [currentHash, setCurrentHash] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [saving, setSaving] = useState(false);

  const fields = useMemo(() => listTranslatableFields(source), [source]);

  // Current source hash (for stale detection + save).
  useEffect(() => {
    let active = true;
    sourceHash(source).then((h) => active && setCurrentHash(h));
    return () => {
      active = false;
    };
  }, [source]);

  // Load the saved translation row for the selected language.
  useEffect(() => {
    if (!pageId) return;
    let active = true;
    setLoading(true);
    fetchTranslationRow(pageId, lang)
      .then((row) => {
        if (!active) return;
        if (row) {
          setWorking({ ...structuredClone(source), ...row.content });
          setLocked(new Set(row.locked_fields));
          setRowHash(row.source_hash);
        } else {
          setWorking(structuredClone(source));
          setLocked(new Set());
          setRowHash(null);
        }
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load translation"))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [pageId, lang, source]);

  const isStale = !!rowHash && !!currentHash && rowHash !== currentHash;

  const setField = (path: string, value: string) =>
    setWorking((w) => setPath(w, path, value));

  const toggleLock = (path: string) =>
    setLocked((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });

  const onAutoTranslate = async () => {
    if (!pageId) return;
    setTranslating(true);
    try {
      // Force a fresh translation; locked fields are preserved server-side.
      const content = await resolveTranslation(
        pageId,
        source,
        sourceLang as ReadingLang,
        lang,
        { force: true },
      );
      setWorking({ ...structuredClone(source), ...content });
      setRowHash(currentHash);
      toast.success("Auto-translated. Locked fields were preserved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Translation failed");
    } finally {
      setTranslating(false);
    }
  };

  const onSave = async () => {
    if (!pageId) return;
    setSaving(true);
    try {
      await saveTranslation(pageId, lang, working, [...locked], currentHash);
      setRowHash(currentHash);
      toast.success("Translation saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (!pageId) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Save the page first to manage translations.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Language tabs + actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {targetLangs.map((l) => (
            <Button
              key={l}
              type="button"
              size="sm"
              variant={l === lang ? "default" : "outline"}
              onClick={() => setLang(l)}
            >
              {l.toUpperCase()}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" onClick={onAutoTranslate} disabled={translating}>
            {translating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Auto-translate
          </Button>
          <Button type="button" size="sm" onClick={onSave} disabled={saving}>
            <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save translation"}
          </Button>
        </div>
      </div>

      {isStale && (
        <div className="flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Source changed — translations may be outdated. Re-run Auto-translate (locked fields stay).
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
      ) : fields.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          Nothing to translate yet — add content in the Form tab.
        </div>
      ) : (
        <div className="space-y-3">
          {/* Header */}
          <div className="hidden grid-cols-[1fr_1fr_auto] gap-3 px-1 text-xs font-medium text-muted-foreground md:grid">
            <div>Source ({sourceLang.toUpperCase()})</div>
            <div>Translation ({lang.toUpperCase()})</div>
            <div>Lock</div>
          </div>

          {fields.map((f) => {
            const isLocked = locked.has(f.path);
            const value = (getPath<string>(working, f.path) ?? "") as string;
            return (
              <div
                key={f.path}
                className="grid grid-cols-1 gap-3 rounded-lg border border-border p-3 md:grid-cols-[1fr_1fr_auto]"
              >
                <div className="min-w-0">
                  <div className="mb-1 text-xs text-muted-foreground">{f.label}</div>
                  <p
                    className="whitespace-pre-wrap break-words text-sm text-foreground/80"
                    dir="auto"
                  >
                    {f.source}
                  </p>
                </div>
                <div className="min-w-0">
                  <Textarea
                    value={value}
                    dir="auto"
                    onChange={(e) => setField(f.path, e.target.value)}
                    rows={Math.min(6, Math.max(1, Math.ceil(f.source.length / 60)))}
                    className={cn("resize-y text-sm", isLocked && "ring-1 ring-primary/50")}
                  />
                </div>
                <div className="flex items-start justify-end md:justify-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    aria-label={isLocked ? "Unlock field" : "Lock field"}
                    onClick={() => toggleLock(f.path)}
                  >
                    {isLocked ? (
                      <Lock className="h-4 w-4 text-primary" />
                    ) : (
                      <Unlock className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
            );
          })}

          <p className="text-xs text-muted-foreground">
            <Badge variant="secondary" className="mr-1">Locked</Badge>
            fields are protected — Auto-translate will not overwrite them.
          </p>
        </div>
      )}
    </div>
  );
}
