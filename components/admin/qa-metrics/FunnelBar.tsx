import Link from "next/link";
import type { FunnelStage } from "@/lib/metrics/qaMetrics";

const BAR_COLOR: Record<string, string> = {
  green: "bg-emerald-500",
  yellow: "bg-amber-500",
  red: "bg-rose-500",
};

const BADGE_COLOR: Record<string, string> = {
  green: "bg-emerald-100 text-emerald-800 border-emerald-200",
  yellow: "bg-amber-100 text-amber-800 border-amber-200",
  red: "bg-rose-100 text-rose-800 border-rose-200",
};

const STAGE_ICONS: Record<string, string> = {
  signup: "👤",
  first_request: "📝",
  matched: "🎯",
  matches_viewed: "👀",
  supplier_replied: "💬",
  deal_closed: "🏆",
};

export default function FunnelBar({
  stage,
  rangeDays,
}: {
  stage: FunnelStage;
  rangeDays: number;
}) {
  const widthPct = stage.conversionPct === null ? 100 : Math.max(3, stage.conversionPct);
  const icon = STAGE_ICONS[stage.key] ?? "•";

  return (
    <Link
      href={`/en/admin/qa-metrics/funnel/${stage.key}?range=${rangeDays}`}
      className="block p-3 rounded-xl hover:bg-slate-50/80 border border-transparent hover:border-slate-200 transition-all group"
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-sm">{icon}</span>
          <span className="text-sm font-semibold text-slate-800 group-hover:text-orange-600 transition-colors">
            {stage.label}
          </span>
          <span className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
            View drop-offs →
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="text-sm font-extrabold text-slate-900">
            {stage.count.toLocaleString()}
          </span>
          {stage.conversionPct !== null ? (
            <span
              className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${BADGE_COLOR[stage.color]}`}
            >
              {stage.conversionPct}%
            </span>
          ) : (
            <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              Base
            </span>
          )}
        </div>
      </div>

      <div className="h-2 rounded-full bg-slate-100 overflow-hidden shadow-inner">
        <div
          className={`h-full rounded-full transition-all duration-500 ${BAR_COLOR[stage.color]}`}
          style={{ width: `${widthPct}%` }}
        />
      </div>
    </Link>
  );
}
