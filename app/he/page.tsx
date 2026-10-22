import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import Reveal from "@/components/Reveal";
import FAQAccordion from "@/components/FAQAccordion";

export const metadata: Metadata = {
  title: "איתור יצרני מזון אירופאים לרשתות השיווק בישראל | FoodXchange",
  description:
    "חיבור ישיר של קניינים, יבואנים ורשתות שיווק בישראל ליצרני מזון מובילים באירופה. מותג פרטי (Private Label), בדיקת כשרות (רבנות/בד״ץ), מכולות ומחירים תחרותיים ישירות מהמפעל.",
  keywords: [
    "יבוא מזון מאירופה",
    "יצרני מזון אירופאים",
    "מותג פרטי מזון",
    "כשרות יבוא רבנות",
    "קנייני מזון בישראל",
    "שמן זית מותג פרטי",
    "שימורי טונה יבוא",
    "סורסינג מזון בינלאומי",
  ],
  openGraph: {
    title: "איתור יצרני מזון אירופאים לרשתות השיווק בישראל | FoodXchange",
    description:
      "חיבור ישיר של קניינים ויבואנים בישראל למעל 600 יצרני מזון מאושרים באירופה — מותג פרטי, כשרות ומחירים תחרותיים.",
    type: "website",
    locale: "he_IL",
  },
  alternates: {
    canonical: "https://fdx.trading/he",
    languages: {
      "he-IL": "https://fdx.trading/he",
      "en": "https://fdx.trading/en/buyers",
    },
  },
};

const buyerFaqsHe = [
  {
    q: "כיצד אתם בודקים היתכנות כשרות של יצרן באירופה?",
    a: "אנו מבצעים סינון מקדים קפדני של נתיבי הכשרות (Kosher Pathways) עוד לפני הצגת היצרן לקניין. אנו בודקים האם למפעל יש תעודת כשרות קיימת מוכרת, או נכונות ויכולת תפעולית להכשיר קווי ייצור מול מחלקת היבוא של הרבנות הראשית לישראל או גופי בד״ץ מובילים — כך שנמנעות הפתעות מאוחרות בתהליך.",
  },
  {
    q: "באילו קטגוריות מוצרים אתם פועלים באירופה?",
    a: "אנו פעילים במגוון רחב של קטגוריות: מזון קפוא (ירקות, צ׳יפס בלגי, פירות ודגים), פסטה ושימורי עגבניות (איטליה), שמן זית ומוצרי ים תיכוני (ספרד, יוון), שימורי טונה ודגים (ספרד ופורטוגל), חטיפים וגרנולה אורגנית, ותחליפי חלב צמחיים. במידה ואתם זקוקים לקטגוריה ייעודית, אנו מבצעים איתור ממוקד (Bespoke Sourcing) לפי מפרט.",
  },
  {
    q: "מה המודל המסחרי שלכם? האם השירות עולה כסף לקניין בישראל?",
    a: "הפנייה הראשונית, בדיקת ההיתכנות ואיתור המפעלים נעשים ללא עלות וללא התחייבות מצד הקניין או הרשת. המודל המסחרי שלנו מבוסס על הצלחת ההתקשרות והסחר השוטף מול היצרן, במחירים ישירים ושקופים ללא תיווכים מיותרים.",
  },
  {
    q: "האם ניתן לייצר תחת מותג פרטי (Private Label) של הרשת שלנו?",
    a: "בהחלט. מרבית המפעלים ברשת שלנו מייצרים עבור רשתות שיווק מובילות באירופה (כגון Lidl, Carrefour, Mercadona) ומתמחים בייצור מותג פרטי. אנו מוודאים שהמפעל מסוגל להדפיס שפות תיוג בעברית לפי ת״י 1145, לספק אריזות קמעונאיות ממותגות, ולעמוד בנפחי המכולות הנדרשים.",
  },
  {
    q: "כמה מהר אנו מקבלים מענה ודוגמאות מוצר לבדיקה בישראל?",
    a: "אנו מגיבים לכל פנייה אישית בתוך 24 שעות עסקים. לאחר אפיון הדרישות (RFQ), אנו מציגים נתוני מפעל והצעת מחיר CIF בתוך ימים ספורים, ומסייעים בתיאום שילוח דוגמאות טעימה ומעבדה מהירות ישירות למשרדי הקניין בישראל.",
  },
];

export default function HebrewBuyersHomePage() {
  const buyerWaMsg = "שלום אודי, אני קניין/יבואן מזון בישראל ומעוניין לבדוק יצרנים אירופאים מתאימים עבור הרשת/החברה שלנו.";

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only">
        דלג לתוכן המרכזי
      </a>

      <main id="main" className="bg-slate-900 text-slate-100">

        {/* ── HERO SECTION ── */}
        <section className="relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 px-6 py-20 sm:py-28 text-center border-b border-white/10">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-500/10 via-transparent to-transparent pointer-events-none" />

          <Reveal>
            <div className="max-w-4xl mx-auto relative z-10">
              <span className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-1.5 text-xs font-semibold text-orange-400 mb-6 shadow-sm">
                <span>🇮🇱</span>
                <span>השער הישיר לרשתות השיווק, היבואנים ומנהלי הקטגוריות בישראל</span>
              </span>

              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white leading-tight">
                איתור יצרני מזון אירופאים מובילים.{" "}
                <span className="text-orange-500 block sm:inline">מותאם בדיוק למדף בישראל.</span>
              </h1>

              <p className="mt-6 max-w-2xl mx-auto text-base sm:text-lg text-slate-300 leading-relaxed font-normal">
                לא עוד רשימות של מאות ספקים לא רלוונטיים. אנו מאתרים עבורך את המפעל המדויק — עם יכולת ייצור
                מותג פרטי (Private Label), נתיב כשרות בדוק (רבנות ראשית / בד״ץ), ותמחור CIF תחרותי ישירות מהמקור.
              </p>

              {/* Trust bar */}
              <div className="mt-10 max-w-3xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900/80 border border-white/10 rounded-2xl p-4 shadow-xl backdrop-blur-sm">
                <div className="text-center p-2">
                  <div className="text-2xl sm:text-3xl font-extrabold text-orange-400">600+</div>
                  <div className="text-xs text-slate-400 mt-1">יצרני מזון באירופה</div>
                </div>
                <div className="text-center p-2 border-r sm:border-r-0 sm:border-r border-white/10">
                  <div className="text-2xl sm:text-3xl font-extrabold text-orange-400">15+</div>
                  <div className="text-xs text-slate-400 mt-1">שנות ניסיון בסורסינג</div>
                </div>
                <div className="text-center p-2 border-t sm:border-t-0 border-white/10">
                  <div className="text-2xl sm:text-3xl font-extrabold text-orange-400">כשרות</div>
                  <div className="text-xs text-slate-400 mt-1">רבנות ראשית / בד״ץ</div>
                </div>
                <div className="text-center p-2 border-t sm:border-t-0 border-r border-white/10">
                  <div className="text-2xl sm:text-3xl font-extrabold text-orange-400">24 שעות</div>
                  <div className="text-xs text-slate-400 mt-1">מענה אישי ומקצועי</div>
                </div>
              </div>

              {/* Primary Actions */}
              <div className="mt-10 flex flex-wrap gap-4 justify-center items-center">
                <Link
                  href="/he/contact"
                  className="bg-orange-500 hover:bg-orange-600 text-white px-7 py-3.5 rounded-xl font-bold text-sm sm:text-base transition shadow-lg shadow-orange-500/25 flex items-center gap-2"
                >
                  <span>הגש בקשת רכש מהירה (RFQ)</span>
                  <span>←</span>
                </Link>

                <a
                  href={`https://wa.me/972525222291?text=${encodeURIComponent(buyerWaMsg)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3.5 rounded-xl font-bold text-sm sm:text-base transition shadow-lg shadow-emerald-600/20 flex items-center gap-2"
                >
                  <span>💬</span>
                  <span>וואטסאפ ישיר עם אודי</span>
                </a>

                <Link
                  href="/business-card/udi?lang=he"
                  className="border border-white/20 hover:border-white/40 text-slate-200 hover:text-white px-6 py-3.5 rounded-xl font-medium text-sm sm:text-base transition bg-white/5 hover:bg-white/10 flex items-center gap-2"
                >
                  <span>📇</span>
                  <span>כרטיס ביקור ופגישה</span>
                </Link>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ── 3 PILLARS: WHY FOODXCHANGE FOR ISRAELI BUYERS ── */}
        <section className="px-6 py-20 bg-slate-900 border-b border-white/10">
          <div className="max-w-5xl mx-auto">
            <Reveal>
              <div className="text-center mb-12">
                <span className="text-xs font-bold text-orange-500 uppercase tracking-widest mb-2 block">
                  היתרון המסחרי של רשתות השיווק
                </span>
                <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                  למה קניינים מובילים בישראל בוחרים ב-FoodXchange?
                </h2>
                <p className="text-slate-400 mt-3 max-w-2xl mx-auto text-sm sm:text-base">
                  אנו מגשרים על הפער המורכב שבין המפעל האירופאי לבין דרישות הרגולציה, הכשרות והרווחיות של השוק המקומי.
                </p>
              </div>
            </Reveal>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  icon: "🏷️",
                  title: "מותג פרטי מותאם אישית (Private Label)",
                  desc: "אנו עובדים עם יצרנים אירופאים בעלי קווי אריזה מתקדמים המותאמים לייצור מותג פרטי עבור רשתות השיווק בישראל — כולל תוויות בעברית לפי ת״י 1145 ועיצוב אריזה ייעודי.",
                },
                {
                  icon: "✡️",
                  title: "סינון כשרות מוקדם ובטוח",
                  desc: "כל מפעל עובר בדיקת היתכנות כשרות מקיפה לפני כל היכרות: תעודות קיימות, בדיקת רכיבים, ונכונות להגעת משלחות משגיחים מטעם הרבנות הראשית או גופי בד״ץ.",
                },
                {
                  icon: "🚢",
                  title: "תמחור CIF תחרותי ומכולות מלאות",
                  desc: "חיבור ישיר למחירי המפעל (Ex-Factory / FOB / CIF Haifa) ללא מתווכים וסוכני משנה, עם אופטימיזציה לוגיסטית של מכולות מלאות (FCL) ומשטחים.",
                },
              ].map((card, i) => (
                <Reveal key={i}>
                  <div className="bg-slate-800/80 border border-white/10 rounded-2xl p-7 h-full flex flex-col hover:border-orange-500/40 transition">
                    <span className="text-3xl mb-4 block">{card.icon}</span>
                    <h3 className="font-bold text-white text-lg mb-2.5">{card.title}</h3>
                    <p className="text-sm text-slate-300 leading-relaxed flex-1">{card.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── 3-STEP PROCESS ── */}
        <section className="px-6 py-20 bg-slate-950 border-b border-white/10">
          <div className="max-w-5xl mx-auto">
            <Reveal>
              <div className="text-center mb-12">
                <span className="text-xs font-bold text-orange-500 uppercase tracking-widest mb-2 block">
                  איך זה עובד
                </span>
                <h2 className="text-3xl md:text-4xl font-bold text-white">שלושה צעדים — ללא בירוקרטיה מיותרת</h2>
                <p className="text-slate-400 mt-3 max-w-xl mx-auto text-sm sm:text-base">
                  תהליך מובנה וממוקד שמביא אותך לדוגמאות והצעת מחיר בזמן שיא.
                </p>
              </div>
            </Reveal>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  n: "1",
                  title: "הגדרת הצורך והמפרט",
                  body: "שתף אותנו במוצר המבוקש (או תמונות בנצ׳מרק מהמדף), נפח מכולות שנתי משוער, דרישות כשרות (רבנות / בד״ץ) וסוג מיתוג (מותג פרטי או מותג יצרן).",
                },
                {
                  n: "2",
                  title: "איתור ואימות המפעל המתאים",
                  body: "אנו סורקים את רשת המפעלים המאומתים באירופה (איטליה, ספרד, בלגיה, צרפת, פולין ויוון), מוודאים תקני איכות (BRC / IFS) ובודקים את מסלול הכשרות.",
                },
                {
                  n: "3",
                  title: "הצעת מחיר ודוגמאות טעימה",
                  body: "קבלת פירוט מסחרי מלא (מפרט טכני, עלויות CIF Haifa, תנאי תשלום), תיאום משלוח דוגמאות בדיקה לישראל, וליווי ישיר במשא ומתן עד לחתימת ההזמנה.",
                },
              ].map((step, i) => (
                <Reveal key={i}>
                  <div className="bg-slate-800/60 border border-white/10 rounded-2xl p-7 h-full flex flex-col">
                    <div className="w-10 h-10 mb-4 bg-orange-500 text-white rounded-xl flex items-center justify-center font-black text-lg shadow-md shadow-orange-500/20">
                      {step.n}
                    </div>
                    <h3 className="font-bold text-white text-base mb-2">{step.title}</h3>
                    <p className="text-sm text-slate-300 leading-relaxed flex-1">{step.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>

            <Reveal>
              <div className="relative w-full mt-10 rounded-2xl overflow-hidden border border-white/10 shadow-2xl" style={{ minHeight: "300px" }}>
                <Image
                  src="/images/buyer-product-review.png"
                  alt="קניין מזון ישראלי בודק דוגמאות של מוצרי מזון אירופאים"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 1024px"
                  quality={85}
                />
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── REAL COMMERCIAL CASE STUDY ── */}
        <section className="px-6 py-20 bg-slate-900 border-b border-white/10">
          <div className="max-w-5xl mx-auto">
            <Reveal>
              <div className="text-center mb-10">
                <span className="text-xs font-bold text-orange-500 uppercase tracking-widest mb-2 block">
                  מקרה בוחן מהשטח
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-white">תוצאות מסחריות אמיתיות על המדף</h2>
              </div>
            </Reveal>

            <div className="grid md:grid-cols-2 gap-8 items-stretch">
              <Reveal>
                <div className="bg-slate-800 border border-white/10 rounded-2xl p-7 h-full flex flex-col justify-between shadow-xl">
                  <div>
                    <span className="text-xs font-bold text-orange-400 uppercase tracking-widest bg-orange-500/10 border border-orange-500/20 px-2.5 py-1 rounded-full">
                      אספקה שוטפת ברשת
                    </span>
                    <h3 className="text-3xl font-black text-white mt-4">3–4 מכולות בחודש</h3>
                    <p className="text-sm text-orange-300 font-medium mt-1">
                      מותג פרטי (Private Label) של מוצרי תפו״א קפואים — מבלגיה לישראל
                    </p>

                    <div className="mt-6 space-y-4 text-sm">
                      <div className="border-r-2 border-orange-500 pr-3">
                        <span className="text-xs font-bold text-slate-400 uppercase">האתגר:</span>
                        <p className="text-slate-300 mt-1 leading-relaxed">
                          רשת שיווק ישראלית גדולה ביקשה להרחיב את ליין המותג הפרטי במחלקת הקפואים, אך התקשתה למצוא מפעל אירופאי אמין עם כושר ייצור מכולתי ונתיב כשרות ישים.
                        </p>
                      </div>
                      <div className="border-r-2 border-orange-500 pr-3">
                        <span className="text-xs font-bold text-slate-400 uppercase">הפתרון:</span>
                        <p className="text-slate-300 mt-1 leading-relaxed">
                          איתרנו מפעל בלגי מוביל בעל מפרט תואם, תיאמנו אישור כשרות מסודר, בנינו את תנאי המסחר CIF, וליווינו את תהליך הדוגמאות והאריזה הממותגת בעברית.
                        </p>
                      </div>
                      <div className="border-r-2 border-orange-500 pr-3">
                        <span className="text-xs font-bold text-slate-400 uppercase">התוצאה:</span>
                        <p className="text-slate-300 mt-1 leading-relaxed">
                          אספקה חודשית רציפה ויציבה של מכולות ממותגות, עם חיסכון משמעותי בעלויות הרכש ושיפור שולי הרווח של הרשת.
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 mt-6 pt-4 border-t border-white/10 font-mono">
                    רשת סופרמרקטים בישראל · מפעל מזון אירופאי
                  </p>
                </div>
              </Reveal>

              <Reveal>
                <div className="flex flex-col gap-5 h-full">
                  <div className="bg-slate-800/80 border border-white/10 rounded-2xl p-6 flex-1 shadow-md">
                    <p className="text-xs font-bold text-orange-400 uppercase tracking-widest mb-3">
                      מה אנחנו בודקים לפני ההיכרות?
                    </p>
                    <ul className="space-y-2.5">
                      {[
                        "התאמת המפרט הטכני ויכולת עמידה בנפחי מכולות חודשיים",
                        "נתיב כשרות מוסמך (רבנות ראשית יבוא / בד״ץ)",
                        "תקני איכות בינלאומיים (BRC Global / IFS Food / ISO 22000)",
                        "תמחור תחרותי המשאיר מרווח שיווק בריא לרשת בישראל",
                      ].map((item, j) => (
                        <li key={j} className="flex gap-2.5 text-sm text-slate-300 items-start">
                          <span className="text-orange-500 font-bold shrink-0 mt-0.5">✓</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-slate-800/80 border border-white/10 rounded-2xl p-6 flex-1 shadow-md">
                    <p className="text-xs font-bold text-orange-400 uppercase tracking-widest mb-3">
                      מה אתם מקבלים בתור קניינים?
                    </p>
                    <ul className="space-y-2.5">
                      {[
                        "המלצה ממוקדת על המפעל המתאים ביותר — ללא בזבוז זמן על רשימות סרק",
                        "כרטיס מפעל ומפרט מסחרי מלא עוד לפני הפגישה הראשונה",
                        "ליווי מלא בעברית ובאנגלית לכל אורך המו״מ המסחרי והלוגיסטי",
                        "משלוח מרוכז של דוגמאות טעימה ומעבדה ישירות למשרדיכם",
                      ].map((item, j) => (
                        <li key={j} className="flex gap-2.5 text-sm text-slate-300 items-start">
                          <span className="text-orange-500 font-bold shrink-0 mt-0.5">✓</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ── CORE CATEGORIES ── */}
        <section className="px-6 py-20 bg-slate-950 border-b border-white/10">
          <div className="max-w-5xl mx-auto">
            <Reveal>
              <div className="text-center mb-12">
                <span className="text-xs font-bold text-orange-500 uppercase tracking-widest mb-2 block">
                  מגוון מוצרים ומפעלים
                </span>
                <h2 className="text-3xl font-bold text-white">קטגוריות מובילות בסורסינג אירופאי</h2>
                <p className="text-slate-400 mt-2 text-sm sm:text-base">
                  כל הקטגוריות זמינות לאריזה במותג פרטי (Private Label) או מותג יצרן.
                </p>
              </div>
            </Reveal>

            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[
                ["❄️", "מזון קפוא", "צ׳יפס בלגי מובחר, ירקות קפואים, פירות יער, פילטים של דגים"],
                ["🫒", "שמן זית ומוצרי ים תיכוני", "שמן זית כתית מעולה 750 מ״ל / 1 ליטר (ספרד, איטליה, יוון), חומצים וזיתים"],
                ["🥫", "שימורים ודגים", "שימורי טונה פרימיום (ספרד ופורטוגל), רסקי עגבניות בגביעים ועגבניות מרוסקות (איטליה)"],
                ["🍝", "פסטה, קמחים ורטבים", "פסטה איטלקית מסמולינת דורום, קמחי פיצה ומאפה, רטבי פסטה מוכנים"],
                ["🍪", "חטיפים וגרנולה", "גרנולה אורגנית (בד״ץ), חטיפי בריאות, קרקרים מיוחדים ומוצרים ללא גלוטן"],
                ["🥛", "תחליפי חלב ומשקאות", "משקאות שיבולת שועל, שקדים וסויה, מעדנים צמחיים ומוצרים ללא לקטוז"],
              ].map(([icon, title, sub], i) => (
                <Reveal key={i}>
                  <div className="flex items-start gap-3.5 bg-slate-800/80 border border-white/10 rounded-2xl p-5 hover:border-orange-500/40 transition">
                    <span className="text-3xl shrink-0">{icon}</span>
                    <div>
                      <p className="font-bold text-white text-base">{title}</p>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">{sub}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ SECTION ── */}
        <section className="px-6 py-20 bg-slate-900 border-b border-white/10">
          <div className="max-w-3xl mx-auto">
            <Reveal>
              <FAQAccordion
                title="שאלות נפוצות של קניינים ומנהלי רכש בישראל"
                items={buyerFaqsHe}
              />
            </Reveal>
          </div>
        </section>

        {/* ── FINAL CALL TO ACTION ── */}
        <section className="px-6 py-24 bg-gradient-to-b from-slate-900 to-slate-950 text-white text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-orange-500/10 via-transparent to-transparent pointer-events-none" />

          <Reveal>
            <div className="max-w-2xl mx-auto relative z-10">
              <span className="text-xs font-bold text-orange-400 uppercase tracking-widest bg-orange-500/10 border border-orange-500/20 px-3 py-1 rounded-full mb-4 inline-block">
                בואו נבדוק התאמה
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 tracking-tight">
                מוכן לשדרג את מקורות הרכש שלך באירופה?
              </h2>
              <p className="text-slate-300 mb-3 text-base leading-relaxed">
                שתפו אותנו בקטגוריה או במוצר שאתם מחפשים. אנו נחזור אליכם אישית עם תובנות שוק ומפעלים רלוונטיים תוך 24 שעות — ללא בירוקרטיה וללא התחייבות.
              </p>
              <p className="text-xs text-slate-500 mb-8 font-mono">
                אודי סטריק · udi@fdx.trading · +972-52-522-2291
              </p>

              <div className="flex flex-wrap gap-3.5 justify-center">
                <Link
                  href="/he/contact"
                  className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3.5 rounded-xl font-bold transition shadow-lg shadow-orange-500/30 flex items-center gap-2"
                >
                  <span>הגש בקשת רכש מהירה (RFQ)</span>
                  <span>←</span>
                </Link>

                <a
                  href={`https://wa.me/972525222291?text=${encodeURIComponent(buyerWaMsg)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-7 py-3.5 rounded-xl font-bold transition shadow-lg shadow-emerald-600/20 flex items-center gap-2"
                >
                  <span>💬</span>
                  <span>שיחת וואטסאפ מהירה</span>
                </a>
              </div>
            </div>
          </Reveal>
        </section>

      </main>
    </>
  );
}
