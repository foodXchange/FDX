import { supabaseAdmin } from "@/lib/supabaseAdmin";

type CategoryRow = { id: string; name: string };

export async function resolveCategoryId(rawText: string): Promise<{
  category_id: string | null;
  category_name: string | null;
}> {
  if (!rawText.trim()) return { category_id: null, category_name: null };

  const { data, error } = await supabaseAdmin
    .from("product_categories")
    .select("id, name");

  if (error || !data || data.length === 0) {
    return { category_id: null, category_name: null };
  }

  const rows = data as CategoryRow[];
  const needle = rawText.toLowerCase().trim();

  const exact = rows.find((r) => r.name.toLowerCase() === needle);
  if (exact) return { category_id: exact.id, category_name: exact.name };

  const contains = rows.find(
    (r) =>
      r.name.toLowerCase().includes(needle) ||
      needle.includes(r.name.toLowerCase())
  );
  if (contains) return { category_id: contains.id, category_name: contains.name };

  return { category_id: null, category_name: null };
}
