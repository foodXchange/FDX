import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import BlogIndexClient from "@/components/BlogIndexClient";

export const metadata: Metadata = {
  title: "Blog | FoodXchange",
  description:
    "Insights on importing food to Israel, private label sourcing, and supplier partnerships.",
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type BlogPost = {
  title: string;
  slug: string;
  excerpt: string | null;
  created_at: string;
  cover_image: string | null;
  tags: string[] | null;
};

async function getPosts(): Promise<BlogPost[]> {
  const { data, error } = await supabase
    .from("blog_posts")
    .select("title, slug, excerpt, created_at, cover_image, tags")
    .eq("status", "published")
    .eq("lang", "en")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Blog fetch error:", JSON.stringify(error, null, 2));
    return [];
  }

  return (data || []) as BlogPost[];
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const posts = await getPosts();

  // Next.js dynamic APIs: searchParams can be async in recent versions.
  const sp = (await searchParams) || {};
  const tag = typeof sp.tag === "string" ? sp.tag : null;

  return <BlogIndexClient posts={posts} initialTag={tag} />;
}
``