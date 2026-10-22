import type { Metadata } from "next";
import LandedCostCalculator from "@/components/calculator/LandedCostCalculator";

export const metadata: Metadata = {
  title: "Retail Landed Cost & Gross Margin Calculator | FoodXchange",
  description:
    "Interactive B2B sourcing simulator for Israeli supermarket buyers and food importers: translate European factory quotes (EUR/USD) into landed cost at distribution centers (ILS ₪), with freight, port clearance, retailer gross margins, and brand benchmark savings.",
  alternates: {
    canonical: "https://fdx.trading/en/calculator",
    languages: {
      "he-IL": "https://fdx.trading/he/calculator",
      "en-US": "https://fdx.trading/en/calculator",
    },
  },
  openGraph: {
    title: "Retail Landed Cost & Gross Margin Simulator | FoodXchange",
    description:
      "Translate European factory quotes into Israeli landed costs, shelf retail pricing, and supermarket gross margin economics.",
    url: "https://fdx.trading/en/calculator",
    type: "website",
    locale: "en_US",
  },
};

export default function EnglishCalculatorPage() {
  return <LandedCostCalculator initialLang="en" />;
}
