import Link from "next/link";
import type { AlertSeverity } from "@/lib/metrics/qaMetrics";

interface InsightCardProps {
  variant: "alert" | "suggestion";
  severity?: AlertSeverity;
  title: string;
  detail: string;
  href?: string;
}

const SEVERITY_CLASSES: Record<AlertSeverity, { border: string; bg: string; badge: string }> = {
  red: {
    border: "border-rose-200",
    bg: "bg-rose-50/40",
    badge: "bg-rose-100 text-rose-800 border-rose-200",
  },
  yellow: {
    border: "border-amber-200",
    bg: "bg-amber-50/40",
    badge: "bg-amber-100 text-amber-800 border-amber-200",
  },
};

export default function InsightCard({
  variant,
  severity,
  title,
  detail,
  href,
}: InsightCardProps) {
  const isAlert = variant === "alert";
  const styling =
    isAlert && severity
      ? SEVERITY_CLASSES[severity]
      : {
          border: "border-blue-200 bg-blue-50/30",
          badge: "bg-blue-100 text-blue-800 border-blue-200",
        };

  return (
    <div
      className={`border ${styling.border} rounded-2xl p-4.5 shadow-2xs hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3`}
    >
      <div className="flex items-start gap-3">
        <span className="text-xl shrink-0 mt-0.5">
          {isAlert ? (severity === "red" ? "🚨" : "⚠️") : "💡"}
        </span>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-bold text-slate-900">{title}</h4>
            <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full border ${styling.badge}`}>
              {isAlert ? (severity === "red" ? "High Priority Bottleneck" : "Warning") : "Optimization Tip"}
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">{detail}</p>
        </div>
      </div>

      {href && (
        <Link
          href={href}
          className="self-end sm:self-center shrink-0 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:text-orange-600 hover:border-orange-300 hover:bg-orange-50/50 transition-colors shadow-2xs whitespace-nowrap"
        >
          View & Fix →
        </Link>
      )}
    </div>
  );
}
