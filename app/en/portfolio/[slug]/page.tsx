import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { cache } from "react";
import PortfolioClickTracker from "@/components/PortfolioClickTracker";
import BackToTop from "@/components/BackToTop";
import { supabase } from "@/lib/supabase";

export const revalidate = 60;

type Sections = {
  brief: string;
  challenge: string;
  validated: string;
  findings: string;
  takeaways: string;
} | null;

function parseSections(html: string): Sections {
  const extract = (name: string) => {
    const m = html.match(
      new RegExp(`<section class="scenario-${name}">[\\s\\S]*?</h2>([\\s\\S]*?)</section>`)
    );
    return m ? m[1].trim() : null;
  };
  const brief = extract("brief");
  const challenge = extract("challenge");
  if (!brief && !challenge) return null;
  return {
    brief: brief ?? "",
    challenge: challenge ?? "",
    validated: extract("validated") ?? "",
    findings: extract("findings") ?? "",
    takeaways: extract("takeaways") ?? "",
  };
}

function toBullets(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("•"))
    .map((l) => l.replace(/^•\s*/, ""));
}

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
    <main>

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
          {(markets.length > 0 || formats.length > 0 || certifications.length > 0) && (
            <div className="flex flex-wrap justify-center gap-6 mt-3 text-sm text-slate-400">
              {markets.length > 0 && <span>Markets: {markets.join(" · ")}</span>}
              {formats.length > 0 && <span>Format: {formats[0]}</span>}
              {certifications.length > 0 && <span>Certs: {certifications.join(" · ")}</span>}
            </div>
          )}
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
      {(() => {
        const sections = parseSections(item.content ?? "");
        if (!sections) {
          return (
            <section className="max-w-3xl mx-auto px-6 py-12">
              <div
                className="prose prose-invert prose-lg max-w-none prose-a:text-orange-400 hover:prose-a:underline"
                dangerouslySetInnerHTML={{ __html: item.content }}
              />
            </section>
          );
        }
        const SectionHeading = ({ num, label }: { num: string; label: string }) => (
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-orange-500">{num}</span> {label}
          </h2>
        );
        return (
          <div className="max-w-3xl mx-auto px-6 py-12 space-y-12">
            {sections.brief && (
              <div>
                <SectionHeading num="01" label="The sourcing brief" />
                <div
                  className="prose prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: sections.brief }}
                />
              </div>
            )}
            {sections.challenge && (
              <div>
                <SectionHeading num="02" label="The market challenge" />
                <div
                  className="bg-white/5 border-l-4 border-orange-500 rounded-r-xl px-6 py-5 prose prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: sections.challenge }}
                />
              </div>
            )}
            {sections.validated && (
              <div>
                <SectionHeading num="03" label="What we validated" />
                {toBullets(sections.validated).length > 0 ? (
                  <ul className="space-y-2">
                    {toBullets(sections.validated).map((point, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm">
                        <span className="text-green-600 mt-0.5 shrink-0">✓</span>
                        {point}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div
                    className="prose prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: sections.validated }}
                  />
                )}
              </div>
            )}
            {sections.findings && (
              <div>
                <SectionHeading num="04" label="What we found" />
                <div
                  className="prose prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: sections.findings }}
                />
              </div>
            )}
            {sections.takeaways && (
              <div>
                <SectionHeading num="05" label="Key takeaways" />
                {toBullets(sections.takeaways).length > 0 ? (
                  <div className="space-y-3">
                    {toBullets(sections.takeaways).map((point, i) => (
                      <div
                        key={i}
                        className="bg-orange-500/10 border border-orange-400/20 rounded-xl p-4 text-sm"
                      >
                        {point}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    className="prose prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: sections.takeaways }}
                  />
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* METADATA CHIPS */}
      {hasChips && (
        <section className="max-w-3xl mx-auto px-6 pb-12">
          <div className="border-t border-white/10 pt-8 flex flex-wrap gap-2">
            {markets.map((m) => (
              <span
                key={m}
                className="text-xs px-3 py-1 rounded-full border bg-blue-500/10 text-blue-300 border-blue-400/20"
              >
                {m}
              </span>
            ))}
            {formats.map((f) => (
              <span
                key={f}
                className="text-xs px-3 py-1 rounded-full border bg-white/5 text-slate-300 border-white/10"
              >
                {f}
              </span>
            ))}
            {certifications.map((c) => (
              <span
                key={c}
                className="text-xs px-3 py-1 rounded-full border bg-green-500/10 text-green-300 border-green-400/20"
              >
                {c}
              </span>
            ))}
            {tags.map((t) => (
              <span
                key={t}
                className="text-xs px-3 py-1 rounded-full border bg-orange-500/10 text-orange-300 border-orange-400/20"
              >
                {t}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* AT A GLANCE */}
      {(markets.length > 0 || formats.length > 0 || certifications.length > 0) && (
        <section className="max-w-3xl mx-auto px-6 pb-12">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 dark-card">
              <p className="text-2xl font-bold">{markets.length}</p>
              <p className="text-xs text-slate-400 mt-1">
                Target {markets.length === 1 ? "market" : "markets"}
              </p>
            </div>
            <div className="text-center p-4 dark-card">
              <p className="text-2xl font-bold">{formats.length}</p>
              <p className="text-xs text-slate-400 mt-1">
                {formats.length === 1 ? "Format" : "Formats"} validated
              </p>
            </div>
            <div className="text-center p-4 dark-card">
              <p className="text-2xl font-bold">{certifications.length}</p>
              <p className="text-xs text-slate-400 mt-1">
                {certifications.length === 1 ? "Certification" : "Certifications"} required
              </p>
            </div>
          </div>
        </section>
      )}

      {/* RELATED SCENARIOS */}
      {related.length > 0 && (
        <section className="max-w-3xl mx-auto px-6 py-12 border-t border-white/10">
          <h2 className="text-xl font-semibold mb-6">
            Related scenarios
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {related.map((r) => (
              <Link
                key={r.slug}
                href={`/en/portfolio/${r.slug}`}
                className="dark-card group block overflow-hidden hover:shadow-md transition"
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
                    <span className="text-xs text-orange-400 font-medium">
                      {r.category}
                    </span>
                  )}
                  <p className="text-sm font-medium mt-1 line-clamp-2">
                    {r.title}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="border-t border-white/10 py-16 text-center px-6">
        <h2 className="text-2xl font-semibold mb-4">
          Relevant to your sourcing?
        </h2>
        <p className="text-slate-400 mb-6">
          Tell us what you&apos;re working on and we&apos;ll see if we can help.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link
            href="/en/contact"
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-md font-semibold transition focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2"
          >
            Start a conversation →
          </Link>
          <Link
            href="/en/portfolio"
            className="btn-ghost px-6 py-3 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
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
