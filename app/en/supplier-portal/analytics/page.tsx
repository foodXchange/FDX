import { redirect } from "next/navigation";
import { getSupplierContext } from "@/lib/supabase/getSupplierContext";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import NoCompanyState from "@/components/supplier-portal/NoCompanyState";

const VISIBLE_STATUSES = ["sent", "responded", "closed"];

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending review",
  approved: "Approved",
  rejected: "Rejected",
  sent: "Sent to you",
  responded: "You responded",
  closed: "Closed",
};

const STATUS_ORDER = ["pending", "approved", "rejected", "sent", "responded", "closed"];

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="dark-card p-5">
      <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

export default async function SupplierPortalAnalyticsPage() {
  const ctx = await getSupplierContext();
  if (!ctx) redirect("/en/supplier-portal/login");
  if (!ctx.supplierId) return <NoCompanyState />;

  const [{ data: products }, { data: matches }] = await Promise.all([
    supabaseAdmin
      .from("supplier_products")
      .select("is_published, certifications")
      .eq("supplier_id", ctx.supplierId),
    supabaseAdmin
      .from("sourcing_matches")
      .select("status, match_score")
      .eq("supplier_id", ctx.supplierId),
  ]);

  const productsList = products ?? [];
  const totalProducts = productsList.length;
  const publishedProducts = productsList.filter((p) => p.is_published).length;
  const certifiedProducts = productsList.filter((p) => ((p.certifications as string[] | null) ?? []).length > 0).length;

  const matchesList = matches ?? [];
  const statusCounts: Record<string, number> = {};
  for (const m of matchesList) {
    const status = (m.status as string | null) ?? "pending";
    statusCounts[status] = (statusCounts[status] ?? 0) + 1;
  }

  const visibleScores = matchesList
    .filter((m) => VISIBLE_STATUSES.includes((m.status as string | null) ?? ""))
    .map((m) => (m.match_score as number | null) ?? 0);

  const totalOpportunities = visibleScores.length;
  const respondedCount = statusCounts["responded"] ?? 0;
  const avgScore =
    visibleScores.length > 0 ? Math.round(visibleScores.reduce((a, b) => a + b, 0) / visibleScores.length) : null;

  const totalMatches = matchesList.length;

  return (
    <section className="px-6 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-sm text-slate-400 mt-1">How your listing is performing.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <StatCard label="Products listed" value={totalProducts} />
          <StatCard label="Published" value={publishedProducts} />
          <StatCard label="With certifications" value={certifiedProducts} />
          <StatCard label="Total opportunities" value={totalOpportunities} />
          <StatCard label="Responded" value={respondedCount} />
          <StatCard label="Avg. match score" value={avgScore !== null ? `${avgScore}` : "—"} />
        </div>

        <h2 className="text-lg font-semibold text-white mb-4">Match status breakdown</h2>
        {totalMatches === 0 ? (
          <div className="dark-card p-8 text-center text-sm text-slate-400">
            No matches yet — once buyers are matched to your products, they&apos;ll show up here.
          </div>
        ) : (
          <div className="dark-card p-5 space-y-3">
            {STATUS_ORDER.filter((s) => statusCounts[s]).map((s) => {
              const count = statusCounts[s];
              const pct = Math.round((count / totalMatches) * 100);
              return (
                <div key={s}>
                  <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
                    <span>{STATUS_LABELS[s] ?? s}</span>
                    <span>{count}</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-400" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
