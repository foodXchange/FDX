import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function GET() {
  const baseUrl = "https://fdx.trading";

  const { data: posts, error } = await supabaseServer
    .from("blog_posts")
    .select("slug, created_at")
    .in("published", [true, "true"])
    .in("lang", ["en", "EN"])
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Sitemap Supabase error:", error);
  }

  const today = new Date().toISOString().split("T")[0];

  const staticUrls = [
    { loc: `${baseUrl}/en`, lastmod: today },
    { loc: `${baseUrl}/en/about`, lastmod: today },
    { loc: `${baseUrl}/en/buyers`, lastmod: today },
    { loc: `${baseUrl}/en/manufacturers`, lastmod: today },
    { loc: `${baseUrl}/en/blog`, lastmod: today },
    { loc: `${baseUrl}/en/contact`, lastmod: today },
    { loc: `${baseUrl}/he/blog`, lastmod: today },
  ];

  const blogUrls = (posts || []).map((post) => ({
    loc: `${baseUrl}/en/blog/${post.slug}`,
    lastmod: new Date(post.created_at).toISOString().split("T")[0],
  }));

  const allUrls = [...staticUrls, ...blogUrls];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
    allUrls
      .map(
        (entry) => `
  <url>
    <loc>${esc(entry.loc)}</loc>
    <lastmod>${entry.lastmod.split("T")[0]}</lastmod>
  </url>`
      )
      .join("") +
    `
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
