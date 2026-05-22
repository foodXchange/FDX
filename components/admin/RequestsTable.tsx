"use client";

import { useState, useMemo } from "react";
import type { RequestRow } from "@/app/admin/requests/page";
import RequestSlideOver from "@/components/admin/RequestSlideOver";

interface Props {
  requests: RequestRow[];
}

const STATUS_FILTERS = ["all", "new", "reviewed", "matched", "closed"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

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
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [selected, setSelected] = useState<RequestRow | null>(null);
  const [localStatuses, setLocalStatuses] = useState<Record<string, string>>({});
  const [localMatchCounts, setLocalMatchCounts] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [kosherFilter, setKosherFilter] = useState<"all" | "yes" | "no">("all");
  const [sortBy, setSortBy] = useState<"newest" | "score">("newest");

  const uniqueCategories = useMemo(() => {
    const cats = new Set(
      requests.map((r) => r.category).filter((c): c is string => Boolean(c))
    );
    return [...Array.from(cats).sort()];
  }, [requests]);

  const visible = useMemo(() => {
    const sq = searchQuery.toLowerCase();
    let list = filter === "all"
      ? requests
      : requests.filter(
          (r) => (localStatuses[r.id] ?? r.status) === filter
        );

    if (sq) {
      list = list.filter(
        (r) =>
          r.product_name?.toLowerCase().includes(sq) ||
          r.company?.toLowerCase().includes(sq) ||
          r.message?.toLowerCase().includes(sq)
      );
    }

    if (categoryFilter) {
      list = list.filter((r) => r.category === categoryFilter);
    }

    if (kosherFilter === "yes") {
      list = list.filter((r) =>
        r.certifications?.some((c) => c.toLowerCase().includes("kosher"))
      );
    } else if (kosherFilter === "no") {
      list = list.filter(
        (r) =>
          !r.certifications?.some((c) => c.toLowerCase().includes("kosher"))
      );
    }

    if (sortBy === "score") {
      list = [...list].sort(
        (a, b) =>
          (localMatchCounts[b.id] !== undefined
            ? b.best_match_score ?? 0
            : b.best_match_score ?? 0) -
          (localMatchCounts[a.id] !== undefined
            ? a.best_match_score ?? 0
            : a.best_match_score ?? 0)
      );
    } else {
      list = [...list].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }

    return list;
  }, [
    requests,
    filter,
    searchQuery,
    categoryFilter,
    kosherFilter,
    sortBy,
    localStatuses,
    localMatchCounts,
  ]);

  function handleStatusChange(id: string, status: string) {
    setLocalStatuses((prev) => ({ ...prev, [id]: status }));
    if (selected?.id === id) {
      setSelected((prev) => (prev ? { ...prev, status } : null));
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
      <div className="mb-3 flex flex-wrap gap-2 items-center">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search product or company..."
            className="pl-7 pr-7 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-200 bg-white w-56"
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
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white text-slate-600 outline-none"
        >
          <option value="">All categories</option>
          {uniqueCategories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          value={kosherFilter}
          onChange={(e) =>
            setKosherFilter(e.target.value as "all" | "yes" | "no")
          }
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white text-slate-600 outline-none"
        >
          <option value="all">Any kosher</option>
          <option value="yes">Kosher required</option>
          <option value="no">No kosher</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "newest" | "score")}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white text-slate-600 outline-none"
        >
          <option value="newest">Newest first</option>
          <option value="score">Highest match score</option>
        </select>
      </div>

      {/* Status filter pills */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition capitalize ${
              filter === f
                ? "bg-slate-900 text-white"
                : "border border-slate-200 text-slate-600 hover:border-slate-400"
            }`}
          >
            {f === "all" ? `All (${requests.length})` : f}
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {[
                "",
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
                  className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
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
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() =>
                    setSelected({
                      ...req,
                      status: effectiveStatus,
                      match_count: effectiveMatchCount,
                    })
                  }
                >
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
                  <td className="px-3 py-3">
                    <p className="font-medium text-gray-900 text-xs">
                      {req.name ?? "—"}
                    </p>
                    <p className="text-xs text-orange-600 truncate max-w-[130px]">
                      {req.company ?? req.email ?? "—"}
                    </p>
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
                        setSelected({
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
        request={selected}
        onClose={() => setSelected(null)}
        onStatusChange={handleStatusChange}
        onMatchComplete={handleMatchComplete}
      />
    </>
  );
}
