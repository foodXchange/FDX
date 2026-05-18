import { createClient } from "@supabase/supabase-js";

export default async function sitemap() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // ✅ Fetch blog posts
  const { data: posts } = await supabase
    .from("blog_posts")
    .select("slug, created_at")
    .eq("published", true)
    .eq("lang", "en");

  // ✅ Convert to sitemap format
  const blogUrls =
    posts?.map((post) => ({
      url: `https://fdx.trading/en/blog/${post.slug}`,
      lastModified: new Date(post.created_at),
    })) || [];

  return [
    // ✅ Static pages
    { url: "https://fdx.trading/en", lastModified: new Date() },
    { url: "https://fdx.trading/en/about", lastModified: new Date() },
    { url: "https://fdx.trading/en/buyers", lastModified: new Date() },
    { url: "https://fdx.trading/en/manufacturers", lastModified: new Date() },
    { url: "https://fdx.trading/en/blog", lastModified: new Date() },
    { url: "https://fdx.trading/en/contact", lastModified: new Date() },

    // ✅ Dynamic blog posts
    ...blogUrls,
  ];
}
