import type { Metadata } from "next";
import MixedContainerBuilder from "@/components/calculator/MixedContainerBuilder";

export const metadata: Metadata = {
  title: "מחשבון מכולה משולבת ואיחוד מפעלי מזון מאירופה | FoodXchange",
  description:
    "כלי תכנון ואופטימיזציה לקנייני רשתות מזון ויבואנים בישראל: הרכבת מכולה משולבת (20ft / 40ft HC) ממספר יצרנים שונים באירופה, בדיקת נפח CBM ומשקל, חלוקת שילוח וחיסכון של עד 25% בעלות נחיתה.",
  alternates: {
    canonical: "https://fdx.trading/he/calculator/container",
    languages: {
      "he-IL": "https://fdx.trading/he/calculator/container",
      "en-US": "https://fdx.trading/en/calculator/container",
    },
  },
  openGraph: {
    title: "מחשבון מכולה משולבת ואיחוד מטענים | FoodXchange",
    description:
      "איחוד משטחים ממפעלי פסטה, שמן זית, חומץ ורטבים ממודנה, ולנסיה ורוטרדם לתוך מכולה אחת שלמה עם מעקב חיסכון מול שילוח חלקי.",
    url: "https://fdx.trading/he/calculator/container",
    type: "website",
    locale: "he_IL",
  },
};

export default function HebrewMixedContainerPage() {
  return <MixedContainerBuilder initialLang="he" />;
}
