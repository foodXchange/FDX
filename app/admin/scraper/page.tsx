import { supabaseAdmin } from "@/lib/supabaseAdmin";
import ScraperTableClient from "@/components/admin/ScraperTableClient";

export const dynamic = "force-dynamic";

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

  const { data } = await supabaseAdmin
    .from("supplier_offerings")
    .select(
      "id, company_name, website, country_of_origin, scrape_status, last_scraped_at, products_found, status"
    )
    .not("website", "is", null)
    .neq("website", "")
    .order("scrape_status", { ascending: true })
    .order("company_name", { ascending: true });

  const { count: totalProducts } = await supabaseAdmin
    .from("supplier_products")
    .select("*", { count: "exact", head: true });

  const suppliers = (data ?? []) as SupplierRow[];

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
        <div className="flex items-center gap-3 flex-wrap mb-4">
          <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 text-sm font-medium px-3 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            {counts.scraped} scraped
          </span>
          <span className="inline-flex items-center gap-1.5 bg-orange-50 text-orange-700 text-sm font-medium px-3 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
            {counts.pending} pending
          </span>
          <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 text-sm font-medium px-3 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
            {counts.failed} failed
          </span>
          <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 text-sm font-medium px-3 py-1 rounded-full">
            {totalProducts ?? 0} total products extracted
          </span>
        </div>

        {/* Script instructions */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-600 space-y-2">
          <p>To scrape all pending suppliers, run:</p>
          <code className="block bg-slate-100 px-3 py-1.5 rounded text-xs font-mono">
            npx tsx scripts/08-scrape-suppliers.ts --limit=50
          </code>
          <p>To scrape a specific supplier:</p>
          <code className="block bg-slate-100 px-3 py-1.5 rounded text-xs font-mono">
            npx tsx scripts/08-scrape-suppliers.ts --supplier=[id]
          </code>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto">
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

        {/* Table */}
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
                <ScraperTableClient suppliers={filtered} />
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
