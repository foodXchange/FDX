import type { SummaryMetric } from "@/lib/metrics/qaMetrics";

function formatDelta(metric: SummaryMetric): string {
  const sign = metric.delta > 0 ? "+" : "";
  if (metric.deltaType === "percent") return `${sign}${metric.delta}%`;
  return `${sign}${metric.delta}`;
}

export default function SummaryCard({ metric }: { metric: SummaryMetric }) {
  const deltaColor =
    metric.delta > 0
      ? "bg-green-100 text-green-700"
      : metric.delta < 0
      ? "bg-red-100 text-red-700"
      : "bg-slate-100 text-slate-500";

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{metric.label}</p>
      <div className="flex items-end justify-between mt-2">
        <p className="text-3xl font-bold text-slate-900">{metric.value.toLocaleString()}</p>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${deltaColor}`}>
          {formatDelta(metric)} vs yesterday
        </span>
      </div>
    </div>
  );
}
