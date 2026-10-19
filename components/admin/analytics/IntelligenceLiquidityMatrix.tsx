"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { CategoryStat, IntelligencePayload } from "@/lib/admin/intelligenceService";

interface Props {
  data: IntelligencePayload;
}

export function IntelligenceLiquidityMatrix({ data }: Props) {
  const { categories, overview } = data;
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "deficit" | "liquid" | "deep">("all");

  const totalDemand = useMemo(() => {
    return categories.reduce((sum, c) => sum + (c.demand_count ?? 0), 0);
  }, [categories]);

  // Compute liquidity stats for each category
  const categoriesWithStatus = useMemo(() => {
    return categories.map((cat) => {
      const demand = cat.demand_count ?? 0;
      const suppliers = cat.supplier_count ?? 0;
      const products = cat.product_count ?? 0;

      let status: "deficit" | "liquid" | "deep";
      let statusLabel: string;
      let badgeStyle: { bg: string; text: string; border: string };

      if (demand > 0 && suppliers < 4) {
        status = "deficit";
        statusLabel = "🚨 High Deficit";
        badgeStyle = { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" };
      } else if (demand > 0 && suppliers >= 4) {
        status = "liquid";
        statusLabel = "⚡ Matchable Liquidity";
        badgeStyle = { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" };
      } else {
        status = "deep";
        statusLabel = "📦 Supply Reservoir";
        badgeStyle = { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" };
      }

      return {
        ...cat,
        status,
        statusLabel,
        badgeStyle,
        plPct: products > 0 ? Math.round((cat.private_label_count / products) * 100) : 0,
        kosherPct: products > 0 ? Math.round((cat.kosher_count / products) * 100) : 0,
      };
    });
  }, [categories]);

  // Filtered categories
  const filtered = useMemo(() => {
    let result = categoriesWithStatus;

    if (filterType !== "all") {
      result = result.filter((c) => c.status === filterType);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((c) => c.category.toLowerCase().includes(q));
    }

    return result;
  }, [categoriesWithStatus, filterType, search]);

  const deficitCount = categoriesWithStatus.filter((c) => c.status === "deficit").length;
  const liquidCount = categoriesWithStatus.filter((c) => c.status === "liquid").length;
  const deepCount = categoriesWithStatus.filter((c) => c.status === "deep").length;

  return (
    <div className="space-y-6">
      {/* 4 Summary Liquidity KPI Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Inbound Demand</span>
            <span>📥</span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {totalDemand.toLocaleString()} Requests
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Active buyer sourcing mandates
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Catalog Supply</span>
            <span>📦</span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {overview.total_products.toLocaleString()} SKUs
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Across {overview.manufacturers.toLocaleString()} verified producers
          </div>
        </div>

        <div className="bg-rose-50/60 border border-rose-200/80 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-rose-600 text-xs font-semibold uppercase tracking-wider">
            <span>Supply Deficits</span>
            <span>🚨</span>
          </div>
          <div className="text-2xl font-black text-rose-900 mt-1">
            {deficitCount} Categories
          </div>
          <div className="text-[11px] text-rose-700 mt-0.5">
            High buyer demand · Scraper priority
          </div>
        </div>

        <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-600 text-xs font-semibold uppercase tracking-wider">
            <span>Match-Ready Liquid</span>
            <span>⚡</span>
          </div>
          <div className="text-2xl font-black text-emerald-900 mt-1">
            {liquidCount} Categories
          </div>
          <div className="text-[11px] text-emerald-700 mt-0.5">
            Active demand &amp; deep supply ready to close
          </div>
        </div>
      </div>

      {/* Critical Deficit Action Callout */}
      {deficitCount > 0 && (
        <div className="bg-gradient-to-r from-rose-950 via-slate-900 to-slate-950 border border-rose-900/60 rounded-3xl p-6 text-white shadow-md relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-wider mb-1">
                <span>🚨 High Sourcing Deficits Detected</span>
              </div>
              <h3 className="text-lg font-black text-white">
                Buyers are waiting in {deficitCount} categories with thin supplier depth
              </h3>
              <p className="text-slate-300 text-xs mt-1 leading-relaxed max-w-2xl">
                These categories have multiple buyer sourcing requests but fewer than 4 verified factories. Target your next scraper batches or outreach to European manufacturers in these categories.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/admin/scraper"
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition shadow-xs whitespace-nowrap"
              >
                Launch Targeted Scraper &rarr;
              </Link>
              <Link
                href="/admin/deals"
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs transition whitespace-nowrap"
              >
                Review Deals
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search category name…"
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none transition focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 self-start md:self-auto text-xs bg-slate-100 p-1 rounded-xl">
            {(
              [
                { id: "all", label: `All (${categories.length})` },
                { id: "deficit", label: `🚨 Deficit (${deficitCount})` },
                { id: "liquid", label: `⚡ Liquid (${liquidCount})` },
                { id: "deep", label: `📦 Deep Supply (${deepCount})` },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterType(f.id)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  filterType === f.id
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-max">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left min-w-[200px]">Food Category</th>
                <th className="px-4 py-3 text-center">Buyer Demand</th>
                <th className="px-4 py-3 text-center">Producer Supply</th>
                <th className="px-4 py-3 text-center">Catalog SKUs</th>
                <th className="px-4 py-3 text-left">OEM / Kosher Readiness</th>
                <th className="px-4 py-3 text-left">Liquidity Status</th>
                <th className="px-4 py-3 text-right">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((item) => {
                return (
                  <tr key={item.category} className="hover:bg-slate-50/70 transition-colors">
                    {/* Category Name */}
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900 text-sm">
                        {item.category}
                      </div>
                    </td>

                    {/* Buyer Demand */}
                    <td className="px-4 py-3 text-center">
                      {item.demand_count > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-orange-100 text-orange-800 border border-orange-200">
                          <span>📥</span>
                          <span>{item.demand_count} requests</span>
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 font-mono">0</span>
                      )}
                    </td>

                    {/* Producer Supply */}
                    <td className="px-4 py-3 text-center">
                      <span className="font-mono font-bold text-slate-800 text-xs">
                        {item.supplier_count.toLocaleString()} factories
                      </span>
                    </td>

                    {/* Catalog SKUs */}
                    <td className="px-4 py-3 text-center">
                      <span className="font-mono text-slate-700 text-xs">
                        {item.product_count.toLocaleString()} SKUs
                      </span>
                    </td>

                    {/* OEM & Kosher Readiness */}
                    <td className="px-4 py-3 text-xs space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">🏷️ OEM:</span>
                        <span className="font-semibold text-slate-700">
                          {item.private_label_count} ({item.plPct}%)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">✡️ Kosher:</span>
                        <span className="font-semibold text-slate-700">
                          {item.kosher_count} ({item.kosherPct}%)
                        </span>
                      </div>
                    </td>

                    {/* Liquidity Status */}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2.5 py-1 text-xs font-bold rounded-full border ${item.badgeStyle.bg} ${item.badgeStyle.text} ${item.badgeStyle.border}`}
                      >
                        {item.statusLabel}
                      </span>
                    </td>

                    {/* Quick Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        {item.demand_count > 0 && (
                          <Link
                            href="/admin/deals"
                            className="px-2.5 py-1 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 text-xs font-semibold transition"
                          >
                            Match Deals
                          </Link>
                        )}
                        <Link
                          href={`/admin/suppliers?category=${encodeURIComponent(item.category)}`}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                        >
                          Suppliers &rarr;
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 px-4">
            <div className="text-2xl mb-1">🔍</div>
            <p className="text-xs text-slate-500">No categories found matching this filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}
