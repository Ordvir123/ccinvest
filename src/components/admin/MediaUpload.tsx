import { useEffect, useRef, useState } from "react";
import { ImagePlus, FileText, Loader2, Trash2, ArrowUp, ArrowDown, ClipboardPaste } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Media } from "@/types/page";
import {
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_ATTACHMENT_TYPES,
  uploadPageMedia,
  uploadUnitAttachment,
  removePageMedia,
} from "@/lib/pages";
import type { UnitAttachment } from "@/types/page";

const ACCEPT = ACCEPTED_IMAGE_TYPES.join(",");

/** Convert an image Blob into a named File. */
function blobToImageFile(blob: Blob, type: string): File {
  const ext = type.split("/")[1]?.replace("jpeg", "jpg") || "png";
  return new File([blob], `pasted-${Date.now()}.${ext}`, { type });
}

/** Read an image File from the system clipboard (no local file needed). */
async function readClipboardImageFile(): Promise<File | null> {
  const anyNav = navigator as Navigator & {
    clipboard?: { read?: () => Promise<ClipboardItem[]> };
  };
  if (!anyNav.clipboard?.read) {
    throw new Error("Clipboard read isn't supported in this browser.");
  }
  const items = await anyNav.clipboard.read();
  for (const item of items) {
    const type = item.types.find((t) => t.startsWith("image/"));
    if (type) {
      const blob = await item.getType(type);
      return blobToImageFile(blob, type);
    }
  }
  return null;
}

/** Extract the first image File from a native paste event's clipboardData. */
function imageFileFromPasteEvent(event: ClipboardEvent): File | null {
  const items = event.clipboardData?.items;
  if (!items) return null;
  for (const item of Array.from(items)) {
    if (item.kind === "file" && item.type.startsWith("image/")) {
      const file = item.getAsFile();
      if (file) return file;
    }
  }
  return null;
}

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);

/** Small "paste from clipboard" button shared by the upload controls. */
function PasteButton({
  onImage,
  disabled,
  busy,
  label = "Paste image",
}: {
  onImage: (file: File) => void | Promise<void>;
  disabled?: boolean;
  busy?: boolean;
  label?: string;
}) {
  const [reading, setReading] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up on unmount.
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // While in capture mode, listen for a real paste event (works without permission).
  useEffect(() => {
    if (!capturing) return;

    const exit = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      setCapturing(false);
    };

    const onPaste = async (event: ClipboardEvent) => {
      const file = imageFileFromPasteEvent(event);
      if (!file) {
        toast.error("No image found on the clipboard. Copy an image first.");
        return; // stay in capture mode
      }
      event.preventDefault();
      exit();
      await onImage(file);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") exit();
    };

    window.addEventListener("paste", onPaste as EventListener);
    window.addEventListener("keydown", onKeyDown);
    timeoutRef.current = setTimeout(exit, 15000);

    return () => {
      window.removeEventListener("paste", onPaste as EventListener);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [capturing, onImage]);

  const onClick = async () => {
    if (capturing) {
      setCapturing(false);
      return;
    }
    setReading(true);
    try {
      const file = await readClipboardImageFile();
      if (!file) {
        toast.error("No image found on the clipboard. Copy an image first.");
        return;
      }
      await onImage(file);
    } catch {
      // clipboard.read unavailable or permission/security error → fall back to
      // a native paste event, which needs no permission and works everywhere.
      setCapturing(true);
    } finally {
      setReading(false);
    }
  };

  return (
    <Button
      type="button"
      variant={capturing ? "default" : "outline"}
      size="sm"
      disabled={disabled || busy || reading}
      onClick={onClick}
      className={capturing ? "animate-pulse" : undefined}
    >
      {reading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <ClipboardPaste className="h-4 w-4" />
      )}
      {capturing ? `Press ${isMac ? "⌘V" : "Ctrl+V"} now` : label}
    </Button>
  );
}


function useUploader(slug: string) {
  const [busy, setBusy] = useState(false);
  const upload = async (file: File): Promise<Media | null> => {
    setBusy(true);
    try {
      const media = await uploadPageMedia(file, slug);
      return media;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
      return null;
    } finally {
      setBusy(false);
    }
  };
  return { busy, upload };
}

/** Single optional image (used by units). */
export function SingleImageUpload({
  slug,
  value,
  onChange,
  disabled,
}: {
  slug: string;
  value?: Media;
  onChange: (media?: Media) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { busy, upload } = useUploader(slug);

  const onFile = async (file?: File) => {
    if (!file) return;
    const media = await upload(file);
    if (media) onChange(media);
  };

  const onRemove = async () => {
    if (value?.url) await removePageMedia(value.url);
    onChange(undefined);
  };

  return (
    <div className="space-y-2">
      {value?.url ? (
        <div className="space-y-2 rounded-md border border-border p-2">
          <img src={value.url} alt={value.alt ?? ""} className="aspect-video w-full rounded object-cover" />
          <Input
            placeholder="Alt text"
            value={value.alt ?? ""}
            onChange={(e) => onChange({ ...value, alt: e.target.value })}
          />
          <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
            <Trash2 className="h-4 w-4" /> Remove
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            Upload image
          </Button>
          <PasteButton onImage={(f) => onFile(f)} disabled={disabled} busy={busy} />
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}

/** Multi-image gallery with reorder + alt editing. */
export function GalleryUpload({
  slug,
  value,
  onChange,
  disabled,
}: {
  slug: string;
  value: Media[];
  onChange: (media: Media[]) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { busy, upload } = useUploader(slug);

  const onFiles = async (files: FileList | null) => {
    if (!files) return;
    const added: Media[] = [];
    for (const file of Array.from(files)) {
      const media = await upload(file);
      if (media) added.push(media);
    }
    if (added.length) onChange([...value, ...added]);
  };

  const update = (i: number, patch: Partial<Media>) => {
    const next = value.slice();
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };

  const remove = async (i: number) => {
    if (value[i]?.url) await removePageMedia(value[i].url);
    onChange(value.filter((_, idx) => idx !== i));
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= value.length) return;
    const next = value.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {value.map((img, i) => (
            <div key={img.url + i} className="space-y-1 rounded-md border border-border p-2">
              <img src={img.url} alt={img.alt ?? ""} className="aspect-square w-full rounded object-cover" />
              <Input
                className="h-8 text-xs"
                placeholder="Alt text"
                value={img.alt ?? ""}
                onChange={(e) => update(i, { alt: e.target.value })}
              />
              <div className="flex items-center justify-between">
                <div className="flex gap-1">
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => move(i, -1)}>
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => move(i, 1)}>
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                </div>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(i)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="space-y-1">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            Add images
          </Button>
          <PasteButton
            onImage={async (f) => {
              const media = await upload(f);
              if (media) onChange([...value, media]);
            }}
            disabled={disabled}
            busy={busy}
          />
        </div>
        {disabled && <Label className="block text-xs text-muted-foreground">Set a slug first to enable uploads.</Label>}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => {
          onFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

/** Optional per-unit floor-plan file: image or PDF. */
export function UnitFileUpload({
  slug,
  value,
  label,
  onChange,
  disabled,
}: {
  slug: string;
  value?: UnitAttachment;
  label: string;
  onChange: (attachment?: UnitAttachment) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const onFile = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try {
      const attachment = await uploadUnitAttachment(file, slug);
      onChange(attachment);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const onRemove = async () => {
    if (value?.url) await removePageMedia(value.url);
    onChange(undefined);
  };

  return (
    <div className="space-y-2">
      {value?.url ? (
        <div className="space-y-2 rounded-md border border-border p-2">
          {value.type === "image" ? (
            <img src={value.url} alt={label} className="aspect-video w-full rounded object-cover" />
          ) : (
            <a
              href={value.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded bg-secondary px-3 py-2 text-sm font-medium text-foreground"
            >
              <FileText className="h-5 w-5 text-primary" /> {label} (PDF)
            </a>
          )}
          <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
            <Trash2 className="h-4 w-4" /> Remove
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            Upload {label}
          </Button>
          <PasteButton onImage={(f) => onFile(f)} disabled={disabled} busy={busy} label="Paste" />
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_ATTACHMENT_TYPES.join(",")}
        className="hidden"
        onChange={(e) => {
          onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
