import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { IMPORT_GUIDE_CATEGORIES_HE } from "@/types/importGuide";
import type { ImportGuideArticle } from "@/types/importGuide";

export const revalidate = 3600;

type Params = Promise<{ slug: string }>;

function formatDateHe(date: string) {
  return new Date(date).toLocaleDateString("he-IL", {
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
      .replace(/[^a-z0-9א-ת]+/g, "-")
      .replace(/^-|-$/g, "");
    return { text, anchor };
  });
}

function addHeadingIds(html: string): string {
  return html.replace(/<h2([^>]*)>(.*?)<\/h2>/gi, (_match, attrs, inner) => {
    const text = inner.replace(/<[^>]+>/g, "");
    const id = text
      .toLowerCase()
      .replace(/[^a-z0-9א-ת]+/g, "-")
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

  const canonical = `https://fdx.trading/he/import-guide/${slug}`;

  if (!data) return { title: "מאמר | מדריך יבוא FoodXchange", alternates: { canonical } };

  const title = `${data.title} | מדריך יבוא מזון לישראל FoodXchange`;
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

export default async function HebrewImportGuideArticlePage({ params }: { params: Params }) {
  const { slug } = await params;

  const { data: articleData } = await supabase
    .from("import_guide_articles")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .single();

  if (!articleData) notFound();

  const article = articleData as ImportGuideArticle;
  const cat = IMPORT_GUIDE_CATEGORIES_HE.find((c) => c.slug === article.category);

  // Fetch 3 related articles from same category
  const { data: relatedData } = await supabase
    .from("import_guide_articles")
    .select("id,title,slug,summary,category")
    .eq("published", true)
    .eq("category", article.category)
    .neq("slug", slug)
    .limit(3);

  const related = (relatedData ?? []) as {
    id: string;
    title: string;
    slug: string;
    summary: string | null;
    category: string;
  }[];

  const headings = article.content ? extractH2Headings(article.content) : [];
  const processedContent = article.content ? addHeadingIds(article.content) : "";

  return (
    <main className="bg-slate-900 text-white min-h-screen">
      {/* ── BREADCRUMB & ARTICLE HEADER ── */}
      <section className="bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 text-white py-12 px-6 border-b border-white/10">
        <div className="max-w-4xl mx-auto">
          <nav className="text-slate-400 text-xs sm:text-sm mb-4 flex items-center gap-2 flex-wrap">
            <Link href="/he" className="hover:text-white transition">
              ראשי
            </Link>
            <span>›</span>
            <Link href="/he/import-guide" className="hover:text-white transition">
              מדריך יבוא מזון
            </Link>
            {cat && (
              <>
                <span>›</span>
                <Link
                  href={`/he/import-guide/category/${cat.slug}`}
                  className="hover:text-white transition text-slate-300"
                >
                  {cat.title}
                </Link>
              </>
            )}
            <span>›</span>
            <span className="text-orange-400 truncate max-w-xs">{article.title}</span>
          </nav>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              {cat && (
                <span className="px-2.5 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-300 font-semibold">
                  {cat.icon} {cat.title}
                </span>
              )}
              <span>&middot;</span>
              <span>{article.reading_time_mins} דק׳ קריאה</span>
              <span>&middot;</span>
              <span>עודכן: {formatDateHe(article.updated_at)}</span>
            </div>

            <Link
              href={`/en/import-guide/${slug}`}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-xl border border-slate-700 transition flex items-center gap-1.5"
            >
              <span>🇬🇧</span>
              <span>Read in English</span>
            </Link>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black tracking-tight mt-4 leading-tight">
            {article.title}
          </h1>

          {article.summary && (
            <p className="text-slate-300 text-sm sm:text-base mt-4 leading-relaxed max-w-3xl border-r-2 border-orange-500 pr-3">
              {article.summary}
            </p>
          )}
        </div>
      </section>

      {/* ── MAIN CONTENT ── */}
      <section className="max-w-4xl mx-auto px-6 py-12">
        {/* ISRAELI BUYER BRIEF BOX */}
        <div className="bg-gradient-to-r from-slate-800/80 to-slate-900 border border-orange-500/30 rounded-2xl p-6 mb-10 shadow-lg space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🇮🇱</span>
            <h2 className="text-sm font-bold text-orange-400 uppercase tracking-wider">
              דגשי רכש ויבוא למנהלי קטגוריות ורשתות שיווק
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300 leading-relaxed pt-1">
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
              <span className="font-bold text-white block mb-1">🏷️ תאימות ת״י 1145 ומדבקות אדומות:</span>
              ודאו כי היצרן מספק אנליזה תזונתית מלאה ממעבדה מוסמכת לצורך בדיקת ספי נתרן, סוכר ושומן רווי טרם הדפסת אריזות.
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
              <span className="font-bold text-white block mb-1">✡️ אישור מחלקת היבוא ברה״ר:</span>
              כל מוצר מותג פרטי (PL) דורש שרשרת כשרות חתומה מראש מגוף כשרות מוכר באירופה טרם הגשת תיק יבוא.
            </div>
          </div>
        </div>

        {/* TABLE OF CONTENTS */}
        {headings.length > 2 && (
          <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-5 mb-10 text-xs">
            <span className="font-bold text-white uppercase tracking-wider block mb-3 text-slate-300">
              תוכן העניינים במדריך זה:
            </span>
            <ul className="space-y-1.5 pr-2">
              {headings.map((h, i) => (
                <li key={i}>
                  <a
                    href={`#${h.anchor}`}
                    className="text-orange-400 hover:text-orange-300 hover:underline transition"
                  >
                    {i + 1}. {h.text}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ARTICLE TEXT */}
        {processedContent ? (
          <div
            className="prose prose-invert prose-orange max-w-none text-slate-300 leading-relaxed text-sm sm:text-base space-y-4"
            dangerouslySetInnerHTML={{ __html: processedContent }}
          />
        ) : (
          <p className="text-slate-400 text-sm">תוכן המדריך בטעינה.</p>
        )}

        {/* RELATED ARTICLES */}
        {related.length > 0 && (
          <div className="mt-16 pt-10 border-t border-slate-800">
            <h3 className="text-lg font-bold text-white mb-6">
              מדריכים קשורים בנושא זה:
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {related.map((r) => (
                <Link
                  key={r.id}
                  href={`/he/import-guide/${r.slug}`}
                  className="bg-slate-800/40 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl p-4 transition flex flex-col justify-between"
                >
                  <h4 className="font-bold text-xs sm:text-sm text-white line-clamp-2 leading-snug">
                    {r.title}
                  </h4>
                  <span className="text-[11px] text-orange-400 font-semibold mt-3">
                    קרא מדריך ←
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* BOTTOM ACTION CENTER */}
        <div className="mt-14 bg-gradient-to-r from-orange-500/10 via-slate-800 to-slate-900 border border-orange-500/30 rounded-2xl p-6 sm:p-8 text-center space-y-4">
          <span className="text-2xl">📦</span>
          <h3 className="text-lg sm:text-xl font-bold text-white">
            מחפשים מפעל מאומת העומד בדרישות המפורטות במדריך זה?
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
            אנו מקשרים אתכם ישירות ליצרני מזון אירופאיים מאושרים — עם מפרטי איכות, מחירי CIF נמל חיפה/אשדוד, ונתיב כשרות מוכח.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Link
              href="/he/sourcing"
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition"
            >
              הגשת בקשת רכש ואיתור מפעל (RFQ) ←
            </Link>
            <a
              href="https://wa.me/972525222291?text=%D7%A9%D7%9C%D7%95%D7%9D%20%D7%90%D7%95%D7%93%D7%99%2C%20%D7%A7%D7%A8%D7%90%D7%AA%D7%99%20%D7%90%D7%AA%20%D7%94%D7%9E%D7%93%D7%A8%D7%99%D7%9A%20%D7%91%D7%A0%D7%95%D7%A9%D7%90%20%D7%99%D7%91%D7%95%D7%90%20%D7%95%D7%90%D7%A9%D7%9E%D7%97%20%D7%9C%D7%94%D7%AA%D7%99%D7%99%D7%A2%D7%A5."
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#1DA851] hover:bg-[#189a47] text-white font-bold px-5 py-2.5 rounded-xl text-xs transition flex items-center gap-1.5"
            >
              <span>💬</span>
              <span>ייעוץ בווטסאפ עם אודי</span>
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
