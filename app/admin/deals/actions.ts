"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { CommercialOrderLifecycle, FinancialClearanceLifecycle } from "@/app/admin/requests/actions";
import { generatePriorityErpCsv, type ErpAsnPayload } from "@/lib/documents/erpAsnGenerator";
import {
  dispatchTripartiteEvent,
  formatTripartiteMessage,
  type TripartiteEventType,
  type TripartiteEventPayload,
  type FormattedTripartiteMessage,
  type TripartiteNotificationLog,
} from "@/lib/notifications/tripartiteDispatchEngine";

export interface DealRecord {
  id: string; // sourcing_request id
  poNumber: string;
  poDate: string;
  buyerCompany: string;
  buyerContact?: string;
  buyerEmail?: string;
  buyerPhone?: string;
  buyerVat?: string;
  supplierName: string;
  supplierCountry: string;
  supplierEmail?: string;
  supplierPhone?: string;
  supplierIban?: string;
  productName: string;
  productHebrewName?: string;
  orderVolume?: string;
  containerType: "20ft_dry" | "40ft_hc" | "40ft_reefer";
  palletCount: number;
  totalUnits: number;
  unitsPerCarton: number;
  cartonsPerPallet: number;
  netWeightKg: number;
  grossWeightKg: number;
  currency: string;
  buyerUnitPrice: number;
  factoryUnitPrice: number;
  agentMarginUnit: number;
  grossContractValue: number;
  advanceDeposit30: number;
  balanceAgainstBl70: number;
  agentPool: number;
  incoterms: string;
  portOfOrigin?: string;
  portOfDestination?: string;
  currentStage: string;
  productionStatus?: string;
  shippingLine?: string;
  vesselName?: string;
  billOfLading?: string;
  containerNumber?: string;
  customsDeclaration?: string;
  buyerSigned?: boolean;
  buyerSignedAt?: string;
  buyerSignerName?: string;
  supplierSigned?: boolean;
  supplierSignedAt?: string;
  supplierSignerName?: string;
  kosherStandard?: string;
  si1145Compliant?: boolean;
  rawWorkflow?: CommercialOrderLifecycle;
  createdAt: string;
}

export async function fetchDealById(id: string): Promise<{ ok: boolean; deal?: DealRecord; error?: string }> {
  try {
    const { data: req, error } = await supabaseAdmin
      .from("sourcing_requests")
      .select("id, company, name, email, phone, product_name, category, created_at, ai_analysis, status")
      .eq("id", id)
      .single();

    if (error || !req) {
      return { ok: false, error: error?.message || "Deal not found" };
    }

    const ai = (req.ai_analysis as Record<string, unknown> | null) ?? {};
    const ow = (ai.order_workflow as Record<string, unknown> | null) ?? null;
    const fc = (ow?.financial_clearance as Record<string, unknown> | null) ?? {};
    const adv30 = (fc.advance_milestone_30 as Record<string, unknown> | null) ?? {};
    const bal70 = (fc.balance_milestone_70 as Record<string, unknown> | null) ?? {};

    const totalUnits = Number(fc.total_units) || 24000;
    const buyerUnitPrice = Number(fc.buyer_unit_price) || Number(ow?.agreed_unit_price) || 1.85;
    const factoryUnitPrice = Number(fc.factory_unit_price) || 1.65;
    const agentMarginUnit = Math.max(0, buyerUnitPrice - factoryUnitPrice);
    const grossVal = Number(fc.gross_buyer_contract_value) || Math.round(totalUnits * buyerUnitPrice);
    const factoryCost = Number(fc.factory_contract_cost) || Math.round(totalUnits * factoryUnitPrice);
    const agentPool = Number(fc.total_agent_brokerage_pool) || (grossVal - factoryCost);

    const poNum = (ow?.po_number as string) || `FDX-PI-${req.id.slice(0, 6).toUpperCase()}`;
    const poDt = (ow?.po_date as string) || req.created_at.slice(0, 10);
    const palletCount = Number(ow?.warehouse_pallet_count) || (totalUnits > 15000 ? 24 : 12);
    const unitsPerCarton = 12;
    const cartonsPerPallet = Math.round(totalUnits / (palletCount * unitsPerCarton)) || 80;

    const deal: DealRecord = {
      id: req.id,
      poNumber: poNum,
      poDate: poDt,
      buyerCompany: req.company || "Supermarket Retail Chain",
      buyerContact: req.name || undefined,
      buyerEmail: req.email || undefined,
      buyerPhone: req.phone || undefined,
      buyerVat: (ow?.buyer_vat as string) || "51-584920-1",
      supplierName: (ow?.selected_supplier_name as string) || (ai.supplier_name as string) || "European Certified Food Factory",
      supplierCountry: (ow?.port_of_origin ? (ow.port_of_origin as string) : (ai.country_of_origin as string)) || "Italy (EU)",
      supplierEmail: (ow?.supplier_email as string) || undefined,
      supplierPhone: (ow?.supplier_phone as string) || undefined,
      supplierIban: (ow?.supplier_iban as string) || "IT60X0542811101000000123456",
      productName: (ow?.agreed_product_name as string) || req.product_name || "Food Product",
      productHebrewName: (ow?.product_hebrew_name as string) || (ai.product_hebrew_name as string) || req.product_name || "מוצר מזון איכותי",
      orderVolume: (ow?.order_volume as string) || `${totalUnits.toLocaleString()} Units (1 x 40ft HQ FCL)`,
      containerType: (ow?.container_type as any) || "40ft_hc",
      palletCount,
      totalUnits,
      unitsPerCarton,
      cartonsPerPallet,
      netWeightKg: Math.round(totalUnits * 0.5),
      grossWeightKg: Math.round(totalUnits * 0.56 + palletCount * 25),
      currency: (ow?.currency as string) || "EUR",
      buyerUnitPrice,
      factoryUnitPrice,
      agentMarginUnit,
      grossContractValue: grossVal,
      advanceDeposit30: Number(adv30.buyer_wire_amount) || Math.round(grossVal * 0.3),
      balanceAgainstBl70: Number(bal70.buyer_wire_amount) || Math.round(grossVal * 0.7),
      agentPool,
      incoterms: (ow?.incoterms as string) || "CIF Ashdod Port, Israel (Incoterms 2020)",
      portOfOrigin: (ow?.port_of_origin as string) || "Port of Genoa / Valencia",
      portOfDestination: (ow?.port_of_destination as string) || "Port of Ashdod, Israel",
      currentStage: (ow?.current_stage as string) || "order_po_issued",
      productionStatus: (ow?.production_status as string) || "queued",
      shippingLine: (ow?.shipping_line as string) || "MSC Mediterranean Shipping",
      vesselName: (ow?.vessel_name as string) || "MSC ISRAEL V.2604",
      billOfLading: (ow?.bill_of_lading as string) || `MSCU-${req.id.slice(0, 6).toUpperCase()}`,
      containerNumber: (ow?.container_number as string) || `MEDU${Math.floor(1000000 + Math.random() * 9000000)}`,
      customsDeclaration: (ow?.customs_declaration_number as string) || undefined,
      buyerSigned: !!(ow as any)?.buyer_signed,
      buyerSignedAt: (ow as any)?.buyer_signed_at,
      buyerSignerName: (ow as any)?.buyer_signer_name,
      supplierSigned: !!(ow as any)?.supplier_signed,
      supplierSignedAt: (ow as any)?.supplier_signed_at,
      supplierSignerName: (ow as any)?.supplier_signer_name,
      kosherStandard: (ow as any)?.kosher_standard || "Chief Rabbinate of Israel / OU Kosher Pareve",
      si1145Compliant: true,
      rawWorkflow: ow as unknown as CommercialOrderLifecycle,
      createdAt: req.created_at,
    };

    return { ok: true, deal };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

export async function fetchDealsList(): Promise<{ ok: boolean; deals: DealRecord[]; error?: string }> {
  try {
    const { data: requests, error } = await supabaseAdmin
      .from("sourcing_requests")
      .select("id, company, name, email, phone, product_name, category, created_at, ai_analysis, status")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      console.error("fetchDealsList error:", error);
      return { ok: false, deals: [], error: error.message };
    }

    const deals: DealRecord[] = [];

    for (const req of requests || []) {
      const ai = (req.ai_analysis as Record<string, unknown> | null) ?? {};
      const ow = (ai.order_workflow as Record<string, unknown> | null) ?? null;
      const fc = (ow?.financial_clearance as Record<string, unknown> | null) ?? {};
      const adv30 = (fc.advance_milestone_30 as Record<string, unknown> | null) ?? {};
      const bal70 = (fc.balance_milestone_70 as Record<string, unknown> | null) ?? {};

      // If it has order_workflow OR is marked approved / sample approved
      const hasWorkflow = !!ow;
      const isApprovedSample = ai.sample_status === "feedback_approved" || req.status === "feedback_approved";

      if (!hasWorkflow && !isApprovedSample) continue;

      const totalUnits = Number(fc.total_units) || 24000;
      const buyerUnitPrice = Number(fc.buyer_unit_price) || Number(ow?.agreed_unit_price) || 1.85;
      const factoryUnitPrice = Number(fc.factory_unit_price) || 1.65;
      const agentMarginUnit = Math.max(0, buyerUnitPrice - factoryUnitPrice);
      const grossVal = Number(fc.gross_buyer_contract_value) || Math.round(totalUnits * buyerUnitPrice);
      const factoryCost = Number(fc.factory_contract_cost) || Math.round(totalUnits * factoryUnitPrice);
      const agentPool = Number(fc.total_agent_brokerage_pool) || (grossVal - factoryCost);

      const poNum = (ow?.po_number as string) || `FDX-PI-${req.id.slice(0, 6).toUpperCase()}`;
      const poDt = (ow?.po_date as string) || req.created_at.slice(0, 10);

      const palletCount = Number(ow?.warehouse_pallet_count) || (totalUnits > 15000 ? 24 : 12);
      const unitsPerCarton = 12;
      const cartonsPerPallet = Math.round(totalUnits / (palletCount * unitsPerCarton)) || 80;

      deals.push({
        id: req.id,
        poNumber: poNum,
        poDate: poDt,
        buyerCompany: req.company || "Supermarket Retail Chain",
        buyerContact: req.name || undefined,
        buyerEmail: req.email || undefined,
        buyerPhone: req.phone || undefined,
        buyerVat: (ow?.buyer_vat as string) || "51-584920-1",
        supplierName: (ow?.selected_supplier_name as string) || (ai.supplier_name as string) || "European Certified Food Factory",
        supplierCountry: (ow?.port_of_origin ? (ow.port_of_origin as string) : (ai.country_of_origin as string)) || "Italy (EU)",
        supplierEmail: (ow?.supplier_email as string) || undefined,
        supplierPhone: (ow?.supplier_phone as string) || undefined,
        supplierIban: (ow?.supplier_iban as string) || "IT60X0542811101000000123456",
        productName: (ow?.agreed_product_name as string) || req.product_name || "Food Product",
        productHebrewName: (ow?.product_hebrew_name as string) || (ai.product_hebrew_name as string) || req.product_name || "מוצר מזון איכותי",
        orderVolume: (ow?.order_volume as string) || `${totalUnits.toLocaleString()} Units (1 x 40ft HQ FCL)`,
        containerType: (ow?.container_type as any) || "40ft_hc",
        palletCount,
        totalUnits,
        unitsPerCarton,
        cartonsPerPallet,
        netWeightKg: Math.round(totalUnits * 0.5),
        grossWeightKg: Math.round(totalUnits * 0.56 + palletCount * 25),
        currency: (ow?.currency as string) || "EUR",
        buyerUnitPrice,
        factoryUnitPrice,
        agentMarginUnit,
        grossContractValue: grossVal,
        advanceDeposit30: Number(adv30.buyer_wire_amount) || Math.round(grossVal * 0.3),
        balanceAgainstBl70: Number(bal70.buyer_wire_amount) || Math.round(grossVal * 0.7),
        agentPool,
        incoterms: (ow?.incoterms as string) || "CIF Ashdod Port, Israel (Incoterms 2020)",
        portOfOrigin: (ow?.port_of_origin as string) || "Port of Genoa / Valencia",
        portOfDestination: (ow?.port_of_destination as string) || "Port of Ashdod, Israel",
        currentStage: (ow?.current_stage as string) || "order_po_issued",
        productionStatus: (ow?.production_status as string) || "queued",
        shippingLine: (ow?.shipping_line as string) || "MSC Mediterranean Shipping",
        vesselName: (ow?.vessel_name as string) || "MSC ISRAEL V.2604",
        billOfLading: (ow?.bill_of_lading as string) || `MSCU-${req.id.slice(0, 6).toUpperCase()}`,
        containerNumber: (ow?.container_number as string) || `MEDU${Math.floor(1000000 + Math.random() * 9000000)}`,
        customsDeclaration: (ow?.customs_declaration_number as string) || undefined,
        buyerSigned: !!(ow as any)?.buyer_signed,
        buyerSignedAt: (ow as any)?.buyer_signed_at,
        buyerSignerName: (ow as any)?.buyer_signer_name,
        supplierSigned: !!(ow as any)?.supplier_signed,
        supplierSignedAt: (ow as any)?.supplier_signed_at,
        supplierSignerName: (ow as any)?.supplier_signer_name,
        kosherStandard: (ow as any)?.kosher_standard || "Chief Rabbinate of Israel / OU Kosher Pareve",
        si1145Compliant: true,
        rawWorkflow: ow as unknown as CommercialOrderLifecycle,
        createdAt: req.created_at,
      });
    }

    return { ok: true, deals };
  } catch (err: any) {
    console.error("fetchDealsList exception:", err);
    return { ok: false, deals: [], error: err.message };
  }
}

export interface SaveProFormaInput {
  requestId?: string; // if updating existing or converting from sample
  buyerCompany: string;
  buyerContact: string;
  buyerEmail: string;
  buyerPhone: string;
  buyerVat: string;
  supplierName: string;
  supplierCountry: string;
  supplierEmail?: string;
  supplierPhone?: string;
  supplierIban?: string;
  productName: string;
  productHebrewName: string;
  containerType: "20ft_dry" | "40ft_hc" | "40ft_reefer";
  palletCount: number;
  totalUnits: number;
  unitsPerCarton: number;
  cartonsPerPallet: number;
  buyerUnitPrice: number;
  factoryUnitPrice: number;
  currency: string;
  incoterms: string;
  portOfOrigin: string;
  portOfDestination: string;
  kosherStandard: string;
  notes?: string;
}

export async function saveProFormaDeal(
  input: SaveProFormaInput
): Promise<{ ok: boolean; dealId?: string; poNumber?: string; error?: string }> {
  try {
    const grossVal = Math.round(input.totalUnits * input.buyerUnitPrice * 100) / 100;
    const factoryCost = Math.round(input.totalUnits * input.factoryUnitPrice * 100) / 100;
    const agentPool = Math.round((grossVal - factoryCost) * 100) / 100;
    const adv30 = Math.round(grossVal * 0.3 * 100) / 100;
    const bal70 = Math.round(grossVal * 0.7 * 100) / 100;
    const now = new Date().toISOString();
    const poNum = `FDX-PI-${Date.now().toString().slice(-6)}`;

    const fc: FinancialClearanceLifecycle = {
      buyer_unit_price: input.buyerUnitPrice,
      factory_unit_price: input.factoryUnitPrice,
      agent_margin_per_unit: Math.max(0, input.buyerUnitPrice - input.factoryUnitPrice),
      total_units: input.totalUnits,
      gross_buyer_contract_value: grossVal,
      factory_contract_cost: factoryCost,
      total_agent_brokerage_pool: agentPool,
      advance_milestone_30: {
        status: "pending_buyer_wire",
        buyer_wire_amount: adv30,
        factory_wire_amount: Math.round(factoryCost * 0.3 * 100) / 100,
        agent_retained_fee: Math.round(agentPool * 0.3 * 100) / 100,
      },
      balance_milestone_70: {
        status: "pending_bl_copy",
        buyer_wire_amount: bal70,
        factory_wire_amount: Math.round(factoryCost * 0.7 * 100) / 100,
        agent_retained_fee: Math.round(agentPool * 0.7 * 100) / 100,
      },
      ncnda_signed: true,
      escrow_split_verified: true,
      updated_at: now,
    };

    const workflowPayload: any = {
      current_stage: "order_po_issued",
      po_number: poNum,
      po_date: now.slice(0, 10),
      selected_supplier_name: input.supplierName,
      agreed_product_name: input.productName,
      product_hebrew_name: input.productHebrewName,
      buyer_vat: input.buyerVat,
      supplier_iban: input.supplierIban,
      supplier_email: input.supplierEmail,
      supplier_phone: input.supplierPhone,
      agreed_unit_price: input.buyerUnitPrice.toString(),
      currency: input.currency,
      order_volume: `${input.totalUnits.toLocaleString()} Units (${input.containerType.replace("_", " ").toUpperCase()})`,
      total_order_value: grossVal,
      incoterms: input.incoterms,
      port_of_origin: input.portOfOrigin,
      port_of_destination: input.portOfDestination,
      warehouse_pallet_count: input.palletCount,
      container_type: input.containerType,
      kosher_standard: input.kosherStandard,
      production_status: "queued",
      production_milestones: {
        deposit_transferred: false,
        raw_materials_procured: false,
        bottling_completed: false,
        psi_inspection_passed: false,
        container_loaded: false,
      },
      financial_clearance: fc,
      updated_at: now,
    };

    let targetId = input.requestId;

    if (targetId) {
      // Update existing
      const { data: existing } = await supabaseAdmin
        .from("sourcing_requests")
        .select("ai_analysis")
        .eq("id", targetId)
        .single();

      const existingAi = (existing?.ai_analysis as Record<string, unknown> | null) ?? {};
      const { error: updateErr } = await supabaseAdmin
        .from("sourcing_requests")
        .update({
          company: input.buyerCompany,
          name: input.buyerContact,
          email: input.buyerEmail,
          phone: input.buyerPhone,
          product_name: input.productName,
          status: "order_po_issued",
          ai_analysis: {
            ...existingAi,
            order_workflow: workflowPayload,
          },
        })
        .eq("id", targetId);

      if (updateErr) throw updateErr;
    } else {
      // Insert new request record for this deal
      const { data: newRow, error: insertErr } = await supabaseAdmin
        .from("sourcing_requests")
        .insert({
          company: input.buyerCompany,
          name: input.buyerContact,
          email: input.buyerEmail,
          phone: input.buyerPhone,
          product_name: input.productName,
          category: "Import Order",
          status: "order_po_issued",
          source: "commercial_deal_desk",
          ai_analysis: {
            order_workflow: workflowPayload,
          },
        })
        .select("id")
        .single();

      if (insertErr) throw insertErr;
      targetId = newRow.id;
    }

    try {
      revalidatePath("/admin/deals");
      revalidatePath("/admin/finance");
      revalidatePath(`/proforma/${targetId}`);
    } catch {}

    return { ok: true, dealId: targetId, poNumber: poNum };
  } catch (err: any) {
    console.error("saveProFormaDeal error:", err);
    return { ok: false, error: err.message };
  }
}

export async function signCommercialDeal(
  dealId: string,
  role: "buyer" | "supplier",
  signerName: string,
  signerTitle: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { data: req, error } = await supabaseAdmin
      .from("sourcing_requests")
      .select("ai_analysis")
      .eq("id", dealId)
      .single();

    if (error || !req) return { ok: false, error: "Deal not found" };

    const ai = (req.ai_analysis as Record<string, unknown> | null) ?? {};
    const ow = (ai.order_workflow as Record<string, unknown> | null) ?? {};
    const now = new Date().toISOString();

    const updatedOw: any = {
      ...ow,
      updated_at: now,
    };

    if (role === "buyer") {
      updatedOw.buyer_signed = true;
      updatedOw.buyer_signed_at = now;
      updatedOw.buyer_signer_name = `${signerName} (${signerTitle})`;
    } else {
      updatedOw.supplier_signed = true;
      updatedOw.supplier_signed_at = now;
      updatedOw.supplier_signer_name = `${signerName} (${signerTitle})`;
    }

    // If both signed, transition stage to deposit_transferred readiness
    if (updatedOw.buyer_signed && updatedOw.supplier_signed) {
      updatedOw.current_stage = "commercial_negotiation";
    }

    const { error: updErr } = await supabaseAdmin
      .from("sourcing_requests")
      .update({
        ai_analysis: {
          ...ai,
          order_workflow: updatedOw,
        },
      })
      .eq("id", dealId);

    if (updErr) throw updErr;

    // Auto-dispatch notification when buyer signs
    if (role === "buyer") {
      void dispatchDealNotification(dealId, "po_signed_advance_due", "both");
    }

    try {
      revalidatePath(`/proforma/${dealId}`);
      revalidatePath("/admin/deals");
    } catch {}

    return { ok: true };
  } catch (err: any) {
    console.error("signCommercialDeal error:", err);
    return { ok: false, error: err.message };
  }
}

export async function advanceDealStage(
  dealId: string,
  nextStage: string,
  stageDetails?: {
    depositTransferred?: boolean;
    containerLoaded?: boolean;
    vesselName?: string;
    billOfLading?: string;
    customsDeclarationNumber?: string;
  }
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { data: req, error } = await supabaseAdmin
      .from("sourcing_requests")
      .select("ai_analysis")
      .eq("id", dealId)
      .single();

    if (error || !req) return { ok: false, error: "Deal not found" };

    const ai = (req.ai_analysis as Record<string, unknown> | null) ?? {};
    const ow = (ai.order_workflow as any) ?? {};
    const fc = (ow.financial_clearance as any) ?? {};
    const now = new Date().toISOString();

    ow.current_stage = nextStage;
    ow.updated_at = now;

    if (stageDetails?.depositTransferred) {
      if (!ow.production_milestones) ow.production_milestones = {};
      ow.production_milestones.deposit_transferred = true;
      ow.production_status = "in_production";
      if (fc.advance_milestone_30) {
        fc.advance_milestone_30.status = "released_to_factory";
        fc.advance_milestone_30.cleared_date = now.slice(0, 10);
      }
    }

    if (stageDetails?.containerLoaded) {
      if (!ow.production_milestones) ow.production_milestones = {};
      ow.production_milestones.container_loaded = true;
      ow.production_status = "ready_to_load";
    }

    if (stageDetails?.vesselName) ow.vessel_name = stageDetails.vesselName;
    if (stageDetails?.billOfLading) ow.bill_of_lading = stageDetails.billOfLading;
    if (stageDetails?.customsDeclarationNumber) {
      ow.customs_declaration_number = stageDetails.customsDeclarationNumber;
      ow.customs_status = "customs_broker_clearing";
    }

    ow.financial_clearance = fc;

    const { error: updErr } = await supabaseAdmin
      .from("sourcing_requests")
      .update({
        status: nextStage,
        ai_analysis: {
          ...ai,
          order_workflow: ow,
        },
      })
      .eq("id", dealId);

    if (updErr) throw updErr;

    // Auto-dispatch notification for advance milestone
    if (nextStage === "manufacturing") {
      void dispatchDealNotification(dealId, "advance_verified_production_released", "both");
    } else if (nextStage === "shipping_customs_warehouse") {
      void dispatchDealNotification(dealId, "container_loaded_vessel_departed", "both");
    } else if (nextStage === "customs_warehouse") {
      void dispatchDealNotification(dealId, "vessel_approaching_customs_dispatch", "both");
    } else if (nextStage === "completed") {
      void dispatchDealNotification(dealId, "grn_dock_accepted_deal_closed", "both");
    }

    try {
      revalidatePath("/admin/deals");
      revalidatePath(`/proforma/${dealId}`);
    } catch {}

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

export async function getDealNotificationPreview(
  dealId: string,
  eventType: TripartiteEventType
): Promise<{ ok: boolean; formatted?: FormattedTripartiteMessage; error?: string }> {
  try {
    const { deal } = await fetchDealById(dealId);
    if (!deal) return { ok: false, error: "Deal not found" };

    const payload: TripartiteEventPayload = {
      requestId: deal.id,
      eventType,
      poNumber: deal.poNumber,
      buyerCompany: deal.buyerCompany,
      buyerContact: deal.buyerContact,
      buyerEmail: deal.buyerEmail,
      buyerPhone: deal.buyerPhone,
      supplierName: deal.supplierName,
      supplierCountry: deal.supplierCountry,
      supplierEmail: deal.supplierEmail,
      supplierPhone: deal.supplierPhone,
      productName: deal.productName,
      orderVolume: `${deal.totalUnits.toLocaleString()} Units (${deal.palletCount} Pallets)`,
      totalOrderValueEur: deal.grossContractValue,
      advance30Eur: deal.advanceDeposit30,
      balance70Eur: deal.balanceAgainstBl70,
      containerNumber: deal.containerNumber,
      billOfLading: deal.billOfLading,
      vesselName: deal.vesselName,
      shippingLine: deal.shippingLine,
      customsDeclarationNumber: deal.customsDeclaration,
      warehousePalletCount: deal.palletCount,
    };

    const formatted = formatTripartiteMessage(payload);
    return { ok: true, formatted };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

export async function dispatchDealNotification(
  dealId: string,
  eventType: TripartiteEventType,
  channel: "whatsapp" | "email" | "both" = "both"
): Promise<{ ok: boolean; whatsappUrl?: string; message?: string; error?: string }> {
  try {
    const { deal } = await fetchDealById(dealId);
    if (!deal) return { ok: false, error: "Deal not found" };

    const payload: TripartiteEventPayload = {
      requestId: deal.id,
      eventType,
      poNumber: deal.poNumber,
      buyerCompany: deal.buyerCompany,
      buyerContact: deal.buyerContact,
      buyerEmail: deal.buyerEmail,
      buyerPhone: deal.buyerPhone,
      supplierName: deal.supplierName,
      supplierCountry: deal.supplierCountry,
      supplierEmail: deal.supplierEmail,
      supplierPhone: deal.supplierPhone,
      productName: deal.productName,
      orderVolume: `${deal.totalUnits.toLocaleString()} Units (${deal.palletCount} Pallets)`,
      totalOrderValueEur: deal.grossContractValue,
      advance30Eur: deal.advanceDeposit30,
      balance70Eur: deal.balanceAgainstBl70,
      containerNumber: deal.containerNumber,
      billOfLading: deal.billOfLading,
      vesselName: deal.vesselName,
      shippingLine: deal.shippingLine,
      customsDeclarationNumber: deal.customsDeclaration,
      warehousePalletCount: deal.palletCount,
    };

    const res = await dispatchTripartiteEvent(payload, channel);
    if (res.ok) {
      return { ok: true, whatsappUrl: res.whatsappUrl, message: res.message };
    } else {
      return { ok: false, error: res.error };
    }
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}
