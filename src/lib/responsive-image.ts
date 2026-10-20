/**
 * Responsive image helpers for media served from R2 (/media/<key>).
 * Every new upload also stores a 960px-wide copy (see image-compress.ts);
 * /media/<key>?w=960 serves it, falling back to the original when absent.
 */
export const SMALL_WIDTH = 960;

export function isManagedImage(url?: string | null): url is string {
  return !!url && url.startsWith("/media/") && !/\.pdf($|\?)/i.test(url);
}

/** srcSet/sizes props so phones and thumbnails download the small copy. */
export function responsiveProps(url?: string | null, sizes = "100vw") {
  if (!isManagedImage(url)) return {};
  return { srcSet: `${url}?w=${SMALL_WIDTH} ${SMALL_WIDTH}w, ${url} 1920w`, sizes };
}
