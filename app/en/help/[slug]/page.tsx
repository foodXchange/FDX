import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import KbBlockContent, { type KbBlock } from "@/components/help/KbBlockContent";
import WasThisHelpful from "@/components/help/WasThisHelpful";

export const revalidate = 3600;

const SITE_URL = "https://fdx.trading";

type Params = Promise<{ slug: string }>;

type HelpArticle = {
  id: string;
  slug: string;
  title: string;
  content: KbBlock[];
  content_text: string | null;
  category_id: string;
  created_at: string;
  updated_at: string;
};

type HelpCategory = {
  id: string;
  slug: string;
  title: string;
};

function snippet(text: string | null, max = 155) {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max).trim()}…` : text;
}

export async function generateStaticParams() {
  const { data } = await supabase
    .from("kb_articles")
    .select("slug")
    .eq("is_public", true)
    .eq("status", "published");

  return (data ?? []).map((a: { slug: string }) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;

  const { data: article } = await supabase
    .from("kb_articles")
    .select("title, content_text")
    .eq("slug", slug)
    .eq("is_public", true)
    .eq("status", "published")
    .single();

  if (!article) return {};

  const description = snippet(article.content_text);
  const url = `${SITE_URL}/en/help/${slug}`;

  return {
    title: `${article.title} | FoodXchange Help Center`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: article.title,
      description,
      url,
      type: "article",
      siteName: "FoodXchange",
    },
  };
}

export default async function HelpArticlePage({ params }: { params: Params }) {
  const { slug } = await params;

  const { data: articleData } = await supabase
    .from("kb_articles")
    .select("id, slug, title, content, content_text, category_id, created_at, updated_at")
    .eq("slug", slug)
    .eq("is_public", true)
    .eq("status", "published")
    .single();

  if (!articleData) notFound();
  const article = articleData as HelpArticle;

  const { data: categoryData } = await supabase
    .from("kb_categories")
    .select("id, slug, title")
    .eq("id", article.category_id)
    .single();
  const category = categoryData as HelpCategory | null;

  const { data: relatedData } = await supabase
    .from("kb_articles")
    .select("slug, title")
    .eq("category_id", article.category_id)
    .eq("is_public", true)
    .eq("status", "published")
    .neq("id", article.id)
    .order("display_order")
    .limit(4);
  const related = (relatedData ?? []) as { slug: string; title: string }[];

  const jsonLd = JSON.stringify([
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: article.title,
      description: snippet(article.content_text),
      datePublished: article.created_at,
      dateModified: article.updated_at,
      author: { "@type": "Organization", name: "FoodXchange", url: SITE_URL },
      publisher: { "@type": "Organization", name: "FoodXchange", url: SITE_URL },
      mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}/en/help/${slug}` },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/en` },
        { "@type": "ListItem", position: 2, name: "Help Center", item: `${SITE_URL}/en/help` },
        ...(category
          ? [{ "@type": "ListItem", position: 3, name: category.title, item: `${SITE_URL}/en/help#${category.slug}` }]
          : []),
        { "@type": "ListItem", position: category ? 4 : 3, name: article.title, item: `${SITE_URL}/en/help/${slug}` },
      ],
    },
  ]);

  return (
    <main className="bg-slate-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />

      {/* HERO */}
      <section className="bg-linear-to-b from-slate-900 to-slate-800 text-white py-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <nav className="text-slate-400 text-sm mb-4 flex items-center justify-center gap-2 flex-wrap">
            <Link href="/en/help" className="hover:text-white transition">
              Help Center
            </Link>
            {category && (
              <>
                <span>›</span>
                <span>{category.title}</span>
              </>
            )}
          </nav>

          {category && (
            <span className="inline-block bg-orange-500/20 text-orange-300 border border-orange-500/30 rounded-full px-4 py-1.5 text-sm font-medium mb-4">
              {category.title}
            </span>
          )}

          <h1 className="text-3xl md:text-4xl font-bold leading-tight">{article.title}</h1>
        </div>
      </section>

      {/* TWO-COLUMN LAYOUT */}
      <div className="max-w-6xl mx-auto px-6 py-12 grid lg:grid-cols-[1fr_300px] gap-12">
        {/* LEFT — main content */}
        <div className="min-w-0 space-y-8">
          <div className="prose prose-invert prose-lg max-w-none">
            <KbBlockContent blocks={article.content ?? []} />
          </div>

          <WasThisHelpful />
        </div>

        {/* RIGHT — sidebar */}
        <aside className="space-y-6">
          {related.length > 0 && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
                Related articles
              </p>
              <ul className="space-y-2">
                {related.map((item) => (
                  <li key={item.slug}>
                    <Link
                      href={`/en/help/${item.slug}`}
                      className="text-sm text-slate-300 hover:text-orange-400 transition flex items-start gap-2"
                    >
                      <span className="text-slate-600">—</span>
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <p className="text-sm text-slate-300 mb-3">
              Still need help? Our team is happy to answer questions.
            </p>
            <Link
              href="/en/contact"
              className="inline-block bg-orange-500 hover:bg-orange-600 text-white rounded-lg px-4 py-2 text-sm font-semibold transition"
            >
              Contact us →
            </Link>
          </div>
        </aside>
      </div>
    </main>
  );
}
