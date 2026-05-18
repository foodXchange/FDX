import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic"; // ✅ prevent caching of GET route handler [1](https://nextjs.org/docs/14/app/building-your-application/routing/route-handlers)
export const runtime = "nodejs";

function esc(s: string) {
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

  const staticUrls = [
    `${baseUrl}/en`,
    `${baseUrl}/en/about`,
    `${baseUrl}/en/buyers`,
    `${baseUrl}/en/manufacturers`,
    `${baseUrl}/en/blog`,
    `${baseUrl}/en/contact`,
    `${baseUrl}/he/blog`,
  ];

  const blogUrls =
    !error && posts?.length
      ? posts.map((p) => ({
          loc: `${baseUrl}/en/blog/${p.slug}`,
          lastmod: new Date(p.created_at).toISOString(),
        }))
      : [];

  const now = new Date().toISOString();

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
    staticUrls
      .map((u) => `<url><loc>${esc(u)}</loc><lastmod>${now}</lastmod></url>`)
      .join("") +
    blogUrls
      .map((u) => `<url><loc>${esc(u.loc)}</loc><lastmod>${u.lastmod}</lastmod></url>`)
      .join("") +
    `</urlset>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
``