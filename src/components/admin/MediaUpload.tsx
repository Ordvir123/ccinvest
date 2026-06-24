import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Media } from "@/types/page";
import {
  ACCEPTED_IMAGE_TYPES,
  uploadPageMedia,
  removePageMedia,
} from "@/lib/pages";

const ACCEPT = ACCEPTED_IMAGE_TYPES.join(",");

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
