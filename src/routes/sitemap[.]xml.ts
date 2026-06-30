import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "https://ccinvest.lovable.app";
const LANGS = ["fr", "he", "en"];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const supaUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
        const supaKey =
          (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ??
          (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined);

        let slugs: { slug: string; source_lang: string }[] = [];
        if (supaUrl && supaKey) {
          try {
            const resp = await fetch(
              `${supaUrl}/rest/v1/pages?status=eq.published&select=slug,source_lang`,
              { headers: { apikey: supaKey, Authorization: `Bearer ${supaKey}` } },
            );
            if (resp.ok) slugs = await resp.json();
          } catch {
            slugs = [];
          }
        }

        const urls: string[] = [
          `  <url><loc>${BASE_URL}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>`,
          `  <url><loc>${BASE_URL}/appartements</loc><changefreq>weekly</changefreq><priority>0.9</priority></url>`,
          `  <url><loc>${BASE_URL}/projects</loc><changefreq>weekly</changefreq><priority>0.9</priority></url>`,
          `  <url><loc>${BASE_URL}/about</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>`,
        ];

        for (const { slug, source_lang } of slugs) {
          const source = source_lang || "fr";
          const alternates = LANGS.map((l) => {
            const href =
              l === source ? `${BASE_URL}/${slug}` : `${BASE_URL}/${slug}?lang=${l}`;
            return `    <xhtml:link rel="alternate" hreflang="${l}" href="${href}"/>`;
          }).join("\n");
          urls.push(
            [
              `  <url>`,
              `    <loc>${BASE_URL}/${slug}</loc>`,
              alternates,
              `    <changefreq>weekly</changefreq>`,
              `    <priority>0.8</priority>`,
              `  </url>`,
            ].join("\n"),
          );
        }

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
