import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { cardCls, RequestStatusBadge } from "./shared";

type RequestRow = {
  id: string;
  name: string | null;
  company: string | null;
  product_name: string | null;
  category: string | null;
  status: string | null;
  created_at: string;
};

export async function RecentRequestsSection() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

  const requestsResult = await supabaseAdmin
    .from("sourcing_requests")
    .select("id, name, company, product_name, category, status, created_at")
    .gte("created_at", sevenDaysAgo)
    .order("created_at", { ascending: false })
    .limit(10);

  const requests = (requestsResult.data ?? []) as RequestRow[];
  const ids = requests.map((r) => r.id);

  const matchDataResult =
    ids.length > 0
      ? await supabaseAdmin
          .from("sourcing_matches")
          .select("request_id, match_score")
          .in("request_id", ids)
          .neq("status", "rejected")
      : { data: [] as { request_id: string; match_score: number }[] };

  const matchCountMap = new Map<string, number>();
  const bestScoreMap = new Map<string, number>();
  for (const m of matchDataResult.data ?? []) {
    matchCountMap.set(m.request_id, (matchCountMap.get(m.request_id) ?? 0) + 1);
    const current = bestScoreMap.get(m.request_id) ?? 0;
    if (m.match_score > current) bestScoreMap.set(m.request_id, m.match_score);
  }

  return (
    <div className={cardCls}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-700">Recent requests (last 7 days)</h2>
        <Link
          href="/admin/requests"
          className="text-xs text-orange-600 hover:text-orange-700 font-medium"
        >
          View all →
        </Link>
      </div>
      {requests.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">No requests in the last 7 days</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 uppercase tracking-wide">
                <th className="py-2 pr-3 font-medium">Date</th>
                <th className="py-2 pr-3 font-medium">Buyer</th>
                <th className="py-2 pr-3 font-medium">Product</th>
                <th className="py-2 pr-3 font-medium">Category</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 pr-3 font-medium text-right">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {requests.map((r) => {
                const matchCount = matchCountMap.get(r.id) ?? 0;
                const bestScore = bestScoreMap.get(r.id) ?? null;
                const noMatches = matchCount === 0;
                return (
                  <tr
                    key={r.id}
                    className={noMatches ? "bg-orange-50 border-l-2 border-orange-400" : ""}
                  >
                    <td className="py-2 pr-3 text-gray-500 whitespace-nowrap">
                      {new Date(r.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="py-2 pr-3 text-gray-700 truncate max-w-[140px]">
                      {r.company ?? r.name ?? "—"}
                    </td>
                    <td className="py-2 pr-3 text-gray-700 truncate max-w-[160px]">
                      {r.product_name ?? "—"}
                    </td>
                    <td className="py-2 pr-3 text-gray-500 truncate max-w-[140px]">
                      {r.category ?? "—"}
                    </td>
                    <td className="py-2 pr-3">
                      <RequestStatusBadge status={r.status} />
                    </td>
                    <td className="py-2 pr-3 text-right text-gray-700">
                      {bestScore !== null ? `${bestScore}%` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
