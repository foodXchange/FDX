"use client";

import { useState } from "react";
import Link from "next/link";
import { IntelligencePayload } from "@/lib/admin/intelligenceService";
import { IntelligenceEcosystem } from "./IntelligenceEcosystem";
import { IntelligenceCatalogDepth } from "./IntelligenceCatalogDepth";
import { IntelligenceGeography } from "./IntelligenceGeography";

interface Props {
  data: IntelligencePayload;
  dealPipelineSlot: React.ReactNode;
}

type TabKey = "ecosystem" | "catalog" | "geography" | "pipeline";

export function IntelligenceDashboardClient({ data, dealPipelineSlot }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>("ecosystem");

  const tabs: { key: TabKey; label: string; icon: string; count?: string }[] = [
    {
      key: "ecosystem",
      label: "Ecosystem & Roles",
      icon: "🌐",
      count: `${data.overview.total_suppliers.toLocaleString()} Co.`,
    },
    {
      key: "catalog",
      label: "Catalog & SKU Depth",
      icon: "📦",
      count: `${data.overview.total_products.toLocaleString()} SKUs`,
    },
    {
      key: "geography",
      label: "Continents & Geography",
      icon: "🌍",
      count: `${data.countries.length} Hubs`,
    },
    {
      key: "pipeline",
      label: "Live Deals & Inbound Requests",
      icon: "⚡",
      count: "Operational",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner & Tab Controls */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 lg:p-8 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 bottom-0 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 top-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/30 text-orange-400 text-xs font-semibold mb-3">
              <span>📊 Global Market Intelligence</span>
              <span>&bull;</span>
              <span className="text-emerald-400">Live Aggregated Analytics</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-white">
              FoodXchange Market Command Center
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-2 max-w-2xl leading-relaxed">
              Explore your two-sided food network across manufacturers, wholesale buyers, packaging &amp; logistics partners, SKU categories, and international trade corridors.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Link
              href="/admin/scraper"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-semibold text-xs transition-colors shadow-2xs"
            >
              <span>🕷️</span>
              <span>Scraper Queue</span>
            </Link>
            <Link
              href="/admin/suppliers"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs transition-colors shadow-xs"
            >
              <span>🏭</span>
              <span>All Suppliers</span>
            </Link>
          </div>
        </div>

        {/* Tab Navigation Buttons */}
        <div className="flex items-center gap-2 mt-8 pt-6 border-t border-slate-800/80 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? "bg-white text-slate-900 shadow-sm"
                    : "bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.count && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-normal ${
                      isActive
                        ? "bg-slate-100 text-slate-700 font-bold"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === "ecosystem" && <IntelligenceEcosystem data={data} />}
        {activeTab === "catalog" && <IntelligenceCatalogDepth data={data} />}
        {activeTab === "geography" && <IntelligenceGeography data={data} />}
        {activeTab === "pipeline" && (
          <div className="space-y-6">
            {dealPipelineSlot}
          </div>
        )}
      </div>
    </div>
  );
}
