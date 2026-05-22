"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export interface FactoryFormData {
  factory_name: string;
  country: string | null;
  city: string | null;
  kosher_types: string[];
  kosher_certifying_body: string | null;
  kosher_passover: boolean;
  kosher_year_round: boolean;
  certifications_quality: string[];
  brc_grade: string | null;
  ifs_grade: string | null;
  certifications_dietary: string[];
  production_capacity: string | null;
  notes: string | null;
}

export interface ProductFormData {
  product_name: string;
  category: string;
  subcategory: string | null;
  description: string | null;
  formats: string[];
  sizes: string[];
  certifications: string[];
  kosher_types: string[];
  product_type: string | null;
  primary_ingredients: string[];
  private_label: boolean;
  tags: string[];
  markets_suitable: string[];
  manually_verified: boolean;
  factory_id: string | null;
}

export async function saveFactory(
  supplierId: string,
  factoryId: string | null,
  data: FactoryFormData
): Promise<{ ok: boolean; error?: string; id?: string }> {
  if (factoryId) {
    const { error } = await supabaseAdmin
      .from("supplier_factories")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", factoryId);

    if (error) return { ok: false, error: error.message };
  } else {
    const { data: inserted, error } = await supabaseAdmin
      .from("supplier_factories")
      .insert({ supplier_id: supplierId, ...data })
      .select("id")
      .single();

    if (error || !inserted) return { ok: false, error: error?.message ?? "Insert failed" };
    revalidatePath(`/admin/suppliers/${supplierId}`);
    return { ok: true, id: inserted.id as string };
  }

  revalidatePath(`/admin/suppliers/${supplierId}`);
  return { ok: true, id: factoryId };
}

export async function deleteFactory(
  supplierId: string,
  factoryId: string
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabaseAdmin
    .from("supplier_factories")
    .delete()
    .eq("id", factoryId);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/suppliers/${supplierId}`);
  return { ok: true };
}

export async function applyKosherToAllProducts(
  supplierId: string,
  kosherTypes: string[]
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabaseAdmin
    .from("supplier_products")
    .update({ kosher_types: kosherTypes })
    .eq("supplier_id", supplierId);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/suppliers/${supplierId}`);
  return { ok: true };
}

export async function applyBulkCertification(
  supplierId: string,
  certType: "quality" | "dietary",
  values: string[]
): Promise<{ ok: boolean; error?: string }> {
  const { data: products, error: fetchErr } = await supabaseAdmin
    .from("supplier_products")
    .select("id, certifications")
    .eq("supplier_id", supplierId);

  if (fetchErr || !products) return { ok: false, error: fetchErr?.message ?? "Fetch failed" };

  const updates = products.map((p) => {
    const existing = (p.certifications as string[]) ?? [];
    const merged = Array.from(new Set([...existing, ...values]));
    return { id: p.id as string, certifications: merged };
  });

  for (const u of updates) {
    await supabaseAdmin
      .from("supplier_products")
      .update({ certifications: u.certifications })
      .eq("id", u.id);
  }

  revalidatePath(`/admin/suppliers/${supplierId}`);
  return { ok: true };
}

export async function saveSupplierProduct(
  supplierId: string,
  productId: string | null,
  data: ProductFormData
): Promise<{ ok: boolean; error?: string; id?: string }> {
  if (productId) {
    const { error } = await supabaseAdmin
      .from("supplier_products")
      .update(data)
      .eq("id", productId);

    if (error) return { ok: false, error: error.message };
  } else {
    const { data: inserted, error } = await supabaseAdmin
      .from("supplier_products")
      .insert({
        supplier_id: supplierId,
        scrape_source: "manual",
        scrape_confidence: 1.0,
        last_scraped_at: new Date().toISOString(),
        ...data,
      })
      .select("id")
      .single();

    if (error || !inserted) return { ok: false, error: error?.message ?? "Insert failed" };
    revalidatePath(`/admin/suppliers/${supplierId}`);
    return { ok: true, id: inserted.id as string };
  }

  revalidatePath(`/admin/suppliers/${supplierId}`);
  return { ok: true, id: productId };
}

export async function deleteSupplierProduct(
  supplierId: string,
  productId: string
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabaseAdmin
    .from("supplier_products")
    .delete()
    .eq("id", productId);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/suppliers/${supplierId}`);
  return { ok: true };
}
