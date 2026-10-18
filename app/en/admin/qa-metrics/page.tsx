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
    <main className="bg-slate-50/70 min-h-screen pb-16">
      {/* Top Admin Header & Context Bar */}
      <div className="border-b border-slate-200 bg-white shadow-2xs">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <Link
                  href="/admin"
                  className="text-slate-400 hover:text-slate-700 font-medium transition-colors"
                >
                  Admin
                </Link>
                <span className="text-slate-300">/</span>
                <span className="text-slate-400 font-medium">Operations</span>
                <span className="text-slate-300">/</span>
                <span className="text-orange-600 font-bold bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                  QA Metrics
                </span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mt-1.5">
                QA Metrics &amp; Funnel Intelligence
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Monitor sourcing funnel conversion rates, supplier reply latency, buyer engagement, and automated bottleneck alerts.
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              {lastUpdated && (
                <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                  Snapshot: {relativeTime(lastUpdated)}
                </span>
              )}
              <RefreshSnapshotButton />
              <Link
                href="/en/admin/qa-metrics/settings"
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
              >
                ⚙ Targets
              </Link>
            </div>
          </div>

          {/* Quick Cross-Admin Navigation Pill Bar */}
          <div className="flex items-center gap-2 mt-5 pt-4 border-t border-slate-100 flex-wrap text-xs">
            <span className="text-slate-400 font-medium">Quick Nav:</span>
            <Link
              href="/admin/pipeline"
              className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 hover:text-orange-600 hover:bg-orange-50 transition-colors font-medium"
            >
              Deal Pipeline ➔
            </Link>
            <Link
              href="/admin/data-quality"
              className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 hover:text-orange-600 hover:bg-orange-50 transition-colors font-medium"
            >
              Data Quality &amp; Taxonomy ➔
            </Link>
            <Link
              href="/admin/matches"
              className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 hover:text-orange-600 hover:bg-orange-50 transition-colors font-medium"
            >
              Match Engine ➔
            </Link>
            <Link
              href="/admin/suppliers"
              className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 hover:text-orange-600 hover:bg-orange-50 transition-colors font-medium"
            >
              Suppliers ➔
            </Link>
            <Link
              href="/admin/buyers"
              className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 hover:text-orange-600 hover:bg-orange-50 transition-colors font-medium"
            >
              Buyers ➔
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Section A — Today's Operational Summary */}
        <section>
          <div className="flex items-center justify-between mb-3.5">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <span>⚡ Real-Time Operational Velocity</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Key activity logged today compared to the previous 24h window.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {snapshot.summary.map((metric) => (
              <SummaryCard key={metric.key} metric={metric} />
            ))}
          </div>
        </section>

        {/* Section B — Buyer Sourcing Funnel */}
        <section className="bg-white border border-slate-200 rounded-2xl shadow-xs p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>📈 Buyer Conversion Funnel</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {rangeDays} Days Window
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Track progression from Buyer Registration through Request Submission, Matching, and Closed Deals. Click any stage to inspect dropped-off records.
              </p>
            </div>

            <div className="flex items-center gap-1.5 self-end sm:self-auto bg-slate-100 p-1 rounded-lg">
              {VALID_RANGES.map((d) => (
                <Link
                  key={d}
                  href={`/en/admin/qa-metrics?range=${d}`}
                  className={`text-xs font-semibold px-3 py-1 rounded-md transition-all ${
                    d === rangeDays
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {d} Days
                </Link>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {snapshot.funnel.map((stage) => (
              <FunnelBar key={stage.key} stage={stage} rangeDays={rangeDays} />
            ))}
          </div>
        </section>

        {/* 2-Column Grid: Section C & D */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Section C — Supplier Performance */}
          <section className="bg-white border border-slate-200 rounded-2xl shadow-xs p-6 flex flex-col">
            <div className="mb-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>🏭 Supplier Responsiveness</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Suppliers evaluated on Trust Score, reply latency, and quote acceptance.
              </p>
            </div>
            <div className="flex-1">
              <SupplierPerfTable rows={snapshot.supplierPerformance} />
            </div>
          </section>

          {/* Section D — Buyer Activity */}
          <section className="bg-white border border-slate-200 rounded-2xl shadow-xs p-6 flex flex-col">
            <div className="mb-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>👥 Buyer Engagement &amp; Retention</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Monitor active sourcing frequency and identify stalled buyers needing attention.
              </p>
            </div>
            <div className="flex-1">
              <BuyerActivityTable rows={snapshot.buyerActivity} />
            </div>
          </section>
        </div>

        {/* Section E — Bottleneck Alerts */}
        <section className="bg-white border border-slate-200 rounded-2xl shadow-xs p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>🚨 Bottleneck &amp; Latency Alerts</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                  {snapshot.alerts.length} Detected
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                System-flagged friction points where requests or supplier outreach are delayed beyond SLA targets.
              </p>
            </div>
          </div>

          {snapshot.alerts.length === 0 ? (
            <div className="text-center py-8 bg-emerald-50/40 border border-emerald-200/80 rounded-xl">
              <div className="text-2xl mb-1.5">✓</div>
              <p className="text-sm font-semibold text-emerald-900">Zero Bottlenecks Detected</p>
              <p className="text-xs text-emerald-700 mt-0.5">
                All deal stages and outreach responses are operating within expected SLA thresholds.
              </p>
            </div>
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
        </section>

        {/* Section F — Optimization Suggestions */}
        <section className="bg-white border border-slate-200 rounded-2xl shadow-xs p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>💡 Strategic Optimization Suggestions</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  {snapshot.suggestions.length} Actionable
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Algorithmic recommendations to increase match conversion and improve supplier density.
              </p>
            </div>
          </div>

          {snapshot.suggestions.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No suggestions right now. Funnel is well-balanced.</p>
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
        </section>
      </div>
    </main>
  );
}
