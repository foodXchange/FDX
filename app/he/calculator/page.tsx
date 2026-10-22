import type { Metadata } from "next";
import LandedCostCalculator from "@/components/calculator/LandedCostCalculator";

export const metadata: Metadata = {
  title: "מחשבון עלות נחיתה ורווחיות מדף לקנייני מזון ויבואנים | FoodXchange",
  description:
    "כלי סימולציה אינטראקטיבי לקנייני רשתות שיווק ויבואני מזון בישראל: המרת מחירי יצרן באירופה (EUR/USD) לעלות נחיתה מלאה במרלו״ג (ILS ₪), שילוח ימי, אגרות נמל, עמילות מכס, רווחיות גולמית והשוואת בנצ׳מרק.",
  alternates: {
    canonical: "https://fdx.trading/he/calculator",
    languages: {
      "he-IL": "https://fdx.trading/he/calculator",
      "en-US": "https://fdx.trading/en/calculator",
    },
  },
  openGraph: {
    title: "מחשבון עלות נחיתה ורווחיות מדף לקנייני מזון | FoodXchange",
    description:
      "סימולציית מחירי מפעל באירופה, עלות נחיתה בישראל, מרווחי מדף לרשתות שיווק והשוואת בנצ׳מרק למותגים מובילים.",
    url: "https://fdx.trading/he/calculator",
    type: "website",
    locale: "he_IL",
  },
};

export default function HebrewCalculatorPage() {
  return <LandedCostCalculator initialLang="he" />;
}
