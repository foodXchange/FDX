'use server';
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { revalidatePath } from "next/cache";

const ArticleSchema = z.object({
  title: z.string().min(1).max(300),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  category: z.string().min(1),
  summary: z.string().max(500).optional(),
  content: z.string().optional(),
  tags: z.array(z.string()).default([]),
  related_portfolio_slugs: z.array(z.string()).default([]),
  published: z.boolean().default(false),
  meta_title: z.string().max(60).optional(),
  meta_description: z.string().max(500).optional(),
  reading_time_mins: z.number().int().min(1).default(5),
});

export type ImportArticleInput = z.infer<typeof ArticleSchema>;

function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function calcReadingTime(content?: string): number {
  const words = content?.split(/\s+/).filter(Boolean).length ?? 0;
  return Math.max(1, Math.ceil(words / 200));
}

function revalidateAll() {
  revalidatePath("/en/import-guide");
  revalidatePath("/en/import-guide/[slug]", "page");
  revalidatePath("/admin/import-guide");
}

export async function createImportArticle(
  data: ImportArticleInput
): Promise<{ ok: true; id: string; slug: string } | { ok: false; error: string }> {
  const parsed = ArticleSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;
  if (!d.slug) d.slug = slugify(d.title);
  d.reading_time_mins = calcReadingTime(d.content);

  const { data: row, error } = await supabaseAdmin
    .from("import_guide_articles")
    .insert({
      ...d,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("id, slug")
    .single();

  if (error) {
    console.error("createImportArticle error:", error);
    return { ok: false, error: error.message ?? "Database error" };
  }
  revalidateAll();
  return { ok: true, id: row.id as string, slug: row.slug as string };
}

export async function updateImportArticle(
  id: string,
  data: ImportArticleInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = ArticleSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;
  d.reading_time_mins = calcReadingTime(d.content);

  const { error } = await supabaseAdmin
    .from("import_guide_articles")
    .update({ ...d, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("updateImportArticle error:", error);
    return { ok: false, error: error.message ?? "Database error" };
  }
  revalidateAll();
  return { ok: true };
}

export async function deleteImportArticle(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabaseAdmin
    .from("import_guide_articles")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("deleteImportArticle error:", error);
    return { ok: false, error: "Database error" };
  }
  revalidateAll();
  return { ok: true };
}

export async function togglePublished(
  id: string,
  currentValue: boolean
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabaseAdmin
    .from("import_guide_articles")
    .update({ published: !currentValue, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("togglePublished error:", error);
    return { ok: false, error: "Database error" };
  }
  revalidateAll();
  return { ok: true };
}

export async function bulkCreateFromAI(
  articles: ImportArticleInput[]
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const validated = articles.map((a) => ArticleSchema.safeParse(a));
  const invalid = validated.find((v) => !v.success);
  if (invalid && !invalid.success) return { ok: false, error: invalid.error.issues[0].message };

  const rows = validated
    .filter((v): v is { success: true; data: ImportArticleInput } => v.success)
    .map((v) => ({
      ...v.data,
      reading_time_mins: calcReadingTime(v.data.content),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

  const { error } = await supabaseAdmin.from("import_guide_articles").insert(rows);

  if (error) {
    console.error("bulkCreateFromAI error:", error);
    return { ok: false, error: error.message ?? "Database error" };
  }
  revalidateAll();
  return { ok: true, count: rows.length };
}
