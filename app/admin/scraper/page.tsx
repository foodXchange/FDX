import { supabaseAdmin } from "@/lib/supabaseAdmin";
import ScraperTableClient from "@/components/admin/ScraperTableClient";
import { CsvUploader } from "@/components/admin/CsvUploader";
import { ScraperConsole } from "@/components/admin/ScraperConsole";

export const dynamic = "force-dynamic";

type FactoryRow = {
  supplier_id: string;
  is_primary: boolean;
  kosher_types: string[];
};

type SupplierRow = {
  id: string;
  company_name: string;
  website: string | null;
  country_of_origin: string | null;
  scrape_status: string | null;
  last_scraped_at: string | null;
  products_found: number | null;
  status: string | null;
};

type FilterTab = "all" | "pending" | "scraped" | "failed";

export default async function ScraperPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: rawTab } = await searchParams;
  const activeTab: FilterTab =
    rawTab === "pending" || rawTab === "scraped" || rawTab === "failed"
      ? rawTab
      : "all";

  const [suppliersResult, productsCountResult, factoriesResult] =
    await Promise.all([
      supabaseAdmin
        .from("supplier_offerings")
        .select(
          "id, company_name, website, country_of_origin, scrape_status, last_scraped_at, products_found, status"
        )
        .not("website", "is", null)
        .neq("website", "")
        .order("scrape_status", { ascending: true })
        .order("company_name", { ascending: true }),
      supabaseAdmin
        .from("supplier_products")
        .select("*", { count: "exact", head: true }),
      supabaseAdmin
        .from("supplier_factories")
        .select("supplier_id, is_primary, kosher_types"),
    ]);

  const suppliers = (suppliersResult.data ?? []) as SupplierRow[];
  const totalProducts = productsCountResult.count ?? 0;

  // Build factory metadata per supplier
  const factories = (factoriesResult.data ?? []) as FactoryRow[];
  const factoryCountMap: Record<string, number> = {};
  const primaryKosherMap: Record<string, string[]> = {};

  for (const f of factories) {
    factoryCountMap[f.supplier_id] = (factoryCountMap[f.supplier_id] ?? 0) + 1;
    if (f.is_primary && f.kosher_types.length > 0) {
      primaryKosherMap[f.supplier_id] = f.kosher_types;
    }
  }

  const counts = suppliers.reduce(
    (acc, s) => {
      const st = s.scrape_status ?? "pending";
      if (st in acc) acc[st as keyof typeof acc]++;
      return acc;
    },
    { pending: 0, scraped: 0, failed: 0, skipped: 0 }
  );

  const filtered =
    activeTab === "all"
      ? suppliers
      : suppliers.filter((s) => (s.scrape_status ?? "pending") === activeTab);

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: `All (${suppliers.length})` },
    { key: "pending", label: `Pending (${counts.pending})` },
    { key: "scraped", label: `Scraped (${counts.scraped})` },
    { key: "failed", label: `Failed (${counts.failed})` },
  ];

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="border-b border-gray-200 bg-white px-6 py-4 sticky top-0 z-10 shadow-sm">
        <h1 className="text-base font-semibold text-gray-800 mb-3">
          Supplier Scraper
        </h1>

        {/* Stats row */}
        <div className="flex items-center gap-3 flex-wrap">
          <StatCard color="green" label="Scraped" count={counts.scraped} />
          <StatCard color="orange" label="Pending" count={counts.pending} />
          <StatCard color="red" label="Failed" count={counts.failed} />
          <StatCard color="gray" label="Skipped" count={counts.skipped} />
          <StatCard color="blue" label="Products" count={totalProducts} />
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* CSV upload section */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <CsvUploader />
        </div>

        {/* Batch scraper section */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <p className="font-semibold text-slate-800 mb-4">Run batch scrape</p>
          <ScraperConsole />
        </div>

        {/* Supplier table */}
        <div>
          {/* Filter tabs */}
          <div className="flex gap-1 mb-4 bg-white border border-gray-200 rounded-xl p-1 w-fit">
            {tabs.map((t) => (
              <a
                key={t.key}
                href={t.key === "all" ? "/admin/scraper" : `/admin/scraper?tab=${t.key}`}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === t.key
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {t.label}
              </a>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-sm">
              No suppliers in this category.
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {[
                      "Company",
                      "Website",
                      "Status",
                      "Products",
                      "Factories",
                      "Kosher",
                      "Last scraped",
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
                  <ScraperTableClient
                    suppliers={filtered}
                    factoryCountMap={factoryCountMap}
                    primaryKosherMap={primaryKosherMap}
                  />
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function StatCard({
  color,
  label,
  count,
}: {
  color: "green" | "orange" | "red" | "gray" | "blue";
  label: string;
  count: number;
}) {
  const styles = {
    green: "bg-green-50 text-green-700",
    orange: "bg-orange-50 text-orange-700",
    red: "bg-red-50 text-red-700",
    gray: "bg-slate-50 text-slate-600",
    blue: "bg-blue-50 text-blue-700",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1 rounded-full ${styles[color]}`}
    >
      {count} {label}
    </span>
  );
}
