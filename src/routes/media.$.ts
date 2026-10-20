import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { SMALL_SUFFIX, getMediaBucket, isSafeKey } from "@/lib/media-server";

/** Serves uploaded images/PDFs from R2: /media/<folder>/<file>. Keys are immutable (uuid-prefixed). */
export const Route = createFileRoute("/media/$")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const key = decodeURIComponent((params as { _splat?: string })._splat ?? "");
        if (!isSafeKey(key)) return new Response("Not found", { status: 404 });

        const bucket = await getMediaBucket();
        // ?w=960 → the small copy when one exists, otherwise the original.
        const wantSmall = new URL(request.url).searchParams.get("w") === "960";
        const obj = (wantSmall && (await bucket.get(`${key}${SMALL_SUFFIX}`))) || (await bucket.get(key));
        if (!obj) return new Response("Not found", { status: 404 });

        if (request.headers.get("if-none-match") === obj.httpEtag) {
          return new Response(null, { status: 304, headers: { etag: obj.httpEtag } });
        }
        return new Response(obj.body, {
          headers: {
            "content-type": obj.httpMetadata?.contentType ?? "application/octet-stream",
            "content-length": String(obj.size),
            "cache-control": "public, max-age=31536000, immutable",
            etag: obj.httpEtag,
          },
        });
      },
    },
  },
});
