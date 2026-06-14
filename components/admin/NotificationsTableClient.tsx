"use client";

import { useCallback, useEffect, useState } from "react";
import type { AdminNotification, NotificationType } from "@/lib/notifications/types";

const PAGE_SIZE = 50;

const TYPE_LABELS: Record<NotificationType, string> = {
  new_request: "New request",
  match_sent: "Match sent",
  response: "Response",
  lead: "Lead",
  system: "System",
  match_reply: "Match reply",
  match_message: "Match message",
  supplier_signup: "New supplier signup",
};

const TYPE_BADGE_CLASSES: Record<NotificationType, string> = {
  new_request: "bg-blue-100 text-blue-700",
  match_sent: "bg-purple-100 text-purple-700",
  response: "bg-green-100 text-green-700",
  lead: "bg-orange-100 text-orange-700",
  system: "bg-slate-100 text-slate-700",
  match_reply: "bg-teal-100 text-teal-700",
  match_message: "bg-indigo-100 text-indigo-700",
  supplier_signup: "bg-amber-100 text-amber-700",
};

type ReadFilter = "" | "unread" | "read";

type Props = {
  initialNotifications: AdminNotification[];
  initialTotalCount: number;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function NotificationsTableClient({ initialNotifications, initialTotalCount }: Props) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [page, setPage] = useState(0);
  const [typeFilter, setTypeFilter] = useState("");
  const [readFilter, setReadFilter] = useState<ReadFilter>("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<AdminNotification | null>(null);
  const [loaded, setLoaded] = useState(false);

  const fetchPage = useCallback(
    async (targetPage: number) => {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/notifications/list", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            limit: PAGE_SIZE,
            offset: targetPage * PAGE_SIZE,
            type: typeFilter || undefined,
            read: readFilter === "unread" ? false : readFilter === "read" ? true : undefined,
            from: fromDate ? new Date(fromDate).toISOString() : undefined,
            to: toDate ? new Date(`${toDate}T23:59:59`).toISOString() : undefined,
          }),
        });
        if (!res.ok) return;
        const json = await res.json();
        setNotifications((json.notifications ?? []) as AdminNotification[]);
        setTotalCount(json.total_count ?? 0);
      } finally {
        setLoading(false);
      }
    },
    [typeFilter, readFilter, fromDate, toDate]
  );

  useEffect(() => {
    if (!loaded) {
      setLoaded(true);
      return;
    }
    setPage(0);
    fetchPage(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, readFilter, fromDate, toDate]);

  useEffect(() => {
    if (!loaded) return;
    fetchPage(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  async function markRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true, read_at: new Date().toISOString() } : n))
    );
    await fetch(`/api/admin/notifications/${id}/mark-read`, { method: "POST" });
  }

  async function deleteNotification(id: string) {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setTotalCount((prev) => Math.max(0, prev - 1));
    setSelected((prev) => (prev?.id === id ? null : prev));
    await fetch(`/api/admin/notifications/${id}`, { method: "DELETE" });
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Type</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          >
            <option value="">All types</option>
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
          <select
            value={readFilter}
            onChange={(e) => setReadFilter(e.target.value as ReadFilter)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          >
            <option value="">All</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">From</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">To</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          />
        </div>

        {(typeFilter || readFilter || fromDate || toDate) && (
          <button
            type="button"
            onClick={() => {
              setTypeFilter("");
              setReadFilter("");
              setFromDate("");
              setToDate("");
            }}
            className="text-xs font-medium text-slate-500 hover:text-slate-700 px-2 py-1.5"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
            <tr>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Title</th>
              <th className="px-4 py-2">Message</th>
              <th className="px-4 py-2">Created</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  {loading ? "Loading…" : "No notifications found"}
                </td>
              </tr>
            ) : (
              notifications.map((n) => (
                <tr key={n.id} className={n.read ? "" : "bg-orange-50/40"}>
                  <td className="px-4 py-2">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_BADGE_CLASSES[n.type]}`}>
                      {TYPE_LABELS[n.type]}
                    </span>
                  </td>
                  <td className="px-4 py-2 font-medium text-slate-800">{n.title}</td>
                  <td className="px-4 py-2 text-slate-500 max-w-xs truncate">{n.message ?? "—"}</td>
                  <td className="px-4 py-2 text-slate-500 whitespace-nowrap">{formatDate(n.created_at)}</td>
                  <td className="px-4 py-2">
                    {n.read ? (
                      <span className="text-xs text-slate-400">Read</span>
                    ) : (
                      <span className="text-xs font-medium text-orange-600">Unread</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right whitespace-nowrap space-x-3">
                    <button type="button" onClick={() => setSelected(n)} className="text-xs font-medium text-slate-600 hover:text-slate-900">
                      View
                    </button>
                    {!n.read && (
                      <button type="button" onClick={() => markRead(n.id)} className="text-xs font-medium text-orange-600 hover:text-orange-700">
                        Mark read
                      </button>
                    )}
                    <button type="button" onClick={() => deleteNotification(n.id)} className="text-xs font-medium text-red-500 hover:text-red-700">
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4 text-sm text-slate-500">
        <span>
          {totalCount === 0 ? "0 results" : `${page * PAGE_SIZE + 1}–${Math.min(totalCount, (page + 1) * PAGE_SIZE)} of ${totalCount}`}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page === 0 || loading}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="rounded-lg border border-slate-300 px-3 py-1 disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={page + 1 >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-slate-300 px-3 py-1 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>

      {/* Details modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelected(null);
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <div>
                <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_BADGE_CLASSES[selected.type]}`}>
                  {TYPE_LABELS[selected.type]}
                </span>
                <h2 className="text-base font-semibold text-slate-900 mt-1">{selected.title}</h2>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">
                ×
              </button>
            </div>
            <div className="px-6 py-4 overflow-y-auto space-y-4">
              {selected.message && <p className="text-sm text-slate-700">{selected.message}</p>}
              <p className="text-xs text-slate-400">{formatDate(selected.created_at)}</p>
              {selected.data && (
                <pre className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600 overflow-x-auto">
                  {JSON.stringify(selected.data, null, 2)}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
