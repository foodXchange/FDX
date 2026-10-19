"use client";

import Link from "next/link";
import { IntelligencePayload } from "@/lib/admin/intelligenceService";

interface Props {
  data: IntelligencePayload;
}

export function IntelligenceCatalogDepth({ data }: Props) {
  const { overview, categories } = data;
  const maxProductCount = Math.max(...categories.map((c) => c.product_count), 1);

  return (
    <div className="space-y-8">
      {/* 4 Quality & Specification KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Total Catalog Volume</span>
            <span>📦</span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {overview.total_products.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Verified food &amp; beverage SKUs
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Private Label Ready</span>
            <span className="text-orange-500">🏷️</span>
          </div>
          <div className="text-2xl font-black text-orange-600 mt-1">
            {overview.private_label_products.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            <span className="font-bold text-orange-600">{overview.pl_ratio_pct}%</span> of catalog is OEM capable
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Kosher Certified</span>
            <span className="text-blue-500">✡️</span>
          </div>
          <div className="text-2xl font-black text-blue-700 mt-1">
            {overview.kosher_products.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            <span className="font-bold text-blue-700">{overview.kosher_ratio_pct}%</span> with verified Kosher badges
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Direct Email Reach</span>
            <span className="text-emerald-500">📧</span>
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            {overview.email_coverage_pct}%
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {overview.with_email.toLocaleString()} suppliers with verified email
          </div>
        </div>
      </div>

      {/* Main Categories Pareto Table */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>🥫 Top Product Categories &amp; Specification Depth</span>
              <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                {categories.length} Categories
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Ranked by SKU volume, manufacturer density, private label readiness, and kosher certifications.
            </p>
          </div>
          <Link
            href="/admin/products"
            className="text-xs font-bold text-orange-600 hover:text-orange-700 underline shrink-0"
          >
            Manage Product Catalog &rarr;
          </Link>
        </div>

        <div className="space-y-3">
          {categories.map((cat, idx) => {
            const barWidth = Math.min(100, Math.max(5, Math.round((cat.product_count / maxProductCount) * 100)));
            const plPct = cat.product_count > 0 ? Math.round((cat.private_label_count / cat.product_count) * 100) : 0;
            const kosherPct = cat.product_count > 0 ? Math.round((cat.kosher_count / cat.product_count) * 100) : 0;

            return (
              <div
                key={cat.category}
                className="group p-3 rounded-2xl border border-slate-100 bg-slate-50/40 hover:bg-white hover:border-slate-200 hover:shadow-2xs transition-all space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 text-[11px] font-mono font-bold text-slate-400">
                      #{idx + 1}
                    </span>
                    <span className="font-bold text-slate-900 truncate">
                      {cat.category}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      &bull; {cat.supplier_count} suppliers
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {cat.private_label_count > 0 && (
                      <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200/80">
                        🏷️ {cat.private_label_count} PL ({plPct}%)
                      </span>
                    )}
                    {cat.kosher_count > 0 && (
                      <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/80">
                        ✡️ {cat.kosher_count} Kosher ({kosherPct}%)
                      </span>
                    )}
                    <span className="font-mono font-black text-slate-900 text-sm">
                      {cat.product_count.toLocaleString()} <span className="text-slate-400 text-xs font-normal">SKUs</span>
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-200/70 rounded-full h-2 overflow-hidden flex">
                  <div
                    className="h-full bg-orange-500 rounded-l-full transition-all duration-500"
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
