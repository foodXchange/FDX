import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const UpdateSampleSchema = z.object({
  status: z.enum([
    "new",
    "coordinating_factory",
    "dispatched_air",
    "customs_tlv",
    "delivered",
    "feedback_approved",
    "feedback_rejected",
  ]).optional(),
  tracking_awb: z.string().max(100).optional(),
  courier_name: z.string().max(50).optional(),
  internal_notes: z.string().max(5000).optional(),
  buyer_tasting_feedback: z.string().max(3000).optional(),
  sensory_scores: z.object({
    taste: z.number().min(1).max(5).optional(),
    texture: z.number().min(1).max(5).optional(),
    packaging: z.number().min(1).max(5).optional(),
    viability: z.number().min(1).max(5).optional(),
  }).optional(),
});

type Params = Promise<{ id: string }>;

export async function PATCH(req: Request, { params }: { params: Params }) {
  const { id } = await params;
  if (!id) {
    return Response.json({ error: "Missing sample request ID" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = UpdateSampleSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Validation failed", details: parsed.error.issues }, { status: 400 });
  }

  const { status, tracking_awb, courier_name, internal_notes, buyer_tasting_feedback, sensory_scores } = parsed.data;

  // Fetch current row to merge ai_analysis safely
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from("sourcing_requests")
    .select("id, ai_analysis, internal_notes")
    .eq("id", id)
    .single();

  if (fetchError || !existing) {
    return Response.json({ error: "Sample request not found" }, { status: 404 });
  }

  const currentAnalysis = (existing.ai_analysis as Record<string, unknown>) || {};
  const updatedAnalysis: Record<string, unknown> = {
    ...currentAnalysis,
    ...(status !== undefined ? { sample_status: status } : {}),
    ...(tracking_awb !== undefined ? { tracking_awb } : {}),
    ...(courier_name !== undefined ? { courier_name } : {}),
    ...(buyer_tasting_feedback !== undefined ? { buyer_tasting_feedback } : {}),
  };

  if (sensory_scores) {
    const scores = Object.values(sensory_scores).filter(Boolean) as number[];
    const avgScore = scores.length > 0 ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)) : undefined;
    updatedAnalysis.sensory_scores = {
      ...((currentAnalysis.sensory_scores as Record<string, unknown>) || {}),
      ...sensory_scores,
      overall: avgScore,
    };
  }

  const updatePayload: Record<string, unknown> = {
    ai_analysis: updatedAnalysis,
  };

  // Keep sourcing_requests.status compliant with check constraint ('new', 'matched', 'closed')
  if (status === "feedback_approved" || status === "feedback_rejected") {
    updatePayload.status = "closed";
  } else if (status === "dispatched_air" || status === "customs_tlv" || status === "delivered") {
    updatePayload.status = "matched";
  } else if (status === "new" || status === "coordinating_factory") {
    updatePayload.status = "new";
  }

  if (internal_notes !== undefined) {
    updatePayload.internal_notes = internal_notes;
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from("sourcing_requests")
    .update(updatePayload)
    .eq("id", id)
    .select()
    .single();

  if (updateError) {
    console.error("Error updating sample request:", updateError);
    return Response.json({ error: "Failed to update sample request" }, { status: 500 });
  }

  return Response.json({ success: true, updated });
}
