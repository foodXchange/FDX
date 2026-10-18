import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { SupplierFiltersBar } from "@/components/admin/SupplierFiltersBar";
import { SuppliersTableClient, type SupplierRow } from "@/components/admin/SuppliersTableClient";

export const dynamic = "force-dynamic";

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

const COUNTRY_CODE_MAP: Record<string, string> = {
  Belgium: "BE",
  Italy: "IT",
  Spain: "ES",
  France: "FR",
  Germany: "DE",
  Netherlands: "NL",
  Portugal: "PT",
  Greece: "GR",
  Poland: "PL",
  Turkey: "TR",
  Israel: "IL",
  "United States": "US",
  "United Kingdom": "GB",
  "United Arab Emirates": "AE",
  Canada: "CA",
  Brazil: "BR",
  Mexico: "MX",
  China: "CN",
  Japan: "JP",
  "South Korea": "KR",
  Vietnam: "VN",
  "Czech Republic": "CZ",
  Australia: "AU",
  India: "IN",
  Argentina: "AR",
  Thailand: "TH",
};

const COUNTRY_ALIAS_MAP: Record<string, string> = {
  UK: "United Kingdom",
  GB: "United Kingdom",
  USA: "United States",
  US: "United States",
  "UNITED STATES OF AMERICA": "United States",
  UAE: "United Arab Emirates",
  KSA: "Saudi Arabia",
  CZ: "Czech Republic",
  CZECHIA: "Czech Republic",
  BR: "Brazil",
  IL: "Israel",
  ES: "Spain",
  FR: "France",
  DE: "Germany",
  IT: "Italy",
  NL: "Netherlands",
  PT: "Portugal",
  GR: "Greece",
  PL: "Poland",
  TR: "Turkey",
  TÜRKİYE: "Turkey",
  BULGARY: "Bulgaria",
  ESTHONIA: "Estonia",
  "BOSNIA AND HERZEGOVINA": "Bosnia & Herzegovina",
  "BOSNIA HERCEGOVINA": "Bosnia & Herzegovina",
  "GREAT BRITAIN": "United Kingdom",
  KOREA: "South Korea",
  "REPUBLIC OF KOREA": "South Korea",
  "VIET NAM": "Vietnam",
  "CHINA / GLOBAL": "China",
};

function normalizeCountry(raw?: string | null): string | null {
  if (!raw) return null;

  let s = raw.trim();
  s = s.replace(/\s*\(.*$/, "").trim();
  s = s.replace(/[.,;]+$/, "").trim();

  if (!s || s.length < 2) return null;

  const upper = s.toUpperCase();
  if (COUNTRY_ALIAS_MAP[upper]) {
    s = COUNTRY_ALIAS_MAP[upper];
  }

  if (/^[A-Z]{2}$/.test(upper)) {
    const code = upper;
    const matchedName = Object.entries(COUNTRY_CODE_MAP).find(
      ([, mappedCode]) => mappedCode === code
    )?.[0];
    s = matchedName ?? code;
  }

  if (
    [
      "EUROPE",
      "GLOBAL",
      "VARIOUS",
      "UNKNOWN",
      "N/A",
      "OTHER",
      "INTERNATIONAL",
      "EMPTY",
    ].includes(s.toUpperCase())
  ) {
    return null;
  }

  return s
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

const SUPPLIER_QUALIFICATION_TABS = ["strong", "review", "all", "empty"] as const;
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

export default async function AdminSuppliersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const country = params.country?.trim() ?? "";
  const category = params.category?.trim() ?? "";
  const status =
    params.status === "pending"
      ? "pending"
      : params.status === "approved"
      ? "approved"
      : "";
  const priorityValue = params.priority?.trim() ?? "";
  const priorityFilter =
    priorityValue !== "" && Number.isInteger(Number(priorityValue))
      ? Number(priorityValue)
      : undefined;
  const qualificationParam = params.qualification?.trim() ?? "";
  const qualification: QualificationTab = SUPPLIER_QUALIFICATION_TABS.includes(
    qualificationParam as QualificationTab
  )
    ? (qualificationParam as QualificationTab)
    : "strong";
  const requestedPage = parseInt(params.page ?? "1", 10);
  const requestedPerPage = parseInt(params.per_page ?? "50", 10);
  const page =
    Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const pageSize = [25, 50, 100].includes(requestedPerPage)
    ? requestedPerPage
    : 50;
  const safeSearchValue = q.replace(/[%_]/g, (match) => `\\${match}`);

  const [
    countriesResult,
    prioritiesResult,
    totalsResult,
    approvedResult,
    withLogosResult,
    reviewResult,
    strongResult,
    emptyResult,
  ] = await Promise.all([
    supabaseAdmin
      .from("supplier_offerings")
      .select("country_of_origin")
      .not("country_of_origin", "is", null)
      .order("country_of_origin", { ascending: true })
      .limit(99999),
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
      .not("logo_url", "is", null),
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

  const reverseCountryMap = new Map<string, string[]>();
  for (const row of countriesResult.data ?? []) {
    const raw = row.country_of_origin;
    if (!raw) continue;
    const normalized = normalizeCountry(raw);
    if (!normalized) continue;
    const existing = reverseCountryMap.get(normalized) ?? [];
    if (!existing.includes(raw)) {
      existing.push(raw);
      reverseCountryMap.set(normalized, existing);
    }
  }

  const priorities = [
    ...new Set(
      (prioritiesResult.data ?? [])
        .map((row) => row.priority)
        .filter((value): value is number => typeof value === "number")
    ),
  ].sort((a, b) => a - b);

  const totalSupplierCount = totalsResult.count ?? 0;
  const approvedSupplierCount = approvedResult.count ?? 0;
  const withLogosCount = withLogosResult.count ?? 0;
  const reviewSupplierCount = reviewResult.count ?? 0;
  const strongSupplierCount = strongResult.count ?? 0;
  const emptySupplierCount = emptyResult.count ?? 0;

  let query: any = supabaseAdmin
    .from("supplier_offerings")
    .select(
      `id, company_name, website, logo_url, country_of_origin, categories, certifications,
       kosher_status, status, priority, verified, product_type, private_label,
       product_count, qualification_status, trust_score,
       contact_email, contact_phone, linkedin_url, scrape_status,
       markets_served, price_positioning,
       supplier_contacts(id), supplier_documents(id)`,
      { count: "exact" }
    )
    .order("product_count", { ascending: false, nullsFirst: false })
    .order("trust_score", { ascending: false, nullsFirst: false });

  if (safeSearchValue) {
    query = query.or(
      `company_name.ilike.%${safeSearchValue}%,website.ilike.%${safeSearchValue}%`
    );
  }

  if (country) {
    const rawVariants = reverseCountryMap.get(country) ?? [country];
    query = query.in("country_of_origin", rawVariants);
  }
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
    if (qualification) sp.set("qualification", qualification);
    if (pageSize !== 50) sp.set("per_page", String(pageSize));
    if (page > 1) sp.set("page", String(page));

    for (const [key, value] of Object.entries(overrides)) {
      if (value === undefined || value === "") {
        sp.delete(key);
      } else {
        sp.set(key, value);
      }
    }

    if (sp.get("per_page") === "50") sp.delete("per_page");
    if (sp.get("page") === "1" || sp.get("page") === "0") sp.delete("page");

    const queryString = sp.toString();
    return `/admin/suppliers${queryString ? `?${queryString}` : ""}`;
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-20 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-base font-bold text-gray-900">
            Supplier Directory
          </h1>
          <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2.5 py-0.5 font-semibold">
            ✓ {approvedSupplierCount.toLocaleString()} Auto-Approved
          </span>
          <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2.5 py-0.5 font-semibold">
            🖼 {withLogosCount.toLocaleString()} Logos Ready
          </span>
          <span className="text-xs text-gray-400">
            {totalSupplierCount.toLocaleString()} total suppliers
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/products"
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-semibold transition"
          >
            📦 Product Catalog ({strongSupplierCount.toLocaleString()} strong)
          </Link>
          <Link
            href="/admin/scraper"
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-semibold transition"
          >
            🕷 Scraper & CSV
          </Link>
          <Link
            href="/admin/suppliers/new"
            className="px-3.5 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold transition"
          >
            + Add Supplier
          </Link>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-5 border-b border-gray-200">
          <div className="flex gap-1">
            {SUPPLIER_QUALIFICATION_TABS.map((tab) => {
              const countVal =
                tab === "all"
                  ? totalSupplierCount
                  : tab === "review"
                  ? reviewSupplierCount
                  : tab === "strong"
                  ? strongSupplierCount
                  : emptySupplierCount;
              const label =
                tab === "strong"
                  ? "★ Strong Manufacturers"
                  : tab === "review"
                  ? "Needs Review"
                  : tab === "empty"
                  ? "Unscraped / Empty"
                  : "All Suppliers";
              return (
                <Link
                  key={tab}
                  href={buildUrl({ qualification: tab, page: "1" })}
                  className={`px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-colors ${
                    qualification === tab
                      ? "bg-white border border-b-white border-gray-200 text-orange-600 -mb-px shadow-2xs"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  {label}
                  <span
                    className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[11px] ${
                      qualification === tab
                        ? "bg-orange-50 text-orange-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {countVal.toLocaleString()}
                  </span>
                </Link>
              );
            })}
          </div>
          <p className="text-xs text-gray-400 pb-2">
            All imported & scraped manufacturers are automatically approved in the system.
          </p>
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
          priorities={priorities}
          categories={CATEGORY_OPTIONS}
        />

        {suppliers.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl text-center py-16 text-gray-400 text-sm">
            No suppliers match these filters.
          </div>
        ) : (
          <>
            <SuppliersTableClient suppliers={suppliers} />

            {totalPages > 1 && (
              <div className="flex flex-col gap-3 mt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-gray-500">
                  Showing {showingStart}–{showingEnd} of{" "}
                  {totalCount.toLocaleString()} suppliers (Page {page} of{" "}
                  {totalPages})
                </p>
                <div className="flex flex-wrap gap-2">
                  {page > 1 && (
                    <Link
                      href={buildUrl({ page: String(page - 1) })}
                      className="px-3 py-1.5 text-xs font-semibold border border-gray-200 bg-white rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      ← Previous
                    </Link>
                  )}
                  {page < totalPages && (
                    <Link
                      href={buildUrl({ page: String(page + 1) })}
                      className="px-3 py-1.5 text-xs font-semibold border border-gray-200 bg-white rounded-lg text-gray-700 hover:bg-gray-50"
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
