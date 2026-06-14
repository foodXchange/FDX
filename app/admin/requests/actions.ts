"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { revalidatePath } from "next/cache";
import { getAdminEmail } from "@/lib/adminAuth";
import { logAdminAction } from "@/lib/auditLog";

export async function updateRequestStatus(
  id: string,
  status: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabaseAdmin
    .from("sourcing_requests")
    .update({ status })
    .eq("id", id);

  if (error) {
    console.error("updateRequestStatus error:", error);
    return { ok: false, error: error.message };
  }

  revalidatePath("/admin/requests");
  return { ok: true };
}

export interface CreateRequestForBuyerInput {
  buyer_id: string;
  name: string;
  email: string | null;
  company: string | null;
  product_name: string | null;
  category: string | null;
  message: string | null;
  certifications: string[];
  target_market: string | null;
  private_label: boolean;
}

export async function createRequestForBuyer(
  input: CreateRequestForBuyerInput
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const { data: buyer } = await supabaseAdmin
    .from("buyers")
    .select("contact_email")
    .eq("id", input.buyer_id)
    .single();

  const { data: newRequest, error } = await supabaseAdmin
    .from("sourcing_requests")
    .insert({
      buyer_id: input.buyer_id,
      name: input.name,
      email: input.email,
      company: input.company,
      product_name: input.product_name,
      category: input.category,
      message: input.message,
      certifications: input.certifications,
      target_market: input.target_market,
      private_label: input.private_label,
      source: "admin_on_behalf",
      status: "new",
    })
    .select("id")
    .single();

  if (error || !newRequest) {
    console.error("createRequestForBuyer error:", error);
    return { ok: false, error: error?.message ?? "Failed to create request" };
  }

  await logAdminAction({
    adminEmail: getAdminEmail(),
    action: "acted_on_behalf",
    targetType: "buyer",
    targetId: input.buyer_id,
    targetEmail: (buyer?.contact_email as string | null) ?? null,
    metadata: { sourcing_request_id: newRequest.id, note: "Submitted request on behalf of buyer" },
  });

  revalidatePath("/admin/requests");
  return { ok: true, id: newRequest.id as string };
}
