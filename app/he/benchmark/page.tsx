import type { Metadata } from "next";
import BenchmarkMatrixClient from "@/components/benchmark/BenchmarkMatrixClient";

export const metadata: Metadata = {
  title: "מטריצת החלפת מותגי מדף לקניינים — Private Label אירופאי | FoodXchange",
  description:
    "תחשיב כלכלי להחלפת מותגי יבואנים יקרים (מוטי, יד מרדכי, ברילה, ריו מרה, סנפרוסט) במותג פרטי איכותי מיצרנים מובילים באירופה. הוזלת סל הצרכן ב-20%-35% והגדלת מרווח המדף של הרשת ל-40%-50%.",
  alternates: {
    canonical: "https://fdx.trading/he/benchmark",
    languages: {
      "he-IL": "https://fdx.trading/he/benchmark",
      "en-US": "https://fdx.trading/en/benchmark",
    },
  },
  openGraph: {
    title: "מטריצת החלפת מותגי מדף ביבוא ישיר | FoodXchange",
    description:
      "השוואת רווחיות קמעונאית: החלפת מותגי מדף ישראליים ביבוא ישיר מאירופה. דוגמאות טעימה, עלויות נחיתה ומרווחי מדף.",
    url: "https://fdx.trading/he/benchmark",
    type: "website",
    locale: "he_IL",
  },
};

export default function HebrewBenchmarkPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <BenchmarkMatrixClient isHebrew={true} />
      </div>
    </main>
  );
}
