import { supabase } from "@/integrations/supabase/client";
import { analyzeMedia, makeSmallCopy } from "@/lib/image-compress";

/**
 * Client helpers for media stored in R2 (served from /media/<key>).
 * Legacy files still live in Supabase Storage (bucket "page-media") until migrated.
 */

const LEGACY_MARKER = "/storage/v1/object/public/page-media/";

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not signed in.");
  return { Authorization: `Bearer ${token}` };
}

/**
 * Upload a (pre-compressed) file into `folder` and return its public URL (/media/...).
 * `pageId` links it to a page; without it the server links it to the page whose
 * slug equals the folder (or later, when such a page is created).
 */
export async function uploadMedia(
  file: File,
  folder: string,
  opts: { pageId?: string } = {},
): Promise<string> {
  const body = new FormData();
  body.append("file", file);
  body.append("folder", folder);
  if (opts.pageId) body.append("page_id", opts.pageId);
  const meta = await analyzeMedia(file);
  body.append("kind", meta.kind);
  if (meta.width) body.append("width", String(meta.width));
  if (meta.height) body.append("height", String(meta.height));
  // Small copy for phones/thumbnails, served at /media/<key>?w=960.
  const small = await makeSmallCopy(file);
  if (small && small.size < file.size) body.append("small", small, "small");
  const res = await fetch("/api/media", { method: "POST", headers: await authHeader(), body });
  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !data.url) throw new Error(data.error ?? `Upload failed (${res.status})`);
  return data.url;
}

/** Best-effort delete of a managed media file (R2 or legacy Supabase Storage). */
export async function deleteMedia(url: string): Promise<void> {
  try {
    if (url.startsWith("/media/")) {
      const key = decodeURIComponent(url.slice("/media/".length));
      await fetch(`/api/media?key=${encodeURIComponent(key)}`, {
        method: "DELETE",
        headers: await authHeader(),
      });
      return;
    }
    const idx = url.indexOf(LEGACY_MARKER);
    if (idx !== -1) {
      const path = decodeURIComponent(url.slice(idx + LEGACY_MARKER.length));
      await supabase.storage.from("page-media").remove([path]);
    }
  } catch (err) {
    console.warn("[media] delete failed:", err);
  }
}
