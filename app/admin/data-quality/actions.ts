"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function mapProductsToCategory(
  categoryText: string,
  categoryId: string
): Promise<{ ok: boolean; updated: number; error?: string }> {
  const lower = categoryText.toLowerCase().trim();

  const [productsResult, offeringsResult] = await Promise.all([
    supabaseAdmin
      .from("supplier_products")
      .update({ category_id: categoryId })
      .filter("category_id", "is", null)
      .ilike("category", `%${lower}%`),
    supabaseAdmin.rpc("map_offerings_category", {
      category_text: lower,
      cat_id: categoryId,
    }),
  ]);

  if (productsResult.error) {
    return { ok: false, updated: 0, error: productsResult.error.message };
  }

  // Fallback: update supplier_offerings directly if RPC not available
  if (offeringsResult.error) {
    await supabaseAdmin
      .from("supplier_offerings")
      .update({ category_id: categoryId })
      .filter("category_id", "is", null)
      .contains("categories", [categoryText]);
  }

  revalidatePath("/admin/data-quality");
  return { ok: true, updated: (productsResult.count ?? 0) };
}

export async function mapProductsToCategoryDirect(
  categoryText: string,
  categoryId: string
): Promise<{ ok: boolean; error?: string }> {
  const { error: err1 } = await supabaseAdmin
    .from("supplier_products")
    .update({ category_id: categoryId })
    .is("category_id", null)
    .ilike("category", `%${categoryText}%`);

  if (err1) return { ok: false, error: err1.message };

  // supplier_offerings: match against first element of categories array
  const { data: offerings } = await supabaseAdmin
    .from("supplier_offerings")
    .select("id, categories")
    .is("category_id", null)
    .not("categories", "is", null);

  const toUpdate = ((offerings ?? []) as { id: string; categories: string[] }[])
    .filter((o) =>
      (o.categories ?? []).some(
        (c) => c.toLowerCase().includes(categoryText.toLowerCase())
      )
    )
    .map((o) => o.id);

  if (toUpdate.length > 0) {
    await supabaseAdmin
      .from("supplier_offerings")
      .update({ category_id: categoryId })
      .in("id", toUpdate);
  }

  revalidatePath("/admin/data-quality");
  return { ok: true };
}

export async function markSupplierDuplicate(
  duplicateId: string,
  keepId: string
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabaseAdmin
    .from("supplier_offerings")
    .update({ duplicate_of_supplier_id: keepId })
    .eq("id", duplicateId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/data-quality");
  return { ok: true };
}

export async function unmarkSupplierDuplicate(
  supplierId: string
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabaseAdmin
    .from("supplier_offerings")
    .update({ duplicate_of_supplier_id: null })
    .eq("id", supplierId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/data-quality");
  return { ok: true };
}

export async function approveAllDuplicates(
  pairs: { duplicate_id: string; keep_id: string }[]
): Promise<{ ok: boolean; updated: number; error?: string }> {
  const results = await Promise.all(
    pairs.map((p) =>
      supabaseAdmin
        .from("supplier_offerings")
        .update({ duplicate_of_supplier_id: p.keep_id })
        .eq("id", p.duplicate_id)
    )
  );

  const failed = results.find((r) => r.error);
  if (failed?.error) return { ok: false, updated: 0, error: failed.error.message };

  revalidatePath("/admin/data-quality");
  return { ok: true, updated: pairs.length };
}

export async function runAutoCategoryMapping(): Promise<{
  ok: boolean;
  mappedCount: number;
  error?: string;
}> {
  try {
    const { data: cats } = await supabaseAdmin
      .from("product_categories")
      .select("id, name");

    const catMap = new Map((cats ?? []).map((c) => [c.name.toLowerCase(), c.id]));

    const rules: Record<string, string> = {
      Snacks: "Snacks, Cereals & Confectionery",
      Bakery: "Bakery & Bread Products",
      "Sauces & Condiments": "Specialty Sauces & Condiments",
      "Canned Foods": "Canned & Preserved Foods",
      "Oils & Fats": "Olive Oil & Cooking Oils",
      "Pasta & Grains": "Pasta & Noodles",
      "Ingredients & Additives": "Ingredients & Additives (Functional & Flavor)",
      "Meat & Poultry": "Raw Meat & Poultry",
      Beverages: "Beverages (Non-Alcoholic)",
      "Frozen Foods": "Prepared Meals (Frozen & Shelf-Stable)",
      Dairy: "Dairy Products & Analogues",
      "Organic & Natural": "Organic & Health Foods",
      "Fish & Seafood": "Fresh & Frozen Fish",
      "Pulses & Legumes": "Legumes & Pulses",
      "Tomato Products": "Tomato Products",
      "Sweet Biscuits & Bars": "Sweet Biscuits & Bars",
      "Spices & Herbs": "Herbs, Spices & Seasonings",
    };

    let mappedCount = 0;
    for (const [raw, target] of Object.entries(rules)) {
      const catId = catMap.get(target.toLowerCase());
      if (!catId) continue;
      const { data: updated } = await supabaseAdmin
        .from("supplier_products")
        .update({ category_id: catId })
        .eq("category", raw)
        .is("category_id", null)
        .select("id");

      if (updated) mappedCount += updated.length;
    }

    revalidatePath("/admin/data-quality");
    return { ok: true, mappedCount };
  } catch (err) {
    return {
      ok: false,
      mappedCount: 0,
      error: err instanceof Error ? err.message : "Auto-mapping failed",
    };
  }
}

export type MarkedDuplicateRow = {
  id: string;
  company_name: string;
  country_of_origin: string | null;
  website: string | null;
  status: string | null;
  duplicate_of_supplier_id: string;
  primary_name?: string;
  primary_website?: string | null;
};

export async function getMarkedDuplicates(
  page: number = 1,
  pageSize: number = 25,
  search: string = ""
): Promise<{
  rows: MarkedDuplicateRow[];
  total: number;
}> {
  let query = supabaseAdmin
    .from("supplier_offerings")
    .select(
      "id, company_name, country_of_origin, website, status, duplicate_of_supplier_id",
      { count: "exact" }
    )
    .not("duplicate_of_supplier_id", "is", null);

  if (search.trim()) {
    const term = search.trim();
    query = query.or(
      `company_name.ilike.%${term}%,website.ilike.%${term}%,country_of_origin.ilike.%${term}%`
    );
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, count, error } = await query
    .order("company_name", { ascending: true })
    .range(from, to);

  if (error || !data) {
    return { rows: [], total: 0 };
  }

  const primaryIds = Array.from(
    new Set(data.map((d) => d.duplicate_of_supplier_id).filter(Boolean))
  );

  const primaryMap = new Map<string, { name: string; website: string | null }>();
  if (primaryIds.length > 0) {
    const { data: primaries } = await supabaseAdmin
      .from("supplier_offerings")
      .select("id, company_name, website")
      .in("id", primaryIds);

    if (primaries) {
      for (const p of primaries) {
        primaryMap.set(p.id, { name: p.company_name, website: p.website });
      }
    }
  }

  const rows: MarkedDuplicateRow[] = data.map((d) => {
    const p = primaryMap.get(d.duplicate_of_supplier_id);
    return {
      ...d,
      primary_name: p?.name ?? "Primary Supplier",
      primary_website: p?.website ?? null,
    };
  });

  return { rows, total: count ?? 0 };
}

export async function runSupplierDeduplicationScan(): Promise<{
  ok: boolean;
  markedCount: number;
  error?: string;
}> {
  try {
    let allSuppliers: Array<{
      id: string;
      company_name: string;
      website: string | null;
      status: string | null;
    }> = [];
    let from = 0;
    const pageSize = 1000;

    while (true) {
      const { data, error } = await supabaseAdmin
        .from("supplier_offerings")
        .select("id, company_name, website, status")
        .is("duplicate_of_supplier_id", null)
        .range(from, from + pageSize - 1);

      if (error || !data || data.length === 0) break;
      allSuppliers.push(...data);
      if (data.length < pageSize) break;
      from += pageSize;
    }

    const cleanName = (n: string | null) =>
      (n || "").toLowerCase().replace(/[^a-z0-9]/g, "");

    const getCleanDomain = (urlStr: string | null) => {
      if (!urlStr) return "";
      try {
        const u = urlStr.startsWith("http") ? urlStr : `https://${urlStr}`;
        const parsed = new URL(u);
        return parsed.hostname.replace(/^www\./, "").toLowerCase();
      } catch {
        return "";
      }
    };

    const seenName = new Map<string, (typeof allSuppliers)[0]>();
    const seenDomain = new Map<string, (typeof allSuppliers)[0]>();
    const dupPairs: Array<{ duplicate_id: string; keep_id: string }> = [];

    for (const s of allSuppliers) {
      const normName = cleanName(s.company_name);
      if (normName.length > 2) {
        if (seenName.has(normName)) {
          const keep = seenName.get(normName)!;
          dupPairs.push({ duplicate_id: s.id, keep_id: keep.id });
          continue;
        } else {
          seenName.set(normName, s);
        }
      }

      const domain = getCleanDomain(s.website);
      if (domain.length > 3 && !domain.includes("facebook") && !domain.includes("instagram") && !domain.includes("linkedin")) {
        if (seenDomain.has(domain)) {
          const keep = seenDomain.get(domain)!;
          // Prefer record with human company name over URL
          const sIsUrl = s.company_name.startsWith("http");
          const keepIsUrl = keep.company_name.startsWith("http");
          if (!sIsUrl && keepIsUrl) {
            dupPairs.push({ duplicate_id: keep.id, keep_id: s.id });
            seenDomain.set(domain, s);
          } else {
            dupPairs.push({ duplicate_id: s.id, keep_id: keep.id });
          }
        } else {
          seenDomain.set(domain, s);
        }
      }
    }

    let markedCount = 0;
    const CHUNK = 50;
    for (let i = 0; i < dupPairs.length; i += CHUNK) {
      const chunk = dupPairs.slice(i, i + CHUNK);
      await Promise.all(
        chunk.map((p) =>
          supabaseAdmin
            .from("supplier_offerings")
            .update({ duplicate_of_supplier_id: p.keep_id })
            .eq("id", p.duplicate_id)
        )
      );
      markedCount += chunk.length;
    }

    revalidatePath("/admin/data-quality");
    return { ok: true, markedCount };
  } catch (err) {
    return {
      ok: false,
      markedCount: 0,
      error: err instanceof Error ? err.message : "Deduplication scan failed",
    };
  }
}

