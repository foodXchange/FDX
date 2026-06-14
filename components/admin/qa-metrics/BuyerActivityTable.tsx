import Link from "next/link";
import { relativeTime } from "@/lib/format/relativeTime";
import type { BuyerActivityRow } from "@/lib/metrics/qaMetrics";

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  one_time: "One-time",
  stalled: "Stalled",
};

const STATUS_COLOR: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  one_time: "bg-slate-100 text-slate-600",
  stalled: "bg-red-100 text-red-700",
};

export default function BuyerActivityTable({ rows }: { rows: BuyerActivityRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-slate-400 text-center py-8">No buyer activity yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-slate-500 uppercase tracking-wide border-b border-slate-100">
            <th className="py-2 pr-4 font-medium">Buyer</th>
            <th className="py-2 pr-4 font-medium">Requests</th>
            <th className="py-2 pr-4 font-medium">Matches received</th>
            <th className="py-2 pr-4 font-medium">Last request</th>
            <th className="py-2 pr-4 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="py-2.5 pr-4">
                <Link
                  href={`/en/admin/qa-metrics/buyers/${r.id}`}
                  className="font-medium text-slate-800 hover:text-orange-600 transition"
                >
                  {r.name || r.company || r.email}
                </Link>
              </td>
              <td className="py-2.5 pr-4 text-slate-600">{r.requestCount}</td>
              <td className="py-2.5 pr-4 text-slate-600">{r.matchesReceived}</td>
              <td className="py-2.5 pr-4 text-xs text-slate-500">{relativeTime(r.lastRequestAt)}</td>
              <td className="py-2.5 pr-4">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[r.status]}`}>
                  {STATUS_LABEL[r.status]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
