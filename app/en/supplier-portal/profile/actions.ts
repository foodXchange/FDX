"use server";

import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getSupplierContext } from "@/lib/supabase/getSupplierContext";
import { getImpersonationContext, IMPERSONATION_COOKIE } from "@/lib/impersonation";

export async function updateSupplierProfile(formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  const ctx = await getSupplierContext();
  if (!ctx) return { error: "Not authenticated" };

  const name = (formData.get("name") as string | null)?.trim() || null;
  const phone = (formData.get("phone") as string | null)?.trim() || null;
  const companyName = (formData.get("company_name") as string | null)?.trim() || null;
  const website = (formData.get("website") as string | null)?.trim() || null;
  const productDescription = (formData.get("product_description") as string | null)?.trim() || null;

  const cookieStore = await cookies();
  const impersonation = await getImpersonationContext(cookieStore.get(IMPERSONATION_COOKIE)?.value);

  const { error: profileError } = await supabaseAdmin
    .from("supplier_profiles")
    .update({
      name,
      phone,
      updated_at: new Date().toISOString(),
      impersonated_by: impersonation?.adminEmail ?? null,
    })
    .eq("id", ctx.user.id);

  if (profileError) return { error: profileError.message };

  if (ctx.supplierId) {
    const supplierUpdate: Record<string, string | null> = {
      website,
      product_description: productDescription,
    };
    // company_name is required on supplier_offerings — never clear it.
    if (companyName) supplierUpdate.company_name = companyName;

    const { error: supplierError } = await supabaseAdmin
      .from("supplier_offerings")
      .update(supplierUpdate)
      .eq("id", ctx.supplierId);

    if (supplierError) return { error: supplierError.message };
  }

  return { ok: true };
}
