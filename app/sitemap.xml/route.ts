import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { supabase } from "@/lib/supabase";
import { CATEGORY_SLUGS } from "@/lib/products/categorySlug";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
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

  const { data: newsletterIssues } = await supabaseServer
    .from("newsletter_issues")
    .select("slug, created_at")
    .eq("published", true)
    .order("created_at", { ascending: false });

  const today = new Date().toISOString().split("T")[0];

  const staticUrls = [
    { loc: `${baseUrl}/en`, lastmod: today },
    { loc: `${baseUrl}/en/products`, lastmod: today, priority: 0.9 },
    { loc: `${baseUrl}/en/about`, lastmod: today },
    { loc: `${baseUrl}/en/buyers`, lastmod: today },
    { loc: `${baseUrl}/en/manufacturers`, lastmod: today },
    { loc: `${baseUrl}/en/blog`, lastmod: today },
    { loc: `${baseUrl}/en/newsletter`, lastmod: today },
    { loc: `${baseUrl}/en/portfolio`, lastmod: today },
    { loc: `${baseUrl}/en/sourcing`, lastmod: today, priority: 0.9 },
    { loc: `${baseUrl}/en/contact`, lastmod: today },
    { loc: `${baseUrl}/en/help`, lastmod: today, priority: 0.7 },
    { loc: `${baseUrl}/he/blog`, lastmod: today },
  ];

  const blogUrls = (posts || []).map((post) => ({
    loc: `${baseUrl}/en/blog/${post.slug}`,
    lastmod: new Date(post.created_at).toISOString().split("T")[0],
  }));

  const newsletterUrls = (newsletterIssues || []).map((issue) => ({
    loc: `${baseUrl}/en/newsletter/${issue.slug}`,
    lastmod: new Date(issue.created_at).toISOString().split("T")[0],
    changefreq: "weekly",
    priority: 0.7,
  }));

  const { data: portfolioItems } = await supabaseServer
    .from("portfolio_items")
    .select("slug, created_at")
    .eq("published", true)
    .order("created_at", { ascending: false });

  const portfolioUrls = (portfolioItems || []).map((item) => ({
    loc: `${baseUrl}/en/portfolio/${item.slug}`,
    lastmod: new Date(item.created_at).toISOString().split("T")[0],
    changefreq: "monthly",
    priority: 0.6,
  }));

  // Category product pages
  const categoryUrls = Object.values(CATEGORY_SLUGS).map((slug) => ({
    loc: `${baseUrl}/en/products/${slug}`,
    lastmod: today,
    changefreq: "weekly",
    priority: 0.8,
  }));

  // Import Guide
  const { data: importGuideArticles } = await supabaseServer
    .from("import_guide_articles")
    .select("slug, updated_at")
    .eq("published", true);

  const importGuideStaticUrls = [
    { loc: `${baseUrl}/en/import-guide`, lastmod: today, priority: 0.9 },
    ...["labeling","kosher","standards","permits","categories","countries","cold-chain","certifications","customs"].map((slug) => ({
      loc: `${baseUrl}/en/import-guide/category/${slug}`,
      lastmod: today,
      priority: 0.7,
    })),
  ];

  const importGuideArticleUrls = (importGuideArticles || []).map((article) => ({
    loc: `${baseUrl}/en/import-guide/${article.slug}`,
    lastmod: new Date(article.updated_at).toISOString().split("T")[0],
    changefreq: "monthly",
    priority: 0.8,
  }));

  // Help Center
  const { data: helpArticles } = await supabaseServer
    .from("kb_articles")
    .select("slug, updated_at")
    .eq("is_public", true)
    .eq("status", "published");

  const helpArticleUrls = (helpArticles || []).map((article) => ({
    loc: `${baseUrl}/en/help/${article.slug}`,
    lastmod: new Date(article.updated_at).toISOString().split("T")[0],
    changefreq: "monthly",
    priority: 0.6,
  }));

  const allUrls = [
    ...staticUrls,
    ...categoryUrls,
    ...blogUrls,
    ...newsletterUrls,
    ...portfolioUrls,
    ...importGuideStaticUrls,
    ...importGuideArticleUrls,
    ...helpArticleUrls,
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls
  .map((entry) => {
    const extra = [
      "changefreq" in entry && entry.changefreq
        ? `\n    <changefreq>${entry.changefreq}</changefreq>`
        : "",
      "priority" in entry && entry.priority !== undefined
        ? `\n    <priority>${entry.priority}</priority>`
        : "",
    ].join("");
    return `
  <url>
    <loc>${esc(entry.loc)}</loc>
    <lastmod>${entry.lastmod}</lastmod>${extra}
  </url>`;
  })
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