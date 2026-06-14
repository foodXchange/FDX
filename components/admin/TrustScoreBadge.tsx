function tierFor(score: number | null): { label: string; className: string } {
  const value = score ?? 0;
  if (value >= 80) return { label: "⭐ Top", className: "bg-green-100 text-green-700" };
  if (value >= 60) return { label: "Good", className: "bg-blue-100 text-blue-700" };
  if (value >= 40) return { label: "Fair", className: "bg-yellow-100 text-yellow-700" };
  return { label: "New", className: "bg-gray-100 text-gray-500" };
}

export default function TrustScoreBadge({
  score,
  title,
}: {
  score: number | null;
  title?: string;
}) {
  const { label, className } = tierFor(score);
  return (
    <span
      title={title}
      className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${className}`}
    >
      {label}
    </span>
  );
}
