"use server";

import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { revalidatePath } from "next/cache";

const ProductSchema = z.object({
  product_name: z.string().min(1).max(300),
  brand_name: z.string().max(200).optional().nullable(),
  tagline: z.string().max(200).optional().nullable(),
  category: z.string().min(1),
  subcategory: z.string().optional().nullable(),
  format: z.string().optional().nullable(),
  size: z.string().optional().nullable(),
  country_of_origin: z.string().optional().nullable(),
  certifications: z.array(z.string()).default([]),
  private_label_available: z.boolean().default(false),
  catalogue_image_url: z.string().optional().nullable(),
  image_prompt: z.string().optional().nullable(),
  brand_name_rationale: z.string().optional().nullable(),
  status: z.enum(["draft", "ready", "archived"]).default("draft"),
  featured: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
  supplier_id: z.string().uuid().optional().nullable(),
  internal_notes: z.string().optional().nullable(),
});

export type CatalogueProductInput = z.infer<typeof ProductSchema>;

export type CatalogueProduct = CatalogueProductInput & {
  id: string;
  created_at: string;
  updated_at: string;
};

export async function createCatalogueProduct(
  data: CatalogueProductInput
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const parsed = ProductSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { data: row, error } = await supabaseAdmin
    .from("catalogue_products")
    .insert(parsed.data)
    .select("id")
    .single();

  if (error) {
    console.error("createCatalogueProduct error:", error);
    return { ok: false, error: "Database error" };
  }

  revalidatePath("/admin/catalogue");
  return { ok: true, id: row.id as string };
}

export async function updateCatalogueProduct(
  id: string,
  data: CatalogueProductInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = ProductSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { error } = await supabaseAdmin
    .from("catalogue_products")
    .update(parsed.data)
    .eq("id", id);

  if (error) {
    console.error("updateCatalogueProduct error:", error);
    return { ok: false, error: "Database error" };
  }

  revalidatePath("/admin/catalogue");
  revalidatePath(`/admin/catalogue/${id}`);
  return { ok: true };
}

export async function deleteCatalogueProduct(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabaseAdmin
    .from("catalogue_products")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("deleteCatalogueProduct error:", error);
    return { ok: false, error: "Database error" };
  }

  revalidatePath("/admin/catalogue");
  return { ok: true };
}

export async function updateImageUrl(
  id: string,
  url: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabaseAdmin
    .from("catalogue_products")
    .update({ catalogue_image_url: url })
    .eq("id", id);

  if (error) {
    console.error("updateImageUrl error:", error);
    return { ok: false, error: "Database error" };
  }

  revalidatePath(`/admin/catalogue/${id}`);
  return { ok: true };
}

export async function linkCatalogueProductToRequest(
  catalogueProductId: string,
  requestId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: product } = await supabaseAdmin
    .from("catalogue_products")
    .select("product_name, supplier_id, country_of_origin")
    .eq("id", catalogueProductId)
    .single();

  if (!product) {
    return { ok: false, error: "Product not found" };
  }

  if (!product.supplier_id) {
    return { ok: false, error: "This product has no linked supplier" };
  }

  const { data: supplier } = await supabaseAdmin
    .from("supplier_offerings")
    .select("company_name, country_of_origin")
    .eq("id", product.supplier_id)
    .single();

  const { data: existing } = await supabaseAdmin
    .from("sourcing_matches")
    .select("id")
    .eq("request_id", requestId)
    .eq("supplier_id", product.supplier_id)
    .eq("product_name", product.product_name)
    .maybeSingle();

  if (existing) {
    return { ok: true };
  }

  const { error } = await supabaseAdmin.from("sourcing_matches").insert({
    request_id: requestId,
    supplier_id: product.supplier_id,
    product_name: product.product_name,
    company_name: supplier?.company_name ?? null,
    country: product.country_of_origin ?? supplier?.country_of_origin ?? null,
    match_score: 100,
    match_summary: "Manually linked from catalogue",
    status: "suggested",
  });

  if (error) {
    console.error("linkCatalogueProductToRequest error:", error);
    return { ok: false, error: "Database error" };
  }

  revalidatePath("/admin/catalogue");
  revalidatePath("/admin/requests");
  return { ok: true };
}

export async function duplicateCatalogueProduct(
  id: string
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const { data: original, error: fetchError } = await supabaseAdmin
    .from("catalogue_products")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !original) {
    return { ok: false, error: "Product not found" };
  }

  const { id: _id, created_at, updated_at, ...rest } = original;

  const { data: row, error } = await supabaseAdmin
    .from("catalogue_products")
    .insert({
      ...rest,
      product_name: `Copy of ${original.product_name}`,
      status: "draft",
      featured: false,
    })
    .select("id")
    .single();

  if (error) {
    console.error("duplicateCatalogueProduct error:", error);
    return { ok: false, error: "Database error" };
  }

  revalidatePath("/admin/catalogue");
  return { ok: true, id: row.id as string };
}
