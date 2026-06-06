"use server";

import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { revalidatePath } from "next/cache";

const SupplierSchema = z.object({
  company_name: z.string().min(1, "Company name is required").max(300),
  legal_entity: z.string().optional().default(""),
  contact_email: z.string().email().optional().nullable(),
  contact_phone: z.string().optional().nullable(),
  country_of_origin: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  product_type: z
    .enum(["pure_ingredient", "processed_food", "semi_processed", "mixed"])
    .optional()
    .nullable(),
  categories: z.array(z.string()).default([]),
  product_description: z.string().optional().nullable(),
  formats: z.array(z.string()).default([]),
  certifications: z.array(z.string()).default([]),
  markets_served: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  primary_ingredients: z.array(z.string()).default([]),
  private_label: z.boolean().default(false),
  own_brand: z.boolean().default(false),
  priority: z.number().int().default(0),
  status: z
    .enum(["pending", "approved", "active", "inactive"])
    .default("pending"),
  verified: z.boolean().default(false),
  price_positioning: z
    .enum(["premium", "mid-range", "budget", "mixed"])
    .optional()
    .nullable(),
  israeli_market_fit: z.string().optional().nullable(),
  competitive_advantages: z.array(z.string()).default([]),
  weaknesses: z.array(z.string()).default([]),
  sourcing_notes: z.string().optional().nullable(),
  annual_capacity: z.string().optional().nullable(),
  headquarters: z.string().optional().nullable(),
  region: z.string().optional().nullable(),
  founded: z.string().optional().nullable(),
  company_size: z.string().optional().nullable(),
});

export type SupplierInput = z.infer<typeof SupplierSchema>;

export async function createSupplier(
  data: SupplierInput
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const parsed = SupplierSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { data: row, error } = await supabaseAdmin
    .from("supplier_offerings")
    .insert({
      ...parsed.data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    console.error("createSupplier error:", error);
    return { ok: false, error: "Database error" };
  }

  revalidatePath("/admin/suppliers");
  return { ok: true, id: row.id as string };
}

export async function updateSupplier(
  id: string,
  data: SupplierInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = SupplierSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { error } = await supabaseAdmin
    .from("supplier_offerings")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("updateSupplier error:", error);
    return { ok: false, error: "Database error" };
  }

  revalidatePath("/admin/suppliers");
  revalidatePath(`/admin/suppliers/${id}`);
  return { ok: true };
}

export async function deleteSupplier(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabaseAdmin
    .from("supplier_offerings")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("deleteSupplier error:", error);
    return { ok: false, error: "Database error" };
  }

  revalidatePath("/admin/suppliers");
  return { ok: true };
}

export async function toggleVerified(
  id: string,
  currentValue: boolean
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabaseAdmin
    .from("supplier_offerings")
    .update({ verified: !currentValue, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("toggleVerified error:", error);
    return { ok: false, error: "Database error" };
  }

  revalidatePath("/admin/suppliers");
  return { ok: true };
}

export async function toggleStatus(
  id: string,
  newStatus: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabaseAdmin
    .from("supplier_offerings")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("toggleStatus error:", error);
    return { ok: false, error: "Database error" };
  }

  revalidatePath("/admin/suppliers");
  return { ok: true };
}

export async function bulkUpdateSupplierStatus(
  ids: string[],
  newStatus: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (ids.length === 0) return { ok: true };

  const { error } = await supabaseAdmin
    .from("supplier_offerings")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .in("id", ids);

  if (error) {
    console.error("bulkUpdateSupplierStatus error:", error);
    return { ok: false, error: "Database error" };
  }

  revalidatePath("/admin/suppliers");
  return { ok: true };
}

const ContactSchema = z.object({
  name: z.string().min(1),
  role: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  is_primary: z.boolean().default(false),
});
export type ContactInput = z.infer<typeof ContactSchema>;

export async function addContact(
  supplierId: string,
  data: ContactInput
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const parsed = ContactSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { data: row, error } = await supabaseAdmin
    .from("supplier_contacts")
    .insert({ ...parsed.data, supplier_id: supplierId })
    .select("id")
    .single();

  if (error) {
    console.error("addContact error:", error);
    return { ok: false, error: "Database error" };
  }

  revalidatePath(`/admin/suppliers/${supplierId}`);
  return { ok: true, id: row.id as string };
}

export async function deleteContact(
  supplierId: string,
  contactId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabaseAdmin
    .from("supplier_contacts")
    .delete()
    .eq("id", contactId);

  if (error) {
    console.error("deleteContact error:", error);
    return { ok: false, error: "Database error" };
  }

  revalidatePath(`/admin/suppliers/${supplierId}`);
  return { ok: true };
}

const DocumentSchema = z.object({
  title: z.string().min(1),
  type: z.string().optional().nullable(),
  url: z.string().url().optional().nullable(),
  notes: z.string().optional().nullable(),
});
export type DocumentInput = z.infer<typeof DocumentSchema>;

export async function addDocument(
  supplierId: string,
  data: DocumentInput
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const parsed = DocumentSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { data: row, error } = await supabaseAdmin
    .from("supplier_documents")
    .insert({
      ...parsed.data,
      supplier_id: supplierId,
      created_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    console.error("addDocument error:", error);
    return { ok: false, error: "Database error" };
  }

  revalidatePath(`/admin/suppliers/${supplierId}`);
  return { ok: true, id: row.id as string };
}

export async function deleteDocument(
  supplierId: string,
  documentId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabaseAdmin
    .from("supplier_documents")
    .delete()
    .eq("id", documentId);

  if (error) {
    console.error("deleteDocument error:", error);
    return { ok: false, error: "Database error" };
  }

  revalidatePath(`/admin/suppliers/${supplierId}`);
  return { ok: true };
}

export async function getSupplierMatches(supplierId: string) {
  const { data } = await supabaseAdmin
    .from("sourcing_matches")
    .select(
      `id, match_score, match_breakdown, status, created_at,
       sourcing_requests(id, product_name, category, message, status, created_at)`
    )
    .eq("supplier_id", supplierId)
    .order("match_score", { ascending: false })
    .limit(50);

  return (data ?? []) as unknown as {
    id: string;
    match_score: number | null;
    match_breakdown: Record<string, unknown> | null;
    status: string | null;
    created_at: string;
    sourcing_requests: {
      id: string;
      product_name: string | null;
      category: string | null;
      message: string | null;
      status: string | null;
      created_at: string;
    } | null;
  }[];
}
