import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/supplier-portal/SignOutButton";
import ImpersonationBanner from "@/components/supplier-portal/ImpersonationBanner";
import { verifyImpersonation, IMPERSONATION_COOKIE } from "@/lib/impersonation";

export default async function SupplierPortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const cookieStore = await cookies();
  const impersonation = await verifyImpersonation(cookieStore.get(IMPERSONATION_COOKIE)?.value);

  return (
    <main className="bg-slate-900 min-h-screen">
      {impersonation && <ImpersonationBanner targetLabel={impersonation.targetLabel} />}
      {user && (
        <header className="border-b border-slate-800">
          <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between flex-wrap gap-3">
            <Link href="/" className="flex items-baseline gap-2">
              <span className="text-white font-semibold">FoodXchange</span>
              <span className="text-slate-400 text-sm">Supplier Portal</span>
            </Link>
            <nav className="flex items-center gap-5 text-sm">
              <Link href="/en/supplier-portal" className="text-slate-300 hover:text-white transition">
                Dashboard
              </Link>
              <Link href="/en/supplier-portal/products" className="text-slate-300 hover:text-white transition">
                Products
              </Link>
              <Link href="/en/supplier-portal/matches" className="text-slate-300 hover:text-white transition">
                Matches
              </Link>
              <Link href="/en/supplier-portal/analytics" className="text-slate-300 hover:text-white transition">
                Analytics
              </Link>
              <Link href="/en/supplier-portal/profile" className="text-slate-300 hover:text-white transition">
                Profile
              </Link>
              <Link href="/en/help" className="text-slate-300 hover:text-white transition">
                Help &rarr;
              </Link>
              <SignOutButton />
            </nav>
          </div>
        </header>
      )}
      {children}
    </main>
  );
}
