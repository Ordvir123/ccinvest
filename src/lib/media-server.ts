/**
 * Server-only helpers for the R2 media bucket (binding "MEDIA", see wrangler.jsonc).
 * Imported only from server route handlers.
 */

type R2Object = {
  body: ReadableStream;
  httpEtag: string;
  size: number;
  httpMetadata?: { contentType?: string };
};
export type R2Bucket = {
  get(key: string): Promise<R2Object | null>;
  put(
    key: string,
    value: ReadableStream | ArrayBuffer | Blob,
    opts?: { httpMetadata?: { contentType?: string; cacheControl?: string } },
  ): Promise<unknown>;
  delete(key: string): Promise<void>;
};

export async function getMediaBucket(): Promise<R2Bucket> {
  // Resolved by the Workers runtime; not available in plain Node dev.
  const mod = (await import(/* @vite-ignore */ "cloudflare:workers")) as {
    env: { MEDIA?: R2Bucket };
  };
  if (!mod.env.MEDIA) throw new Error("R2 binding MEDIA is not configured");
  return mod.env.MEDIA;
}

/** R2 key suffix of the 960px copy stored next to each image. */
export const SMALL_SUFFIX = "~w960";

/** Media keys look like "<folder>/<file>"; reject anything that could escape that shape. */
export function isSafeKey(key: string): boolean {
  return (
    key.length > 0 &&
    key.length <= 512 &&
    !key.startsWith("/") &&
    !key.split("/").some((seg) => seg === "" || seg === "." || seg === "..")
  );
}

export type AdminCtx = { userId: string; token: string };

/** Returns the admin context when the bearer token belongs to a CC Invest admin, otherwise null. */
export async function verifyAdmin(request: Request): Promise<AdminCtx | null> {
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anon =
    (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ??
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined);
  if (!token || !url || !anon) return null;

  const headers = { apikey: anon, Authorization: `Bearer ${token}` };
  const userRes = await fetch(`${url}/auth/v1/user`, { headers });
  if (!userRes.ok) return null;
  const user = (await userRes.json()) as { id?: string };
  if (!user.id) return null;

  const adminRes = await fetch(`${url}/rest/v1/rpc/is_admin`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: "{}",
  });
  if (!adminRes.ok) return null;
  return (await adminRes.json()) === true ? { userId: user.id, token } : null;
}

/** Call Supabase REST as the signed-in admin (RLS applies). */
export async function supabaseAsAdmin(ctx: AdminCtx, path: string, init: RequestInit = {}) {
  const url = import.meta.env.VITE_SUPABASE_URL as string;
  const anon =
    (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ??
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string);
  return fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: anon,
      Authorization: `Bearer ${ctx.token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}
