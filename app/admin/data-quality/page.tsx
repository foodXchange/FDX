import { supabaseAdmin } from "@/lib/supabaseAdmin";
import CategoryMappingTable from "./CategoryMappingTable";
import DuplicateTable, { DuplicateRow } from "./DuplicateTable";
import CompletenessTable from "./CompletenessTable";
import { CatalogTelemetryWidget } from "@/components/admin/CatalogTelemetryWidget";

type UnmappedRow = { category: string; count: number };
type CategoryOption = { id: string; name: string };

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
    totalProductsResult,
    mappedProductsResult,
    unmappedResult,
    categoriesResult,
    duplicatesResult,
    totalSuppliersResult,
    markedDupsResult,
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

    // Duplicate supplier pairs RPC (fallback if RPC missing)
    supabaseAdmin.rpc("detect_supplier_duplicates").select("*"),

    // Total suppliers
    supabaseAdmin
      .from("supplier_offerings")
      .select("id", { count: "exact", head: true }),

    // Marked duplicates count
    supabaseAdmin
      .from("supplier_offerings")
      .select("id", { count: "exact", head: true })
      .not("duplicate_of_supplier_id", "is", null),

    // Supplier completeness sample
    supabaseAdmin
      .from("supplier_offerings")
      .select(
        "id, company_name, category_id, certifications, supplier_products(id, formats, category_id, certifications)"
      )
      .eq("status", "approved")
      .is("duplicate_of_supplier_id", null)
      .limit(200),

    // Active suppliers needing a category assignment
    supabaseAdmin
      .from("supplier_offerings")
      .select("id", { count: "exact", head: true })
      .is("category_id", null)
      .is("duplicate_of_supplier_id", null),
  ]);

  const totalProducts = totalProductsResult.count ?? 0;
  const mappedProducts = mappedProductsResult.count ?? 0;
  const unmappedProducts = Math.max(0, totalProducts - mappedProducts);
  const totalSuppliers = totalSuppliersResult.count ?? 0;
  const markedDups = markedDupsResult.count ?? 0;
  const activeSuppliers = Math.max(0, totalSuppliers - markedDups);
  const needCategoryCount = needCategoryResult.count ?? 0;

  // Build unmapped category rows: group by category text, count occurrences
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

  // Duplicates — may come from RPC or fall back to checking active duplicate candidates
  let duplicates: DuplicateRow[] = [];
  if (!duplicatesResult.error && duplicatesResult.data && Array.isArray(duplicatesResult.data)) {
    duplicates = duplicatesResult.data as DuplicateRow[];
  } else {
    // Check fallback sample
    const { data: dupData } = await supabaseAdmin
      .from("supplier_offerings")
      .select("id, company_name, country_of_origin, status")
      .is("duplicate_of_supplier_id", null)
      .order("company_name")
      .limit(1000);

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
        if (existing && existing.id !== row.id) {
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
      const hasFormats = products.some((p) => (p.formats ?? []).length > 0);
      const hasCatId =
        o.category_id !== null || products.some((p) => p.category_id !== null);
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

  const pctMapped = totalProducts > 0 ? ((mappedProducts / totalProducts) * 100).toFixed(1) : "0";

  return (
    <main className="min-h-screen bg-gray-50/60 pb-16">
      {/* Top Header & Metrics Bar */}
      <div className="border-b border-gray-200 bg-white shadow-xs">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold tracking-wider text-orange-600 uppercase bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                  Data Engine & Catalog
                </span>
                <span className="text-xs text-gray-400">Master Data Normalization</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mt-1">Data Quality & Deduplication</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Monitor category taxonomy health, deduplicate supplier records, and track catalog completeness.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <a
                href="#categories"
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 hover:border-orange-300 hover:text-orange-600 transition-colors shadow-xs"
              >
                Category Mapping
              </a>
              <a
                href="#duplicates"
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 hover:border-orange-300 hover:text-orange-600 transition-colors shadow-xs"
              >
                Duplicates ({markedDups.toLocaleString()})
              </a>
              <a
                href="#completeness"
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 hover:border-orange-300 hover:text-orange-600 transition-colors shadow-xs"
              >
                Completeness
              </a>
            </div>
          </div>

          {/* 4 Health Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            {/* Card 1: Taxonomy Coverage */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">Taxonomy Coverage</span>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  {pctMapped}%
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-gray-900">
                  {mappedProducts.toLocaleString()}
                </span>
                <span className="text-xs text-gray-400">/ {totalProducts.toLocaleString()} prods</span>
              </div>
              <div className="mt-2 w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-1.5 rounded-full"
                  style={{ width: `${pctMapped}%` }}
                />
              </div>
              <p className="mt-2 text-[11px] text-gray-500">
                {unmappedProducts.toLocaleString()} products unmapped
              </p>
            </div>

            {/* Card 2: Active Unique Suppliers */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">Active Unique Suppliers</span>
                <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  Master Pool
                </span>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-extrabold text-gray-900">
                  {activeSuppliers.toLocaleString()}
                </span>
              </div>
              <p className="mt-3 text-[11px] text-gray-500">
                Out of {totalSuppliers.toLocaleString()} total supplier rows
              </p>
            </div>

            {/* Card 3: Deduplicated Suppliers */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">Deduplicated Suppliers</span>
                <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                  Archived
                </span>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-extrabold text-purple-900">
                  {markedDups.toLocaleString()}
                </span>
              </div>
              <p className="mt-3 text-[11px] text-gray-500">
                Linked & deduplicated to primary suppliers
              </p>
            </div>

            {/* Card 4: Category Assignment Needs */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">Suppliers Needing Category</span>
                <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  Enrichment
                </span>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-extrabold text-amber-900">
                  {needCategoryCount.toLocaleString()}
                </span>
              </div>
              <p className="mt-3 text-[11px] text-gray-500">
                Active suppliers lacking primary category
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Sections */}
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Live 6-Pillar Completeness Scorecard & Scraper Telemetry */}
        <CatalogTelemetryWidget />

        {/* Section 1: Category Mapping */}
        <section id="categories" className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <span>🏷️ Category Mapping & Normalization</span>
                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                  {unmappedRows.length} unmapped category {unmappedRows.length === 1 ? "label" : "labels"}
                </span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Map raw scraped categories into standard canonical product taxonomy.
              </p>
            </div>
          </div>
          <CategoryMappingTable
            unmapped={unmappedRows}
            categories={categories}
            totalProducts={totalProducts}
            mappedProducts={mappedProducts}
          />
        </section>

        {/* Section 2: Duplicate Suppliers */}
        <section id="duplicates" className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <span>👥 Supplier Deduplication Management</span>
                <span className="text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
                  {markedDups.toLocaleString()} deduplicated
                </span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Review pending candidate duplicates or search and restore archived duplicate suppliers.
              </p>
            </div>
          </div>
          <DuplicateTable
            duplicates={duplicates}
            totalMarkedCount={markedDups}
          />
        </section>

        {/* Section 3: Supplier Completeness */}
        <section id="completeness" className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <span>📋 Supplier Data Completeness</span>
                <span className="text-xs font-normal text-gray-400">
                  Ranked by data richness score (0–4)
                </span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Suppliers evaluated on Category ID, Packaging Formats, Certifications, and Product Count.
              </p>
            </div>
          </div>
          <CompletenessTable rows={completenessRows} />
        </section>
      </div>
    </main>
  );
}
