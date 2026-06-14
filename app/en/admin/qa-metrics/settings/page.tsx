import Link from "next/link";
import { getQaMetricsTargets } from "@/lib/metrics/qaMetrics";
import { updateQaMetricsTargets } from "./actions";

export const revalidate = 0;

export default async function QaMetricsSettingsPage() {
  const targets = await getQaMetricsTargets();

  return (
    <main className="bg-slate-50 min-h-screen py-12 px-6">
      <div className="max-w-xl mx-auto">
        <Link href="/en/admin/qa-metrics" className="text-sm text-slate-400 hover:text-slate-600 transition">
          ← QA Metrics
        </Link>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 mt-3">
          <h1 className="text-xl font-semibold text-slate-900">QA Metrics Settings</h1>
          <p className="text-sm text-slate-500 mt-1">
            Targets and thresholds used for bottleneck alerts and the weekly report.
          </p>

          <form action={updateQaMetricsTargets} className="mt-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="targetReplyRate">
                Target reply rate (%)
              </label>
              <input
                type="number"
                id="targetReplyRate"
                name="targetReplyRate"
                defaultValue={targets.targetReplyRate}
                min={0}
                max={100}
                step="0.1"
                required
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <p className="text-xs text-slate-400 mt-1">
                Suppliers' overall reply rate target used by the weekly report.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="targetResponseTimeHours">
                Target response time (hours)
              </label>
              <input
                type="number"
                id="targetResponseTimeHours"
                name="targetResponseTimeHours"
                defaultValue={targets.targetResponseTimeHours}
                min={1}
                step="0.5"
                required
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <p className="text-xs text-slate-400 mt-1">
                Also used as the cutoff for "inactive supplier" and "unmatched request" alerts.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="targetTimeToCloseDays">
                Target time to close (days)
              </label>
              <input
                type="number"
                id="targetTimeToCloseDays"
                name="targetTimeToCloseDays"
                defaultValue={targets.targetTimeToCloseDays}
                min={1}
                step="0.5"
                required
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="replyRateDropAlertPct">
                Reply rate drop alert threshold (points)
              </label>
              <input
                type="number"
                id="replyRateDropAlertPct"
                name="replyRateDropAlertPct"
                defaultValue={targets.replyRateDropAlertPct}
                min={1}
                max={100}
                step="0.5"
                required
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <p className="text-xs text-slate-400 mt-1">
                Trigger a bottleneck alert if the overall reply rate drops by more than this many percentage points
                week-over-week.
              </p>
            </div>

            <button
              type="submit"
              className="bg-orange-500 hover:bg-orange-600 text-white font-medium text-sm px-5 py-2.5 rounded-lg transition"
            >
              Save settings
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
