import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { CommercialOrderLifecycle } from "@/app/admin/requests/actions";
import type { CustomsBrokerPortalProps } from "@/components/customs/CustomsBrokerPortal";

export async function getCustomsPortalData(
  requestId: string
): Promise<CustomsBrokerPortalProps | null> {
  // 1. Fetch Sourcing Request
  const { data: req, error: reqErr } = await supabaseAdmin
    .from("sourcing_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();

  // If not found in DB, check if it's a sample/demo request or fallback for showcase
  if (reqErr || !req) {
    if (
      requestId.startsWith("sample-") ||
      requestId.startsWith("demo-") ||
      requestId === "demo" ||
      requestId === "sample-deal-1"
    ) {
      return {
        requestId,
        buyerCompany: "שופרסל בע״מ (Shufersal Retail Supermarkets)",
        buyerContact: "אורן שחר - מנהל תחום יבוא ומותג פרטי (Oren Shahar)",
        buyerPhone: "+972-54-9218840",
        buyerEmail: "customs-import@shufersal.co.il",
        buyerWarehouseAddress: "מרלוג שופרסל מרכזי, פארק תעשיות מודיעין / שורק",
        supplierName: "Aceites del Sur Foods S.A.",
        supplierCountry: "Spain (European Union)",
        productName: "שמן זית כתית מעולה 1 ליטר (Extra Virgin Olive Oil 1L)",
        orderVolume: "24,000 בקבוקים (24 משטחי EPAL / מכולה 40ft HQ)",
        containerCount: 1,
        poNumber: `FDX-PO-${requestId.slice(0, 6).toUpperCase()}`,
        poDate: new Date().toISOString().slice(0, 10),
        workflow: {
          current_stage: "customs_warehouse",
          customs_status: "customs_broker_clearing",
          container_number: "MSKU-9481029",
          bill_of_lading: "MSCUVAL881920",
          vessel_name: "MSC LEANNE / Voyage 2604E",
          shipping_line: "MSC (Mediterranean Shipping Company)",
          port_of_destination: "נמל אשדוד (רציף 21)",
          eta_port: "בעגינה / בטיפול רציף 21",
          selected_supplier_name: "Aceites del Sur Foods S.A.",
          agreed_product_name: "שמן זית כתית מעולה חומציות 0.3% (1 ליטר)",
          order_volume: "24,000 בקבוקים (24 משטחי EPAL)",
          buyer_warehouse_address: "מרלוג שופרסל מרכזי, פארק תעשיות מודיעין / שורק",
          po_number: `FDX-PO-${requestId.slice(0, 6).toUpperCase()}`,
          po_date: new Date().toISOString().slice(0, 10),
        },
        customsSignoff: null,
      };
    }
    return null;
  }

  // 2. Fetch Awarded / Selected Supplier Match
  const { data: matches } = await supabaseAdmin
    .from("sourcing_matches")
    .select("id, supplier_id, company_name, product_name, country, match_score, status")
    .eq("request_id", requestId)
    .order("match_score", { ascending: false })
    .limit(3);

  const awardedMatch =
    matches?.find((m) => m.status === "approved" || m.status === "contacted") ||
    matches?.[0];

  const ai = (req.ai_analysis ?? {}) as Record<string, unknown>;
  const orderWf = (ai.order_workflow as CommercialOrderLifecycle | null) ?? null;
  const customsSignoff =
    (ai.customs_clearance_signoff as Record<string, unknown> | null) ?? null;

  const supplierName =
    orderWf?.selected_supplier_name ||
    awardedMatch?.company_name ||
    "European Certified Food Producer";

  const supplierCountry =
    awardedMatch?.country || "Spain / Italy (European Union)";

  const buyerCompany = req.company || "Retail Supermarket Chain Israel";
  const productName =
    orderWf?.agreed_product_name || req.product_name || "Food Product";
  const poNumber =
    orderWf?.po_number || `FDX-PO-${requestId.slice(0, 6).toUpperCase()}`;
  const poDate = orderWf?.po_date || req.created_at?.slice(0, 10);
  const orderVolume =
    orderWf?.order_volume || "24,000 Units (1 x 40ft HQ FCL)";

  const buyerWarehouseAddress =
    orderWf?.buyer_warehouse_address ||
    `${buyerCompany} מרלוג לוגיסטי מרכזי, פארק תעשיות שורק / ראשון לציון`;

  return {
    requestId,
    buyerCompany,
    buyerContact: req.name || undefined,
    buyerPhone: req.phone || undefined,
    buyerEmail: req.email || undefined,
    buyerWarehouseAddress,
    supplierName,
    supplierCountry,
    productName,
    orderVolume,
    containerCount: 1,
    workflow: orderWf,
    poNumber,
    poDate,
    customsSignoff: customsSignoff as CustomsBrokerPortalProps["customsSignoff"],
  };
}
