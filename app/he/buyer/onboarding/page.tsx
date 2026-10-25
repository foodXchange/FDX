import { Metadata } from "next";
import BuyerOnboardingClient from "@/components/buyer/BuyerOnboardingClient";

export const metadata: Metadata = {
  title: "מעבר מהיר (Fast-Pass) לקנייני רשתות מזון | FoodXchange B2B Trade",
  description:
    "הרשמה מהירה לקנייני ומנהלי מותג פרטי ברשתות השיווק בישראל. חיבור ישיר ליצרני מזון באירופה, יעדי מרווח מדף וקבלת ערכת טעימות אישית למטה ההנהלה.",
};

export default function HebrewBuyerOnboardingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <BuyerOnboardingClient initialLang="he" />
    </div>
  );
}
