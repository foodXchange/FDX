import type { Metadata } from "next";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { IMPORT_GUIDE_CATEGORIES } from "@/types/importGuide";
import type { ImportGuideListItem } from "@/types/importGuide";

export const revalidate = 0; // temporary: force fresh fetch while debugging

export const metadata: Metadata = {
  title: "Israeli Food Import Guide | FoodXchange",
  description:
    "Complete guide to importing food products into Israel — labeling requirements, kosher certification, import permits, standards compliance, and customs procedures.",
  alternates: {
    canonical: "https://fdx.trading/en/import-guide",
  },
  openGraph: {
    title: "Israeli Food Import Guide | FoodXchange",
    description:
      "Complete guide to importing food products into Israel — labeling requirements, kosher certification, import permits, standards compliance, and customs procedures.",
    url: "https://fdx.trading/en/import-guide",
    type: "website",
    siteName: "FoodXchange",
  },
};

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function ImportGuideHubPage() {
  const [{ data: recentArticles }, { data: allArticles }] = await Promise.all([
    supabase
      .from("import_guide_articles")
      .select("id,title,slug,category,summary,reading_time_mins,updated_at")
      .eq("published", true)
      .order("updated_at", { ascending: false })
      .limit(6),
    supabase
      .from("import_guide_articles")
      .select("category")
      .eq("published", true),
  ]);

  const articles = (recentArticles ?? []) as ImportGuideListItem[];
  const totalCount = allArticles?.length ?? 0;
  const countByCategory = (slug: string) =>
    (allArticles ?? []).filter((a) => a.category === slug).length;

  return (
    <main className="bg-slate-900">
      {/* HERO */}
      <section className="bg-linear-to-b from-slate-900 to-slate-800 text-white py-20 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <p className="text-orange-400 text-xs font-semibold tracking-widest uppercase mb-3">
            FREE RESOURCE
          </p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Israeli Food Import Guide
          </h1>
          <p className="text-slate-300 text-lg mt-4 max-w-2xl mx-auto leading-relaxed">
            Everything you need to import food products into Israel — regulations,
            certifications, labeling, and procedures. Updated regularly based on
            active sourcing work.
          </p>

          {/* Search */}
          <form
            action="/en/import-guide/search"
            method="GET"
            className="max-w-lg mx-auto mt-8"
          >
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg pointer-events-none">
                🔍
              </span>
              <input
                name="q"
                type="text"
                placeholder="Search regulations, requirements..."
                autoComplete="off"
                className="w-full bg-white/10 border border-white/20 text-white placeholder:text-slate-400 rounded-xl px-5 py-4 pl-12 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/40 transition"
              />
            </div>
          </form>

          <p className="text-slate-400 text-sm mt-4">
            {totalCount} article{totalCount !== 1 ? "s" : ""} · Free access
          </p>
        </div>
      </section>

      {/* CATEGORIES */}
      <section id="categories" className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-semibold text-white mb-8">
          Browse by topic
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {IMPORT_GUIDE_CATEGORIES.map((cat) => {
            const count = countByCategory(cat.slug);
            return (
              <Link
                key={cat.slug}
                href={`/en/import-guide/category/${cat.slug}`}
                className="border border-slate-700 rounded-2xl p-6 hover:border-orange-500/50 hover:bg-slate-800 transition-all duration-200 block group"
              >
                <div className="text-3xl mb-4">{cat.icon}</div>
                <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-orange-400 transition">
                  {cat.title}
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  {cat.description}
                </p>
                <p className="text-xs font-medium mt-4">
                  {count > 0 ? (
                    <span className="text-orange-400">{count} article{count !== 1 ? "s" : ""} →</span>
                  ) : (
                    <span className="text-slate-500">Coming soon</span>
                  )}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* RECENTLY UPDATED */}
      {articles.length > 0 && (
        <section className="max-w-4xl mx-auto px-6 pb-16">
          <h2 className="text-xl font-semibold text-white mb-6">
            Recently updated
          </h2>
          <div className="divide-y divide-slate-800">
            {articles.map((article) => {
              const category = IMPORT_GUIDE_CATEGORIES.find(
                (c) => c.slug === article.category
              );
              return (
                <Link
                  key={article.id}
                  href={`/en/import-guide/${article.slug}`}
                  className="flex items-start gap-4 py-4 hover:bg-slate-800 -mx-4 px-4 rounded-lg transition group"
                >
                  <span className="shrink-0 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap mt-0.5">
                    {category?.title ?? article.category}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium group-hover:text-orange-400 transition">
                      {article.title}
                    </p>
                    {article.summary && (
                      <p className="text-slate-400 text-sm mt-1 line-clamp-1">
                        {article.summary.slice(0, 120)}
                        {article.summary.length > 120 ? "…" : ""}
                      </p>
                    )}
                  </div>
                  <span className="text-slate-500 text-xs shrink-0 mt-0.5">
                    {article.reading_time_mins} min read
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* LEAD CTA */}
      <section className="bg-orange-500 text-white py-16 px-6 text-center">
        <h2 className="text-3xl font-bold mb-4">
          Need help navigating Israeli import requirements?
        </h2>
        <p className="text-orange-100 text-lg mb-8 max-w-2xl mx-auto">
          We handle the sourcing — product selection, supplier validation,
          documentation, and import coordination. Tell us what you need.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link
            href="/en/contact"
            className="bg-white text-orange-600 hover:bg-orange-50 px-8 py-4 rounded-xl font-semibold text-lg transition shadow"
          >
            Start a sourcing conversation →
          </Link>
          <a
            href="#categories"
            className="border border-white/30 text-white hover:bg-white/10 px-8 py-4 rounded-xl font-medium text-lg transition"
          >
            Browse all articles
          </a>
        </div>
      </section>
    </main>
  );
}
