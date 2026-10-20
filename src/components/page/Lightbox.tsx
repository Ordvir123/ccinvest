import { useCallback, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { Media } from "@/types/page";

/**
 * Full-screen photo viewer: arrows, keyboard (← →), swipe on phones, counter,
 * and the neighbouring photos preloaded so flipping feels instant.
 */
export function Lightbox({
  images,
  index,
  open,
  onOpenChange,
  onIndexChange,
}: {
  images: Media[];
  index: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onIndexChange: (i: number) => void;
}) {
  const n = images.length;
  const go = useCallback(
    (delta: number) => onIndexChange((index + delta + n) % n),
    [index, n, onIndexChange],
  );

  useEffect(() => {
    if (!open || n < 2) return;
    const onKey = (e: KeyboardEvent) => {
      // Arrow keys follow the visual direction, also in RTL pages.
      if (e.key === "ArrowRight") go(document.dir === "rtl" ? -1 : 1);
      if (e.key === "ArrowLeft") go(document.dir === "rtl" ? 1 : -1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, n, go]);

  // Preload the previous and next photos.
  useEffect(() => {
    if (!open || n < 2) return;
    for (const i of [(index + 1) % n, (index - 1 + n) % n]) {
      const img = new Image();
      img.src = images[i].url;
    }
  }, [open, index, n, images]);

  const touchX = useRef<number | null>(null);
  const current = images[index];
  if (!current) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-6xl border-none bg-transparent p-0 shadow-none [&>button]:hidden"
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          touchX.current = null;
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
        }}
      >
        <DialogTitle className="sr-only">{current.alt || `Photo ${index + 1}`}</DialogTitle>
        <div className="relative" dir="ltr">
          <img
            src={current.url}
            alt={current.alt ?? ""}
            className="max-h-[85vh] w-full select-none rounded-lg object-contain"
            draggable={false}
          />
          {n > 1 && (
            <>
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label="Previous"
                className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur transition hover:bg-black/65"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label="Next"
                className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur transition hover:bg-black/65"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-xs text-white tabular-nums">
                {index + 1} / {n}
              </div>
            </>
          )}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur transition hover:bg-black/65"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {current.alt && (
          <p className="mt-2 text-center text-sm text-white/85" dir="auto">
            {current.alt}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
