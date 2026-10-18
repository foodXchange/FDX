"use client";

import { useState } from "react";
import Link from "next/link";
import { relativeTime } from "@/lib/format/relativeTime";
import type { BuyerActivityRow } from "@/lib/metrics/qaMetrics";

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  one_time: "One-Time",
  stalled: "Stalled",
};

const STATUS_COLOR: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800 border-emerald-200",
  one_time: "bg-slate-100 text-slate-700 border-slate-200",
  stalled: "bg-rose-100 text-rose-800 border-rose-200",
};

export default function BuyerActivityTable({ rows }: { rows: BuyerActivityRow[] }) {
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? rows.filter((r) => {
        const term = search.toLowerCase();
        return (
          (r.name ?? "").toLowerCase().includes(term) ||
          (r.company ?? "").toLowerCase().includes(term) ||
          r.email.toLowerCase().includes(term)
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
            placeholder="Filter buyers by name or company…"
            className="w-full max-w-xs text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 shadow-2xs"
          />
          <span className="text-xs text-slate-400">
            Showing {filtered.length} of {rows.length} buyers
          </span>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="text-center py-10 bg-slate-50/70 border border-dashed border-slate-200 rounded-xl">
          <div className="text-2xl mb-1.5">👥</div>
          <p className="text-sm font-semibold text-slate-700">No Buyer Activity Logged Yet</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Registered buyers and their sourcing requests will appear here automatically.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">No buyers match this search.</p>
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="py-2.5 px-4 font-semibold">Buyer Organization</th>
                <th className="py-2.5 px-4 text-center font-semibold">Sourcing Requests</th>
                <th className="py-2.5 px-4 text-center font-semibold">Matches Generated</th>
                <th className="py-2.5 px-4 font-semibold">Last Request</th>
                <th className="py-2.5 px-4 text-center font-semibold">Activity Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-4">
                    <Link
                      href={`/en/admin/qa-metrics/buyers/${r.id}`}
                      className="font-semibold text-slate-800 hover:text-orange-600 transition-colors"
                    >
                      {r.name || r.company || r.email}
                    </Link>
                    {r.company && r.name && r.name !== r.company && (
                      <span className="text-xs text-slate-400 block font-normal">
                        {r.company}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                      {r.requestCount}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center text-slate-700 font-semibold text-xs">
                    {r.matchesReceived}
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-500 whitespace-nowrap">
                    {relativeTime(r.lastRequestAt)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${STATUS_COLOR[r.status]}`}
                    >
                      {STATUS_LABEL[r.status]}
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
