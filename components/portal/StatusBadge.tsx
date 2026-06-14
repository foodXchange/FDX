const STYLES: Record<string, string> = {
  new: "bg-blue-500/10 text-blue-300",
  reviewed: "bg-yellow-500/10 text-yellow-300",
  matched: "bg-green-500/10 text-green-300",
  closed: "bg-white/5 text-slate-400",
  sent: "bg-purple-500/10 text-purple-300",
};

export default function StatusBadge({ status }: { status: string | null }) {
  const s = status ?? "new";
  return (
    <span
      className={`text-xs font-semibold px-3 py-1 rounded-full capitalize shrink-0 ${
        STYLES[s] ?? "bg-white/5 text-slate-400"
      }`}
    >
      {s}
    </span>
  );
}
