'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AdminNav from "@/components/admin/AdminNav";
import NotificationBell from "@/components/admin/NotificationBell";
import AdminUserMenu from "@/components/admin/AdminUserMenu";
import AdminLocaleSwitcher from "@/components/admin/AdminLocaleSwitcher";
import RoleAcademyModal from "@/components/admin/RoleAcademyModal";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/admin/login";

  // Collapsible sidebar state with localStorage persistence
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("fdx_admin_sidebar_collapsed");
      if (saved !== null) {
        setIsCollapsed(saved === "true");
      }
    } catch {
      // ignore
    }
  }, []);

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("fdx_admin_sidebar_collapsed", String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  if (isLogin) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-slate-50/70 text-slate-800">
      {/* Sleek Dark Admin Sidebar with Collapse Support */}
      <aside
        className={`${
          isCollapsed ? "w-16" : "w-60"
        } flex-shrink-0 bg-slate-950 border-r border-slate-900 flex flex-col z-30 shadow-md transition-all duration-300 ease-in-out`}
      >
        {/* Brand Header */}
        <div className="px-3.5 py-4 border-b border-slate-800/80 flex items-center justify-between">
          {!isCollapsed ? (
            <Link href="/admin" className="flex items-center gap-2.5 group overflow-hidden">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white text-xs font-black shadow-xs shrink-0">
                FDX
              </div>
              <div className="truncate">
                <span className="text-white font-bold text-sm tracking-tight block leading-tight group-hover:text-orange-400 transition-colors truncate">
                  FoodXchange
                </span>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block truncate">
                  Admin Console
                </span>
              </div>
            </Link>
          ) : (
            <Link href="/admin" className="mx-auto" title="FoodXchange Admin">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white text-xs font-black shadow-xs">
                FDX
              </div>
            </Link>
          )}

          {!isCollapsed && (
            <button
              type="button"
              onClick={toggleSidebar}
              title="Collapse sidebar (maximize workspace)"
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          )}
        </div>

        {/* Collapsed expansion button when minimized */}
        {isCollapsed && (
          <div className="py-2 border-b border-slate-900 flex justify-center">
            <button
              type="button"
              onClick={toggleSidebar}
              title="Expand sidebar"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}

        {/* Navigation Links */}
        <AdminNav collapsed={isCollapsed} />

        {/* Sidebar Footer Controls */}
        <div className="mt-auto px-2 py-3 border-t border-slate-800/80 space-y-1 bg-slate-950/80">
          <Link
            href="/en"
            target="_blank"
            rel="noreferrer"
            title={isCollapsed ? "View Live Site" : undefined}
            className={`flex items-center ${
              isCollapsed ? "justify-center px-2 py-1.5" : "justify-between px-3 py-1.5"
            } text-xs text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-900`}
          >
            {!isCollapsed && <span>View Live Site</span>}
            <span className="text-xs">↗</span>
          </Link>

          <form action="/api/admin/logout" method="POST">
            <button
              type="submit"
              title={isCollapsed ? "Sign Out" : undefined}
              className={`w-full flex items-center ${
                isCollapsed ? "justify-center px-2 py-1.5" : "gap-2 px-3 py-1.5 text-left"
              } text-xs text-slate-400 hover:text-rose-400 transition-colors rounded-lg hover:bg-slate-900 cursor-pointer`}
            >
              <span className="text-xs">⏻</span>
              {!isCollapsed && <span>Sign Out</span>}
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content Pane */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Operational Header */}
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200/80 bg-white/95 backdrop-blur-xs px-4 sm:px-6 py-2.5 shadow-2xs">
          <div className="flex items-center gap-2.5 text-xs">
            {/* Quick sidebar toggle button in top bar if collapsed */}
            {isCollapsed && (
              <button
                type="button"
                onClick={toggleSidebar}
                title="Expand sidebar"
                className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer mr-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
            <span className="text-slate-400 font-medium">Console</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-700 font-bold capitalize truncate">
              {pathname === "/admin"
                ? "Mission Control"
                : pathname.replace("/admin/", "").replace("/en/admin/", "").replace(/-/g, " ")}
            </span>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="hidden lg:flex items-center gap-1.5">
              <Link
                href="/admin/docs"
                className="px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-200 bg-white text-slate-700 hover:border-orange-300 hover:text-orange-600 transition-colors shadow-2xs"
              >
                📚 SOPs & Docs
              </Link>
              <Link
                href="/admin/analytics"
                className="px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-200 bg-white text-slate-700 hover:border-orange-300 hover:text-orange-600 transition-colors shadow-2xs"
              >
                📊 Intelligence
              </Link>
              <Link
                href="/admin/ecosystem"
                className="px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-200 bg-white text-slate-700 hover:border-orange-300 hover:text-orange-600 transition-colors shadow-2xs"
              >
                🤝 Trade Partners
              </Link>
              <Link
                href="/admin/pipeline"
                className="px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-200 bg-white text-slate-700 hover:border-orange-300 hover:text-orange-600 transition-colors shadow-2xs"
              >
                🎯 Pipeline
              </Link>
              <Link
                href="/admin/data-quality"
                className="px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-200 bg-white text-slate-700 hover:border-orange-300 hover:text-orange-600 transition-colors shadow-2xs"
              >
                🏷️ Data Quality
              </Link>
              <Link
                href="/admin/requests"
                className="px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-200 bg-white text-slate-700 hover:border-orange-300 hover:text-orange-600 transition-colors shadow-2xs"
              >
                📥 Requests
              </Link>
            </div>

            <div className="h-4 w-px bg-slate-200 hidden md:block" />

            <RoleAcademyModal />

            <AdminLocaleSwitcher />

            <NotificationBell />

            <AdminUserMenu />
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
