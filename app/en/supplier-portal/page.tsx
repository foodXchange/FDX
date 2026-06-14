import Link from "next/link";
import { redirect } from "next/navigation";
import { getSupplierContext } from "@/lib/supabase/getSupplierContext";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import StatusBadge from "@/components/supplier-portal/StatusBadge";
import NoCompanyState from "@/components/supplier-portal/NoCompanyState";
import OnboardingChecklist from "@/components/supplier-portal/OnboardingChecklist";
import { logEvent } from "@/lib/events/logEvent";

const SENT_STATUSES = ["sent", "responded", "closed"];

export default async function SupplierPortalDashboardPage() {
  const ctx = await getSupplierContext();
  if (!ctx) redirect("/en/supplier-portal/login");
  if (!ctx.supplierId) return <NoCompanyState />;

  const supplierId = ctx.supplierId;

  const [{ data: supplier }, productsTotal, productsPublished, matchesTotal, matchesOpen] =
    await Promise.all([
      supabaseAdmin
        .from("supplier_offerings")
        .select("company_name, status, verified, product_description, onboarding_completed_at")
        .eq("id", supplierId)
        .maybeSingle(),
      supabaseAdmin
        .from("supplier_products")
        .select("id", { count: "exact", head: true })
        .eq("supplier_id", supplierId),
      supabaseAdmin
        .from("supplier_products")
        .select("id", { count: "exact", head: true })
        .eq("supplier_id", supplierId)
        .eq("is_published", true),
      supabaseAdmin
        .from("sourcing_matches")
        .select("id", { count: "exact", head: true })
        .eq("supplier_id", supplierId),
      supabaseAdmin
        .from("sourcing_matches")
        .select("id", { count: "exact", head: true })
        .eq("supplier_id", supplierId)
        .in("status", SENT_STATUSES),
    ]);

  const companyName = supplier?.company_name ?? "your company";
  const productCount = productsTotal.count ?? 0;
  const publishedCount = productsPublished.count ?? 0;
  const matchCount = matchesTotal.count ?? 0;
  const openCount = matchesOpen.count ?? 0;

  const status = supplier?.status ?? null;
  const onboardingCompletedAt = supplier?.onboarding_completed_at ?? null;
  const showOnboarding = (status === "approved" || status === "active") && !onboardingCompletedAt;

  const profileComplete = Boolean(
    (supplier?.product_description as string | null)?.trim() && ctx.profile?.phone?.trim()
  );

  if (showOnboarding && productCount > 0 && publishedCount > 0 && profileComplete) {
    void supabaseAdmin
      .from("supplier_offerings")
      .update({ onboarding_completed_at: new Date().toISOString() })
      .eq("id", supplierId);
    void logEvent(ctx.user.id, "supplier", "profile_completed", "supplier", supplierId, {});
  }

  return (
    <section className="px-6 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Welcome back, {companyName}</h1>
            <p className="text-sm text-slate-400 mt-1">Here&apos;s how your listing is doing.</p>
          </div>
          <StatusBadge status={supplier?.status ?? null} />
        </div>

        {showOnboarding && (
          <OnboardingChecklist
            productCount={productCount}
            publishedCount={publishedCount}
            profileComplete={profileComplete}
          />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <Link href="/en/supplier-portal/products" className="dark-card p-5 hover:border-orange-400/40 transition block">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Products listed</p>
            <p className="text-2xl font-bold text-white">
              {productCount}
              <span className="text-sm text-slate-400 font-normal"> / {publishedCount} published</span>
            </p>
          </Link>
          <Link href="/en/supplier-portal/matches" className="dark-card p-5 hover:border-orange-400/40 transition block">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Open opportunities</p>
            <p className="text-2xl font-bold text-white">{openCount}</p>
          </Link>
          <Link href="/en/supplier-portal/analytics" className="dark-card p-5 hover:border-orange-400/40 transition block">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Total matches</p>
            <p className="text-2xl font-bold text-white">{matchCount}</p>
          </Link>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/en/supplier-portal/products" className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-md text-sm font-semibold transition">
            Manage products
          </Link>
          <Link href="/en/supplier-portal/matches" className="btn-ghost px-5 py-2.5 rounded-md text-sm font-medium">
            View matches
          </Link>
          <Link href="/en/supplier-portal/profile" className="btn-ghost px-5 py-2.5 rounded-md text-sm font-medium">
            Edit profile
          </Link>
        </div>
      </div>
    </section>
  );
}
