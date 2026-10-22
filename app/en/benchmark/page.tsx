import type { Metadata } from "next";
import BenchmarkMatrixClient from "@/components/benchmark/BenchmarkMatrixClient";

export const metadata: Metadata = {
  title: "Competitive Shelf Replacement Matrix — European Private Label | FoodXchange",
  description:
    "Comparative retail economics: replace expensive monopoly brands in Israeli supermarkets with high-margin European direct factory OEM. Cut consumer prices by 20%-35% while expanding retail gross margins to 40%-50%.",
  alternates: {
    canonical: "https://fdx.trading/en/benchmark",
    languages: {
      "he-IL": "https://fdx.trading/he/benchmark",
      "en-US": "https://fdx.trading/en/benchmark",
    },
  },
  openGraph: {
    title: "Competitive Shelf Replacement Matrix | FoodXchange",
    description:
      "Replace national supermarket brands with verified European OEM manufacturers. Instant retail margin calculation, landed cost, and sample dispatch.",
    url: "https://fdx.trading/en/benchmark",
    type: "website",
    locale: "en_US",
  },
};

export default function EnglishBenchmarkPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <BenchmarkMatrixClient isHebrew={false} />
      </div>
    </main>
  );
}
