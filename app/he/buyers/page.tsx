import Image from "next/image";
import type { Metadata } from "next";
import Reveal from "@/components/Reveal";
import BuyerRequestSection from "@/components/buyers/BuyerRequestSection";

export const metadata: Metadata = {
  title: "לקניינים ורשתות מזון — איתור מפעלים ויצרנים מאומתים | FoodXchange",
  description:
    "העלו תמונת בנצ'מרק או תארו בעברית את מוצר המזון המבוקש. אנו מאתרים עבורכם יצרנים אירופאיים מאומתים המתאימים לשוק הישראלי, למותג פרטי ולכשרות.",
  keywords: [
    "איתור ספקי מזון",
    "יבוא מזון לישראל",
    "מותג פרטי מזון",
    "קנייני מזון רשתות שיווק",
    "מפעלים באירופה יבוא",
    "כשרות יבוא מזון",
  ],
  alternates: {
    canonical: "https://fdx.trading/he/buyers",
  },
  openGraph: {
    title: "לקניינים ורשתות מזון — איתור מפעלים מאומתים באירופה | FoodXchange",
    description:
      "העלו 3 תמונות או הקליטו — אנו מאתרים עבורכם את המפעל המתאים ביותר מתוך מאגר של 600+ יצרנים אירופאיים.",
    type: "website",
  },
};

export default function HebrewBuyersPage() {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:right-4 focus:z-50 focus:bg-dark-600 focus:text-dark-text-primary focus:px-4 focus:py-2 rounded-md shadow"
      >
        דלג לתוכן המרכזי
      </a>

      <main id="main">
        {/* ── COMPACT VISUAL HERO (RTL) ── */}
        <section className="relative w-full overflow-hidden border-b border-white/10" style={{ minHeight: "280px" }}>
          <Image
            src="/images/buyer-product-review.png"
            alt="קניין רשת מזון בוחן דוגמאות מוצרים"
            fill
            className="object-cover"
            priority
            quality={90}
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/85 via-slate-900/80 to-slate-950" />
          <div className="relative z-10 px-6 py-12 sm:py-16 text-center max-w-4xl mx-auto">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3.5 py-1 text-xs font-semibold text-orange-400 mb-4">
                🇮🇱 לקנייני רשתות מזון, סיטונאים ויבואנים בישראל
              </span>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white leading-tight">
                צלמו 3 תמונות או הקליטו.{" "}
                <span className="text-orange-500">אנחנו מאתרים את המפעל.</span>
              </h1>
              <p className="mt-3 max-w-xl mx-auto text-sm sm:text-base text-slate-300">
                העלו מוצר בנצ&apos;מרק, צלמו תוויות רכיבים או תארו בקולכם בעברית — אנו מצליבים את הדרישה מול 600+ יצרני מזון מאומתים באירופה.
              </p>
              <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-400">
                <span>מייצרים מזון ומעוניינים לייצא לישראל?</span>
                <a href="/en/suppliers/register" className="text-orange-400 hover:text-orange-300 font-semibold underline">
                  הרשמה כיצרן &larr;
                </a>
              </div>
            </Reveal>
          </div>
        </section>

        <BuyerRequestSection lang="he" />
      </main>
    </>
  );
}
