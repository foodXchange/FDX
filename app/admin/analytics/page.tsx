import { Suspense } from "react";
import { SectionSkeleton } from "@/components/admin/analytics/SectionSkeleton";
import { TodaySummaryBar } from "@/components/admin/analytics/TodaySummaryBar";
import { RecentRequestsSection } from "@/components/admin/analytics/RecentRequestsSection";
import { MatchActivitySection } from "@/components/admin/analytics/MatchActivitySection";
import { TopBuyersSection } from "@/components/admin/analytics/TopBuyersSection";
import { SupplierPipelineSection } from "@/components/admin/analytics/SupplierPipelineSection";

export const dynamic = "force-dynamic";

export default function AdminAnalyticsPage() {
  const lastUpdated = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <main className="min-h-screen bg-gray-50">
      {/* TOP BAR */}
      <div className="border-b border-gray-200 bg-white px-6 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <span className="text-sm font-semibold text-gray-800">Analytics</span>
        <span className="text-xs text-slate-400">Last updated: {lastUpdated}</span>
      </div>

      <div className="px-6 py-6 max-w-6xl mx-auto space-y-6">
        {/* ── TODAY'S SUMMARY ──────────────────────────────────────────── */}
        <Suspense fallback={<SectionSkeleton variant="stats" />}>
          <TodaySummaryBar />
        </Suspense>

        {/* ── RECENT REQUESTS ──────────────────────────────────────────── */}
        <Suspense fallback={<SectionSkeleton variant="table" rows={10} />}>
          <RecentRequestsSection />
        </Suspense>

        {/* ── MATCH ACTIVITY ───────────────────────────────────────────── */}
        <Suspense fallback={<SectionSkeleton variant="chart" />}>
          <MatchActivitySection />
        </Suspense>

        {/* ── TOP BUYERS + SUPPLIER PIPELINE ──────────────────────────────── */}
        <div className="flex gap-4 flex-col lg:flex-row">
          <div className="flex-1">
            <Suspense fallback={<SectionSkeleton variant="list" rows={5} />}>
              <TopBuyersSection />
            </Suspense>
          </div>
          <div className="lg:w-96">
            <Suspense fallback={<SectionSkeleton variant="pipeline" />}>
              <SupplierPipelineSection />
            </Suspense>
          </div>
        </div>
      </div>
    </main>
  );
}
