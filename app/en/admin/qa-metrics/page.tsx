import Link from "next/link";
import { computeQaSnapshot, getLatestQaSnapshot, DEFAULT_RANGE_DAYS } from "@/lib/metrics/qaMetrics";
import { relativeTime } from "@/lib/format/relativeTime";
import SummaryCard from "@/components/admin/qa-metrics/SummaryCard";
import FunnelBar from "@/components/admin/qa-metrics/FunnelBar";
import SupplierPerfTable from "@/components/admin/qa-metrics/SupplierPerfTable";
import BuyerActivityTable from "@/components/admin/qa-metrics/BuyerActivityTable";
import InsightCard from "@/components/admin/qa-metrics/InsightCard";
import RefreshSnapshotButton from "@/components/admin/qa-metrics/RefreshSnapshotButton";

export const revalidate = 0;

type SearchParams = Promise<{ range?: string }>;

const VALID_RANGES = [7, 30, 90];

export default async function QaMetricsPage({ searchParams }: { searchParams: SearchParams }) {
  const { range } = await searchParams;
  const rangeDays = VALID_RANGES.includes(Number(range)) ? Number(range) : DEFAULT_RANGE_DAYS;

  let lastUpdated: string | null = null;
  let snapshot;

  if (range === undefined) {
    const latest = await getLatestQaSnapshot();
    if (latest) {
      snapshot = latest.data;
      lastUpdated = latest.createdAt;
    } else {
      snapshot = await computeQaSnapshot(rangeDays);
    }
  } else {
    snapshot = await computeQaSnapshot(rangeDays);
  }

  return (
    <main className="bg-slate-50 min-h-screen py-12 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <Link href="/en/admin/analytics" className="text-sm text-slate-400 hover:text-slate-600 transition">
              ← Analytics
            </Link>
            <h1 className="text-2xl font-semibold text-slate-900 mt-1">QA Metrics</h1>
            <p className="text-slate-500 text-sm mt-1">
              Sourcing funnel health, supplier &amp; buyer performance, and bottleneck alerts
            </p>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="text-xs text-slate-400">Last updated: {relativeTime(lastUpdated)}</span>
            )}
            <RefreshSnapshotButton />
            <Link
              href="/en/admin/qa-metrics/settings"
              className="text-xs font-medium px-3 py-1 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
            >
              Settings
            </Link>
          </div>
        </div>

        {/* Section A — Today's Summary */}
        <div className="mb-10">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
            Today&apos;s Summary
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {snapshot.summary.map((metric) => (
              <SummaryCard key={metric.key} metric={metric} />
            ))}
          </div>
        </div>

        {/* Section B — Buyer Funnel */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Buyer Funnel</h2>
            <div className="flex gap-1.5">
              {VALID_RANGES.map((d) => (
                <Link
                  key={d}
                  href={`/en/admin/qa-metrics?range=${d}`}
                  className={`text-xs font-medium px-3 py-1 rounded-full transition ${
                    d === rangeDays
                      ? "bg-orange-500 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {d}d
                </Link>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            {snapshot.funnel.map((stage) => (
              <FunnelBar key={stage.key} stage={stage} rangeDays={rangeDays} />
            ))}
          </div>
        </div>

        {/* Section C — Supplier Performance */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 mt-8">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">
            Supplier Performance
          </h2>
          <SupplierPerfTable rows={snapshot.supplierPerformance} />
        </div>

        {/* Section D — Buyer Activity */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 mt-8">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">
            Buyer Activity
          </h2>
          <BuyerActivityTable rows={snapshot.buyerActivity} />
        </div>

        {/* Section E — Bottleneck Alerts */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 mt-8">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">
            Bottleneck Alerts
          </h2>
          {snapshot.alerts.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No bottlenecks detected.</p>
          ) : (
            <div className="space-y-3">
              {snapshot.alerts.map((alert) => (
                <InsightCard
                  key={alert.key}
                  variant="alert"
                  severity={alert.severity}
                  title={alert.title}
                  detail={alert.detail}
                  href={alert.href}
                />
              ))}
            </div>
          )}
        </div>

        {/* Section F — Optimization Suggestions */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 mt-8">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">
            Optimization Suggestions
          </h2>
          {snapshot.suggestions.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No suggestions right now.</p>
          ) : (
            <div className="space-y-3">
              {snapshot.suggestions.map((suggestion) => (
                <InsightCard
                  key={suggestion.key}
                  variant="suggestion"
                  title={suggestion.title}
                  detail={suggestion.detail}
                  href={suggestion.href}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
