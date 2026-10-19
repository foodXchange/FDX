"use client";

import Link from "next/link";
import { IntelligencePayload, RoleStat, SectorStat } from "@/lib/admin/intelligenceService";

interface Props {
  data: IntelligencePayload;
}

const ROLE_LABELS: Record<string, { label: string; icon: string; desc: string }> = {
  manufacturer: { label: "Food Manufacturers", icon: "🏭", desc: "Primary producers & factories for private label / OEM" },
  trader: { label: "Traders & Brokers", icon: "🤝", desc: "Intermediary import/export trading desks" },
  wholesaler: { label: "Wholesalers", icon: "🏢", desc: "Bulk regional stockists & cash-and-carry" },
  importer: { label: "Direct Importers", icon: "🚢", desc: "High-value enterprise food buyers & distributors" },
  distributor: { label: "Distributors", icon: "🚚", desc: "National / local FMCG & foodservice distributors" },
  retailer: { label: "Supermarkets & Retailers", icon: "🛒", desc: "Chains, hypermarkets, and specialty food stores" },
  agency_consortium: { label: "Consortia & Trade Bodies", icon: "🏛️", desc: "Regional producer associations & export agencies" },
  service_provider: { label: "Service Providers", icon: "⚙️", desc: "Freight, cold storage, packaging, lab testing" },
  unclassified: { label: "Pending Classification", icon: "⏳", desc: "In scraping & extraction queue" },
};

const SECTOR_LABELS: Record<string, { label: string; icon: string }> = {
  food_beverage: { label: "Food & Beverage", icon: "🍷" },
  ingredients_additives: { label: "Ingredients & Raw Materials", icon: "🌾" },
  trade_promotion: { label: "Trade Consortia & Agencies", icon: "🏛️" },
  packaging: { label: "Packaging & Containers", icon: "📦" },
  machinery_equipment: { label: "Food Processing Machinery", icon: "⚙️" },
  logistics_freight: { label: "Freight Forwarders & Cold Storage", icon: "🚚" },
  retail_fixtures_tech: { label: "Retail Tech & Equipment", icon: "🖥️" },
  certification_lab: { label: "Testing Labs & Certifications", icon: "🔬" },
  professional_services: { label: "Consulting & Trade Legal", icon: "💼" },
  cleaning_hygiene: { label: "Industrial Food Hygiene", icon: "🧼" },
  tableware_disposables: { label: "Foodservice Disposables", icon: "🍽️" },
  other: { label: "Other / Unrelated", icon: "📁" },
  unclassified: { label: "Unclassified Queue", icon: "⏳" },
};

export function IntelligenceEcosystem({ data }: Props) {
  const { overview, roles, sectors } = data;
  const classifiedTotal = overview.total_suppliers - overview.unclassified;
  const maxRoleCount = Math.max(...roles.filter((r) => r.role !== "unclassified").map((r) => r.count), 1);

  return (
    <div className="space-y-8">
      {/* 5 Primary Operational KPI Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Producers</span>
            <span>🏭</span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {overview.manufacturers.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Factories &amp; OEM makers
          </div>
        </div>

        <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-700 text-xs font-bold uppercase tracking-wider">
            <span>Potential Buyers</span>
            <span>🛒</span>
          </div>
          <div className="text-2xl font-black text-emerald-900 mt-1">
            {overview.potential_buyers.toLocaleString()}
          </div>
          <div className="text-[11px] text-emerald-700 mt-0.5 font-medium">
            Importers, retail &amp; chains
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Traders</span>
            <span>🤝</span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {overview.traders.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Trading desks &amp; brokers
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Wholesalers</span>
            <span>🏢</span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {overview.wholesalers.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Stockists &amp; cash &amp; carry
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Non-Food Partners</span>
            <span>📦</span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {overview.non_food.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Packaging, freight, machinery
          </div>
        </div>

        <div className="bg-amber-50/50 border border-amber-200/80 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-amber-700 text-xs font-bold uppercase tracking-wider">
            <span>Scraping Queue</span>
            <span>⏳</span>
          </div>
          <div className="text-2xl font-black text-amber-900 mt-1">
            {overview.unclassified.toLocaleString()}
          </div>
          <div className="text-[11px] text-amber-700 mt-0.5">
            Awaiting crawl / profile
          </div>
        </div>
      </div>

      {/* Main Two-Column Analytics Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Ranked Pareto Horizontal Bars (7 Cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>🏢 Business Role Distribution</span>
                <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  {classifiedTotal.toLocaleString()} classified
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Exact categorization across buyers, producers, and trade intermediaries.
              </p>
            </div>
          </div>

          <div className="space-y-3.5">
            {roles
              .filter((r) => r.role !== "unclassified")
              .map((item) => {
                const meta = ROLE_LABELS[item.role] ?? { label: item.role, icon: "🏷️", desc: "" };
                const pct = classifiedTotal > 0 ? ((item.count / classifiedTotal) * 100).toFixed(1) : "0";
                const barWidth = Math.min(100, Math.max(4, Math.round((item.count / maxRoleCount) * 100)));

                return (
                  <div key={item.role} className="group p-2.5 rounded-xl hover:bg-slate-50/80 transition-colors">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{meta.icon}</span>
                        <span className="font-bold text-slate-800">{meta.label}</span>
                        {item.buyer_count > 0 && (
                          <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                            {item.buyer_count} buyers
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 font-mono text-xs">
                        <span className="font-bold text-slate-900">{item.count.toLocaleString()}</span>
                        <span className="text-slate-400">({pct}%)</span>
                      </div>
                    </div>

                    {/* Progress Bar Track */}
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          item.role === "manufacturer"
                            ? "bg-orange-500"
                            : item.buyer_count > 0
                            ? "bg-emerald-500"
                            : "bg-slate-700"
                        }`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                      <span>{meta.desc}</span>
                      <Link
                        href={`/admin/suppliers?role=${encodeURIComponent(item.role)}`}
                        className="text-orange-600 font-semibold hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Filter &rarr;
                      </Link>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Right: Non-Food Infrastructure & Wholesale Buyers Spotlight (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Spotlight 1: Wholesale Buyers Lead Radar */}
          <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 border border-emerald-900/60 rounded-3xl p-6 text-white shadow-md relative overflow-hidden">
            <div className="absolute right-0 top-0 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <span>🎯</span>
                <span>Wholesale Buyer Leads</span>
              </span>
              <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {overview.potential_buyers} Discovered
              </span>
            </div>

            <h4 className="text-base font-extrabold text-white">
              Qualified Inbound Buyer Directory
            </h4>
            <p className="text-slate-300 text-xs mt-1 leading-relaxed">
              Companies automatically detected as direct food importers, supermarket chains, and wholesale buyers ready for procurement.
            </p>

            <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-800">
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <div className="text-xs text-slate-400">Direct Importers</div>
                <div className="text-lg font-black text-emerald-400 mt-0.5">
                  {overview.importers.toLocaleString()}
                </div>
              </div>
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <div className="text-xs text-slate-400">Wholesale Stockists</div>
                <div className="text-lg font-black text-white mt-0.5">
                  {overview.wholesalers.toLocaleString()}
                </div>
              </div>
            </div>

            <Link
              href="/admin/buyers?tab=discovered"
              className="mt-4 block w-full text-center py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors shadow-xs"
            >
              Browse All Discovered Buyers ({overview.potential_buyers}) &rarr;
            </Link>
          </div>

          {/* Spotlight 2: Non-Food B2B Services (Turnkey Trade Stack) */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>📦 Non-Food Ecosystem Partners</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Value-added infrastructure for food packaging, cold logistics &amp; trade.
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              {sectors
                .filter((s) => s.sector !== "food_beverage" && s.sector !== "unclassified")
                .slice(0, 6)
                .map((sec) => {
                  const meta = SECTOR_LABELS[sec.sector] ?? { label: sec.sector, icon: "📁" };
                  return (
                    <div
                      key={sec.sector}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">{meta.icon}</span>
                        <span className="text-xs font-semibold text-slate-800">{meta.label}</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                        {sec.count}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
