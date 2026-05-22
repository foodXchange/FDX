"use client";

import { useState, useMemo } from "react";
import type { MatchRow } from "@/app/admin/matches/page";

function ScoreBadge({ score }: { score: number }) {
  const cls =
    score >= 70
      ? "text-green-700 bg-green-50"
      : score >= 50
      ? "text-orange-600 bg-orange-50"
      : "text-red-600 bg-red-50";
  return (
    <span className={`text-sm font-bold px-2 py-0.5 rounded-lg ${cls}`}>
      {score}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-slate-100 text-slate-600",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-600",
    sent: "bg-blue-100 text-blue-700",
    suggested: "bg-yellow-100 text-yellow-700",
  };
  return (
    <span
      className={`text-xs font-medium px-2 py-0.5 rounded-full ${map[status] ?? "bg-slate-100 text-slate-600"}`}
    >
      {status}
    </span>
  );
}

type FilterStatus = "all" | "pending" | "approved" | "rejected" | "sent";
type FilterScore = "all" | "high" | "medium" | "low";

interface Props {
  matches: MatchRow[];
}

export default function MatchDashboardClient({ matches }: Props) {
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [scoreFilter, setScoreFilter] = useState<FilterScore>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [localStatuses, setLocalStatuses] = useState<Record<string, string>>({});

  const filtered = useMemo(() => {
    const sq = searchQuery.toLowerCase();
    return matches.filter((m) => {
      const effectiveStatus = localStatuses[m.id] ?? m.status;
      if (statusFilter !== "all" && effectiveStatus !== statusFilter) return false;
      if (scoreFilter === "high" && m.match_score < 70) return false;
      if (scoreFilter === "medium" && (m.match_score < 50 || m.match_score >= 70))
        return false;
      if (scoreFilter === "low" && m.match_score >= 50) return false;
      if (sq) {
        const haystack = [
          m.product_name,
          m.company_name,
          m.request?.product_name,
          m.request?.company,
          m.request?.category,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(sq)) return false;
      }
      return true;
    });
  }, [matches, statusFilter, scoreFilter, searchQuery, localStatuses]);

  async function updateStatus(id: string, status: string) {
    setActionLoading(id);
    try {
      await fetch(`/api/admin/sourcing-matches/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setLocalStatuses((prev) => ({ ...prev, [id]: status }));
    } finally {
      setActionLoading(null);
    }
  }

  const STATUS_PILLS: { key: FilterStatus; label: string }[] = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "approved", label: "Approved" },
    { key: "rejected", label: "Rejected" },
    { key: "sent", label: "Sent" },
  ];

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search product, supplier, buyer..."
            className="pl-7 pr-7 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-200 bg-white w-64"
          />
          <span className="absolute left-2 top-2 text-gray-400 text-xs pointer-events-none">
            🔍
          </span>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1 text-gray-400 hover:text-gray-600 text-lg leading-none"
            >
              ×
            </button>
          )}
        </div>

        <select
          value={scoreFilter}
          onChange={(e) => setScoreFilter(e.target.value as FilterScore)}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white text-slate-600 outline-none"
        >
          <option value="all">All scores</option>
          <option value="high">High ≥70</option>
          <option value="medium">Medium 50–69</option>
          <option value="low">Low &lt;50</option>
        </select>

        <div className="flex gap-1">
          {STATUS_PILLS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setStatusFilter(p.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                statusFilter === p.key
                  ? "bg-slate-800 text-white"
                  : "border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <span className="text-xs text-gray-400 ml-auto">
          {filtered.length} match{filtered.length !== 1 ? "es" : ""}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          No matches found.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {[
                  "Request",
                  "Buyer",
                  "Supplier",
                  "Product",
                  "Score",
                  "Status",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((m) => {
                const effectiveStatus = localStatuses[m.id] ?? m.status;
                const waMsg = m.whatsapp_message ?? m.match_summary ?? "";
                const kosher = (
                  (m.match_breakdown?.kosher_types ?? []) as string[]
                ).join(", ");

                return (
                  <tr key={m.id} className="hover:bg-gray-50">
                    {/* Request */}
                    <td className="px-3 py-3">
                      <p className="text-xs font-medium text-gray-900 truncate max-w-[120px]">
                        {m.request?.product_name ?? "—"}
                      </p>
                      {m.request?.category && (
                        <span className="text-xs text-gray-400">
                          {m.request.category}
                        </span>
                      )}
                    </td>

                    {/* Buyer */}
                    <td className="px-3 py-3">
                      <p className="text-xs text-gray-700">
                        {m.request?.company ?? "—"}
                      </p>
                      {m.request?.email && (
                        <a
                          href={`mailto:${m.request.email}`}
                          className="text-xs text-orange-600 hover:underline"
                        >
                          {m.request.email}
                        </a>
                      )}
                    </td>

                    {/* Supplier */}
                    <td className="px-3 py-3">
                      <p className="text-xs font-medium text-gray-900">
                        {m.company_name ?? m.supplier?.company_name ?? "—"}
                      </p>
                      {(m.country ?? m.supplier?.country_of_origin) && (
                        <span className="text-xs text-gray-400">
                          {m.country ?? m.supplier?.country_of_origin}
                        </span>
                      )}
                    </td>

                    {/* Product */}
                    <td className="px-3 py-3">
                      <p className="text-xs text-gray-700 max-w-[150px] truncate">
                        {m.product_name ?? "—"}
                      </p>
                      {kosher && (
                        <span className="text-xs text-orange-600">✡ {kosher}</span>
                      )}
                    </td>

                    {/* Score */}
                    <td className="px-3 py-3">
                      <ScoreBadge score={m.match_score} />
                    </td>

                    {/* Status */}
                    <td className="px-3 py-3">
                      <StatusBadge status={effectiveStatus} />
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {effectiveStatus !== "approved" && (
                          <button
                            type="button"
                            onClick={() => updateStatus(m.id, "approved")}
                            disabled={actionLoading === m.id}
                            className="text-xs px-2 py-1 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-50 transition"
                          >
                            ✓
                          </button>
                        )}
                        {effectiveStatus !== "rejected" && (
                          <button
                            type="button"
                            onClick={() => updateStatus(m.id, "rejected")}
                            disabled={actionLoading === m.id}
                            className="text-xs px-2 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 transition"
                          >
                            ✗
                          </button>
                        )}
                        {waMsg && (
                          <a
                            href={`https://wa.me/?text=${encodeURIComponent(waMsg)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs px-2 py-1 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition"
                          >
                            WA ↗
                          </a>
                        )}
                        <a
                          href={`/admin/proposals/new?request=${m.request_id}&supplier=${m.supplier_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs px-2 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
                        >
                          Proposal ↗
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
