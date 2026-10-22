import type { Metadata } from "next";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { IMPORT_GUIDE_CATEGORIES_HE } from "@/types/importGuide";
import type { ImportGuideListItem } from "@/types/importGuide";
import Reveal from "@/components/Reveal";

export const revalidate = 0; // force fresh data

export const metadata: Metadata = {
  title: "המדריך המלא ליבוא מזון לישראל — רגולציה, כשרות ותקנים | FoodXchange",
  description:
    "מרכז הידע והרגולציה המלא ליבואני מזון וקנייני רשתות בישראל: רפורמת היבוא האירופית ('מה שטוב לאירופה'), תקן ת״י 1145, סימונים אדומים, כשרות הרבנות הראשית ומכס.",
  alternates: {
    canonical: "https://fdx.trading/he/import-guide",
  },
  openGraph: {
    title: "המדריך המלא ליבוא מזון לישראל — רגולציה, כשרות ותקנים | FoodXchange",
    description:
      "מרכז הידע והרגולציה המלא ליבואני מזון וקנייני רשתות בישראל: רפורמת היבוא האירופית ('מה שטוב לאירופה'), תקן ת״י 1145, סימונים אדומים, כשרות הרבנות הראשית ומכס.",
    url: "https://fdx.trading/he/import-guide",
    type: "website",
    siteName: "FoodXchange",
  },
};

function formatDateHe(date: string) {
  return new Date(date).toLocaleDateString("he-IL", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function HebrewImportGuidePage() {
  const [{ data: recentArticles }, { data: allArticles }] = await Promise.all([
    supabase
      .from("import_guide_articles")
      .select("id,title,slug,category,summary,reading_time_mins,updated_at")
      .eq("published", true)
      .order("updated_at", { ascending: false })
      .limit(6),
    supabase
      .from("import_guide_articles")
      .select("category")
      .eq("published", true),
  ]);

  const articles = (recentArticles ?? []) as ImportGuideListItem[];
  const totalCount = allArticles?.length ?? 0;
  const countByCategory = (slug: string) =>
    (allArticles ?? []).filter((a) => a.category === slug).length;

  return (
    <main className="bg-slate-900 text-white min-h-screen">
      {/* ── HERO ── */}
      <section className="bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 text-white py-20 px-6 text-center border-b border-white/10">
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-1 text-xs font-semibold text-orange-400 mb-4">
              🇮🇱 מרכז ידע ורגולציה לקניינים וליבואני מזון בישראל
            </span>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
              המדריך המלא ליבוא מזון לישראל
            </h1>
            <p className="text-slate-300 text-base sm:text-lg mt-4 max-w-2xl mx-auto leading-relaxed">
              כל הרגולציות, התקנים, נהלי הכשרות ורפורמת היבוא האירופית (&ldquo;מה שטוב לאירופה&rdquo;) — במקום אחד, מעודכן ומנוסח במיוחד לקנייני רשתות שיווק, סיטונאים ויבואנים.
            </p>

            {/* Quick Metrics */}
            <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-8 mt-8 text-xs text-slate-300">
              <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700 px-3.5 py-1.5 rounded-xl">
                <span>📚</span>
                <span className="font-bold text-orange-400">{totalCount}+</span>
                <span>מאמרים ומדריכים</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700 px-3.5 py-1.5 rounded-xl">
                <span>🇪🇺</span>
                <span>רפורמת משרד הבריאות</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700 px-3.5 py-1.5 rounded-xl">
                <span>✡️</span>
                <span>אישור רבנות ראשית &amp; בד״ץ</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700 px-3.5 py-1.5 rounded-xl">
                <span>🏷️</span>
                <span>ת״י 1145 &amp; סימונים אדומים</span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── 4 CORE REGULATORY PILLARS ── */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-xs font-semibold text-orange-400 uppercase tracking-widest mb-2">
            תשתיות הרגולציה בישראל
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            4 עמודי התווך ליבוא מזון מסחרי מוצלח
          </h2>
          <p className="text-slate-400 text-sm mt-2">
            היבטים חיוניים שכל קניין ומנהל קטגוריה חייב להכיר לפני חתימה על חוזה אספקה מול מפעל אירופאי:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pillar 1 */}
          <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6 hover:border-orange-500/40 transition">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">🇪🇺</span>
              <h3 className="font-bold text-lg text-white">
                רפורמת היבוא האירופאי (&ldquo;מה שטוב לאירופה&rdquo;)
              </h3>
            </div>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-4">
              אימוץ הרגולציה האירופית על ידי משרד הבריאות מאפשר ליבואנים מסלול הצהרה מהיר (Green Track). מוצרים המיוצרים ומשווקים באיחוד האירופי נהנים מהקלה בבדיקות כפולות בנמלים ושחרור מואץ למדפים.
            </p>
            <div className="flex flex-wrap gap-1.5 text-[11px]">
              <span className="bg-slate-700 text-slate-300 px-2 py-0.5 rounded-md">מסלול ירוק</span>
              <span className="bg-slate-700 text-slate-300 px-2 py-0.5 rounded-md">ביטול כפילויות</span>
              <span className="bg-slate-700 text-slate-300 px-2 py-0.5 rounded-md">משרד הבריאות</span>
            </div>
          </div>

          {/* Pillar 2 */}
          <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6 hover:border-orange-500/40 transition">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">🏷️</span>
              <h3 className="font-bold text-lg text-white">
                תקן ישראלי ת״י 1145 וסימוני אזהרה אדומים
              </h3>
            </div>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-4">
              הוראות חובה לסימון מזון ארוז מראש בעברית: שם המוצר, רשימת רכיבים לפי סדר יורד, אלרגנים מודגשים, וחישוב מדויק של ספי נתרן, סוכר ושומן רווי לקביעת חובת מדבקות אדומות.
            </p>
            <div className="flex flex-wrap gap-1.5 text-[11px]">
              <span className="bg-slate-700 text-slate-300 px-2 py-0.5 rounded-md">ת״י 1145</span>
              <span className="bg-slate-700 text-slate-300 px-2 py-0.5 rounded-md">סימונים אדומים</span>
              <span className="bg-slate-700 text-slate-300 px-2 py-0.5 rounded-md">הצהרת אלרגנים</span>
            </div>
          </div>

          {/* Pillar 3 */}
          <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6 hover:border-orange-500/40 transition">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">✡️</span>
              <h3 className="font-bold text-lg text-white">
                מסלולי כשרות יבוא (רבנות ראשית &amp; בד״צים)
              </h3>
            </div>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-4">
              כל מוצר מזון המשווק ככשר בישראל מחייב תעודת הכשר מטעם מחלקת היבוא ברבנות הראשית לישראל (הרה״ר). אנו בודקים האם למפעל יש פיקוח מוכר (OU, OK, Star-K, בד״ץ) ומהי עלות ההשגחה למכולה.
            </p>
            <div className="flex flex-wrap gap-1.5 text-[11px]">
              <span className="bg-slate-700 text-slate-300 px-2 py-0.5 rounded-md">אישור הרה״ר</span>
              <span className="bg-slate-700 text-slate-300 px-2 py-0.5 rounded-md">כשרות מהדרין</span>
              <span className="bg-slate-700 text-slate-300 px-2 py-0.5 rounded-md">השגחת מכולות</span>
            </div>
          </div>

          {/* Pillar 4 */}
          <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6 hover:border-orange-500/40 transition">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">🚢</span>
              <h3 className="font-bold text-lg text-white">
                שחרור מכס, תעודות בריאות ועלות נחיתה
              </h3>
            </div>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-4">
              מערכת &ldquo;שער עולמי&rdquo; (מסר), סיווג מדויק של פרטי מכס (HS Codes), תעודות בריאות בינלאומיות (Health Certificates), הסכמי סחר חופשי (EUR.1 לפטור ממכס) וחישוב עלות נחיתה סופית למחסן.
            </p>
            <div className="flex flex-wrap gap-1.5 text-[11px]">
              <span className="bg-slate-700 text-slate-300 px-2 py-0.5 rounded-md">שער עולמי</span>
              <span className="bg-slate-700 text-slate-300 px-2 py-0.5 rounded-md">הסכם סחר EUR.1</span>
              <span className="bg-slate-700 text-slate-300 px-2 py-0.5 rounded-md">נמל חיפה / אשדוד</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── BROWSE BY TOPIC ── */}
      <section id="categories" className="max-w-6xl mx-auto px-6 py-16 border-t border-slate-800">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10">
          <div>
            <h2 className="text-2xl font-bold text-white">
              עיון במדריכים לפי נושא
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              סקירות מפורטות, תקנות רשמיות ודרישות מעשיות ליבוא מזון
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {IMPORT_GUIDE_CATEGORIES_HE.map((cat) => {
            const count = countByCategory(cat.slug);
            return (
              <Link
                key={cat.slug}
                href={`/he/import-guide/category/${cat.slug}`}
                className="group bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/70 hover:border-orange-500/50 rounded-2xl p-5 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-3xl">{cat.icon}</span>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-700/60 text-slate-300 border border-slate-600/50">
                      {count} מדריכים
                    </span>
                  </div>
                  <h3 className="font-bold text-base text-white group-hover:text-orange-400 transition mb-1.5">
                    {cat.title}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {cat.description}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-700/50 flex items-center justify-between text-xs font-semibold text-orange-400">
                  <span>עיון במאמרים</span>
                  <span className="transition-transform group-hover:-translate-x-1">←</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── RECENT ARTICLES ── */}
      {articles.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 py-16 border-t border-slate-800">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-white">
                מדריכים ומאמרים נבחרים
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                מידע מקצועי ועדכני המבוסס על עבודת רכש ואיתור ספקים שוטפת מול רשתות השיווק בישראל
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article) => {
              const catObj = IMPORT_GUIDE_CATEGORIES_HE.find(
                (c) => c.slug === article.category
              );
              return (
                <Link
                  key={article.id}
                  href={`/he/import-guide/${article.slug}`}
                  className="group bg-slate-800/30 hover:bg-slate-800/70 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 flex flex-col justify-between transition"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-2.5">
                      <span className="inline-flex items-center gap-1 font-semibold text-orange-400">
                        {catObj?.icon} {catObj?.title.split(" ")[0]}
                      </span>
                      <span>{article.reading_time_mins} דק׳ קריאה</span>
                    </div>

                    <h3 className="font-bold text-sm text-white group-hover:text-orange-300 transition line-clamp-2 leading-snug">
                      {article.title}
                    </h3>

                    {article.summary && (
                      <p className="text-xs text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                        {article.summary}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
                    <span>עודכן: {formatDateHe(article.updated_at)}</span>
                    <span className="text-orange-400 font-semibold group-hover:underline">קרא מדריך ←</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ── FAQ ACCORDION FOR RETAIL BUYERS ── */}
      <section className="max-w-4xl mx-auto px-6 py-16 border-t border-slate-800">
        <div className="text-center mb-10">
          <p className="text-xs font-semibold text-orange-400 uppercase tracking-widest mb-2">
            שאלות ותשובות לקניינים
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            שאלות נפוצות בנושא יבוא מזון ורגולציה
          </h2>
        </div>

        <div className="space-y-4 text-xs sm:text-sm">
          <div className="bg-slate-800/50 border border-slate-700/80 rounded-2xl p-5">
            <h3 className="font-bold text-base text-white mb-2">
              איך רפורמת &ldquo;מה שטוב לאירופה טוב לישראל&rdquo; משפיעה על יבוא מותג פרטי (PL)?
            </h3>
            <p className="text-slate-300 leading-relaxed">
              הרפורמה מאפשרת ליבואן ישראלי להסתמך על עמידת המפעל בדירקטיבות האירופיות ובדיקות המעבדה המקומיות באירופה, ללא צורך בהוכחת עמידה בתקנים ישראליים ייחודיים (למעט חריגים כגון בשר, חלב ומוצרים רגישים). הדבר מקצר משמעותית את זמן ההגעה למדף ומוזיל את עלויות בדיקות הנמל.
            </p>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/80 rounded-2xl p-5">
            <h3 className="font-bold text-base text-white mb-2">
              מה נדרש ממפעל באירופה כדי לקבל אישור כשרות של הרבנות הראשית לישראל?
            </h3>
            <p className="text-slate-300 leading-relaxed">
              היצרן חייב לפעול תחת פיקוחו של גוף כשרות מוכר (מרשימת הגופים המאושרים על ידי מחלקת היבוא ברבנות הראשית לישראל). גוף הכשרות מנפיק תעודת כשרות מקורית (Certificate of Kosher), ולאחר בדיקת חומרי הגלם וקווי הייצור, מונפק אישור יבוא רשמי מטעם הרה״ר המאפשר שחרור במכס.
            </p>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/80 rounded-2xl p-5">
            <h3 className="font-bold text-base text-white mb-2">
              כיצד מחושבים ספי הסימונים האדומים (סוכר, שומן רווי, נתרן)?
            </h3>
            <p className="text-slate-300 leading-relaxed">
              לפי תקנות הגנה על בריאות הציבור (מזון), מוצרי מזון מוצקים המספקים מעל 500 מ״ג נתרן, מעל 10 גרם סוכרים או מעל 5 גרם שומן רווי ל-100 גרם מוצר מחויבים בהטבעת סמל אדום ייעודי בחזית האריזה. במוצרי נוזל ומשקאות הספים נמוכים יותר (400 מ״ג נתרן, 5 גרם סוכר, 3 גרם שומן רווי).
            </p>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/80 rounded-2xl p-5">
            <h3 className="font-bold text-base text-white mb-2">
              האם תקן BRC או IFS מספיקים לשחרור מהיר במכס הישראלי?
            </h3>
            <p className="text-slate-300 leading-relaxed">
              תקני BRC ו-IFS ברמת ציון גבוהה (Higher Level / Grade A) מהווים תנאי סף אצל מרבית רשתות השיווק הגדולות בישראל (שופרסל, ויקטורי, רמי לוי) ומהווים הוכחה לבקרת איכות קפדנית, אך אינם פוטרים מחובת תעודת בריאות ממשלתית של המדינה המייצאת ומאישור כשרות רבנות.
            </p>
          </div>
        </div>
      </section>

      {/* ── CTA BOX ── */}
      <section className="bg-gradient-to-r from-orange-600/20 via-slate-800 to-slate-900 border-t border-slate-800 py-16 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <span className="text-3xl">🤝</span>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            מתכננים לייבא מוצר חדש או מחפשים מפעל אירופאי מאומת?
          </h2>
          <p className="text-slate-300 text-sm max-w-xl mx-auto leading-relaxed">
            אנו מאתרים עבורכם יצרנים אירופאיים העומדים מראש בדרישות הכשרות, התקנים, והתמחור התחרותי לנמל חיפה / אשדוד.
          </p>

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Link
              href="/he/sourcing"
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3 rounded-xl text-xs sm:text-sm transition shadow-lg shadow-orange-500/20"
            >
              הגשת בקשת רכש ואיתור מפעל (RFQ) ←
            </Link>
            <a
              href="https://wa.me/972525222291?text=%D7%A9%D7%9C%D7%95%D7%9D%20%D7%90%D7%95%D7%93%D7%99%2C%20%D7%90%D7%A0%D7%99%20%D7%9E%D7%A2%D7%95%D7%A0%D7%99%D7%99%D7%9F%20%D7%9C%D7%94%D7%AA%D7%99%D7%99%D7%A2%D7%A5%20%D7%91%D7%A0%D7%95%D7%A9%D7%90%20%D7%99%D7%91%D7%95%D7%90%20%D7%9E%D7%96%D7%95%D7%9F%20%D7%95%D7%A8%D7%92%D7%95%D7%9C%D7%A6%D7%99%D7%94."
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#1DA851] hover:bg-[#189a47] text-white font-bold px-6 py-3 rounded-xl text-xs sm:text-sm transition flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
            >
              <span>💬</span>
              <span>ייעוץ ישיר בווטסאפ עם אודי</span>
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
