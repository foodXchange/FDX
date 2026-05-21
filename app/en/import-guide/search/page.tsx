import type { Metadata } from "next";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { IMPORT_GUIDE_CATEGORIES } from "@/types/importGuide";
import type { ImportGuideListItem } from "@/types/importGuide";

export const revalidate = 3600;

type SearchParams = Promise<{ q?: string }>;

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  return {
    title: query
      ? `"${query}" — Import Guide Search | FoodXchange`
      : "Search Import Guide | FoodXchange",
    robots: { index: false },
  };
}

export default async function ImportGuideSearchPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  let results: ImportGuideListItem[] = [];
  let totalArticles = 0;

  const { count } = await supabase
    .from("import_guide_articles")
    .select("*", { count: "exact", head: true })
    .eq("published", true);

  totalArticles = count ?? 0;

  if (query) {
    const { data } = await supabase
      .from("import_guide_articles")
      .select("id,title,slug,category,summary,reading_time_mins,updated_at")
      .eq("published", true)
      .textSearch("search_vector", query, { type: "plain", config: "english" })
      .limit(20);
    results = (data ?? []) as ImportGuideListItem[];
  }

  return (
    <main className="bg-white text-slate-900">
      {/* HERO / SEARCH BAR */}
      <section className="bg-linear-to-b from-slate-900 to-slate-800 text-white py-16 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <nav className="text-slate-400 text-sm mb-4 flex items-center justify-center gap-2">
            <Link href="/en/import-guide" className="hover:text-white transition">
              Import Guide
            </Link>
            <span>›</span>
            <span className="text-slate-300">Search</span>
          </nav>

          <h1 className="text-3xl font-bold mb-6">Search Import Guide</h1>

          <form action="/en/import-guide/search" method="GET" className="max-w-lg mx-auto">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg pointer-events-none">
                🔍
              </span>
              <input
                name="q"
                type="text"
                defaultValue={query}
                placeholder="Search regulations, requirements..."
                autoFocus
                autoComplete="off"
                className="w-full bg-white/10 border border-white/20 text-white placeholder:text-slate-400 rounded-xl px-5 py-4 pl-12 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/40 transition"
              />
            </div>
          </form>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 py-12">
        {!query ? (
          /* No query state */
          <div className="text-center py-8">
            <p className="text-slate-500 text-lg mb-6">
              Search {totalArticles} article{totalArticles !== 1 ? "s" : ""} about Israeli food
              import regulations
            </p>
            <div className="mt-8">
              <p className="text-sm text-slate-500 mb-4">Or browse by topic:</p>
              <div className="flex flex-wrap gap-3 justify-center">
                {IMPORT_GUIDE_CATEGORIES.map((cat) => (
                  <Link
                    key={cat.slug}
                    href={`/en/import-guide/category/${cat.slug}`}
                    className="flex items-center gap-2 border border-slate-200 rounded-full px-4 py-2 text-sm text-slate-600 hover:border-orange-300 hover:text-orange-600 transition"
                  >
                    <span>{cat.icon}</span>
                    {cat.title}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ) : results.length === 0 ? (
          /* No results */
          <div className="text-center py-16">
            <p className="text-3xl mb-4">🔍</p>
            <h2 className="text-xl font-semibold text-slate-700 mb-2">
              No articles found for &ldquo;{query}&rdquo;
            </h2>
            <p className="text-slate-500 text-sm mb-6">
              Try different keywords or browse by category.
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Link
                href="/en/import-guide"
                className="border border-slate-200 hover:border-slate-300 px-5 py-2.5 rounded-lg text-sm text-slate-600 transition"
              >
                Browse all categories
              </Link>
              <Link
                href="/en/contact"
                className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition"
              >
                Ask us directly
              </Link>
            </div>
          </div>
        ) : (
          /* Results */
          <>
            <p className="text-sm text-slate-500 mb-6">
              {results.length} result{results.length !== 1 ? "s" : ""} for &ldquo;{query}&rdquo;
            </p>
            <div className="space-y-4">
              {results.map((article) => {
                const category = IMPORT_GUIDE_CATEGORIES.find(
                  (c) => c.slug === article.category
                );
                return (
                  <article
                    key={article.id}
                    className="group border border-slate-200 rounded-xl p-5 hover:border-orange-200 hover:bg-orange-50/20 transition"
                  >
                    <div className="flex items-start gap-3">
                      <span className="shrink-0 bg-orange-50 text-orange-700 border border-orange-100 rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap mt-0.5">
                        {category?.title ?? article.category}
                      </span>
                      <div className="flex-1 min-w-0">
                        <Link href={`/en/import-guide/${article.slug}`}>
                          <h2 className="font-medium text-slate-900 group-hover:text-orange-600 transition">
                            {article.title}
                          </h2>
                        </Link>
                        {article.summary && (
                          <p className="text-slate-500 text-sm mt-1 line-clamp-2">
                            {article.summary}
                          </p>
                        )}
                        <p className="text-xs text-slate-400 mt-2">
                          {article.reading_time_mins} min read · Updated{" "}
                          {formatDate(article.updated_at)}
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
