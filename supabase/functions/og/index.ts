// Supabase Edge Function: og
// -------------------------------------------------------------
// Scraper / social prerender. Given ?slug= and optional ?lang=, returns a
// minimal HTML document with correct per-language meta tags resolved
// server-side (title, description, canonical, Open Graph, Twitter).
//
// Bots that don't run JS (WhatsApp, facebookexternalhit, Twitterbot,
// Slackbot, LinkedInBot, Googlebot, ...) get correct share previews.
//
// Language: ?lang= (fr|he|en) if present, else page.source_lang.
// SEO field fallback: seo.<lang>.* -> seo.<source_lang>.*.
// og:image: seo og_image -> first gallery image -> first unit image.
// Nothing is fabricated: empty fields are simply omitted.
//
// Deploy:  supabase functions deploy og --no-verify-jwt
// -------------------------------------------------------------

const SITE_ORIGIN = "https://ccinvest.lovable.app";
const READING_LANGS = ["fr", "he", "en"];
const LOCALE: Record<string, string> = {
  fr: "fr_FR",
  he: "he_IL",
  en: "en_US",
};

const esc = (s: string) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const hasText = (v: unknown): v is string =>
  typeof v === "string" && v.trim().length > 0;

function pickSeo(seo: Record<string, any>, lang: string, source: string, key: string) {
  const a = seo?.[lang]?.[key];
  if (hasText(a)) return a;
  const b = seo?.[source]?.[key];
  if (hasText(b)) return b;
  return undefined;
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug") ?? "";
  const langParam = url.searchParams.get("lang") ?? "";

  if (!slug) {
    return new Response("Missing slug", { status: 400 });
  }

  const supaUrl = Deno.env.get("SUPABASE_URL")!;
  const supaKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supaKey) {
    return new Response("Server misconfiguration", { status: 500 });
  }

  const restUrl =
    `${supaUrl}/rest/v1/pages?slug=eq.${encodeURIComponent(slug)}` +
    `&status=eq.published&select=slug,source_lang,content,seo&limit=1`;

  const resp = await fetch(restUrl, {
    headers: { apikey: supaKey, Authorization: `Bearer ${supaKey}` },
  });
  const rows = resp.ok ? await resp.json() : [];
  const page = Array.isArray(rows) ? rows[0] : null;

  if (!page) {
    return new Response("<!doctype html><title>404</title>", {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const source = page.source_lang || "fr";
  const lang = READING_LANGS.includes(langParam) ? langParam : source;
  const seo = page.seo ?? {};
  const content = page.content ?? {};

  const title =
    pickSeo(seo, lang, source, "meta_title") ?? content?.hero?.title ?? slug;
  const description =
    pickSeo(seo, lang, source, "meta_description") ?? content?.hero?.subtitle;
  const ogTitle = pickSeo(seo, lang, source, "og_title") ?? title;
  const ogDescription =
    pickSeo(seo, lang, source, "og_description") ?? description;

  // og:image fallback chain -> absolute https.
  let ogImage = pickSeo(seo, lang, source, "og_image");
  if (!hasText(ogImage)) {
    ogImage = (content?.gallery ?? []).find((m: any) => hasText(m?.url))?.url;
  }
  if (!hasText(ogImage)) {
    ogImage = (content?.units ?? []).find((u: any) => hasText(u?.image?.url))
      ?.image?.url;
  }
  if (hasText(ogImage) && ogImage.startsWith("//")) ogImage = "https:" + ogImage;

  const canonical =
    pickSeo(seo, lang, source, "canonical") ??
    `${SITE_ORIGIN}/${slug}${lang !== source ? `?lang=${lang}` : ""}`;
  const pageUrl = `${SITE_ORIGIN}/${slug}${lang !== source ? `?lang=${lang}` : ""}`;

  const tags: string[] = [];
  tags.push(`<meta charset="utf-8">`);
  tags.push(`<meta name="viewport" content="width=device-width, initial-scale=1">`);
  if (hasText(title)) tags.push(`<title>${esc(title)}</title>`);
  if (hasText(description))
    tags.push(`<meta name="description" content="${esc(description)}">`);
  tags.push(`<link rel="canonical" href="${esc(canonical)}">`);

  if (hasText(ogTitle)) tags.push(`<meta property="og:title" content="${esc(ogTitle)}">`);
  if (hasText(ogDescription))
    tags.push(`<meta property="og:description" content="${esc(ogDescription)}">`);
  tags.push(`<meta property="og:type" content="website">`);
  tags.push(`<meta property="og:url" content="${esc(pageUrl)}">`);
  tags.push(`<meta property="og:locale" content="${LOCALE[lang] ?? "fr_FR"}">`);
  if (hasText(ogImage)) tags.push(`<meta property="og:image" content="${esc(ogImage)}">`);

  tags.push(`<meta name="twitter:card" content="summary_large_image">`);
  if (hasText(ogTitle)) tags.push(`<meta name="twitter:title" content="${esc(ogTitle)}">`);
  if (hasText(ogDescription))
    tags.push(`<meta name="twitter:description" content="${esc(ogDescription)}">`);
  if (hasText(ogImage)) tags.push(`<meta name="twitter:image" content="${esc(ogImage)}">`);

  // hreflang alternates
  for (const l of READING_LANGS) {
    const href = `${SITE_ORIGIN}/${slug}${l !== source ? `?lang=${l}` : ""}`;
    tags.push(`<link rel="alternate" hreflang="${l}" href="${esc(href)}">`);
  }

  const html = `<!doctype html>
<html lang="${esc(lang)}">
<head>
${tags.join("\n")}
</head>
<body>
<h1>${esc(hasText(title) ? title : slug)}</h1>
${hasText(description) ? `<p>${esc(description)}</p>` : ""}
<p><a href="${esc(pageUrl)}">${esc(SITE_ORIGIN)}/${esc(slug)}</a></p>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
});
