import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ProductsTableClient } from "@/components/admin/ProductsTableClient";

export const dynamic = "force-dynamic";

type SearchParams = {
  category?: string;
  kosher?: string;
  confidence?: string;
  verified?: string;
  status?: string;
  country?: string;
  page?: string;
  per_page?: string;
};

type ProductRow = {
  id: string;
  product_name: string;
  category: string;
  certifications: string[];
  kosher_types: string[];
  formats: string[];
  description: string | null;
  needs_review: boolean;
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
  const status = params.status ?? "all";
  const country = params.country ?? "";

  const pageSizeRaw = parseInt(params.per_page ?? "50");
  const pageSize = [50, 100, 200].includes(pageSizeRaw) ? pageSizeRaw : 50;

  // Stats counts (parallel)
  const [totalResult, kosherResult, needsReviewResult, verifiedResult] =
    await Promise.all([
      supabaseAdmin
        .from("supplier_products")
        .select("*", { count: "exact", head: true }),
      supabaseAdmin
        .from("supplier_products")
        .select("*", { count: "exact", head: true })
        .not("kosher_types", "eq", "{}"),
      supabaseAdmin
        .from("supplier_products")
        .select("*", { count: "exact", head: true })
        .eq("needs_review", true),
      supabaseAdmin
        .from("supplier_products")
        .select("*", { count: "exact", head: true })
        .eq("manually_verified", true),
    ]);

  const statTotal = totalResult.count ?? 0;
  const statKosher = kosherResult.count ?? 0;
  const statNeedsReview = needsReviewResult.count ?? 0;
  const statVerified = verifiedResult.count ?? 0;

  // Build main query
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabaseAdmin
    .from("supplier_products")
    .select(
      `id, product_name, category, certifications, kosher_types, formats,
       description, needs_review, scrape_confidence, manually_verified,
       private_label, supplier_id,
       supplier:supplier_offerings(company_name, country_of_origin, status)`,
      { count: "exact" }
    )
    .order("scrape_confidence", { ascending: false });

  if (category) query = query.eq("category", category);
  if (kosher === "yes") query = query.not("kosher_types", "eq", "{}");
  if (kosher === "no") query = query.eq("kosher_types", "{}");
  if (confidence === "high") query = query.gte("scrape_confidence", 0.8);
  if (confidence === "medium") {
    query = query
      .gte("scrape_confidence", 0.5)
      .lt("scrape_confidence", 0.8);
  }
  if (confidence === "low") query = query.lt("scrape_confidence", 0.5);

  // Status filter (takes precedence over legacy verified param)
  if (status !== "all") {
    if (status === "needs_review") query = query.eq("needs_review", true);
    else if (status === "verified")
      query = query.eq("manually_verified", true);
    else if (status === "unverified") {
      query = query
        .eq("manually_verified", false)
        .neq("needs_review", true);
    }
  } else {
    // Backward-compat: respect legacy verified param if status not set
    if (verified === "yes") query = query.eq("manually_verified", true);
    if (verified === "no") query = query.eq("manually_verified", false);
  }

  query = query.range(page * pageSize, page * pageSize + pageSize - 1);

  const { data, count } = (await query) as {
    data: ProductRow[] | null;
    count: number | null;
  };

  const products = (data ?? []) as unknown as ProductRow[];
  const totalCount = count ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  function buildUrl(
    overrides: Partial<SearchParams & { page: string }>
  ) {
    const sp = new URLSearchParams();
    if (category) sp.set("category", category);
    if (kosher !== "any") sp.set("kosher", kosher);
    if (confidence !== "any") sp.set("confidence", confidence);
    if (status !== "all") sp.set("status", status);
    if (country) sp.set("country", country);
    if (pageSize !== 50) sp.set("per_page", String(pageSize));
    if (page > 0) sp.set("page", String(page));
    for (const [k, v] of Object.entries(overrides)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    // Clean up defaults so URLs stay clean
    if (sp.get("per_page") === "50") sp.delete("per_page");
    if (sp.get("page") === "0") sp.delete("page");
    const qs = sp.toString();
    return `/admin/products${qs ? `?${qs}` : ""}`;
  }

  const hasActiveFilters =
    !!category ||
    kosher !== "any" ||
    confidence !== "any" ||
    status !== "all";

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white px-6 py-4 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-base font-semibold text-gray-800">Products</h1>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 flex-wrap mb-3">
          <StatCard label="Total" count={statTotal} color="gray" />
          <StatCard label="Kosher" count={statKosher} color="green" />
          <StatCard
            label="Needs review"
            count={statNeedsReview}
            color="orange"
            href="/admin/products?status=needs_review"
          />
          <StatCard label="Verified" count={statVerified} color="blue" />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <FilterSelect
            label="Category"
            value={category}
            onChange={(v) => buildUrl({ category: v, page: "0" })}
            options={[
              { value: "", label: "All categories" },
              ...CATEGORIES.map((c) => ({ value: c, label: c })),
            ]}
          />
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
          <FilterSelect
            label="Status"
            value={status}
            onChange={(v) => buildUrl({ status: v, page: "0" })}
            options={[
              { value: "all", label: "All status" },
              { value: "needs_review", label: "Needs review" },
              { value: "verified", label: "Manually verified" },
              { value: "unverified", label: "Unverified" },
            ]}
          />

          {hasActiveFilters && (
            <a
              href="/admin/products"
              className="px-3 py-1.5 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Clear filters
            </a>
          )}

          <div className="ml-auto">
            <FilterSelect
              label="Per page"
              value={String(pageSize)}
              onChange={(v) => buildUrl({ per_page: v, page: "0" })}
              options={[
                { value: "50", label: "50 / page" },
                { value: "100", label: "100 / page" },
                { value: "200", label: "200 / page" },
              ]}
            />
          </div>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto">
        {products.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">
            No products match these filters.
          </div>
        ) : (
          <>
            <ProductsTableClient
              products={products}
              showNeedsReviewBanner={status === "needs_review"}
              needsReviewCount={statNeedsReview}
            />

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-gray-500">
                Showing {page * pageSize + 1}–
                {Math.min((page + 1) * pageSize, totalCount)} of{" "}
                {totalCount.toLocaleString()} products
              </p>
              {totalPages > 1 && (
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
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function StatCard({
  label,
  count,
  color,
  href,
}: {
  label: string;
  count: number;
  color: "gray" | "green" | "orange" | "blue";
  href?: string;
}) {
  const styles = {
    gray: "bg-slate-50 text-slate-600",
    green: "bg-green-50 text-green-700",
    orange: "bg-orange-50 text-orange-700",
    blue: "bg-blue-50 text-blue-700",
  };
  const cls = `inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1 rounded-full ${styles[color]}`;
  if (href) {
    return (
      <a href={href} className={`${cls} hover:opacity-80 transition`}>
        {count.toLocaleString()} {label}
      </a>
    );
  }
  return (
    <span className={cls}>
      {count.toLocaleString()} {label}
    </span>
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
                opt.value === value
                  ? "text-orange-600 font-medium"
                  : "text-gray-700"
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
