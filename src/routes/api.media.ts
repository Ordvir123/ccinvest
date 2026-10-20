import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { SMALL_SUFFIX, getMediaBucket, isSafeKey, supabaseAsAdmin, verifyAdmin } from "@/lib/media-server";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const MAX_BYTES = 15 * 1024 * 1024;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const clean = (s: string) => s.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(0, 120);

/**
 * Admin-only media API backed by R2.
 *   POST   multipart {file, folder}  → { url: "/media/<key>", key }
 *   DELETE ?key=<key>                → { ok: true }
 */
export const Route = createFileRoute("/api/media")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const admin = await verifyAdmin(request);
        if (!admin) return json({ error: "Unauthorized" }, 401);

        const form = await request.formData();
        const file = form.get("file");
        if (!(file instanceof File)) return json({ error: "Missing file" }, 400);
        if (!ALLOWED.has(file.type)) return json({ error: "Use JPG, PNG, WEBP or PDF." }, 415);
        if (file.size > MAX_BYTES) return json({ error: "File is too large (max 15MB)." }, 413);

        const folder = String(form.get("folder") ?? "")
          .split("/")
          .map(clean)
          .filter(Boolean)
          .join("/") || "misc";
        const key = `${folder}/${crypto.randomUUID()}-${clean(file.name) || "file"}`;

        const bucket = await getMediaBucket();
        await bucket.put(key, await file.arrayBuffer(), {
          httpMetadata: { contentType: file.type },
        });
        const small = form.get("small");
        if (small instanceof File && ALLOWED.has(small.type) && small.size < file.size) {
          await bucket.put(`${key}${SMALL_SUFFIX}`, await small.arrayBuffer(), {
            httpMetadata: { contentType: small.type },
          });
        }
        const url = `/media/${key}`;
        // Index the upload so Claude (and the admin) can find files per page.
        const idx = await supabaseAsAdmin(admin, "media", {
          method: "POST",
          body: JSON.stringify({
            key,
            url,
            folder,
            filename: file.name.slice(0, 200),
            content_type: file.type,
            size_bytes: file.size,
          }),
        });
        if (!idx.ok) console.error("[api/media] index insert failed", idx.status);
        return json({ url, key });
      },

      DELETE: async ({ request }) => {
        const admin = await verifyAdmin(request);
        if (!admin) return json({ error: "Unauthorized" }, 401);
        const key = new URL(request.url).searchParams.get("key") ?? "";
        if (!isSafeKey(key)) return json({ error: "Bad key" }, 400);
        const bucket = await getMediaBucket();
        await bucket.delete(key);
        await bucket.delete(`${key}${SMALL_SUFFIX}`);
        await supabaseAsAdmin(admin, `media?key=eq.${encodeURIComponent(key)}`, { method: "DELETE" });
        return json({ ok: true });
      },
    },
  },
});
