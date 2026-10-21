import type { Metadata } from "next";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import HelpSearch from "@/components/help/HelpSearch";

export const revalidate = 3600;

const CATEGORY_ICONS: Record<string, string> = {
  "for-buyers": "🛒",
  "for-suppliers": "🏭",
  "about-foodxchange": "ℹ️",
};

const SITE_URL = "https://fdx.trading";

export const metadata: Metadata = {
  title: "Help Center | FoodXchange",
  description:
    "Guides for buyers and suppliers on how sourcing, matching, and the FoodXchange portals work.",
  alternates: {
    canonical: `${SITE_URL}/en/help`,
  },
  openGraph: {
    title: "Help Center | FoodXchange",
    description:
      "Guides for buyers and suppliers on how sourcing, matching, and the FoodXchange portals work.",
    url: `${SITE_URL}/en/help`,
    type: "website",
    siteName: "FoodXchange",
  },
};

type HelpCategory = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  display_order: number;
};

type HelpArticle = {
  id: string;
  slug: string;
  title: string;
  content_text: string | null;
  category_id: string;
  display_order: number;
};

function snippet(text: string | null, max = 110) {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max).trim()}…` : text;
}

export default async function HelpCenterPage() {
  const [{ data: categories }, { data: articles }] = await Promise.all([
    supabase
      .from("kb_categories")
      .select("id, slug, title, description, display_order")
      .eq("is_public", true)
      .order("display_order"),
    supabase
      .from("kb_articles")
      .select("id, slug, title, content_text, category_id, display_order")
      .eq("is_public", true)
      .eq("status", "published")
      .order("display_order"),
  ]);

  const cats = (categories ?? []) as HelpCategory[];
  const arts = (articles ?? []) as HelpArticle[];

  const articlesByCategory = new Map<string, HelpArticle[]>();
  for (const article of arts) {
    const list = articlesByCategory.get(article.category_id) ?? [];
    list.push(article);
    articlesByCategory.set(article.category_id, list);
  }

  const categoryTitleById = new Map(cats.map((c) => [c.id, c.title]));
  const searchItems = arts.map((a) => ({
    slug: a.slug,
    title: a.title,
    summary: a.content_text ?? "",
    categoryTitle: categoryTitleById.get(a.category_id) ?? "",
  }));

  const jsonLd = JSON.stringify([
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "FoodXchange Help Center",
      url: `${SITE_URL}/en/help`,
      isPartOf: {
        "@type": "WebSite",
        name: "FoodXchange",
        url: SITE_URL,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/en` },
        { "@type": "ListItem", position: 2, name: "Help Center", item: `${SITE_URL}/en/help` },
      ],
    },
  ]);

  return (
    <main className="bg-slate-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />

      {/* HERO */}
      <section className="bg-linear-to-b from-slate-900 to-slate-800 text-white py-20 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <p className="text-orange-400 text-xs font-semibold tracking-widest uppercase mb-3">
            HELP CENTER
          </p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            How can we help?
          </h1>
          <p className="text-slate-300 text-lg mt-4 max-w-2xl mx-auto leading-relaxed">
            Guides for buyers and suppliers on how sourcing, matching, and the
            FoodXchange portals work.
          </p>

          <HelpSearch items={searchItems} />
        </div>
      </section>

      {/* CATEGORIES */}
      {cats.map((cat) => {
        const catArticles = articlesByCategory.get(cat.id) ?? [];
        if (catArticles.length === 0) return null;

        return (
          <section key={cat.id} className="max-w-6xl mx-auto px-6 py-12 border-b border-slate-800 last:border-b-0">
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-white flex items-center gap-3">
                <span>{CATEGORY_ICONS[cat.slug] ?? "📄"}</span>
                {cat.title}
              </h2>
              {cat.description && (
                <p className="text-slate-400 mt-2">{cat.description}</p>
              )}
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {catArticles.map((article) => (
                <Link
                  key={article.id}
                  href={`/en/help/${article.slug}`}
                  className="border border-slate-700 rounded-2xl p-6 hover:border-orange-500/50 hover:bg-slate-800 transition-all duration-200 block group"
                >
                  <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-orange-400 transition">
                    {article.title}
                  </h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    {snippet(article.content_text)}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        );
      })}

      {/* IMPORT GUIDE SPOTLIGHT */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        <div className="rounded-3xl border border-orange-500/40 bg-gradient-to-r from-orange-950/30 via-slate-800 to-slate-900 p-8 sm:p-10 shadow-2xl relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-bold text-orange-400 mb-3">
                <span>🏛️ Official Trade Resource</span>
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-white">
                Looking for Israeli Food Import Regulations?
              </h2>
              <p className="text-slate-300 text-sm sm:text-base mt-2 leading-relaxed">
                Explore our comprehensive 43-article directory covering Ministry of Health (MOH) approvals, Hebrew labeling standards (SI 1145), Kosher agency audits, customs tariffs, and cold-chain clearance at Haifa &amp; Ashdod ports.
              </p>
            </div>
            <Link
              href="/en/import-guide"
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white px-6 py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-orange-500/25 transition shrink-0"
            >
              <span>Explore Import Guide (43 Articles) &rarr;</span>
            </Link>
          </div>
        </div>
      </section>

      {/* CONTACT CTA */}
      <section className="bg-orange-500 text-white py-16 px-6 text-center">
        <h2 className="text-3xl font-bold mb-4">Still have questions?</h2>
        <p className="text-orange-100 text-lg mb-8 max-w-2xl mx-auto">
          Our team is happy to help with sourcing requests, supplier registration,
          or anything else about working with FoodXchange.
        </p>
        <Link
          href="/en/contact"
          className="inline-block bg-white text-orange-600 hover:bg-orange-50 px-8 py-4 rounded-xl font-semibold text-lg transition shadow"
        >
          Contact us →
        </Link>
      </section>
    </main>
  );
}
