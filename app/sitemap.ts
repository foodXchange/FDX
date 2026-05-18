import { createClient } from "@supabase/supabase-js";

export default async function sitemap() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: posts, error } = await supabase
      .from("blog_posts")
      .select("slug, created_at")
      .eq("published", true)
      .eq("lang", "en");

    console.log("SITEMAP POSTS:", posts);

    const blogUrls =
      posts?.map((post) => ({
        url: `https://fdx.trading/en/blog/${post.slug}`,
        lastModified: new Date(post.created_at),
      })) || [];

    return [
      { url: "https://fdx.trading/en", lastModified: new Date() },
      { url: "https://fdx.trading/en/about", lastModified: new Date() },
      { url: "https://fdx.trading/en/buyers", lastModified: new Date() },
      { url: "https://fdx.trading/en/manufacturers", lastModified: new Date() },
      { url: "https://fdx.trading/en/blog", lastModified: new Date() },
      { url: "https://fdx.trading/en/contact", lastModified: new Date() },

      ...blogUrls,
    ];
  } catch (e) {
    console.error("SITEMAP ERROR:", e);

    // fallback so sitemap never breaks
    return [
      { url: "https://fdx.trading/en", lastModified: new Date() },
      { url: "https://fdx.trading/en/blog", lastModified: new Date() },
    ];
  }
}
``