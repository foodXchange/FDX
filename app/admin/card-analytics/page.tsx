import type { Metadata } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const metadata: Metadata = {
  title: "Card Analytics | Admin",
};

interface CardViewRow {
  handle: string;
  persona: string;
  event: string;
  referrer: string | null;
  created_at: string;
}

export default async function CardAnalyticsPage() {
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: totalViews },
    { count: weekViews },
    { data: allViews },
    { data: recent },
  ] = await Promise.all([
    supabaseAdmin
      .from("card_views")
      .select("*", { count: "exact", head: true })
      .eq("event", "view"),
    supabaseAdmin
      .from("card_views")
      .select("*", { count: "exact", head: true })
      .eq("event", "view")
      .gte("created_at", since7d),
    supabaseAdmin
      .from("card_views")
      .select("handle, persona, created_at")
      .eq("event", "view")
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("card_views")
      .select("handle, persona, event, referrer, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  // Views by handle
  const handleCounts: Record<string, number> = {};
  for (const row of (allViews ?? []) as { handle: string }[]) {
    handleCounts[row.handle] = (handleCounts[row.handle] ?? 0) + 1;
  }

  // Views by persona
  const personaCounts: Record<string, number> = {};
  for (const row of (allViews ?? []) as { persona: string }[]) {
    personaCounts[row.persona] = (personaCounts[row.persona] ?? 0) + 1;
  }

  // Daily views for the last 7 days
  const dailyCounts: Record<string, number> = {};
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dailyCounts[d.toISOString().slice(0, 10)] = 0;
  }
  for (const row of (allViews ?? []) as { created_at: string }[]) {
    const day = row.created_at.slice(0, 10);
    if (day in dailyCounts) dailyCounts[day]++;
  }
  const dailyMax = Math.max(1, ...Object.values(dailyCounts));

  const recentRows = (recent ?? []) as CardViewRow[];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <h1 className="text-2xl font-semibold text-white">Card Analytics</h1>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">
            All-time views
          </p>
          <p className="text-4xl font-black text-white">{totalViews ?? 0}</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">
            Last 7 days
          </p>
          <p className="text-4xl font-black text-orange-400">{weekViews ?? 0}</p>
        </div>
      </div>

      {/* ── Daily bar chart ── */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">
          Daily views — last 7 days
        </p>
        <div className="flex items-end gap-2 h-24">
          {Object.entries(dailyCounts).map(([day, count]) => (
            <div key={day} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[10px] text-slate-500">{count > 0 ? count : ""}</span>
              <div
                className="w-full rounded-t bg-orange-500/70"
                style={{ height: `${Math.max(4, (count / dailyMax) * 80)}px` }}
              />
              <span className="text-[9px] text-slate-600">
                {day.slice(5)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── By handle + by persona ── */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">
            By handle
          </p>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-700">
              {Object.entries(handleCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([handle, count]) => (
                  <tr key={handle}>
                    <td className="py-2 text-slate-300 font-mono">/c/{handle}</td>
                    <td className="py-2 text-right text-white font-semibold">{count}</td>
                  </tr>
                ))}
              {Object.keys(handleCounts).length === 0 && (
                <tr>
                  <td colSpan={2} className="py-4 text-center text-slate-500 text-xs">
                    No data yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">
            By persona
          </p>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-700">
              {Object.entries(personaCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([persona, count]) => (
                  <tr key={persona}>
                    <td className="py-2 text-slate-300 capitalize">{persona}</td>
                    <td className="py-2 text-right text-white font-semibold">{count}</td>
                  </tr>
                ))}
              {Object.keys(personaCounts).length === 0 && (
                <tr>
                  <td colSpan={2} className="py-4 text-center text-slate-500 text-xs">
                    No data yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Recent events ── */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">
          Recent events (last 20)
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-2 text-xs text-slate-500 font-semibold pr-4">Handle</th>
                <th className="text-left py-2 text-xs text-slate-500 font-semibold pr-4">Persona</th>
                <th className="text-left py-2 text-xs text-slate-500 font-semibold pr-4">Event</th>
                <th className="text-left py-2 text-xs text-slate-500 font-semibold pr-4">Referrer</th>
                <th className="text-left py-2 text-xs text-slate-500 font-semibold">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {recentRows.map((row, i) => (
                <tr key={i}>
                  <td className="py-2 text-slate-300 font-mono pr-4">{row.handle}</td>
                  <td className="py-2 text-slate-400 pr-4 capitalize">{row.persona}</td>
                  <td className="py-2 text-slate-400 pr-4">{row.event}</td>
                  <td className="py-2 text-slate-500 pr-4 max-w-[160px] truncate text-xs">
                    {row.referrer ?? "—"}
                  </td>
                  <td className="py-2 text-slate-500 text-xs whitespace-nowrap">
                    {new Date(row.created_at).toLocaleString("en-IL", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                </tr>
              ))}
              {recentRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-500 text-xs">
                    No events recorded yet. Run the Supabase SQL to create the table first.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
