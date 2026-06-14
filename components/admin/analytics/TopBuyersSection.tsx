import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { cardCls, timeAgo } from "./shared";

export async function TopBuyersSection() {
  const requestsResult = await supabaseAdmin
    .from("sourcing_requests")
    .select("buyer_id, created_at")
    .not("buyer_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(2000);

  const rows = (requestsResult.data ?? []) as { buyer_id: string; created_at: string }[];

  const grouped = new Map<string, { count: number; lastActivity: string }>();
  for (const r of rows) {
    const existing = grouped.get(r.buyer_id);
    if (existing) {
      existing.count += 1;
      if (r.created_at > existing.lastActivity) existing.lastActivity = r.created_at;
    } else {
      grouped.set(r.buyer_id, { count: 1, lastActivity: r.created_at });
    }
  }

  const top5 = Array.from(grouped.entries())
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 5);

  const buyerIds = top5.map(([id]) => id);

  const buyersResult =
    buyerIds.length > 0
      ? await supabaseAdmin.from("buyers").select("id, company_name, logo_url").in("id", buyerIds)
      : { data: [] as { id: string; company_name: string | null; logo_url: string | null }[] };

  const buyerMap = new Map((buyersResult.data ?? []).map((b) => [b.id, b]));

  const topBuyers = top5.map(([buyerId, stats]) => ({
    buyerId,
    companyName: buyerMap.get(buyerId)?.company_name ?? "Unknown buyer",
    logoUrl: buyerMap.get(buyerId)?.logo_url ?? null,
    count: stats.count,
    lastActivity: stats.lastActivity,
  }));

  return (
    <div className={`${cardCls} h-full`}>
      <h2 className="text-sm font-semibold text-gray-700 mb-4">Top buyers (by request count)</h2>
      {topBuyers.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">No buyer-linked requests yet</p>
      ) : (
        <div className="divide-y divide-gray-50">
          {topBuyers.map((b) => (
            <Link
              key={b.buyerId}
              href={`/admin/buyers/${b.buyerId}`}
              className="flex items-center gap-3 py-2.5 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition"
            >
              {b.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={b.logoUrl}
                  alt=""
                  className="w-7 h-7 rounded-full object-cover border border-gray-200 shrink-0"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-gray-100 shrink-0" />
              )}
              <span className="text-sm text-gray-700 truncate flex-1">{b.companyName}</span>
              <span className="text-xs font-semibold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full shrink-0">
                {b.count} requests
              </span>
              <span className="text-xs text-gray-400 shrink-0 w-16 text-right">
                {timeAgo(b.lastActivity)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
