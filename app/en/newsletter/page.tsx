import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import Image from "next/image";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type Issue = {
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image: string | null;
  created_at: string;
};

async function getIssues(): Promise<Issue[]> {
  const { data, error } = await supabase
    .from("newsletter_issues")
    .select("slug, title, excerpt, cover_image, created_at")
    .eq("published", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Newsletter issues fetch error:", error);
    return [];
  }

  return (data || []) as Issue[];
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function NewsletterPage() {
  const issues = await getIssues();

  return (
    <main className="bg-white text-slate-900">
      {/* HERO */}
      <section className="bg-gradient-to-b from-slate-900 to-slate-800 text-white py-20 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
            FoodXchange Market Notes
          </h1>
          <p className="mt-4 text-slate-300">
            Real sourcing insights based on active work
          </p>
        </div>
      </section>

      {/* LIST */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        {/* Use grid for premium layout */}
        <div className="grid md:grid-cols-2 gap-8">
          {issues.map((issue) => (
            <article
              key={issue.slug}
              className="group border border-slate-200 rounded-xl overflow-hidden bg-white hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
            >
              {/* IMAGE */}
              <Link href={`/en/newsletter/${issue.slug}`} className="block">
                <div className="relative w-full h-[240px] overflow-hidden">
                  <Image
                    src={issue.cover_image || "/blog/default-hero.png"}
                    alt={issue.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    quality={78}
                  />
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-85 group-hover:opacity-95 transition" />

                  {/* Title on image */}
                  <div className="absolute bottom-4 left-4 right-4">
                    <h2 className="text-white text-lg font-semibold leading-tight drop-shadow">
                      {issue.title}
                    </h2>
                  </div>
                </div>
              </Link>

              {/* CONTENT */}
              <div className="p-6">
                <p className="text-xs text-slate-500 mb-2">
                  {formatDate(issue.created_at)}
                </p>

                {issue.excerpt && (
                  <p className="text-slate-700 text-sm leading-relaxed mb-4 line-clamp-3">
                    {issue.excerpt}
                  </p>
                )}

                <Link
                  href={`/en/newsletter/${issue.slug}`}
                  className="inline-flex items-center text-orange-600 font-medium text-sm hover:text-orange-700 hover:underline focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 rounded"
                >
                  Read full note →
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}