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

    revalidatePath(`/track/${requestId}`);
    revalidatePath(`/admin/requests/${requestId}`);
    revalidatePath(`/admin/requests`);
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

    revalidatePath(`/track/${requestId}`);
    revalidatePath(`/admin/requests/${requestId}`);
    revalidatePath(`/admin/requests`);
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

    revalidatePath(`/track/${requestId}`);
    revalidatePath(`/admin/requests/${requestId}`);
    revalidatePath(`/admin/requests`);
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

    const updatedWorkflow: CommercialOrderLifecycle = {
      ...existingWorkflow,
      production_milestones: {
        ...(existingWorkflow.production_milestones || {}),
        deposit_transferred: true,
      },
      financial_clearance: {
        ...fc,
        advance_milestone_30: {
          ...(fc.advance_milestone_30 || {}),
          status: "wire_submitted_by_buyer",
          swift_mt103_reference: input.swift_reference,
          remitter_bank: input.remitter_bank,
          wire_date: wireDate,
          wire_slip_url: input.wire_slip_url,
          notes: input.notes || "Wire slip submitted by buyer via Portal.",
        },
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
      `💰 Buyer Wire Transferred: €${Number(input.wire_amount).toLocaleString()}`,
      `[${buyerName}] submitted 30% advance deposit wire (SWIFT Ref: ${input.swift_reference}). Ready for settlement clearance and factory release.`,
      {
        requestId,
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

    revalidatePath(`/track/${requestId}`);
    revalidatePath(`/admin/requests/${requestId}`);
    revalidatePath(`/admin/requests`);
    return { ok: true };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to record wire transfer",
    };
  }
}