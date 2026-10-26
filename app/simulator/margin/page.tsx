import RetailMarginSimulator from "@/components/calculator/RetailMarginSimulator";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "סימולטור מרווח מדף קמעונאי ועלות נחיתה במרלו״ג | FoodXchange",
  description: "חישוב מפל עלויות יבוא CIF מאירופה לשקל, מרווחי רווח גולמי לרשתות שיווק מול מותגים מובילים, והפקת סקירת קטגוריה ב-1 עמוד להדפסה.",
};

export default function SimulatorMarginDefaultPage() {
  return <RetailMarginSimulator locale="he" />;
}
