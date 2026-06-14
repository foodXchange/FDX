import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { PipelineRow } from "./PipelineTable";
import PipelineBoard from "./PipelineBoard";
import DigestButton from "./DigestButton";

export default async function PipelinePage() {
  const { data: rawMatches } = await supabaseAdmin
    .from("sourcing_matches")
    .select(
      `id, request_id, supplier_id, status, match_score,
       product_name, company_name, country,
       approved_at, sent_at, responded_at, closed_at, sent_via,
       sourcing_requests!request_id(company, product_name, buyer_id)`
    )
    .order("match_score", { ascending: false })
    .limit(500);

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
    sourcing_requests: {
      company: string | null;
      product_name: string | null;
      buyer_id: string | null;
    } | null;
  };

  const allMatches: PipelineRow[] = ((rawMatches ?? []) as unknown as RawMatch[]).map((m) => ({
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
    buyer_company: m.sourcing_requests?.company ?? null,
    buyer_product: m.sourcing_requests?.product_name ?? null,
    buyer_id: m.sourcing_requests?.buyer_id ?? null,
  }));

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Sticky header */}
      <div className="border-b border-gray-200 bg-white px-6 py-3 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-semibold text-gray-800">Pipeline</span>
          <div className="ml-auto">
            <DigestButton />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <PipelineBoard rows={allMatches} />
      </div>
    </main>
  );
}
