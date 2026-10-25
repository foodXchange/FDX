import type { Metadata } from "next";
import SmartRfqMatchmaker from "@/components/rfq/SmartRfqMatchmaker";

export const metadata: Metadata = {
  title: "מערכת התאמת מותג פרטי וסורסינג לקנייני רשתות מזון | FoodXchange Smart RFQ",
  description:
    "כלי התאמה וסורסינג חכם לקנייני רשתות מזון בישראל: איתור חלופות מותג פרטי מול מותגי מדף יקרים (ברילה, מוטי, פיליפו בריו, ריו מרה, נוטלה) מתוך 58,000 מוצרים ומעל 5,000 מפעלי מזון באירופה.",
  alternates: {
    canonical: "https://fdx.trading/he/rfq",
    languages: {
      "he-IL": "https://fdx.trading/he/rfq",
      "en-US": "https://fdx.trading/en/rfq",
    },
  },
  openGraph: {
    title: "מערכת התאמת מותג פרטי מאירופה | FoodXchange",
    description: "הפקת מצגת סורסינג רשמית, השוואת עלות נחיתה ומרווחי מדף, והזמנת דוגמאות טעימה.",
    url: "https://fdx.trading/he/rfq",
    type: "website",
    locale: "he_IL",
  },
};

export default function HebrewRfqPage() {
  return <SmartRfqMatchmaker initialLang="he" />;
}
