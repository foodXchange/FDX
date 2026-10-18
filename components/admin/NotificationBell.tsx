"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AdminNotification, NotificationType } from "@/lib/notifications/types";
import { buildNotificationGmailLink } from "@/lib/notifications/gmailHelper";
import { playNotificationChime } from "@/lib/notifications/audioChime";

const POLL_INTERVAL_MS = 20_000;

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

type TabKey = "all" | "reminders" | "deals" | "unread";

export default function NotificationBell() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [operationalReminders, setOperationalReminders] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [toast, setToast] = useState<{ title: string; url?: string } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Quick Reminder Drawer State
  const [showAddReminder, setShowAddReminder] = useState(false);
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderDays, setReminderDays] = useState(1);
  const [reminderSaving, setReminderSaving] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const lastSeenIdRef = useRef<string | null>(null);
  const firstLoadRef = useRef(true);

  // Load sound preference
  useEffect(() => {
    const isMuted = localStorage.getItem("fdx_admin_sound_muted") === "true";
    setSoundEnabled(!isMuted);
  }, []);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem("fdx_admin_sound_muted", next ? "false" : "true");
    if (next) {
      playNotificationChime();
    }
  };

  const fetchNotifications = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const res = await fetch("/api/admin/notifications/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 12, include_operational: true }),
      });
      if (!res.ok) return;
      const json = await res.json();
      const items = (json.notifications ?? []) as AdminNotification[];
      const ops = (json.operational_reminders ?? []) as AdminNotification[];

      setNotifications(items);
      setOperationalReminders(ops);
      setUnreadCount(json.unread_count ?? 0);

      const newest = items[0];
      if (newest && newest.id !== lastSeenIdRef.current) {
        if (!firstLoadRef.current && !newest.read) {
          playNotificationChime();
          setToast({ title: newest.title, url: newest.action_url });
          setTimeout(() => setToast(null), 6000);
        }
        lastSeenIdRef.current = newest.id;
      }
      firstLoadRef.current = false;
    } catch {
      // transient fetch error
    } finally {
      if (isManual) setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(() => fetchNotifications(), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowAddReminder(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  async function markRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true, read_at: new Date().toISOString() } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      await fetch(`/api/admin/notifications/${id}/mark-read`, { method: "POST" });
    } catch {
      // optimistic update will reconcile
    }
  }

  async function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true, read_at: new Date().toISOString() })));
    setUnreadCount(0);
    try {
      await fetch("/api/admin/notifications/mark-all-read", { method: "POST" });
    } catch {
      // best-effort
    }
  }

  async function handleCreateReminder(e: React.FormEvent) {
    e.preventDefault();
    if (!reminderTitle.trim() || reminderSaving) return;

    setReminderSaving(true);
    try {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + reminderDays);

      const res = await fetch("/api/admin/notifications/create-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: reminderTitle.trim(),
          dueDate: dueDate.toISOString(),
          priority: "high",
        }),
      });

      if (res.ok) {
        setReminderTitle("");
        setShowAddReminder(false);
        fetchNotifications(true);
      }
    } catch {
      // error handled
    } finally {
      setReminderSaving(false);
    }
  }

  // Combine items for views
  const allCombined = [...operationalReminders, ...notifications];

  const filteredItems = allCombined.filter((n) => {
    if (activeTab === "unread") return !n.read;
    if (activeTab === "reminders") {
      return (
        n.type === "reminder" ||
        n.type === "follow_up" ||
        n.is_operational ||
        Boolean(n.data?.due_date)
      );
    }
    if (activeTab === "deals") {
      return (
        n.type === "lead" ||
        n.type === "new_request" ||
        n.type === "match_sent" ||
        n.type === "match_reply" ||
        n.type === "supplier_signup"
      );
    }
    return true;
  });

  const hasUrgent = allCombined.some((n) => !n.read && n.priority === "urgent");

  const getTypeMeta = (type: NotificationType | string) => {
    switch (type) {
      case "lead":
        return { icon: "⚡", label: "Lead", bg: "bg-amber-50 text-amber-700 border-amber-200" };
      case "follow_up":
      case "reminder":
        return { icon: "⏰", label: "Reminder", bg: "bg-rose-50 text-rose-700 border-rose-200" };
      case "match_sent":
      case "match_reply":
      case "match_message":
        return { icon: "🎯", label: "Deal", bg: "bg-indigo-50 text-indigo-700 border-indigo-200" };
      case "new_request":
        return { icon: "📥", label: "Request", bg: "bg-emerald-50 text-emerald-700 border-emerald-200" };
      case "supplier_signup":
        return { icon: "🏭", label: "Supplier", bg: "bg-purple-50 text-purple-700 border-purple-200" };
      case "qa_alert":
        return { icon: "🛡️", label: "QA Alert", bg: "bg-red-50 text-red-700 border-red-200" };
      default:
        return { icon: "🔔", label: "System", bg: "bg-slate-50 text-slate-700 border-slate-200" };
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all focus:outline-none focus:ring-2 focus:ring-orange-500/20"
        aria-label="Open notifications and operational reminders"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`h-5 w-5 ${hasUrgent ? "text-rose-500 animate-bounce" : ""}`}
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>

        {unreadCount > 0 && (
          <span
            className={`absolute -top-1 -right-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white shadow-xs ${
              hasUrgent ? "bg-rose-600 animate-pulse" : "bg-orange-500"
            }`}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Main Notification Center Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-96 sm:w-[440px] rounded-2xl border border-slate-200 bg-white shadow-2xl z-50 overflow-hidden flex flex-col max-h-[85vh]">
          {/* Header */}
          <div className="bg-slate-900 px-4 py-3.5 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight">Notification Center</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-full bg-orange-500 text-white">
                  {unreadCount} New
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={toggleSound}
                title={soundEnabled ? "Mute notification sound" : "Enable notification sound"}
                className={`p-1.5 rounded-lg border transition-colors ${
                  soundEnabled
                    ? "bg-slate-800 border-slate-700 text-slate-200 hover:text-white"
                    : "bg-slate-800/50 border-slate-700/50 text-slate-500 hover:text-slate-300"
                }`}
              >
                {soundEnabled ? "🔊" : "🔇"}
              </button>

              <button
                type="button"
                onClick={() => fetchNotifications(true)}
                title="Refresh notifications"
                className={`p-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white transition-colors ${
                  isRefreshing ? "animate-spin text-orange-400" : ""
                }`}
              >
                ↻
              </button>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="text-xs font-medium text-orange-400 hover:text-orange-300 transition-colors ml-1"
                >
                  Mark all read
                </button>
              )}
            </div>
          </div>

          {/* Quick Reminder Toggle Bar */}
          <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-700">Follow-Ups & Reminders</span>
            </div>
            <button
              type="button"
              onClick={() => setShowAddReminder((prev) => !prev)}
              className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
            >
              <span>{showAddReminder ? "✕ Close" : "+ Set Reminder"}</span>
            </button>
          </div>

          {/* Expandable Quick Reminder Form */}
          {showAddReminder && (
            <form onSubmit={handleCreateReminder} className="p-3 bg-amber-50/70 border-b border-amber-200 space-y-2">
              <p className="text-[11px] font-bold text-amber-900 uppercase tracking-wide">
                Create Operational Reminder
              </p>
              <input
                type="text"
                placeholder="e.g. Email Italian pasta supplier about quotation..."
                value={reminderTitle}
                onChange={(e) => setReminderTitle(e.target.value)}
                className="w-full text-xs px-3 py-1.5 rounded-lg border border-amber-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                autoFocus
              />
              <div className="flex items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-slate-600 font-medium">Due:</span>
                  {[
                    { label: "Tomorrow", days: 1 },
                    { label: "3 Days", days: 3 },
                    { label: "1 Week", days: 7 },
                  ].map((p) => (
                    <button
                      key={p.days}
                      type="button"
                      onClick={() => setReminderDays(p.days)}
                      className={`px-2 py-0.5 text-[10px] rounded font-semibold border ${
                        reminderDays === p.days
                          ? "bg-amber-600 text-white border-amber-600"
                          : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <button
                  type="submit"
                  disabled={reminderSaving || !reminderTitle.trim()}
                  className="px-3 py-1 text-xs font-bold rounded-lg bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50 transition-colors shadow-2xs"
                >
                  {reminderSaving ? "Saving..." : "Save Reminder"}
                </button>
              </div>
            </form>
          )}

          {/* Navigation Filter Tabs */}
          <div className="flex border-b border-slate-100 bg-slate-50/80 px-2 pt-1.5 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`px-3 py-2 font-semibold border-b-2 transition-colors ${
                activeTab === "all"
                  ? "border-orange-500 text-orange-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              All ({allCombined.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("reminders")}
              className={`px-3 py-2 font-semibold border-b-2 transition-colors flex items-center gap-1 ${
                activeTab === "reminders"
                  ? "border-orange-500 text-orange-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>⏰ Reminders</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 font-bold">
                {allCombined.filter((n) => n.type === "reminder" || n.type === "follow_up" || n.is_operational).length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("deals")}
              className={`px-3 py-2 font-semibold border-b-2 transition-colors ${
                activeTab === "deals"
                  ? "border-orange-500 text-orange-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              ⚡ Leads & Deals
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("unread")}
              className={`px-3 py-2 font-semibold border-b-2 transition-colors ${
                activeTab === "unread"
                  ? "border-orange-500 text-orange-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Notifications Scroll List */}
          <div className="overflow-y-auto flex-1 divide-y divide-slate-100 max-h-[380px]">
            {filteredItems.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <span className="text-3xl block mb-2">🎉</span>
                <p className="text-sm font-semibold text-slate-700">All caught up!</p>
                <p className="text-xs text-slate-400 mt-1">No alerts or reminders in this category right now.</p>
              </div>
            ) : (
              filteredItems.map((n) => {
                const meta = getTypeMeta(n.type);
                const gmailUrl = buildNotificationGmailLink(n);
                const hasEmail = Boolean(
                  (n.data?.contact_email as string) ||
                  (n.data?.email as string) ||
                  (n.message?.includes("@"))
                );

                return (
                  <div
                    key={n.id}
                    className={`p-3.5 transition-colors relative group hover:bg-slate-50/80 ${
                      !n.read ? "bg-orange-50/30" : "bg-white"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Left Badge Icon */}
                      <div
                        className={`h-8 w-8 rounded-lg flex items-center justify-center text-sm shrink-0 border ${meta.bg}`}
                      >
                        {meta.icon}
                      </div>

                      {/* Content Area */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {meta.label}
                          </span>
                          <span className="text-[11px] text-slate-400 shrink-0">
                            {timeAgo(n.created_at)}
                          </span>
                        </div>

                        <p className={`text-xs ${!n.read ? "font-bold text-slate-900" : "font-medium text-slate-700"}`}>
                          {n.title}
                        </p>

                        {n.message && (
                          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                            {n.message}
                          </p>
                        )}

                        {/* Interactive Action Bar */}
                        <div className="flex items-center gap-2 mt-2 pt-1 border-t border-slate-100/80">
                          {n.action_url && (
                            <button
                              type="button"
                              onClick={() => {
                                if (!n.read && !n.is_operational) markRead(n.id);
                                setOpen(false);
                                router.push(n.action_url!);
                              }}
                              className="px-2.5 py-1 text-[11px] font-bold rounded-md bg-slate-900 hover:bg-slate-800 text-white transition-colors"
                            >
                              Review &rarr;
                            </button>
                          )}

                          {/* 1-Click Gmail Follow-Up Link */}
                          {hasEmail && (
                            <a
                              href={gmailUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 text-[11px] font-semibold rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-300 transition-colors flex items-center gap-1 shadow-2xs"
                              title="Open pre-filled draft in Gmail"
                            >
                              <span>✉️</span>
                              <span>Gmail Follow-up</span>
                            </a>
                          )}

                          {!n.read && !n.is_operational && (
                            <button
                              type="button"
                              onClick={() => markRead(n.id)}
                              className="text-[11px] font-medium text-slate-400 hover:text-slate-700 transition-colors ml-auto"
                            >
                              Dismiss
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Bar */}
          <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live sync active
            </span>

            <Link
              href="/admin/notifications"
              onClick={() => setOpen(false)}
              className="font-bold text-orange-600 hover:text-orange-700 hover:underline flex items-center gap-1"
            >
              <span>Full Notification & Reminder Hub</span>
              <span>&rarr;</span>
            </Link>
          </div>
        </div>
      )}

      {/* Slide-in Live Alert Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 rounded-xl bg-slate-900 border border-slate-800 px-4 py-3 text-white shadow-2xl z-50 max-w-sm flex items-start gap-3 animate-in fade-in slide-in-from-bottom-5">
          <span className="text-xl">🔔</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-orange-400 uppercase tracking-wider">New Platform Alert</p>
            <p className="text-xs font-medium text-slate-200 mt-0.5">{toast.title}</p>
            {toast.url && (
              <button
                type="button"
                onClick={() => {
                  setToast(null);
                  router.push(toast.url!);
                }}
                className="mt-2 text-xs font-bold text-white bg-orange-600 hover:bg-orange-500 px-2.5 py-1 rounded-md transition-colors"
              >
                View Details &rarr;
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-white text-xs"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
