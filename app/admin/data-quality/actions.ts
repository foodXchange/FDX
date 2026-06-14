"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function mapProductsToCategory(
  categoryText: string,
  categoryId: string
): Promise<{ ok: boolean; updated: number; error?: string }> {
  const lower = categoryText.toLowerCase().trim();

  const [productsResult, offeringsResult] = await Promise.all([
    supabaseAdmin
      .from("supplier_products")
      .update({ category_id: categoryId })
      .filter("category_id", "is", null)
      .ilike("category", `%${lower}%`),
    supabaseAdmin.rpc("map_offerings_category", {
      category_text: lower,
      cat_id: categoryId,
    }),
  ]);

  if (productsResult.error) {
    return { ok: false, updated: 0, error: productsResult.error.message };
  }

  // Fallback: update supplier_offerings directly if RPC not available
  if (offeringsResult.error) {
    await supabaseAdmin
      .from("supplier_offerings")
      .update({ category_id: categoryId })
      .filter("category_id", "is", null)
      .contains("categories", [categoryText]);
  }

  revalidatePath("/admin/data-quality");
  return { ok: true, updated: (productsResult.count ?? 0) };
}

export async function mapProductsToCategoryDirect(
  categoryText: string,
  categoryId: string
): Promise<{ ok: boolean; error?: string }> {
  const { error: err1 } = await supabaseAdmin
    .from("supplier_products")
    .update({ category_id: categoryId })
    .is("category_id", null)
    .ilike("category", `%${categoryText}%`);

  if (err1) return { ok: false, error: err1.message };

  // supplier_offerings: match against first element of categories array
  const { data: offerings } = await supabaseAdmin
    .from("supplier_offerings")
    .select("id, categories")
    .is("category_id", null)
    .not("categories", "is", null);

  const toUpdate = ((offerings ?? []) as { id: string; categories: string[] }[])
    .filter((o) =>
      (o.categories ?? []).some(
        (c) => c.toLowerCase().includes(categoryText.toLowerCase())
      )
    )
    .map((o) => o.id);

  if (toUpdate.length > 0) {
    await supabaseAdmin
      .from("supplier_offerings")
      .update({ category_id: categoryId })
      .in("id", toUpdate);
  }

  revalidatePath("/admin/data-quality");
  return { ok: true };
}

export async function markSupplierDuplicate(
  duplicateId: string,
  keepId: string
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabaseAdmin
    .from("supplier_offerings")
    .update({ duplicate_of_supplier_id: keepId })
    .eq("id", duplicateId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/data-quality");
  return { ok: true };
}

export async function approveAllDuplicates(
  pairs: { duplicate_id: string; keep_id: string }[]
): Promise<{ ok: boolean; updated: number; error?: string }> {
  const results = await Promise.all(
    pairs.map((p) =>
      supabaseAdmin
        .from("supplier_offerings")
        .update({ duplicate_of_supplier_id: p.keep_id })
        .eq("id", p.duplicate_id)
    )
  );

  const failed = results.find((r) => r.error);
  if (failed?.error) return { ok: false, updated: 0, error: failed.error.message };

  revalidatePath("/admin/data-quality");
  return { ok: true, updated: pairs.length };
}
