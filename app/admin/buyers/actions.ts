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

  if (uploadError) return { ok: false, error: uploadError.message };

  const { data } = supabaseAdmin.storage.from("buyer-logos").getPublicUrl(path);
  return { ok: true, url: data.publicUrl };
}
