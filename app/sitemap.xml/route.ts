import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const baseUrl = "https://fdx.trading";

  const { data: posts } = await supabase
    .from("blog_posts")
    .select("slug, created_at")
    .eq("published", true)
    .eq("lang", "en");

  const staticUrls = [
    { loc: `${baseUrl}/en`, lastmod: new Date().toISOString() },
    { loc: `${baseUrl}/en/about`, lastmod: new Date().toISOString() },
    { loc: `${baseUrl}/en/buyers`, lastmod: new Date().toISOString() },
    { loc: `${baseUrl}/en/manufacturers`, lastmod: new Date().toISOString() },
    { loc: `${baseUrl}/en/blog`, lastmod: new Date().toISOString() },
    { loc: `${baseUrl}/en/contact`, lastmod: new Date().toISOString() },
    { loc: `${baseUrl}/he/blog`, lastmod: new Date().toISOString() },
  ];

  const blogUrls =
    posts?.map(
      (post) => ({
        loc: `${baseUrl}/en/blog/${post.slug}`,
        lastmod: new Date(post.created_at).toISOString(),
      })
    ) || [];

  const allUrls = [...staticUrls, ...blogUrls];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls
  .map(
    (url) => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod.split("T")[0]}</lastmod>
  </url>`
  )
  .join("\n")}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "no-store",
    },
  });
}