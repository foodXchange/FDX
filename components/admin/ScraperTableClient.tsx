"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import SupplierProductsSlideOver from "@/components/admin/SupplierProductsSlideOver";
import { approveSuppliers, deleteSuppliers } from "@/app/admin/scraper/actions";

type Supplier = {
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
  if (!types || types.length === 0)
    return <span className="text-slate-300">—</span>;
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

function SourceBadge({ source }: { source: string | null | undefined }) {
  if (!source) return <span className="text-slate-300">—</span>;
  if (source.startsWith("perplexity:"))
    return (
      <span className="text-xs bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full">
        Perplexity
      </span>
    );
  return (
    <span className="text-xs bg-sky-50 text-sky-700 border border-sky-200 px-2 py-0.5 rounded-full">
      Firecrawl
    </span>
  );
}

function ScraperRow({
  supplier,
  factoryCount,
  kosherTypes,
  checked,
  onToggle,
}: {
  supplier: Supplier;
  factoryCount: number;
  kosherTypes: string[];
  checked: boolean;
  onToggle: (id: string) => void;
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
        {/* Checkbox */}
        <td className="px-4 py-3 w-10">
          <input
            type="checkbox"
            checked={checked}
            onChange={() => onToggle(supplier.id)}
            className="rounded border-gray-300 cursor-pointer"
          />
        </td>

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

        {/* Source */}
        <td className="px-4 py-3">
          <SourceBadge source={supplier.scrape_source} />
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

type StatusKey = "all" | "pending" | "scraped" | "failed";

export default function ScraperTableClient({
  suppliers,
  factoryCountMap = {},
  primaryKosherMap = {},
}: {
  suppliers: Supplier[];
  factoryCountMap?: Record<string, number>;
  primaryKosherMap?: Record<string, string[]>;
}) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<StatusKey>("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const selectAllRef = useRef<HTMLInputElement>(null);

  const counts = useMemo(
    () =>
      suppliers.reduce(
        (acc, s) => {
          const st = s.scrape_status ?? "pending";
          if (st === "pending") acc.pending++;
          else if (st === "scraped") acc.scraped++;
          else if (st === "failed") acc.failed++;
          else if (st === "skipped") acc.skipped++;
          return acc;
        },
        { pending: 0, scraped: 0, failed: 0, skipped: 0 }
      ),
    [suppliers]
  );

  const uniqueCountries = useMemo(() => {
    const s = new Set(
      suppliers
        .map((sup) => sup.country_of_origin)
        .filter((c): c is string => !!c)
    );
    return [...Array.from(s).sort()];
  }, [suppliers]);

  const uniqueCategories = useMemo(() => {
    const s = new Set(suppliers.flatMap((sup) => sup.categories ?? []));
    return [...Array.from(s).sort()];
  }, [suppliers]);

  const filtered = useMemo(
    () =>
      suppliers.filter((s) => {
        if (
          statusFilter !== "all" &&
          (s.scrape_status ?? "pending") !== statusFilter
        )
          return false;
        if (countryFilter !== "all" && s.country_of_origin !== countryFilter)
          return false;
        if (
          categoryFilter !== "all" &&
          !(s.categories ?? []).includes(categoryFilter)
        )
          return false;
        return true;
      }),
    [suppliers, statusFilter, countryFilter, categoryFilter]
  );

  // Sync select-all indeterminate state
  useEffect(() => {
    if (selectAllRef.current) {
      const allSelected =
        filtered.length > 0 && filtered.every((s) => selectedIds.has(s.id));
      const someSelected = filtered.some((s) => selectedIds.has(s.id));
      selectAllRef.current.checked = allSelected;
      selectAllRef.current.indeterminate = someSelected && !allSelected;
    }
  }, [selectedIds, filtered]);

  function toggleSelectAll() {
    const allSelected = filtered.every((s) => selectedIds.has(s.id));
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((s) => next.delete(s.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((s) => next.add(s.id));
        return next;
      });
    }
  }

  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleBulkRescrape() {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    const ids = [...selectedIds];
    for (const id of ids) {
      try {
        await fetch("/api/admin/scraper", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ supplierId: id, action: "scrape" }),
        });
      } catch {
        // continue with remaining IDs
      }
    }
    setBulkLoading(false);
    setSelectedIds(new Set());
    router.refresh();
  }

  async function handleBulkApprove() {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    const result = await approveSuppliers([...selectedIds]);
    setBulkLoading(false);
    if (result.ok) {
      setSelectedIds(new Set());
      router.refresh();
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    const confirmed = window.confirm(
      `Delete ${selectedIds.size} supplier${selectedIds.size !== 1 ? "s" : ""}? This cannot be undone.`
    );
    if (!confirmed) return;
    setBulkLoading(true);
    const result = await deleteSuppliers([...selectedIds]);
    setBulkLoading(false);
    if (result.ok) {
      setSelectedIds(new Set());
      router.refresh();
    }
  }

  const STATUS_PILLS: { key: StatusKey; label: string }[] = [
    { key: "all", label: `All (${suppliers.length})` },
    { key: "pending", label: `Pending (${counts.pending})` },
    { key: "scraped", label: `Scraped (${counts.scraped})` },
    { key: "failed", label: `Failed (${counts.failed})` },
  ];

  const TABLE_HEADERS = [
    "Company",
    "Website",
    "Status",
    "Source",
    "Products",
    "Factories",
    "Kosher",
    "Last scraped",
    "Actions",
  ];

  return (
    <div>
      {/* Filters row */}
      <div className="flex gap-2 flex-wrap items-center mb-4">
        {STATUS_PILLS.map((p) => (
          <button
            key={p.key}
            onClick={() => setStatusFilter(p.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === p.key
                ? "bg-blue-500 text-white"
                : "bg-white border border-gray-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {p.label}
          </button>
        ))}

        {uniqueCountries.length > 0 && (
          <select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-slate-600 bg-white"
          >
            <option value="all">All countries</option>
            {uniqueCountries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}

        {uniqueCategories.length > 0 && (
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-slate-600 bg-white"
          >
            <option value="all">All categories</option>
            {uniqueCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl mb-3 flex-wrap">
          <span className="text-sm font-medium text-blue-800">
            {selectedIds.size} selected
          </span>
          <button
            onClick={handleBulkRescrape}
            disabled={bulkLoading}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-50 transition"
          >
            Re-scrape
          </button>
          <button
            onClick={handleBulkApprove}
            disabled={bulkLoading}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-green-500 hover:bg-green-600 text-white disabled:opacity-50 transition"
          >
            Approve all
          </button>
          <button
            onClick={handleBulkDelete}
            disabled={bulkLoading}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 transition"
          >
            Delete
          </button>
          {bulkLoading && (
            <span className="text-xs text-blue-600 flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              Working...
            </span>
          )}
        </div>
      )}

      {/* Table or empty state */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          No suppliers match the current filters.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 w-10">
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 cursor-pointer"
                  />
                </th>
                {TABLE_HEADERS.map((h) => (
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
              {filtered.map((s) => (
                <ScraperRow
                  key={s.id}
                  supplier={s}
                  factoryCount={factoryCountMap[s.id] ?? 0}
                  kosherTypes={primaryKosherMap[s.id] ?? []}
                  checked={selectedIds.has(s.id)}
                  onToggle={toggleRow}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
