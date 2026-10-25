import type { Metadata } from "next";
import SupplierGuideView from "@/components/guides/SupplierGuideView";

export const revalidate = 3600; // Cache for 1 hour

export const metadata: Metadata = {
  title: "European Supplier Export Guide: Selling Food & Beverage to Israel | FoodXchange",
  description:
    "The official operational guide for European food manufacturers exporting to Israeli supermarket chains: RFQ quoting, CIF Haifa logistics, sample customs waivers, Chief Rabbinate Kosher certification, and SI 1145 label compliance.",
  alternates: {
    canonical: "https://fdx.trading/en/supplier-guide",
  },
  openGraph: {
    title: "European Supplier Export Guide: Selling Food to Israel | FoodXchange",
    description:
      "Direct retail access for European food factories: Quoting CIF Haifa, fast courier tasting sample clearance, Israeli SI 1145 regulations, and secure 30/70 payment terms.",
    url: "https://fdx.trading/en/supplier-guide",
    siteName: "FoodXchange",
    type: "article",
  },
};

export default function SupplierGuidePage() {
  return (
    <main>
      <SupplierGuideView />
    </main>
  );
}
