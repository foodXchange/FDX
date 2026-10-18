import type { SummaryMetric } from "@/lib/metrics/qaMetrics";

function formatDelta(metric: SummaryMetric): string {
  const sign = metric.delta > 0 ? "+" : "";
  if (metric.deltaType === "percent") return `${sign}${metric.delta}%`;
  return `${sign}${metric.delta}`;
}

const METRIC_ICONS: Record<string, string> = {
  new_requests: "📥",
  matches_sent: "🚀",
  supplier_replies: "💬",
  deals_closed: "🏆",
};

const METRIC_COLORS: Record<string, { border: string; bg: string; iconBg: string }> = {
  new_requests: {
    border: "border-blue-200/80",
    bg: "bg-blue-50/30",
    iconBg: "bg-blue-100 text-blue-700",
  },
  matches_sent: {
    border: "border-amber-200/80",
    bg: "bg-amber-50/30",
    iconBg: "bg-amber-100 text-amber-700",
  },
  supplier_replies: {
    border: "border-emerald-200/80",
    bg: "bg-emerald-50/30",
    iconBg: "bg-emerald-100 text-emerald-700",
  },
  deals_closed: {
    border: "border-purple-200/80",
    bg: "bg-purple-50/30",
    iconBg: "bg-purple-100 text-purple-700",
  },
};

export default function SummaryCard({ metric }: { metric: SummaryMetric }) {
  const deltaColor =
    metric.delta > 0
      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
      : metric.delta < 0
      ? "bg-rose-100 text-rose-800 border-rose-200"
      : "bg-slate-100 text-slate-600 border-slate-200";

  const styling = METRIC_COLORS[metric.key] ?? {
    border: "border-slate-200",
    bg: "bg-white",
    iconBg: "bg-slate-100 text-slate-700",
  };

  const icon = METRIC_ICONS[metric.key] ?? "📊";

  return (
    <div
      className={`bg-white border ${styling.border} rounded-2xl p-5 shadow-xs hover:shadow-sm transition-all relative overflow-hidden`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
          {metric.label}
        </span>
        <span
          className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${styling.iconBg}`}
        >
          {icon}
        </span>
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-2">
        <p className="text-3xl font-extrabold text-slate-900 tracking-tight">
          {metric.value.toLocaleString()}
        </p>
        <span
          className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${deltaColor} shrink-0`}
        >
          {formatDelta(metric)} vs prev
        </span>
      </div>
      <p className="text-[11px] text-slate-400 mt-1">Activity recorded today</p>
    </div>
  );
}
