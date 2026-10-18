"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import CategoryCombobox from "@/components/admin/CategoryCombobox";
import type { MatchRow } from "@/app/admin/matches/page";
import type { EmailTemplateRow } from "@/components/admin/EmailTemplatesClient";
import BulkOutreachModal from "@/components/admin/BulkOutreachModal";
import { getInitials, avatarColors } from "@/lib/admin/avatarPalette";

const PAGE_SIZE = 50;

function ScoreBadge({ score }: { score: number }) {
  const cls =
    score >= 80
      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
      : score >= 70
      ? "text-green-700 bg-green-50 border-green-200"
      : score >= 60
      ? "text-orange-700 bg-orange-50 border-orange-200"
      : "text-red-600 bg-red-50 border-red-200";
  return (
    <span
      className={`inline-flex items-center justify-center text-xs font-extrabold px-2.5 py-1 rounded-lg border ${cls}`}
    >
      {score}%
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    approved: "bg-green-50 text-green-700 border-green-200",
    rejected: "bg-red-50 text-red-600 border-red-200",
    sent: "bg-blue-50 text-blue-700 border-blue-200",
    responded: "bg-purple-50 text-purple-700 border-purple-200",
    closed: "bg-gray-100 text-gray-600 border-gray-200",
    suggested: "bg-yellow-50 text-yellow-700 border-yellow-200",
  };
  return (
    <span
      className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border capitalize ${
        map[status] ?? "bg-slate-100 text-slate-600 border-slate-200"
      }`}
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
      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all border ${color} ${
        active ? "ring-2 ring-orange-400 shadow-xs" : "hover:opacity-85"
      }`}
    >
      <span>{count}</span>
      <span>{label}</span>
    </button>
  );
}

function SupplierAvatar({
  logoUrl,
  name,
}: {
  logoUrl?: string | null;
  name: string;
}) {
  const [failed, setFailed] = useState(false);
  const { bg, text } = avatarColors(name || "Supplier");

  if (logoUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={name}
        onError={() => setFailed(true)}
        className="w-7 h-7 rounded-full object-contain bg-white border border-gray-200 shrink-0 p-0.5"
      />
    );
  }

  return (
    <div
      className={`w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-[10px] font-bold shrink-0 ${bg} ${text}`}
    >
      {getInitials(name || "S")}
    </div>
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
type ViewMode = "grouped" | "table";

interface Props {
  matches: MatchRow[];
  templates: EmailTemplateRow[];
}

export default function MatchDashboardClient({ matches, templates }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>("grouped");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [scoreFilter, setScoreFilter] = useState<FilterScore>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [buyerFilter, setBuyerFilter] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [localStatuses, setLocalStatuses] = useState<Record<string, string>>({});
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkModalMatches, setBulkModalMatches] = useState<MatchRow[] | null>(
    null
  );
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

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
    const counts = {
      pending: 0,
      approved: 0,
      rejected: 0,
      sent: 0,
      responded: 0,
    };
    for (const m of matches) {
      const status = localStatuses[m.id] ?? m.status;
      if (status === "pending") counts.pending++;
      else if (status === "approved") counts.approved++;
      else if (status === "rejected") counts.rejected++;
      else if (status === "sent") counts.sent++;
      else if (status === "responded") counts.responded++;
    }
    return counts;
  }, [matches, localStatuses]);

  const filtered = useMemo(() => {
    const sq = searchQuery.toLowerCase();
    return matches.filter((m) => {
      const effectiveStatus = localStatuses[m.id] ?? m.status;
      if (statusFilter !== "all" && effectiveStatus !== statusFilter)
        return false;
      if (scoreFilter === "high" && m.match_score < 70) return false;
      if (
        scoreFilter === "medium" &&
        (m.match_score < 60 || m.match_score >= 70)
      )
        return false;
      if (scoreFilter === "low" && m.match_score >= 60) return false;
      if (buyerFilter && m.request?.company !== buyerFilter) return false;
      if (
        countryFilter &&
        (m.country ?? m.supplier?.country_of_origin) !== countryFilter
      )
        return false;
      if (sq) {
        const haystack = [
          m.product_name,
          m.company_name,
          m.supplier?.company_name,
          m.request?.product_name,
          m.request?.company,
          m.request?.category,
          m.match_summary,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(sq)) return false;
      }
      return true;
    });
  }, [
    matches,
    statusFilter,
    scoreFilter,
    searchQuery,
    buyerFilter,
    countryFilter,
    localStatuses,
  ]);

  // Group filtered matches by Buyer Request
  const groupedByRequest = useMemo(() => {
    const map = new Map<
      string,
      {
        requestId: string;
        request: MatchRow["request"];
        items: MatchRow[];
        topScore: number;
      }
    >();

    for (const m of filtered) {
      const rid = m.request_id || "unlinked";
      let group = map.get(rid);
      if (!group) {
        group = {
          requestId: rid,
          request: m.request,
          items: [],
          topScore: m.match_score,
        };
        map.set(rid, group);
      }
      group.items.push(m);
      if (m.match_score > group.topScore) group.topScore = m.match_score;
    }

    return Array.from(map.values()).sort((a, b) => b.topScore - a.topScore);
  }, [filtered]);

  const shown = filtered.slice(0, visibleCount);
  const allShownSelected =
    shown.length > 0 && shown.every((m) => selectedIds.has(m.id));

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

  function selectGroup(items: MatchRow[]) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allInGroupSelected = items.every((i) => next.has(i.id));
      if (allInGroupSelected) {
        for (const i of items) next.delete(i.id);
      } else {
        for (const i of items) next.add(i.id);
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

  async function bulkUpdateStatus(ids: string[], status: string) {
    if (ids.length === 0) return;
    setActionLoading("bulk");
    try {
      await Promise.all(
        ids.map((id) =>
          fetch(`/api/admin/sourcing-matches/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
          })
        )
      );
      setLocalStatuses((prev) => {
        const next = { ...prev };
        for (const id of ids) next[id] = status;
        return next;
      });
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
    <div className="space-y-4">
      {/* Top bar: Status summary pills + View mode toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-gray-200 rounded-2xl p-4 shadow-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <Pill
            label="Total"
            count={matches.length}
            active={statusFilter === "all"}
            color="bg-slate-50 text-slate-700 border-slate-200"
            onClick={() => {
              setStatusFilter("all");
              resetPage();
            }}
          />
          <Pill
            label="Pending Review"
            count={statusCounts.pending}
            active={statusFilter === "pending"}
            color="bg-amber-50 text-amber-800 border-amber-200"
            onClick={() => {
              setStatusFilter("pending");
              resetPage();
            }}
          />
          <Pill
            label="Approved"
            count={statusCounts.approved}
            active={statusFilter === "approved"}
            color="bg-green-50 text-green-700 border-green-200"
            onClick={() => {
              setStatusFilter("approved");
              resetPage();
            }}
          />
          <Pill
            label="Outreach Sent"
            count={statusCounts.sent}
            active={statusFilter === "sent"}
            color="bg-blue-50 text-blue-700 border-blue-200"
            onClick={() => {
              setStatusFilter("sent");
              resetPage();
            }}
          />
          <Pill
            label="Responded"
            count={statusCounts.responded}
            active={statusFilter === "responded"}
            color="bg-purple-50 text-purple-700 border-purple-200"
            onClick={() => {
              setStatusFilter("responded");
              resetPage();
            }}
          />
          <Pill
            label="Rejected"
            count={statusCounts.rejected}
            active={statusFilter === "rejected"}
            color="bg-red-50 text-red-700 border-red-200"
            onClick={() => {
              setStatusFilter("rejected");
              resetPage();
            }}
          />
        </div>

        {/* View Toggle */}
        <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200">
          <button
            type="button"
            onClick={() => setViewMode("grouped")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              viewMode === "grouped"
                ? "bg-white text-gray-900 shadow-xs"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            🗂 By Buyer Request ({groupedByRequest.length})
          </button>
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              viewMode === "table"
                ? "bg-white text-gray-900 shadow-xs"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            ☰ Flat Table ({filtered.length})
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap gap-2 items-center bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-xs">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              resetPage();
            }}
            placeholder="Search benchmark, product, supplier, buyer..."
            className="pl-7 pr-7 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-200 bg-white w-72"
          />
          <span className="absolute left-2.5 top-2 text-gray-400 text-xs pointer-events-none">
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
          <option value="sent">Sent</option>
          <option value="responded">Responded</option>
          <option value="rejected">Rejected</option>
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
          <option value="all">All match scores</option>
          <option value="high">Strong Match (70%+)</option>
          <option value="medium">Moderate (60–69%)</option>
          <option value="low">Exploratory (&lt;60%)</option>
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
            Clear filters
          </button>
        )}

        <span className="text-xs text-gray-400 ml-auto">
          Showing {filtered.length} match{filtered.length !== 1 ? "es" : ""}{" "}
          across {groupedByRequest.length} buyer request
          {groupedByRequest.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3 shadow-xs sticky top-16 z-10">
          <span className="text-sm font-bold text-orange-800">
            ✓ {selectedIds.size} match{selectedIds.size !== 1 ? "es" : ""}{" "}
            selected
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              disabled={actionLoading === "bulk"}
              onClick={() =>
                bulkUpdateStatus(Array.from(selectedIds), "approved")
              }
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white transition disabled:opacity-50"
            >
              ✓ Approve Selected
            </button>
            <button
              type="button"
              onClick={() =>
                setBulkModalMatches(
                  matches.filter((m) => selectedIds.has(m.id))
                )
              }
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white transition"
            >
              📧 Send Bulk Outreach
            </button>
            <button
              type="button"
              disabled={actionLoading === "bulk"}
              onClick={() =>
                bulkUpdateStatus(Array.from(selectedIds), "rejected")
              }
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border border-red-200 text-red-600 hover:bg-red-50 transition disabled:opacity-50"
            >
              ✗ Reject Selected
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl text-center py-16 text-gray-400 text-sm">
          No matches found for the current filters.
        </div>
      ) : viewMode === "grouped" ? (
        /* GROUPED BY BUYER REQUEST VIEW */
        <div className="space-y-6">
          {groupedByRequest.map((group) => {
            const req = group.request;
            const benchmarkImg = req?.reference_image_urls?.[0] ?? null;
            const allGroupSelected =
              group.items.length > 0 &&
              group.items.every((i) => selectedIds.has(i.id));
            const pendingInGroup = group.items.filter(
              (i) => (localStatuses[i.id] ?? i.status) === "pending"
            );

            return (
              <div
                key={group.requestId}
                className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs"
              >
                {/* Buyer Request Header Card */}
                <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white px-5 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <input
                      type="checkbox"
                      checked={allGroupSelected}
                      onChange={() => selectGroup(group.items)}
                      title="Select all matches for this request"
                      className="mt-1.5 h-4 w-4 rounded border-slate-500 text-orange-500 focus:ring-orange-400"
                    />
                    {benchmarkImg ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={benchmarkImg}
                        alt={req?.product_name ?? "Benchmark"}
                        onClick={() => setLightboxImage(benchmarkImg)}
                        className="w-16 h-16 rounded-xl object-cover border-2 border-orange-400/70 bg-white shrink-0 cursor-pointer hover:scale-105 transition"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-slate-700/70 border border-slate-600 flex flex-col items-center justify-center text-slate-300 shrink-0 text-[10px]">
                        <span className="text-lg">🎯</span>
                        <span>Benchmark</span>
                      </div>
                    )}

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] uppercase tracking-wider font-bold text-orange-400">
                          Buyer Benchmark Request
                        </span>
                        {req?.category && (
                          <span className="text-[11px] bg-slate-700 text-slate-200 px-2 py-0.5 rounded-full">
                            {req.category}
                          </span>
                        )}
                        {req?.kosher && req.kosher !== "none" && (
                          <span className="text-[11px] bg-amber-500/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full">
                            ✡ Kosher: {req.kosher}
                          </span>
                        )}
                        {req?.quantity && (
                          <span className="text-[11px] bg-slate-700 text-slate-200 px-2 py-0.5 rounded-full">
                            📦 Qty: {req.quantity} {req.unit ?? ""}
                          </span>
                        )}
                      </div>

                      <h2 className="text-base font-bold text-white flex items-center gap-2">
                        <span>{req?.product_name ?? "Untitled Buyer Request"}</span>
                        <span className="text-xs font-normal text-slate-300">
                          — {req?.company ?? "Direct Buyer"}
                        </span>
                      </h2>

                      {req?.notes && (
                        <p className="text-xs text-slate-300 line-clamp-1 max-w-3xl">
                          {req.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Request-level quick actions */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {pendingInGroup.length > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          bulkUpdateStatus(
                            pendingInGroup.map((i) => i.id),
                            "approved"
                          )
                        }
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition"
                      >
                        ✓ Approve All ({pendingInGroup.length})
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setBulkModalMatches(group.items)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white transition"
                    >
                      📧 Outreach ({group.items.length})
                    </button>
                    {req?.id && (
                      <>
                        <Link
                          href={`/admin/products?request_id=${req.id}`}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/15 transition"
                        >
                          🎯 + Match Products
                        </Link>
                        <Link
                          href={`/admin/requests/${req.id}`}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/15 transition"
                        >
                          📄 Request & Brief →
                        </Link>
                      </>
                    )}
                  </div>
                </div>

                {/* Matched Supplier Products List */}
                <div className="divide-y divide-gray-100">
                  {group.items.map((m) => {
                    const effectiveStatus = localStatuses[m.id] ?? m.status;
                    const waMsg = m.whatsapp_message ?? m.match_summary ?? "";
                    const country = m.country ?? m.supplier?.country_of_origin;
                    const supplierName =
                      m.company_name ?? m.supplier?.company_name ?? "Supplier";
                    const reasons = m.match_breakdown?.reasons ?? [];
                    const certs =
                      m.match_breakdown?.certifications ??
                      m.supplier?.certifications ??
                      [];
                    const kosherList = m.match_breakdown?.kosher_types ?? [];

                    return (
                      <div
                        key={m.id}
                        className="p-4 hover:bg-orange-50/20 transition flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                      >
                        {/* Left: Checkbox + Score + Product Photo + Product & Supplier Info */}
                        <div className="flex items-start gap-3.5 min-w-0 flex-1">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(m.id)}
                            onChange={() => toggleSelect(m.id)}
                            className="mt-2 h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500 shrink-0"
                          />

                          <div className="shrink-0 pt-0.5">
                            <ScoreBadge score={m.match_score} />
                          </div>

                          {/* Matched Product Photo */}
                          {m.product_image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={m.product_image_url}
                              alt={m.product_name ?? ""}
                              onClick={() =>
                                setLightboxImage(m.product_image_url ?? null)
                              }
                              className="w-14 h-14 rounded-xl object-cover border border-gray-200 bg-white shrink-0 cursor-pointer hover:scale-105 transition"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-xl border border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center text-gray-400 text-[10px] shrink-0">
                              <span>📦</span>
                              <span>No img</span>
                            </div>
                          )}

                          {/* Product & Supplier Details */}
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-gray-900 text-sm">
                                {m.product_name ?? "Catalog Product Match"}
                              </span>
                              <StatusBadge status={effectiveStatus} />
                              {effectiveStatus === "sent" && m.sent_at && (
                                <span className="text-[11px] text-gray-400">
                                  {SENT_VIA_ICON[m.sent_via ?? ""] ?? ""}{" "}
                                  {relativeTime(m.sent_at)}
                                </span>
                              )}
                            </div>

                            {/* Supplier row with logo */}
                            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                              <SupplierAvatar
                                logoUrl={m.supplier?.logo_url}
                                name={supplierName}
                              />
                              <Link
                                href={`/admin/suppliers/${m.supplier_id}`}
                                className="font-semibold text-gray-800 hover:text-orange-600 hover:underline"
                              >
                                {supplierName}
                              </Link>
                              {country && (
                                <span className="text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full text-[11px]">
                                  📍 {country}
                                </span>
                              )}
                              {m.supplier?.website && (
                                <a
                                  href={
                                    m.supplier.website.startsWith("http")
                                      ? m.supplier.website
                                      : `https://${m.supplier.website}`
                                  }
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-orange-600 hover:underline text-[11px]"
                                >
                                  Website ↗
                                </a>
                              )}
                              {m.supplier?.contact_email && (
                                <span className="text-gray-400 text-[11px]">
                                  ✉ {m.supplier.contact_email}
                                </span>
                              )}
                            </div>

                            {/* Formats, Certs, Reasons */}
                            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                              {(m.product_formats ?? [])
                                .slice(0, 3)
                                .map((fmt) => (
                                  <span
                                    key={fmt}
                                    className="text-[11px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md"
                                  >
                                    📐 {fmt}
                                  </span>
                                ))}
                              {kosherList.map((k) => (
                                <span
                                  key={k}
                                  className="text-[11px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md"
                                >
                                  ✡ {k}
                                </span>
                              ))}
                              {certs.slice(0, 3).map((c) => (
                                <span
                                  key={c}
                                  className="text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md"
                                >
                                  ✓ {c}
                                </span>
                              ))}
                              {reasons.slice(0, 3).map((r, idx) => (
                                <span
                                  key={idx}
                                  className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md"
                                >
                                  {r}
                                </span>
                              ))}
                            </div>

                            {m.match_summary && (
                              <p className="text-xs text-gray-500 line-clamp-1">
                                {m.match_summary}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                          {effectiveStatus === "pending" && (
                            <>
                              <button
                                type="button"
                                onClick={() => updateStatus(m.id, "approved")}
                                disabled={actionLoading === m.id}
                                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition"
                              >
                                ✓ Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => updateStatus(m.id, "rejected")}
                                disabled={actionLoading === m.id}
                                className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 transition"
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
                                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition"
                              >
                                Mark Sent
                              </button>
                              <button
                                type="button"
                                onClick={() => updateStatus(m.id, "rejected")}
                                disabled={actionLoading === m.id}
                                className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 transition"
                              >
                                ✗
                              </button>
                            </>
                          )}
                          {waMsg && (
                            <a
                              href={`https://wa.me/?text=${encodeURIComponent(
                                waMsg
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition"
                            >
                              💬 WA ↗
                            </a>
                          )}
                          <a
                            href={`/admin/proposals/new?request=${m.request_id}&supplier=${m.supplier_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition"
                          >
                            Proposal ↗
                          </a>
                          <Link
                            href={`/admin/matches/${m.id}`}
                            className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition"
                          >
                            Thread →
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* FLAT TABLE VIEW */
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
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
                  "Buyer Benchmark",
                  "Matched Product",
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
                const country = m.country ?? m.supplier?.country_of_origin;
                const supplierName =
                  m.company_name ?? m.supplier?.company_name ?? "—";

                return (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(m.id)}
                        onChange={() => toggleSelect(m.id)}
                        className="rounded border-gray-300"
                      />
                    </td>

                    <td className="px-3 py-3">
                      <ScoreBadge score={m.match_score} />
                    </td>

                    <td className="px-3 py-3">
                      <Link
                        href={`/admin/requests/${m.request_id}`}
                        className="text-xs font-semibold text-gray-900 hover:text-orange-600 hover:underline block"
                      >
                        {m.request?.product_name ?? "—"}
                      </Link>
                      <p className="text-xs text-gray-500">
                        {m.request?.company ?? "—"}
                      </p>
                    </td>

                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        {m.product_image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={m.product_image_url}
                            alt=""
                            onClick={() =>
                              setLightboxImage(m.product_image_url ?? null)
                            }
                            className="w-10 h-10 rounded-lg object-cover border border-gray-200 cursor-pointer shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg border border-dashed border-gray-200 bg-gray-50 flex items-center justify-center text-gray-400 text-xs shrink-0">
                            📦
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-semibold text-gray-900 max-w-[200px] truncate">
                            {m.product_name ?? "—"}
                          </p>
                          {(m.product_formats ?? []).length > 0 && (
                            <p className="text-[11px] text-gray-500 truncate max-w-[200px]">
                              {(m.product_formats ?? []).slice(0, 2).join(", ")}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <SupplierAvatar
                          logoUrl={m.supplier?.logo_url}
                          name={supplierName}
                        />
                        <Link
                          href={`/admin/suppliers/${m.supplier_id}`}
                          className="text-xs font-medium text-gray-900 hover:text-orange-600 hover:underline"
                        >
                          {supplierName}
                        </Link>
                      </div>
                    </td>

                    <td className="px-3 py-3">
                      <span className="text-xs text-gray-600">
                        {country ?? "—"}
                      </span>
                    </td>

                    <td className="px-3 py-3">
                      <StatusBadge status={effectiveStatus} />
                    </td>

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
                        {waMsg && (
                          <a
                            href={`https://wa.me/?text=${encodeURIComponent(
                              waMsg
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs px-2 py-1 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition"
                          >
                            WA ↗
                          </a>
                        )}
                        <Link
                          href={`/admin/matches/${m.id}`}
                          className="text-xs px-2 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
                        >
                          Thread →
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

      {lightboxImage && (
        <div
          className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4"
          onClick={() => setLightboxImage(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxImage}
            alt="Preview"
            className="max-w-[85vw] max-h-[85vh] object-contain rounded-2xl bg-white p-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
