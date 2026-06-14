"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getSupplierContext } from "@/lib/supabase/getSupplierContext";
import { getImpersonationContext, IMPERSONATION_COOKIE } from "@/lib/impersonation";

export interface SupplierPortalProductData {
  product_name: string;
  category: string;
  description: string | null;
  certifications: string[];
  kosher_types: string[];
  private_label: boolean;
  image_url: string | null;
  image_source: string | null;
}

export async function createSupplierProduct(
  data: SupplierPortalProductData
): Promise<{ ok: boolean; error?: string; id?: string }> {
  const ctx = await getSupplierContext();
  if (!ctx?.supplierId) return { ok: false, error: "Not authenticated" };

  const cookieStore = await cookies();
  const impersonation = await getImpersonationContext(cookieStore.get(IMPERSONATION_COOKIE)?.value);

  const { data: inserted, error } = await supabaseAdmin
    .from("supplier_products")
    .insert({
      supplier_id: ctx.supplierId,
      scrape_source: "supplier_portal",
      scrape_confidence: 1.0,
      is_published: false,
      manually_verified: false,
      ...data,
      impersonated_by: impersonation?.adminEmail ?? null,
    })
    .select("id")
    .single();

  if (error || !inserted) return { ok: false, error: error?.message ?? "Insert failed" };
  revalidatePath("/en/supplier-portal/products");
  return { ok: true, id: inserted.id as string };
}

export async function updateSupplierProduct(
  productId: string,
  data: SupplierPortalProductData
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getSupplierContext();
  if (!ctx?.supplierId) return { ok: false, error: "Not authenticated" };

  const { data: existing } = await supabaseAdmin
    .from("supplier_products")
    .select("supplier_id")
    .eq("id", productId)
    .maybeSingle();

  if (!existing || existing.supplier_id !== ctx.supplierId) {
    return { ok: false, error: "Product not found" };
  }

  const cookieStore = await cookies();
  const impersonation = await getImpersonationContext(cookieStore.get(IMPERSONATION_COOKIE)?.value);

  const { error } = await supabaseAdmin
    .from("supplier_products")
    .update({ ...data, impersonated_by: impersonation?.adminEmail ?? null })
    .eq("id", productId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/en/supplier-portal/products");
  return { ok: true };
}

export async function deleteSupplierProduct(productId: string): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getSupplierContext();
  if (!ctx?.supplierId) return { ok: false, error: "Not authenticated" };

  const { data: existing } = await supabaseAdmin
    .from("supplier_products")
    .select("supplier_id")
    .eq("id", productId)
    .maybeSingle();

  if (!existing || existing.supplier_id !== ctx.supplierId) {
    return { ok: false, error: "Product not found" };
  }

  const { error } = await supabaseAdmin.from("supplier_products").delete().eq("id", productId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/en/supplier-portal/products");
  return { ok: true };
}
