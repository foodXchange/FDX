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
  scrape_source: string | null;
  categories: string[] | null;
};

export default async function ScraperPage() {
  const [suppliersResult, productsCountResult, factoriesResult] =
    await Promise.all([
      supabaseAdmin
        .from("supplier_offerings")
        .select(
          "id, company_name, website, country_of_origin, scrape_status, last_scraped_at, products_found, status, scrape_source, categories"
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
          <ScraperConsole
            totalPending={counts.pending}
            totalAll={suppliers.length}
          />
        </div>

        {/* Supplier table — filtering/sorting owned by client component */}
        <div>
          <ScraperTableClient
            suppliers={suppliers}
            factoryCountMap={factoryCountMap}
            primaryKosherMap={primaryKosherMap}
          />
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
