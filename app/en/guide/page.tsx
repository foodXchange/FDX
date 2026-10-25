import type { Metadata } from "next";
import BuyerGuideView from "@/components/guides/BuyerGuideView";

export const revalidate = 3600; // Cache for 1 hour

export const metadata: Metadata = {
  title: "Retail Buyer Sourcing Guide: European Food OEM & Private Label | FoodXchange",
  description:
    "The operational sourcing guide for supermarket category managers and food importers: discover 5,000+ verified European factories, order fast-track courier tasting samples, ensure SI 1145 & kosher compliance, and execute direct container orders.",
  alternates: {
    canonical: "https://fdx.trading/en/guide",
    languages: {
      "he-IL": "https://fdx.trading/he/guide",
      "en-US": "https://fdx.trading/en/guide",
    },
  },
  openGraph: {
    title: "Retail Buyer Sourcing Guide | FoodXchange",
    description:
      "Operational playbook for supermarket buyers: European factory verification, tasting sample kits, Israeli SI 1145 compliance, and direct factory container orders.",
    url: "https://fdx.trading/en/guide",
    siteName: "FoodXchange",
    type: "article",
  },
};

export default function EnglishBuyerGuidePage() {
  return (
    <main>
      <BuyerGuideView lang="en" />
    </main>
  );
}
