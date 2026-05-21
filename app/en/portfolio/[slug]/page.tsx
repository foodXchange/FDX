import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { cache } from "react";
import PortfolioClickTracker from "@/components/PortfolioClickTracker";
import BackToTop from "@/components/BackToTop";
import { supabase } from "@/lib/supabase";

export const revalidate = 60;

type Params = Promise<{ slug: string }>;

type PortfolioDetail = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  category: string | null;
  hero_image: string | null;
  content: string;
  created_at: string;
  markets: string[] | null;
  formats: string[] | null;
  certifications: string[] | null;
  tags: string[] | null;
};

type RelatedItem = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  category: string | null;
  hero_image: string | null;
};

const getItem = cache(async (slug: string): Promise<PortfolioDetail | null> => {
  const { data } = await supabase
    .from("portfolio_items")
    .select(
      "id, title, slug, summary, category, hero_image, content, created_at, markets, formats, certifications, tags"
    )
    .eq("slug", slug)
    .eq("published", true)
    .limit(1)
    .single();
  return data ?? null;
});

async function getRelated(
  category: string | null,
  slug: string
): Promise<RelatedItem[]> {
  if (!category) return [];
  const { data } = await supabase
    .from("portfolio_items")
    .select("id, title, slug, summary, category, hero_image")
    .eq("published", true)
    .eq("category", category)
    .neq("slug", slug)
    .order("priority", { ascending: false })
    .limit(3);
  return (data || []) as RelatedItem[];
}

export async function generateStaticParams() {
  const { data } = await supabase
    .from("portfolio_items")
    .select("slug")
    .eq("published", true);
  return (data || []).map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const item = await getItem(slug);
  const canonical = `https://fdx.trading/en/portfolio/${slug}`;

  if (!item) {
    return {
      title: "Scenario | FoodXchange",
      alternates: { canonical },
    };
  }

  const description = item.summary || "A sourcing scenario from FoodXchange.";
  const ogImage = item.hero_image || "/og-default.png";

  return {
    title: `${item.title} | FoodXchange`,
    description,
    alternates: { canonical },
    openGraph: {
      type: "article",
      url: canonical,
      title: item.title,
      description,
      siteName: "FoodXchange",
      images: [{ url: ogImage, width: 1200, height: 630 }],
      publishedTime: item.created_at
        ? new Date(item.created_at).toISOString()
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: item.title,
      description,
      images: [ogImage],
    },
  };
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function PortfolioItemPage({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;
  const item = await getItem(slug);
  if (!item) return notFound();

  const related = await getRelated(item.category, slug);

  const markets = Array.isArray(item.markets) ? item.markets : [];
  const formats = Array.isArray(item.formats) ? item.formats : [];
  const certifications = Array.isArray(item.certifications)
    ? item.certifications
    : [];
  const tags = Array.isArray(item.tags) ? item.tags : [];
  const hasChips =
    markets.length > 0 ||
    formats.length > 0 ||
    certifications.length > 0 ||
    tags.length > 0;

  return (
    <main className="bg-white text-slate-900">

      {/* HERO */}
      <section className="bg-linear-to-b from-slate-900 to-slate-800 text-white py-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs text-slate-400 mb-2 uppercase tracking-wider">
            FoodXchange Sourcing Scenarios
          </p>
          {item.category && (
            <span className="inline-block bg-orange-500/20 text-orange-300 rounded-full px-3 py-1 text-xs font-medium mb-4">
              {item.category}
            </span>
          )}
          <h1 className="text-3xl md:text-4xl font-bold leading-tight">
            {item.title}
          </h1>
          <p className="mt-2 text-xs text-slate-500">
            {formatDate(item.created_at)}
          </p>
        </div>
      </section>

      {/* COVER */}
      {item.hero_image && (
        <section className="max-w-3xl mx-auto px-6 mt-10">
          <div className="relative w-full h-70 md:h-90 rounded-xl overflow-hidden">
            <Image
              src={item.hero_image}
              alt={item.title}
              fill
              className="object-cover"
              sizes="100vw"
              quality={78}
              priority
            />
          </div>
        </section>
      )}

      {/* CONTENT */}
      <section className="max-w-3xl mx-auto px-6 py-12">
        <div
          className="prose prose-lg max-w-none prose-headings:text-slate-900 prose-p:text-slate-800 prose-a:text-orange-600 hover:prose-a:underline"
          dangerouslySetInnerHTML={{ __html: item.content }}
        />
      </section>

      {/* METADATA CHIPS */}
      {hasChips && (
        <section className="max-w-3xl mx-auto px-6 pb-12">
          <div className="border-t border-slate-100 pt-8 flex flex-wrap gap-2">
            {markets.map((m) => (
              <span
                key={m}
                className="text-xs px-3 py-1 rounded-full border bg-blue-50 text-blue-700 border-blue-200"
              >
                {m}
              </span>
            ))}
            {formats.map((f) => (
              <span
                key={f}
                className="text-xs px-3 py-1 rounded-full border bg-slate-100 text-slate-600 border-slate-200"
              >
                {f}
              </span>
            ))}
            {certifications.map((c) => (
              <span
                key={c}
                className="text-xs px-3 py-1 rounded-full border bg-green-50 text-green-700 border-green-200"
              >
                {c}
              </span>
            ))}
            {tags.map((t) => (
              <span
                key={t}
                className="text-xs px-3 py-1 rounded-full border bg-orange-50 text-orange-700 border-orange-200"
              >
                {t}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* RELATED SCENARIOS */}
      {related.length > 0 && (
        <section className="max-w-3xl mx-auto px-6 py-12 border-t border-slate-100">
          <h2 className="text-xl font-semibold text-slate-900 mb-6">
            Related scenarios
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {related.map((r) => (
              <Link
                key={r.slug}
                href={`/en/portfolio/${r.slug}`}
                className="group block border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition"
              >
                <div className="relative w-full h-32">
                  {r.hero_image ? (
                    <Image
                      src={r.hero_image}
                      alt={r.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="33vw"
                      quality={70}
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-800" />
                  )}
                </div>
                <div className="p-4">
                  {r.category && (
                    <span className="text-xs text-orange-600 font-medium">
                      {r.category}
                    </span>
                  )}
                  <p className="text-sm font-medium text-slate-900 mt-1 line-clamp-2">
                    {r.title}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="bg-slate-50 py-16 text-center px-6">
        <h2 className="text-2xl font-semibold mb-4">
          Relevant to your sourcing?
        </h2>
        <p className="text-slate-600 mb-6">
          Tell us what you&apos;re working on and we&apos;ll see if we can help.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link
            href="/en/contact"
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-md font-semibold transition focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 focus:ring-offset-slate-50"
          >
            Start a conversation →
          </Link>
          <Link
            href="/en/portfolio"
            className="border border-slate-300 hover:border-slate-400 px-6 py-3 rounded-md font-medium transition focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2 focus:ring-offset-slate-50"
          >
            Back to scenarios
          </Link>
        </div>
      </section>

      <PortfolioClickTracker slug={item.slug} />
      <BackToTop />
    </main>
  );
}
