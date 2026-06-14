import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { cardCls } from "./shared";

export async function TodaySummaryBar() {
  const now = new Date();
  const startOfTodayUTC = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  ).toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

  const [newRequestsResult, pendingMatchesResult, newSuppliersResult, openDealsResult] =
    await Promise.all([
      supabaseAdmin
        .from("sourcing_requests")
        .select("id", { count: "exact", head: true })
        .gte("created_at", startOfTodayUTC),
      supabaseAdmin
        .from("sourcing_matches")
        .select("id", { count: "exact", head: true })
        .in("status", ["suggested", "pending"]),
      supabaseAdmin
        .from("supplier_offerings")
        .select("id", { count: "exact", head: true })
        .gte("created_at", sevenDaysAgo),
      supabaseAdmin
        .from("sourcing_requests")
        .select("id", { count: "exact", head: true })
        .neq("status", "closed"),
    ]);

  const stats = [
    { label: "New requests today", value: newRequestsResult.count ?? 0, color: "text-orange-500" },
    { label: "Matches pending review", value: pendingMatchesResult.count ?? 0, color: "text-blue-600" },
    { label: "Suppliers added this week", value: newSuppliersResult.count ?? 0, color: "text-green-600" },
    { label: "Open deals", value: openDealsResult.count ?? 0, color: "text-slate-700" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s) => (
        <div key={s.label} className={cardCls}>
          <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-1">
            {s.label}
          </p>
        </div>
      ))}
    </div>
  );
}
