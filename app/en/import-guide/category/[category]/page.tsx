import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { IMPORT_GUIDE_CATEGORIES } from "@/types/importGuide";
import type { ImportGuideListItem } from "@/types/importGuide";

export const revalidate = 3600;

type Params = Promise<{ category: string }>;

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { category } = await params;
  const cat = IMPORT_GUIDE_CATEGORIES.find((c) => c.slug === category);
  if (!cat) return { title: "Category | FoodXchange Import Guide" };

  return {
    title: `${cat.title} — Israeli Import Guide | FoodXchange`,
    description: cat.description,
    alternates: {
      canonical: `https://fdx.trading/en/import-guide/category/${category}`,
    },
    openGraph: {
      title: `${cat.title} — Israeli Import Guide | FoodXchange`,
      description: cat.description,
      url: `https://fdx.trading/en/import-guide/category/${category}`,
      type: "website",
      siteName: "FoodXchange",
    },
  };
}

export default async function ImportGuideCategoryPage({ params }: { params: Params }) {
  const { category } = await params;
  const cat = IMPORT_GUIDE_CATEGORIES.find((c) => c.slug === category);
  if (!cat) notFound();

  const { data } = await supabase
    .from("import_guide_articles")
    .select("id,title,slug,category,summary,reading_time_mins,tags,updated_at")
    .eq("published", true)
    .eq("category", category)
    .order("updated_at", { ascending: false });

  const articles = (data ?? []) as ImportGuideListItem[];

  return (
    <main className="bg-slate-900">
      {/* HERO */}
      <section className="bg-linear-to-b from-slate-900 to-slate-800 text-white py-12 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <nav className="text-slate-400 text-sm mb-4 flex items-center justify-center gap-2">
            <Link href="/en/import-guide" className="hover:text-white transition">
              Import Guide
            </Link>
            <span>›</span>
            <span className="text-slate-300">{cat.title}</span>
          </nav>

          <div className="text-4xl mb-4">{cat.icon}</div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            {cat.title}
          </h1>
          <p className="text-slate-300 mt-4 max-w-xl mx-auto leading-relaxed">
            {cat.description}
          </p>
          <p className="text-slate-400 text-sm mt-3">
            {articles.length} article{articles.length !== 1 ? "s" : ""}
          </p>
        </div>
      </section>

      {/* ARTICLES */}
      <section className="max-w-4xl mx-auto px-6 py-12">
        {articles.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-400 text-lg font-medium mb-3">
              Articles coming soon for this category.
            </p>
            <p className="text-slate-500 text-sm mb-6">
              Subscribe to be notified when we publish.
            </p>
            <Link
              href="/en/newsletter"
              className="inline-flex text-orange-400 font-medium text-sm hover:text-orange-300 transition"
            >
              Subscribe for updates →
            </Link>
          </div>
        ) : (
          <div className="grid gap-6">
            {articles.map((article) => (
              <article
                key={article.id}
                className="group border border-slate-700 rounded-xl p-6 bg-slate-800 hover:-translate-y-0.5 transition-all duration-300"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/en/import-guide/${article.slug}`}
                      className="block"
                    >
                      <h2 className="text-lg font-semibold text-white group-hover:text-orange-400 transition mb-2">
                        {article.title}
                      </h2>
                    </Link>

                    {article.summary && (
                      <p className="text-slate-300 text-sm leading-relaxed mb-4 line-clamp-2">
                        {article.summary}
                      </p>
                    )}

                    {article.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {article.tags.slice(0, 4).map((tag) => (
                          <span
                            key={tag}
                            className="bg-slate-700 text-slate-400 rounded-full px-2.5 py-0.5 text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span>{article.reading_time_mins} min read</span>
                      <span>·</span>
                      <span>Updated {formatDate(article.updated_at)}</span>
                    </div>
                  </div>

                  <Link
                    href={`/en/import-guide/${article.slug}`}
                    className="shrink-0 text-orange-400 text-sm font-medium hover:text-orange-300 transition"
                  >
                    Read article →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Back link */}
        <div className="mt-10 pt-8 border-t border-slate-800">
          <Link
            href="/en/import-guide"
            className="text-sm text-slate-500 hover:text-orange-400 transition"
          >
            ← Back to Import Guide
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-orange-500 text-white py-16 px-6 text-center">
        <h2 className="text-3xl font-bold mb-4">
          Need help with {cat.title.toLowerCase()}?
        </h2>
        <p className="text-orange-100 text-lg mb-8 max-w-2xl mx-auto">
          We navigate import requirements so you can focus on finding the right
          products. Tell us what you&apos;re sourcing.
        </p>
        <Link
          href={`/en/contact?topic=${cat.slug}`}
          className="inline-flex bg-white text-orange-600 hover:bg-orange-50 px-8 py-4 rounded-xl font-semibold text-lg transition shadow"
        >
          Start a conversation →
        </Link>
      </section>
    </main>
  );
}
