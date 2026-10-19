"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { PitchGeneratorModal } from "./PitchGeneratorModal";

export type AssortmentMatchRow = {
  id: string;
  match_score: number;
  vector_similarity: number | null;
  category_match: boolean | null;
  kosher_match: boolean | null;
  pitch_angle: string | null;
  potential_margin_gain: string | null;
  status: "proposed" | "reviewed" | "pitched" | "rejected";
  created_at: string;
  buyer: {
    id: string;
    company_name: string;
    buyer_type: string | null;
    website: string | null;
    notes?: string | null;
  } | null;
  assortment: {
    id: string;
    product_name: string;
    brand_name: string | null;
    manufacturer_country: string | null;
    retail_price_ils: number | null;
    package_size: string | null;
    barcode_gtin: string | null;
    category?: { id: string; name: string } | null;
  } | null;
  supplier_product: {
    id: string;
    product_name: string;
    category_id: string | null;
    subcategory: string | null;
    formats: string[] | null;
    image_url: string | null;
    category?: { id: string; name: string } | null;
  } | null;
  supplier: {
    id: string;
    company_name: string;
    country_of_origin: string | null;
    website: string | null;
    verified: boolean | null;
    certifications: string[] | null;
    contact_email: string | null;
  } | null;
};

interface Props {
  initialMatches: AssortmentMatchRow[];
}

export function OpportunitiesDashboardClient({ initialMatches }: Props) {
  const [matches, setMatches] = useState<AssortmentMatchRow[]>(initialMatches);
  const [search, setSearch] = useState("");
  const [selectedBuyer, setSelectedBuyer] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [minScore, setMinScore] = useState<number>(0);
  const [statusTab, setStatusTab] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [activePitchMatch, setActivePitchMatch] = useState<AssortmentMatchRow | null>(null);
  const [isRunningMatcher, setIsRunningMatcher] = useState(false);
  const [matcherMessage, setMatcherMessage] = useState<string | null>(null);

  // Extract unique buyers
  const buyerOptions = useMemo(() => {
    const set = new Set<string>();
    matches.forEach((m) => {
      if (m.buyer?.company_name) set.add(m.buyer.company_name);
    });
    return Array.from(set).sort();
  }, [matches]);

  // Extract unique categories
  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    matches.forEach((m) => {
      const catName =
        m.assortment?.category?.name ||
        m.supplier_product?.category?.name;
      if (catName) set.add(catName);
    });
    return Array.from(set).sort();
  }, [matches]);

  // Filter matches
  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      if (statusTab !== "all" && m.status !== statusTab) return false;
      if (selectedBuyer !== "all" && m.buyer?.company_name !== selectedBuyer) return false;

      const catName =
        m.assortment?.category?.name ||
        m.supplier_product?.category?.name;
      if (selectedCategory !== "all" && catName !== selectedCategory) return false;

      if (minScore > 0 && m.match_score < minScore) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const bName = m.buyer?.company_name?.toLowerCase() || "";
        const targetSku = m.assortment?.product_name?.toLowerCase() || "";
        const sName = m.supplier?.company_name?.toLowerCase() || "";
        const sProduct = m.supplier_product?.product_name?.toLowerCase() || "";
        const origin = (m.supplier?.country_of_origin || "").toLowerCase();
        const pitch = (m.pitch_angle || "").toLowerCase();
        if (
          !bName.includes(q) &&
          !targetSku.includes(q) &&
          !sName.includes(q) &&
          !sProduct.includes(q) &&
          !origin.includes(q) &&
          !pitch.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [matches, statusTab, selectedBuyer, selectedCategory, minScore, search]);

  // Status counts
  const counts = useMemo(() => {
    const c = { all: matches.length, proposed: 0, reviewed: 0, pitched: 0, rejected: 0 };
    matches.forEach((m) => {
      if (m.status in c) {
        c[m.status as keyof typeof c]++;
      }
    });
    return c;
  }, [matches]);

  // High confidence count (>= 75)
  const highConfidenceCount = useMemo(() => {
    return matches.filter((m) => m.match_score >= 75).length;
  }, [matches]);

  // Handle status update
  const handleUpdateStatus = async (
    id: string,
    newStatus: AssortmentMatchRow["status"]
  ) => {
    try {
      const res = await fetch("/api/admin/opportunities/update-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (res.ok) {
        setMatches((prev) =>
          prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
        );
      }
    } catch (e) {
      console.error("Status update error:", e);
    }
  };

  // Run on-demand matching engine
  const handleRunEngine = async () => {
    setIsRunningMatcher(true);
    setMatcherMessage(null);
    try {
      const res = await fetch("/api/admin/opportunities/run-matcher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minScore: 65, limit: 30 }),
      });
      const data = await res.json();
      if (data.ok) {
        setMatcherMessage(`✓ Evaluated ${data.assortmentsEvaluated} private-label SKUs. Found & created ${data.newMatchesCreated} new opportunity cards!`);
        // Refresh page to load updated matches
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setMatcherMessage(`Failed: ${data.error || "Engine error"}`);
      }
    } catch (e: any) {
      setMatcherMessage(`Error: ${e?.message || "Request failed"}`);
    } finally {
      setIsRunningMatcher(false);
    }
  };

  // Export filtered matches to CSV
  const handleExportCsv = () => {
    const headers = [
      "Match ID",
      "Buyer Retailer",
      "Target SKU",
      "Current Retail Price (ILS)",
      "Co-Pack Origin",
      "Matched Supplier",
      "Supplier Origin",
      "Factory Product",
      "Match Score",
      "Vector Similarity",
      "Margin Spread",
      "Pitch Angle",
      "Status",
    ];

    const rows = filteredMatches.map((m) => [
      m.id,
      m.buyer?.company_name || "",
      m.assortment?.product_name || "",
      m.assortment?.retail_price_ils ?? "",
      m.assortment?.manufacturer_country || "",
      m.supplier?.company_name || "",
      m.supplier?.country_of_origin || "",
      m.supplier_product?.product_name || "",
      m.match_score,
      ((m.vector_similarity ?? 0) * 100).toFixed(1) + "%",
      m.potential_margin_gain || "",
      `"${(m.pitch_angle || "").replace(/"/g, '""')}"`,
      m.status,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `FDX_Proactive_Opportunities_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Proposals</span>
            <span className="text-base">💡</span>
          </div>
          <div className="text-2xl font-black text-slate-900">{matches.length}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Reverse catalog match cards</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-600 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">High Confidence</span>
            <span className="text-base">🎯</span>
          </div>
          <div className="text-2xl font-black text-emerald-600">{highConfidenceCount}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Score ≥ 75% parity</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-blue-600 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Retailers</span>
            <span className="text-base">🏢</span>
          </div>
          <div className="text-2xl font-black text-blue-600">{buyerOptions.length}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Major Israeli supermarket chains</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-orange-600 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Avg Margin Spread</span>
            <span className="text-base">📈</span>
          </div>
          <div className="text-2xl font-black text-orange-600">15% – 25%</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Direct factory import gain</p>
        </div>
      </div>

      {/* Action Strip & Matcher Launcher */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={handleRunEngine}
            disabled={isRunningMatcher}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-2xs transition disabled:opacity-50"
          >
            <span>{isRunningMatcher ? "⏳" : "⚡"}</span>
            <span>{isRunningMatcher ? "Evaluating Catalog..." : "Run Reverse-Matching Engine"}</span>
          </button>
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition"
          >
            <span>📥</span>
            <span>Export CSV</span>
          </button>
          <Link
            href="/admin/scraper"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 text-xs font-semibold transition"
          >
            <span>🕷️</span>
            <span>Scraper Hub</span>
          </Link>
        </div>

        {matcherMessage && (
          <div className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
            {matcherMessage}
          </div>
        )}

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setViewMode("cards")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
              viewMode === "cards" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            🗂️ Cards View
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
              viewMode === "table" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            📊 Table View
          </button>
        </div>
      </div>

      {/* Filter & Status Navigation Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-slate-100">
          {(["all", "proposed", "reviewed", "pitched", "rejected"] as const).map((tab) => {
            const count = counts[tab];
            const active = statusTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setStatusTab(tab)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition flex items-center gap-1.5 ${
                  active
                    ? "bg-orange-500 text-white shadow-2xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span>{tab}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    active ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Dropdown Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          <div>
            <input
              type="text"
              placeholder="Search SKU, Retailer, Factory, Origin..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-500 transition"
            />
          </div>

          <div>
            <select
              value={selectedBuyer}
              onChange={(e) => setSelectedBuyer(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-orange-500 transition"
            >
              <option value="all">All Enterprise Retailers ({buyerOptions.length})</option>
              {buyerOptions.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-orange-500 transition"
            >
              <option value="all">All Categories ({categoryOptions.length})</option>
              {categoryOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-orange-500 transition"
            >
              <option value={0}>All Match Scores (≥ 65%)</option>
              <option value={70}>Score ≥ 70%</option>
              <option value={75}>Score ≥ 75% (High Parity)</option>
              <option value={80}>Score ≥ 80% (Exceptional Match)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content: Cards or Table */}
      {filteredMatches.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-12 text-center space-y-3">
          <span className="text-3xl">🔍</span>
          <h3 className="text-sm font-bold text-slate-800">No Match Opportunities Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Try adjusting your search query, retailer filter, or score threshold, or click{" "}
            <strong>Run Reverse-Matching Engine</strong> above to generate new proposals.
          </p>
        </div>
      ) : viewMode === "cards" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredMatches.map((m) => (
            <OpportunityCard
              key={m.id}
              match={m}
              onUpdateStatus={handleUpdateStatus}
              onOpenPitch={() => setActivePitchMatch(m)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Retailer / Buyer</th>
                  <th className="px-4 py-3">Target Retail SKU</th>
                  <th className="px-4 py-3">Shelf Price</th>
                  <th className="px-4 py-3">Matched Factory</th>
                  <th className="px-4 py-3">Factory Origin</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Margin Gain</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMatches.map((m) => {
                  const bName = m.buyer?.company_name || "Enterprise Retailer";
                  const targetSku = m.assortment?.product_name || "Private Label Item";
                  const price = m.assortment?.retail_price_ils
                    ? `₪${m.assortment.retail_price_ils.toFixed(2)}`
                    : "—";
                  const supName = m.supplier?.company_name || "Factory";
                  const country = m.supplier?.country_of_origin || "Global";

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3 font-bold text-slate-900">{bName}</td>
                      <td className="px-4 py-3 font-medium text-slate-800 max-w-56 truncate" title={targetSku}>
                        {targetSku}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{price}</td>
                      <td className="px-4 py-3 text-slate-800 max-w-48 truncate" title={supName}>
                        {supName}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {country}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`font-black px-2 py-0.5 rounded text-xs ${
                            m.match_score >= 75
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-orange-100 text-orange-800"
                          }`}
                        >
                          {m.match_score}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-medium">15–25%</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={m.status} />
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setActivePitchMatch(m)}
                            className="px-2.5 py-1 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 font-semibold text-[11px] transition"
                          >
                            💡 Pitch
                          </button>
                          <select
                            value={m.status}
                            onChange={(e) =>
                              handleUpdateStatus(m.id, e.target.value as AssortmentMatchRow["status"])
                            }
                            className="text-[11px] bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700 font-medium focus:outline-none"
                          >
                            <option value="proposed">Proposed</option>
                            <option value="reviewed">Reviewed</option>
                            <option value="pitched">Pitched</option>
                            <option value="rejected">Rejected</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pitch Modal */}
      {activePitchMatch && (
        <PitchGeneratorModal
          match={activePitchMatch}
          onClose={() => setActivePitchMatch(null)}
          onStatusUpdated={(id, newStatus) => {
            setMatches((prev) =>
              prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
            );
          }}
        />
      )}
    </div>
  );
}

function OpportunityCard({
  match,
  onUpdateStatus,
  onOpenPitch,
}: {
  match: AssortmentMatchRow;
  onUpdateStatus: (id: string, newStatus: AssortmentMatchRow["status"]) => void;
  onOpenPitch: () => void;
}) {
  const buyerName = match.buyer?.company_name || "Enterprise Retailer";
  const targetSku = match.assortment?.product_name || "Private Label Item";
  const price = match.assortment?.retail_price_ils
    ? `₪${match.assortment.retail_price_ils.toFixed(2)}`
    : null;
  const currentOrigin = match.assortment?.manufacturer_country;
  const supName = match.supplier?.company_name || "Direct Factory";
  const supCountry = match.supplier?.country_of_origin || "Global";
  const supProduct = match.supplier_product?.product_name || targetSku;
  const formats = match.supplier_product?.formats?.slice(0, 2).join(", ");

  const isOriginMatch =
    currentOrigin &&
    supCountry &&
    supCountry.toLowerCase().includes(currentOrigin.toLowerCase());

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs hover:shadow-xs transition space-y-4 flex flex-col justify-between">
      <div className="space-y-3">
        {/* Top Header Strip */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-bold text-xs uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-900 text-white">
                {buyerName}
              </span>
              <span className="text-[11px] font-semibold text-slate-500">
                {match.assortment?.brand_name} Private Label
              </span>
              {currentOrigin && (
                <span className="text-[11px] text-slate-400">
                  (Co-packed in {currentOrigin})
                </span>
              )}
            </div>
            <h4 className="text-sm font-bold text-slate-900 truncate" title={targetSku}>
              {targetSku}
            </h4>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className={`font-black text-xs px-2.5 py-1 rounded-lg border ${
                match.match_score >= 75
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-orange-50 text-orange-800 border-orange-200"
              }`}
            >
              {match.match_score}% Parity
            </span>
            <StatusBadge status={match.status} />
          </div>
        </div>

        {/* Benchmarking Side-by-Side Box */}
        <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
          {/* Left: Buyer Shelf SKU */}
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Current Shelf Benchmark
            </p>
            <p className="font-semibold text-slate-800 truncate" title={targetSku}>
              {targetSku}
            </p>
            <p className="text-slate-500 font-medium">
              Retail: <strong className="text-slate-900">{price || "N/A"}</strong>
            </p>
          </div>

          {/* Right: Matched Factory Parity */}
          <div className="space-y-1 border-l border-slate-200 pl-3">
            <p className="text-[10px] font-bold text-orange-600 uppercase tracking-wider flex items-center gap-1">
              <span>🏭 Matched Factory Parity</span>
              {isOriginMatch && (
                <span className="bg-emerald-100 text-emerald-800 text-[9px] px-1.5 rounded font-bold">
                  Origin Parity
                </span>
              )}
            </p>
            <p className="font-bold text-slate-900 truncate" title={supName}>
              {supName}
            </p>
            <p className="text-slate-600 truncate" title={supProduct}>
              {supProduct} ({supCountry})
            </p>
            {formats && <p className="text-[11px] text-slate-400 truncate">{formats}</p>}
          </div>
        </div>

        {/* Pitch Angle & Commercial Margin Strip */}
        <div className="p-2.5 rounded-xl bg-orange-50/50 border border-orange-100/80 space-y-1.5 text-xs">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-orange-950 flex items-center gap-1">
              <span>💡 Pitch Angle</span>
            </span>
            <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              {match.potential_margin_gain || "15-25% Margin Gain"}
            </span>
          </div>
          <p className="text-slate-700 text-[11px] leading-relaxed">
            {match.pitch_angle ||
              "Direct manufacturer sourcing bypassing middlemen with full kosher and import documentation."}
          </p>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
        <button
          onClick={onOpenPitch}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs transition shadow-2xs"
        >
          <span>💡</span>
          <span>Generate Pitch / RFP</span>
        </button>

        <div className="flex items-center gap-1.5">
          {match.status === "proposed" && (
            <button
              onClick={() => onUpdateStatus(match.id, "reviewed")}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-medium transition"
            >
              ✓ Review
            </button>
          )}
          {match.status !== "pitched" && (
            <button
              onClick={() => onUpdateStatus(match.id, "pitched")}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-medium transition"
            >
              🚀 Pitch
            </button>
          )}
          {match.status !== "rejected" && (
            <button
              onClick={() => onUpdateStatus(match.id, "rejected")}
              className="px-2 py-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 text-xs transition"
              title="Reject match"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    proposed: "bg-amber-50 text-amber-700 border-amber-200",
    reviewed: "bg-blue-50 text-blue-700 border-blue-200",
    pitched: "bg-purple-50 text-purple-700 border-purple-200",
    rejected: "bg-red-50 text-red-600 border-red-200",
  };
  return (
    <span
      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider ${
        map[status] ?? "bg-slate-100 text-slate-600 border-slate-200"
      }`}
    >
      {status}
    </span>
  );
}
