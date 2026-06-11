"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { RequestRow } from "@/app/admin/requests/page";
import RequestSlideOver from "@/components/admin/RequestSlideOver";

interface Props {
  requests: RequestRow[];
}

const HEADER_MIN_WIDTHS: Record<string, string> = {
  Buyer: "min-w-[160px]",
  Product: "min-w-[180px]",
  Category: "min-w-[120px]",
  Kosher: "min-w-[100px]",
  Status: "min-w-[100px]",
  Matches: "min-w-[150px]",
  Date: "min-w-[100px]",
  Actions: "min-w-[100px]",
};

function StatusBadge({ status }: { status: string | null }) {
  const s = status ?? "new";
  const cls =
    s === "new"
      ? "bg-blue-100 text-blue-700"
      : s === "reviewed"
      ? "bg-yellow-100 text-yellow-700"
      : s === "matched"
      ? "bg-green-100 text-green-700"
      : "bg-gray-100 text-gray-600";
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>
      {s}
    </span>
  );
}

function getKosherRequired(req: RequestRow): boolean | null {
  const compliance = (req.intent_json as { compliance?: { kosher_required?: unknown } } | null)
    ?.compliance;
  const value = compliance?.kosher_required;
  return typeof value === "boolean" ? value : null;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function RequestsTable({ requests }: Props) {
  const router = useRouter();
  const [openRequest, setOpenRequest] = useState<RequestRow | null>(null);
  const [localStatuses, setLocalStatuses] = useState<Record<string, string>>({});
  const [localMatchCounts, setLocalMatchCounts] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [matchQualityFilter, setMatchQualityFilter] = useState("");
  const [buyerFilter, setBuyerFilter] = useState("");
  const [kosherFilter, setKosherFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkRunning, setBulkRunning] = useState(false);

  const uniqueCategories = useMemo(() => {
    const cats = new Set(
      requests.map((r) => r.category).filter((c): c is string => Boolean(c))
    );
    return [...Array.from(cats).sort()];
  }, [requests]);

  const uniqueBuyers = useMemo(() => {
    const buyers = new Set(
      requests
        .map((r) => r.name ?? r.company ?? r.email)
        .filter((b): b is string => Boolean(b))
    );
    return [...Array.from(buyers).sort()];
  }, [requests]);

  const visible = useMemo(() => {
    const sq = searchQuery.toLowerCase();
    let list = requests;

    if (statusFilter) {
      list = list.filter((r) => (localStatuses[r.id] ?? r.status) === statusFilter);
    }

    if (matchQualityFilter) {
      list = list.filter((r) => {
        const count = localMatchCounts[r.id] ?? r.match_count;
        const score = r.best_match_score ?? 0;
        if (matchQualityFilter === "high") return count > 0 && score >= 70;
        if (matchQualityFilter === "low") return count > 0 && score < 70;
        if (matchQualityFilter === "none") return count === 0;
        return true;
      });
    }

    if (buyerFilter) {
      list = list.filter((r) => (r.name ?? r.company ?? r.email) === buyerFilter);
    }

    if (kosherFilter) {
      list = list.filter((r) => {
        const kosherRequired = getKosherRequired(r);
        if (kosherFilter === "required") return kosherRequired === true;
        if (kosherFilter === "not_required") return kosherRequired !== true;
        return true;
      });
    }

    if (categoryFilter) {
      list = list.filter((r) => r.category === categoryFilter);
    }

    if (sq) {
      list = list.filter(
        (r) =>
          r.message?.toLowerCase().includes(sq) ||
          r.name?.toLowerCase().includes(sq) ||
          r.product_name?.toLowerCase().includes(sq) ||
          r.company?.toLowerCase().includes(sq)
      );
    }

    return [...list].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [
    requests,
    statusFilter,
    matchQualityFilter,
    buyerFilter,
    kosherFilter,
    categoryFilter,
    searchQuery,
    localStatuses,
    localMatchCounts,
  ]);

  const allVisibleSelected =
    visible.length > 0 && visible.every((r) => selected.includes(r.id));

  function toggleAll() {
    if (allVisibleSelected) {
      const visibleIds = new Set(visible.map((r) => r.id));
      setSelected((prev) => prev.filter((id) => !visibleIds.has(id)));
    } else {
      setSelected((prev) => [...new Set([...prev, ...visible.map((r) => r.id)])]);
    }
  }

  function toggleRow(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleBulkRerun() {
    setBulkRunning(true);
    for (const id of selected) {
      try {
        await fetch(`/api/admin/requests/${id}/match`, { method: "POST" });
      } catch {
        // continue with remaining
      }
    }
    setBulkRunning(false);
    setSelected([]);
    router.refresh();
  }

  function handleBulkOpen() {
    for (const id of selected) {
      window.open(`/admin/requests/${id}`, "_blank", "noopener,noreferrer");
    }
  }

  function handleStatusChange(id: string, status: string) {
    setLocalStatuses((prev) => ({ ...prev, [id]: status }));
    if (openRequest?.id === id) {
      setOpenRequest((prev) => (prev ? { ...prev, status } : null));
    }
  }

  function handleMatchComplete(id: string, count: number) {
    setLocalMatchCounts((prev) => ({ ...prev, [id]: count }));
  }

  if (requests.length === 0) {
    return (
      <p className="text-center text-sm text-gray-400 py-16">
        No sourcing requests yet.
      </p>
    );
  }

  return (
    <>
      {/* Filter bar */}
      <div className="bg-white border border-gray-200 rounded-3xl shadow-sm p-4 mb-4">
        <div className="flex flex-col gap-3">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search description or buyer name..."
              className="w-full rounded-2xl border border-gray-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            />
          </div>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <FilterSelect
                label="Status"
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: "", label: "All statuses" },
                  { value: "new", label: "New" },
                  { value: "reviewed", label: "Reviewed" },
                  { value: "matched", label: "Matched" },
                  { value: "closed", label: "Closed" },
                ]}
              />
              <FilterSelect
                label="Match quality"
                value={matchQualityFilter}
                onChange={setMatchQualityFilter}
                options={[
                  { value: "", label: "All" },
                  { value: "high", label: "High score ≥70" },
                  { value: "low", label: "Low score <70" },
                  { value: "none", label: "No matches yet" },
                ]}
              />
              <FilterSelect
                label="Buyer"
                value={buyerFilter}
                onChange={setBuyerFilter}
                options={[
                  { value: "", label: "All buyers" },
                  ...uniqueBuyers.map((b) => ({ value: b, label: b })),
                ]}
              />
              <FilterSelect
                label="Kosher"
                value={kosherFilter}
                onChange={setKosherFilter}
                options={[
                  { value: "", label: "All kosher" },
                  { value: "required", label: "Kosher required" },
                  { value: "not_required", label: "Not required" },
                ]}
              />
              <FilterSelect
                label="Category"
                value={categoryFilter}
                onChange={setCategoryFilter}
                options={[
                  { value: "", label: "All categories" },
                  ...uniqueCategories.map((c) => ({ value: c, label: c })),
                ]}
              />
            </div>
            <p className="text-sm text-gray-500 whitespace-nowrap">
              Showing {visible.length} of {requests.length} requests
            </p>
          </div>
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.length > 0 && (
        <div className="flex items-center gap-3 p-3 bg-blue-950 rounded-lg border border-blue-800 mb-3">
          <span className="text-sm text-white">{selected.length} selected</span>
          <button
            type="button"
            onClick={handleBulkRerun}
            disabled={bulkRunning}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-orange-500 hover:bg-orange-600 text-white rounded-lg disabled:opacity-60 transition"
          >
            {bulkRunning && (
              <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {bulkRunning ? "Re-running..." : "Re-run matching"}
          </button>
          <button
            type="button"
            onClick={handleBulkOpen}
            className="px-3 py-1.5 text-xs font-medium border border-white/20 text-white rounded-lg hover:bg-white/10 transition"
          >
            Open all
          </button>
          <button
            type="button"
            onClick={() => setSelected([])}
            className="text-white/50 text-sm hover:text-white/80 transition"
          >
            Clear
          </button>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl overflow-x-auto shadow-sm">
        <table className="w-full text-sm min-w-max">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-10">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                />
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-12">
                {""}
              </th>
              {[
                "Buyer",
                "Product",
                "Category",
                "Kosher",
                "Status",
                "Matches",
                "Date",
                "Actions",
              ].map((h) => (
                <th
                  key={h}
                  className={`px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider ${
                    HEADER_MIN_WIDTHS[h] ?? ""
                  } ${
                    h === "Buyer"
                      ? "sticky left-0 z-10 bg-gray-50 border-r border-gray-200"
                      : ""
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visible.map((req) => {
              const effectiveStatus = localStatuses[req.id] ?? req.status;
              const effectiveMatchCount =
                localMatchCounts[req.id] ?? req.match_count;
              const hasKosher = req.certifications?.some((c) =>
                c.toLowerCase().includes("kosher")
              );

              return (
                <tr
                  key={req.id}
                  className="group hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() =>
                    setOpenRequest({
                      ...req,
                      status: effectiveStatus,
                      match_count: effectiveMatchCount,
                    })
                  }
                >
                  {/* Checkbox */}
                  <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.includes(req.id)}
                      onChange={() => toggleRow(req.id)}
                      className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                    />
                  </td>

                  {/* Thumbnail */}
                  <td className="px-3 py-3 w-12">
                    {req.images.length > 0 ? (
                      <img
                        src={req.images[0].url}
                        alt=""
                        className="w-9 h-9 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-base">
                        📸
                      </div>
                    )}
                  </td>

                  {/* Buyer */}
                  <td className="px-3 py-3 sticky left-0 z-10 bg-white border-r border-gray-200 group-hover:bg-gray-50 transition-colors">
                    <p className="font-medium text-gray-900 text-xs">
                      {req.name ?? "—"}
                    </p>
                    {req.buyer_id ? (
                      <Link
                        href={`/admin/buyers/${req.buyer_id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="block text-xs text-orange-600 hover:text-orange-700 truncate max-w-[130px]"
                      >
                        {req.company ?? req.email ?? "—"}
                      </Link>
                    ) : (
                      <>
                        <p className="text-xs text-orange-600 truncate max-w-[130px]">
                          {req.company ?? req.email ?? "—"}
                        </p>
                        {(req.name || req.email || req.company) && (
                          <Link
                            href={`/admin/buyers/new?company_name=${encodeURIComponent(
                              req.company ?? ""
                            )}&contact_name=${encodeURIComponent(
                              req.name ?? ""
                            )}&contact_email=${encodeURIComponent(req.email ?? "")}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs text-gray-400 hover:text-orange-600 underline"
                          >
                            + Create buyer
                          </Link>
                        )}
                      </>
                    )}
                  </td>

                  {/* Product */}
                  <td className="px-3 py-3 max-w-[160px]">
                    {req.product_name ? (
                      <p className="text-xs font-medium text-gray-800 truncate">
                        {req.product_name}
                      </p>
                    ) : req.message ? (
                      <p className="text-xs text-gray-400 italic truncate">
                        {req.message.slice(0, 50)}…
                      </p>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>

                  {/* Category */}
                  <td className="px-3 py-3">
                    {req.category ? (
                      <span className="text-xs bg-slate-100 text-slate-600 rounded-full px-2 py-0.5">
                        {req.category}
                      </span>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>

                  {/* Kosher */}
                  <td className="px-3 py-3">
                    {hasKosher ? (
                      <span className="text-xs bg-orange-50 text-orange-700 rounded-full px-2 py-0.5">
                        ✡ Kosher
                      </span>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-3 py-3">
                    <StatusBadge status={effectiveStatus} />
                  </td>

                  {/* Matches */}
                  <td className="px-3 py-3">
                    {effectiveMatchCount > 0 ? (
                      <span className="text-xs font-medium text-green-600">
                        {effectiveMatchCount} match{effectiveMatchCount !== 1 ? "es" : ""}
                        {req.best_match_score
                          ? ` · best ${req.best_match_score}%`
                          : ""}
                      </span>
                    ) : (
                      <span className="text-orange-500 text-xs font-medium">
                        No matches yet
                      </span>
                    )}
                  </td>

                  {/* Date */}
                  <td className="px-3 py-3 text-xs text-gray-400 whitespace-nowrap">
                    {timeAgo(req.created_at)}
                  </td>

                  {/* Actions */}
                  <td
                    className="px-3 py-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setOpenRequest({
                          ...req,
                          status: effectiveStatus,
                          match_count: effectiveMatchCount,
                        })
                      }
                      className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:border-orange-300 hover:text-orange-600 transition"
                    >
                      Open
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <RequestSlideOver
        request={openRequest}
        onClose={() => setOpenRequest(null)}
        onStatusChange={handleStatusChange}
        onMatchComplete={handleMatchComplete}
      />
    </>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block min-w-40 text-xs text-slate-500">
      <span className="mb-1 block font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
