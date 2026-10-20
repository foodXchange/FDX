"use client";

import { useState } from "react";
import Link from "next/link";
import CommercialPoDocumentModal from "@/components/documents/CommercialPoDocumentModal";
import ExportDocumentHandoverModal from "@/components/documents/ExportDocumentHandoverModal";
import GoodsReceiptDocumentModal from "@/components/documents/GoodsReceiptDocumentModal";
import MaritimeVesselTracker from "@/components/shipping/MaritimeVesselTracker";
import TripartiteDispatchCockpit from "@/components/admin/TripartiteDispatchCockpit";

export interface DealFinancialRecord {
  requestId: string;
  matchId?: string;
  poNumber: string;
  poDate: string;
  buyerCompany: string;
  buyerContact?: string;
  buyerPhone?: string;
  buyerEmail?: string;
  supplierName: string;
  supplierCountry: string;
  supplierEmail?: string;
  supplierPhone?: string;
  productName: string;
  orderVolume: string;
  containerCount: number;
  currency: string;
  buyerUnitPrice: number;
  factoryUnitPrice: number;
  agentMarginUnit: number;
  grossContractValue: number;
  factoryContractCost: number;
  agentCommissionPool: number;
  advanceMilestone: {
    status: string;
    buyerAmount: number;
    factoryAmount: number;
    agentAmount: number;
    swiftRef?: string;
    remitterBank?: string;
    wireDate?: string;
  };
  balanceMilestone: {
    status: string;
    buyerAmount: number;
    factoryAmount: number;
    agentAmount: number;
    swiftRef?: string;
    remitterBank?: string;
    wireDate?: string;
  };
  currentStage: string;
  productionStatus?: string;
  shipping: {
    line?: string;
    vessel?: string;
    container?: string;
    bl?: string;
    etd?: string;
    eta?: string;
    customsStatus?: string;
    customsDeclaration?: string;
    deliveryStatus?: string;
  };
  buyerPortalUrl: string;
  supplierPortalUrl: string;
}

export interface TreasuryMetrics {
  totalGmvEur: number;
  totalBrokerCommissionEur: number;
  clearedAdvanceInflowEur: number;
  disbursedToFactoriesEur: number;
  lockedBrokerFeesEur: number;
  inTransitBalanceEur: number;
  totalContainers: number;
  activeDealsCount: number;
  avgMarginPercent: number;
}

interface Props {
  deals: DealFinancialRecord[];
  metrics: TreasuryMetrics;
}

export default function FinanceTreasuryDashboard({ deals, metrics }: Props) {
  const [filterStage, setFilterStage] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activePoDeal, setActivePoDeal] = useState<DealFinancialRecord | null>(null);
  const [activeCustomsDeal, setActiveCustomsDeal] = useState<DealFinancialRecord | null>(null);
  const [activeVesselDeal, setActiveVesselDeal] = useState<DealFinancialRecord | null>(null);
  const [activeGrnDeal, setActiveGrnDeal] = useState<DealFinancialRecord | null>(null);
  const [activeCockpitDeal, setActiveCockpitDeal] = useState<DealFinancialRecord | null>(null);
  const [waModalDeal, setWaModalDeal] = useState<DealFinancialRecord | null>(null);
  const [waRecipient, setWaRecipient] = useState<"buyer" | "factory" | "customs">("buyer");
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Filter deals
  const filteredDeals = deals.filter((deal) => {
    const matchesSearch =
      deal.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deal.buyerCompany.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deal.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deal.productName.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterStage === "all") return true;
    if (filterStage === "production") {
      return (
        deal.advanceMilestone.status === "released_to_factory" &&
        deal.balanceMilestone.status !== "released_to_factory" &&
        !deal.shipping.container
      );
    }
    if (filterStage === "shipping") {
      return (
        Boolean(deal.shipping.container || deal.shipping.bl) &&
        deal.balanceMilestone.status !== "released_to_factory"
      );
    }
    if (filterStage === "customs") {
      return (
        deal.shipping.customsStatus === "customs_broker_clearing" ||
        deal.balanceMilestone.status === "wire_submitted_by_buyer"
      );
    }
    if (filterStage === "settled") {
      return deal.balanceMilestone.status === "released_to_factory";
    }

    return true;
  });

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      "PO Number",
      "PO Date",
      "Buyer Company",
      "European Manufacturer",
      "Country",
      "Product Name",
      "Order Volume",
      "Gross GMV (EUR)",
      "Factory Net Cost (EUR)",
      "Broker Commission (EUR)",
      "Margin %",
      "30% Advance Status",
      "30% Buyer Amount",
      "30% Factory Wire",
      "30% Broker Retained",
      "70% Balance Status",
      "70% Buyer Amount",
      "70% Factory Settlement",
      "70% Broker Final",
      "Shipping Line",
      "Vessel Name",
      "Container #",
      "Ocean B/L #",
      "ETA Port",
      "Customs Declaration #",
    ];

    const rows = filteredDeals.map((d) => [
      d.poNumber,
      d.poDate,
      `"${d.buyerCompany}"`,
      `"${d.supplierName}"`,
      d.supplierCountry,
      `"${d.productName}"`,
      `"${d.orderVolume}"`,
      d.grossContractValue.toFixed(2),
      d.factoryContractCost.toFixed(2),
      d.agentCommissionPool.toFixed(2),
      ((d.agentCommissionPool / d.grossContractValue) * 100).toFixed(1) + "%",
      d.advanceMilestone.status,
      d.advanceMilestone.buyerAmount.toFixed(2),
      d.advanceMilestone.factoryAmount.toFixed(2),
      d.advanceMilestone.agentAmount.toFixed(2),
      d.balanceMilestone.status,
      d.balanceMilestone.buyerAmount.toFixed(2),
      d.balanceMilestone.factoryAmount.toFixed(2),
      d.balanceMilestone.agentAmount.toFixed(2),
      d.shipping.line || "MSC",
      d.shipping.vessel || "MSC LEANNE",
      d.shipping.container || "N/A",
      d.shipping.bl || "N/A",
      d.shipping.eta || "N/A",
      d.shipping.customsDeclaration || "N/A",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `FDX_Brokerage_Treasury_Ledger_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getBuyerWaText = (d: DealFinancialRecord) => {
    return encodeURIComponent(
      `שלום ${d.buyerContact || d.buyerCompany},\nעדכון מדסק הסחר הבינלאומי FoodXchange לגבי הזמנתכם [${d.poNumber}]:\nהמוצר: ${d.productName} (${d.orderVolume})\nסטטוס נוכחי: ${
        d.balanceMilestone.status === "released_to_factory"
          ? "עסקה שולמה במלואה ומסמכי מקור נמסרו לעמיל המכס בנמל אשדוד ✓"
          : d.shipping.container
          ? `המכולה בהפלגה ימית (${d.shipping.line || "MSC"}), שטר מטען: ${d.shipping.bl || "הונפק"}, צפי הגעה לאשדוד: ${d.shipping.eta || "מעודכן"}`
          : "הייצור המסחרי פעיל במפעל באירופה"
      }\nלצפייה במסמכים ומעקב חי:\n${d.buyerPortalUrl}`
    );
  };

  const getFactoryWaText = (d: DealFinancialRecord) => {
    return encodeURIComponent(
      `Hello ${d.supplierName} Export Team,\nFoodXchange Trade Desk update regarding Commercial PO [${d.poNumber}]:\nProduct: ${d.productName} (${d.orderVolume})\nPayment Status: ${
        d.advanceMilestone.status === "released_to_factory"
          ? "30% Production Advance Confirmed & Remitted ✓"
          : "30% Deposit In Clearing"
      }\nPlease update production progress or container dispatch here:\n${d.supplierPortalUrl}`
    );
  };

  const getCustomsWaText = (d: DealFinancialRecord) => {
    return encodeURIComponent(
      `שלום לעמיל המכס (Customs Broker),\nמצורף עדכון עבור שחרור מכולה ימית בנמל אשדוד:\nיבואן רשמי: ${d.buyerCompany}\nספק: ${d.supplierName} (${d.supplierCountry})\nמספר מכולה: ${d.shipping.container || "טרם הוזן"}\nשטר מטען (B/L): ${d.shipping.bl || "טרם הוזן"}\nצפי הגעה לאשדוד: ${d.shipping.eta || "במעקב"}\nתיק מסמכים הכולל תעודת מקור EUR.1 (פטור 0%), כשרות ו-COA מוכן להורדה בקישור הישיר הבא:\n${typeof window !== "undefined" ? window.location.origin : "https://foodxchange.com"}/customs/${d.requestId}`
    );
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(id);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* ── Top Header & Actions ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-md border border-emerald-300">
              Treasury Desk
            </span>
            <span className="text-xs font-mono text-slate-500">Live P&L Ledger</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <span>💰</span>
            <span>Broker Deal Clearing & Commission Treasury Ledger</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time financial clearing desk tracking Gross Traded Volume (GMV), locked broker fee spreads, factory production disbursements, and Mediterranean vessel receivables.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/track"
            className="text-xs font-bold px-3.5 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl transition flex items-center gap-2 border border-blue-200"
          >
            <span>🚢</span>
            <span>Retail Container Portfolio (/track)</span>
          </Link>
          <button
            type="button"
            onClick={handleExportCsv}
            className="text-xs font-bold px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <span>📥</span>
            <span>Export Financial Ledger (CSV)</span>
          </button>
        </div>
      </div>

      {/* ── Key Treasury KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Gross Traded GMV */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Total Traded GMV</span>
            <span className="text-base">🌐</span>
          </div>
          <div className="text-2xl font-black text-slate-950 font-mono tracking-tight">
            €{metrics.totalGmvEur.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 pt-1">
            Across <strong>{metrics.activeDealsCount} Active Deals</strong> ({metrics.totalContainers} x 40ft Containers)
          </div>
        </div>

        {/* Card 2: Total Broker Commission Pool */}
        <div className="bg-gradient-to-br from-emerald-50 via-white to-emerald-50/50 rounded-2xl p-5 border border-emerald-300 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-emerald-800 text-xs font-bold uppercase">
            <span>Broker Commission Earned</span>
            <span className="text-base">💼</span>
          </div>
          <div className="text-2xl font-black text-emerald-950 font-mono tracking-tight">
            +€{metrics.totalBrokerCommissionEur.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-emerald-800 pt-1 flex items-center justify-between">
            <span>Avg Spread: <strong>{metrics.avgMarginPercent.toFixed(1)}%</strong></span>
            <span className="font-bold">Locked under NCNDA</span>
          </div>
        </div>

        {/* Card 3: Escrow Liquidity Cleared */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Disbursed to Factories</span>
            <span className="text-base">🏭</span>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">
            €{metrics.disbursedToFactoriesEur.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 pt-1">
            Raw materials & bottling advances released
          </div>
        </div>

        {/* Card 4: In-Transit Receivables */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>70% Balance on Water</span>
            <span className="text-base">🚢</span>
          </div>
          <div className="text-2xl font-black text-indigo-950 font-mono tracking-tight">
            €{metrics.inTransitBalanceEur.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-indigo-700 pt-1 font-medium">
            Receivable against Clean Ocean B/L copy
          </div>
        </div>
      </div>

      {/* ── Filters & Search Bar ── */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-bold">
          {[
            { id: "all", label: "All Deals", count: deals.length },
            { id: "production", label: "🏭 In Production", count: deals.filter((d) => d.advanceMilestone.status === "released_to_factory" && !d.shipping.container).length },
            { id: "shipping", label: "🚢 On Water (B/L Issued)", count: deals.filter((d) => Boolean(d.shipping.container || d.shipping.bl) && d.balanceMilestone.status !== "released_to_factory").length },
            { id: "customs", label: "⚓ Port Customs Clearing", count: deals.filter((d) => d.shipping.customsStatus === "customs_broker_clearing" || d.balanceMilestone.status === "wire_submitted_by_buyer").length },
            { id: "settled", label: "🏆 Fully Settled", count: deals.filter((d) => d.balanceMilestone.status === "released_to_factory").length },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterStage(tab.id)}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                filterStage === tab.id
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${filterStage === tab.id ? "bg-white/20 text-white" : "bg-white text-slate-600"}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px]">
          <input
            type="text"
            placeholder="Search PO, Buyer, Supplier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <span className="absolute left-2.5 top-2 text-slate-400 text-xs">🔍</span>
        </div>
      </div>

      {/* ── Deal Clearing Ledger Table ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900 text-white text-[11px] uppercase tracking-wider font-bold">
                <th className="p-3.5 border-r border-slate-800">Deal & PO Reference</th>
                <th className="p-3.5 border-r border-slate-800">Parties (Buyer ➔ Factory)</th>
                <th className="p-3.5 border-r border-slate-800">Product & Volume</th>
                <th className="p-3.5 border-r border-slate-800 text-right">Contract GMV</th>
                <th className="p-3.5 border-r border-slate-800 text-right">Broker Margin</th>
                <th className="p-3.5 border-r border-slate-800">Milestone Clearings</th>
                <th className="p-3.5 border-r border-slate-800">Maritime Logistics</th>
                <th className="p-3.5 text-center">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredDeals.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 text-xs">
                    No commercial orders found matching the selected filter.
                  </td>
                </tr>
              ) : (
                filteredDeals.map((deal) => {
                  const marginPct = (deal.agentCommissionPool / deal.grossContractValue) * 100;

                  return (
                    <tr key={deal.requestId} className="hover:bg-slate-50/70 transition">
                      {/* 1. PO Reference */}
                      <td className="p-3.5 border-r border-slate-100 align-top">
                        <div className="font-mono font-bold text-slate-900 text-sm">
                          {deal.poNumber}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Date: {deal.poDate}
                        </div>
                        <div className="text-[10px] font-mono text-orange-700 font-semibold mt-1">
                          CIF Ashdod Port
                        </div>
                      </td>

                      {/* 2. Parties */}
                      <td className="p-3.5 border-r border-slate-100 align-top space-y-1.5 max-w-[200px]">
                        <div>
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">Buyer:</span>
                          <span className="font-bold text-slate-900 block truncate">{deal.buyerCompany}</span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">Factory:</span>
                          <span className="text-slate-700 block truncate">{deal.supplierName}</span>
                          <span className="text-[10px] text-slate-400">({deal.supplierCountry})</span>
                        </div>
                      </td>

                      {/* 3. Product & Volume */}
                      <td className="p-3.5 border-r border-slate-100 align-top max-w-[180px]">
                        <div className="font-bold text-slate-900 truncate">{deal.productName}</div>
                        <div className="text-[11px] text-slate-600 mt-0.5">{deal.orderVolume}</div>
                        <div className="text-[10px] text-emerald-700 font-semibold mt-1">
                          Private Label Retail Pack
                        </div>
                      </td>

                      {/* 4. Gross Contract GMV */}
                      <td className="p-3.5 border-r border-slate-100 align-top text-right font-mono">
                        <div className="font-black text-slate-900 text-sm">
                          €{deal.grossContractValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          @ €{deal.buyerUnitPrice.toFixed(2)}/unit
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1">
                          Factory: €{deal.factoryContractCost.toLocaleString()}
                        </div>
                      </td>

                      {/* 5. Broker Margin */}
                      <td className="p-3.5 border-r border-slate-100 align-top text-right font-mono">
                        <div className="font-black text-emerald-800 text-sm">
                          +€{deal.agentCommissionPool.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-[10px] text-emerald-700 font-bold mt-0.5">
                          {marginPct.toFixed(1)}% Spread
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">
                          +€{deal.agentMarginUnit.toFixed(2)}/unit
                        </div>
                      </td>

                      {/* 6. Milestones */}
                      <td className="p-3.5 border-r border-slate-100 align-top space-y-1.5">
                        {/* 30% Advance */}
                        <div className="flex items-center justify-between gap-2 text-[11px]">
                          <span className="text-slate-500">30% Adv:</span>
                          <span
                            className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                              deal.advanceMilestone.status === "released_to_factory"
                                ? "bg-emerald-100 text-emerald-800"
                                : deal.advanceMilestone.status === "wire_submitted_by_buyer"
                                ? "bg-amber-100 text-amber-800 animate-pulse"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {deal.advanceMilestone.status === "released_to_factory"
                              ? "Released €12.6k ✓"
                              : deal.advanceMilestone.status === "wire_submitted_by_buyer"
                              ? "Wire Submitted ⏳"
                              : "Pending 30%"}
                          </span>
                        </div>

                        {/* 70% Balance */}
                        <div className="flex items-center justify-between gap-2 text-[11px]">
                          <span className="text-slate-500">70% Bal:</span>
                          <span
                            className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                              deal.balanceMilestone.status === "released_to_factory"
                                ? "bg-emerald-100 text-emerald-800"
                                : deal.balanceMilestone.status === "wire_submitted_by_buyer"
                                ? "bg-amber-100 text-amber-800 animate-pulse"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {deal.balanceMilestone.status === "released_to_factory"
                              ? "Settled €29.4k 🏆"
                              : deal.balanceMilestone.status === "wire_submitted_by_buyer"
                              ? "Wire Submitted ⏳"
                              : "On B/L Copy"}
                          </span>
                        </div>
                      </td>

                      {/* 7. Maritime Logistics */}
                      <td
                        onClick={() => setActiveVesselDeal(deal)}
                        className="p-3.5 border-r border-slate-100 align-top space-y-1 hover:bg-sky-50/50 cursor-pointer transition group"
                        title="Click to view Live AIS Maritime Route Map"
                      >
                        <div className="font-mono text-slate-900 group-hover:text-sky-700 font-bold text-[11px] flex items-center justify-between">
                          <span>{deal.shipping.container || "Container Queued"}</span>
                          <span className="text-[10px] text-sky-600 opacity-0 group-hover:opacity-100 transition">🗺️</span>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          B/L: <span className="font-mono">{deal.shipping.bl || "Pending"}</span>
                        </div>
                        <div className="text-[10px] text-indigo-700 font-semibold">
                          ETA Ashdod: {deal.shipping.eta || "Pending Port Schedule"}
                        </div>
                      </td>

                      {/* 8. Quick Actions */}
                      <td className="p-3.5 align-top">
                        <div className="flex flex-col gap-1.5 items-stretch min-w-[130px]">
                          <button
                            type="button"
                            onClick={() => setActiveVesselDeal(deal)}
                            className="text-[11px] font-bold px-2 py-1 bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 rounded-lg transition flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <span>🚢</span>
                            <span>Live AIS Map</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setActivePoDeal(deal)}
                            className="text-[11px] font-bold px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <span>📄</span>
                            <span>View PO PDF</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setActiveCustomsDeal(deal)}
                            className="text-[11px] font-bold px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-lg transition flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <span>📑</span>
                            <span>Customs Package</span>
                          </button>

                          <a
                            href={`/customs/${deal.requestId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-bold px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-lg transition flex items-center justify-center gap-1"
                          >
                            <span>🇮🇱</span>
                            <span>Customs Portal ↗</span>
                          </a>

                          <button
                            type="button"
                            onClick={() => setActiveGrnDeal(deal)}
                            className="text-[11px] font-bold px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-lg transition flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <span>🏁</span>
                            <span>Goods Receipt (GRN)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setActiveCockpitDeal(deal)}
                            className="text-[11px] font-bold px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 rounded-lg transition flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <span>📡</span>
                            <span>Dispatch Radar</span>
                          </button>

                          <div className="grid grid-cols-2 gap-1 pt-0.5">
                            <a
                              href={`https://api.whatsapp.com/send?text=${getBuyerWaText(deal)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] font-bold px-1.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-center transition flex items-center justify-center gap-0.5"
                              title="Send WhatsApp update to Buyer"
                            >
                              <span>💬</span>
                              <span>Buyer</span>
                            </a>

                            <a
                              href={`https://api.whatsapp.com/send?text=${getFactoryWaText(deal)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] font-bold px-1.5 py-1 bg-orange-50 hover:bg-orange-100 text-orange-900 border border-orange-300 rounded-lg text-center transition flex items-center justify-center gap-0.5"
                              title="Send WhatsApp update to Factory"
                            >
                              <span>💬</span>
                              <span>Factory</span>
                            </a>
                          </div>

                          <Link
                            href={`/admin/requests/${deal.requestId}`}
                            className="text-[10px] font-bold text-center text-slate-500 hover:text-slate-900 py-0.5 transition"
                          >
                            Open Deal Desk ↗
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Document Modals ── */}
      {activePoDeal && (
        <CommercialPoDocumentModal
          isOpen={Boolean(activePoDeal)}
          onClose={() => setActivePoDeal(null)}
          poNumber={activePoDeal.poNumber}
          poDate={activePoDeal.poDate}
          buyerCompany={activePoDeal.buyerCompany}
          supplierName={activePoDeal.supplierName}
          supplierCountry={activePoDeal.supplierCountry}
          productName={activePoDeal.productName}
          orderVolume={activePoDeal.orderVolume}
          unitPrice={activePoDeal.buyerUnitPrice}
          currency={activePoDeal.currency}
          totalOrderValue={activePoDeal.grossContractValue}
        />
      )}

      {activeCustomsDeal && (
        <ExportDocumentHandoverModal
          isOpen={Boolean(activeCustomsDeal)}
          onClose={() => setActiveCustomsDeal(null)}
          requestId={activeCustomsDeal.requestId}
          poNumber={activeCustomsDeal.poNumber}
          buyerCompany={activeCustomsDeal.buyerCompany}
          supplierName={activeCustomsDeal.supplierName}
          productName={activeCustomsDeal.productName}
          containerNumber={activeCustomsDeal.shipping.container || undefined}
          billOfLading={activeCustomsDeal.shipping.bl || undefined}
          shippingLine={activeCustomsDeal.shipping.line || undefined}
          vesselName={activeCustomsDeal.shipping.vessel || undefined}
          etaPort={activeCustomsDeal.shipping.eta || undefined}
          isBalanceCleared={activeCustomsDeal.balanceMilestone.status === "released_to_factory"}
        />
      )}

      {/* ── AIS Live Vessel Route Inspection Modal ── */}
      {activeVesselDeal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="relative w-full max-w-5xl bg-slate-950 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden my-auto">
            <div className="p-4 sm:p-5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">🚢</span>
                  <h3 className="font-bold text-white text-base">
                    Live AIS Maritime Route Desk · {activeVesselDeal.poNumber}
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                    {activeVesselDeal.shipping.vessel || "MSC LEANNE"}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Buyer: <strong className="text-slate-200">{activeVesselDeal.buyerCompany}</strong> · Supplier: <strong className="text-slate-200">{activeVesselDeal.supplierName}</strong> ({activeVesselDeal.supplierCountry})
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveVesselDeal(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-3 sm:p-5 max-h-[80vh] overflow-y-auto">
              <MaritimeVesselTracker
                requestId={activeVesselDeal.requestId}
                orderStage="manufacturing"
                containerNumber={activeVesselDeal.shipping.container || "MSKU-9481029"}
                billOfLading={activeVesselDeal.shipping.bl || "MSCUVAL881920"}
                shippingLine={activeVesselDeal.shipping.line || "MSC (Mediterranean Shipping Company)"}
                vesselName={activeVesselDeal.shipping.vessel || "MSC LEANNE"}
                portOfOrigin="Valencia Port, Spain"
                portOfDestination="Ashdod Port, Israel"
                etd={activeVesselDeal.shipping.etd}
                etaPort={activeVesselDeal.shipping.eta}
                productName={activeVesselDeal.productName}
                lang="en"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Official Goods Receipt Note (GRN) Document Viewer Modal ── */}
      {activeGrnDeal && (
        <GoodsReceiptDocumentModal
          isOpen={Boolean(activeGrnDeal)}
          onClose={() => setActiveGrnDeal(null)}
          grnNumber={`GRN-IL-2604-${activeGrnDeal.requestId.slice(0, 5).toUpperCase()}`}
          grnDate={activeGrnDeal.poDate}
          poNumber={activeGrnDeal.poNumber}
          poDate={activeGrnDeal.poDate}
          buyerCompany={activeGrnDeal.buyerCompany}
          buyerAddress={`${activeGrnDeal.buyerCompany} Central Logistics Hub, Sorek Park, Israel`}
          receivingOfficer="Avi Mizrahi (Warehouse Logistics Manager)"
          receivingDockBay="Bay 04 - Sorek Logistics Hub"
          truckLicensePlate="IL-98-410-29"
          supplierName={activeGrnDeal.supplierName}
          supplierCountry={activeGrnDeal.supplierCountry}
          productName={activeGrnDeal.productName}
          orderVolume={activeGrnDeal.orderVolume}
          containerNumber={activeGrnDeal.shipping.container || "MSKU-9481029"}
          billOfLading={activeGrnDeal.shipping.bl || "MSCUVAL881920"}
          vesselName={activeGrnDeal.shipping.vessel || "MSC LEANNE / Voyage 2604E"}
          shippingLine={activeGrnDeal.shipping.line || "MSC (Mediterranean Shipping Company)"}
          customsDeclarationNumber={activeGrnDeal.shipping.customsDeclaration || "IL-2604-881920"}
          warehousePalletCount={24}
        />
      )}

      {/* ── Tripartite Automated Dispatch Cockpit Modal ── */}
      {activeCockpitDeal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[90vh] flex flex-col">
            <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">📡</span>
                <div>
                  <h3 className="font-bold text-white text-base">
                    Automated Tripartite Dispatch Desk · {activeCockpitDeal.poNumber}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {activeCockpitDeal.buyerCompany} ↔ {activeCockpitDeal.supplierName} ({activeCockpitDeal.supplierCountry})
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveCockpitDeal(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto">
              <TripartiteDispatchCockpit
                requestId={activeCockpitDeal.requestId}
                poNumber={activeCockpitDeal.poNumber}
                buyerCompany={activeCockpitDeal.buyerCompany}
                buyerContact={activeCockpitDeal.buyerContact}
                buyerPhone={activeCockpitDeal.buyerPhone}
                buyerEmail={activeCockpitDeal.buyerEmail}
                supplierName={activeCockpitDeal.supplierName}
                supplierCountry={activeCockpitDeal.supplierCountry}
                supplierEmail={activeCockpitDeal.supplierEmail}
                supplierPhone={activeCockpitDeal.supplierPhone}
                productName={activeCockpitDeal.productName}
                orderVolume={activeCockpitDeal.orderVolume}
                totalOrderValueEur={activeCockpitDeal.grossContractValue}
                advance30Eur={activeCockpitDeal.advanceMilestone.buyerAmount}
                balance70Eur={activeCockpitDeal.balanceMilestone.buyerAmount}
                containerNumber={activeCockpitDeal.shipping.container || "MSKU-9481029"}
                billOfLading={activeCockpitDeal.shipping.bl || "MSCUVAL881920"}
                vesselName={activeCockpitDeal.shipping.vessel || "MSC LEANNE"}
                shippingLine={activeCockpitDeal.shipping.line || "MSC"}
                etaPort={activeCockpitDeal.shipping.eta}
                customsDeclarationNumber={activeCockpitDeal.shipping.customsDeclaration}
                warehousePalletCount={24}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
