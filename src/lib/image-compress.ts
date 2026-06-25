// Client-side image compression. Runs before every upload so images served
// across the whole site are lightweight (faster loading) while preserving
// visible quality. Uses an offscreen canvas — no extra dependencies.

const MAX_DIMENSION = 1920; // cap the longest edge; bigger is never needed on web
const DEFAULT_QUALITY = 0.82; // visually lossless for photos

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

/**
 * Compress an image File. Returns the original file untouched if compression
 * is not supported, fails, or does not actually reduce the size.
 */
export async function compressImage(
  file: File,
  quality = DEFAULT_QUALITY,
): Promise<File> {
  if (typeof document === "undefined") return file;
  if (!COMPRESSIBLE.has(file.type)) return file;

  try {
    const img = await loadImage(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
    const width = Math.round(img.width * scale);
    const height = Math.round(img.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, width, height);

    // Keep PNGs as PNG (transparency); convert everything else to WebP.
    const outType = file.type === "image/png" ? "image/png" : "image/webp";
    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, outType, quality),
    );
    if (!blob || blob.size >= file.size) return file;

    const ext = outType === "image/png" ? "png" : "webp";
    const baseName = file.name.replace(/\.[^.]+$/, "");
    return new File([blob], `${baseName}.${ext}`, { type: outType });
  } catch {
    return file;
  }
}
