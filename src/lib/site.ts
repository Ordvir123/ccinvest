/** Public origin of the site. Every canonical URL, share link and sitemap entry derives from this. */
export const SITE_DOMAIN = "home.ccinvest.co.il";
export const SITE_ORIGIN = `https://${SITE_DOMAIN}`;

/** Make a media/asset URL absolute (needed for og:image and emails). */
export function absoluteUrl(url: string): string {
  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("/")) return `${SITE_ORIGIN}${url}`;
  return url;
}
