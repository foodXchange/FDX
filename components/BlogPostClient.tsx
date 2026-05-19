"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import ReadingProgressBar from "@/components/ReadingProgressBar";

// ─── Types ────────────────────────────────────────────────────────────────────

type Post = {
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  created_at: string;
  cover_image: string | null;
  hero_image: string | null;
  tags: string[] | null;
  status: string;
  cover_alt?: string | null;
  hero_alt?: string | null;
  cover_position?: string | null;
  hero_position?: string | null;
};

type RelatedPost = {
  title: string;
  slug: string;
  cover_image: string | null;
  cover_alt?: string | null;
  cover_position?: string | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function calcReadTime(html: string): number {
  const words = html.replace(/<[^>]*>/g, "").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

function toSlug(text: string): string {
  return text
    .replace(/<[^>]*>/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function processContent(html: string): string {
  // 1. Add id= to every h2 for anchor linking
  const withIds = html.replace(
    /<h2([^>]*?)([\s\S]*?)<\/h2>/gi,
    (_, attrs, text) => `<h2${attrs} id="${toSlug(text)}">${text}</h2>`
  );

  // 2. Wrap <ul> that immediately follows a <h2> or <h3> in a callout box
  const withCallouts = withIds.replace(
    /(<h[23][^>]*>[\s\S]*?<\/h[23]>\s*)(<ul>)/gi,
    '$1<ul class="callout-list bg-orange-50 border border-orange-100 rounded-2xl p-6 pl-10 my-6 not-prose list-disc space-y-2">'
  );

  return withCallouts;
}

function extractTOC(html: string): { id: string; text: string }[] {
  const matches = html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/gi) ?? [];
  return matches.map((match) => {
    const text = match.replace(/<[^>]*>/g, "").trim();
    return { id: toSlug(text), text };
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BlogPostClient({
  post,
  relatedPosts,
}: {
  post: Post;
  relatedPosts: RelatedPost[];
}) {
  const [activeSection, setActiveSection] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const heroSrc = post.hero_image || post.cover_image || "/blog/default-hero.png";
  const readTime = calcReadTime(post.content ?? "");
  const formattedDate = formatDate(post.created_at);
  const processedContent = processContent(post.content ?? "");
  const toc = extractTOC(post.content ?? "");

  // Share URL — only available client-side
  useEffect(() => {
    setShareUrl(window.location.href);
  }, []);

  // Intersection observer for TOC active state
  useEffect(() => {
    if (toc.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries.find((e) => e.isIntersecting);
        if (first) setActiveSection(first.target.id);
      },
      { rootMargin: "-10% 0px -80% 0px" }
    );

    toc.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [toc]);

  function copyLink() {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const hasToc = toc.length > 0;

  return (
    <main className="bg-white">
      <ReadingProgressBar targetId="article-content" />

      {/* Callout list marker colour — can't be expressed as a Tailwind class */}
      <style dangerouslySetInnerHTML={{
        __html: `.callout-list li::marker{color:#f97316;font-size:1.1em}
                 .callout-list li{color:#334155;font-size:1.05rem;line-height:1.8}`
      }} />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative w-full h-[500px] md:h-[640px] overflow-hidden">
        <Image
          src={heroSrc}
          alt={post.hero_alt || post.cover_alt || post.title}
          fill
          className="object-cover"
          style={{ objectPosition: post.hero_position || "center center" }}
          sizes="100vw"
          quality={85}
          priority
        />
        {/* Gradient: dark at bottom for text legibility, softer at top */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/20 to-black/85" />

        {/* Tags — top of hero */}
        {post.tags?.length ? (
          <div className="absolute top-6 left-0 right-0 z-10">
            <div className="max-w-6xl mx-auto px-8 flex gap-2 flex-wrap">
              {post.tags.map((tag: string) => (
                <Link
                  key={tag}
                  href={`/en/blog?tag=${encodeURIComponent(tag)}`}
                  className="text-xs bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full text-white hover:bg-white/30 transition font-medium border border-white/20"
                >
                  {tag}
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        {/* Title block — bottom-left */}
        <div className="absolute bottom-0 left-0 right-0 pb-12">
          <div className="max-w-6xl mx-auto px-8">
            <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white max-w-3xl leading-tight drop-shadow-xl">
              {post.title}
            </h1>

            {post.excerpt && (
              <p className="hidden md:block text-xl text-white/80 max-w-2xl mt-4 leading-relaxed">
                {post.excerpt}
              </p>
            )}

            <div className="mt-8 flex gap-4 flex-wrap">
              <a
                href="/en/contact"
                className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 rounded-xl font-bold shadow-xl transition focus:outline-none focus:ring-2 focus:ring-orange-400 text-base"
              >
                Start a sourcing project →
              </a>
              <a
                href="https://wa.me/972525222291"
                target="_blank"
                rel="noopener noreferrer"
                className="border-2 border-white/60 text-white px-8 py-4 rounded-xl hover:bg-white/10 transition font-medium text-base"
              >
                WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── META BAR ─────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-8 py-3 flex items-center justify-between gap-4 flex-wrap">
          {/* Left: brand + date + read time */}
          <div className="flex items-center gap-3 text-sm text-slate-500 min-w-0">
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center text-white text-[10px] font-black select-none">
                FX
              </div>
              <span className="hidden sm:inline font-semibold text-slate-700">FoodXchange</span>
            </div>
            <span className="w-px h-5 bg-slate-200 shrink-0" />
            <span className="truncate">{formattedDate}</span>
            <span className="w-px h-5 bg-slate-200 shrink-0" />
            <span className="font-medium text-slate-700 shrink-0">{readTime} min read</span>
          </div>

          {/* Right: share buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={copyLink}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
            >
              {copied ? (
                <>
                  <svg className="w-3 h-3 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                    <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                  </svg>
                  Copy link
                </>
              )}
            </button>

            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
              LinkedIn
            </a>

            <a
              href={`https://wa.me/?text=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-green-500 text-white hover:bg-green-600 transition"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
              WhatsApp
            </a>
          </div>
        </div>
      </div>

      {/* ── ARTICLE + TOC ─────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6 md:px-8 py-14">
        <div className={`flex gap-14 items-start ${hasToc ? "" : "justify-center"}`}>

          {/* Article — 70% when TOC present, centered otherwise */}
          <article
            id="article-content"
            className={hasToc ? "min-w-0 flex-[7]" : "w-full max-w-3xl"}
          >
            <div
              className="
                prose prose-lg max-w-none
                prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-slate-900
                prose-h2:text-3xl prose-h2:mt-16 prose-h2:mb-6 prose-h2:pb-3 prose-h2:border-b-2 prose-h2:border-orange-200
                prose-h3:text-xl prose-h3:mt-10 prose-h3:mb-4 prose-h3:text-orange-800
                prose-p:text-slate-700 prose-p:leading-8 prose-p:text-lg prose-p:mb-6
                prose-ul:my-6 prose-ul:space-y-3
                prose-ol:my-6 prose-ol:space-y-3
                prose-li:text-slate-700 prose-li:text-lg prose-li:leading-7 prose-li:pl-2
                prose-strong:text-slate-900 prose-strong:font-bold
                prose-a:text-orange-600 prose-a:no-underline hover:prose-a:underline
                prose-blockquote:border-l-4 prose-blockquote:border-orange-400 prose-blockquote:bg-orange-50 prose-blockquote:rounded-r-xl prose-blockquote:py-4 prose-blockquote:px-6 prose-blockquote:not-italic prose-blockquote:text-slate-700
                prose-img:rounded-2xl prose-img:shadow-lg
              "
              dangerouslySetInnerHTML={{ __html: processedContent }}
            />

            {/* Topics covered */}
            {post.tags?.length ? (
              <div className="mt-16 pt-10 border-t border-slate-100">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">
                  Topics covered
                </p>
                <div className="flex gap-2 flex-wrap">
                  {post.tags.map((tag: string) => (
                    <Link
                      key={tag}
                      href={`/en/blog?tag=${encodeURIComponent(tag)}`}
                      className="text-sm bg-orange-50 text-orange-700 border border-orange-200 px-4 py-2 rounded-full hover:bg-orange-100 transition font-medium"
                    >
                      {tag}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </article>

          {/* TOC — 30%, desktop only, sticky */}
          {hasToc && (
            <aside className="hidden lg:block flex-[3] min-w-0 shrink-0">
              <div className="sticky top-20 pt-2">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-5">
                  In this article
                </p>
                <nav className="flex flex-col gap-0.5">
                  {toc.map(({ id, text }) => (
                    <button
                      key={id}
                      onClick={() => scrollTo(id)}
                      className={`text-left text-sm px-3 py-2 rounded-lg transition-all duration-150 leading-snug ${
                        activeSection === id
                          ? "bg-orange-50 text-orange-700 font-semibold border-l-2 border-orange-500 pl-3"
                          : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                      }`}
                    >
                      {text}
                    </button>
                  ))}
                </nav>
              </div>
            </aside>
          )}
        </div>
      </div>

      {/* ── RELATED POSTS ────────────────────────────────────────────────── */}
      {relatedPosts.length > 0 && (
        <section className="bg-slate-900 py-20">
          <div className="max-w-6xl mx-auto px-6 md:px-8">
            <h2 className="text-3xl font-black text-white mb-10">
              Continue reading
            </h2>

            <div className="grid md:grid-cols-3 gap-6">
              {relatedPosts.map((item) => {
                const img = item.cover_image || "/blog/default-hero.png";
                return (
                  <Link
                    key={item.slug}
                    href={`/en/blog/${item.slug}`}
                    className="group block bg-slate-800 rounded-2xl overflow-hidden hover:bg-slate-700 transition-colors duration-200"
                  >
                    <div className="relative h-[180px] overflow-hidden rounded-xl m-3">
                      <Image
                        src={img}
                        alt={item.cover_alt || item.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                        style={{ objectPosition: item.cover_position || "center center" }}
                        sizes="(max-width: 640px) 100vw, 33vw"
                        quality={75}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 to-transparent rounded-xl" />
                    </div>
                    <div className="px-5 pb-5 pt-1">
                      <h3 className="text-base font-bold text-white group-hover:text-orange-300 transition leading-snug line-clamp-2 mb-3">
                        {item.title}
                      </h3>
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-orange-400 group-hover:text-orange-300 transition">
                        Read →
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── BOTTOM CTA ───────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-r from-orange-500 to-orange-600 py-20">
        <div className="max-w-3xl mx-auto px-6 md:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-black text-white mb-4 leading-tight">
            Ready to source premium food products for the Israeli market?
          </h2>
          <p className="text-white/85 text-lg mb-10 max-w-xl mx-auto leading-relaxed">
            FoodXchange connects global manufacturers with Israeli buyers. Let&apos;s find the right partnership for your brand.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <a
              href="/en/contact"
              className="border-2 border-white text-white px-8 py-4 rounded-xl font-bold hover:bg-white hover:text-orange-600 transition text-base"
            >
              Start a sourcing project
            </a>
            <a
              href="https://wa.me/972525222291"
              target="_blank"
              rel="noopener noreferrer"
              className="border-2 border-white/50 text-white/90 px-8 py-4 rounded-xl font-bold hover:bg-white/10 transition text-base"
            >
              WhatsApp us
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
