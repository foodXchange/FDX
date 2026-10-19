import { Suspense } from "react";
import { getIntelligenceMetrics } from "@/lib/admin/intelligenceService";
import { IntelligenceDashboardClient } from "@/components/admin/analytics/IntelligenceDashboardClient";
import { SectionSkeleton } from "@/components/admin/analytics/SectionSkeleton";
import { TodaySummaryBar } from "@/components/admin/analytics/TodaySummaryBar";
import { RecentRequestsSection } from "@/components/admin/analytics/RecentRequestsSection";
import { MatchActivitySection } from "@/components/admin/analytics/MatchActivitySection";
import { TopBuyersSection } from "@/components/admin/analytics/TopBuyersSection";
import { SupplierPipelineSection } from "@/components/admin/analytics/SupplierPipelineSection";

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage() {
  const data = await getIntelligenceMetrics();

  const dealPipelineSlot = (
    <div className="space-y-6">
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
  );

  return (
    <main className="min-h-screen bg-slate-50/70 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <IntelligenceDashboardClient data={data} dealPipelineSlot={dealPipelineSlot} />
      </div>
    </main>
  );
}
