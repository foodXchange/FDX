import { redirect } from "next/navigation";
import { getSupplierContext } from "@/lib/supabase/getSupplierContext";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import NoCompanyState from "@/components/supplier-portal/NoCompanyState";
import OpportunityCard, { type Opportunity } from "@/components/supplier-portal/OpportunityCard";

const VISIBLE_STATUSES = ["suggested", "sent"];

type RawMatch = {
  id: string;
  match_score: number | null;
  status: string | null;
  product_name: string | null;
  match_summary: string | null;
  created_at: string;
  sourcing_requests: {
    product_name: string | null;
    category: string | null;
    message: string | null;
    certifications: string[] | null;
  } | null;
};

export default async function SupplierPortalOpportunitiesPage() {
  const ctx = await getSupplierContext();
  if (!ctx) redirect("/en/supplier-portal/login");
  if (!ctx.supplierId) return <NoCompanyState />;

  const { data: rawMatches } = await supabaseAdmin
    .from("sourcing_matches")
    .select(
      `id, match_score, status, product_name, match_summary, created_at,
       sourcing_requests(product_name, category, message, certifications)`
    )
    .eq("supplier_id", ctx.supplierId)
    .in("status", VISIBLE_STATUSES)
    .order("created_at", { ascending: false });

  const opportunities: Opportunity[] = ((rawMatches ?? []) as unknown as RawMatch[]).map((m) => ({
    id: m.id,
    status: m.status,
    matchScore: m.match_score,
    matchedProductName: m.product_name,
    matchSummary: m.match_summary,
    requestProductName: m.sourcing_requests?.product_name ?? null,
    requestCategory: m.sourcing_requests?.category ?? null,
    requestMessage: m.sourcing_requests?.message ?? null,
    requestCertifications: m.sourcing_requests?.certifications ?? null,
  }));

  return (
    <section className="px-6 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Opportunities</h1>
          <p className="text-sm text-slate-400 mt-1">
            Buyer requests we&apos;ve matched to your products — let us know if you&apos;re interested.
          </p>
        </div>

        {opportunities.length === 0 ? (
          <div className="dark-card p-8 text-center text-sm text-slate-400">
            No new opportunities right now — we&apos;ll notify you when we find a match for your products.
          </div>
        ) : (
          <div className="space-y-3">
            {opportunities.map((o) => (
              <OpportunityCard key={o.id} opportunity={o} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
