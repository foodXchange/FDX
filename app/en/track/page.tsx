import type { Metadata } from "next";
import TrackingClientView from "@/components/tracking/TrackingClientView";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Live Sample & Order Tracking | FoodXchange B2B Enterprise",
  description:
    "Track European food factory tasting samples, air express courier waybills, and commercial container milestones in real-time.",
  alternates: {
    canonical: "https://fdx.trading/en/track",
    languages: {
      en: "https://fdx.trading/en/track",
      he: "https://fdx.trading/he/track",
    },
  },
};

interface PageProps {
  searchParams: Promise<{
    code?: string;
    q?: string;
    query?: string;
  }>;
}

export default async function EnglishTrackingPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const initialQuery = params?.code || params?.q || params?.query || "";

  return <TrackingClientView initialQuery={initialQuery} lang="en" />;
}
