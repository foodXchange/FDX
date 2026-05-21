"use client";

import { useState } from "react";
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
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>{s}</span>
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

  const visible =
    filter === "all"
      ? requests
      : requests.filter(
          (r) => (localStatuses[r.id] ?? r.status) === filter
        );

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
        No sourcing requests yet. They will appear here when buyers submit via the widget.
      </p>
    );
  }

  return (
    <>
      {/* Filter pills */}
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
                "", "Buyer", "Product", "Category", "Source",
                "Images", "Status", "Matched", "Date", "Actions",
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
              return (
                <tr key={req.id} className="hover:bg-gray-50 transition-colors">
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
                    <p className="font-medium text-gray-900 text-xs">{req.name ?? "—"}</p>
                    <p className="text-xs text-orange-600 truncate max-w-[140px]">
                      {req.email ?? "—"}
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

                  {/* Source */}
                  <td className="px-3 py-3 text-xs text-gray-400">
                    {req.source ?? "—"}
                  </td>

                  {/* Images */}
                  <td className="px-3 py-3 text-xs text-gray-500">
                    {req.images.length > 0 ? `🖼 ${req.images.length}` : "—"}
                  </td>

                  {/* Status */}
                  <td className="px-3 py-3">
                    <StatusBadge status={effectiveStatus} />
                  </td>

                  {/* Matched */}
                  <td className="px-3 py-3">
                    {effectiveMatchCount > 0 ? (
                      <span className="text-xs font-medium text-green-600">
                        ✓ {effectiveMatchCount}
                      </span>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>

                  {/* Date */}
                  <td className="px-3 py-3 text-xs text-gray-400 whitespace-nowrap">
                    {timeAgo(req.created_at)}
                  </td>

                  {/* Actions */}
                  <td className="px-3 py-3">
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
                      View
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
