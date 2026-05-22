import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ProductsTableClient } from "@/components/admin/ProductsTableClient";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

type SearchParams = {
  category?: string;
  kosher?: string;
  confidence?: string;
  verified?: string;
  country?: string;
  page?: string;
};

type ProductRow = {
  id: string;
  product_name: string;
  category: string;
  certifications: string[];
  kosher_types: string[];
  formats: string[];
  scrape_confidence: number;
  manually_verified: boolean;
  private_label: boolean;
  supplier_id: string;
  supplier: {
    company_name: string;
    country_of_origin: string | null;
    status: string | null;
  } | null;
};

const CATEGORIES = [
  "Tomato Products",
  "Pasta & Grains",
  "Snacks",
  "Dairy",
  "Beverages",
  "Sauces & Condiments",
  "Canned Foods",
  "Frozen Foods",
  "Oils & Fats",
  "Fish & Seafood",
  "Bakery",
  "Spices & Herbs",
  "Meat & Poultry",
  "Pulses & Legumes",
  "Organic & Natural",
  "Ingredients & Additives",
  "Other",
];

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const page = Math.max(0, parseInt(params.page ?? "0"));
  const category = params.category ?? "";
  const kosher = params.kosher ?? "any";
  const confidence = params.confidence ?? "any";
  const verified = params.verified ?? "any";
  const country = params.country ?? "";

  // Build query
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabaseAdmin
    .from("supplier_products")
    .select(
      `id, product_name, category, certifications, kosher_types, formats,
       scrape_confidence, manually_verified, private_label, supplier_id,
       supplier:supplier_offerings(company_name, country_of_origin, status)`,
      { count: "exact" }
    )
    .order("scrape_confidence", { ascending: false });

  if (category) query = query.eq("category", category);
  if (kosher === "yes") query = query.not("kosher_types", "eq", "{}");
  if (kosher === "no") query = query.eq("kosher_types", "{}");
  if (confidence === "high") query = query.gte("scrape_confidence", 0.8);
  if (confidence === "medium") {
    query = query.gte("scrape_confidence", 0.5).lt("scrape_confidence", 0.8);
  }
  if (confidence === "low") query = query.lt("scrape_confidence", 0.5);
  if (verified === "yes") query = query.eq("manually_verified", true);
  if (verified === "no") query = query.eq("manually_verified", false);

  query = query.range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

  const { data, count } = (await query) as {
    data: ProductRow[] | null;
    count: number | null;
  };

  const products = (data ?? []) as unknown as ProductRow[];
  const totalCount = count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  function buildUrl(overrides: Partial<SearchParams & { page: string }>) {
    const sp = new URLSearchParams();
    if (category) sp.set("category", category);
    if (kosher !== "any") sp.set("kosher", kosher);
    if (confidence !== "any") sp.set("confidence", confidence);
    if (verified !== "any") sp.set("verified", verified);
    if (country) sp.set("country", country);
    if (page > 0) sp.set("page", String(page));
    for (const [k, v] of Object.entries(overrides)) {
      if (v) sp.set(k, v); else sp.delete(k);
    }
    const qs = sp.toString();
    return `/admin/products${qs ? `?${qs}` : ""}`;
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white px-6 py-4 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-semibold text-gray-800">
            Products{" "}
            <span className="text-gray-400 font-normal text-sm">
              ({totalCount.toLocaleString()})
            </span>
          </h1>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mt-3">
          {/* Category */}
          <FilterSelect
            label="Category"
            value={category}
            onChange={(v) => buildUrl({ category: v, page: "0" })}
            options={[{ value: "", label: "All categories" }, ...CATEGORIES.map((c) => ({ value: c, label: c }))]}
          />
          {/* Kosher */}
          <FilterSelect
            label="Kosher"
            value={kosher}
            onChange={(v) => buildUrl({ kosher: v, page: "0" })}
            options={[
              { value: "any", label: "Any kosher" },
              { value: "yes", label: "Has kosher" },
              { value: "no", label: "No kosher" },
            ]}
          />
          {/* Confidence */}
          <FilterSelect
            label="Confidence"
            value={confidence}
            onChange={(v) => buildUrl({ confidence: v, page: "0" })}
            options={[
              { value: "any", label: "Any confidence" },
              { value: "high", label: "High (≥80%)" },
              { value: "medium", label: "Medium (50–79%)" },
              { value: "low", label: "Low (<50%)" },
            ]}
          />
          {/* Verified */}
          <FilterSelect
            label="Verified"
            value={verified}
            onChange={(v) => buildUrl({ verified: v, page: "0" })}
            options={[
              { value: "any", label: "Any verified" },
              { value: "yes", label: "Verified" },
              { value: "no", label: "Not verified" },
            ]}
          />
          {(category || kosher !== "any" || confidence !== "any" || verified !== "any") && (
            <a
              href="/admin/products"
              className="px-3 py-1.5 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Clear filters
            </a>
          )}
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto">
        {products.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">
            No products match these filters.
          </div>
        ) : (
          <>
            <ProductsTableClient products={products} />

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-xs text-gray-500">
                  Showing {page * PAGE_SIZE + 1}–
                  {Math.min((page + 1) * PAGE_SIZE, totalCount)} of{" "}
                  {totalCount.toLocaleString()} products
                </p>
                <div className="flex gap-2">
                  {page > 0 && (
                    <a
                      href={buildUrl({ page: String(page - 1) })}
                      className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
                    >
                      ← Previous
                    </a>
                  )}
                  {page < totalPages - 1 && (
                    <a
                      href={buildUrl({ page: String(page + 1) })}
                      className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
                    >
                      Next →
                    </a>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function FilterSelect({
  label: _label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => string;
  options: { value: string; label: string }[];
}) {
  // Server-rendered: use anchor links per option
  const current = options.find((o) => o.value === value) ?? options[0];
  return (
    <div className="relative">
      <details className="group">
        <summary className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg cursor-pointer text-gray-700 hover:bg-gray-50 select-none list-none">
          {current.label}
          <span className="text-gray-400 text-xs">▾</span>
        </summary>
        <div className="absolute top-full left-0 mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[160px]">
          {options.map((opt) => (
            <a
              key={opt.value}
              href={onChange(opt.value)}
              className={`block px-4 py-2 text-sm hover:bg-gray-50 ${
                opt.value === value ? "text-orange-600 font-medium" : "text-gray-700"
              }`}
            >
              {opt.label}
            </a>
          ))}
        </div>
      </details>
    </div>
  );
}
