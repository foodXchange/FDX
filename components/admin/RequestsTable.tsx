"use client";

import { useState } from "react";
import type { RequestRow } from "@/app/admin/requests/page";
import RequestSlideOver from "@/components/admin/RequestSlideOver";

interface RequestsTableProps {
  requests: RequestRow[];
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: string | null }) {
  const s = status ?? "new";
  const cls =
    s === "new"
      ? "bg-orange-100 text-orange-700"
      : s === "contacted"
      ? "bg-blue-100 text-blue-700"
      : s === "matched"
      ? "bg-green-100 text-green-700"
      : "bg-gray-100 text-gray-600";
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>{s}</span>
  );
}

export default function RequestsTable({ requests }: RequestsTableProps) {
  const [selected, setSelected] = useState<RequestRow | null>(null);
  const [localStatuses, setLocalStatuses] = useState<Record<string, string>>({});

  function handleStatusChange(id: string, status: string) {
    setLocalStatuses((prev) => ({ ...prev, [id]: status }));
    if (selected?.id === id) {
      setSelected((prev) => (prev ? { ...prev, status } : null));
    }
  }

  if (requests.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-16">
        No sourcing requests yet. They will appear here when buyers submit via the widget.
      </p>
    );
  }

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {["", "Name", "Product / Category", "AI", "Source", "Status", "Date"].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {requests.map((req) => {
              const effectiveStatus = localStatuses[req.id] ?? req.status;
              return (
                <tr
                  key={req.id}
                  onClick={() => setSelected({ ...req, status: effectiveStatus })}
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  {/* Thumbnail */}
                  <td className="px-4 py-3 w-14">
                    {req.images.length > 0 ? (
                      <img
                        src={req.images[0]}
                        alt=""
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-lg">
                        📸
                      </div>
                    )}
                  </td>

                  {/* Name + Email */}
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{req.name ?? "—"}</p>
                    <p className="text-xs text-orange-600">{req.email ?? "—"}</p>
                  </td>

                  {/* Product / Category */}
                  <td className="px-4 py-3 max-w-[180px]">
                    {req.product_name ? (
                      <p className="font-medium text-gray-800 truncate">{req.product_name}</p>
                    ) : req.message ? (
                      <p className="text-gray-500 text-xs truncate italic">{req.message.slice(0, 60)}</p>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                    {req.category && (
                      <p className="text-xs text-gray-400 mt-0.5">{req.category}</p>
                    )}
                  </td>

                  {/* AI badge */}
                  <td className="px-4 py-3">
                    {req.ai_analysis ? (
                      <span className="text-xs bg-orange-50 text-orange-600 border border-orange-200 rounded-full px-2 py-0.5 font-medium">
                        ✦ AI
                      </span>
                    ) : (
                      <span className="text-gray-200 text-xs">—</span>
                    )}
                  </td>

                  {/* Source */}
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {req.source ?? "—"}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <StatusBadge status={effectiveStatus} />
                  </td>

                  {/* Date */}
                  <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                    {formatDate(req.created_at)}
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
      />
    </>
  );
}
