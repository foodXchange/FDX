"use server";

import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { revalidatePath } from "next/cache";

const BuyerSchema = z.object({
  company_name: z.string().min(1, "Company name is required").max(300),
  website: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  buyer_type: z.string().optional().nullable(),
  kosher_standard: z.string().optional().nullable(),
  contact_name: z.string().optional().nullable(),
  contact_email: z.string().email().optional().nullable().or(z.literal("")),
  contact_whatsapp: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  active: z.boolean().default(true),
  logo_url: z.string().optional().nullable(),
});

export type BuyerInput = z.infer<typeof BuyerSchema>;

export async function createBuyer(
  data: BuyerInput
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const parsed = BuyerSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { data: row, error } = await supabaseAdmin
    .from("buyers")
    .insert({
      ...parsed.data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    console.error("createBuyer error:", error);
    return { ok: false, error: "Database error" };
  }

  revalidatePath("/admin/buyers");
  return { ok: true, id: row.id as string };
}

export async function updateBuyer(
  id: string,
  data: BuyerInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = BuyerSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { error } = await supabaseAdmin
    .from("buyers")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("updateBuyer error:", error);
    return { ok: false, error: "Database error" };
  }

  revalidatePath("/admin/buyers");
  revalidatePath(`/admin/buyers/${id}`);
  return { ok: true };
}

export async function uploadBuyerLogo(
  buyerId: string,
  formData: FormData
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const file = formData.get("file") as File | null;
  if (!file) return { ok: false, error: "No file provided" };

  // Ensure bucket exists (swallow "already exists" error), same pattern as supplier logo upload.
  await supabaseAdmin.storage.createBucket("buyer-logos", { public: true });

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${buyerId}/logo.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabaseAdmin.storage
    .from("buyer-logos")
    .upload(path, buffer, { contentType: file.type, upsert: true });

  const { data } = supabaseAdmin.storage.from("buyer-logos").getPublicUrl(path);
  return { ok: true, url: data.publicUrl };
}

export async function promoteDiscoveredBuyer(
  supplierId: string
): Promise<{ ok: true; buyerId: string } | { ok: false; error: string }> {
  try {
    const { data: sup, error: fetchErr } = await supabaseAdmin
      .from("supplier_offerings")
      .select("company_name, website, country_of_origin, business_role, contact_name, contact_email, contact_phone, logo_url, offerings_summary, product_description")
      .eq("id", supplierId)
      .single();

    if (fetchErr || !sup) {
      return { ok: false, error: fetchErr?.message ?? "Supplier not found" };
    }

    // Insert into buyers table
    const { data: newBuyer, error: insertErr } = await supabaseAdmin
      .from("buyers")
      .insert({
        company_name: sup.company_name,
        website: sup.website,
        country: sup.country_of_origin,
        buyer_type: sup.business_role ?? "importer",
        contact_name: sup.contact_name,
        contact_email: sup.contact_email,
        contact_whatsapp: sup.contact_phone,
        logo_url: sup.logo_url,
        notes: sup.offerings_summary || sup.product_description || "Promoted from discovered wholesale buyers",
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertErr || !newBuyer) {
      return { ok: false, error: insertErr?.message ?? "Failed to insert buyer" };
    }

    // Update supplier offering with reference
    await supabaseAdmin
      .from("supplier_offerings")
      .update({
        internal_notes: `Promoted to active buyer directory (ID: ${newBuyer.id})`,
      })
      .eq("id", supplierId);

    revalidatePath("/admin/buyers");
    return { ok: true, buyerId: newBuyer.id as string };
  } catch (err) {
    console.error("promoteDiscoveredBuyer error:", err);
    return { ok: false, error: String(err) };
  }
}

