import type { Metadata } from "next";
import MixedContainerBuilder from "@/components/calculator/MixedContainerBuilder";

export const metadata: Metadata = {
  title: "Mixed Container Builder & Multi-Factory Consolidation Hub | FoodXchange",
  description:
    "Interactive B2B container load optimizer for food buyers: combine pallets from multiple European factories into 20ft / 40ft High Cube containers. Real-time CBM, weight limits, and up to 25% landed freight savings.",
  alternates: {
    canonical: "https://fdx.trading/en/calculator/container",
    languages: {
      "he-IL": "https://fdx.trading/he/calculator/container",
      "en-US": "https://fdx.trading/en/calculator/container",
    },
  },
  openGraph: {
    title: "Mixed Container Builder & Multi-Factory Consolidation Hub | FoodXchange",
    description:
      "Combine pasta, olive oil, vinegar, and sauces from Italian and Spanish plants into a single consolidated container with direct Pro-Forma PO generation.",
    url: "https://fdx.trading/en/calculator/container",
    type: "website",
    locale: "en_US",
  },
};

export default function EnglishMixedContainerPage() {
  return <MixedContainerBuilder initialLang="en" />;
}
