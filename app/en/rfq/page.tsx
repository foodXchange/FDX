import type { Metadata } from "next";
import SmartRfqMatchmaker from "@/components/rfq/SmartRfqMatchmaker";

export const metadata: Metadata = {
  title: "Smart RFQ & Private Label Matchmaker | FoodXchange",
  description:
    "AI-powered retail sourcing tool: match supermarket category benchmarks against 58,000+ European food catalog items. Landed cost calculations, 40%+ retail margins, and direct tasting kit dispatch.",
  alternates: {
    canonical: "https://fdx.trading/en/rfq",
    languages: {
      "he-IL": "https://fdx.trading/he/rfq",
      "en-US": "https://fdx.trading/en/rfq",
    },
  },
  openGraph: {
    title: "Smart RFQ & Private Label Matchmaker | FoodXchange",
    description: "Benchmark shelf brand replacements, landed cost comparisons, and express sample dispatch.",
    url: "https://fdx.trading/en/rfq",
    type: "website",
    locale: "en_US",
  },
};

export default function EnglishRfqPage() {
  return <SmartRfqMatchmaker initialLang="en" />;
}
