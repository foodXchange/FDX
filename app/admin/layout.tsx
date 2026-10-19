'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import AdminNav from "@/components/admin/AdminNav";
import NotificationBell from "@/components/admin/NotificationBell";
import AdminUserMenu from "@/components/admin/AdminUserMenu";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/admin/login";

  if (isLogin) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-slate-50/70 text-slate-800">
      {/* Sleek Dark Admin Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-slate-950 border-r border-slate-900 flex flex-col z-30 shadow-md">
        {/* Brand Header */}
        <div className="px-5 py-4.5 border-b border-slate-800/80 flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white text-xs font-black shadow-xs">
              FDX
            </div>
            <div>
              <span className="text-white font-bold text-sm tracking-tight block leading-tight group-hover:text-orange-400 transition-colors">
                FoodXchange
              </span>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block">
                Admin Console
              </span>
            </div>
          </Link>
          <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500/50" title="System Online" />
        </div>

        {/* Navigation Links */}
        <AdminNav />

        {/* Sidebar Footer Controls */}
        <div className="mt-auto px-3 py-3 border-t border-slate-800/80 space-y-1 bg-slate-950/80">
          <Link
            href="/en"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-900"
          >
            <span>View Live Site</span>
            <span className="text-[10px]">↗</span>
          </Link>

          <form action="/api/admin/logout" method="POST">
            <button
              type="submit"
              className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-xs text-slate-400 hover:text-rose-400 transition-colors rounded-lg hover:bg-slate-900 cursor-pointer"
            >
              <span>⏻</span>
              <span>Sign Out</span>
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content Pane */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Operational Header */}
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200/80 bg-white/95 backdrop-blur-xs px-6 py-2.5 shadow-2xs">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium">Console</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-700 font-bold capitalize">
              {pathname === "/admin"
                ? "Mission Control"
                : pathname.replace("/admin/", "").replace("/en/admin/", "").replace(/-/g, " ")}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-1.5">
              <Link
                href="/admin/analytics"
                className="px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-200 bg-white text-slate-700 hover:border-orange-300 hover:text-orange-600 transition-colors shadow-2xs"
              >
                📊 Intelligence
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
