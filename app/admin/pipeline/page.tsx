import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { PipelineRow } from "./PipelineTable";
import PipelineBoard from "./PipelineBoard";
import DigestButton from "./DigestButton";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const [
    rawMatchesResult,
    totalMatchesCountResult,
    highScoreCountResult,
    activeOutreachCountResult,
    totalRequestsCountResult,
  ] = await Promise.all([
    // Top 1,000 matches with rich relation data
    supabaseAdmin
      .from("sourcing_matches")
      .select(
        `id, request_id, supplier_id, status, match_score,
         product_name, company_name, country,
         approved_at, sent_at, responded_at, closed_at, sent_via,
         response_note, whatsapp_message, match_summary,
         sourcing_requests!request_id(company, product_name, buyer_id)`
      )
      .order("match_score", { ascending: false })
      .limit(1000),

    // Total matches in pipeline
    supabaseAdmin
      .from("sourcing_matches")
      .select("id", { count: "exact", head: true }),

    // High score matches (>= 80)
    supabaseAdmin
      .from("sourcing_matches")
      .select("id", { count: "exact", head: true })
      .gte("match_score", 80),

    // Active outreach (sent or responded)
    supabaseAdmin
      .from("sourcing_matches")
      .select("id", { count: "exact", head: true })
      .in("status", ["sent", "responded"]),

    // Total active buyer sourcing requests
    supabaseAdmin
      .from("sourcing_requests")
      .select("id", { count: "exact", head: true }),
  ]);

  type RawMatch = {
    id: string;
    request_id: string;
    supplier_id: string;
    status: string;
    match_score: number;
    product_name: string;
    company_name: string;
    country: string | null;
    approved_at: string | null;
    sent_at: string | null;
    responded_at: string | null;
    closed_at: string | null;
    sent_via: string | null;
    response_note: string | null;
    whatsapp_message: string | null;
    match_summary: string | null;
    sourcing_requests: {
      company: string | null;
      product_name: string | null;
      buyer_id: string | null;
    } | null;
  };

  const rawMatches = rawMatchesResult.data ?? [];
  const totalMatchesCount = totalMatchesCountResult.count ?? rawMatches.length;
  const highScoreCount = highScoreCountResult.count ?? 0;
  const activeOutreachCount = activeOutreachCountResult.count ?? 0;
  const totalRequestsCount = totalRequestsCountResult.count ?? 0;

  const allMatches: PipelineRow[] = ((rawMatches as unknown as RawMatch[]) ?? []).map((m) => ({
    id: m.id,
    request_id: m.request_id,
    supplier_id: m.supplier_id,
    status: m.status,
    match_score: m.match_score,
    product_name: m.product_name,
    company_name: m.company_name,
    country: m.country,
    approved_at: m.approved_at,
    sent_at: m.sent_at,
    responded_at: m.responded_at,
    closed_at: m.closed_at,
    sent_via: m.sent_via,
    response_note: m.response_note,
    whatsapp_message: m.whatsapp_message,
    match_summary: m.match_summary,
    buyer_company: m.sourcing_requests?.company ?? null,
    buyer_product: m.sourcing_requests?.product_name ?? null,
    buyer_id: m.sourcing_requests?.buyer_id ?? null,
  }));

  return (
    <main className="min-h-screen bg-gray-50/60 pb-16">
      {/* Top Header & Metrics Bar */}
      <div className="border-b border-gray-200 bg-white shadow-xs">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold tracking-wider text-orange-600 uppercase bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                  Deal Workflow
                </span>
                <span className="text-xs text-gray-400">Match Qualification & Outreach</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mt-1">Sourcing Deal Pipeline</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Review algorithmically matched deals, approve proposals, dispatch WhatsApp/Email outreach, and close deals.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <DigestButton />
            </div>
          </div>

          {/* 4 Pipeline Performance Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            {/* Card 1: Total Deals */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">Total Deals in Pipeline</span>
                <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  Global
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-gray-900">
                  {totalMatchesCount.toLocaleString()}
                </span>
                <span className="text-xs text-gray-400">matches</span>
              </div>
              <p className="mt-2 text-[11px] text-gray-500">
                Generated from active buyer criteria
              </p>
            </div>

            {/* Card 2: High Match Priority */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">High-Score Deals (≥80%)</span>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Top Priority
                </span>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-extrabold text-emerald-900">
                  {highScoreCount.toLocaleString()}
                </span>
              </div>
              <p className="mt-2 text-[11px] text-gray-500">
                Strong product, kosher & origin alignment
              </p>
            </div>

            {/* Card 3: Active Outreach */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">Active Outreach Deals</span>
                <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  In Progress
                </span>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-extrabold text-amber-900">
                  {activeOutreachCount.toLocaleString()}
                </span>
              </div>
              <p className="mt-2 text-[11px] text-gray-500">
                Outreach sent or awaiting response
              </p>
            </div>

            {/* Card 4: Buyer Requests Active */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">Active Buyer Requests</span>
                <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                  Demand Side
                </span>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-extrabold text-purple-900">
                  {totalRequestsCount.toLocaleString()}
                </span>
              </div>
              <p className="mt-2 text-[11px] text-gray-500">
                Active sourcing requests in database
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Board Container */}
      <div className="max-w-7xl mx-auto p-6">
        <PipelineBoard rows={allMatches} totalPipelineDeals={totalMatchesCount} />
      </div>
    </main>
  );
}
