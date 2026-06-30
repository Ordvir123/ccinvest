import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Sparkles, PencilLine, Loader2, Building2, Home } from "lucide-react";

import { PageEditor } from "@/components/admin/PageEditor";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { extractPageFromText, mergeAiContent, type ExtractCategory } from "@/lib/extract-page";
import type { PageContent } from "@/types/page";

export const Route = createFileRoute("/_admin/admin/pages/new")({
  component: NewPage,
});

type Mode = "choose" | "ai" | "manual";

function NewPage() {
  const [mode, setMode] = useState<Mode>("choose");
  const [text, setText] = useState("");
  const [category, setCategory] = useState<ExtractCategory>("project");
  const [processing, setProcessing] = useState(false);
  const [prefill, setPrefill] = useState<PageContent | null>(null);

  // Manual pages are authored in Hebrew by default (most common). The AI flow
  // detects the pasted language and always outputs French, so it stays "fr".
  if (mode === "manual") return <PageEditor initialSourceLang="he" />;
  if (prefill)
    return <PageEditor initialContent={prefill} initialSourceLang="fr" showAiNote />;

  const runAi = async () => {
    if (!text.trim()) {
      toast.error("Paste some text first.");
      return;
    }
    setProcessing(true);
    try {
      // Source language is auto-detected server-side; output is always French.
      const partial = await extractPageFromText(text, { category });
      setPrefill(mergeAiContent(partial, category));
      toast.success("AI built the page in French. Review, then translate to HE/EN.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI extraction failed.");
    } finally {
      setProcessing(false);
    }
  };




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
            rows={12}
            className="resize-y"
          />
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
            AI extracts only facts present in the text and writes the page in French.
            Use the Translations tab for Hebrew and English. Missing fields stay empty
            for you to complete. Nothing is saved or published automatically.
          </p>
        </div>
      )}
    </div>
  );
}
