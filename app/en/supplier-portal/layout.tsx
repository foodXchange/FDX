import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/supplier-portal/SignOutButton";
import ImpersonationBanner from "@/components/supplier-portal/ImpersonationBanner";
import { verifyImpersonation, IMPERSONATION_COOKIE } from "@/lib/impersonation";
import PortalNotificationBell from "@/components/PortalNotificationBell";

export default async function SupplierPortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const cookieStore = await cookies();
  const impersonation = await verifyImpersonation(cookieStore.get(IMPERSONATION_COOKIE)?.value);

  return (
    <main className="bg-slate-900 min-h-screen">
      {impersonation && <ImpersonationBanner targetLabel={impersonation.targetLabel} />}
      {user && (
        <header className="border-b border-slate-800 bg-slate-950/60 backdrop-blur-md sticky top-0 z-30">
          <div className="max-w-5xl mx-auto px-6 py-3.5 flex items-center justify-between flex-wrap gap-3">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 font-black text-xs flex items-center justify-center">
                FDX
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-white font-bold">FoodXchange</span>
                <span className="text-emerald-400 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                  Supplier Portal
                </span>
              </div>
            </Link>
            <nav className="flex items-center gap-4 text-xs sm:text-sm flex-wrap">
              <Link href="/en/supplier-portal" className="text-slate-300 hover:text-white font-medium transition">
                Dashboard
              </Link>
              <Link href="/en/supplier-portal/products" className="text-slate-300 hover:text-white transition">
                Products
              </Link>
              <Link href="/en/supplier-portal/opportunities" className="text-slate-300 hover:text-white transition">
                Opportunities
              </Link>
              <Link href="/en/supplier-portal/matches" className="text-slate-300 hover:text-white transition">
                Matches
              </Link>
              <Link href="/en/supplier-portal/analytics" className="text-slate-300 hover:text-white transition">
                Analytics
              </Link>
              <Link href="/en/guides/suppliers" className="text-emerald-400 hover:text-emerald-300 font-semibold transition">
                📘 Supplier Guide
              </Link>
              <Link href="/en/supplier-portal/profile" className="text-slate-300 hover:text-white transition">
                Profile
              </Link>
              <PortalNotificationBell apiPath="/api/supplier-portal/notifications" />
              <SignOutButton />
            </nav>
          </div>
        </header>
      )}
      {children}
    </main>
  );
}
