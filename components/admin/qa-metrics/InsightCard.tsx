import Link from "next/link";
import type { AlertSeverity } from "@/lib/metrics/qaMetrics";

interface InsightCardProps {
  variant: "alert" | "suggestion";
  severity?: AlertSeverity;
  title: string;
  detail: string;
  href?: string;
}

const SEVERITY_CLASSES: Record<AlertSeverity, string> = {
  red: "border-red-200 bg-red-50",
  yellow: "border-yellow-200 bg-yellow-50",
};

const SEVERITY_DOT: Record<AlertSeverity, string> = {
  red: "bg-red-500",
  yellow: "bg-yellow-500",
};

export default function InsightCard({ variant, severity, title, detail, href }: InsightCardProps) {
  const containerClasses =
    variant === "alert" && severity
      ? `border rounded-xl p-4 ${SEVERITY_CLASSES[severity]}`
      : "border border-slate-200 bg-slate-50 rounded-xl p-4";

  const content = (
    <div className={containerClasses}>
      <div className="flex items-start gap-2.5">
        {variant === "alert" && severity && (
          <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${SEVERITY_DOT[severity]}`} />
        )}
        <div>
          <p className="text-sm font-semibold text-slate-800">{title}</p>
          <p className="text-sm text-slate-600 mt-0.5">{detail}</p>
        </div>
      </div>
    </div>
  );

  if (!href) return content;

  return (
    <Link href={href} className="block hover:opacity-80 transition">
      {content}
    </Link>
  );
}
