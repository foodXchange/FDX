"use client";

import React, { useState, useMemo } from "react";

export interface EcosystemCompanyRow {
  id: string;
  company_name: string;
  country: string | null;
  sectorGroup:
    | "packaging_wrapping"
    | "machinery_equipment"
    | "ingredients_additives"
    | "trade_consortia"
    | "labs_logistics_tech"
    | "importers_wholesalers";
  subcategory: string;
  businessRole: string | null;
  summary: string | null;
  tags: string[];
  capabilities: string[];
  logoUrl: string | null;
  isPotentialBuyer: boolean;
  email: string | null;
  phone: string | null;
  website: string | null;
}

export interface ProductDepthMetrics {
  totalProducts: number;
  manufacturersWithProducts: number;
  completedScrapedManufacturers: number;
  avgPerActiveManufacturer: number;
  avgPerCompletedManufacturer: number;
  deep8PlusCount: number;
  medium3To7Count: number;
  thin1To2Count: number;
}

interface Props {
  depthMetrics: ProductDepthMetrics;
  ecosystemRows: EcosystemCompanyRow[];
}

const SECTOR_META: Record<
  EcosystemCompanyRow["sectorGroup"],
  {
    title: string;
    shortTitle: string;
    subtitle: string;
    badgeBg: string;
    badgeText: string;
    activeBorder: string;
    icon: string;
  }
> = {
  packaging_wrapping: {
    title: "Wrapping, Packaging & Food-Contact Materials",
    shortTitle: "Wrapping & Packaging",
    subtitle:
      "Flexible barrier films, pouches, biodegradable wraps, trays, glass jars, cartons, tins & HoReCa disposables",
    badgeBg: "bg-amber-50",
    badgeText: "text-amber-800",
    activeBorder: "border-amber-500 ring-2 ring-amber-500/20",
    icon: "📦",
  },
  machinery_equipment: {
    title: "Food Production, Processing & Wrapping Machinery",
    shortTitle: "Production & Wrapping Machines",
    subtitle:
      "Thermoforming & flow-pack wrapping lines, food processing machines, bakery/pasta lines, blast chillers & bottling",
    badgeBg: "bg-indigo-50",
    badgeText: "text-indigo-800",
    activeBorder: "border-indigo-500 ring-2 ring-indigo-500/20",
    icon: "⚙️",
  },
  ingredients_additives: {
    title: "Industrial Food Ingredients, Proteins & Additives",
    shortTitle: "Ingredients & Raw Materials",
    subtitle:
      "Bulk raw materials, plant proteins, probiotics, natural flavours, clean-label fibres, starches & texturisers",
    badgeBg: "bg-emerald-50",
    badgeText: "text-emerald-800",
    activeBorder: "border-emerald-500 ring-2 ring-emerald-500/20",
    icon: "🧪",
  },
  trade_consortia: {
    title: "PDO/PGI Consortia, Cooperatives & Export Agencies",
    shortTitle: "PDO Consortia & Agencies",
    subtitle:
      "Official protection consortia, national export boards & producer associations (each representing 50–300 factories)",
    badgeBg: "bg-purple-50",
    badgeText: "text-purple-800",
    activeBorder: "border-purple-500 ring-2 ring-purple-500/20",
    icon: "🏛️",
  },
  labs_logistics_tech: {
    title: "Food Safety Labs, Cold-Chain Logistics, Hygiene & Retail Tech",
    shortTitle: "Labs, Cold-Chain & Hygiene",
    subtitle:
      "BRC/IFS/ISO auditing & lab testing (Eurofins, V-Label), cold-chain freight, factory sanitation & supermarket fixtures",
    badgeBg: "bg-cyan-50",
    badgeText: "text-cyan-800",
    activeBorder: "border-cyan-500 ring-2 ring-cyan-500/20",
    icon: "🔬",
  },
  importers_wholesalers: {
    title: "Food Importers, Distributors & Wholesale Buyers",
    shortTitle: "Importers & Wholesale Buyers",
    subtitle:
      "Non-manufacturing food importers, distributors, traders & retail chains — prime B2B buyer leads for FoodXchange",
    badgeBg: "bg-rose-50",
    badgeText: "text-rose-800",
    activeBorder: "border-rose-500 ring-2 ring-rose-500/20",
    icon: "🚢",
  },
};

const SECTOR_ORDER: EcosystemCompanyRow["sectorGroup"][] = [
  "packaging_wrapping",
  "machinery_equipment",
  "ingredients_additives",
  "trade_consortia",
  "labs_logistics_tech",
  "importers_wholesalers",
];

export function B2BEcosystemAndDepthPanel({
  depthMetrics,
  ecosystemRows,
}: Props) {
  const [selectedSector, setSelectedSector] =
    useState<EcosystemCompanyRow["sectorGroup"]>("packaging_wrapping");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  const sectorCounts = useMemo(() => {
    const counts: Record<EcosystemCompanyRow["sectorGroup"], number> = {
      packaging_wrapping: 0,
      machinery_equipment: 0,
      ingredients_additives: 0,
      trade_consortia: 0,
      labs_logistics_tech: 0,
      importers_wholesalers: 0,
    };
    for (const r of ecosystemRows) {
      counts[r.sectorGroup] = (counts[r.sectorGroup] || 0) + 1;
    }
    return counts;
  }, [ecosystemRows]);

  const rowsInSector = useMemo(
    () => ecosystemRows.filter((r) => r.sectorGroup === selectedSector),
    [ecosystemRows, selectedSector]
  );

  const subcategoryList = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rowsInSector) {
      const sub = r.subcategory || "General";
      map.set(sub, (map.get(sub) || 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [rowsInSector]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rowsInSector.filter((r) => {
      if (
        selectedSubcategory !== "ALL" &&
        (r.subcategory || "General") !== selectedSubcategory
      ) {
        return false;
      }
      if (!q) return true;
      return (
        r.company_name.toLowerCase().includes(q) ||
        (r.country || "").toLowerCase().includes(q) ||
        (r.subcategory || "").toLowerCase().includes(q) ||
        (r.summary || "").toLowerCase().includes(q) ||
        (r.email || "").toLowerCase().includes(q) ||
        r.tags.some((t) => t.toLowerCase().includes(q)) ||
        r.capabilities.some((c) => c.toLowerCase().includes(q))
      );
    });
  }, [rowsInSector, selectedSubcategory, searchQuery]);

  const totalMfg = Math.max(depthMetrics.manufacturersWithProducts, 1);
  const deepPct = Math.round((depthMetrics.deep8PlusCount / totalMfg) * 100);
  const medPct = Math.round((depthMetrics.medium3To7Count / totalMfg) * 100);
  const thinPct = Math.max(0, 100 - deepPct - medPct);

  function exportCurrentSectorCsv() {
    const headers = [
      "Company Name",
      "Country",
      "Sector",
      "Subcategory",
      "Business Role",
      "What They Produce / Offer",
      "Contact Email",
      "Contact Phone",
      "Website",
    ];
    const lines = [headers.join(",")];
    for (const r of filteredRows) {
      const esc = (v: string | null | undefined) =>
        `"${String(v ?? "").replace(/"/g, '""')}"`;
      lines.push(
        [
          esc(r.company_name),
          esc(r.country),
          esc(SECTOR_META[r.sectorGroup].shortTitle),
          esc(r.subcategory),
          esc(r.businessRole),
          esc(r.summary),
          esc(r.email),
          esc(r.phone),
          esc(r.website),
        ].join(",")
      );
    }
    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fdx-ecosystem-${selectedSector}-${selectedSubcategory.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const activeMeta = SECTOR_META[selectedSector];

  return (
    <div className="space-y-4">
      {/* PART 1: Manufacturer Product Depth & Average Products Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase tracking-wider">
                Catalog Depth Telemetry
              </span>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Average Products per Manufacturer & Depth Distribution
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Across{" "}
              <strong className="text-slate-800">
                {depthMetrics.manufacturersWithProducts.toLocaleString()}
              </strong>{" "}
              manufacturers with extracted products (
              <strong className="text-slate-800">
                {depthMetrics.totalProducts.toLocaleString()}
              </strong>{" "}
              total SKU/product lines in{" "}
              <code className="text-[11px] bg-slate-100 px-1 py-0.5 rounded">
                supplier_products
              </code>
              ).
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 px-3.5 py-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                Avg / Manufacturer
              </div>
              <div className="text-xl font-black text-indigo-950">
                {depthMetrics.avgPerActiveManufacturer}{" "}
                <span className="text-xs font-semibold text-indigo-700">
                  prods
                </span>
              </div>
              <div className="text-[10px] text-indigo-700/80">
                {depthMetrics.avgPerCompletedManufacturer} avg on completed
              </div>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 px-3.5 py-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                Deep (8+ Prods)
              </div>
              <div className="text-xl font-black text-emerald-950">
                {depthMetrics.deep8PlusCount.toLocaleString()}
              </div>
              <div className="text-[10px] text-emerald-700">
                {deepPct}% of manufacturers
              </div>
            </div>

            <div className="rounded-xl border border-blue-200 bg-blue-50/40 px-3.5 py-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
                Medium (3–7 Prods)
              </div>
              <div className="text-xl font-black text-blue-950">
                {depthMetrics.medium3To7Count.toLocaleString()}
              </div>
              <div className="text-[10px] text-blue-700">
                {medPct}% · Wave 2/3 upgrading
              </div>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/40 px-3.5 py-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                Thin (1–2 Prods)
              </div>
              <div className="text-xl font-black text-amber-950">
                {depthMetrics.thin1To2Count.toLocaleString()}
              </div>
              <div className="text-[10px] text-amber-700">
                {thinPct}% · Wave 1 upgrading
              </div>
            </div>
          </div>
        </div>

        {/* Stacked proportional bar */}
        <div className="mt-3">
          <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden flex">
            <div
              className="bg-emerald-500 h-full transition-all"
              style={{ width: `${deepPct}%` }}
              title={`Deep (8+ products): ${depthMetrics.deep8PlusCount.toLocaleString()} manufacturers (${deepPct}%)`}
            />
            <div
              className="bg-blue-500 h-full transition-all"
              style={{ width: `${medPct}%` }}
              title={`Medium (3–7 products): ${depthMetrics.medium3To7Count.toLocaleString()} manufacturers (${medPct}%)`}
            />
            <div
              className="bg-amber-400 h-full transition-all"
              style={{ width: `${thinPct}%` }}
              title={`Thin (1–2 products): ${depthMetrics.thin1To2Count.toLocaleString()} manufacturers (${thinPct}%)`}
            />
          </div>
        </div>
      </div>

      {/* PART 2: Interactive B2B Food Ecosystem & Non-Food Partners Hub */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 uppercase tracking-wider">
                Enriched Non-Food & Industrial Directory
              </span>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                B2B Food Ecosystem Partners ({ecosystemRows.length.toLocaleString()} Classified Companies)
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Automatically separated from food products so buyer search stays pure — while giving your sourcing team instant access to{" "}
              <strong className="text-slate-700">Wrapping & Packaging Manufacturers</strong>,{" "}
              <strong className="text-slate-700">Food Production Machinery</strong>,{" "}
              <strong className="text-slate-700">Industrial Ingredients</strong>,{" "}
              <strong className="text-slate-700">PDO Consortia</strong>, and{" "}
              <strong className="text-slate-700">Importer Buyer Leads</strong>.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={exportCurrentSectorCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition"
            >
              ⬇ Export {activeMeta.shortTitle} CSV ({filteredRows.length})
            </button>
            <button
              type="button"
              onClick={() => setIsExpanded((v) => !v)}
              className="inline-flex items-center px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition"
            >
              {isExpanded ? "Hide Table ▲" : "Show Table ▼"}
            </button>
          </div>
        </div>

        {/* 6 Clickable Sector Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2.5 mb-4">
          {SECTOR_ORDER.map((secKey) => {
            const meta = SECTOR_META[secKey];
            const count = sectorCounts[secKey] || 0;
            const active = selectedSector === secKey;
            return (
              <button
                key={secKey}
                type="button"
                onClick={() => {
                  setSelectedSector(secKey);
                  setSelectedSubcategory("ALL");
                  setIsExpanded(true);
                }}
                className={`text-left rounded-xl border p-3 transition ${
                  active
                    ? `${meta.activeBorder} bg-white shadow-xs`
                    : "border-slate-200 bg-slate-50/60 hover:bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-base">{meta.icon}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-black ${meta.badgeBg} ${meta.badgeText}`}
                  >
                    {count.toLocaleString()}
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-900 leading-snug">
                  {meta.shortTitle}
                </div>
              </button>
            );
          })}
        </div>

        {isExpanded && (
          <div className="border-t border-slate-200 pt-4 space-y-3">
            {/* Active Sector Header + Search */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span>{activeMeta.icon}</span>
                  <span>{activeMeta.title}</span>
                  <span className="text-slate-400 font-normal">
                    ({filteredRows.length} shown)
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {activeMeta.subtitle}
                </p>
              </div>

              <div className="w-full md:w-72">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search ${activeMeta.shortTitle.toLowerCase()}, country, product...`}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-slate-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Subcategory Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setSelectedSubcategory("ALL")}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition ${
                  selectedSubcategory === "ALL"
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                All Subcategories ({rowsInSector.length})
              </button>
              {subcategoryList.map(([subName, subCount]) => (
                <button
                  key={subName}
                  type="button"
                  onClick={() => setSelectedSubcategory(subName)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition ${
                    selectedSubcategory === subName
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {subName} ({subCount})
                </button>
              ))}
            </div>

            {/* Company & What They Produce Table */}
            <div className="overflow-x-auto max-h-96 overflow-y-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2.5">Company & Role</th>
                    <th className="px-3 py-2.5">Country</th>
                    <th className="px-3 py-2.5">Specialty / Subcategory</th>
                    <th className="px-3 py-2.5">
                      What They Produce, Specific Products & Capabilities (AI Analysed)
                    </th>
                    <th className="px-3 py-2.5">Contact & Web</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRows.slice(0, 120).map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/80 align-top">
                      <td className="px-3 py-2.5 max-w-56">
                        <div className="flex items-start gap-2.5">
                          {row.logoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={row.logoUrl}
                              alt=""
                              className="w-7 h-7 rounded-lg object-contain border border-slate-200 bg-white shrink-0 mt-0.5"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0 mt-0.5">
                              {row.company_name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 truncate">
                              {row.company_name}
                            </div>
                            <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                              {row.businessRole && (
                                <span className="text-[10px] font-medium text-slate-500 capitalize">
                                  {row.businessRole.replace(/_/g, " ")}
                                </span>
                              )}
                              {row.isPotentialBuyer && (
                                <span className="rounded bg-rose-100 text-rose-800 px-1.5 py-0.2 text-[9px] font-bold uppercase">
                                  Buyer Lead
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">
                        {row.country || "—"}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${activeMeta.badgeBg} ${activeMeta.badgeText}`}
                        >
                          {row.subcategory}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-slate-600 max-w-lg">
                        <p className="line-clamp-2 text-[11px] leading-relaxed text-slate-700">
                          {row.summary || "Classified B2B ecosystem supplier"}
                        </p>
                        {(row.tags.length > 0 || row.capabilities.length > 0) && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {row.tags.slice(0, 5).map((tag, i) => (
                              <span
                                key={`t-${i}`}
                                className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700"
                              >
                                {tag}
                              </span>
                            ))}
                            {row.capabilities.slice(0, 3).map((cap, i) => (
                              <span
                                key={`c-${i}`}
                                className="inline-flex items-center rounded-md bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700"
                              >
                                ✓ {cap}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          {row.website && (
                            <a
                              href={
                                row.website.startsWith("http")
                                  ? row.website
                                  : `https://${row.website}`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-semibold text-blue-600 hover:underline"
                            >
                              Website ↗
                            </a>
                          )}
                          {row.email && (
                            <a
                              href={`mailto:${row.email}`}
                              className="text-[11px] font-mono text-emerald-700 hover:underline truncate max-w-44"
                              title={row.email}
                            >
                              ✉ {row.email}
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredRows.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-xs text-slate-400"
                      >
                        No companies match your current filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
