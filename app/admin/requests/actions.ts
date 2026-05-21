"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { revalidatePath } from "next/cache";

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
