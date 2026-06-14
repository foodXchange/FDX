const STYLES: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-300",
  approved: "bg-blue-500/10 text-blue-300",
  active: "bg-green-500/10 text-green-300",
  inactive: "bg-white/5 text-slate-400",
  rejected: "bg-red-500/10 text-red-300",
};

export default function StatusBadge({ status }: { status: string | null }) {
  const s = status ?? "pending";
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
