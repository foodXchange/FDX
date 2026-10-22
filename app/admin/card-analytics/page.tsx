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
    { count: totalVcards },
    { count: totalWhatsapp },
    { count: totalEmails },
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
      .select("*", { count: "exact", head: true })
      .eq("event", "contact_card_vcard_download_clicked"),
    supabaseAdmin
      .from("card_views")
      .select("*", { count: "exact", head: true })
      .eq("event", "contact_card_whatsapp_clicked"),
    supabaseAdmin
      .from("card_views")
      .select("*", { count: "exact", head: true })
      .in("event", ["contact_card_email_clicked", "contact_card_email_sent"]),
    supabaseAdmin
      .from("card_views")
      .select("handle, persona, created_at")
      .eq("event", "view")
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("card_views")
      .select("handle, persona, event, referrer, created_at")
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const viewsCount = totalViews ?? 0;
  const vcardsCount = totalVcards ?? 0;
  const whatsappCount = totalWhatsapp ?? 0;
  const emailsCount = totalEmails ?? 0;
  const totalInteractions = vcardsCount + whatsappCount + emailsCount;
  const conversionRate = viewsCount > 0 ? ((totalInteractions / viewsCount) * 100).toFixed(1) : "0.0";

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
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">E-Business Card Analytics</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time telemetry and conversion performance for `/business-card/udi`
          </p>
        </div>
      </div>

      {/* ── Conversion Funnel KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Total Card Views
          </p>
          <p className="text-3xl font-black text-white">{viewsCount}</p>
          <p className="text-[11px] text-orange-400 mt-1">+{weekViews ?? 0} in last 7 days</p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            💾 VCard Downloads
          </p>
          <p className="text-3xl font-black text-emerald-400">{vcardsCount}</p>
          <p className="text-[11px] text-slate-500 mt-1">Saved to phone contacts</p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            💬 WhatsApp Leads
          </p>
          <p className="text-3xl font-black text-emerald-400">{whatsappCount}</p>
          <p className="text-[11px] text-slate-500 mt-1">Buyers &amp; Manufacturers</p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            ⚡ Overall Conversion
          </p>
          <p className="text-3xl font-black text-orange-400">{conversionRate}%</p>
          <p className="text-[11px] text-slate-500 mt-1">View-to-interaction rate</p>
        </div>
      </div>

      {/* ── Daily bar chart ── */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
          Daily views — last 7 days
        </p>
        <div className="flex items-end gap-2 h-24">
          {Object.entries(dailyCounts).map(([day, count]) => (
            <div key={day} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[10px] text-slate-400">{count > 0 ? count : ""}</span>
              <div
                className="w-full rounded-t bg-orange-500/80 hover:bg-orange-500 transition-colors"
                style={{ height: `${Math.max(4, (count / dailyMax) * 80)}px` }}
              />
              <span className="text-[9px] text-slate-500 font-mono">
                {day.slice(5)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── By handle + by persona ── */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
            By Handle
          </p>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-700">
              {Object.entries(handleCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([handle, count]) => (
                  <tr key={handle}>
                    <td className="py-2.5 text-slate-300 font-mono text-xs">/business-card/{handle}</td>
                    <td className="py-2.5 text-right text-white font-bold">{count}</td>
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
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
            By Target Audience Persona
          </p>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-700">
              {Object.entries(personaCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([persona, count]) => (
                  <tr key={persona}>
                    <td className="py-2.5 text-slate-300 capitalize text-xs">
                      {persona === "buyer" ? "🛒 Buyer Audience" : persona === "supplier" ? "🏭 Manufacturer Audience" : "Default / Direct"}
                    </td>
                    <td className="py-2.5 text-right text-white font-bold">{count}</td>
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
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
          Live Event Stream (Latest 30 Interactions)
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400 text-xs">
                <th className="text-left py-2 font-semibold pr-4">Handle</th>
                <th className="text-left py-2 font-semibold pr-4">Audience</th>
                <th className="text-left py-2 font-semibold pr-4">Event Type</th>
                <th className="text-left py-2 font-semibold pr-4">Referrer</th>
                <th className="text-left py-2 font-semibold">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {recentRows.map((row, i) => (
                <tr key={i} className="hover:bg-slate-700/30 transition-colors">
                  <td className="py-2.5 text-slate-300 font-mono pr-4 text-xs">/{row.handle}</td>
                  <td className="py-2.5 text-slate-300 pr-4 capitalize text-xs">
                    <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-[11px]">
                      {row.persona}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-xs font-semibold text-orange-400">
                    {row.event.replace(/^contact_card_/, "").replace(/_clicked$/, "")}
                  </td>
                  <td className="py-2.5 text-slate-500 pr-4 max-w-[160px] truncate text-xs font-mono">
                    {row.referrer ?? "direct"}
                  </td>
                  <td className="py-2.5 text-slate-400 text-xs whitespace-nowrap">
                    {new Date(row.created_at).toLocaleString("en-GB", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: "Asia/Jerusalem",
                    })}
                  </td>
                </tr>
              ))}
              {recentRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-500 text-xs">
                    No events recorded yet.
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
