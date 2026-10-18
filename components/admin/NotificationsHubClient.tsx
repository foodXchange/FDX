"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import type { AdminNotification, NotificationType } from "@/lib/notifications/types";
import { buildNotificationGmailLink, createGmailComposeUrl } from "@/lib/notifications/gmailHelper";

type Props = {
  initialNotifications: AdminNotification[];
  initialOperationalReminders: AdminNotification[];
  initialTotalCount: number;
  initialUnreadCount: number;
};

const TYPE_CONFIG: Record<
  NotificationType,
  { label: string; icon: string; badgeClass: string }
> = {
  lead: { label: "Inbound Lead", icon: "⚡", badgeClass: "bg-amber-100 text-amber-800 border-amber-200" },
  new_request: { label: "Sourcing Request", icon: "📥", badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  match_sent: { label: "Match Sent", icon: "🎯", badgeClass: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  match_reply: { label: "Match Reply", icon: "💬", badgeClass: "bg-cyan-100 text-cyan-800 border-cyan-200" },
  match_message: { label: "Deal Message", icon: "📨", badgeClass: "bg-blue-100 text-blue-800 border-blue-200" },
  response: { label: "Partner Response", icon: "🤝", badgeClass: "bg-teal-100 text-teal-800 border-teal-200" },
  supplier_signup: { label: "Supplier Signup", icon: "🏭", badgeClass: "bg-purple-100 text-purple-800 border-purple-200" },
  reminder: { label: "Admin Reminder", icon: "⏰", badgeClass: "bg-rose-100 text-rose-800 border-rose-200" },
  follow_up: { label: "Follow-Up Action", icon: "⏳", badgeClass: "bg-orange-100 text-orange-800 border-orange-200" },
  qa_alert: { label: "QA Alert", icon: "🛡️", badgeClass: "bg-red-100 text-red-800 border-red-200" },
  system: { label: "System", icon: "⚙️", badgeClass: "bg-slate-100 text-slate-800 border-slate-200" },
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function NotificationsHubClient({
  initialNotifications,
  initialOperationalReminders,
  initialTotalCount,
  initialUnreadCount,
}: Props) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [operationalReminders] = useState(initialOperationalReminders);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "unread" | "read">("all");
  const [isLoading, setIsLoading] = useState(false);

  // Inspector Modal
  const [inspectItem, setInspectItem] = useState<AdminNotification | null>(null);

  // New Reminder Modal
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPriority, setNewPriority] = useState<"normal" | "high" | "urgent">("high");
  const [savingReminder, setSavingReminder] = useState(false);

  const refreshList = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/notifications/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 50, include_operational: true }),
      });
      if (!res.ok) return;
      const json = await res.json();
      setNotifications((json.notifications ?? []) as AdminNotification[]);
      setUnreadCount(json.unread_count ?? 0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  async function markRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true, read_at: new Date().toISOString() } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    await fetch(`/api/admin/notifications/${id}/mark-read`, { method: "POST" });
  }

  async function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true, read_at: new Date().toISOString() })));
    setUnreadCount(0);
    await fetch("/api/admin/notifications/mark-all-read", { method: "POST" });
  }

  async function deleteNotification(id: string) {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    await fetch(`/api/admin/notifications/${id}`, { method: "DELETE" });
  }

  async function handleBatchMarkRead() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setNotifications((prev) =>
      prev.map((n) => (ids.includes(n.id) ? { ...n, read: true, read_at: new Date().toISOString() } : n))
    );
    setSelectedIds(new Set());
    await Promise.all(ids.map((id) => fetch(`/api/admin/notifications/${id}/mark-read`, { method: "POST" })));
  }

  async function handleBatchDelete() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setNotifications((prev) => prev.filter((n) => !ids.includes(n.id)));
    setSelectedIds(new Set());
    await Promise.all(ids.map((id) => fetch(`/api/admin/notifications/${id}`, { method: "DELETE" })));
  }

  async function handleCreateReminderSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setSavingReminder(true);
    try {
      const res = await fetch("/api/admin/notifications/create-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          message: newMessage.trim() || undefined,
          dueDate: newDueDate ? new Date(newDueDate).toISOString() : undefined,
          email: newEmail.trim() || undefined,
          priority: newPriority,
        }),
      });

      if (res.ok) {
        setShowReminderModal(false);
        setNewTitle("");
        setNewMessage("");
        setNewDueDate("");
        setNewEmail("");
        refreshList();
      }
    } finally {
      setSavingReminder(false);
    }
  }

  // Combined list for display
  const allItems = [...operationalReminders, ...notifications];

  const filteredItems = allItems.filter((n) => {
    if (statusFilter === "unread" && n.read) return false;
    if (statusFilter === "read" && !n.read) return false;
    if (typeFilter !== "all" && n.type !== typeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = n.title.toLowerCase().includes(q);
      const matchMsg = n.message?.toLowerCase().includes(q) ?? false;
      const matchEmail = JSON.stringify(n.data || {}).toLowerCase().includes(q);
      return matchTitle || matchMsg || matchEmail;
    }
    return true;
  });

  const leadsCount = allItems.filter((n) => n.type === "lead").length;
  const remindersCount = allItems.filter((n) => n.type === "reminder" || n.type === "follow_up" || n.is_operational).length;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner / Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            <Link href="/admin" className="hover:text-slate-600 transition-colors">Admin</Link>
            <span>/</span>
            <span className="text-orange-600">Notification & Reminder Hub</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Notification & Operational Reminders
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Real-time feed of supplier updates, inbound buyer leads, and automated deal follow-up actions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowReminderModal(true)}
            className="px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5"
          >
            <span>⏰</span>
            <span>+ Schedule Reminder</span>
          </button>

          <button
            type="button"
            onClick={refreshList}
            disabled={isLoading}
            className="px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1.5"
          >
            <span className={isLoading ? "animate-spin" : ""}>↻</span>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Unread Alerts</span>
            <span className="p-2 rounded-xl bg-orange-50 text-orange-600 text-base">🔔</span>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">{unreadCount}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Requires admin attention</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Follow-Up Reminders</span>
            <span className="p-2 rounded-xl bg-rose-50 text-rose-600 text-base">⏰</span>
          </div>
          <div className="mt-2 text-2xl font-black text-rose-600">{remindersCount}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Supplier & deal email checkpoints</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Inbound Leads</span>
            <span className="p-2 rounded-xl bg-amber-50 text-amber-600 text-base">⚡</span>
          </div>
          <div className="mt-2 text-2xl font-black text-amber-600">{leadsCount}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Verified buyers & requests</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Feed Items</span>
            <span className="p-2 rounded-xl bg-slate-100 text-slate-700 text-base">📋</span>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">{allItems.length}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Active logs & operational alerts</p>
        </div>
      </div>

      {/* Operational Follow-Up Highlights Section */}
      {operationalReminders.length > 0 && (
        <div className="rounded-2xl border-2 border-orange-200 bg-linear-to-r from-orange-50/80 via-amber-50/40 to-white p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 rounded-full bg-orange-500 animate-ping" />
              <h2 className="text-sm font-black uppercase tracking-wider text-orange-950">
                🔥 Priority Operational Follow-Up Watch
              </h2>
            </div>
            <span className="text-xs font-bold text-orange-700">
              {operationalReminders.length} Deals & Leads Ready
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {operationalReminders.map((op) => {
              const gmailUrl = buildNotificationGmailLink(op);
              return (
                <div
                  key={op.id}
                  className="rounded-xl border border-orange-200 bg-white p-3.5 shadow-2xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-orange-100 text-orange-800 border border-orange-200">
                        {op.title.includes("%") ? "High-Score Match" : "Lead Outreach"}
                      </span>
                      <span className="text-[10px] font-bold text-rose-600 uppercase">
                        Action Required
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-900 line-clamp-1">{op.title}</p>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{op.message}</p>
                  </div>

                  <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-100">
                    {op.action_url && (
                      <Link
                        href={op.action_url}
                        className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors"
                      >
                        Review &rarr;
                      </Link>
                    )}
                    <a
                      href={gmailUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 text-xs font-bold rounded-lg border border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors flex items-center gap-1"
                    >
                      <span>✉️</span>
                      <span>Gmail Outreach</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters & Control Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <span className="absolute left-3.5 top-2.5 text-slate-400 text-sm">🔍</span>
            <input
              type="text"
              placeholder="Search notifications by title, product, company, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          {/* Type Select & Status Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">All Types</option>
              <option value="reminder">Reminders (⏰)</option>
              <option value="lead">Inbound Leads (⚡)</option>
              <option value="match_sent">Match Deals (🎯)</option>
              <option value="new_request">Sourcing Requests (📥)</option>
              <option value="supplier_signup">Supplier Signups (🏭)</option>
              <option value="system">System Alerts (⚙️)</option>
            </select>

            <div className="flex items-center rounded-xl border border-slate-200 p-0.5 bg-slate-50 text-xs">
              {(["all", "unread", "read"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 font-semibold rounded-lg capitalize transition-colors ${
                    statusFilter === s
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors"
              >
                Mark All Read
              </button>
            )}
          </div>
        </div>

        {/* Batch Operations Bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between px-3 py-2 bg-orange-50 border border-orange-200 rounded-xl text-xs">
            <span className="font-bold text-orange-900">
              {selectedIds.size} notification{selectedIds.size > 1 ? "s" : ""} selected
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleBatchMarkRead}
                className="px-2.5 py-1 font-semibold rounded-lg bg-white border border-orange-300 text-orange-800 hover:bg-orange-100"
              >
                Mark as Read
              </button>
              <button
                type="button"
                onClick={handleBatchDelete}
                className="px-2.5 py-1 font-semibold rounded-lg bg-rose-600 text-white hover:bg-rose-700"
              >
                Delete Selected
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Notification List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="p-12 text-center">
            <span className="text-4xl block mb-2">📬</span>
            <p className="text-base font-bold text-slate-800">No notifications found</p>
            <p className="text-xs text-slate-400 mt-1">
              Try adjusting your search query or filter criteria.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredItems.map((n) => {
              const meta = TYPE_CONFIG[n.type] || TYPE_CONFIG.system;
              const isSelected = selectedIds.has(n.id);
              const gmailUrl = buildNotificationGmailLink(n);
              const hasEmail = Boolean(
                (n.data?.contact_email as string) ||
                (n.data?.email as string) ||
                (n.message?.includes("@"))
              );

              return (
                <div
                  key={n.id}
                  className={`p-4 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    !n.read ? "bg-orange-50/25" : "hover:bg-slate-50/70"
                  }`}
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* Checkbox for batch select */}
                    {!n.is_operational && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          setSelectedIds((prev) => {
                            const next = new Set(prev);
                            if (e.target.checked) next.add(n.id);
                            else next.delete(n.id);
                            return next;
                          });
                        }}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                      />
                    )}

                    {/* Badge Icon */}
                    <div
                      className={`h-9 w-9 rounded-xl flex items-center justify-center text-base shrink-0 border ${meta.badgeClass}`}
                    >
                      {meta.icon}
                    </div>

                    {/* Notification Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${meta.badgeClass}`}
                        >
                          {meta.label}
                        </span>

                        {n.priority === "urgent" && (
                          <span className="px-1.5 py-0.5 text-[10px] font-extrabold uppercase rounded bg-rose-600 text-white">
                            Urgent
                          </span>
                        )}

                        <span className="text-[11px] text-slate-400">
                          {formatDate(n.created_at)}
                        </span>
                      </div>

                      <p
                        className={`text-sm ${
                          !n.read ? "font-bold text-slate-900" : "font-semibold text-slate-800"
                        }`}
                      >
                        {n.title}
                      </p>

                      {n.message && (
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                          {n.message}
                        </p>
                      )}

                      {/* Metadata tags */}
                      {n.data && (
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {Boolean(n.data.company_name) && (
                            <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
                              🏢 {String(n.data.company_name)}
                            </span>
                          )}
                          {Boolean(n.data.contact_email) && (
                            <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
                              ✉️ {String(n.data.contact_email)}
                            </span>
                          )}
                          {Boolean(n.data.due_date) && (
                            <span className="text-[11px] px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 font-bold">
                              ⏰ Due: {formatDate(String(n.data.due_date))}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Right Side */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {/* 1-Click Gmail Follow-up */}
                    {hasEmail && (
                      <a
                        href={gmailUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-white hover:bg-orange-50 hover:text-orange-600 hover:border-orange-300 text-slate-700 shadow-2xs transition-colors flex items-center gap-1.5"
                        title="Open Gmail with pre-filled follow-up email"
                      >
                        <span>✉️</span>
                        <span>Gmail Follow-up</span>
                      </a>
                    )}

                    {/* Direct Review Link */}
                    {n.action_url && (
                      <Link
                        href={n.action_url}
                        className="px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-2xs transition-colors flex items-center gap-1"
                      >
                        <span>Review</span>
                        <span>&rarr;</span>
                      </Link>
                    )}

                    {/* Technical payload inspector */}
                    <button
                      type="button"
                      onClick={() => setInspectItem(n)}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      title="Inspect metadata"
                    >
                      🔍
                    </button>

                    {/* Mark read toggle */}
                    {!n.is_operational && !n.read && (
                      <button
                        type="button"
                        onClick={() => markRead(n.id)}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                        title="Mark as read"
                      >
                        ✓
                      </button>
                    )}

                    {/* Delete button */}
                    {!n.is_operational && (
                      <button
                        type="button"
                        onClick={() => deleteNotification(n.id)}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Delete notification"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Technical Inspector Modal */}
      {inspectItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Notification Payload Inspector</h3>
              <button
                type="button"
                onClick={() => setInspectItem(null)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p>
                <span className="font-bold text-slate-500">ID:</span> {inspectItem.id}
              </p>
              <p>
                <span className="font-bold text-slate-500">Type:</span> {inspectItem.type}
              </p>
              <p>
                <span className="font-bold text-slate-500">Title:</span> {inspectItem.title}
              </p>
              <p>
                <span className="font-bold text-slate-500">Created:</span> {formatDate(inspectItem.created_at)}
              </p>
              <div>
                <span className="font-bold text-slate-500 block mb-1">Payload JSON:</span>
                <pre className="p-3 rounded-xl bg-slate-900 text-slate-200 font-mono text-[11px] overflow-x-auto max-h-48">
                  {JSON.stringify(inspectItem.data || {}, null, 2)}
                </pre>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setInspectItem(null)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-900 text-white hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Custom Reminder Modal */}
      {showReminderModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleCreateReminderSubmit}
            className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">⏰</span>
                <h3 className="text-base font-bold text-slate-900">Schedule Follow-Up Reminder</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowReminderModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Reminder Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Follow up with supplier on chocolate buttons quote"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notes / Instructions</label>
                <textarea
                  rows={2}
                  placeholder="Additional context or required quote parameters..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as "normal" | "high" | "urgent")}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Contact Email (for 1-click Gmail)</label>
                <input
                  type="email"
                  placeholder="partner@supplier.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowReminderModal(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingReminder || !newTitle.trim()}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-orange-600 hover:bg-orange-700 text-white shadow-sm disabled:opacity-50"
              >
                {savingReminder ? "Saving..." : "Save Reminder"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
