import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const revalidate = 0;

interface UsageLogRow {
  id: number;
  created_at: string;
  provider: string;
  model?: string | null;
  feature?: string | null;
  key_alias?: string | null;
  input_tokens?: number | null;
  output_tokens?: number | null;
  units?: number | null;
  cost_usd?: number | null;
  latency_ms?: number | null;
  ok?: boolean;
  error?: string | null;
  request_id?: string | null;
}

export default async function ApiUsageSettingsPage() {
  const { data: rawLogs, error } = await supabaseAdmin
    .from("api_usage_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(150);

  const logs = (rawLogs ?? []) as UsageLogRow[];

  // Aggregates
  const totalCalls = logs.length;
  const totalCost = logs.reduce((acc, row) => acc + Number(row.cost_usd || 0), 0);
  const totalInputTokens = logs.reduce((acc, row) => acc + Number(row.input_tokens || 0), 0);
  const totalOutputTokens = logs.reduce((acc, row) => acc + Number(row.output_tokens || 0), 0);
  const avgLatency =
    totalCalls > 0
      ? Math.round(logs.reduce((acc, row) => acc + Number(row.latency_ms || 0), 0) / totalCalls)
      : 0;

  // Breakdown by provider
  const providerStats: Record<string, { count: number; cost: number; tokens: number }> = {};
  for (const log of logs) {
    const p = log.provider || "other";
    if (!providerStats[p]) {
      providerStats[p] = { count: 0, cost: 0, tokens: 0 };
    }
    providerStats[p].count += 1;
    providerStats[p].cost += Number(log.cost_usd || 0);
    providerStats[p].tokens += Number(log.input_tokens || 0) + Number(log.output_tokens || 0);
  }

  // Key Status checks
  const geminiConfigured = Boolean(process.env.GEMINI_API_KEY);
  const resendConfigured = Boolean(process.env.RESEND_API_KEY);
  const voyageConfigured = Boolean(process.env.VOYAGE_API_KEY);
  const supabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

  return (
    <main className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">API Usage & Infrastructure Costs</h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Live Metering
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Real-time token tracking, operational cost estimations, and third-party API service plans.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/requests"
            className="text-xs font-semibold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 px-3 py-1.5 rounded-lg transition"
          >
            ← Sourcing Deal Desk
          </Link>
          <Link
            href="/admin/settings/trash"
            className="text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg transition"
          >
            Trash & Archive
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
          ⚠️ Could not load usage log: {error.message}
        </div>
      )}

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Estimated Spend
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            ${totalCost.toFixed(4)}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">
            Calculated across recent operations
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Logged Calls
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {totalCalls.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">
            Vision, Briefs, Embeddings, Emails
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Tokens Processed
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {(totalInputTokens + totalOutputTokens).toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">
            {totalInputTokens.toLocaleString()} in &middot; {totalOutputTokens.toLocaleString()} out
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Average Latency
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {avgLatency} <span className="text-sm font-semibold text-slate-500">ms</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">
            End-to-end response time
          </span>
        </div>
      </div>

      {/* Infrastructure Services & Registered Plans */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Connected API Services & Registered Tiers
          </h2>
          <span className="text-[11px] text-slate-400">Zero Build Minutes Shield active</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Gemini */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <span>🤖</span> Google Gemini
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${geminiConfigured ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
                {geminiConfigured ? "Connected" : "Missing Key"}
              </span>
            </div>
            <div className="text-[11px] text-slate-600 space-y-0.5">
              <div><strong>Plan:</strong> Pay-as-you-go (Blaze)</div>
              <div><strong>Models:</strong> Gemini 2.5 Flash / 1.5 Flash</div>
              <div><strong>Pricing:</strong> $0.075 / 1M in &middot; $0.30 / 1M out</div>
              <div><strong>Usage:</strong> {providerStats.gemini?.count || 0} calls (${(providerStats.gemini?.cost || 0).toFixed(4)})</div>
            </div>
          </div>

          {/* Resend */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <span>✉️</span> Resend Email
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${resendConfigured ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
                {resendConfigured ? "Connected" : "Missing Key"}
              </span>
            </div>
            <div className="text-[11px] text-slate-600 space-y-0.5">
              <div><strong>Plan:</strong> Free / Pro Tier</div>
              <div><strong>Domain:</strong> fdx.trading (Verified)</div>
              <div><strong>Quotas:</strong> 3,000 emails/mo (100/day)</div>
              <div><strong>Usage:</strong> {providerStats.resend?.count || 0} sent emails</div>
            </div>
          </div>

          {/* Voyage AI */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <span>🧭</span> Voyage AI
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${voyageConfigured ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"}`}>
                {voyageConfigured ? "Connected" : "Optional"}
              </span>
            </div>
            <div className="text-[11px] text-slate-600 space-y-0.5">
              <div><strong>Plan:</strong> Pay-as-you-go Tier 1</div>
              <div><strong>Model:</strong> voyage-multilingual-2</div>
              <div><strong>Pricing:</strong> $0.12 / 1M tokens</div>
              <div><strong>Usage:</strong> {providerStats.voyage?.count || 0} vectors (${(providerStats.voyage?.cost || 0).toFixed(4)})</div>
            </div>
          </div>

          {/* Supabase */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <span>⚡</span> Supabase DB
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${supabaseConfigured ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
                {supabaseConfigured ? "Connected" : "Not Set"}
              </span>
            </div>
            <div className="text-[11px] text-slate-600 space-y-0.5">
              <div><strong>Plan:</strong> Pro Tier (Linked)</div>
              <div><strong>Features:</strong> pgvector &middot; RLS &middot; Storage</div>
              <div><strong>Region:</strong> eu-central-1 (Frankfurt)</div>
              <div><strong>Project:</strong> orzfgccllmkmhzkfswha</div>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Activity Log Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Recent API Invocations
            </h2>
            <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full">
              {logs.length} logged events
            </span>
          </div>
          <span className="text-[11px] text-slate-400">Auto-logged from server actions</span>
        </div>

        {logs.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No API activity logged yet. Operations from Deal Desk Vision, brief synthesis, and confirmation emails will appear here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-slate-100">
              <thead className="bg-slate-50 text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3.5">Time</th>
                  <th className="py-2.5 px-3">Provider & Model</th>
                  <th className="py-2.5 px-3">Feature</th>
                  <th className="py-2.5 px-3 text-right">Tokens / Units</th>
                  <th className="py-2.5 px-3 text-right">Latency</th>
                  <th className="py-2.5 px-3 text-right">Est. Cost</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {logs.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-2.5 px-3.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(row.created_at).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="font-bold text-slate-900 capitalize">{row.provider}</span>
                      {row.model && (
                        <span className="text-[10px] text-slate-400 block font-mono">
                          {row.model}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                      {row.feature || "generic"}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-[11px]">
                      {row.input_tokens != null ? (
                        <span>
                          {row.input_tokens} in / {row.output_tokens || 0} out
                        </span>
                      ) : row.units != null ? (
                        <span>{row.units} unit</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-[11px] text-slate-500">
                      {row.latency_ms ? `${row.latency_ms}ms` : "—"}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-[11px] font-semibold text-emerald-700">
                      {row.cost_usd ? `$${Number(row.cost_usd).toFixed(5)}` : "$0.000"}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {row.ok !== false ? (
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          ✓ OK
                        </span>
                      ) : (
                        <span
                          className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 cursor-help"
                          title={row.error || "Error"}
                        >
                          ⚠️ Fail
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
