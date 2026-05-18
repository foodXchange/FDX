import Image from "next/image";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import BlogCTA from "@/components/BlogCTA";
import StickyShare from "@/components/StickyShare";

type Params = Promise<{ slug: string }>;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function BlogPostPage({ params }: { params: Params }) {
  const { slug } = await params;

  // ✅ MAIN POST
  const { data: post, error } = await supabase
    .from("blog_posts")
    .select("title, slug, excerpt, content, created_at, cover_image, hero_image, tags")
    .eq("slug", slug)
    .eq("lang", "en")
    .eq("published", true)
    .single();

  if (!post || error) return notFound();

  // ✅ RELATED POSTS
  const { data: relatedPosts } = await supabase
    .from("blog_posts")
    .select("title, slug, cover_image")
    .eq("lang", "en")
    .eq("published", true)
    .neq("slug", slug)
    .order("created_at", { ascending: false })
    .limit(3);

  const heroSrc =
    post.hero_image || post.cover_image || "/blog/default-hero.png";

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  return (
    <main className="bg-white">

      {/* ✅ SHARE */}
      <StickyShare />

      {/* ✅ HERO */}
      <section className="relative w-full h-[420px] md:h-[520px] overflow-hidden group">

        <Image
          src={heroSrc}
          alt={post.title}
          fill
          priority
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          sizes="(max-width: 768px) 100vw, 1200px"
          quality={82}
        />

        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-transparent" />

        <div className="absolute inset-0 flex items-center">
          <div className="max-w-3xl mx-auto px-6">

            <div className="text-sm text-white/80 mb-3 flex gap-2">
              <span>{formatDate(post.created_at)}</span>
              <span>•</span>
              <span>5 min read</span>
            </div>

            <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight tracking-tight drop-shadow-md">
              {post.title}
            </h1>

            {post.excerpt && (
              <p className="mt-5 text-white/85 text-lg max-w-xl">
                {post.excerpt}
              </p>
            )}

            {/* ✅ TAGS (CLICKABLE → FILTER BLOG) */}
            {post.tags && (
              <div className="flex gap-2 mt-6 flex-wrap">
                {post.tags.map((tag: string) => (
                  <Link
                    key={tag}
                    href={`/en/blog?tag=${tag}`}
                    className="text-xs bg-white/20 backdrop-blur px-3 py-1 rounded-full text-white hover:bg-white/30 transition"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            )}

            {/* ✅ CTA */}
            <div className="mt-6 flex gap-4 flex-wrap">
              <a
                href="/en/contact"
                className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-md font-semibold shadow-md transition"
              >
                Start a sourcing project →
              </a>

              <a
                href="https://wa.me/972525222291"
                target="_blank"
                rel="noopener noreferrer"
                className="border border-white/60 text-white px-6 py-3 rounded-md hover:bg-white/10 transition"
              >
                WhatsApp
              </a>
            </div>

          </div>
        </div>
      </section>

      {/* ✅ ARTICLE */}
      <article className="max-w-3xl mx-auto px-6 pt-12 pb-24">

        <div
          className="
            prose prose-lg max-w-none
            prose-headings:text-slate-900 prose-headings:font-semibold
            prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-4
            prose-p:text-slate-800 prose-p:leading-relaxed prose-p:mb-6
            prose-li:text-slate-800
            prose-strong:text-slate-900
            prose-a:text-orange-600 hover:prose-a:underline
          "
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

      </article>

      {/* ✅ RELATED POSTS (CARDS) */}
      {relatedPosts && relatedPosts.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 pb-20">

          <h2 className="text-2xl font-semibold text-slate-900 mb-6">
            Related sourcing guides
          </h2>

          <div className="grid md:grid-cols-3 gap-6">

            {relatedPosts.map((item) => {
              const img = item.cover_image || "/blog/default-hero.png";

              return (
                <Link
                  key={item.slug}
                  href={`/en/blog/${item.slug}`}
                  className="group block border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition"
                >

                  <div className="relative h-[160px] overflow-hidden">
                    <Image
                      src={img}
                      alt={item.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                    />
                  </div>

                  <div className="p-4">
                    <h3 className="text-sm font-semibold text-slate-900 group-hover:text-orange-600 transition">
                      {item.title}
                    </h3>
                  </div>

                </Link>
              );
            })}

          </div>

        </section>
      )}

      {/* ✅ CTA */}
      <section className="bg-slate-50 py-20">
        <div className="max-w-3xl mx-auto px-6">
          <BlogCTA lang="en" />
        </div>
      </section>

    </main>
  );
}
