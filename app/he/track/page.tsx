import type { Metadata } from "next";
import TrackingClientView from "@/components/tracking/TrackingClientView";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "מעקב משלוח דוגמאות טעימה ומכולות יבוא בזמן אמת | FoodXchange",
  description:
    "פורטל מעקב לוגיסטי באקספרס מול מפעלי המזון באירופה, שטרי מטען DHL ושחרור ממכס נתב״ג ישירות לשולחן הטעימות ברשתות השיווק.",
  alternates: {
    canonical: "https://fdx.trading/he/track",
    languages: {
      en: "https://fdx.trading/track",
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

export default async function HebrewTrackingPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const initialQuery = params?.code || params?.q || params?.query || "";

  return <TrackingClientView initialQuery={initialQuery} lang="he" />;
}
