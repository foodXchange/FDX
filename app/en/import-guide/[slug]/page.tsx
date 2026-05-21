import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { IMPORT_GUIDE_CATEGORIES } from "@/types/importGuide";
import type { ImportGuideArticle } from "@/types/importGuide";

export const revalidate = 3600;

type Params = Promise<{ slug: string }>;

type RelatedScenario = {
  title: string;
  slug: string;
  summary: string | null;
  category: string | null;
};

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function extractH2Headings(html: string): { text: string; anchor: string }[] {
  const matches = [...html.matchAll(/<h2[^>]*>(.*?)<\/h2>/gi)];
  return matches.map((m) => {
    const text = m[1].replace(/<[^>]+>/g, "");
    const anchor = text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    return { text, anchor };
  });
}

function addHeadingIds(html: string): string {
  return html.replace(/<h2([^>]*)>(.*?)<\/h2>/gi, (_match, attrs, inner) => {
    const text = inner.replace(/<[^>]+>/g, "");
    const id = text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    return `<h2${attrs} id="${id}">${inner}</h2>`;
  });
}

export async function generateStaticParams() {
  const { data } = await supabase
    .from("import_guide_articles")
    .select("slug")
    .eq("published", true);
  return (data ?? []).map((item: { slug: string }) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const { data } = await supabase
    .from("import_guide_articles")
    .select("title,summary,meta_title,meta_description,created_at,updated_at,tags")
    .eq("slug", slug)
    .eq("published", true)
    .single();

  const canonical = `https://fdx.trading/en/import-guide/${slug}`;

  if (!data) return { title: "Article | FoodXchange Import Guide", alternates: { canonical } };

  const title = data.meta_title ?? `${data.title} | FoodXchange Import Guide`;
  const description = data.meta_description ?? data.summary ?? "";

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "article",
      title,
      description,
      url: canonical,
      siteName: "FoodXchange",
      publishedTime: data.created_at,
      modifiedTime: data.updated_at,
      tags: data.tags ?? [],
    },
  };
}

export default async function ImportGuideArticlePage({ params }: { params: Params }) {
  const { slug } = await params;

  const { data: articleData } = await supabase
    .from("import_guide_articles")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .single();

  if (!articleData) notFound();

  const article = articleData as ImportGuideArticle;
  const category = IMPORT_GUIDE_CATEGORIES.find((c) => c.slug === article.category);

  // Related portfolio scenarios
  let relatedScenarios: RelatedScenario[] = [];
  if (article.related_portfolio_slugs?.length > 0) {
    const { data } = await supabase
      .from("portfolio_items")
      .select("title,slug,summary,category")
      .in("slug", article.related_portfolio_slugs)
      .eq("published", true);
    relatedScenarios = (data ?? []) as RelatedScenario[];
  }

  // Matching catalogue products for sidebar
  type CatalogueProductMini = {
    id: string;
    product_name: string;
    brand_name: string | null;
    catalogue_image_url: string | null;
    format: string | null;
    category: string;
  };
  let matchingProducts: CatalogueProductMini[] = [];
  if (article.category) {
    const { data: catalogueData } = await supabase
      .from("catalogue_products")
      .select("id,product_name,brand_name,catalogue_image_url,format,category")
      .eq("status", "ready")
      .contains("tags", [article.category])
      .limit(3);
    matchingProducts = (catalogueData ?? []) as CatalogueProductMini[];
  }

  // Prev / next in same category
  const [{ data: prevData }, { data: nextData }] = await Promise.all([
    supabase
      .from("import_guide_articles")
      .select("title,slug")
      .eq("category", article.category)
      .eq("published", true)
      .lt("updated_at", article.updated_at)
      .order("updated_at", { ascending: false })
      .limit(1),
    supabase
      .from("import_guide_articles")
      .select("title,slug")
      .eq("category", article.category)
      .eq("published", true)
      .gt("updated_at", article.updated_at)
      .order("updated_at", { ascending: true })
      .limit(1),
  ]);

  const prev = prevData?.[0] ?? null;
  const next = nextData?.[0] ?? null;

  const contentHtml = addHeadingIds(article.content ?? "");
  const headings = extractH2Headings(article.content ?? "");
  const showToc = headings.length >= 3;

  const jsonLd = JSON.stringify([
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: article.title,
      description: article.summary,
      datePublished: article.created_at,
      dateModified: article.updated_at,
      author: {
        "@type": "Organization",
        name: "FoodXchange",
        url: "https://fdx.trading",
      },
      publisher: {
        "@type": "Organization",
        name: "FoodXchange",
        url: "https://fdx.trading",
      },
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": `https://fdx.trading/en/import-guide/${slug}`,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://fdx.trading/en" },
        { "@type": "ListItem", position: 2, name: "Import Guide", item: "https://fdx.trading/en/import-guide" },
        { "@type": "ListItem", position: 3, name: article.title, item: `https://fdx.trading/en/import-guide/${slug}` },
      ],
    },
  ]);

  return (
    <main className="bg-white text-slate-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />

      {/* HERO */}
      <section className="bg-linear-to-b from-slate-900 to-slate-800 text-white py-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <nav className="text-slate-400 text-sm mb-4 flex items-center justify-center gap-2 flex-wrap">
            <Link href="/en/import-guide" className="hover:text-white transition">
              Import Guide
            </Link>
            <span>›</span>
            {category && (
              <Link
                href={`/en/import-guide/category/${category.slug}`}
                className="hover:text-white transition"
              >
                {category.title}
              </Link>
            )}
          </nav>

          {category && (
            <span className="inline-block bg-orange-500/20 text-orange-300 border border-orange-500/30 rounded-full px-4 py-1.5 text-sm font-medium mb-4">
              {category.title}
            </span>
          )}

          <h1 className="text-3xl md:text-4xl font-bold leading-tight">
            {article.title}
          </h1>

          <p className="text-slate-400 text-sm mt-3">
            {article.reading_time_mins} min read · Updated {formatDate(article.updated_at)}
          </p>
        </div>
      </section>

      {/* TWO-COLUMN LAYOUT */}
      <div className="max-w-6xl mx-auto px-6 py-12 grid lg:grid-cols-[1fr_300px] gap-12">
        {/* LEFT — main content */}
        <div className="min-w-0">
          {/* TOC */}
          {showToc && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-8">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
                On this page
              </p>
              <ul className="space-y-1.5">
                {headings.map((h) => (
                  <li key={h.anchor}>
                    <a
                      href={`#${h.anchor}`}
                      className="text-sm text-slate-600 hover:text-orange-600 transition flex items-center gap-2"
                    >
                      <span className="text-slate-300">—</span>
                      {h.text}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Article content */}
          <div
            className="prose prose-lg max-w-none prose-headings:text-slate-900 prose-h2:text-2xl prose-h2:font-semibold prose-h2:mt-10 prose-h2:mb-4 prose-p:text-slate-700 prose-p:leading-relaxed prose-a:text-orange-600 hover:prose-a:text-orange-700 prose-ul:text-slate-700 prose-strong:text-slate-900 prose-blockquote:border-l-orange-500 prose-blockquote:text-slate-600"
            dangerouslySetInnerHTML={{ __html: contentHtml }}
          />

          {/* Tags */}
          {article.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-8 pt-8 border-t border-slate-100 items-center">
              <span className="text-sm text-slate-500 mr-2">Topics:</span>
              {article.tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-slate-100 text-slate-600 rounded-full px-3 py-1 text-xs"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Prev / Next */}
          {(prev || next) && (
            <div className="flex justify-between mt-8 pt-8 border-t border-slate-200 gap-4">
              {prev ? (
                <Link
                  href={`/en/import-guide/${prev.slug}`}
                  className="text-sm text-slate-600 hover:text-orange-600 transition max-w-[45%]"
                >
                  ← {prev.title}
                </Link>
              ) : (
                <span />
              )}
              {next ? (
                <Link
                  href={`/en/import-guide/${next.slug}`}
                  className="text-sm text-slate-600 hover:text-orange-600 transition text-right max-w-[45%]"
                >
                  {next.title} →
                </Link>
              ) : (
                <span />
              )}
            </div>
          )}
        </div>

        {/* RIGHT SIDEBAR */}
        <aside className="lg:sticky lg:top-8 self-start space-y-6">
          {/* Quick facts */}
          {article.tags?.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
                Quick reference
              </p>
              <div className="flex flex-wrap gap-2">
                {article.tags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-white border border-slate-200 rounded-full px-3 py-1 text-xs text-slate-600"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Lead CTA */}
          <div className="bg-orange-500 text-white rounded-xl p-6">
            <h3 className="font-semibold text-lg mb-2">Need sourcing help?</h3>
            <p className="text-orange-100 text-sm mb-4">
              We source food products for import to Israel. Tell us what you need.
            </p>
            <Link
              href={`/en/contact?topic=${article.category}`}
              className="block bg-white text-orange-600 hover:bg-orange-50 w-full py-3 rounded-lg text-sm font-semibold text-center transition"
            >
              Start a conversation →
            </Link>
          </div>

          {/* Related scenarios */}
          {relatedScenarios.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
                Related sourcing work
              </p>
              <div className="space-y-3">
                {relatedScenarios.map((scenario) => (
                  <Link
                    key={scenario.slug}
                    href={`/en/portfolio/${scenario.slug}`}
                    className="block border border-slate-200 rounded-lg p-3 hover:border-orange-300 transition"
                  >
                    <p className="text-sm font-medium text-slate-900">
                      {scenario.title}
                    </p>
                    {scenario.category && (
                      <p className="text-xs text-slate-500 mt-1">{scenario.category}</p>
                    )}
                    <p className="text-xs text-orange-600 mt-1">View scenario →</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
          {/* Products we source */}
          {matchingProducts.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
                Products we source
              </p>
              <div className="space-y-3">
                {matchingProducts.map((p) => (
                  <Link
                    key={p.id}
                    href={`/en/products/${p.id}`}
                    className="flex items-center gap-3 group"
                  >
                    {p.catalogue_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.catalogue_image_url}
                        alt={p.product_name}
                        className="w-12 h-12 rounded-lg object-contain border border-slate-100 bg-white p-1 shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-slate-50 flex items-center justify-center text-xl shrink-0">
                        📦
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-slate-900 group-hover:text-orange-600 transition leading-snug">
                        {p.brand_name ? `${p.brand_name} — ` : ""}
                        {p.product_name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {p.format ?? p.category}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
              <Link
                href="/en/products"
                className="text-xs text-orange-600 hover:underline mt-4 block"
              >
                Browse all products →
              </Link>
            </div>
          )}
        </aside>
      </div>

      {/* FULL-WIDTH CTA */}
      <section className="bg-orange-500 text-white py-16 px-6 text-center">
        <h2 className="text-3xl font-bold mb-4">
          Importing {category?.title ?? article.category} products to Israel?
        </h2>
        <p className="text-orange-100 text-lg mb-8 max-w-2xl mx-auto">
          We handle sourcing, supplier validation, documentation, and import
          coordination. Tell us what you need.
        </p>
        <Link
          href={`/en/contact?topic=${article.category}`}
          className="inline-flex bg-white text-orange-600 hover:bg-orange-50 px-8 py-4 rounded-xl font-semibold text-lg transition shadow"
        >
          Start a sourcing conversation →
        </Link>
      </section>

      {/* MANUFACTURER CTA */}
      <div className="max-w-4xl mx-auto px-6 pb-16 pt-12">
        <div className="bg-slate-900 rounded-2xl p-8 text-center">
          <p className="text-orange-400 text-xs font-semibold uppercase tracking-wider mb-2">
            FOR MANUFACTURERS
          </p>
          <h3 className="text-xl font-bold text-white mb-3">
            You make this product?
          </h3>
          <p className="text-slate-400 text-sm leading-relaxed mb-6 max-w-xl mx-auto">
            Tell us about your range. If there is a fit with buyers we work with in Israel,
            we will be in touch.
          </p>
          <Link
            href={`/en/manufacturers?ref=import-guide-${article.slug}`}
            className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-xl text-sm transition"
          >
            Show us what you make →
          </Link>
        </div>
      </div>
    </main>
  );
}
