import { supabaseAdmin } from "@/lib/supabaseAdmin";
import FinanceTreasuryDashboard, {
  type DealFinancialRecord,
  type TreasuryMetrics,
} from "@/components/admin/finance/FinanceTreasuryDashboard";

export const dynamic = "force-dynamic";

export default async function AdminFinancePage() {
  // 1. Fetch sourcing requests
  const { data: requests, error: reqErr } = await supabaseAdmin
    .from("sourcing_requests")
    .select(`
      id,
      company,
      name,
      email,
      phone,
      product_name,
      category,
      created_at,
      ai_analysis,
      matches:sourcing_matches(
        id,
        supplier_id,
        company_name,
        product_name,
        status,
        match_breakdown,
        supplier:supplier_offerings(country_of_origin, contact_email, contact_phone)
      )
    `)
    .order("created_at", { ascending: false });

  if (reqErr) {
    console.error("AdminFinancePage fetch error:", reqErr);
  }

  const allRequests = requests || [];

  // 2. Build DealFinancialRecord list
  const deals: DealFinancialRecord[] = [];

  for (const req of allRequests) {
    const ai = (req.ai_analysis as Record<string, unknown> | null) ?? {};
    const ow = (ai.order_workflow as Record<string, unknown> | null) ?? null;

    // We only process requests that have active commercial workflows
    if (!ow && !req.product_name) continue;

    const matchesList = Array.isArray(req.matches) ? req.matches : [];
    const awardedMatch =
      matchesList.find(
        (m: any) =>
          m.match_breakdown?.order_awarded ||
          m.status === "approved" ||
          m.company_name === ow?.selected_supplier_name
      ) || matchesList[0];

    const supplierObj = Array.isArray(awardedMatch?.supplier)
      ? awardedMatch.supplier[0]
      : awardedMatch?.supplier;

    const fc = (ow?.financial_clearance as Record<string, unknown> | null) ?? {};
    const adv30 = (fc.advance_milestone_30 as Record<string, unknown> | null) ?? {};
    const bal70 = (fc.balance_milestone_70 as Record<string, unknown> | null) ?? {};

    const totalUnits = Number(fc.total_units) || 24000;
    const buyerUnitPrice = Number(fc.buyer_unit_price) || Number(ow?.agreed_unit_price) || 1.85;
    const factoryUnitPrice = Number(fc.factory_unit_price) || 1.75;
    const agentMarginUnit =
      Number(fc.agent_margin_per_unit) || Math.max(0, buyerUnitPrice - factoryUnitPrice);

    const grossVal =
      Number(fc.gross_buyer_contract_value) ||
      Number(ow?.total_order_value) ||
      Math.round(totalUnits * buyerUnitPrice);

    const factoryCost =
      Number(fc.factory_contract_cost) || Math.round(totalUnits * factoryUnitPrice);

    const agentPool =
      Number(fc.total_agent_brokerage_pool) || (grossVal - factoryCost);

    const advBuyer = Number(adv30.buyer_wire_amount) || Math.round(grossVal * 0.3);
    const advFactory = Number(adv30.factory_wire_amount) || Math.round(factoryCost * 0.3);
    const advAgent = Number(adv30.agent_retained_fee) || Math.round(agentPool * 0.3);

    const balBuyer = Number(bal70.buyer_wire_amount) || Math.round(grossVal * 0.7);
    const balFactory = Number(bal70.factory_wire_amount) || Math.round(factoryCost * 0.7);
    const balAgent = Number(bal70.agent_retained_fee) || Math.round(agentPool * 0.7);

    const poNumber =
      (ow?.po_number as string) ||
      (awardedMatch?.match_breakdown?.order_awarded?.po_number as string) ||
      `FDX-PO-${req.id.slice(0, 6).toUpperCase()}`;

    const poDate =
      (ow?.po_date as string) ||
      (awardedMatch?.match_breakdown?.order_awarded?.awarded_at as string)?.slice(0, 10) ||
      req.created_at.slice(0, 10);

    const deal: DealFinancialRecord = {
      requestId: req.id,
      matchId: awardedMatch?.id || undefined,
      poNumber,
      poDate,
      buyerCompany: req.company || "Supermarket Retail Chain",
      buyerContact: req.name || undefined,
      buyerPhone: req.phone || undefined,
      buyerEmail: req.email || undefined,
      supplierName:
        (ow?.selected_supplier_name as string) ||
        awardedMatch?.company_name ||
        "European Certified Food Producer",
      supplierCountry:
        supplierObj?.country_of_origin ||
        awardedMatch?.country ||
        "Spain / Italy (EU)",
      supplierEmail: supplierObj?.contact_email || undefined,
      supplierPhone: supplierObj?.contact_phone || undefined,
      productName: req.product_name || (ow?.agreed_product_name as string) || "Food Product",
      orderVolume:
        (ow?.order_volume as string) ||
        `${totalUnits.toLocaleString()} Units (1 x 40ft HQ FCL)`,
      containerCount: 1,
      currency: (ow?.currency as string) || "EUR",
      buyerUnitPrice,
      factoryUnitPrice,
      agentMarginUnit,
      grossContractValue: grossVal,
      factoryContractCost: factoryCost,
      agentCommissionPool: agentPool,
      advanceMilestone: {
        status: (adv30.status as string) || "pending_buyer_wire",
        buyerAmount: advBuyer,
        factoryAmount: advFactory,
        agentAmount: advAgent,
        swiftRef: (adv30.swift_mt103_reference as string) || undefined,
        remitterBank: (adv30.remitter_bank as string) || undefined,
        wireDate: (adv30.wire_date as string) || undefined,
      },
      balanceMilestone: {
        status: (bal70.status as string) || "pending_buyer_wire",
        buyerAmount: balBuyer,
        factoryAmount: balFactory,
        agentAmount: balAgent,
        swiftRef: (bal70.swift_mt103_reference as string) || undefined,
        remitterBank: (bal70.remitter_bank as string) || undefined,
        wireDate: (bal70.wire_date as string) || undefined,
      },
      currentStage: (ow?.current_stage as string) || "order_po_issued",
      productionStatus: (ow?.production_status as string) || undefined,
      shipping: {
        line: (ow?.shipping_line as string) || "MSC (Mediterranean Shipping Company)",
        vessel: (ow?.vessel_name as string) || "MSC LEANNE",
        container: (ow?.container_number as string) || undefined,
        bl: (ow?.bill_of_lading as string) || undefined,
        etd: (ow?.etd as string) || undefined,
        eta: (ow?.eta_port as string) || undefined,
        customsStatus: (ow?.customs_status as string) || undefined,
        customsDeclaration: (ow?.customs_declaration_number as string) || undefined,
        deliveryStatus: (ow?.delivery_status as string) || undefined,
      },
      buyerPortalUrl: `https://foodxchange.com/track/${req.id}`,
      supplierPortalUrl: awardedMatch?.id
        ? `https://foodxchange.com/supplier-match/${awardedMatch.id}`
        : `https://foodxchange.com/track/${req.id}`,
    };

    deals.push(deal);
  }

  // 3. Compute Aggregate Treasury Metrics
  let totalGmv = 0;
  let totalCommission = 0;
  let clearedAdvanceInflow = 0;
  let disbursedToFactories = 0;
  let lockedBrokerFees = 0;
  let inTransitBalance = 0;
  let totalContainers = 0;

  for (const deal of deals) {
    totalGmv += deal.grossContractValue;
    totalCommission += deal.agentCommissionPool;
    totalContainers += deal.containerCount;

    if (
      deal.advanceMilestone.status === "released_to_factory" ||
      deal.advanceMilestone.status === "cleared_in_escrow"
    ) {
      clearedAdvanceInflow += deal.advanceMilestone.buyerAmount;
    }

    if (deal.advanceMilestone.status === "released_to_factory") {
      disbursedToFactories += deal.advanceMilestone.factoryAmount;
      lockedBrokerFees += deal.advanceMilestone.agentAmount;
    }

    if (deal.balanceMilestone.status === "released_to_factory") {
      disbursedToFactories += deal.balanceMilestone.factoryAmount;
      lockedBrokerFees += deal.balanceMilestone.agentAmount;
    } else if (deal.advanceMilestone.status === "released_to_factory") {
      inTransitBalance += deal.balanceMilestone.buyerAmount;
    }
  }

  const avgMargin = totalGmv > 0 ? (totalCommission / totalGmv) * 100 : 5.4;

  const metrics: TreasuryMetrics = {
    totalGmvEur: totalGmv,
    totalBrokerCommissionEur: totalCommission,
    clearedAdvanceInflowEur: clearedAdvanceInflow,
    disbursedToFactoriesEur: disbursedToFactories,
    lockedBrokerFeesEur: lockedBrokerFees,
    inTransitBalanceEur: inTransitBalance,
    totalContainers,
    activeDealsCount: deals.length,
    avgMarginPercent: avgMargin,
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <FinanceTreasuryDashboard deals={deals} metrics={metrics} />
    </div>
  );
}
