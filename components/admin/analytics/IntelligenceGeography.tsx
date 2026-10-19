"use client";

import Link from "next/link";
import { IntelligencePayload } from "@/lib/admin/intelligenceService";

interface Props {
  data: IntelligencePayload;
}

const CONTINENT_ICONS: Record<string, string> = {
  "Western Europe": "🇪🇺",
  "Eastern Europe": "🏰",
  Americas: "🌎",
  "Middle East": "🕌",
  "Asia Pacific": "🌏",
  "Other Regions": "🌐",
};

export function IntelligenceGeography({ data }: Props) {
  const { continents, countries, overview } = data;
  const maxCountryCount = Math.max(...countries.map((c) => c.count), 1);

  return (
    <div className="space-y-8">
      {/* Continent Grouping Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {continents.map((cont) => {
          const icon = CONTINENT_ICONS[cont.continent] ?? "🌐";
          const pct = overview.total_suppliers > 0 ? Math.round((cont.count / overview.total_suppliers) * 100) : 0;

          return (
            <div
              key={cont.continent}
              className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:border-slate-300 transition-colors"
            >
              <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                <span className="truncate">{cont.continent}</span>
                <span className="text-base">{icon}</span>
              </div>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {cont.count.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 flex items-center justify-between">
                <span>{pct}% of global</span>
                {cont.buyer_count > 0 && (
                  <span className="font-bold text-emerald-600">
                    {cont.buyer_count} buyers
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Ranked Country Directory Table */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>🌍 Top Supplier Origin Countries</span>
              <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                {countries.length} Key Hubs
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Geographic footprint of suppliers, manufacturers, and discovered wholesale buyers.
            </p>
          </div>
          <Link
            href="/admin/suppliers"
            className="text-xs font-bold text-orange-600 hover:text-orange-700 underline shrink-0"
          >
            Open Supplier Directory &rarr;
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {countries.map((c, idx) => {
            const barWidth = Math.min(100, Math.max(4, Math.round((c.count / maxCountryCount) * 100)));

            return (
              <div
                key={c.country}
                className="group p-3 rounded-2xl border border-slate-100 bg-slate-50/40 hover:bg-white hover:border-slate-200 hover:shadow-2xs transition-all space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 text-[11px] font-mono font-bold text-slate-400">
                      #{idx + 1}
                    </span>
                    <span className="font-bold text-slate-900 truncate">
                      {c.country}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {c.buyer_count > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {c.buyer_count} buyers
                      </span>
                    )}
                    <span className="font-mono font-bold text-slate-900">
                      {c.count.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="w-full bg-slate-200/70 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full bg-slate-800 rounded-full transition-all duration-500 group-hover:bg-orange-500"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
