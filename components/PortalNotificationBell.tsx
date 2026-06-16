"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

interface PortalNotification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  timestamp: string;
  actionUrl: string;
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function PortalNotificationBell({ apiPath }: { apiPath: string }) {
  const [notifications, setNotifications] = useState<PortalNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch(apiPath);
      if (!res.ok) return;
      const json = await res.json();
      setNotifications((json.notifications ?? []) as PortalNotification[]);
    } catch {
      // ignore transient errors
    }
  }, [apiPath]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30_000);
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

  function handleOpen() {
    setOpen((v) => !v);
    if (!open) {
      setSeenIds(new Set(notifications.map((n) => n.id)));
    }
  }

  const unseenCount = notifications.filter((n) => !seenIds.has(n.id)).length;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={handleOpen}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        aria-label="Notifications"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
          <path d="M12 2a6 6 0 0 0-6 6v3.09c0 .85-.31 1.67-.87 2.3L4 14.5c-.6.67-.13 1.74.77 1.74h14.46c.9 0 1.37-1.07.77-1.74l-1.13-1.11a3.5 3.5 0 0 1-.87-2.3V8a6 6 0 0 0-6-6Z" />
          <path d="M9.5 19a2.5 2.5 0 0 0 5 0h-5Z" />
        </svg>
        {unseenCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-semibold text-white">
            {unseenCount > 9 ? "9+" : unseenCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-700 bg-slate-900 shadow-2xl z-50">
          <div className="px-4 py-3 border-b border-slate-800">
            <span className="text-sm font-semibold text-slate-100">Activity</span>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-800">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-500">No notifications yet</p>
            ) : (
              notifications.map((n) => {
                const unseen = !seenIds.has(n.id);
                return (
                  <Link
                    key={n.id}
                    href={n.actionUrl}
                    onClick={() => setOpen(false)}
                    className={`block px-4 py-3 hover:bg-slate-800 transition-colors ${unseen ? "bg-orange-500/5" : ""}`}
                  >
                    <div className="flex items-start gap-2">
                      {unseen && <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-orange-500" />}
                      <div className={unseen ? "" : "pl-4"}>
                        <p className="text-sm font-medium text-slate-100">{n.title}</p>
                        {n.message && (
                          <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{n.message}</p>
                        )}
                        <p className="text-[11px] text-slate-500 mt-1">{timeAgo(n.timestamp)}</p>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
