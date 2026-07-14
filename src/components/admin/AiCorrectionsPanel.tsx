import { useRef, useState } from "react";
import {
  FileText,
  Loader2,
  Paperclip,
  RefreshCw,
  RotateCcw,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SectionCard } from "@/components/admin/editor-parts";
import { cn } from "@/lib/utils";
import {
  applyAiEdit,
  type AiEditResult,
  type AiEditSkip,
  type EditAsset,
  type EditLang,
} from "@/lib/edit-page";
import { supabase } from "@/integrations/supabase/client";
import { PAGE_MEDIA_BUCKET, removePageMedia } from "@/lib/pages";
import { compressImage } from "@/lib/image-compress";
import type { PageContent } from "@/types/page";

/** A single message shown in the AI corrections chat. */
type ChatMessage =
  | { role: "user"; text: string; attachments?: string[] }
  | {
      role: "assistant";
      text: string;
      changedPaths: string[];
      skipped?: AiEditSkip[];
    }
  | { role: "error"; text: string };

/** A proposed edit awaiting the user's Confirm/Cancel decision. */
type PendingEdit = {
  instruction: string;
  before: PageContent;
  result: AiEditResult;
};

const MAX_HISTORY_TURNS = 10;
const MAX_UNDO_SNAPSHOTS = 15;

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

/**
 * Convert a JSON Pointer path ("/units/2/price") to a friendly, readable form
 * ("units[2].price"). Numeric segments become array indices.
 */
function prettyPath(pointer: string): string {
  const segments = pointer.split("/").filter(Boolean);
  let out = "";
  for (const seg of segments) {
    if (/^\d+$/.test(seg)) {
      out += `[${seg}]`;
    } else {
      out += out ? `.${seg}` : seg;
    }
  }
  return out || pointer;
}

/**
 * Compact chat panel for natural-language page corrections.
 * - Keeps chat history in local state and sends the last 10 turns as `history`.
 * - Optional image/PDF attachments (uploaded to page-media) are sent with the
 *   next instruction so the AI can place them into the page.
 * - Multi-level undo via a stack of PageContent snapshots (max 15).
 * - "Reset chat" clears history only (never touches content).
 */
export function AiCorrectionsPanel({
  content,
  setContent,
  sourceLang,
}: {
  content: PageContent;
  setContent: (updater: (prev: PageContent) => PageContent) => void;
  sourceLang: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const [undoStack, setUndoStack] = useState<PageContent[]>([]);
  const [assets, setAssets] = useState<DraftAsset[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  };

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

  const send = async () => {
    const instruction = input.trim();
    if (!instruction) {
      toast.error("Describe the change you want first.");
      return;
    }
    if (running) return;
    if (assets.some((a) => a.status === "uploading")) {
      toast.error("Wait for uploads to finish.");
      return;
    }

    const readyAssets: EditAsset[] = assets
      .filter((a) => a.status === "done" && a.url)
      .map((a) => ({ url: a.url!, kind: a.kind, filename: a.filename }));

    // Build the history payload (last N turns of user/assistant text) BEFORE
    // appending the new user message.
    const history = messages
      .filter(
        (m): m is Extract<ChatMessage, { role: "user" | "assistant" }> =>
          m.role === "user" || m.role === "assistant",
      )
      .slice(-MAX_HISTORY_TURNS)
      .map((m) => ({ role: m.role, text: m.text }));

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        text: instruction,
        attachments: readyAssets.length
          ? readyAssets.map((a) => a.filename)
          : undefined,
      },
    ]);
    setInput("");
    setRunning(true);
    scrollToBottom();

    const before = content;
    try {
      const result = await applyAiEdit(
        content,
        instruction,
        sourceLang as EditLang,
        history,
        readyAssets,
      );
      setContent(() => result.content);
      setUndoStack((prev) => [...prev, before].slice(-MAX_UNDO_SNAPSHOTS));
      // Clear attachments once they've been applied to the page.
      setAssets((prev) => {
        prev.forEach((a) => a.previewUrl && URL.revokeObjectURL(a.previewUrl));
        return [];
      });
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: result.summary || "Applied your change.",
          changedPaths: result.changedPaths ?? [],
        },
      ]);
    } catch (err) {
      const text = err instanceof Error ? err.message : "AI edit failed.";
      setMessages((prev) => [...prev, { role: "error", text }]);
    } finally {
      setRunning(false);
      scrollToBottom();
    }
  };

  const undo = () => {
    if (!undoStack.length) return;
    const snapshot = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setContent(() => snapshot);
    toast.success("Reverted the last AI change.");
  };

  const resetChat = () => {
    setMessages([]);
    toast.success("Cleared the AI chat.");
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  return (
    <SectionCard
      title="AI corrections"
      description="Chat to change this page in plain language. Attach images or brochures to add or replace media. Review the preview, then save."
    >
      <div
        ref={scrollRef}
        className="max-h-72 space-y-3 overflow-y-auto rounded-md border border-border bg-muted/30 p-3"
      >
        {messages.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            e.g. “Change the hero subtitle to mention sea views”, then “make it shorter”. Attach a
            photo and say “add this to the gallery”.
          </p>
        ) : (
          messages.map((m, i) => <ChatBubble key={i} message={m} />)
        )}
        {running && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Applying…
          </div>
        )}
      </div>

      {/* Attachment chips / thumbnails */}
      {assets.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {assets.map((a) => (
            <div
              key={a.id}
              className="relative flex items-center gap-2 rounded-md border border-border bg-card py-1 pl-1 pr-6 text-xs"
            >
              {a.kind === "image" && a.previewUrl ? (
                <img
                  src={a.previewUrl}
                  alt={a.filename}
                  className="h-8 w-8 rounded object-cover"
                />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded bg-muted">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </span>
              )}
              <span className="max-w-[9rem] truncate text-foreground" title={a.filename}>
                {a.filename}
              </span>
              {a.status === "uploading" && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              )}
              {a.status === "error" && (
                <span className="text-destructive" title={a.error}>
                  !
                </span>
              )}
              <button
                type="button"
                onClick={() => removeAsset(a.id)}
                className="absolute right-1 top-1 rounded-full p-0.5 text-muted-foreground hover:text-foreground"
                aria-label={`Remove ${a.filename}`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div
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
          "flex items-end gap-2 rounded-md transition",
          dragOver && "ring-2 ring-primary ring-offset-2 ring-offset-background",
        )}
      >
        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={running}
          title="Attach images or PDFs"
          aria-label="Attach files"
        >
          <Paperclip className="h-4 w-4" />
        </Button>
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
        <Textarea
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Describe a correction, or drop files here… (Enter to send, Shift+Enter for a new line)"
          disabled={running}
          className="flex-1"
        />
        <Button
          type="button"
          size="sm"
          onClick={() => void send()}
          disabled={running || !input.trim()}
        >
          {running ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={undo}
          disabled={running || undoStack.length === 0}
        >
          <RefreshCw className="h-4 w-4" /> Undo
          {undoStack.length > 0 ? ` (${undoStack.length})` : ""}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={resetChat}
          disabled={running || messages.length === 0}
        >
          <RotateCcw className="h-4 w-4" /> Reset chat
        </Button>
      </div>
    </SectionCard>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] space-y-1">
          <div className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">
            {message.text}
          </div>
          {message.attachments && message.attachments.length > 0 && (
            <p className="px-1 text-right text-[11px] text-muted-foreground">
              <Paperclip className="mr-0.5 inline h-3 w-3" />
              {message.attachments.join(", ")}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (message.role === "error") {
    return (
      <div className="flex justify-start">
        <div className="max-w-[85%] rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {message.text}
        </div>
      </div>
    );
  }

  const changed = message.changedPaths.filter(Boolean).map(prettyPath);
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] space-y-1">
        <div className="flex items-start gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span>{message.text}</span>
        </div>
        {changed.length > 0 && (
          <p className={cn("px-1 text-[11px] text-muted-foreground")}>
            Changed: {changed.join(", ")}
          </p>
        )}
      </div>
    </div>
  );
}
