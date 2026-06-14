import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { calculateTrustScore } from "@/lib/suppliers/trustScore";
import { getSupplierWeeklyReplyRates } from "@/lib/metrics/qaMetrics";
import MatchPipelineBadge from "@/components/matches/MatchPipelineBadge";
import ScoreBar from "@/components/admin/qa-metrics/ScoreBar";
import WeeklyReplyBars from "@/components/admin/qa-metrics/WeeklyReplyBars";

export const revalidate = 0;

type Params = Promise<{ id: string }>;

type MatchRow = {
  id: string;
  product_name: string | null;
  status: string | null;
  supplier_response: string | null;
  sent_at: string | null;
  supplier_responded_at: string | null;
  closed_at: string | null;
  sourcing_requests: { company: string | null; product_name: string | null } | null;
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default async function SupplierDrilldownPage({ params }: { params: Params }) {
  const { id } = await params;

  const [supplierResult, matchesResult, trustScoreBreakdown, weeklyRates] = await Promise.all([
    supabaseAdmin
      .from("supplier_offerings")
      .select("id, company_name, country_of_origin, trust_score")
      .eq("id", id)
      .single(),
    supabaseAdmin
      .from("sourcing_matches")
      .select(
        "id, product_name, status, supplier_response, sent_at, supplier_responded_at, closed_at, sourcing_requests(company, product_name)"
      )
      .eq("supplier_id", id)
      .order("sent_at", { ascending: false }),
    calculateTrustScore(id),
    getSupplierWeeklyReplyRates(id),
  ]);

  if (!supplierResult.data) return notFound();

  const supplier = supplierResult.data;
  const matches = (matchesResult.data ?? []) as unknown as MatchRow[];

  return (
    <main className="bg-slate-50 min-h-screen py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <Link href="/en/admin/qa-metrics" className="text-sm text-slate-400 hover:text-slate-600 transition">
          ← QA Metrics
        </Link>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 mt-3">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">{supplier.company_name}</h1>
              {supplier.country_of_origin && (
                <p className="text-sm text-slate-500 mt-0.5">{supplier.country_of_origin}</p>
              )}
            </div>
            <Link
              href={`/admin/suppliers/${id}`}
              className="text-xs font-medium text-orange-600 hover:text-orange-700"
            >
              Edit supplier →
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-5">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Trust score</p>
              <ScoreBar score={trustScoreBreakdown.total} />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Profile</p>
              <p className="text-sm font-semibold text-slate-800">{trustScoreBreakdown.profile}/25</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Verification</p>
              <p className="text-sm font-semibold text-slate-800">{trustScoreBreakdown.verification}/25</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Activity</p>
              <p className="text-sm font-semibold text-slate-800">{trustScoreBreakdown.activity}/25</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Deals</p>
              <p className="text-sm font-semibold text-slate-800">{trustScoreBreakdown.deals}/25</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 mt-6">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">
            Reply Rate — Last 8 Weeks
          </h2>
          <WeeklyReplyBars weeks={weeklyRates} />
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 mt-6">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">Match History</h2>
          {matches.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No matches yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 uppercase tracking-wide border-b border-slate-100">
                    <th className="py-2 pr-4 font-medium">Product</th>
                    <th className="py-2 pr-4 font-medium">Buyer</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 pr-4 font-medium">Sent</th>
                    <th className="py-2 pr-4 font-medium">Responded</th>
                    <th className="py-2 pr-4 font-medium">Closed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {matches.map((m) => (
                    <tr key={m.id}>
                      <td className="py-2.5 pr-4 text-slate-800">
                        {m.product_name ?? m.sourcing_requests?.product_name ?? "—"}
                      </td>
                      <td className="py-2.5 pr-4 text-slate-600">{m.sourcing_requests?.company ?? "—"}</td>
                      <td className="py-2.5 pr-4">
                        <MatchPipelineBadge match={m} />
                      </td>
                      <td className="py-2.5 pr-4 text-xs text-slate-500">{formatDate(m.sent_at)}</td>
                      <td className="py-2.5 pr-4 text-xs text-slate-500">{formatDate(m.supplier_responded_at)}</td>
                      <td className="py-2.5 pr-4 text-xs text-slate-500">{formatDate(m.closed_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
