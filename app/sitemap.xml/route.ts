import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function xmlEscape(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const baseUrl = "https://fdx.trading";

  const { data: posts, error } = await supabase
    .from("blog_posts")
    .select("slug, created_at")
    .eq("published", true)
    .eq("lang", "en")
    .order("created_at", { ascending: false });

  // Static pages
  const urls: { loc: string; lastmod: string }[] = [
    { loc: `${baseUrl}/en`, lastmod: new Date().toISOString() },
    { loc: `${baseUrl}/en/about`, lastmod: new Date().toISOString() },
    { loc: `${baseUrl}/en/buyers`, lastmod: new Date().toISOString() },
    { loc: `${baseUrl}/en/manufacturers`, lastmod: new Date().toISOString() },
    { loc: `${baseUrl}/en/blog`, lastmod: new Date().toISOString() },
    { loc: `${baseUrl}/en/contact`, lastmod: new Date().toISOString() },
  ];

  // Dynamic blog posts
  if (!error && posts?.length) {
    for (const p of posts) {
      urls.push({
        loc: `${baseUrl}/en/blog/${p.slug}`,
        lastmod: new Date(p.created_at).toISOString(),
      });
    }
  }

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
    urls
      .map(
        (u) =>
          `<url><loc>${xmlEscape(u.loc)}</loc><lastmod>${u.lastmod}</lastmod></url>`
      )
      .join("") +
    `</urlset>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      // ✅ prevents stale sitemap caches
      "Cache-Control": "no-store, max-age=0",
    },
  });
}