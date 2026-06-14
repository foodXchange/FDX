import Link from "next/link";
import type { FunnelStage } from "@/lib/metrics/qaMetrics";

const BAR_COLOR: Record<string, string> = {
  green: "bg-green-500",
  yellow: "bg-yellow-500",
  red: "bg-red-500",
};

const BADGE_COLOR: Record<string, string> = {
  green: "bg-green-100 text-green-700",
  yellow: "bg-yellow-100 text-yellow-700",
  red: "bg-red-100 text-red-700",
};

export default function FunnelBar({ stage, rangeDays }: { stage: FunnelStage; rangeDays: number }) {
  const widthPct = stage.conversionPct === null ? 100 : Math.max(2, stage.conversionPct);

  return (
    <Link href={`/en/admin/qa-metrics/funnel/${stage.key}?range=${rangeDays}`} className="block group">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-slate-700 group-hover:text-orange-600 transition">
          {stage.label}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-900">{stage.count.toLocaleString()}</span>
          {stage.conversionPct !== null && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${BADGE_COLOR[stage.color]}`}>
              {stage.conversionPct}%
            </span>
          )}
        </div>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full ${BAR_COLOR[stage.color]}`} style={{ width: `${widthPct}%` }} />
      </div>
    </Link>
  );
}
