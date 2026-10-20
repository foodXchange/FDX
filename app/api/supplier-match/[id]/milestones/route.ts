import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/lib/notifications/createNotification";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: matchId } = await context.params;
    if (!matchId) {
      return NextResponse.json({ error: "Missing match ID" }, { status: 400 });
    }

    const body = await req.json();
    const {
      milestoneKey,
      milestoneValue,
      shippingLine,
      containerNumber,
      billOfLading,
      etd,
      eta,
      batchLotNumber,
      notes,
    } = body;

    // 1. Fetch match to locate request
    const { data: match, error: matchErr } = await supabaseAdmin
      .from("sourcing_matches")
      .select("id, request_id, company_name, product_name, match_breakdown")
      .eq("id", matchId)
      .single();

    if (matchErr || !match) {
      return NextResponse.json(
        { error: matchErr?.message || "Match not found" },
        { status: 404 }
      );
    }

    const requestId = match.request_id;
    if (!requestId) {
      return NextResponse.json(
        { error: "Match has no associated sourcing request" },
        { status: 400 }
      );
    }

    // 2. Fetch sourcing request
    const { data: sReq, error: reqErr } = await supabaseAdmin
      .from("sourcing_requests")
      .select("id, company, product_name, ai_analysis")
      .eq("id", requestId)
      .single();

    if (reqErr || !sReq) {
      return NextResponse.json(
        { error: reqErr?.message || "Request not found" },
        { status: 404 }
      );
    }

    const existingAi = (sReq.ai_analysis as Record<string, unknown> | null) ?? {};
    const existingWorkflow = (existingAi.order_workflow as Record<string, unknown> | null) ?? {};
    const existingMilestones = (existingWorkflow.production_milestones as Record<string, boolean> | null) ?? {};

    const updatedMilestones = {
      ...existingMilestones,
    };

    if (milestoneKey) {
      updatedMilestones[milestoneKey] = Boolean(milestoneValue);
    }

    // Determine production status
    let prodStatus = existingWorkflow.production_status || "in_production";
    if (updatedMilestones.container_loaded) {
      prodStatus = "ready_to_load";
    } else if (updatedMilestones.psi_inspection_passed) {
      prodStatus = "qc_inspection_passed";
    } else if (updatedMilestones.bottling_completed) {
      prodStatus = "qc_inspection_passed";
    } else if (updatedMilestones.deposit_transferred) {
      prodStatus = "in_production";
    }

    const now = new Date().toISOString();

    const updatedWorkflow = {
      ...existingWorkflow,
      production_status: prodStatus,
      production_milestones: updatedMilestones,
      shipping_line: shippingLine || existingWorkflow.shipping_line || "MSC",
      container_number: containerNumber || existingWorkflow.container_number || "",
      bill_of_lading: billOfLading || existingWorkflow.bill_of_lading || "",
      etd: etd || existingWorkflow.etd || "",
      eta_port: eta || existingWorkflow.eta_port || "",
      logistics_notes: notes || existingWorkflow.logistics_notes || "",
      updated_at: now,
      updated_by: `Supplier: ${match.company_name || "Factory Portal"}`,
    };

    // 3. Update sourcing request
    const { error: updateReqErr } = await supabaseAdmin
      .from("sourcing_requests")
      .update({
        ai_analysis: {
          ...existingAi,
          order_workflow: updatedWorkflow,
        },
      })
      .eq("id", requestId);

    if (updateReqErr) {
      return NextResponse.json({ error: updateReqErr.message }, { status: 500 });
    }

    // 4. Update match breakdown
    const mBreakdown = (match.match_breakdown as Record<string, unknown> | null) ?? {};
    const factoryUpdates = (mBreakdown.factory_milestones as Record<string, unknown> | null) ?? {};
    
    await supabaseAdmin
      .from("sourcing_matches")
      .update({
        match_breakdown: {
          ...mBreakdown,
          factory_milestones: {
            ...factoryUpdates,
            [milestoneKey || "general_update"]: {
              updated_at: now,
              lot_number: batchLotNumber || null,
              notes: notes || null,
            },
            latest_container_number: containerNumber || null,
            latest_bill_of_lading: billOfLading || null,
          },
        },
      })
      .eq("id", matchId);

    // 5. Create Admin & Buyer notification
    const supplierTitle = match.company_name || "European Factory";
    await createNotification(
      "match_reply",
      `🏭 Factory Update: ${supplierTitle} updated production milestone [${milestoneKey || "Logistics"}]`
    );

    try {
      revalidatePath(`/supplier-match/${matchId}`);
      revalidatePath(`/admin/requests/${requestId}`);
      revalidatePath(`/track/${requestId}`);
    } catch {}

    return NextResponse.json({
      ok: true,
      milestones: updatedMilestones,
      productionStatus: prodStatus,
    });
  } catch (err) {
    console.error("supplier milestone route error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
