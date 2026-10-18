"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { PipV1 } from "@/lib/pip/buildPipV1";
import { getPipForRequest } from "@/lib/pip/getPipForRequest";
import { generateOutreachMessage } from "@/lib/workflow/generateOutreachMessage";
import { createNotification } from "@/lib/notifications/createNotification";

export async function updateMatchStage(
  matchId: string,
  nextStatus: string,
  details?: { sent_via?: string; response_note?: string }
): Promise<{ ok: boolean; whatsapp_message?: string; error?: string }> {
  try {
    const now = new Date().toISOString();
    const updates: Record<string, any> = {
      status: nextStatus,
      updated_at: now,
    };

    if (nextStatus === "approved") {
      updates.approved_at = now;
    } else if (nextStatus === "sent") {
      updates.sent_at = now;
      updates.sent_via = details?.sent_via || "whatsapp";
    } else if (nextStatus === "responded") {
      updates.responded_at = now;
      if (details?.response_note) {
        updates.response_note = details.response_note;
      }
    } else if (nextStatus === "closed") {
      updates.closed_at = now;
    } else if (nextStatus === "rejected") {
      updates.rejected_at = now;
    }

    const { error: updateError } = await supabaseAdmin
      .from("sourcing_matches")
      .update(updates)
      .eq("id", matchId);

    if (updateError) {
      return { ok: false, error: updateError.message };
    }

    // If sent, log notification and schedule 72h reminder
    if (nextStatus === "sent") {
      const { data: match } = await supabaseAdmin
        .from("sourcing_matches")
        .select("supplier_id, request_id, product_name, company_name")
        .eq("id", matchId)
        .single();

      if (match) {
        void createNotification(
          "match_sent",
          `Outreach sent to ${match.company_name} for ${match.product_name}`,
          `Sent via ${details?.sent_via || "whatsapp"}. Follow-up due in 72 hours.`,
          {
            match_id: matchId,
            supplier_id: match.supplier_id,
            request_id: match.request_id,
            channel: details?.sent_via || "whatsapp",
          }
        );
      }
    }

    // If approving, generate outreach message if not yet generated
    let generatedMessage: string | undefined;
    if (nextStatus === "approved") {
      const { data: match } = await supabaseAdmin
        .from("sourcing_matches")
        .select("product_name, company_name, country, match_score, request_id, whatsapp_message")
        .eq("id", matchId)
        .single();

      if (match && !match.whatsapp_message && match.request_id) {
        try {
          const pip: PipV1 = await getPipForRequest(match.request_id);
          generatedMessage = generateOutreachMessage(pip, {
            company_name: match.company_name,
            product_name: match.product_name,
            country: match.country,
            match_score: match.match_score,
          });

          await supabaseAdmin
            .from("sourcing_matches")
            .update({ whatsapp_message: generatedMessage })
            .eq("id", matchId);
        } catch (e) {
          console.warn("Outreach message generation fallback:", e);
        }
      }
    }

    // If responding, create a notification
    if (nextStatus === "responded") {
      const { data: match } = await supabaseAdmin
        .from("sourcing_matches")
        .select("supplier_id, request_id, product_name, company_name")
        .eq("id", matchId)
        .single();

      if (match) {
        void createNotification(
          "response",
          `${match.company_name} responded to deal: ${match.product_name}`,
          details?.response_note,
          {
            match_id: matchId,
            supplier_id: match.supplier_id,
            response_note: details?.response_note ?? null,
          }
        );
      }
    }

    revalidatePath("/admin/pipeline");
    return { ok: true, whatsapp_message: generatedMessage };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Stage update failed",
    };
  }
}

export async function bulkUpdateMatchStage(
  matchIds: string[],
  nextStatus: string
): Promise<{ ok: boolean; updatedCount: number; error?: string }> {
  try {
    const now = new Date().toISOString();
    const updates: Record<string, any> = {
      status: nextStatus,
      updated_at: now,
    };

    if (nextStatus === "approved") updates.approved_at = now;
    if (nextStatus === "sent") updates.sent_at = now;
    if (nextStatus === "responded") updates.responded_at = now;
    if (nextStatus === "closed") updates.closed_at = now;
    if (nextStatus === "rejected") updates.rejected_at = now;

    const { error } = await supabaseAdmin
      .from("sourcing_matches")
      .update(updates)
      .in("id", matchIds);

    if (error) return { ok: false, updatedCount: 0, error: error.message };

    revalidatePath("/admin/pipeline");
    return { ok: true, updatedCount: matchIds.length };
  } catch (err) {
    return {
      ok: false,
      updatedCount: 0,
      error: err instanceof Error ? err.message : "Bulk update failed",
    };
  }
}

export async function autoApproveHighMatches(
  minScore = 90
): Promise<{ ok: boolean; count: number; error?: string }> {
  try {
    const now = new Date().toISOString();
    const { data: matches, error: selectErr } = await supabaseAdmin
      .from("sourcing_matches")
      .select("id")
      .in("status", ["suggested", "pending", "new"])
      .gte("match_score", minScore)
      .limit(500);

    if (selectErr) return { ok: false, count: 0, error: selectErr.message };
    if (!matches || matches.length === 0) return { ok: true, count: 0 };

    const ids = matches.map((m) => m.id);
    const { error: updateErr } = await supabaseAdmin
      .from("sourcing_matches")
      .update({ status: "approved", approved_at: now, updated_at: now })
      .in("id", ids);

    if (updateErr) return { ok: false, count: 0, error: updateErr.message };

    revalidatePath("/admin/pipeline");
    return { ok: true, count: ids.length };
  } catch (err) {
    return {
      ok: false,
      count: 0,
      error: err instanceof Error ? err.message : "Auto-approval failed",
    };
  }
}
