"use server";

import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { revalidatePath } from "next/cache";

const SupplierSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  company: z.string().optional().default(""),
  country: z.string().optional().default(""),
  categories: z.array(z.string()).default([]),
  certifications: z.array(z.string()).default([]),
  formats: z.array(z.string()).default([]),
  markets: z.array(z.string()).default([]),
  private_label: z.boolean().optional().nullable(),
  contact_email: z.string().optional().default(""),
  contact_whatsapp: z.string().optional().default(""),
  notes: z.string().optional().default(""),
  status: z.enum(["active", "inactive", "prospect"]).default("active"),
  priority: z.number().int().min(0).max(100).default(0),
});

export type SupplierInput = z.infer<typeof SupplierSchema>;

export async function createSupplier(
  data: SupplierInput
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const parsed = SupplierSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { data: row, error } = await supabaseAdmin
    .from("suppliers")
    .insert({ ...parsed.data, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
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
    .from("suppliers")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("updateSupplier error:", error);
    return { ok: false, error: "Database error" };
  }

  revalidatePath("/admin/suppliers");
  return { ok: true };
}

export async function deleteSupplier(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabaseAdmin.from("suppliers").delete().eq("id", id);

  if (error) {
    console.error("deleteSupplier error:", error);
    return { ok: false, error: "Database error" };
  }

  revalidatePath("/admin/suppliers");
  return { ok: true };
}
