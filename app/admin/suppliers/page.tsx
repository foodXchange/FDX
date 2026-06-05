import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import SupplierRowActions from "@/components/admin/SupplierRowActions";
import { SupplierFiltersBar } from "@/components/admin/SupplierFiltersBar";

export const dynamic = "force-dynamic";

const COUNTRY_FLAGS: Record<string, string> = {
  Italy: "🇮🇹",
  Spain: "🇪🇸",
  France: "🇫🇷",
  Germany: "🇩🇪",
  Netherlands: "🇳🇱",
  Belgium: "🇧🇪",
  Portugal: "🇵🇹",
  Greece: "🇬🇷",
  Poland: "🇵🇱",
  Turkey: "🇹🇷",
  Israel: "🇮🇱",
};

const CATEGORY_OPTIONS = [
  { value: "", label: "All categories" },
  { value: "Savory Snacks & Cereals", label: "Savory Snacks & Cereals" },
  { value: "Sweet Biscuits & Bars", label: "Sweet Biscuits & Bars" },
  { value: "Breakfast Cereals", label: "Breakfast Cereals" },
  { value: "Confectionery & Chocolate", label: "Confectionery & Chocolate" },
  { value: "Canned & Preserved Goods", label: "Canned & Preserved Goods" },
  { value: "Canned Vegetables & Pulses", label: "Canned Vegetables & Pulses" },
  { value: "Tomato Products", label: "Tomato Products" },
  { value: "Raw Meat & Poultry", label: "Raw Meat & Poultry" },
  { value: "Fresh & Frozen Fish", label: "Fresh & Frozen Fish" },
  { value: "Dairy Products & Analogues", label: "Dairy Products & Analogues" },
  { value: "Dairy-Free Desserts", label: "Dairy-Free Desserts" },
  { value: "Ingredients & Additives", label: "Ingredients & Additives" },
  { value: "Herbs", label: "Herbs" },
  { value: "Plant-Based Proteins", label: "Plant-Based Proteins" },
  { value: "Bakery & Bread Products", label: "Bakery & Bread Products" },
  { value: "Specialty Sauces & Condiments", label: "Specialty Sauces & Condiments" },
  { value: "Beverages (Non-Alcoholic)", label: "Beverages (Non-Alcoholic)" },
  { value: "Fats, Oils & Spreads", label: "Fats, Oils & Spreads" },
  { value: "Pasta/Noodles", label: "Pasta/Noodles" },
  { value: "Prepared Meals (Frozen & Shelf-Stable)", label: "Prepared Meals (Frozen & Shelf-Stable)" },
  { value: "Sugars & Sweeteners", label: "Sugars & Sweeteners" },
];

const SUPPLIER_QUALIFICATION_TABS = ["review", "strong", "empty", "all"] as const;
type QualificationTab = (typeof SUPPLIER_QUALIFICATION_TABS)[number];

type SearchParams = {
  q?: string;
  country?: string;
  category?: string;
  status?: string;
  priority?: string;
  qualification?: string;
  page?: string;
  per_page?: string;
};

type SupplierRow = {
  id: string;
  company_name: string;
  country_of_origin: string | null;
  categories: string[] | null;
  certifications: string[] | null;
  status: string | null;
  priority: number | null;
  verified: boolean | null;
  product_type: string | null;
  private_label: boolean | null;
  markets_served: string[] | null;
  price_positioning: string | null;
  supplier_contacts: { id: string }[];
  supplier_documents: { id: string }[];
  qualification_status: string | null;
};

function StatusBadge({ status }: { status: string | null }) {
  const s = status ?? "pending";
  const cls =
    s === "approved" || s === "active"
      ? "bg-green-100 text-green-700"
      : s === "pending"
      ? "bg-yellow-100 text-yellow-700"
      : "bg-gray-100 text-gray-500";
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>{s}</span>
  );
}

function ProductTypeBadge({ type }: { type: string | null }) {
  if (!type) return <span className="text-xs text-gray-300">—</span>;
  const label =
    type === "pure_ingredient"
      ? "Pure ingredient"
      : type === "processed_food"
      ? "Processed"
      : type === "semi_processed"
      ? "Semi-processed"
      : "Mixed";
  const cls =
    type === "pure_ingredient"
      ? "bg-blue-50 text-blue-700"
      : "bg-slate-100 text-slate-600";
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${cls}`}>{label}</span>
  );
}

function QualificationBadge({ qualification }: { qualification: string | null }) {
  const status = qualification ?? "empty";
  const label =
    status === "strong"
      ? "Strong"
      : status === "thin"
      ? "Review"
      : status === "empty"
      ? "Empty"
      : status === "rejected"
      ? "Rejected"
      : status;
  const cls =
    status === "strong"
      ? "bg-green-100 text-green-700"
      : status === "thin"
      ? "bg-yellow-100 text-yellow-700"
      : status === "rejected"
      ? "bg-red-100 text-red-700"
      : "bg-gray-100 text-gray-500";
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>
      {label}
    </span>
  );
}

export default async function AdminSuppliersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const country = params.country?.trim() ?? "";
  const category = params.category?.trim() ?? "";
  const status = params.status === "pending" ? "pending" : params.status === "approved" ? "approved" : "";
  const priorityValue = params.priority?.trim() ?? "";
  const priorityFilter = priorityValue !== "" && Number.isInteger(Number(priorityValue)) ? Number(priorityValue) : undefined;
  const qualificationParam = params.qualification?.trim() ?? "";
  const qualification: QualificationTab = SUPPLIER_QUALIFICATION_TABS.includes(
    qualificationParam as QualificationTab
  )
    ? (qualificationParam as QualificationTab)
    : "review";
  const requestedPage = parseInt(params.page ?? "1", 10);
  const requestedPerPage = parseInt(params.per_page ?? "50", 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const pageSize = [25, 50, 100].includes(requestedPerPage) ? requestedPerPage : 50;
  const safeSearchValue = q.replace(/[%_]/g, (match) => `\\${match}`);
  const [countriesResult, prioritiesResult, totalsResult, approvedResult, pendingResult,
    reviewResult, strongResult, emptyResult] =
    await Promise.all([
      supabaseAdmin
        .from("supplier_offerings")
        .select("country_of_origin")
        .not("country_of_origin", "is", null)
        .order("country_of_origin", { ascending: true })
        .limit(500),
      supabaseAdmin
        .from("supplier_offerings")
        .select("priority")
        .not("priority", "is", null)
        .order("priority", { ascending: true })
        .limit(500),
      supabaseAdmin
        .from("supplier_offerings")
        .select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("supplier_offerings")
        .select("id", { count: "exact", head: true })
        .in("status", ["approved", "active"]),
      supabaseAdmin
        .from("supplier_offerings")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      supabaseAdmin
        .from("supplier_offerings")
        .select("id", { count: "exact", head: true })
        .eq("qualification_status", "thin"),
      supabaseAdmin
        .from("supplier_offerings")
        .select("id", { count: "exact", head: true })
        .eq("qualification_status", "strong"),
      supabaseAdmin
        .from("supplier_offerings")
        .select("id", { count: "exact", head: true })
        .eq("qualification_status", "empty"),
    ]);

  const countries = [...new Set(
    (countriesResult.data ?? [])
      .map((row) => row.country_of_origin)
      .filter((value): value is string => typeof value === "string")
  )].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const priorities = [...new Set(
    (prioritiesResult.data ?? [])
      .map((row) => row.priority)
      .filter((value): value is number => typeof value === "number")
  )].sort((a, b) => a - b);

  const totalSupplierCount = totalsResult.count ?? 0;
  const approvedSupplierCount = approvedResult.count ?? 0;
  const pendingSupplierCount = pendingResult.count ?? 0;
  const reviewSupplierCount = reviewResult.count ?? 0;
  const strongSupplierCount = strongResult.count ?? 0;
  const emptySupplierCount = emptyResult.count ?? 0;

  let query: any = supabaseAdmin
    .from("supplier_offerings")
    .select(
      `id, company_name, country_of_origin, categories, certifications,
       status, priority, verified, product_type, private_label,
       product_count, qualification_status,
       markets_served, price_positioning,
       supplier_contacts(id), supplier_documents(id)`,
      { count: "exact" }
    )
    .order("priority", { ascending: false });

  if (safeSearchValue) {
    query = query.or(`company_name.ilike.%${safeSearchValue}%,website.ilike.%${safeSearchValue}%`);
  }

  if (country) query = query.eq("country_of_origin", country);
  if (category) query = query.contains("categories", [category]);

  if (status === "approved") {
    query = query.in("status", ["approved", "active"]);
  } else if (status === "pending") {
    query = query.eq("status", "pending");
  }

  if (priorityFilter !== undefined) {
    query = query.eq("priority", priorityFilter);
  }
  if (qualification === "review") {
    query = query.eq("qualification_status", "thin");
  } else if (qualification === "strong") {
    query = query.eq("qualification_status", "strong");
  } else if (qualification === "empty") {
    query = query.eq("qualification_status", "empty");
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, count } = (await query) as {
    data: SupplierRow[] | null;
    count: number | null;
  };

  const suppliers = data ?? [];
  const totalCount = count ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);
  const showingStart = totalCount === 0 ? 0 : from + 1;
  const showingEnd = Math.min(to + 1, totalCount);

  function buildUrl(overrides: Partial<SearchParams & { page: string }>) {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (country) sp.set("country", country);
    if (category) sp.set("category", category);
    if (status) sp.set("status", status);
    if (priorityValue !== "") sp.set("priority", priorityValue);
    if (qualification && qualification !== "review") sp.set("qualification", qualification);
    if (pageSize !== 50) sp.set("per_page", String(pageSize));
    if (page > 1) sp.set("page", String(page));

    for (const [key, value] of Object.entries(overrides)) {
      if (value === undefined || value === "") {
        sp.delete(key);
      } else {
        sp.set(key, value);
      }
    }

    if (sp.get("qualification") === "review") sp.delete("qualification");
    if (sp.get("per_page") === "50") sp.delete("per_page");
    if (sp.get("page") === "0") sp.delete("page");

    const queryString = sp.toString();
    return `/admin/suppliers${queryString ? `?${queryString}` : ""}`;
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white px-6 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold text-gray-800">Supplier Database</span>
          <span className="text-xs text-gray-400">
            <span className="bg-green-100 text-green-700 rounded-full px-2 py-0.5 font-semibold mr-1">
              {approvedSupplierCount} approved
            </span>
            {pendingSupplierCount > 0 && (
              <span className="bg-yellow-100 text-yellow-700 rounded-full px-2 py-0.5 font-semibold mr-1">
                {pendingSupplierCount} pending
              </span>
            )}
            {totalSupplierCount} total
          </span>
        </div>
        <Link
          href="/admin/suppliers/new"
          className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition"
        >
          + Add supplier
        </Link>
      </div>

      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex gap-1 mb-6 border-b border-gray-200">
          {SUPPLIER_QUALIFICATION_TABS.map((tab) => {
            const count =
              tab === "all"
                ? totalSupplierCount
                : tab === "review"
                ? reviewSupplierCount
                : tab === "strong"
                ? strongSupplierCount
                : emptySupplierCount;
            return (
              <Link
                key={tab}
                href={buildUrl({ qualification: tab, page: "0" })}
                className={`px-4 py-2 text-xs font-medium rounded-t-lg transition-colors ${
                  qualification === tab
                    ? "bg-white border border-b-white border-gray-200 text-gray-900 -mb-px"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab === "review"
                  ? "Review"
                  : tab === "strong"
                  ? "Strong"
                  : tab === "empty"
                  ? "Empty"
                  : "All"}
                <span className="ml-1.5 text-gray-400">{count}</span>
              </Link>
            );
          })}
        </div>

        <SupplierFiltersBar
          q={q}
          country={country}
          category={category}
          status={status}
          priority={priorityValue}
          page={page}
          perPage={pageSize}
          totalCount={totalCount}
          countries={countries}
          priorities={priorities}
          categories={CATEGORY_OPTIONS}
        />

        {suppliers.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">
            No suppliers match these filters.
          </div>
        ) : (
          <>
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {[
                      "Company",
                      "Country",
                      "Categories",
                      "Certs",
                      "Type",
                      "Markets",
                      "Qual",
                      "Status",
                      "Prio",
                      "Actions",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {suppliers.map((s) => {
                    const flag = s.country_of_origin
                      ? COUNTRY_FLAGS[s.country_of_origin] ?? ""
                      : "";
                    return (
                      <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/admin/suppliers/${s.id}`}
                              className="font-medium text-gray-900 hover:text-orange-600 transition text-sm"
                            >
                              {s.company_name}
                            </Link>
                            {s.verified && (
                              <span
                                className="text-green-500 text-xs font-bold"
                                title="Verified"
                              >
                                ✓
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {flag && <span className="mr-1">{flag}</span>}
                          {s.country_of_origin ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 flex-wrap">
                            {(s.categories ?? []).slice(0, 2).map((c) => (
                              <span
                                key={c}
                                className="text-xs bg-slate-100 text-slate-600 rounded-full px-2 py-0.5"
                              >
                                {c}
                              </span>
                            ))}
                            {(s.categories?.length ?? 0) > 2 && (
                              <span className="text-xs text-gray-400">
                                +{(s.categories?.length ?? 0) - 2}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs bg-orange-50 text-orange-700 border border-orange-200 rounded-full px-2 py-0.5">
                            {s.certifications?.length ?? 0} certs
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <ProductTypeBadge type={s.product_type} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 flex-wrap">
                            {(s.markets_served ?? []).slice(0, 2).map((m) => (
                              <span
                                key={m}
                                className="text-xs text-gray-500 border border-gray-200 rounded-full px-2 py-0.5"
                              >
                                {m}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <QualificationBadge qualification={s.qualification_status} />
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={s.status} />
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {s.priority ?? 0}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Link
                              href={`/admin/suppliers/${s.id}`}
                              className="text-xs text-orange-600 hover:text-orange-700 font-medium"
                            >
                              Edit
                            </Link>
                            <SupplierRowActions id={s.id} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex flex-col gap-3 mt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-gray-500">
                  Showing {showingStart}–{showingEnd} of {totalCount.toLocaleString()} suppliers
                </p>
                <div className="flex flex-wrap gap-2">
                  {page > 0 && (
                    <Link
                      href={buildUrl({ page: String(page - 1) })}
                      className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
                    >
                      ← Previous
                    </Link>
                  )}
                  {page < totalPages - 1 && (
                    <Link
                      href={buildUrl({ page: String(page + 1) })}
                      className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
                    >
                      Next →
                    </Link>
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
