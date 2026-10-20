import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { cleanRequestName } from "@/lib/matching/cleanRequestName";
import type {
  CommercialOrderLifecycle,
  FinancialClearanceLifecycle,
} from "@/app/admin/requests/actions";
import FactorySupplierPortal from "@/components/factory/FactorySupplierPortal";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const { data: req } = await supabaseAdmin
    .from("sourcing_requests")
    .select("product_name, company")
    .eq("id", id)
    .maybeSingle();

  if (!req) return { title: "European Manufacturer Export Portal | FoodXchange" };

  const name = cleanRequestName(req.product_name || "Food Product");
  return {
    title: `${name} · European Supplier Production & Dispatch Desk | FoodXchange`,
    description: "Export portal for European food manufacturers to track purchase orders, production milestones, and container loading proof.",
  };
}

export default async function FactoryPortalPage({ params }: PageProps) {
  const { id } = await params;

  // 1. Fetch Sourcing Request
  const { data: request, error: reqErr } = await supabaseAdmin
    .from("sourcing_requests")
    .select("id, product_name, volume_per_year, created_at, ai_analysis")
    .eq("id", id)
    .maybeSingle();

  if (reqErr || !request) {
    notFound();
  }

  // 2. Fetch Supplier Match
  const { data: matches } = await supabaseAdmin
    .from("sourcing_matches")
    .select("id, company_name, country, status, match_score")
    .eq("request_id", id)
    .order("match_score", { ascending: false })
    .limit(3);

  const approvedMatch = matches?.find((m) => m.status === "approved") || matches?.[0];

  const ai = (request.ai_analysis ?? {}) as Record<string, unknown>;
  const wf = (ai.order_workflow as CommercialOrderLifecycle | null) ?? null;
  const fc = (ai.financial_clearance as FinancialClearanceLifecycle | null) ?? wf?.financial_clearance ?? null;

  const productName = cleanRequestName(request.product_name || "Food Product");
  const poNumber = wf?.po_number || `PO-FDX-${id.slice(0, 8).toUpperCase()}`;
  const poDate = wf?.po_date || request.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10);

  const factoryName = wf?.selected_supplier_name || approvedMatch?.company_name || "Approved European Manufacturer";
  const factoryCountry = approvedMatch?.country || "Italy";

  // Isolate factory pricing: only factory contract cost, never buyer price or spreads!
  const factoryContractEur =
    fc?.factory_contract_cost ||
    (wf?.total_order_value ? Math.round(wf.total_order_value * 0.85) : 38800);

  const orderVolume = wf?.order_volume || request.volume_per_year || "1 x 40ft HC Container (24,000 units)";
  const palletCount = wf?.warehouse_pallet_count || 24;

  const factoryLoadingProof = (ai.factory_loading_proof as any) ?? null;

  return (
    <FactorySupplierPortal
      requestId={id}
      poNumber={poNumber}
      poDate={poDate}
      productName={productName}
      factoryName={factoryName}
      factoryCountry={factoryCountry}
      factoryContractEur={factoryContractEur}
      orderVolume={orderVolume}
      palletCount={palletCount}
      workflow={wf}
      factoryLoadingProof={factoryLoadingProof}
    />
  );
}
