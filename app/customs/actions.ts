"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { CommercialOrderLifecycle } from "@/app/admin/requests/actions";

export interface CustomsClearanceInput {
  requestId: string;
  customsDeclarationNumber: string;
  releaseChannel: "green" | "document_inspection" | "physical_check";
  gatePassNumber?: string;
  clearingAgentName: string;
  clearingAgency: string;
  notes?: string;
}

export async function submitCustomsBrokerClearance(
  input: CustomsClearanceInput
): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  try {
    if (!input.requestId) {
      return { ok: false, error: "Missing requestId" };
    }
    if (!input.customsDeclarationNumber || input.customsDeclarationNumber.trim().length < 3) {
      return { ok: false, error: "נא להזין מספר הצהרת יבוא / רשימון תקין" };
    }
    if (!input.clearingAgentName || input.clearingAgentName.trim().length < 2) {
      return { ok: false, error: "נא לציין את שם עמיל המכס המטפל" };
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

    const updatedWorkflow: CommercialOrderLifecycle = {
      ...existingWorkflow,
      current_stage: "customs_warehouse",
      customs_status: "customs_cleared",
      customs_declaration_number: input.customsDeclarationNumber.trim(),
      delivery_status: "inland_trucking",
      updated_at: now,
      updated_by: `Customs Broker: ${input.clearingAgentName} (${input.clearingAgency})`,
    };

    const updatedAiAnalysis = {
      ...existingAi,
      order_workflow: updatedWorkflow,
      customs_clearance_signoff: {
        customsDeclarationNumber: input.customsDeclarationNumber.trim(),
        releaseChannel: input.releaseChannel,
        gatePassNumber: input.gatePassNumber?.trim() || null,
        clearingAgentName: input.clearingAgentName.trim(),
        clearingAgency: input.clearingAgency.trim(),
        notes: input.notes?.trim() || null,
        clearedAt: now,
        status: "cleared",
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

    // Revalidate relevant cache paths
    revalidatePath(`/customs/${input.requestId}`);
    revalidatePath(`/track/${input.requestId}`);
    revalidatePath(`/admin/requests/${input.requestId}`);
    revalidatePath("/admin/finance");

    return {
      ok: true,
      message: `הצהרת יבוא #${input.customsDeclarationNumber} נרשמה בהצלחה במסלול ירוק! המכולה אושרה להתרת שער (Gate-Out) ולהובלה יבשתית.`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `שגיאה באישור שחרור המכס: ${msg}` };
  }
}
