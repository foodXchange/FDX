"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { logAdminAction } from "@/lib/auditLog";
import { createNotification } from "@/lib/notifications/createNotification";
import type { CommercialOrderLifecycle } from "@/app/admin/requests/actions";

export interface FactoryMilestoneUpdateInput {
  requestId: string;
  milestoneKey: "raw_materials_procured" | "bottling_completed" | "psi_inspection_passed" | "container_loaded";
  completed: boolean;
  notes?: string;
  updatedBy?: string;
}

export async function updateFactoryProductionMilestone(
  input: FactoryMilestoneUpdateInput
): Promise<{ ok: boolean; error?: string; message?: string }> {
  try {
    const { data: req, error: fetchErr } = await supabaseAdmin
      .from("sourcing_requests")
      .select("ai_analysis, product_name, company")
      .eq("id", input.requestId)
      .maybeSingle();

    if (fetchErr || !req) {
      return { ok: false, error: fetchErr?.message || "Request not found" };
    }

    const ai = (req.ai_analysis ?? {}) as Record<string, unknown>;
    const wf = (ai.order_workflow ?? {}) as CommercialOrderLifecycle;
    const existingMilestones = wf.production_milestones ?? {};

    const updatedMilestones = {
      ...existingMilestones,
      [input.milestoneKey]: input.completed,
    };

    // Auto-advance workflow production status if all key manufacturing stages passed
    let productionStatus = wf.production_status || "queued";
    if (updatedMilestones.container_loaded) {
      productionStatus = "ready_to_load";
    } else if (updatedMilestones.psi_inspection_passed) {
      productionStatus = "qc_inspection_passed";
    } else if (updatedMilestones.raw_materials_procured || updatedMilestones.bottling_completed) {
      productionStatus = "in_production";
    }

    const updatedWorkflow: CommercialOrderLifecycle = {
      ...wf,
      production_status: productionStatus,
      production_milestones: updatedMilestones,
      updated_at: new Date().toISOString(),
      updated_by: input.updatedBy || "Factory Production Desk",
    };

    const { error: updateErr } = await supabaseAdmin
      .from("sourcing_requests")
      .update({
        ai_analysis: {
          ...ai,
          order_workflow: updatedWorkflow,
        },
      })
      .eq("id", input.requestId);

    if (updateErr) {
      return { ok: false, error: updateErr.message };
    }

    // Notify broker desk
    const milestoneLabels: Record<string, string> = {
      raw_materials_procured: "Raw Materials Procured & Batch Verified",
      bottling_completed: "Bottling / Canning Completed",
      psi_inspection_passed: "Pre-Shipment Quality Control (PSI) Passed",
      container_loaded: "Container Stretched, Palletized & Loaded",
    };

    const friendlyLabel = milestoneLabels[input.milestoneKey] || input.milestoneKey;

    await createNotification(
      "match_reply",
      `🏭 Factory Milestone Updated: ${friendlyLabel}`,
      `European supplier marked [${friendlyLabel}] as ${input.completed ? "COMPLETED ✓" : "PENDING"}. Workflow updated.`,
      { requestId: input.requestId }
    );

    await logAdminAction({
      adminEmail: "factory-portal@europe",
      action: "factory_update_milestone",
      targetType: "sourcing_request",
      targetId: input.requestId,
      metadata: {
        milestone: input.milestoneKey,
        completed: input.completed,
        updated_by: input.updatedBy,
        notes: input.notes,
      },
    });

    try {
      revalidatePath(`/factory/${input.requestId}`);
      revalidatePath(`/track/${input.requestId}`);
      revalidatePath(`/admin/requests/${input.requestId}`);
      revalidatePath(`/customs/${input.requestId}`);
      revalidatePath("/track");
    } catch {}

    return {
      ok: true,
      message: `Milestone ${friendlyLabel} updated successfully`,
    };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to update milestone",
    };
  }
}

export interface FactoryProofPhoto {
  category: "pallet_label" | "bolt_seal" | "temp_logger" | "bill_of_lading" | "factory_line";
  url: string;
  caption?: string;
  timestamp: string;
}

export interface FactoryLoadingProofInput {
  requestId: string;
  containerNumber: string;
  sealNumber: string;
  tempLoggerReading?: string;
  departurePort?: string;
  estimatedDepartureDate?: string;
  photos: FactoryProofPhoto[];
  exportOfficerName: string;
  notes?: string;
}

export async function submitFactoryLoadingProof(
  input: FactoryLoadingProofInput
): Promise<{ ok: boolean; error?: string; message?: string }> {
  try {
    const { data: req, error: fetchErr } = await supabaseAdmin
      .from("sourcing_requests")
      .select("ai_analysis, product_name, company")
      .eq("id", input.requestId)
      .maybeSingle();

    if (fetchErr || !req) {
      return { ok: false, error: fetchErr?.message || "Request not found" };
    }

    const ai = (req.ai_analysis ?? {}) as Record<string, unknown>;
    const wf = (ai.order_workflow ?? {}) as CommercialOrderLifecycle;
    const existingMilestones = wf.production_milestones ?? {};

    const updatedWorkflow: CommercialOrderLifecycle = {
      ...wf,
      container_number: input.containerNumber.trim().toUpperCase(),
      port_of_origin: input.departurePort || wf.port_of_origin || "Valencia / Genoa Pier",
      etd: input.estimatedDepartureDate || wf.etd || new Date().toISOString().split("T")[0],
      production_status: "ready_to_load",
      production_milestones: {
        ...existingMilestones,
        bottling_completed: true,
        psi_inspection_passed: true,
        container_loaded: true,
      },
      updated_at: new Date().toISOString(),
      updated_by: `Factory (${input.exportOfficerName})`,
    };

    const newProofRecord = {
      containerNumber: input.containerNumber.trim().toUpperCase(),
      sealNumber: input.sealNumber.trim(),
      tempLoggerReading: input.tempLoggerReading?.trim() || "+18.2°C Certified",
      departurePort: input.departurePort || "Port of Valencia / Genoa",
      estimatedDepartureDate: input.estimatedDepartureDate,
      exportOfficerName: input.exportOfficerName.trim(),
      notes: input.notes?.trim() || null,
      submittedAt: new Date().toISOString(),
      photos: input.photos,
    };

    const { error: updateErr } = await supabaseAdmin
      .from("sourcing_requests")
      .update({
        ai_analysis: {
          ...ai,
          order_workflow: updatedWorkflow,
          factory_loading_proof: newProofRecord,
        },
      })
      .eq("id", input.requestId);

    if (updateErr) {
      return { ok: false, error: updateErr.message };
    }

    await createNotification(
      "match_reply",
      `🚢 Factory Proof Submitted: Container #${input.containerNumber}`,
      `European factory verified container loading with bolt seal #${input.sealNumber} and attached inspection photos! Ready for ocean B/L release.`,
      { requestId: input.requestId }
    );

    await logAdminAction({
      adminEmail: "factory-portal@europe",
      action: "factory_submit_loading_proof",
      targetType: "sourcing_request",
      targetId: input.requestId,
      metadata: {
        container_number: input.containerNumber,
        seal_number: input.sealNumber,
        officer: input.exportOfficerName,
        photos_count: input.photos.length,
      },
    });

    try {
      revalidatePath(`/factory/${input.requestId}`);
      revalidatePath(`/track/${input.requestId}`);
      revalidatePath(`/admin/requests/${input.requestId}`);
      revalidatePath(`/customs/${input.requestId}`);
      revalidatePath("/track");
    } catch {}

    return {
      ok: true,
      message: `Container loading proof and seal #${input.sealNumber} recorded successfully!`,
    };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to record factory loading proof",
    };
  }
}
