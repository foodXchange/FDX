import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { IMPORT_GUIDE_CATEGORIES_HE } from "@/types/importGuide";
import type { ImportGuideListItem } from "@/types/importGuide";

export const revalidate = 3600;

type Params = Promise<{ category: string }>;

function formatDateHe(date: string) {
  return new Date(date).toLocaleDateString("he-IL", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { category } = await params;
  const cat = IMPORT_GUIDE_CATEGORIES_HE.find((c) => c.slug === category);
  if (!cat) return { title: "קטגוריה | מדריך יבוא מזון FoodXchange" };

  return {
    title: `${cat.title} — מדריך יבוא מזון לישראל | FoodXchange`,
    description: cat.description,
    alternates: {
      canonical: `https://fdx.trading/he/import-guide/category/${category}`,
    },
    openGraph: {
      title: `${cat.title} — מדריך יבוא מזון לישראל | FoodXchange`,
      description: cat.description,
      url: `https://fdx.trading/he/import-guide/category/${category}`,
      type: "website",
      siteName: "FoodXchange",
    },
  };
}

export default async function HebrewImportGuideCategoryPage({ params }: { params: Params }) {
  const { category } = await params;
  const cat = IMPORT_GUIDE_CATEGORIES_HE.find((c) => c.slug === category);
  if (!cat) notFound();

  const { data } = await supabase
    .from("import_guide_articles")
    .select("id,title,slug,category,summary,reading_time_mins,tags,updated_at")
    .eq("published", true)
    .eq("category", category)
    .order("updated_at", { ascending: false });

  const articles = (data ?? []) as ImportGuideListItem[];

  return (
    <main className="bg-slate-900 text-white min-h-screen">
      {/* ── HERO ── */}
      <section className="bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 text-white py-14 px-6 text-center border-b border-white/10">
        <div className="max-w-3xl mx-auto">
          <nav className="text-slate-400 text-xs sm:text-sm mb-4 flex items-center justify-center gap-2">
            <Link href="/he" className="hover:text-white transition">
              ראשי
            </Link>
            <span>›</span>
            <Link href="/he/import-guide" className="hover:text-white transition">
              מדריך יבוא מזון
            </Link>
            <span>›</span>
            <span className="text-orange-400 font-semibold">{cat.title}</span>
          </nav>

          <div className="text-4xl mb-3">{cat.icon}</div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight">
            {cat.title}
          </h1>
          <p className="text-slate-300 mt-3 max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
            {cat.description}
          </p>
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs text-slate-300">
            <span>{articles.length} מדריכים בקטגוריה זו</span>
          </div>
        </div>
      </section>

      {/* ── ARTICLES LIST ── */}
      <section className="max-w-4xl mx-auto px-6 py-12">
        {articles.length === 0 ? (
          <div className="text-center py-16 bg-slate-800/30 rounded-2xl border border-slate-800 p-8">
            <p className="text-slate-300 text-base font-semibold mb-2">
              מדריכים נוספים לקטגוריה זו עולים בקרוב.
            </p>
            <p className="text-slate-400 text-xs max-w-md mx-auto mb-6">
              מתכננים יבוא בקטגוריה זו כעת? צרו קשר ישיר לבדיקת מפרט רגולטורי מול הצוות.
            </p>
            <Link
              href="/he/sourcing"
              className="inline-flex bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition"
            >
              הגשת בקשת רכש ←
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {articles.map((article) => (
              <article
                key={article.id}
                className="bg-slate-800/40 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 sm:p-6 transition group"
              >
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-2">
                  <h2 className="font-bold text-base sm:text-lg text-white group-hover:text-orange-400 transition leading-snug">
                    <Link href={`/he/import-guide/${article.slug}`}>
                      {article.title}
                    </Link>
                  </h2>
                  <span className="text-slate-500 text-xs shrink-0">
                    {article.reading_time_mins} דק׳ קריאה
                  </span>
                </div>

                {article.summary && (
                  <p className="text-slate-400 text-xs sm:text-sm leading-relaxed mb-4">
                    {article.summary}
                  </p>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-slate-700/40 text-xs">
                  <span className="text-slate-500">עודכן: {formatDateHe(article.updated_at)}</span>
                  <Link
                    href={`/he/import-guide/${article.slug}`}
                    className="text-orange-400 hover:text-orange-300 font-semibold inline-flex items-center gap-1 group-hover:underline"
                  >
                    <span>קרא מדריך מלא</span>
                    <span>←</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* ── OTHER CATEGORIES PILLS ── */}
        <div className="mt-14 pt-8 border-t border-slate-800">
          <h3 className="text-sm font-bold text-slate-300 mb-4">
            קטגוריות נוספות במדריך היבוא:
          </h3>
          <div className="flex flex-wrap gap-2">
            {IMPORT_GUIDE_CATEGORIES_HE.filter((c) => c.slug !== category).map((c) => (
              <Link
                key={c.slug}
                href={`/he/import-guide/category/${c.slug}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 hover:text-white transition"
              >
                <span>{c.icon}</span>
                <span>{c.title}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
