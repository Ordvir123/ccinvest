import { useRef, useState } from "react";
import { Loader2, RefreshCw, RotateCcw, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SectionCard } from "@/components/admin/editor-parts";
import { cn } from "@/lib/utils";
import { applyAiEdit, type EditLang } from "@/lib/edit-page";
import type { PageContent } from "@/types/page";

/** A single message shown in the AI corrections chat. */
type ChatMessage =
  | { role: "user"; text: string }
  | { role: "assistant"; text: string; changedPaths: string[] }
  | { role: "error"; text: string };

const MAX_HISTORY_TURNS = 10;
const MAX_UNDO_SNAPSHOTS = 15;

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
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  };

  const send = async () => {
    const instruction = input.trim();
    if (!instruction) {
      toast.error("Describe the change you want first.");
      return;
    }
    if (running) return;

    // Build the history payload (last N turns of user/assistant text) BEFORE
    // appending the new user message.
    const history = messages
      .filter(
        (m): m is Extract<ChatMessage, { role: "user" | "assistant" }> =>
          m.role === "user" || m.role === "assistant",
      )
      .slice(-MAX_HISTORY_TURNS)
      .map((m) => ({ role: m.role, text: m.text }));

    setMessages((prev) => [...prev, { role: "user", text: instruction }]);
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
      );
      setContent(() => result.content);
      setUndoStack((prev) => [...prev, before].slice(-MAX_UNDO_SNAPSHOTS));
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
      description="Chat to change this page in plain language. Images and prices are preserved. Review the preview, then save."
    >
      <div
        ref={scrollRef}
        className="max-h-72 space-y-3 overflow-y-auto rounded-md border border-border bg-muted/30 p-3"
      >
        {messages.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            e.g. “Change the hero subtitle to mention sea views”, then “make it shorter”.
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

      <div className="flex items-end gap-2">
        <Textarea
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Describe a correction… (Enter to send, Shift+Enter for a new line)"
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
        <div className="max-w-[85%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">
          {message.text}
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
