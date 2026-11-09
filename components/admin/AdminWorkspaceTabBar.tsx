"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export interface AdminTabItem {
  id: string;
  title: string;
  path: string;
  icon: string;
  pinned?: boolean;
}

const STORAGE_KEY = "fdx_admin_workspace_tabs_v1";

const DEFAULT_TABS: AdminTabItem[] = [
  { id: "outreach", title: "Email & Outreach Hub", path: "/admin/outreach", icon: "✉️", pinned: true },
  { id: "requests", title: "Sourcing Intake & Registry", path: "/admin/requests", icon: "✨" },
  { id: "scraper", title: "Web Scraper Console", path: "/admin/scraper", icon: "🕷️" },
  { id: "pipeline", title: "Deal Pipeline", path: "/admin/pipeline", icon: "🎯" },
];

function getTabDetailsForPath(pathname: string, search: string): { title: string; icon: string; id: string } {
  const fullPath = search ? `${pathname}?${search}` : pathname;

  if (pathname.startsWith("/admin/outreach")) {
    return { title: "Email & Outreach", icon: "✉️", id: "outreach" };
  }
  if (pathname.startsWith("/admin/scraper")) {
    return { title: "Web Scraper", icon: "🕷️", id: "scraper" };
  }
  if (pathname.startsWith("/admin/requests/")) {
    const reqId = pathname.replace("/admin/requests/", "");
    const tag = reqId.replace(/-/g, "").slice(0, 8).toUpperCase();
    return { title: `REQ-${tag}`, icon: "📋", id: `req_${tag}` };
  }
  if (pathname.startsWith("/admin/requests")) {
    if (search.includes("registry")) {
      return { title: "Requests Registry", icon: "📋", id: "requests_registry" };
    }
    return { title: "Sourcing Intake", icon: "✨", id: "requests" };
  }
  if (pathname.startsWith("/admin/pipeline")) {
    return { title: "Deal Pipeline", icon: "🎯", id: "pipeline" };
  }
  if (pathname.startsWith("/admin/data-quality")) {
    return { title: "Data Quality", icon: "🏷️", id: "data_quality" };
  }
  if (pathname.startsWith("/admin/analytics")) {
    return { title: "Intelligence", icon: "📊", id: "analytics" };
  }
  if (pathname.startsWith("/admin/finance")) {
    return { title: "Treasury & P&L", icon: "💰", id: "finance" };
  }
  if (pathname.startsWith("/admin/docs")) {
    return { title: "SOPs & Docs", icon: "📚", id: "docs" };
  }
  if (pathname.startsWith("/admin/ecosystem")) {
    return { title: "Trade Partners", icon: "🤝", id: "ecosystem" };
  }
  if (pathname === "/admin") {
    return { title: "Mission Control", icon: "🏠", id: "mission_control" };
  }

  const clean = pathname.replace("/admin/", "").replace(/-/g, " ");
  return {
    title: clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : "Desk",
    icon: "🗂️",
    id: pathname.replace(/\//g, "_"),
  };
}

export default function AdminWorkspaceTabBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [tabs, setTabs] = useState<AdminTabItem[]>(DEFAULT_TABS);
  const [mounted, setMounted] = useState(false);

  const currentSearch = searchParams?.toString() || "";
  const currentFullPath = currentSearch ? `${pathname}?${currentSearch}` : pathname;

  // 1. Load tabs from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTabs(parsed);
        }
      }
    } catch {
      // ignore
    }
    setMounted(true);
  }, []);

  // 2. Automatically register current active page into tabs if not present
  useEffect(() => {
    if (!mounted || !pathname.startsWith("/admin") || pathname === "/admin/login") return;

    setTabs((prev) => {
      const details = getTabDetailsForPath(pathname, currentSearch);
      const existingIdx = prev.findIndex(
        (t) => t.path === currentFullPath || t.id === details.id
      );

      let updated: AdminTabItem[];
      if (existingIdx >= 0) {
        // Update path if changed (e.g. search query update)
        updated = prev.map((t, i) =>
          i === existingIdx ? { ...t, path: currentFullPath, title: details.title } : t
        );
      } else {
        // Add new tab
        const newTab: AdminTabItem = {
          id: details.id,
          title: details.title,
          path: currentFullPath,
          icon: details.icon,
        };
        updated = [...prev, newTab];
      }

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, [pathname, currentSearch, currentFullPath, mounted]);

  const saveTabs = (newTabs: AdminTabItem[]) => {
    setTabs(newTabs);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newTabs));
    } catch {}
  };

  const handleCloseTab = (e: React.MouseEvent, tabId: string) => {
    e.preventDefault();
    e.stopPropagation();

    const remaining = tabs.filter((t) => t.id !== tabId);
    if (remaining.length === 0) {
      remaining.push(DEFAULT_TABS[0]);
    }
    saveTabs(remaining);

    // If closing currently active tab, switch to adjacent tab
    const isActive = tabs.find((t) => t.id === tabId)?.path === currentFullPath;
    if (isActive) {
      const nextTab = remaining[remaining.length - 1];
      startTransition(() => {
        router.push(nextTab.path);
      });
    }
  };

  const handleTogglePin = (e: React.MouseEvent, tabId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const updated = tabs.map((t) =>
      t.id === tabId ? { ...t, pinned: !t.pinned } : t
    );
    saveTabs(updated);
  };

  const handleAddDefaultTab = (desk: { title: string; path: string; icon: string; id: string }) => {
    if (!tabs.some((t) => t.id === desk.id)) {
      saveTabs([...tabs, desk]);
    }
    startTransition(() => {
      router.push(desk.path);
    });
  };

  if (!mounted || pathname === "/admin/login") return null;

  return (
    <div className="w-full bg-slate-900 border-b border-slate-800 flex items-center justify-between px-3 py-1 select-none overflow-hidden shrink-0 z-20">
      {/* Scrollable Tabs Row */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 max-w-[85vw] sm:max-w-none">
        {tabs.map((tab) => {
          const isActive =
            pathname === tab.path ||
            currentFullPath === tab.path ||
            (tab.path !== "/admin" && pathname.startsWith(tab.path.split("?")[0]));

          return (
            <div
              key={tab.id}
              className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border shrink-0 ${
                isActive
                  ? "bg-slate-800 text-amber-300 border-amber-400/40 shadow-xs ring-1 ring-amber-400/20"
                  : "bg-slate-950/60 text-slate-400 border-slate-800 hover:bg-slate-800/70 hover:text-slate-200"
              }`}
              onClick={() => {
                if (!isActive) {
                  startTransition(() => {
                    router.push(tab.path);
                  });
                }
              }}
              title={tab.title}
            >
              <span className="text-sm shrink-0">{tab.icon}</span>
              <span className="truncate max-w-[140px] tracking-tight">{tab.title}</span>

              {/* Pin Indicator / Action */}
              {tab.pinned ? (
                <button
                  type="button"
                  onClick={(e) => handleTogglePin(e, tab.id)}
                  className="text-[10px] text-amber-400 opacity-60 hover:opacity-100"
                  title="Pinned tab"
                >
                  📌
                </button>
              ) : (
                <button
                  type="button"
                  onClick={(e) => handleTogglePin(e, tab.id)}
                  className="text-[10px] text-slate-500 opacity-0 group-hover:opacity-100 hover:text-slate-300"
                  title="Pin this tab"
                >
                  📍
                </button>
              )}

              {/* Close Button (if more than 1 tab or unpinned) */}
              {!tab.pinned && tabs.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => handleCloseTab(e, tab.id)}
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] text-slate-400 hover:bg-slate-700 hover:text-white transition-colors ml-0.5"
                  title="Close tab"
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick Launch Shortcuts dropdown */}
      <div className="flex items-center gap-1 shrink-0 ml-2">
        <div className="hidden md:flex items-center gap-1">
          {!tabs.some((t) => t.id === "scraper") && (
            <button
              type="button"
              onClick={() =>
                handleAddDefaultTab({
                  id: "scraper",
                  title: "Web Scraper",
                  path: "/admin/scraper",
                  icon: "🕷️",
                })
              }
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold border border-slate-700 flex items-center gap-1 transition"
              title="Add Scraper tab"
            >
              <span>+ 🕷️ Scraper</span>
            </button>
          )}

          {!tabs.some((t) => t.id === "outreach") && (
            <button
              type="button"
              onClick={() =>
                handleAddDefaultTab({
                  id: "outreach",
                  title: "Email Outreach",
                  path: "/admin/outreach",
                  icon: "✉️",
                })
              }
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold border border-slate-700 flex items-center gap-1 transition"
              title="Add Outreach Hub tab"
            >
              <span>+ ✉️ Outreach</span>
            </button>
          )}
        </div>

        {/* New Browser Tab Duplicate Shortcut */}
        <button
          type="button"
          onClick={() => window.open(currentFullPath, "_blank")}
          className="p-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700/80 text-[11px] font-semibold transition"
          title="Open current workspace in a new browser window/tab"
        >
          🗗 Pop-Out ↗
        </button>
      </div>
    </div>
  );
}
