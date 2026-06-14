"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getImpersonationContext, IMPERSONATION_COOKIE } from "@/lib/impersonation";

export async function updateBuyerProfile(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const name = (formData.get("name") as string | null)?.trim() || null;
  const company = (formData.get("company") as string | null)?.trim() || null;
  const phone = (formData.get("phone") as string | null)?.trim() || null;

  const cookieStore = await cookies();
  const impersonation = await getImpersonationContext(cookieStore.get(IMPERSONATION_COOKIE)?.value);

  const { error } = await supabaseAdmin
    .from("buyer_profiles")
    .update({
      name,
      company,
      phone,
      updated_at: new Date().toISOString(),
      impersonated_by: impersonation?.adminEmail ?? null,
    })
    .eq("id", user.id);

  if (error) return { error: error.message };
  return { ok: true };
}
