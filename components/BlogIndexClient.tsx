"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import BlogCTA from "@/components/BlogCTA";
import type { BlogPost } from "@/app/en/blog/page";

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function BlogIndexClient({
  posts,
  initialTag = null,
}: {
  posts: BlogPost[];
  initialTag?: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const fallbackCover = "/blog/default-hero.png";

  const allTags = useMemo(() => {
    const tags = posts.flatMap((p) => p.tags || []);
    return Array.from(new Set(tags)).sort((a, b) => a.localeCompare(b));
  }, [posts]);

  const urlTag = searchParams.get("tag"); // live URL value
  const [activeTag, setActiveTag] = useState<string | null>(initialTag);

  // Keep state synced with URL (for direct landing / back button)
  useEffect(() => {
    if (urlTag !== activeTag) {
      setActiveTag(urlTag);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlTag]);

  const filteredPosts = useMemo(() => {
    if (!activeTag) return posts;
    return posts.filter((p) => (p.tags || []).includes(activeTag));
  }, [posts, activeTag]);

  const featured = filteredPosts[0] ?? null;
  const rest = filteredPosts.slice(1);

  function setTag(tag: string | null) {
    setActiveTag(tag);

    // Update URL without full reload
    const params = new URLSearchParams(searchParams.toString());
    if (!tag) params.delete("tag");
    else params.set("tag", tag);

    const qs = params.toString();
    router.push(qs ? `/en/blog?${qs}` : "/en/blog", { scroll: false });
  }

  return (
    <main>
      {/* HERO */}
      <section className="relative h-[300px] md:h-[340px] flex items-center justify-center text-center overflow-hidden">
        <Image
          src={fallbackCover}
          alt="FoodXchange blog"
          fill
          className="object-cover"
          sizes="100vw"
          quality={75}
          priority
        />
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative z-10 max-w-2xl px-6">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
            Food Sourcing Insights
          </h1>
          <p className="text-white/85 text-lg leading-relaxed">
            Practical guidance on importing, sourcing, and private label strategy in Israel.
          </p>
        </div>
      </section>

      {/* TAG FILTER BAR */}
      <section className="max-w-6xl mx-auto px-6 pt-10 pb-6">
        <div className="flex flex-wrap gap-3 items-center">
          <button
            type="button"
            onClick={() => setTag(null)}
            className={`px-4 py-2 rounded-full text-sm border transition ${
              activeTag === null
                ? "bg-orange-500 text-white border-orange-500"
                : "text-slate-400 border-white/10 hover:bg-white/5"
            }`}
          >
            All
          </button>

          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setTag(tag)}
              className={`px-4 py-2 rounded-full text-sm border transition ${
                activeTag === tag
                  ? "bg-orange-500 text-white border-orange-500"
                  : "text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        {activeTag && (
          <p className="mt-4 text-sm text-slate-400">
            Showing posts tagged: <span className="font-semibold">{activeTag}</span>
          </p>
        )}
      </section>

      {/* FEATURED */}
      {featured && (
        <section className="max-w-6xl mx-auto px-6 pb-10">
          <Link
            href={`/en/blog/${featured.slug}`}
            className="group dark-card block overflow-hidden hover:border-orange-500/30 hover:shadow-md transition"
          >
            <div className="grid md:grid-cols-2">
              <div className="relative h-[260px] md:h-[320px] overflow-hidden">
                <Image
                  src={featured.cover_image || fallbackCover}
                  alt={featured.title}
                  fill
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  quality={78}
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
              </div>

              <div className="p-8 md:p-10 flex flex-col justify-center">
                <div className="text-sm text-slate-500 mb-2">
                  {formatDate(featured.created_at)}
                </div>

                <h2 className="text-3xl font-bold text-dark-text-primary mb-4 tracking-tight group-hover:text-orange-400 transition-colors">
                  {featured.title}
                </h2>

                {featured.excerpt && (
                  <p className="text-slate-400 leading-relaxed mb-6">
                    {featured.excerpt}
                  </p>
                )}

                {(featured.tags || []).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {(featured.tags || []).slice(0, 5).map((t) => (
                      <span
                        key={t}
                        className="text-xs bg-white/6 text-slate-400 px-3 py-1 rounded-full"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}

                <span className="mt-6 text-orange-400 font-semibold">
                  Read full article →
                </span>
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* GRID */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        {rest.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-500">No more articles in this category yet.</p>
          </div>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((post) => (
              <Link
                key={post.slug}
                href={`/en/blog/${post.slug}`}
                className="group dark-card block overflow-hidden hover:border-orange-500/30 hover:shadow-md transition hover:-translate-y-0.5"
              >
                <div className="relative h-[180px] overflow-hidden">
                  <Image
                    src={post.cover_image || fallbackCover}
                    alt={post.title}
                    fill
                    className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.05]"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    quality={75}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                </div>

                <div className="p-5">
                  <div className="text-xs text-slate-500 mb-2">
                    {formatDate(post.created_at)}
                  </div>

                  <h3 className="text-lg font-semibold text-dark-text-primary mb-2 leading-snug group-hover:text-orange-400 transition-colors">
                    {post.title}
                  </h3>

                  {post.excerpt && (
                    <p className="text-sm text-slate-400 leading-relaxed line-clamp-3 mb-4">
                      {post.excerpt}
                    </p>
                  )}

                  {(post.tags || []).length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {(post.tags || []).slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className="text-[11px] bg-white/6 text-slate-400 px-2.5 py-1 rounded-full"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  <span className="text-orange-400 font-semibold text-sm">
                    Read →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-6">
          <BlogCTA lang="en" />
        </div>
      </section>
    </main>
  );
}