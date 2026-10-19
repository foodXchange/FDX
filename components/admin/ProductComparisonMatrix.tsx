"use client";

import { useState, useTransition } from "react";
import {
  type SupplierQuotePayload,
  recordSupplierQuote,
  type AgentQuotationMargin,
} from "@/app/admin/requests/actions";
import AgentMarginPitchModal from "@/components/admin/AgentMarginPitchModal";

export type ComparisonSupplier = {
  matchId: string;
  supplierId: string;
  companyName: string;
  country: string | null;
  productName: string;
  matchScore: number;
  status: string;
  imageUrl?: string | null;
  quote?: {
    unit_price?: number | null;
    currency?: string | null;
    net_weight?: string | null;
    net_weight_grams?: number | null;
    packaging_format?: string | null;
    moq?: string | null;
    lead_time_weeks?: number | null;
    incoterm?: string | null;
    kosher_type?: string | null;
    certifications?: string[];
    cooperation_status?: "cooperating" | "counter_offer" | "declined";
    supplier_notes?: string | null;
    quoted_at?: string | null;
  } | null;
  agent_margin?: AgentQuotationMargin | null;
};

interface Props {
  requestId: string;
  buyerCompany: string;
  benchmark: {
    productName: string;
    benchmarkBrand?: string | null;
    category?: string | null;
    netWeight?: string | null;
    packagingFormat?: string | null;
    targetPrice?: string | null;
    targetVolume?: string | null;
    certifications: string[];
    imageUrl?: string | null;
  };
  suppliers: ComparisonSupplier[];
  onSelectForOrder?: (supplier: ComparisonSupplier) => void;
}

export default function ProductComparisonMatrix({
  requestId,
  buyerCompany,
  benchmark,
  suppliers: initialSuppliers,
  onSelectForOrder,
}: Props) {
  const [suppliers, setSuppliers] = useState<ComparisonSupplier[]>(initialSuppliers);
  const [filterMode, setFilterMode] = useState<"all" | "quoted_only" | "top_tier">("all");
  const [editingQuoteMatchId, setEditingQuoteMatchId] = useState<string | null>(null);
  const [selectedForMargin, setSelectedForMargin] = useState<ComparisonSupplier | null>(null);
  const [tradingView, setTradingView] = useState<"agent" | "buyer">("agent");
  const [quoteForm, setQuoteForm] = useState<SupplierQuotePayload>({
    unit_price: 0.85,
    currency: "EUR",
    net_weight: "1L",
    packaging_format: "PET Bottle",
    moq: "1 x 40ft HQ FCL",
    lead_time_weeks: 3,
    incoterm: "CIF Ashdod",
    kosher_type: "Kosher (Chief Rabbinate)",
    certifications: ["BRC", "IFS"],
    cooperation_status: "cooperating",
    supplier_notes: "",
  });

  const [isPending, startTransition] = useTransition();

  function handleMarginSaved(savedMargin: AgentQuotationMargin) {
    if (!selectedForMargin) return;
    setSuppliers((prev) =>
      prev.map((sup) =>
        sup.matchId === selectedForMargin.matchId
          ? {
              ...sup,
              agent_margin: savedMargin,
            }
          : sup
      )
    );
    setSelectedForMargin(null);
  }

  // Filtered view
  const displaySuppliers = suppliers.filter((s) => {
    if (filterMode === "quoted_only") return Boolean(s.quote?.unit_price);
    if (filterMode === "top_tier") return s.matchScore >= 65;
    return true;
  });

  function openQuoteModal(s: ComparisonSupplier) {
    setEditingQuoteMatchId(s.matchId);
    setQuoteForm({
      unit_price: s.quote?.unit_price ?? 0.82,
      currency: s.quote?.currency ?? "EUR",
      net_weight: s.quote?.net_weight ?? benchmark.netWeight ?? "1L",
      packaging_format: s.quote?.packaging_format ?? benchmark.packagingFormat ?? "Standard packaging",
      moq: s.quote?.moq ?? "1 x 40ft HQ FCL",
      lead_time_weeks: s.quote?.lead_time_weeks ?? 3,
      incoterm: s.quote?.incoterm ?? "CIF Ashdod",
      kosher_type: s.quote?.kosher_type ?? "Kosher (Chief Rabbinate)",
      certifications: s.quote?.certifications ?? ["BRC", "ISO 22000"],
      cooperation_status: s.quote?.cooperation_status ?? "cooperating",
      supplier_notes: s.quote?.supplier_notes ?? "",
    });
  }

  function handleSaveQuote(e: React.FormEvent) {
    e.preventDefault();
    if (!editingQuoteMatchId) return;

    startTransition(async () => {
      const res = await recordSupplierQuote(editingQuoteMatchId, quoteForm);
      if (res.ok) {
        setSuppliers((prev) =>
          prev.map((sup) =>
            sup.matchId === editingQuoteMatchId
              ? {
                  ...sup,
                  status: "responded",
                  quote: {
                    ...quoteForm,
                    quoted_at: new Date().toISOString(),
                  },
                }
              : sup
          )
        );
        setEditingQuoteMatchId(null);
      }
    });
  }

  // Calculate normalized price per KG / L
  function getNormalizedPrice(price?: number | null, netWeightStr?: string | null): string {
    if (!price || !netWeightStr) return "—";
    const match = netWeightStr.match(/([\d.]+)\s*(kg|g|l|ml)/i);
    if (!match) return `€${price}/unit`;

    const val = parseFloat(match[1]);
    const unit = match[2].toLowerCase();

    let kgEquivalent = val;
    if (unit === "g" || unit === "ml") kgEquivalent = val / 1000;

    if (kgEquivalent <= 0) return `€${price}/unit`;
    const pricePerKg = price / kgEquivalent;
    return `€${pricePerKg.toFixed(2)} / kg`;
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden mb-6">
      {/* ── Matrix Header ── */}
      <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-orange-400 bg-orange-500/20 px-2 py-0.5 rounded border border-orange-500/30">
              Buyer Decision Board
            </span>
            <span className="text-slate-400 text-xs">·</span>
            <span className="text-slate-300 text-xs">
              Normalized Side-by-Side Product Benchmarking
            </span>
          </div>
          <h2 className="text-xl font-bold">
            Product & Factory Comparison Matrix
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Compare similar European manufacturing offerings side-by-side with weights, unit prices,
            normalized €/kg rates, and kosher compliance for <strong>{buyerCompany}</strong>.
          </p>
        </div>

        {/* Action Controls & Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {/* Trading View Mode Switch */}
          <div className="bg-slate-800 p-1 rounded-xl border border-slate-700 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setTradingView("agent")}
              className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition ${
                tradingView === "agent"
                  ? "bg-indigo-600 text-white shadow-xs font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              💼 Agent View (Spread & Profit)
            </button>
            <button
              type="button"
              onClick={() => setTradingView("buyer")}
              className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition ${
                tradingView === "buyer"
                  ? "bg-indigo-600 text-white shadow-xs font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              🛡️ Buyer View (Anonymized)
            </button>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
            <button
              type="button"
              onClick={() => setFilterMode("all")}
              className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition ${
                filterMode === "all"
                  ? "bg-orange-600 text-white shadow-xs"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              All ({suppliers.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("top_tier")}
              className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition ${
                filterMode === "top_tier"
                  ? "bg-orange-600 text-white shadow-xs"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              ⭐️ 65%+ ({suppliers.filter((s) => s.matchScore >= 65).length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("quoted_only")}
              className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition ${
                filterMode === "quoted_only"
                  ? "bg-orange-600 text-white shadow-xs"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              Quoted ({suppliers.filter((s) => s.quote?.unit_price).length})
            </button>
          </div>
        </div>
      </div>

      {/* ── Side-by-Side Comparison Grid (Horizontal Scrollable Table) ── */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70">
              <th className="p-4 w-48 min-w-[180px] font-bold text-slate-500 uppercase tracking-wider sticky left-0 bg-slate-50 z-10 shadow-xs border-r border-slate-200">
                Specification Metric
              </th>

              {/* 1. Benchmark Target Column */}
              <th className="p-4 w-64 min-w-[240px] bg-amber-50/60 border-r-2 border-amber-300 align-top">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">
                    🎯 Target Benchmark
                  </span>
                </div>
                <p className="font-bold text-slate-900 text-sm">{benchmark.productName}</p>
                {benchmark.benchmarkBrand && (
                  <p className="text-amber-800 text-[11px] font-semibold mt-0.5">
                    Brand: {benchmark.benchmarkBrand}
                  </p>
                )}
              </th>

              {/* 2. Supplier Offers Columns */}
              {displaySuppliers.map((s) => {
                const hasQuote = Boolean(s.quote?.unit_price);
                return (
                  <th
                    key={s.matchId}
                    className={`p-4 w-64 min-w-[240px] align-top border-r border-slate-200 ${
                      hasQuote ? "bg-emerald-50/20" : "bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                        <span>{s.country === "Spain" ? "🇪🇸" : s.country === "Italy" ? "🇮🇹" : s.country === "Poland" ? "🇵🇱" : "🇪🇺"}</span>
                        <span className="truncate max-w-[130px]" title={s.companyName}>
                          {tradingView === "buyer"
                            ? `Producer #${s.country ? s.country.slice(0, 2).toUpperCase() : "EU"}-${s.supplierId.slice(0, 4).toUpperCase()}`
                            : s.companyName}
                        </span>
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          s.matchScore >= 80
                            ? "bg-emerald-100 text-emerald-800"
                            : s.matchScore >= 65
                            ? "bg-blue-100 text-blue-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {s.matchScore}% Match
                      </span>
                    </div>
                    <p className="font-semibold text-slate-700 text-xs truncate">
                      {s.productName}
                    </p>
                    <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => openQuoteModal(s)}
                        className="text-[11px] font-semibold px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                      >
                        {hasQuote ? "✏️ Factory Quote" : "+ Record Quote"}
                      </button>
                      {hasQuote && (
                        <button
                          type="button"
                          onClick={() => setSelectedForMargin(s)}
                          className="text-[11px] font-bold px-2 py-1 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 transition shadow-2xs flex items-center gap-1"
                        >
                          💼 Margin & Pitch
                        </button>
                      )}
                      {hasQuote && onSelectForOrder && (
                        <button
                          type="button"
                          onClick={() => onSelectForOrder(s)}
                          className="text-[11px] font-bold px-2 py-1 rounded bg-orange-600 text-white hover:bg-orange-700 shadow-xs transition"
                        >
                          Select for PO →
                        </button>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200">
            {/* ROW 1: Quoted Price & Normalized €/kg */}
            <tr className="hover:bg-slate-50/50">
              <td className="p-3.5 font-bold text-slate-700 sticky left-0 bg-white z-10 border-r border-slate-200">
                💰 {tradingView === "agent" ? "Commercial Pricing & Spread" : "Quoted Selling Price"}
                <span className="block font-normal text-[11px] text-slate-400">
                  {tradingView === "agent" ? "Factory Cost · Agent Margin · Buyer Price" : "Normalized Price (€ / kg)"}
                </span>
              </td>
              <td className="p-3.5 bg-amber-50/30 border-r-2 border-amber-300 font-bold text-slate-900">
                {benchmark.targetPrice || "Target: €0.85 CIF"}
                <span className="block font-normal text-[11px] text-amber-800">
                  Target: €0.85 / kg
                </span>
              </td>
              {displaySuppliers.map((s) => {
                const q = s.quote;
                const m = s.agent_margin;
                const factoryPrice = q?.unit_price ?? 0;
                const buyerPrice = m?.buyer_quoted_price ?? (factoryPrice > 0 ? factoryPrice + 0.1 : 0);

                return (
                  <td key={s.matchId} className="p-3.5 border-r border-slate-200 font-semibold text-slate-800">
                    {factoryPrice > 0 ? (
                      <div>
                        {tradingView === "agent" ? (
                          <div className="space-y-1">
                            {/* Final Buyer Price */}
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] uppercase font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded">
                                Buyer:
                              </span>
                              <span className="text-sm font-extrabold text-indigo-700">
                                €{buyerPrice.toFixed(2)}
                              </span>
                              <span className="text-[11px] text-slate-500 font-normal">/ unit ({m?.incoterms || q?.incoterm || "CIF"})</span>
                            </div>

                            {/* Factory Net Cost */}
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-normal">
                              <span className="text-[10px] uppercase font-semibold text-slate-500">
                                Factory:
                              </span>
                              <span>€{factoryPrice.toFixed(2)}</span>
                              <span className="text-emerald-700 font-bold">
                                (+€{(buyerPrice - factoryPrice).toFixed(2)} spread)
                              </span>
                            </div>

                            {/* Container Profit */}
                            <div className="pt-0.5">
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                                <span>Profit:</span>
                                <span>+€{(m?.container_profit_eur ?? Math.round((buyerPrice - factoryPrice) * 24000)).toLocaleString()} / FCL</span>
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <span className="text-emerald-700 font-bold text-sm">
                              €{buyerPrice.toFixed(2)}
                            </span>
                            <span className="text-[11px] text-slate-500 font-normal"> / unit ({m?.incoterms || q?.incoterm || "CIF"})</span>
                            <span className="block text-[11px] text-emerald-800 font-bold mt-0.5">
                              {getNormalizedPrice(buyerPrice, q?.net_weight)}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">RFQ in progress</span>
                    )}
                  </td>
                );
              })}
            </tr>

            {/* ROW 2: Net Weight & Packaging Format */}
            <tr className="hover:bg-slate-50/50">
              <td className="p-3.5 font-bold text-slate-700 sticky left-0 bg-white z-10 border-r border-slate-200">
                📦 Net Weight & Packaging
              </td>
              <td className="p-3.5 bg-amber-50/30 border-r-2 border-amber-300 font-semibold text-slate-800">
                {benchmark.netWeight || "1L"} · {benchmark.packagingFormat || "Bottle"}
              </td>
              {displaySuppliers.map((s) => {
                const q = s.quote;
                return (
                  <td key={s.matchId} className="p-3.5 border-r border-slate-200 text-slate-700">
                    {q?.net_weight ? (
                      <div>
                        <span className="font-bold text-slate-900">{q.net_weight}</span>
                        <span className="block text-[11px] text-slate-500">
                          {q.packaging_format || "Factory Standard"}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-500">{benchmark.packagingFormat || "Standard packaging"}</span>
                    )}
                  </td>
                );
              })}
            </tr>

            {/* ROW 3: Kosher Standards & Certifications */}
            <tr className="hover:bg-slate-50/50">
              <td className="p-3.5 font-bold text-slate-700 sticky left-0 bg-white z-10 border-r border-slate-200">
                ✡️ Kosher & Certifications
              </td>
              <td className="p-3.5 bg-amber-50/30 border-r-2 border-amber-300 text-slate-800">
                <div className="flex flex-wrap gap-1">
                  {benchmark.certifications.map((c) => (
                    <span key={c} className="text-[10px] bg-amber-100 text-amber-900 font-semibold px-1.5 py-0.5 rounded">
                      {c}
                    </span>
                  ))}
                </div>
              </td>
              {displaySuppliers.map((s) => {
                const q = s.quote;
                const kosher = q?.kosher_type || "Kosher (Rabbinate approved)";
                const certs = q?.certifications || ["BRC", "IFS"];
                return (
                  <td key={s.matchId} className="p-3.5 border-r border-slate-200 text-slate-700">
                    <span className="inline-block text-[10px] bg-orange-50 text-orange-800 border border-orange-200 font-bold px-1.5 py-0.5 rounded mb-1">
                      {kosher}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {certs.map((c) => (
                        <span key={c} className="text-[10px] bg-slate-100 text-slate-700 px-1 py-0.5 rounded">
                          {c}
                        </span>
                      ))}
                    </div>
                  </td>
                );
              })}
            </tr>

            {/* ROW 4: MOQ & Delivery Lead Time */}
            <tr className="hover:bg-slate-50/50">
              <td className="p-3.5 font-bold text-slate-700 sticky left-0 bg-white z-10 border-r border-slate-200">
                🚚 MOQ & Production Lead Time
              </td>
              <td className="p-3.5 bg-amber-50/30 border-r-2 border-amber-300 text-slate-800 font-semibold">
                {benchmark.targetVolume || "1 x 40ft HQ FCL / month"}
              </td>
              {displaySuppliers.map((s) => {
                const q = s.quote;
                return (
                  <td key={s.matchId} className="p-3.5 border-r border-slate-200 text-slate-700">
                    <p className="font-semibold text-slate-900">{q?.moq || "1 FCL / 10k units"}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Lead time: {q?.lead_time_weeks ? `${q.lead_time_weeks} weeks` : "2-3 weeks"}
                    </p>
                  </td>
                );
              })}
            </tr>

            {/* ROW 5: Cooperation Status & Notes */}
            <tr className="hover:bg-slate-50/50">
              <td className="p-3.5 font-bold text-slate-700 sticky left-0 bg-white z-10 border-r border-slate-200">
                🤝 Supplier Cooperation
              </td>
              <td className="p-3.5 bg-amber-50/30 border-r-2 border-amber-300 text-amber-900 font-medium">
                Buyer procurement active
              </td>
              {displaySuppliers.map((s) => {
                const q = s.quote;
                const status = q?.cooperation_status || (s.status === "responded" ? "cooperating" : "contacted");
                return (
                  <td key={s.matchId} className="p-3.5 border-r border-slate-200">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                        status === "cooperating"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : status === "counter_offer"
                          ? "bg-amber-100 text-amber-800 border border-amber-200"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <span>{status === "cooperating" ? "✓" : "⏳"}</span>
                      <span>{status.replace(/_/g, " ")}</span>
                    </span>
                    {q?.supplier_notes && (
                      <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">
                        {q.supplier_notes}
                      </p>
                    )}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Modal: Enter Supplier Quote ── */}
      {editingQuoteMatchId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <form
            onSubmit={handleSaveQuote}
            className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Record Factory Quote & Terms
                </h3>
                <p className="text-xs text-slate-500">
                  Enter quoted price, pack net weight, MOQ, and kosher specifications.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingQuoteMatchId(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">
                    Quoted Unit Price *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 font-bold text-emerald-800"
                    placeholder="0.82"
                    value={quoteForm.unit_price ?? ""}
                    onChange={(e) =>
                      setQuoteForm((q) => ({
                        ...q,
                        unit_price: e.target.value ? parseFloat(e.target.value) : null,
                      }))
                    }
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">
                    Currency
                  </label>
                  <select
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white font-semibold"
                    value={quoteForm.currency}
                    onChange={(e) => setQuoteForm((q) => ({ ...q, currency: e.target.value }))}
                  >
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                    <option value="ILS">ILS (₪)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">
                    Pack Net Weight (e.g. 1L, 400g)
                  </label>
                  <input
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5"
                    placeholder="1L / 400g"
                    value={quoteForm.net_weight ?? ""}
                    onChange={(e) => setQuoteForm((q) => ({ ...q, net_weight: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">
                    Packaging Format
                  </label>
                  <input
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5"
                    placeholder="PET Bottle / Tin Can"
                    value={quoteForm.packaging_format ?? ""}
                    onChange={(e) =>
                      setQuoteForm((q) => ({ ...q, packaging_format: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">
                    Minimum Order Quantity (MOQ)
                  </label>
                  <input
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5"
                    placeholder="1 x 40ft HQ FCL / 25,000 units"
                    value={quoteForm.moq ?? ""}
                    onChange={(e) => setQuoteForm((q) => ({ ...q, moq: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">
                    Incoterm
                  </label>
                  <input
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5"
                    placeholder="CIF Ashdod"
                    value={quoteForm.incoterm ?? ""}
                    onChange={(e) => setQuoteForm((q) => ({ ...q, incoterm: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">
                    Kosher Standard
                  </label>
                  <input
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5"
                    placeholder="Kosher (Chief Rabbinate) / Badatz"
                    value={quoteForm.kosher_type ?? ""}
                    onChange={(e) => setQuoteForm((q) => ({ ...q, kosher_type: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">
                    Cooperation Intention
                  </label>
                  <select
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white font-semibold"
                    value={quoteForm.cooperation_status}
                    onChange={(e) =>
                      setQuoteForm((q) => ({
                        ...q,
                        cooperation_status: e.target.value as any,
                      }))
                    }
                  >
                    <option value="cooperating">Ready to Cooperate & Supply ✓</option>
                    <option value="counter_offer">Counter-Offer / Modified Specs</option>
                    <option value="declined">Declined / Cannot Supply</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 uppercase mb-1">
                  Supplier Notes & Technical Details
                </label>
                <textarea
                  rows={2}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5"
                  placeholder="Shelf life, payment terms (30/70), palletization specs..."
                  value={quoteForm.supplier_notes ?? ""}
                  onChange={(e) =>
                    setQuoteForm((q) => ({ ...q, supplier_notes: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setEditingQuoteMatchId(null)}
                className="text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="text-xs font-semibold px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition"
              >
                {isPending ? "Saving Quote…" : "Save Quote to Decision Board"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Modal: Agent Margin & Buyer Pitch Hub ── */}
      {selectedForMargin && (
        <AgentMarginPitchModal
          requestId={requestId}
          buyerCompany={buyerCompany}
          supplier={selectedForMargin}
          benchmark={benchmark}
          onClose={() => setSelectedForMargin(null)}
          onSaved={handleMarginSaved}
        />
      )}
    </div>
  );
}
