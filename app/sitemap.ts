import { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://fdx.trading";

  // ✅ Fetch blog posts
  const { data: posts } = await supabase
    .from("blog_posts")
    .select("slug, updated_at")
    .eq("published", true);

  const blogUrls =
    posts?.map((post) => ({
      url: `${baseUrl}/he/blog/${post.slug}`,
      lastModified: post.updated_at || new Date(),
    })) || [];

  return [
    // ✅ Static pages
    { url: `${baseUrl}/en`, lastModified: new Date() },
    { url: `${baseUrl}/en/about`, lastModified: new Date() },
    { url: `${baseUrl}/en/buyers`, lastModified: new Date() },
    { url: `${baseUrl}/en/manufacturers`, lastModified: new Date() },
    { url: `${baseUrl}/en/blog`, lastModified: new Date() },
    { url: `${baseUrl}/en/contact`, lastModified: new Date() },

    { url: `${baseUrl}/he/blog`, lastModified: new Date() },

    // ✅ Dynamic blog
    ...blogUrls,
  ];
}
