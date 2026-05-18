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

  const urls = [
    `${baseUrl}/en`,
    `${baseUrl}/en/about`,
    `${baseUrl}/en/buyers`,
    `${baseUrl}/en/manufacturers`,
    `${baseUrl}/en/blog`,
    `${baseUrl}/en/contact`,
  ];

  const blogUrls =
    posts?.map(
      (post) => `${baseUrl}/en/blog/${post.slug}`
    ) || [];

  const allUrls = [...urls, ...blogUrls];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    ${allUrls
      .map(
        (url) => `
      <url>
        <loc>${url}</loc>
        <lastmod>${new Date().toISOString()}</lastmod>
      </url>`
      )
      .join("")}
  </urlset>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "no-store",
    },
  });
}
``