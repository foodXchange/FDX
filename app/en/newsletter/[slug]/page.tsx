import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { cache } from "react";
import { supabase } from "@/lib/supabase";
import BackToTop from "@/components/BackToTop";

export const revalidate = 60;

type Params = Promise<{ slug: string }>;

const getIssue = cache(async (slug: string) => {
  const { data, error } = await supabase
    .from("newsletter_issues")
    .select("title, slug, excerpt, content, cover_image, category, created_at, published")
    .eq("slug", slug)
    .eq("published", true)
    .single();

  if (error) return null;
  return data;
});

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const getAdjacentIssues = cache(async (createdAt: string) => {
  const [prevResult, nextResult] = await Promise.all([
    supabase
      .from("newsletter_issues")
      .select("slug, title")
      .eq("published", true)
      .lt("created_at", createdAt)
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("newsletter_issues")
      .select("slug, title")
      .eq("published", true)
      .gt("created_at", createdAt)
      .order("created_at", { ascending: true })
      .limit(1),
  ]);
  return {
    prev: prevResult.data?.[0] ?? null,
    next: nextResult.data?.[0] ?? null,
  };
});

export async function generateStaticParams() {
  const { data } = await supabase
    .from("newsletter_issues")
    .select("slug")
    .eq("published", true);
  return (data || []).map((issue) => ({ slug: issue.slug }));
}

// ✅ Per-issue metadata
export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params; // Next 15/16 async dynamic props [1](https://wwbridge-cert.com/blog/posts/how-the-labeling-and-standards-compliance-system-works-in-israel)
  const issue = await getIssue(slug);

  const canonical = `https://fdx.trading/en/newsletter/${slug}`;

  if (!issue) {
    return {
      title: "Newsletter | FoodXchange",
      description:
        "Market notes and sourcing insights from active FoodXchange projects.",
      alternates: { canonical: "https://fdx.trading/en/newsletter" },
    };
  }

  const description =
    issue.excerpt?.trim() ||
    "Short sourcing insights from ongoing activity — focused, practical, real.";

  const ogImage =
    issue.cover_image || "/og-default.png";

  const title = `${issue.title}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "article",
      url: canonical,
      title,
      description,
      siteName: "FoodXchange",
      images: [{ url: ogImage, width: 1200, height: 630 }],
      publishedTime: issue.created_at ? new Date(issue.created_at).toISOString() : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function NewsletterIssuePage({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params; // Next 15/16 async dynamic props [1](https://wwbridge-cert.com/blog/posts/how-the-labeling-and-standards-compliance-system-works-in-israel)
  const issue = await getIssue(slug);

  if (!issue) return notFound();

  const { prev, next } = await getAdjacentIssues(issue.created_at);

  return (
    <main>
      {/* HERO */}
      <section className="bg-linear-to-b from-slate-900 to-slate-800 text-white py-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs text-slate-400 mb-2 uppercase tracking-wider">
            FoodXchange Market Notes
          </p>

          <h1 className="text-3xl md:text-4xl font-bold leading-tight">
            {issue.title}
          </h1>

          <p className="mt-2 text-xs text-slate-500">
            By FoodXchange · {formatDate(issue.created_at)}
          </p>
        </div>
      </section>

      {/* COVER */}
      {issue.cover_image && (
        <section className="max-w-3xl mx-auto px-6 mt-10">
          <div className="relative w-full h-70 md:h-90 rounded-xl overflow-hidden">
            <Image
              src={issue.cover_image}
              alt={issue.title}
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
          className="
            prose prose-invert prose-lg max-w-none
            prose-a:text-orange-400 hover:prose-a:underline
          "
          dangerouslySetInnerHTML={{ __html: issue.content }}
        />
      </section>

      {/* PREV/NEXT NAV */}
      {(prev || next) && (
        <section className="max-w-3xl mx-auto px-6 py-8 border-t border-dark-border">
          <div className="flex gap-4">
            <div className="flex-1">
              {prev && (
                <Link
                  href={`/en/newsletter/${prev.slug}`}
                  className="block border border-dark-border rounded-xl px-5 py-4 hover:border-white/20 transition text-sm"
                >
                  <span className="text-xs text-slate-400 block mb-1">← Previous</span>
                  <span className="text-dark-text-primary font-medium line-clamp-2">{prev.title}</span>
                </Link>
              )}
            </div>
            <div className="flex-1 text-right">
              {next && (
                <Link
                  href={`/en/newsletter/${next.slug}`}
                  className="block border border-dark-border rounded-xl px-5 py-4 hover:border-white/20 transition text-sm"
                >
                  <span className="text-xs text-slate-400 block mb-1">Next →</span>
                  <span className="text-dark-text-primary font-medium line-clamp-2">{next.title}</span>
                </Link>
              )}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-16 text-center px-6 border-t border-dark-border">
        <h2 className="text-2xl font-semibold mb-4">
          Want to explore this further?
        </h2>
        <p className="text-slate-400 mb-6">
          If this is relevant — let’s move to concrete sourcing options.
        </p>

        <div className="flex gap-4 justify-center flex-wrap">
          <Link
            href="/en/contact"
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-md font-semibold transition focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 focus:ring-offset-slate-50"
          >
            Start a conversation →
          </Link>

          <Link
            href="/en/newsletter"
            className="border border-slate-300 hover:border-slate-400 px-6 py-3 rounded-md font-medium transition focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2 focus:ring-offset-slate-50"
          >
            Back to archive
          </Link>
        </div>
      </section>
      <BackToTop />
    </main>
  );
}