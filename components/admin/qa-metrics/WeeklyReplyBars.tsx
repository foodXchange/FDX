import type { WeeklyReplyRate } from "@/lib/metrics/qaMetrics";

export default function WeeklyReplyBars({ weeks }: { weeks: WeeklyReplyRate[] }) {
  return (
    <div className="flex items-end gap-2 h-32">
      {weeks.map((w) => (
        <div key={w.weekStart} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full h-24 bg-slate-100 rounded flex flex-col justify-end overflow-hidden">
            <div
              className="bg-orange-500 rounded-t w-full"
              style={{ height: `${Math.max(w.replyRate, w.sentCount > 0 ? 4 : 0)}%` }}
            />
          </div>
          <span className="text-[10px] font-medium text-slate-600">{w.sentCount > 0 ? `${w.replyRate}%` : "—"}</span>
          <span className="text-[10px] text-slate-400">
            {new Date(w.weekStart).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
          </span>
        </div>
      ))}
    </div>
  );
}
