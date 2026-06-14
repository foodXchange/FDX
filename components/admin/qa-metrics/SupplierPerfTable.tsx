import Link from "next/link";
import ScoreBar from "@/components/admin/qa-metrics/ScoreBar";
import type { SupplierPerfRow } from "@/lib/metrics/qaMetrics";

export default function SupplierPerfTable({ rows }: { rows: SupplierPerfRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-slate-400 text-center py-8">No matches sent in this range.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-slate-500 uppercase tracking-wide border-b border-slate-100">
            <th className="py-2 pr-4 font-medium">Supplier</th>
            <th className="py-2 pr-4 font-medium">Trust score</th>
            <th className="py-2 pr-4 font-medium">Reply rate</th>
            <th className="py-2 pr-4 font-medium">Avg response</th>
            <th className="py-2 pr-4 font-medium">Deals won</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="py-2.5 pr-4">
                <Link
                  href={`/en/admin/qa-metrics/suppliers/${r.id}`}
                  className="font-medium text-slate-800 hover:text-orange-600 transition"
                >
                  {r.companyName}
                </Link>
                {r.country && <span className="text-xs text-slate-400 ml-1.5">{r.country}</span>}
              </td>
              <td className="py-2.5 pr-4">
                <ScoreBar score={r.trustScore} />
              </td>
              <td className="py-2.5 pr-4">
                <ScoreBar score={r.replyRate} suffix="%" />
              </td>
              <td className="py-2.5 pr-4 text-slate-600">
                {r.avgResponseHours !== null ? `${r.avgResponseHours}h` : "—"}
              </td>
              <td className="py-2.5 pr-4 text-slate-600">{r.wonCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
