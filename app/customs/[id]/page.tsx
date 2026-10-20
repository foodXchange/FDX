import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import CustomsBrokerPortal from "@/components/customs/CustomsBrokerPortal";
import type { CommercialOrderLifecycle } from "@/app/admin/requests/actions";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CustomsBrokerPortalPage({ params }: PageProps) {
  const { id: requestId } = await params;

  // 1. Fetch Sourcing Request
  const { data: req, error: reqErr } = await supabaseAdmin
    .from("sourcing_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();

  if (reqErr || !req) {
    notFound();
  }

  // 2. Fetch Awarded / Selected Supplier Match
  const { data: matches } = await supabaseAdmin
    .from("sourcing_matches")
    .select("id, supplier_id, company_name, product_name, country, match_score, status")
    .eq("request_id", requestId)
    .order("match_score", { ascending: false })
    .limit(3);

  const awardedMatch = matches?.find((m) => m.status === "approved" || m.status === "contacted") || matches?.[0];

  const ai = (req.ai_analysis ?? {}) as Record<string, unknown>;
  const orderWf = (ai.order_workflow as CommercialOrderLifecycle | null) ?? null;
  const customsSignoff = (ai.customs_clearance_signoff as Record<string, unknown> | null) ?? null;

  const supplierName =
    orderWf?.selected_supplier_name ||
    awardedMatch?.company_name ||
    "European Certified Food Producer";

  const supplierCountry =
    awardedMatch?.country ||
    "Spain / Italy (European Union)";

  const buyerCompany = req.company || "Retail Supermarket Chain Israel";
  const productName = orderWf?.agreed_product_name || req.product_name || "Food Product";
  const poNumber = orderWf?.po_number || `FDX-PO-${requestId.slice(0, 6).toUpperCase()}`;
  const poDate = orderWf?.po_date || req.created_at?.slice(0, 10);
  const orderVolume = orderWf?.order_volume || "24,000 Units (1 x 40ft HQ FCL)";

  const buyerWarehouseAddress =
    orderWf?.buyer_warehouse_address ||
    `${buyerCompany} מרלוג לוגיסטי מרכזי, פארק תעשיות שורק / ראשון לציון`;

  return (
    <CustomsBrokerPortal
      requestId={requestId}
      buyerCompany={buyerCompany}
      buyerContact={req.name || undefined}
      buyerPhone={req.phone || undefined}
      buyerEmail={req.email || undefined}
      buyerWarehouseAddress={buyerWarehouseAddress}
      supplierName={supplierName}
      supplierCountry={supplierCountry}
      productName={productName}
      orderVolume={orderVolume}
      containerCount={1}
      workflow={orderWf}
      poNumber={poNumber}
      poDate={poDate}
      customsSignoff={customsSignoff}
    />
  );
}
