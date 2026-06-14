import Link from "next/link";
import { redirect } from "next/navigation";
import { getSupplierContext } from "@/lib/supabase/getSupplierContext";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import NoCompanyState from "@/components/supplier-portal/NoCompanyState";
import MatchCard from "@/components/matches/MatchCard";
import type { SupplierMatch } from "@/components/matches/types";
import { getPipelineStatus, PIPELINE_LABELS, type PipelineStatus } from "@/lib/matches/pipelineStatus";

const SUPPLIER_VISIBLE_STATUSES = ["sent", "responded", "closed"];

type SearchParams = Promise<{ status?: string; sort?: string }>;

type RawMatch = {
  id: string;
  match_score: number | null;
  status: string | null;
  supplier_response: "accepted" | "countered" | "declined" | null;
  supplier_message: string | null;
  supplier_responded_at: string | null;
  sent_at: string | null;
  closed_at: string | null;
  created_at: string;
  sourcing_requests: {
    id: string;
    product_name: string | null;
    category: string | null;
    message: string | null;
    certifications: string[] | null;
    created_at: string;
    company: string | null;
    ai_analysis: Record<string, unknown> | null;
  } | null;
};

export default async function SupplierPortalMatchesPage({ searchParams }: { searchParams: SearchParams }) {
  const ctx = await getSupplierContext();
  if (!ctx) redirect("/en/supplier-portal/login");
  if (!ctx.supplierId) return <NoCompanyState />;

  const { status: statusFilter, sort } = await searchParams;

  const { data: rawMatches } = await supabaseAdmin
    .from("sourcing_matches")
    .select(
      `id, match_score, status, supplier_response, supplier_message, supplier_responded_at, sent_at, closed_at, created_at,
       sourcing_requests(id, product_name, category, message, certifications, created_at, company, ai_analysis)`
    )
    .eq("supplier_id", ctx.supplierId)
    .in("status", SUPPLIER_VISIBLE_STATUSES)
    .order("created_at", { ascending: false });

  let matches: SupplierMatch[] = ((rawMatches ?? []) as unknown as RawMatch[]).map((m) => {
    const req = m.sourcing_requests;
    const ai = (req?.ai_analysis ?? {}) as { volume?: string; urgency?: string };
    return {
      id: m.id,
      match_score: m.match_score,
      status: m.status,
      supplier_response: m.supplier_response,
      supplier_message: m.supplier_message,
      supplier_responded_at: m.supplier_responded_at,
      sent_at: m.sent_at,
      closed_at: m.closed_at,
      created_at: m.created_at,
      sourcing_requests: req
        ? {
            id: req.id,
            product_name: req.product_name,
            category: req.category,
            message: req.message,
            certifications: req.certifications,
            created_at: req.created_at,
            company: req.company,
            volume: ai.volume ?? null,
            urgency: ai.urgency ?? null,
          }
        : null,
    };
  });

  if (statusFilter && statusFilter in PIPELINE_LABELS) {
    matches = matches.filter((m) => getPipelineStatus(m) === (statusFilter as PipelineStatus));
  }

  if (sort === "score") {
    matches = [...matches].sort((a, b) => (b.match_score ?? 0) - (a.match_score ?? 0));
  }

  const filterOptions: { value: string; label: string }[] = [
    { value: "", label: "All" },
    ...Object.entries(PIPELINE_LABELS).map(([value, label]) => ({ value, label })),
  ];

  return (
    <section className="px-6 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Matches</h1>
          <p className="text-sm text-slate-400 mt-1">Buyer requests we&apos;ve matched to your products.</p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex flex-wrap gap-2">
            {filterOptions.map((opt) => {
              const active = (statusFilter ?? "") === opt.value;
              const href = opt.value
                ? `/en/supplier-portal/matches?status=${opt.value}${sort ? `&sort=${sort}` : ""}`
                : `/en/supplier-portal/matches${sort ? `?sort=${sort}` : ""}`;
              return (
                <Link
                  key={opt.value || "all"}
                  href={href}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full transition ${
                    active ? "bg-orange-500 text-white" : "bg-white/5 text-slate-300 hover:bg-white/10"
                  }`}
                >
                  {opt.label}
                </Link>
              );
            })}
          </div>

          <div className="flex gap-2 text-xs">
            <Link
              href={`/en/supplier-portal/matches?${statusFilter ? `status=${statusFilter}&` : ""}sort=date`}
              className={`px-3 py-1.5 rounded-full transition ${
                sort !== "score" ? "bg-white/10 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Newest
            </Link>
            <Link
              href={`/en/supplier-portal/matches?${statusFilter ? `status=${statusFilter}&` : ""}sort=score`}
              className={`px-3 py-1.5 rounded-full transition ${
                sort === "score" ? "bg-white/10 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Best match
            </Link>
          </div>
        </div>

        {matches.length === 0 ? (
          <div className="dark-card p-8 text-center text-sm text-slate-400">
            No matches yet — we&apos;ll notify you when admins match you with a buyer request.
          </div>
        ) : (
          <div className="space-y-3">
            {matches.map((m) => (
              <MatchCard key={m.id} match={m} viewerRole="supplier" />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
