"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { AdminNotification } from "@/lib/notifications/types";

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

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastSeenIdRef = useRef<string | null>(null);
  const firstLoadRef = useRef(true);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notifications/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 5 }),
      });
      if (!res.ok) return;
      const json = await res.json();
      const items = (json.notifications ?? []) as AdminNotification[];
      setNotifications(items);
      setUnreadCount(json.unread_count ?? 0);

      const newest = items[0];
      if (newest && newest.id !== lastSeenIdRef.current) {
        if (!firstLoadRef.current && !newest.read) {
          setToast(`🔔 ${newest.title}`);
          setTimeout(() => setToast(null), 5000);
        }
        lastSeenIdRef.current = newest.id;
      }
      firstLoadRef.current = false;
    } catch {
      // ignore transient fetch errors
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
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
      // best-effort; next poll will reconcile
    }
  }

  async function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true, read_at: new Date().toISOString() })));
    setUnreadCount(0);
    try {
      await fetch("/api/admin/notifications/mark-all-read", { method: "POST" });
    } catch {
      // best-effort; next poll will reconcile
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
        aria-label="Notifications"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
          <path d="M12 2a6 6 0 0 0-6 6v3.09c0 .85-.31 1.67-.87 2.3L4 14.5c-.6.67-.13 1.74.77 1.74h14.46c.9 0 1.37-1.07.77-1.74l-1.13-1.11a3.5 3.5 0 0 1-.87-2.3V8a6 6 0 0 0-6-6Z" />
          <path d="M9.5 19a2.5 2.5 0 0 0 5 0h-5Z" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-lg z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="text-sm font-semibold text-slate-800">Notifications</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs font-medium text-orange-600 hover:text-orange-700"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-400">No notifications yet</p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => !n.read && markRead(n.id)}
                  className={`block w-full text-left px-4 py-3 transition-colors hover:bg-slate-50 ${
                    n.read ? "" : "bg-orange-50/50"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!n.read && <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-orange-500" />}
                    <div className={n.read ? "pl-4" : ""}>
                      <p className="text-sm font-medium text-slate-800">{n.title}</p>
                      {n.message && (
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                      )}
                      <p className="text-[11px] text-slate-400 mt-1">{timeAgo(n.created_at)}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="px-4 py-2 border-t border-slate-100">
            <Link
              href="/en/admin/notifications"
              onClick={() => setOpen(false)}
              className="block text-center text-xs font-medium text-slate-600 hover:text-slate-900 py-1"
            >
              View all
            </Link>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 rounded-lg bg-slate-900 px-4 py-3 text-sm text-white shadow-lg z-50 max-w-xs">
          {toast}
        </div>
      )}
    </div>
  );
}
