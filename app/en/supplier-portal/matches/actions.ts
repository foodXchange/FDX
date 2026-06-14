"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getSupplierContext } from "@/lib/supabase/getSupplierContext";
import { createNotification } from "@/lib/notifications/createNotification";
import { notifyBuyerOfSupplierReply } from "@/lib/email/matchMessages";
import { getImpersonationContext, IMPERSONATION_COOKIE } from "@/lib/impersonation";
import { logEvent } from "@/lib/events/logEvent";

export type SupplierResponse = "accepted" | "countered" | "declined";

const RESPONSE_VERB: Record<SupplierResponse, string> = {
  accepted: "accepted",
  countered: "countered",
  declined: "declined",
};

export async function replyToMatch(
  matchId: string,
  response: SupplierResponse,
  message?: string
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getSupplierContext();
  if (!ctx?.supplierId) return { ok: false, error: "Not authenticated" };

  const { data: match } = await supabaseAdmin
    .from("sourcing_matches")
    .select("id, request_id, supplier_id, status, supplier_response, product_name, company_name, sourcing_requests(email)")
    .eq("id", matchId)
    .single();

  if (!match || match.supplier_id !== ctx.supplierId) return { ok: false, error: "Not found" };
  if (!["sent", "responded"].includes(match.status ?? "")) {
    return { ok: false, error: "This match can no longer be replied to" };
  }
  if (match.supplier_response) {
    return { ok: false, error: "You've already replied to this match" };
  }

  const cookieStore = await cookies();
  const impersonation = await getImpersonationContext(cookieStore.get(IMPERSONATION_COOKIE)?.value);

  const now = new Date().toISOString();

  const updates: Record<string, unknown> = {
    supplier_response: response,
    supplier_message: message?.trim() || null,
    supplier_responded_at: now,
    impersonated_by: impersonation?.adminEmail ?? null,
  };

  if (match.status === "sent") {
    updates.status = "responded";
    updates.responded_at = now;
  }

  const { error } = await supabaseAdmin
    .from("sourcing_matches")
    .update(updates)
    .eq("id", matchId);

  if (error) return { ok: false, error: error.message };

  void createNotification(
    "match_reply",
    `${match.company_name ?? "A supplier"} ${RESPONSE_VERB[response]} a match for ${match.product_name ?? "a product"}`,
    message?.trim() || undefined,
    { match_id: matchId, supplier_id: match.supplier_id, response }
  );

  void logEvent(ctx.user.id, "supplier", "supplier_replied", "match", matchId, {
    response,
    product_name: match.product_name,
  });
  if (response === "accepted") {
    void logEvent(ctx.user.id, "supplier", "deal_accepted", "match", matchId, {
      product_name: match.product_name,
    });
  }

  const buyerEmail = (match.sourcing_requests as unknown as { email: string | null } | null)?.email;
  if (buyerEmail) {
    void notifyBuyerOfSupplierReply({
      buyerEmail,
      productName: match.product_name,
      supplierCompanyName: match.company_name,
      response,
      message: message?.trim() || null,
      requestId: match.request_id,
    });
  }

  revalidatePath("/en/supplier-portal/matches");
  return { ok: true };
}
