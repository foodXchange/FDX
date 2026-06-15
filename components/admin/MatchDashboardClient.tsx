"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import CategoryCombobox from "@/components/admin/CategoryCombobox";
import type { MatchRow } from "@/app/admin/matches/page";
import type { EmailTemplateRow } from "@/components/admin/EmailTemplatesClient";
import BulkOutreachModal from "@/components/admin/BulkOutreachModal";

const PAGE_SIZE = 50;

function ScoreBadge({ score }: { score: number }) {
  const cls =
    score >= 70
      ? "text-green-700 bg-green-50"
      : score >= 60
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
    responded: "bg-purple-100 text-purple-700",
    closed: "bg-gray-200 text-gray-600",
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

const SENT_VIA_ICON: Record<string, string> = { email: "📧", whatsapp: "💬" };

function relativeTime(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function Pill({
  label,
  count,
  active,
  color,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full transition-all ${color} ${
        active ? "ring-2 ring-orange-300" : "hover:opacity-80"
      }`}
    >
      {count} {label}
    </button>
  );
}

type FilterStatus =
  | "all"
  | "pending"
  | "approved"
  | "rejected"
  | "sent"
  | "responded"
  | "closed";
type FilterScore = "all" | "high" | "medium" | "low";

interface Props {
  matches: MatchRow[];
  templates: EmailTemplateRow[];
}

export default function MatchDashboardClient({ matches, templates }: Props) {
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [scoreFilter, setScoreFilter] = useState<FilterScore>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [buyerFilter, setBuyerFilter] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [localStatuses, setLocalStatuses] = useState<Record<string, string>>({});
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkModalMatches, setBulkModalMatches] = useState<MatchRow[] | null>(null);

  function resetPage() {
    setVisibleCount(PAGE_SIZE);
  }

  const uniqueBuyers = useMemo(() => {
    const set = new Set<string>();
    for (const m of matches) {
      if (m.request?.company) set.add(m.request.company);
    }
    return Array.from(set).sort();
  }, [matches]);

  const uniqueCountries = useMemo(() => {
    const set = new Set<string>();
    for (const m of matches) {
      const c = m.country ?? m.supplier?.country_of_origin;
      if (c) set.add(c);
    }
    return Array.from(set).sort();
  }, [matches]);

  const statusCounts = useMemo(() => {
    const counts = { pending: 0, approved: 0, rejected: 0, sent: 0 };
    for (const m of matches) {
      const status = localStatuses[m.id] ?? m.status;
      if (status === "pending") counts.pending++;
      else if (status === "approved") counts.approved++;
      else if (status === "rejected") counts.rejected++;
      else if (status === "sent") counts.sent++;
    }
    return counts;
  }, [matches, localStatuses]);

  const filtered = useMemo(() => {
    const sq = searchQuery.toLowerCase();
    return matches.filter((m) => {
      const effectiveStatus = localStatuses[m.id] ?? m.status;
      if (statusFilter !== "all" && effectiveStatus !== statusFilter) return false;
      if (scoreFilter === "high" && m.match_score < 70) return false;
      if (scoreFilter === "medium" && (m.match_score < 60 || m.match_score >= 70))
        return false;
      if (scoreFilter === "low" && m.match_score >= 60) return false;
      if (buyerFilter && m.request?.company !== buyerFilter) return false;
      if (countryFilter && (m.country ?? m.supplier?.country_of_origin) !== countryFilter)
        return false;
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
  }, [matches, statusFilter, scoreFilter, searchQuery, buyerFilter, countryFilter, localStatuses]);

  const shown = filtered.slice(0, visibleCount);
  const allShownSelected = shown.length > 0 && shown.every((m) => selectedIds.has(m.id));

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allShownSelected) {
        for (const m of shown) next.delete(m.id);
      } else {
        for (const m of shown) next.add(m.id);
      }
      return next;
    });
  }

  function handleBulkDone(matchIds: string[]) {
    setLocalStatuses((prev) => {
      const next = { ...prev };
      for (const id of matchIds) next[id] = "sent";
      return next;
    });
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of matchIds) next.delete(id);
      return next;
    });
    setBulkModalMatches(null);
  }

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

  async function handleSend(id: string) {
    setActionLoading(id);
    try {
      await fetch(`/api/matching/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", sent_via: "whatsapp" }),
      });
      setLocalStatuses((prev) => ({ ...prev, [id]: "sent" }));
    } finally {
      setActionLoading(null);
    }
  }

  function clearAll() {
    setSearchQuery("");
    setStatusFilter("all");
    setScoreFilter("all");
    setBuyerFilter("");
    setCountryFilter("");
    resetPage();
  }

  const hasActiveFilters =
    !!searchQuery ||
    statusFilter !== "all" ||
    scoreFilter !== "all" ||
    !!buyerFilter ||
    !!countryFilter;

  return (
    <div>
      {/* Summary pills */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <Pill
          label="Total"
          count={matches.length}
          active={statusFilter === "all"}
          color="bg-slate-50 text-slate-600"
          onClick={() => {
            setStatusFilter("all");
            resetPage();
          }}
        />
        <Pill
          label="Pending"
          count={statusCounts.pending}
          active={statusFilter === "pending"}
          color="bg-orange-50 text-orange-700"
          onClick={() => {
            setStatusFilter("pending");
            resetPage();
          }}
        />
        <Pill
          label="Approved"
          count={statusCounts.approved}
          active={statusFilter === "approved"}
          color="bg-green-50 text-green-700"
          onClick={() => {
            setStatusFilter("approved");
            resetPage();
          }}
        />
        <Pill
          label="Rejected"
          count={statusCounts.rejected}
          active={statusFilter === "rejected"}
          color="bg-red-50 text-red-700"
          onClick={() => {
            setStatusFilter("rejected");
            resetPage();
          }}
        />
        <Pill
          label="Sent"
          count={statusCounts.sent}
          active={statusFilter === "sent"}
          color="bg-blue-50 text-blue-700"
          onClick={() => {
            setStatusFilter("sent");
            resetPage();
          }}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              resetPage();
            }}
            placeholder="Search product, supplier, buyer..."
            className="pl-7 pr-7 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-200 bg-white w-64"
          />
          <span className="absolute left-2 top-2 text-gray-400 text-xs pointer-events-none">
            🔍
          </span>
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                resetPage();
              }}
              className="absolute right-2 top-1 text-gray-400 hover:text-gray-600 text-lg leading-none"
            >
              ×
            </button>
          )}
        </div>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as FilterStatus);
            resetPage();
          }}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white text-slate-600 outline-none"
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="sent">Sent</option>
          <option value="responded">Responded</option>
          <option value="closed">Closed</option>
        </select>

        <select
          value={scoreFilter}
          onChange={(e) => {
            setScoreFilter(e.target.value as FilterScore);
            resetPage();
          }}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white text-slate-600 outline-none"
        >
          <option value="all">All scores</option>
          <option value="high">70+</option>
          <option value="medium">60-69</option>
          <option value="low">Below 60</option>
        </select>

        <CategoryCombobox
          value={buyerFilter}
          categories={uniqueBuyers.map((b) => ({ id: b, name: b }))}
          onChange={(v) => {
            setBuyerFilter(v);
            resetPage();
          }}
          placeholder="All buyers"
        />

        <CategoryCombobox
          value={countryFilter}
          categories={uniqueCountries.map((c) => ({ id: c, name: c }))}
          onChange={(v) => {
            setCountryFilter(v);
            resetPage();
          }}
          placeholder="All countries"
        />

        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearAll}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:border-orange-300 hover:text-orange-600 transition-colors"
          >
            Clear all filters
          </button>
        )}

        <span className="text-xs text-gray-400 ml-auto">
          {filtered.length} match{filtered.length !== 1 ? "es" : ""}
        </span>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between gap-3 mb-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-2">
          <span className="text-sm font-medium text-orange-700">
            {selectedIds.size} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setBulkModalMatches(matches.filter((m) => selectedIds.has(m.id)))}
              className="text-xs px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white transition"
            >
              Bulk outreach
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          No matches found.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-3 py-3 text-left w-8">
                  <input
                    type="checkbox"
                    checked={allShownSelected}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300"
                  />
                </th>
                {[
                  "Score",
                  "Buyer",
                  "Product",
                  "Supplier",
                  "Country",
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
              {shown.map((m) => {
                const effectiveStatus = localStatuses[m.id] ?? m.status;
                const waMsg = m.whatsapp_message ?? m.match_summary ?? "";
                const kosher = (
                  (m.match_breakdown?.kosher_types ?? []) as string[]
                ).join(", ");
                const country = m.country ?? m.supplier?.country_of_origin;

                const sentMoreThan24hAgo =
                  !!m.sent_at && Date.now() - new Date(m.sent_at).getTime() > 24 * 60 * 60 * 1000;
                const canResend =
                  effectiveStatus === "sent" && sentMoreThan24hAgo && !m.supplier_responded_at;

                return (
                  <tr key={m.id} className="hover:bg-gray-50">
                    {/* Select */}
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(m.id)}
                        onChange={() => toggleSelect(m.id)}
                        className="rounded border-gray-300"
                      />
                    </td>

                    {/* Score */}
                    <td className="px-3 py-3">
                      <ScoreBadge score={m.match_score} />
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
                      {m.request?.category && (
                        <span className="block mt-0.5 text-xs bg-slate-100 text-slate-600 rounded-full px-2 py-0.5 w-fit">
                          {m.request.category}
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

                    {/* Supplier */}
                    <td className="px-3 py-3">
                      <Link
                        href={`/admin/suppliers/${m.supplier_id}`}
                        className="text-xs font-medium text-gray-900 hover:text-orange-600 hover:underline"
                      >
                        {m.company_name ?? m.supplier?.company_name ?? "—"}
                      </Link>
                    </td>

                    {/* Country */}
                    <td className="px-3 py-3">
                      <span className="text-xs text-gray-500">{country ?? "—"}</span>
                    </td>

                    {/* Status */}
                    <td className="px-3 py-3">
                      <StatusBadge status={effectiveStatus} />
                      {effectiveStatus === "sent" && m.sent_at && (
                        <div className="mt-1 flex items-center gap-1 text-[11px] text-gray-400">
                          <span>{SENT_VIA_ICON[m.sent_via ?? ""] ?? ""}</span>
                          <span>{relativeTime(m.sent_at)}</span>
                        </div>
                      )}
                      {canResend && (
                        <button
                          type="button"
                          onClick={() => setBulkModalMatches([m])}
                          className="mt-1 text-[11px] text-orange-600 hover:underline"
                        >
                          Resend
                        </button>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {effectiveStatus === "pending" && (
                          <>
                            <button
                              type="button"
                              onClick={() => updateStatus(m.id, "approved")}
                              disabled={actionLoading === m.id}
                              className="text-xs px-2 py-1 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-50 transition"
                            >
                              ✓
                            </button>
                            <button
                              type="button"
                              onClick={() => updateStatus(m.id, "rejected")}
                              disabled={actionLoading === m.id}
                              className="text-xs px-2 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 transition"
                            >
                              ✗
                            </button>
                          </>
                        )}
                        {effectiveStatus === "approved" && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleSend(m.id)}
                              disabled={actionLoading === m.id}
                              className="text-xs px-2 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50 transition"
                            >
                              Send
                            </button>
                            <button
                              type="button"
                              onClick={() => updateStatus(m.id, "rejected")}
                              disabled={actionLoading === m.id}
                              className="text-xs px-2 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 transition"
                            >
                              ✗
                            </button>
                          </>
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
                        <Link
                          href={`/admin/matches/${m.id}`}
                          className="text-xs px-2 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
                        >
                          View thread →
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filtered.length > shown.length && (
            <div className="py-3 text-center border-t border-gray-100">
              <button
                type="button"
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                className="px-4 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:border-orange-300 hover:text-orange-600 transition-colors"
              >
                Load more ({filtered.length - shown.length} remaining)
              </button>
            </div>
          )}
        </div>
      )}

      {bulkModalMatches && (
        <BulkOutreachModal
          matches={bulkModalMatches}
          templates={templates}
          onClose={() => setBulkModalMatches(null)}
          onDone={handleBulkDone}
        />
      )}
    </div>
  );
}
