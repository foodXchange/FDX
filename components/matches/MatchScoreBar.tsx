function barColor(score: number): string {
  if (score >= 70) return "bg-green-500";
  if (score >= 50) return "bg-orange-500";
  return "bg-red-500";
}

export default function MatchScoreBar({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, score));
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div className={`h-full rounded-full ${barColor(pct)}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-slate-300 shrink-0">{score}/100</span>
    </div>
  );
}
