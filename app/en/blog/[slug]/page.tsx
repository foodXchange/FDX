import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { cache } from "react";

import BlogPostClient from "@/components/BlogPostClient";

type Params = Promise<{ slug: string }>;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ✅ Memoized fetch (prevents duplicate DB calls in page + generateMetadata)
const getPost = cache(async (slug: string) => {
  const { data, error } = await supabase
    .from("blog_posts")
    .select("title, slug, excerpt, content, created_at, cover_image, hero_image, tags, status, cover_alt, hero_alt, cover_position, hero_position")
    .eq("slug", slug)
    .eq("lang", "en")
    .eq("status", "published")
    .single();

  if (error) return null;
  return data;
});

const getRelatedPosts = cache(async (slug: string) => {
  const { data } = await supabase
    .from("blog_posts")
    .select("title, slug, cover_image, cover_alt, cover_position")
    .eq("lang", "en")
    .eq("status", "published")
    .neq("slug", slug)
    .order("created_at", { ascending: false })
    .limit(3);

  return data || [];
});

// ✅ Per-post metadata
export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);

  const canonical = `https://fdx.trading/en/blog/${slug}`;

  if (!post) {
    return {
      title: "Blog | FoodXchange",
      description:
        "Insights on importing food to Israel, private label sourcing, and supplier partnerships.",
      alternates: { canonical: "https://fdx.trading/en/blog" },
    };
  }

  const description =
    post.excerpt?.trim() ||
    "Practical sourcing insights and market notes from FoodXchange.";

  const ogImage =
    post.hero_image || post.cover_image || "/og-default.png";

  const keywords = (post.tags || []).slice(0, 12);

  return {
    title: post.title,
    description,
    keywords,
    alternates: { canonical },
    openGraph: {
      type: "article",
      url: canonical,
      title: post.title,
      description,
      siteName: "FoodXchange",
      images: [{ url: ogImage, width: 1200, height: 630 }],
      publishedTime: post.created_at ? new Date(post.created_at).toISOString() : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description,
      images: [ogImage],
    },
  };
}

export default async function BlogPostPage({ params }: { params: Params }) {
  const { slug } = await params;

  const post = await getPost(slug);
  if (!post) return notFound();

  const relatedPosts = await getRelatedPosts(slug);

  return <BlogPostClient post={post} relatedPosts={relatedPosts} />;
}
