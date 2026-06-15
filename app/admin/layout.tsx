'use client';
import Link from "next/link";
import { usePathname } from "next/navigation";
import AdminNav from "@/components/admin/AdminNav";
import NotificationBell from "@/components/admin/NotificationBell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/admin/login";

  if (isLogin) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-56 flex-shrink-0 bg-slate-900 flex flex-col">
        <div className="px-5 py-4 border-b border-slate-800">
          <span className="text-white font-semibold text-sm">FoodXchange</span>
          <span className="text-slate-500 text-xs block">Admin</span>
        </div>
        <AdminNav />
        <div className="mt-auto px-3 py-4 border-t border-slate-800 space-y-1">
          <form action="/api/admin/logout" method="POST">
            <button
              type="submit"
              className="w-full text-left block px-3 py-2 text-xs text-slate-400 hover:text-red-400 transition-colors rounded-lg hover:bg-slate-800"
            >
              ⏻ Sign out
            </button>
          </form>
          <div className="border-t border-slate-800 my-1" />
          <Link
            href="/admin"
            className="block px-3 py-2 text-xs text-slate-400 hover:text-slate-200 transition-colors rounded-lg hover:bg-slate-800"
          >
            ⬡ Internal tools
          </Link>
          <Link
            href="/en"
            className="block px-3 py-2 text-xs text-slate-400 hover:text-slate-200 transition-colors rounded-lg hover:bg-slate-800"
          >
            ← Back to site
          </Link>
        </div>
      </aside>
      <div className="flex-1 min-w-0">
        <div className="sticky top-0 z-40 flex justify-end border-b border-slate-200 bg-white px-4 py-2">
          <NotificationBell />
        </div>
        {children}
      </div>
    </div>
  );
}
