type Props = {
  productCount: number;
  certificationCount: number;
  marketsCount: number;
  lastScrapedAt: string | null;
};

export function SupplierQuickStats({
  productCount,
  certificationCount,
  marketsCount,
  lastScrapedAt,
}: Props) {
  const daysSinceScraped =
    lastScrapedAt !== null
      ? Math.floor((Date.now() - new Date(lastScrapedAt).getTime()) / 86400000)
      : null;

  const stats = [
    { label: "Products", value: productCount },
    { label: "Certifications", value: certificationCount },
    { label: "Markets served", value: marketsCount },
    { label: "Days since scraped", value: daysSinceScraped ?? "—" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 py-4 bg-white border-b border-gray-200">
      {stats.map((s) => (
        <div
          key={s.label}
          className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3"
        >
          <p className="text-xl font-bold text-gray-800">{s.value}</p>
          <p className="text-xs text-gray-500 uppercase tracking-wide">{s.label}</p>
        </div>
      ))}
    </div>
  );
}
