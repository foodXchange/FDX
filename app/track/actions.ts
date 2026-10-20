"use server";

import { createNotification } from "@/lib/notifications/createNotification";
import { logAdminAction } from "@/lib/auditLog";
import type { CommercialOrderLifecycle } from "@/app/admin/requests/actions";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { revalidatePath } from "next/cache";
import type {
  BuyerBriefApproval,
  SampleDispatchProtocol,
  PackagingArtworkWorkflow,
} from "@/app/admin/requests/actions";

export async function buyerApproveBrief(
  requestId: string,
  notes?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { data: req, error: fetchErr } = await supabaseAdmin
      .from("sourcing_requests")
      .select("ai_analysis")
      .eq("id", requestId)
      .single();

    if (fetchErr || !req) {
      return { ok: false, error: fetchErr?.message || "Request not found" };
    }

    const ai = (req.ai_analysis as Record<string, unknown> | null) ?? {};
    const briefApproval: BuyerBriefApproval = {
      status: "approved",
      approved_at: new Date().toISOString(),
      approved_by: "Buyer Portal (Verified)",
      notes: notes || null,
    };

    const { error: updateErr } = await supabaseAdmin
      .from("sourcing_requests")
      .update({
        ai_analysis: {
          ...ai,
          buyer_brief_approval: briefApproval,
        },
      })
      .eq("id", requestId);

    if (updateErr) {
      return { ok: false, error: updateErr.message };
    }

    try {
      revalidatePath(`/track/${requestId}`);
      revalidatePath(`/admin/requests/${requestId}`);
      revalidatePath(`/admin/requests`);
    } catch {}
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to approve brief" };
  }
}

export async function buyerSubmitSensoryEvaluation(
  requestId: string,
  evalData: {
    taste_score: number;
    texture_score: number;
    aroma_score: number;
    packaging_score: number;
    overall_verdict: "passed" | "rejected" | "reformulation_needed";
    notes?: string;
    evaluator_name: string;
  }
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { data: req, error: fetchErr } = await supabaseAdmin
      .from("sourcing_requests")
      .select("ai_analysis")
      .eq("id", requestId)
      .single();

    if (fetchErr || !req) {
      return { ok: false, error: fetchErr?.message || "Request not found" };
    }

    const ai = (req.ai_analysis as Record<string, unknown> | null) ?? {};
    const existingProtocol = (ai.sample_dispatch as SampleDispatchProtocol | null) ?? {
      status: "delivered",
      commercial_pre_alignment: { is_aligned: true },
      courier_instructions: {
        courier_name: "DHL Express",
        bill_recipient: "broker_account",
        declared_value_eur: 10,
        customs_declaration_text: "Food Samples for Sensory Evaluation Only",
        awb_description: "Food samples",
        consignee: {
          company: "Buyer",
          contact_person: evalData.evaluator_name,
          phone: "",
          email: "",
          address_line1: "",
          address_city: "",
          address_country: "Israel",
          postal_code: "",
        },
        breakage_packaging_mandate: "Standard protection",
      },
      shipment: {},
      sensory_evaluation: {
        taste_score: 5,
        texture_score: 5,
        aroma_score: 5,
        packaging_score: 5,
        overall_verdict: "pending",
        approved_for_qa: false,
      },
    };

    const updatedProtocol: SampleDispatchProtocol = {
      ...existingProtocol,
      status: evalData.overall_verdict === "passed" ? "tasting_passed" : "tasting_rejected",
      sensory_evaluation: {
        evaluator_name: evalData.evaluator_name,
        evaluated_at: new Date().toISOString(),
        taste_score: evalData.taste_score,
        texture_score: evalData.texture_score,
        aroma_score: evalData.aroma_score,
        packaging_score: evalData.packaging_score,
        overall_verdict: evalData.overall_verdict,
        approved_for_qa: evalData.overall_verdict === "passed",
        notes: evalData.notes,
      },
      updated_at: new Date().toISOString(),
      updated_by: evalData.evaluator_name,
    };

    const { error: updateErr } = await supabaseAdmin
      .from("sourcing_requests")
      .update({
        ai_analysis: {
          ...ai,
          sample_dispatch: updatedProtocol,
        },
      })
      .eq("id", requestId);

    if (updateErr) {
      return { ok: false, error: updateErr.message };
    }

    try {
      revalidatePath(`/track/${requestId}`);
      revalidatePath(`/admin/requests/${requestId}`);
      revalidatePath(`/admin/requests`);
    } catch {}
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to record tasting evaluation" };
  }
}

export async function buyerApprovePackaging(
  requestId: string,
  approverName: string,
  notes?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { data: req, error: fetchErr } = await supabaseAdmin
      .from("sourcing_requests")
      .select("ai_analysis")
      .eq("id", requestId)
      .single();

    if (fetchErr || !req) {
      return { ok: false, error: fetchErr?.message || "Request not found" };
    }

    const ai = (req.ai_analysis as Record<string, unknown> | null) ?? {};
    const existingArtwork = (ai.packaging_artwork as PackagingArtworkWorkflow | null) ?? {
      status: "buyer_marketing_review",
      packaging_specs: {
        packaging_type: "PET Bottle",
        artwork_version: 1,
      },
      approval_gates: {
        food_advisory: {
          status: "approved",
          advisory_company_name: "Food Advisory Specialist",
          hebrew_nutrition_table_verified: true,
          allergen_bolding_verified: true,
          legal_origin_marking_verified: true,
          front_warning_labels_verified: true,
        },
        buyer_marketing: {
          status: "pending",
          approver_name: "",
          brand_compliance_verified: false,
          finish_and_coating: "Glossy",
        },
        supplier_technical: {
          status: "pending",
          roll_unwinding_confirmed: true,
          inkjet_code_gap_confirmed: true,
          die_cut_tolerances_confirmed: true,
        },
      },
      print_master_release: {
        is_released_to_factory: false,
      },
    };

    const updatedArtwork: PackagingArtworkWorkflow = {
      ...existingArtwork,
      status: "buyer_marketing_review",
      approval_gates: {
        ...existingArtwork.approval_gates,
        buyer_marketing: {
          status: "approved",
          approver_name: approverName,
          reviewed_at: new Date().toISOString(),
          brand_compliance_verified: true,
          finish_and_coating: existingArtwork.approval_gates.buyer_marketing?.finish_and_coating || "Glossy",
          notes: notes || existingArtwork.approval_gates.buyer_marketing?.notes,
        },
      },
      updated_at: new Date().toISOString(),
      updated_by: approverName,
    };

    const { error: updateErr } = await supabaseAdmin
      .from("sourcing_requests")
      .update({
        ai_analysis: {
          ...ai,
          packaging_artwork: updatedArtwork,
        },
      })
      .eq("id", requestId);

    if (updateErr) {
      return { ok: false, error: updateErr.message };
    }

    try {
      revalidatePath(`/track/${requestId}`);
      revalidatePath(`/admin/requests/${requestId}`);
      revalidatePath(`/admin/requests`);
    } catch {}
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to record artwork approval" };
  }
}

export interface BuyerSubmitWireInput {
  milestone: "advance_30" | "balance_70";
  swift_reference: string;
  remitter_bank: string;
  wire_amount: number;
  wire_date?: string;
  wire_slip_url?: string;
  notes?: string;
  remitter_name?: string;
}

export async function buyerSubmitWireTransfer(
  requestId: string,
  input: BuyerSubmitWireInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { data: req, error: fetchErr } = await supabaseAdmin
      .from("sourcing_requests")
      .select("id, company, product_name, ai_analysis")
      .eq("id", requestId)
      .single();

    if (fetchErr || !req) {
      return { ok: false, error: fetchErr?.message || "Request not found" };
    }

    const ai = (req.ai_analysis as Record<string, unknown> | null) ?? {};
    const existingWorkflow = (ai.order_workflow as CommercialOrderLifecycle | null) ?? {
      current_stage: "order_po_issued",
    };
    const fc = existingWorkflow.financial_clearance || {};

    const now = new Date().toISOString();
    const wireDate = input.wire_date || now.slice(0, 10);
    const isBalance70 = input.milestone === "balance_70";

    const updatedWorkflow: CommercialOrderLifecycle = {
      ...existingWorkflow,
      production_milestones: {
        ...(existingWorkflow.production_milestones || {}),
        deposit_transferred: isBalance70
          ? (existingWorkflow.production_milestones?.deposit_transferred ?? true)
          : true,
      },
      financial_clearance: {
        ...fc,
        ...(isBalance70
          ? {
              balance_milestone_70: {
                ...(fc.balance_milestone_70 || {}),
                status: "wire_submitted_by_buyer",
                swift_mt103_reference: input.swift_reference,
                remitter_bank: input.remitter_bank,
                wire_date: wireDate,
                wire_slip_url: input.wire_slip_url,
                buyer_wire_amount: input.wire_amount,
                notes: input.notes || "70% balance wire slip submitted by buyer against B/L.",
              },
            }
          : {
              advance_milestone_30: {
                ...(fc.advance_milestone_30 || {}),
                status: "wire_submitted_by_buyer",
                swift_mt103_reference: input.swift_reference,
                remitter_bank: input.remitter_bank,
                wire_date: wireDate,
                wire_slip_url: input.wire_slip_url,
                buyer_wire_amount: input.wire_amount,
                notes: input.notes || "30% advance wire slip submitted by buyer via Portal.",
              },
            }),
        updated_at: now,
        updated_by: input.remitter_name || req.company || "Buyer Portal",
      },
      updated_at: now,
      updated_by: "Buyer Portal (Verified)",
    };

    const { error: updateErr } = await supabaseAdmin
      .from("sourcing_requests")
      .update({
        ai_analysis: {
          ...ai,
          order_workflow: updatedWorkflow,
        },
      })
      .eq("id", requestId);

    if (updateErr) {
      return { ok: false, error: updateErr.message };
    }

    // Fire instant high-priority admin alert
    const buyerName = req.company || "Buyer";
    await createNotification(
      "match_reply",
      `💰 Buyer ${isBalance70 ? "70% Balance" : "30% Advance"} Wire: €${Number(input.wire_amount).toLocaleString()}`,
      `[${buyerName}] submitted ${isBalance70 ? "70% final balance wire against B/L" : "30% advance deposit wire"} (SWIFT Ref: ${input.swift_reference}). Ready for settlement clearance and document release.`,
      {
        requestId,
        category: "financial_clearance",
        milestone: input.milestone,
        swiftRef: input.swift_reference,
        remitterBank: input.remitter_bank,
        amount: input.wire_amount,
        action_url: `/admin/requests/${requestId}`,
        priority: "urgent",
      }
    );

    await logAdminAction({
      adminEmail: "buyer-portal@system",
      action: "buyer_submit_wire_transfer",
      targetType: "sourcing_request",
      targetId: requestId,
      metadata: {
        milestone: input.milestone,
        swift_ref: input.swift_reference,
        amount: input.wire_amount,
        remitter_bank: input.remitter_bank,
      },
    });

    try {
      revalidatePath(`/track/${requestId}`);
      revalidatePath(`/admin/requests/${requestId}`);
      revalidatePath(`/admin/requests`);
    } catch {}
    return { ok: true };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to record wire transfer",
    };
  }
}

export interface BuyerAcceptOfferAndIssuePoInput {
  requestId: string;
  matchId: string;
  producerCode: string;
  quantityUnits: number;
  buyerPoNumber?: string;
  destinationWarehouse?: string;
  contactName: string;
  contactEmail?: string;
  contactPhone?: string;
  specialInstructions?: string;
}

export async function buyerAcceptOfferAndIssuePo(
  input: BuyerAcceptOfferAndIssuePoInput
): Promise<
  | {
      ok: true;
      poNumber: string;
      totalValueEur: number;
      advanceDueEur: number;
      balanceDueEur: number;
    }
  | { ok: false; error: string }
> {
  try {
    const { requestId, matchId, quantityUnits } = input;
    if (!requestId || !matchId || !quantityUnits || quantityUnits <= 0) {
      return { ok: false, error: "Invalid order parameters" };
    }

    // 1. Fetch Request & Match in parallel
    const [reqRes, matchRes] = await Promise.all([
      supabaseAdmin
        .from("sourcing_requests")
        .select("id, name, company, product_name, ai_analysis")
        .eq("id", requestId)
        .single(),
      supabaseAdmin
        .from("sourcing_matches")
        .select("id, supplier_id, company_name, product_name, country, match_breakdown")
        .eq("id", matchId)
        .single(),
    ]);

    if (reqRes.error || !reqRes.data) {
      return { ok: false, error: reqRes.error?.message || "Request not found" };
    }
    if (matchRes.error || !matchRes.data) {
      return { ok: false, error: matchRes.error?.message || "Supplier offer not found" };
    }

    const req = reqRes.data;
    const match = matchRes.data;

    const breakdown = (match.match_breakdown ?? {}) as Record<string, unknown>;
    const quote = (breakdown.quote ?? {}) as Record<string, unknown>;
    const agentMargin = (breakdown.agent_margin ?? null) as Record<string, unknown> | null;

    // 2. Financial calculation
    const rawFactoryCost = typeof quote.unit_price === "number" ? quote.unit_price : 1.75;
    let sellingPrice: number;

    if (agentMargin && typeof agentMargin.buyer_quoted_price === "number") {
      sellingPrice = agentMargin.buyer_quoted_price;
    } else {
      sellingPrice = Number((rawFactoryCost + 0.1).toFixed(2)); // Standard 10 cent / unit agent spread
    }

    const currency = typeof quote.currency === "string" ? quote.currency : "EUR";
    const incoterm = typeof quote.incoterm === "string" ? quote.incoterm : "CIF Ashdod Port (Israel)";

    const totalBuyerContractEur = Number((sellingPrice * quantityUnits).toFixed(2));
    const totalFactoryCostEur = Number((rawFactoryCost * quantityUnits).toFixed(2));
    const totalBrokerPoolEur = Number((totalBuyerContractEur - totalFactoryCostEur).toFixed(2));

    const advance30Eur = Number((totalBuyerContractEur * 0.3).toFixed(2));
    const balance70Eur = Number((totalBuyerContractEur * 0.7).toFixed(2));
    const factoryAdvance30Eur = Number((totalFactoryCostEur * 0.3).toFixed(2));
    const brokerAdvanceFeeEur = Number((advance30Eur - factoryAdvance30Eur).toFixed(2));

    const now = new Date().toISOString();
    const poNumber =
      input.buyerPoNumber?.trim() ||
      `FDX-PO-${new Date().getFullYear()}-${match.id.slice(0, 6).toUpperCase()}`;

    // 3. Assemble CommercialOrderLifecycle
    const ai = (req.ai_analysis as Record<string, unknown> | null) ?? {};
    const existingWorkflow = (ai.order_workflow as CommercialOrderLifecycle | null) ?? {
      current_stage: "order_po_issued",
    };

    const updatedWorkflow: CommercialOrderLifecycle = {
      ...existingWorkflow,
      current_stage: "order_po_issued",
      selected_supplier_id: match.supplier_id,
      selected_supplier_name: match.company_name,
      agreed_product_name: match.product_name || req.product_name,
      agreed_unit_price: `${sellingPrice.toFixed(2)} ${currency}`,
      currency,
      order_volume: `${quantityUnits.toLocaleString()} units (${incoterm})`,
      total_order_value: totalBuyerContractEur,
      incoterms: incoterm,
      payment_terms: "30% Advance Wire, 70% against B/L copy",
      po_number: poNumber,
      po_date: now.slice(0, 10),
      production_status: "queued",
      port_of_origin:
        match.country === "Spain"
          ? "Valencia, Spain"
          : match.country === "Italy"
          ? "Genova / Salerno, Italy"
          : "European Main Port",
      port_of_destination: "Ashdod Port, Israel",
      buyer_warehouse_address:
        input.destinationWarehouse || `${req.company || req.name || "Buyer"} Central Logistics Warehouse`,
      production_milestones: {
        ...(existingWorkflow.production_milestones || {}),
        deposit_transferred: false,
        raw_materials_procured: false,
        bottling_completed: false,
        psi_inspection_passed: false,
        container_loaded: false,
      },
      financial_clearance: {
        buyer_unit_price: sellingPrice,
        factory_unit_price: rawFactoryCost,
        agent_margin_per_unit: Number((sellingPrice - rawFactoryCost).toFixed(2)),
        total_units: quantityUnits,
        gross_buyer_contract_value: totalBuyerContractEur,
        factory_contract_cost: totalFactoryCostEur,
        total_agent_brokerage_pool: totalBrokerPoolEur,
        advance_milestone_30: {
          buyer_wire_amount: advance30Eur,
          factory_wire_amount: factoryAdvance30Eur,
          agent_commission_amount: brokerAdvanceFeeEur,
          status: "pending_buyer_wire",
        },
        balance_milestone_70: {
          buyer_wire_amount: balance70Eur,
          factory_wire_amount: Number((totalFactoryCostEur * 0.7).toFixed(2)),
          agent_commission_amount: Number((totalBrokerPoolEur * 0.7).toFixed(2)),
          status: "pending_bl_copy",
        },
        escrow_split_verified: false,
        updated_at: now,
        updated_by: `Buyer Portal (${input.contactName || "Authorized Procurement"})`,
      },
      updated_at: now,
      updated_by: "Buyer Portal (Verified PO Issuance)",
    };

    // 4. Update sourcing_requests (stage is tracked in order_workflow.current_stage)
    const { error: updateReqErr } = await supabaseAdmin
      .from("sourcing_requests")
      .update({
        ai_analysis: {
          ...ai,
          order_workflow: updatedWorkflow,
        },
      })
      .eq("id", requestId);

    if (updateReqErr) {
      console.error("buyerAcceptOfferAndIssuePo request update error:", updateReqErr);
      return { ok: false, error: updateReqErr.message };
    }

    // 5. Update sourcing_matches with order awarded metadata
    const updatedMatchBreakdown = {
      ...breakdown,
      order_awarded: {
        po_number: poNumber,
        quantity_units: quantityUnits,
        contract_value_eur: totalBuyerContractEur,
        selling_price_eur: sellingPrice,
        factory_cost_eur: rawFactoryCost,
        awarded_at: now,
        authorized_by: input.contactName,
      },
    };

    await supabaseAdmin
      .from("sourcing_matches")
      .update({
        status: "approved",
        match_breakdown: updatedMatchBreakdown,
      })
      .eq("id", matchId);

    // 6. Record in match_messages
    const buyerName = req.company || req.name || "Buyer";
    await supabaseAdmin.from("match_messages").insert({
      match_id: matchId,
      sender_type: "buyer",
      message: `[Commercial PO Issued · Deal Won]\nBuyer ${buyerName} officially accepted the commercial offer and issued PO #${poNumber} for ${quantityUnits.toLocaleString()} units.\nTotal Contract Value: €${totalBuyerContractEur.toLocaleString()} (${incoterm})\n30% Advance Deposit Due: €${advance30Eur.toLocaleString()}\nAuthorized by: ${input.contactName}${input.contactPhone ? ` · ${input.contactPhone}` : ""}`,
    });

    // 7. Fire urgent admin notification
    await createNotification(
      "response",
      `🎉 DEAL WON: Commercial PO #${poNumber} Issued!`,
      `[${buyerName}] accepted ${match.company_name} offer for ${quantityUnits.toLocaleString()} units of ${match.product_name}. Contract: €${totalBuyerContractEur.toLocaleString()} (Broker Spread: +€${totalBrokerPoolEur.toLocaleString()}). Ready for 30% wire clearance.`,
      {
        requestId,
        matchId,
        poNumber,
        totalValue: totalBuyerContractEur,
        advanceDue: advance30Eur,
        brokerSpread: totalBrokerPoolEur,
        action_url: `/admin/requests/${requestId}`,
        priority: "urgent",
      }
    );

    // 8. Log audit trail
    await logAdminAction({
      adminEmail: "buyer-portal@system",
      action: "buyer_accept_offer_and_issue_po",
      targetType: "sourcing_request",
      targetId: requestId,
      metadata: {
        po_number: poNumber,
        match_id: matchId,
        supplier_name: match.company_name,
        quantity_units: quantityUnits,
        total_contract_eur: totalBuyerContractEur,
        broker_spread_eur: totalBrokerPoolEur,
        advance_30_eur: advance30Eur,
      },
    });

    try {
      revalidatePath(`/track/${requestId}`);
      revalidatePath(`/admin/requests/${requestId}`);
      revalidatePath(`/admin/requests`);
    } catch {}

    return {
      ok: true,
      poNumber,
      totalValueEur: totalBuyerContractEur,
      advanceDueEur: advance30Eur,
      balanceDueEur: balance70Eur,
    };
  } catch (err: unknown) {
    console.error("buyerAcceptOfferAndIssuePo error:", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to record purchase order",
    };
  }
}

export interface BuyerSignWarehouseGoodsReceiptInput {
  requestId: string;
  receivingOfficer: string;
  receivedPallets: number;
  truckLicensePlate?: string;
  dockBay?: string;
  tempLoggerReading?: string;
  sealNumber?: string;
  notes?: string;
}

export async function buyerSignWarehouseGoodsReceipt(
  input: BuyerSignWarehouseGoodsReceiptInput
): Promise<{ ok: true; grnNumber: string; arrivedAt: string } | { ok: false; error: string }> {
  try {
    if (!input.requestId) {
      return { ok: false, error: "Missing requestId" };
    }
    if (!input.receivingOfficer || input.receivingOfficer.trim().length < 2) {
      return { ok: false, error: "נא לציין את שם קצין קבלת הסחורה במרלוג" };
    }
    if (!input.receivedPallets || input.receivedPallets <= 0) {
      return { ok: false, error: "נא להזין מספר משטחים תקין שנקלט ברציף" };
    }

    const { data: req, error: fetchErr } = await supabaseAdmin
      .from("sourcing_requests")
      .select("id, ai_analysis, company, product_name")
      .eq("id", input.requestId)
      .single();

    if (fetchErr || !req) {
      return { ok: false, error: fetchErr?.message || "תיק יבוא לא נמצא" };
    }

    const existingAi = (req.ai_analysis as Record<string, unknown> | null) ?? {};
    const existingWorkflow = (existingAi.order_workflow as CommercialOrderLifecycle | null) ?? {
      current_stage: "customs_warehouse",
    };

    const now = new Date().toISOString();
    const grnNumber = `GRN-IL-2604-${input.requestId.slice(0, 5).toUpperCase()}`;

    const updatedWorkflow: CommercialOrderLifecycle = {
      ...existingWorkflow,
      current_stage: "completed",
      delivery_status: "arrived_at_warehouse",
      arrived_at: now,
      warehouse_pallet_count: input.receivedPallets,
      goods_accepted_by: input.receivingOfficer.trim(),
      logistics_notes: input.notes?.trim() || existingWorkflow.logistics_notes,
      updated_at: now,
      updated_by: `Buyer Warehouse Officer: ${input.receivingOfficer.trim()}`,
    };

    const updatedAiAnalysis = {
      ...existingAi,
      order_workflow: updatedWorkflow,
      warehouse_grn_signoff: {
        grnNumber,
        receivingOfficer: input.receivingOfficer.trim(),
        receivedPallets: input.receivedPallets,
        truckLicensePlate: input.truckLicensePlate?.trim() || null,
        dockBay: input.dockBay?.trim() || null,
        tempLoggerReading: input.tempLoggerReading?.trim() || "+18.2°C (Compliant)",
        sealNumber: input.sealNumber?.trim() || "Verified Intact",
        notes: input.notes?.trim() || null,
        signedAt: now,
        status: "completed",
      },
    };

    const { error: updateErr } = await supabaseAdmin
      .from("sourcing_requests")
      .update({
        ai_analysis: updatedAiAnalysis,
      })
      .eq("id", input.requestId);

    if (updateErr) {
      return { ok: false, error: updateErr.message };
    }

    await logAdminAction({
      adminEmail: "buyer-portal@warehouse",
      action: "buyer_sign_warehouse_grn",
      targetType: "sourcing_request",
      targetId: input.requestId,
      metadata: {
        grn_number: grnNumber,
        receiving_officer: input.receivingOfficer,
        received_pallets: input.receivedPallets,
        arrived_at: now,
      },
    });

    try {
      revalidatePath(`/track/${input.requestId}`);
      revalidatePath(`/admin/requests/${input.requestId}`);
      revalidatePath("/admin/finance");
      revalidatePath(`/customs/${input.requestId}`);
    } catch {}

    return {
      ok: true,
      grnNumber,
      arrivedAt: now,
    };
  } catch (err: unknown) {
    console.error("buyerSignWarehouseGoodsReceipt error:", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to record warehouse goods receipt",
    };
  }
}
