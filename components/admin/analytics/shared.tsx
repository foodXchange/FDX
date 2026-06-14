export const cardCls = "bg-white border border-gray-200 rounded-2xl p-5 shadow-sm";

export function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  if (sec < 3600) return `${Math.floor(sec / 60)} min ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} hrs ago`;
  if (sec < 604800) return `${Math.floor(sec / 86400)} days ago`;
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function RequestStatusBadge({ status }: { status: string | null }) {
  const s = status ?? "new";
  const cls =
    s === "new"
      ? "bg-blue-100 text-blue-700"
      : s === "reviewed"
      ? "bg-yellow-100 text-yellow-700"
      : s === "matched"
      ? "bg-green-100 text-green-700"
      : "bg-gray-100 text-gray-600";
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${cls}`}>
      {s}
    </span>
  );
}
