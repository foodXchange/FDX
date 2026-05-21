'use server';
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { revalidatePath } from "next/cache";

const PortfolioSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, hyphens only"),
  summary: z.string().optional().default(""),
  content: z.string().optional().default(""),
  category: z.string().optional().default(""),
  markets: z.array(z.string()).default([]),
  private_label: z.boolean().default(false),
  formats: z.array(z.string()).default([]),
  certifications: z.array(z.string()).default([]),
  countries: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  hero_image: z.string().optional().default(""),
  priority: z.number().int().min(0).max(100).default(0),
  published: z.boolean().default(false),
});

export type PortfolioInput = z.infer<typeof PortfolioSchema>;

function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function createPortfolioItem(
  data: PortfolioInput
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const parsed = PortfolioSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;
  if (!d.slug) d.slug = slugify(d.title);
  const { data: row, error } = await supabaseAdmin
    .from("portfolio_items")
    .insert({ ...d, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .select("id")
    .single();
  if (error) {
    console.error("createPortfolioItem DB error:", error);
    return { ok: false, error: "Database error" };
  }
  revalidatePath("/en/portfolio");
  revalidatePath("/admin/portfolio");
  return { ok: true, id: row.id as string };
}

export async function updatePortfolioItem(
  id: string,
  data: PortfolioInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = PortfolioSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { error } = await supabaseAdmin
    .from("portfolio_items")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    console.error("updatePortfolioItem DB error:", error);
    return { ok: false, error: "Database error" };
  }
  revalidatePath("/en/portfolio");
  revalidatePath("/admin/portfolio");
  return { ok: true };
}

export async function deletePortfolioItem(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabaseAdmin.from("portfolio_items").delete().eq("id", id);
  if (error) {
    console.error("deletePortfolioItem DB error:", error);
    return { ok: false, error: "Database error" };
  }
  revalidatePath("/en/portfolio");
  revalidatePath("/admin/portfolio");
  return { ok: true };
}

export async function togglePublished(
  id: string,
  currentValue: boolean
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabaseAdmin
    .from("portfolio_items")
    .update({ published: !currentValue, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    console.error("togglePublished DB error:", error);
    return { ok: false, error: "Database error" };
  }
  revalidatePath("/en/portfolio");
  revalidatePath("/admin/portfolio");
  return { ok: true };
}
