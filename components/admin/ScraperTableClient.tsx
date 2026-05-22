"use client";

import { useState } from "react";
import SupplierProductsSlideOver from "@/components/admin/SupplierProductsSlideOver";

type Supplier = {
  id: string;
  company_name: string;
  website: string | null;
  country_of_origin: string | null;
  scrape_status: string | null;
  last_scraped_at: string | null;
  products_found: number | null;
  status: string | null;
};

type RowState = {
  scrape_status: string | null;
  products_found: number | null;
  last_scraped_at: string | null;
};

function StatusBadge({ status }: { status: string | null }) {
  const s = status ?? "pending";
  if (s === "scraped")
    return (
      <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-xs font-medium px-2.5 py-0.5 rounded-full">
        ✓ Scraped
      </span>
    );
  if (s === "failed")
    return (
      <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 text-xs font-medium px-2.5 py-0.5 rounded-full">
        ✗ Failed
      </span>
    );
  if (s === "skipped")
    return (
      <span className="bg-slate-50 text-slate-500 text-xs font-medium px-2.5 py-0.5 rounded-full">
        Skipped
      </span>
    );
  return (
    <span className="bg-orange-50 text-orange-700 text-xs font-medium px-2.5 py-0.5 rounded-full">
      Pending
    </span>
  );
}

function ProductCount({ count }: { count: number | null }) {
  const n = count ?? 0;
  if (n === 0) return <span className="text-slate-300">—</span>;
  if (n >= 6)
    return (
      <span className="text-green-600 font-semibold text-sm">{n} products</span>
    );
  return <span className="text-slate-600 text-sm">{n} products</span>;
}

function RelativeTime({ iso }: { iso: string | null }) {
  if (!iso) return <span className="text-slate-400">Never</span>;
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffMins = Math.floor(diffMs / 60000);
  let label: string;
  if (diffMins < 1) label = "just now";
  else if (diffMins < 60) label = `${diffMins}m ago`;
  else if (diffHours < 24) label = `${diffHours}h ago`;
  else if (diffDays < 30) label = `${diffDays}d ago`;
  else label = date.toLocaleDateString();
  return <span className="text-slate-500 text-sm">{label}</span>;
}

function KosherBadge({ types }: { types: string[] }) {
  if (!types || types.length === 0) return <span className="text-slate-300">—</span>;
  const abbr = types[0]
    .replace("Chief Rabbinate", "CR")
    .replace("Badatz Beit Yosef", "Badatz BY")
    .replace("Badatz Eida Chareidis", "Badatz EC")
    .replace("Orthodox Union", "OU")
    .slice(0, 12);
  return (
    <span className="inline-flex items-center gap-1 bg-orange-50 text-orange-700 text-xs font-medium px-2 py-0.5 rounded-full">
      ✡ {abbr}
    </span>
  );
}

function ScraperRow({
  supplier,
  factoryCount,
  kosherTypes,
}: {
  supplier: Supplier;
  factoryCount: number;
  kosherTypes: string[];
}) {
  const [state, setState] = useState<RowState>({
    scrape_status: supplier.scrape_status,
    products_found: supplier.products_found,
    last_scraped_at: supplier.last_scraped_at,
  });
  const [scraping, setScraping] = useState(false);
  const [slideOverOpen, setSlideOverOpen] = useState(false);

  async function handleScrape() {
    setScraping(true);
    try {
      const res = await fetch("/api/admin/scraper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierId: supplier.id, action: "scrape" }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        productsFound?: number;
      };
      if (json.ok) {
        setState({
          scrape_status: "scraped",
          products_found: json.productsFound ?? 0,
          last_scraped_at: new Date().toISOString(),
        });
      } else {
        setState((prev) => ({ ...prev, scrape_status: "failed" }));
      }
    } catch {
      setState((prev) => ({ ...prev, scrape_status: "failed" }));
    } finally {
      setScraping(false);
    }
  }

  async function handleSkip() {
    await fetch("/api/admin/scraper", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ supplierId: supplier.id, action: "skip" }),
    });
    setState((prev) => ({ ...prev, scrape_status: "skipped" }));
  }

  return (
    <>
      <tr className="hover:bg-gray-50 transition-colors">
        {/* Company */}
        <td className="px-4 py-3">
          <span className="font-medium text-gray-900 text-sm">
            {supplier.company_name}
          </span>
          {supplier.country_of_origin && (
            <span className="block text-xs text-slate-400">
              {supplier.country_of_origin}
            </span>
          )}
        </td>

        {/* Website */}
        <td className="px-4 py-3">
          {supplier.website ? (
            <a
              href={supplier.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline truncate max-w-[180px] block"
            >
              {supplier.website.replace(/^https?:\/\//, "")}
            </a>
          ) : (
            <span className="text-slate-300 text-xs">—</span>
          )}
        </td>

        {/* Status */}
        <td className="px-4 py-3">
          <StatusBadge status={state.scrape_status} />
        </td>

        {/* Products */}
        <td className="px-4 py-3">
          <ProductCount count={state.products_found} />
        </td>

        {/* Factories */}
        <td className="px-4 py-3">
          {factoryCount > 0 ? (
            <span className="text-slate-600 text-sm">{factoryCount} factory</span>
          ) : (
            <span className="text-slate-300">—</span>
          )}
        </td>

        {/* Kosher */}
        <td className="px-4 py-3">
          <KosherBadge types={kosherTypes} />
        </td>

        {/* Last scraped */}
        <td className="px-4 py-3">
          <RelativeTime iso={state.last_scraped_at} />
        </td>

        {/* Actions */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleScrape}
              disabled={scraping}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-orange-500 hover:bg-orange-600 text-white transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {scraping ? (
                <>
                  <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Scraping…
                </>
              ) : (
                "Scrape now"
              )}
            </button>

            {(state.products_found ?? 0) > 0 && (
              <button
                onClick={() => setSlideOverOpen(true)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
              >
                View products
              </button>
            )}

            {state.scrape_status !== "skipped" && (
              <button
                onClick={handleSkip}
                className="px-3 py-1.5 text-xs font-medium rounded-lg text-slate-400 hover:text-slate-600 transition"
              >
                Skip
              </button>
            )}
          </div>
        </td>
      </tr>

      {slideOverOpen && (
        <SupplierProductsSlideOver
          supplierId={supplier.id}
          companyName={supplier.company_name}
          onClose={() => setSlideOverOpen(false)}
        />
      )}
    </>
  );
}

export default function ScraperTableClient({
  suppliers,
  factoryCountMap = {},
  primaryKosherMap = {},
}: {
  suppliers: Supplier[];
  factoryCountMap?: Record<string, number>;
  primaryKosherMap?: Record<string, string[]>;
}) {
  return (
    <>
      {suppliers.map((s) => (
        <ScraperRow
          key={s.id}
          supplier={s}
          factoryCount={factoryCountMap[s.id] ?? 0}
          kosherTypes={primaryKosherMap[s.id] ?? []}
        />
      ))}
    </>
  );
}
