"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import crypto from "crypto";
import { revalidatePath } from "next/cache";

function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw.trim()).digest("hex");
}

export async function confirmBriefFromBuyerLink(
  token: string,
  confirmedByName?: string,
  notes?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    if (!token) return { ok: false, error: "Missing token" };

    const tokenHash = hashToken(token);
    const { data: tokenRow, error: tErr } = await supabaseAdmin
      .from("brief_tokens")
      .select("id, request_id, brief_version, expires_at, revoked_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (tErr || !tokenRow) {
      return { ok: false, error: "Brief confirmation link not found or invalid." };
    }

    if (tokenRow.revoked_at) {
      return { ok: false, error: "This confirmation link has been revoked." };
    }

    if (new Date(tokenRow.expires_at) < new Date()) {
      return { ok: false, error: "This confirmation link has expired. Please ask the deal desk for a new link." };
    }

    const nowIso = new Date().toISOString();
    const actor = confirmedByName?.trim() || "Buyer (Verified Link)";

    // Fetch existing ai_analysis to preserve fields
    const { data: existingReq } = await supabaseAdmin
      .from("sourcing_requests")
      .select("ai_analysis")
      .eq("id", tokenRow.request_id)
      .single();

    const currentAi = (existingReq?.ai_analysis as Record<string, unknown> | null) ?? {};

    const { error: updateErr } = await supabaseAdmin
      .from("sourcing_requests")
      .update({
        brief_status: "confirmed",
        confirmed_at: nowIso,
        confirmed_by: actor,
        confirmed_via: "buyer_link",
        ai_analysis: {
          ...currentAi,
          buyer_brief_approval: {
            status: "approved",
            approved_at: nowIso,
            approved_by: actor,
            notes: notes?.trim() || "Confirmed via digital buyer brief link",
          },
        },
      })
      .eq("id", tokenRow.request_id);

    if (updateErr) {
      return { ok: false, error: updateErr.message };
    }

    // Activity log entry
    await supabaseAdmin.from("sourcing_request_activity").insert({
      request_id: tokenRow.request_id,
      version: tokenRow.brief_version || 1,
      type: "confirmed",
      actor_type: "buyer",
      actor_name: actor,
      comment: notes?.trim() || "Buyer clicked Confirm Sourcing Brief",
    });

    revalidatePath(`/brief/${token}`);
    revalidatePath("/admin/requests");
    revalidatePath(`/admin/requests/${tokenRow.request_id}`);

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to confirm brief" };
  }
}

export async function requestChangesFromBuyerLink(
  token: string,
  requestedByName?: string,
  feedbackNotes?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    if (!token) return { ok: false, error: "Missing token" };
    if (!feedbackNotes || !feedbackNotes.trim()) {
      return { ok: false, error: "Please enter your requested adjustments or notes." };
    }

    const tokenHash = hashToken(token);
    const { data: tokenRow, error: tErr } = await supabaseAdmin
      .from("brief_tokens")
      .select("id, request_id, brief_version, expires_at, revoked_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (tErr || !tokenRow) {
      return { ok: false, error: "Brief link not found or invalid." };
    }

    if (tokenRow.revoked_at) {
      return { ok: false, error: "This confirmation link has been revoked." };
    }

    const nowIso = new Date().toISOString();
    const actor = requestedByName?.trim() || "Buyer (Verified Link)";

    const { data: existingReq } = await supabaseAdmin
      .from("sourcing_requests")
      .select("ai_analysis")
      .eq("id", tokenRow.request_id)
      .single();

    const currentAi = (existingReq?.ai_analysis as Record<string, unknown> | null) ?? {};

    const { error: updateErr } = await supabaseAdmin
      .from("sourcing_requests")
      .update({
        brief_status: "changes_requested",
        ai_analysis: {
          ...currentAi,
          buyer_brief_approval: {
            status: "changes_requested",
            updated_at: nowIso,
            requested_by: actor,
            feedback: feedbackNotes.trim(),
          },
        },
      })
      .eq("id", tokenRow.request_id);

    if (updateErr) {
      return { ok: false, error: updateErr.message };
    }

    await supabaseAdmin.from("sourcing_request_activity").insert({
      request_id: tokenRow.request_id,
      version: tokenRow.brief_version || 1,
      type: "changes_requested",
      actor_type: "buyer",
      actor_name: actor,
      comment: feedbackNotes.trim(),
    });

    revalidatePath(`/brief/${token}`);
    revalidatePath("/admin/requests");
    revalidatePath(`/admin/requests/${tokenRow.request_id}`);

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to submit change request" };
  }
}
