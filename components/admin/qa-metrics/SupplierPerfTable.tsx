"use client";

import { useState } from "react";
import Link from "next/link";
import ScoreBar from "@/components/admin/qa-metrics/ScoreBar";
import type { SupplierPerfRow } from "@/lib/metrics/qaMetrics";

export default function SupplierPerfTable({ rows }: { rows: SupplierPerfRow[] }) {
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? rows.filter((r) => {
        const term = search.toLowerCase();
        return (
          r.companyName.toLowerCase().includes(term) ||
          (r.country ?? "").toLowerCase().includes(term)
        );
      })
    : rows;

  return (
    <div className="space-y-3">
      {rows.length > 5 && (
        <div className="flex items-center justify-between gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter suppliers by name or country…"
            className="w-full max-w-xs text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 shadow-2xs"
          />
          <span className="text-xs text-slate-400">
            Showing {filtered.length} of {rows.length} suppliers
          </span>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="text-center py-10 bg-slate-50/70 border border-dashed border-slate-200 rounded-xl">
          <div className="text-2xl mb-1.5">🏭</div>
          <p className="text-sm font-semibold text-slate-700">No Supplier Outreach Activity Yet</p>
          <p className="text-xs text-slate-500 mt-0.5 max-w-sm mx-auto">
            Suppliers appear here as outreach proposals are dispatched from the Sourcing Deal Pipeline.
          </p>
          <Link
            href="/admin/pipeline"
            className="mt-3 inline-block text-xs font-semibold text-orange-600 hover:text-orange-700 underline"
          >
            Go to Sourcing Pipeline →
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">No suppliers match this search.</p>
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="py-2.5 px-4 font-semibold">Supplier Organization</th>
                <th className="py-2.5 px-4 font-semibold">Trust Score</th>
                <th className="py-2.5 px-4 font-semibold">Reply Rate</th>
                <th className="py-2.5 px-4 font-semibold">Avg Response Time</th>
                <th className="py-2.5 px-4 text-center font-semibold">Deals Closed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-4">
                    <Link
                      href={`/en/admin/qa-metrics/suppliers/${r.id}`}
                      className="font-semibold text-slate-800 hover:text-orange-600 transition-colors"
                    >
                      {r.companyName}
                    </Link>
                    {r.country && (
                      <span className="text-xs text-slate-400 ml-1.5 font-normal">
                        · {r.country}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <ScoreBar score={r.trustScore} />
                  </td>
                  <td className="py-3 px-4">
                    <ScoreBar score={r.replyRate} suffix="%" />
                  </td>
                  <td className="py-3 px-4 text-slate-600 text-xs font-medium">
                    {r.avgResponseHours !== null ? `${r.avgResponseHours}h` : "—"}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        r.wonCount > 0
                          ? "bg-purple-100 text-purple-800"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {r.wonCount}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
