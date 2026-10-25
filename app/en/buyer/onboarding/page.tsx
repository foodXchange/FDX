import { Metadata } from "next";
import BuyerOnboardingClient from "@/components/buyer/BuyerOnboardingClient";

export const metadata: Metadata = {
  title: "Retail Buyer Fast-Pass Onboarding | FoodXchange B2B Trade",
  description:
    "Fast-pass onboarding for Israeli supermarket category managers and private label directors. Configure landed margin targets and receive a complimentary European discovery tasting kit at your retail HQ.",
};

export default function EnglishBuyerOnboardingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <BuyerOnboardingClient initialLang="en" />
    </div>
  );
}
