"use server";

import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { revalidatePath } from "next/cache";

const TemplateSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  channel: z.enum(["email", "whatsapp", "both"]),
  subject: z.string().optional().nullable(),
  body: z.string().min(1, "Body is required"),
});

export type TemplateInput = z.infer<typeof TemplateSchema>;

export async function createTemplate(
  data: TemplateInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = TemplateSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { error } = await supabaseAdmin.from("supplier_email_templates").insert({
    ...parsed.data,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.error("createTemplate error:", error);
    return { ok: false, error: "Database error" };
  }

  revalidatePath("/admin/settings/email-templates");
  return { ok: true };
}

export async function updateTemplate(
  id: string,
  data: TemplateInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = TemplateSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { error } = await supabaseAdmin
    .from("supplier_email_templates")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("updateTemplate error:", error);
    return { ok: false, error: "Database error" };
  }

  revalidatePath("/admin/settings/email-templates");
  return { ok: true };
}

export async function deleteTemplate(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabaseAdmin.from("supplier_email_templates").delete().eq("id", id);

  if (error) {
    console.error("deleteTemplate error:", error);
    return { ok: false, error: "Database error" };
  }

  revalidatePath("/admin/settings/email-templates");
  return { ok: true };
}
