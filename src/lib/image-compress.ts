// Client-side image compression. Runs before every upload so images served
// across the whole site are lightweight (faster loading) while preserving
// visible quality. Uses an offscreen canvas — no extra dependencies.

const MAX_DIMENSION = 1920; // cap the longest edge; bigger is never needed on web
const DEFAULT_QUALITY = 0.85; // visually lossless for photos

const COMPRESSIBLE = new Set(["image/jpeg", "image/png", "image/webp"]);

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

/** True when the canvas has any pixel that is not fully opaque. */
function hasTransparency(ctx: CanvasRenderingContext2D, w: number, h: number): boolean {
  // Sample a grid instead of every pixel — enough to catch logos/cut-outs.
  const step = Math.max(1, Math.floor(Math.min(w, h) / 64));
  const data = ctx.getImageData(0, 0, w, h).data;
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      if (data[(y * w + x) * 4 + 3] < 255) return true;
    }
  }
  return false;
}

async function encode(
  img: HTMLImageElement,
  maxDim: number,
  keepPng: boolean,
  quality: number,
): Promise<Blob | null> {
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const width = Math.round(img.width * scale);
  const height = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, width, height);
  if (keepPng) return new Promise((r) => canvas.toBlob(r, "image/png"));
  const webp: Blob | null = await new Promise((r) => canvas.toBlob(r, "image/webp", quality));
  // Older Safari can't encode WebP and silently returns PNG — use JPEG there.
  if (webp && webp.type === "image/webp") return webp;
  return new Promise((r) => canvas.toBlob(r, "image/jpeg", Math.min(0.88, quality + 0.04)));
}

const extFor = (type: string) => (type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg");

/**
 * Compress an image before upload: longest edge ≤ 1920px, WebP at a visually
 * lossless quality (PNG kept only when the image really has transparency).
 * Returns the original file when compression isn't possible or doesn't help.
 */
export async function compressImage(file: File, quality = DEFAULT_QUALITY): Promise<File> {
  if (typeof document === "undefined") return file;
  if (!COMPRESSIBLE.has(file.type)) return file;
  try {
    const img = await loadImage(file);
    let keepPng = false;
    if (file.type === "image/png") {
      const probe = document.createElement("canvas");
      probe.width = Math.min(img.width, 256);
      probe.height = Math.round((img.height * probe.width) / img.width) || 1;
      const pctx = probe.getContext("2d");
      if (pctx) {
        pctx.drawImage(img, 0, 0, probe.width, probe.height);
        keepPng = hasTransparency(pctx, probe.width, probe.height);
      }
    }
    const blob = await encode(img, MAX_DIMENSION, keepPng, quality);
    if (!blob || blob.size >= file.size) return file;
    const baseName = file.name.replace(/\.[^.]+$/, "");
    return new File([blob], `${baseName}.${extFor(blob.type)}`, { type: blob.type });
  } catch {
    return file;
  }
}

/**
 * A 960px-wide copy for phones and thumbnails, or null when the image is
 * already that small (or not an image).
 */
export async function makeSmallCopy(file: File, quality = DEFAULT_QUALITY): Promise<Blob | null> {
  if (typeof document === "undefined") return null;
  if (!COMPRESSIBLE.has(file.type)) return null;
  try {
    const img = await loadImage(file);
    if (img.width <= 1100) return null;
    // Scale so the WIDTH becomes 960px (matches the "960w" srcset descriptor).
    const maxDim = Math.round((960 * Math.max(img.width, img.height)) / img.width);
    return await encode(img, maxDim, file.type === "image/png", quality);
  } catch {
    return null;
  }
}
