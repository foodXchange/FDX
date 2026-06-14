import { supabaseAdmin } from "@/lib/supabaseAdmin";
import CategoryMappingTable from "./CategoryMappingTable";
import DuplicateTable from "./DuplicateTable";
import CompletenessTable from "./CompletenessTable";

type UnmappedRow = { category: string; count: number };
type CategoryOption = { id: string; name: string };
type DuplicateRow = {
  keep_id: string;
  duplicate_id: string;
  company_name: string;
  country: string | null;
  keep_status: string | null;
  dup_status: string | null;
};
type CompletenessRow = {
  supplier_id: string;
  company_name: string;
  has_category_id: boolean;
  has_formats: boolean;
  has_certs: boolean;
  product_count: number;
  score: number;
};

export default async function DataQualityPage() {
  const [
    totalResult,
    mappedResult,
    unmappedResult,
    categoriesResult,
    duplicatesResult,
    completenessResult,
    needCategoryResult,
  ] = await Promise.all([
    // Total supplier_products
    supabaseAdmin
      .from("supplier_products")
      .select("id", { count: "exact", head: true }),

    // Products with category_id
    supabaseAdmin
      .from("supplier_products")
      .select("id", { count: "exact", head: true })
      .not("category_id", "is", null),

    // Unmapped category texts
    supabaseAdmin
      .from("supplier_products")
      .select("category")
      .is("category_id", null)
      .not("category", "is", null)
      .not("category", "eq", ""),

    // All product categories for dropdown
    supabaseAdmin
      .from("product_categories")
      .select("id, name")
      .order("name", { ascending: true }),

    // Duplicate supplier pairs
    supabaseAdmin.rpc("detect_supplier_duplicates").select("*"),

    // Supplier completeness
    supabaseAdmin
      .from("supplier_offerings")
      .select(
        "id, company_name, category_id, certifications, supplier_products(id, formats, category_id, certifications)"
      )
      .eq("status", "approved")
      .is("duplicate_of_supplier_id", null)
      .limit(200),

    // Suppliers needing a category assignment
    supabaseAdmin
      .from("supplier_offerings")
      .select("id", { count: "exact", head: true })
      .is("category_id", null),
  ]);

  const total = totalResult.count ?? 0;
  const mapped = mappedResult.count ?? 0;
  const unmapped = total - mapped;
  const needCategoryCount = needCategoryResult.count ?? 0;

  // Build unmapped rows: group by category text, count occurrences
  const categoryCountMap = new Map<string, number>();
  for (const row of (unmappedResult.data ?? []) as { category: string }[]) {
    if (row.category) {
      categoryCountMap.set(row.category, (categoryCountMap.get(row.category) ?? 0) + 1);
    }
  }
  const unmappedRows: UnmappedRow[] = Array.from(categoryCountMap.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  const categories: CategoryOption[] = (
    (categoriesResult.data ?? []) as { id: string; name: string }[]
  );

  // Duplicates — may come from RPC or fall back to empty
  let duplicates: DuplicateRow[] = [];
  if (!duplicatesResult.error && duplicatesResult.data) {
    duplicates = duplicatesResult.data as DuplicateRow[];
  } else {
    // Direct query fallback
    const { data: dupData } = await supabaseAdmin
      .from("supplier_offerings")
      .select("id, company_name, country_of_origin, status")
      .is("duplicate_of_supplier_id", null)
      .order("company_name");

    if (dupData) {
      const seen = new Map<string, { id: string; status: string | null }>();
      const pairs: DuplicateRow[] = [];
      for (const row of dupData as {
        id: string;
        company_name: string;
        country_of_origin: string | null;
        status: string | null;
      }[]) {
        const key = row.company_name.toLowerCase().trim();
        const existing = seen.get(key);
        if (existing) {
          pairs.push({
            keep_id: existing.id,
            duplicate_id: row.id,
            company_name: row.company_name,
            country: row.country_of_origin,
            keep_status: existing.status,
            dup_status: row.status,
          });
        } else {
          seen.set(key, { id: row.id, status: row.status });
        }
      }
      duplicates = pairs;
    }
  }

  // Supplier completeness
  type RawOffering = {
    id: string;
    company_name: string;
    category_id: string | null;
    certifications: string[] | null;
    supplier_products: {
      id: string;
      formats: string[] | null;
      category_id: string | null;
      certifications: string[] | null;
    }[];
  };

  const completenessRows: CompletenessRow[] = (
    (completenessResult.data ?? []) as RawOffering[]
  )
    .map((o) => {
      const products = o.supplier_products ?? [];
      const hasFormats = products.some(
        (p) => (p.formats ?? []).length > 0
      );
      const hasCatId =
        o.category_id !== null ||
        products.some((p) => p.category_id !== null);
      const hasCerts =
        (o.certifications ?? []).length > 0 ||
        products.some((p) => (p.certifications ?? []).length > 0);

      const score =
        (hasCatId ? 1 : 0) +
        (hasFormats ? 1 : 0) +
        (hasCerts ? 1 : 0) +
        (products.length > 0 ? 1 : 0);

      return {
        supplier_id: o.id,
        company_name: o.company_name,
        has_category_id: hasCatId,
        has_formats: hasFormats,
        has_certs: hasCerts,
        product_count: products.length,
        score,
      };
    })
    .sort((a, b) => a.score - b.score);

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Sticky header */}
      <div className="border-b border-gray-200 bg-white px-6 py-3 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3 flex-wrap mb-3">
          <span className="text-sm font-semibold text-gray-800">Data Quality</span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <StatCard label="Total products" count={total} color="gray" />
          <StatCard label="Category mapped" count={mapped} color="green" />
          <StatCard label="Unmapped" count={unmapped} color="orange" />
          <StatCard label="Duplicates found" count={duplicates.length} color="purple" />
        </div>
        <p className="mt-2 text-xs text-gray-500">
          {needCategoryCount} suppliers need categories · {duplicates.length} duplicates pending review
        </p>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Section 1: Category Mapping */}
        <section className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-800 mb-4">
            Category Mapping
            <span className="ml-2 text-xs font-normal text-gray-400">
              {unmappedRows.length} unmapped categories
            </span>
          </h2>
          <CategoryMappingTable unmapped={unmappedRows} categories={categories} />
        </section>

        {/* Section 2: Duplicate Suppliers */}
        <section className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-800 mb-4">
            Duplicate Suppliers
            <span className="ml-2 text-xs font-normal text-gray-400">
              {duplicates.length} potential duplicates
            </span>
          </h2>
          <DuplicateTable duplicates={duplicates} />
        </section>

        {/* Section 3: Supplier Completeness */}
        <section className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-800 mb-4">
            Supplier Completeness
            <span className="ml-2 text-xs font-normal text-gray-400">
              sorted by completeness score (lowest first)
            </span>
          </h2>
          <CompletenessTable rows={completenessRows} />
        </section>
      </div>
    </main>
  );
}

function StatCard({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: "gray" | "green" | "orange" | "blue" | "purple";
}) {
  const styles: Record<string, string> = {
    gray: "bg-slate-50 text-slate-600",
    green: "bg-green-50 text-green-700",
    orange: "bg-orange-50 text-orange-700",
    blue: "bg-blue-50 text-blue-700",
    purple: "bg-purple-50 text-purple-700",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full ${styles[color]}`}
    >
      {count} {label}
    </span>
  );
}
