import type { Metadata } from "next";
import BuyerGuideView from "@/components/guides/BuyerGuideView";

export const revalidate = 3600; // Cache for 1 hour

export const metadata: Metadata = {
  title: "מדריך קניינים למותג פרטי ויבוא מזון מאירופה | FoodXchange",
  description:
    "המדריך המלא לקנייני רשתות שיווק ויבואנים בישראל: כיצד לאתר מעל 5,000 מפעלי מזון אירופאים, להזמין דוגמאות טעימה ישירות למשרד, לעמוד בתקן ת״י 1145 וכשרות, ולסגור עסקאות יצרן ישירות.",
  alternates: {
    canonical: "https://fdx.trading/he/guide",
    languages: {
      "he-IL": "https://fdx.trading/he/guide",
      "en-US": "https://fdx.trading/en/guide",
    },
  },
  openGraph: {
    title: "מדריך קניינים למותג פרטי ויבוא מזון מאירופה | FoodXchange",
    description:
      "מדריך מעשי לקניינים: איתור מפעלים מאומתים, שילוח דוגמאות אקספרס, בדיקת סימונים אדומים, כשרות, וניהול הזמנות מכולה.",
    url: "https://fdx.trading/he/guide",
    siteName: "FoodXchange",
    type: "article",
  },
};

export default function HebrewBuyerGuidePage() {
  return (
    <main>
      <BuyerGuideView lang="he" />
    </main>
  );
}
