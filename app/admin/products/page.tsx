import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ProductsTableClient, type ProductRow, type BuyerRequestOption } from "@/components/admin/ProductsTableClient";
import { SyncFactoryCertsButton } from "@/components/admin/SyncFactoryCertsButton";
import { ProductCountryFilter } from "@/components/admin/ProductCountryFilter";
import { WORLD_COUNTRIES } from "@/lib/constants/countries";

export const dynamic = "force-dynamic";

type SearchParams = {
  category?: string;
  kosher?: string;
  confidence?: string;
  verified?: string;
  status?: string;
  country?: string;
  image?: string;
  q?: string;
  request_id?: string;
  page?: string;
  per_page?: string;
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
  const image = params.image ?? "any";
  const q = params.q?.trim() ?? "";
  const requestId = params.request_id?.trim() ?? "";

  const pageSizeRaw = parseInt(params.per_page ?? "50");
  const pageSize = [50, 100, 200].includes(pageSizeRaw) ? pageSizeRaw : 50;

  // Stats counts & active buyer requests in parallel
  const [
    totalResult,
    withImageResult,
    kosherResult,
    needsReviewResult,
    verifiedResult,
    buyerRequestsResult,
  ] = await Promise.all([
    supabaseAdmin
      .from("supplier_products")
      .select("*", { count: "exact", head: true }),
    supabaseAdmin
      .from("supplier_products")
      .select("*", { count: "exact", head: true })
      .not("image_url", "is", null),
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
    supabaseAdmin
      .from("sourcing_requests")
      .select(
        "id, product_name, company, category, kosher, certifications, quantity, unit, notes, reference_image_urls, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(80),
  ]);

  const statTotal = totalResult.count ?? 0;
  const statWithImage = withImageResult.count ?? 0;
  const statKosher = kosherResult.count ?? 0;
  const statNeedsReview = needsReviewResult.count ?? 0;
  const statVerified = verifiedResult.count ?? 0;
  const buyerRequests = (buyerRequestsResult.data ?? []) as BuyerRequestOption[];

  // Build main query — prioritize products with images first when browsing default view, then confidence
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabaseAdmin
    .from("supplier_products")
    .select(
      `id, product_name, category, certifications, kosher_types, formats, sizes,
       description, needs_review, scrape_confidence, manually_verified,
       private_label, image_url, supplier_id,
       supplier:supplier_offerings!inner(company_name, country_of_origin, status, logo_url, website)`,
      { count: "exact" }
    )
    .order("image_url", { ascending: false, nullsFirst: false })
    .order("scrape_confidence", { ascending: false });

  if (q) {
    const safeQ = q.replace(/[%_]/g, "");
    query = query.or(`product_name.ilike.%${safeQ}%,description.ilike.%${safeQ}%`);
  }
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
  if (country) query = query.eq("supplier_offerings.country_of_origin", country);
  if (image === "yes") query = query.not("image_url", "is", null);
  if (image === "no") query = query.is("image_url", null);

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
    if (image !== "any") sp.set("image", image);
    if (q) sp.set("q", q);
    if (requestId) sp.set("request_id", requestId);
    if (pageSize !== 50) sp.set("per_page", String(pageSize));
    if (page > 0) sp.set("page", String(page));
    for (const [k, v] of Object.entries(overrides)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    if (sp.get("per_page") === "50") sp.delete("per_page");
    if (sp.get("page") === "0") sp.delete("page");
    const qs = sp.toString();
    return `/admin/products${qs ? `?${qs}` : ""}`;
  }

  const hasActiveFilters =
    !!category ||
    kosher !== "any" ||
    confidence !== "any" ||
    status !== "all" ||
    !!country ||
    image !== "any" ||
    !!q;

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white px-6 py-3.5 sticky top-0 z-20 shadow-2xs">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between gap-4 flex-wrap mb-3">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-sm font-bold text-slate-900 uppercase tracking-wider mr-1">
                Product Catalog & Benchmark Matcher
              </h1>
              <StatCard label="Total" count={statTotal} color="gray" href="/admin/products" />
              <StatCard
                label="With Photo"
                count={statWithImage}
                color="purple"
                href="/admin/products?image=yes"
              />
              <StatCard
                label="Missing Photo"
                count={Math.max(0, statTotal - statWithImage)}
                color="amber"
                href="/admin/products?image=no"
              />
              <StatCard
                label="Kosher"
                count={statKosher}
                color="green"
                href="/admin/products?kosher=yes"
              />
              <StatCard
                label="Verified"
                count={statVerified}
                color="blue"
                href="/admin/products?status=verified"
              />
              <StatCard
                label="Needs Review"
                count={statNeedsReview}
                color="orange"
                href="/admin/products?status=needs_review"
              />
            </div>
            <SyncFactoryCertsButton />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
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
              label="Image"
              value={image}
              onChange={(v) => buildUrl({ image: v, page: "0" })}
              options={[
                { value: "any", label: "Any photo" },
                { value: "yes", label: "Has photo" },
                { value: "no", label: "Missing photo" },
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
            <ProductCountryFilter value={country} countries={WORLD_COUNTRIES} />

            {hasActiveFilters && (
              <a
                href="/admin/products"
                className="px-2.5 py-1 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
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
      </div>

      <div className="p-6 max-w-7xl mx-auto">
        <ProductsTableClient
          products={products}
          buyerRequests={buyerRequests}
          initialRequestId={requestId}
          showNeedsReviewBanner={status === "needs_review"}
          needsReviewCount={statNeedsReview}
        />

        {/* Pagination */}
        {products.length > 0 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-slate-500">
              Showing {page * pageSize + 1}–
              {Math.min((page + 1) * pageSize, totalCount)} of{" "}
              {totalCount.toLocaleString()} products
            </p>
            {totalPages > 1 && (
              <div className="flex gap-2">
                {page > 0 && (
                  <a
                    href={buildUrl({ page: String(page - 1) })}
                    className="px-3 py-1.5 text-xs font-medium border border-slate-200 bg-white rounded-lg text-slate-600 hover:bg-slate-50"
                  >
                    ← Previous
                  </a>
                )}
                <span className="px-2 py-1.5 text-xs text-slate-500 font-medium">
                  Page {page + 1} / {totalPages.toLocaleString()}
                </span>
                {page < totalPages - 1 && (
                  <a
                    href={buildUrl({ page: String(page + 1) })}
                    className="px-3 py-1.5 text-xs font-medium border border-slate-200 bg-white rounded-lg text-slate-600 hover:bg-slate-50"
                  >
                    Next →
                  </a>
                )}
              </div>
            )}
          </div>
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
  color: "gray" | "green" | "orange" | "blue" | "purple" | "amber";
  href?: string;
}) {
  const styles = {
    gray: "bg-slate-100 text-slate-700 border-slate-200",
    green: "bg-green-50 text-green-700 border-green-200",
    orange: "bg-orange-50 text-orange-700 border-orange-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
  };
  const cls = `inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${styles[color]}`;
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
        <summary className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium border border-slate-200 rounded-lg cursor-pointer text-slate-700 bg-white hover:bg-slate-50 select-none list-none">
          {current.label}
          <span className="text-slate-400 text-[10px]">▾</span>
        </summary>
        <div className="absolute top-full left-0 mt-1 z-30 bg-white border border-slate-200 rounded-xl shadow-lg py-1 min-w-[160px] max-h-72 overflow-y-auto">
          {options.map((opt) => (
            <a
              key={opt.value}
              href={onChange(opt.value)}
              className={`block px-3 py-1.5 text-xs hover:bg-slate-50 ${
                opt.value === value
                  ? "text-orange-600 font-semibold"
                  : "text-slate-700"
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
