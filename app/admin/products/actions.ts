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
  formats?: string[];
  product_type?: string | null;
  private_label?: boolean;
  manually_verified?: boolean;
  needs_review?: boolean;
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

export async function bulkAddKosher(
  ids: string[],
  kosherType: string
): Promise<{ ok: boolean; error?: string }> {
  if (ids.length === 0) return { ok: true };

  const { data, error: fetchError } = await supabaseAdmin
    .from("supplier_products")
    .select("id, kosher_types")
    .in("id", ids);

  if (fetchError || !data) return { ok: false, error: fetchError?.message };

  for (const row of data as { id: string; kosher_types: string[] }[]) {
    const merged = Array.from(
      new Set([...(row.kosher_types ?? []), kosherType])
    );
    await supabaseAdmin
      .from("supplier_products")
      .update({ kosher_types: merged })
      .eq("id", row.id);
  }

  revalidatePath("/admin/products");
  return { ok: true };
}

export async function bulkAddCertification(
  ids: string[],
  cert: string
): Promise<{ ok: boolean; error?: string }> {
  if (ids.length === 0) return { ok: true };

  const { data, error: fetchError } = await supabaseAdmin
    .from("supplier_products")
    .select("id, certifications")
    .in("id", ids);

  if (fetchError || !data) return { ok: false, error: fetchError?.message };

  for (const row of data as { id: string; certifications: string[] }[]) {
    const merged = Array.from(
      new Set([...(row.certifications ?? []), cert])
    );
    await supabaseAdmin
      .from("supplier_products")
      .update({ certifications: merged })
      .eq("id", row.id);
  }

  revalidatePath("/admin/products");
  return { ok: true };
}

export async function bulkMarkVerified(
  ids: string[]
): Promise<{ ok: boolean; error?: string }> {
  if (ids.length === 0) return { ok: true };

  const { error } = await supabaseAdmin
    .from("supplier_products")
    .update({ manually_verified: true, needs_review: false })
    .in("id", ids);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/products");
  return { ok: true };
}
