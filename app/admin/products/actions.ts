"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type ProductUpdate = {
  product_name?: string;
  category?: string;
  subcategory?: string | null;
  description?: string | null;
  certifications?: string[];
  kosher_types?: string[];
  product_type?: string | null;
  private_label?: boolean;
  manually_verified?: boolean;
};

export async function updateProduct(
  id: string,
  data: ProductUpdate
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabaseAdmin
    .from("supplier_products")
    .update(data)
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/products");
  return { ok: true };
}

export async function deleteProduct(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabaseAdmin
    .from("supplier_products")
    .delete()
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/products");
  return { ok: true };
}

export async function bulkUpdateProducts(
  ids: string[],
  data: ProductUpdate
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabaseAdmin
    .from("supplier_products")
    .update(data)
    .in("id", ids);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/products");
  return { ok: true };
}

export async function bulkDeleteProducts(
  ids: string[]
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabaseAdmin
    .from("supplier_products")
    .delete()
    .in("id", ids);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/products");
  return { ok: true };
}
