import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { cleanRequestName } from "@/lib/matching/cleanRequestName";
import { logEvent } from "@/lib/events/logEvent";
import { buyerOwnsRequest } from "@/lib/matches/buyerAuth";
import StatusBadge from "@/components/portal/StatusBadge";
import BuyerMatchCard, { type BuyerMatch } from "@/components/matches/BuyerMatchCard";

type Params = Promise<{ id: string }>;

const VISIBLE_MATCH_STATUSES = ["suggested", "approved", "sent", "responded", "closed"];

export default async function PortalRequestDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/en/portal/login");

  const { data: request } = await supabaseAdmin
    .from("sourcing_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (!request) return notFound();

  const authorized = await buyerOwnsRequest(
    { email: request.email as string | null, buyer_id: request.buyer_id as string | null },
    user.email
  );
  if (!authorized) redirect("/en/portal");

  const { data: rawMatches } = await supabaseAdmin
    .from("sourcing_matches")
    .select(
      `id, supplier_id, company_name, country, product_name, match_score, match_summary, match_breakdown, status,
       sent_at, closed_at, created_at,
       buyer_interest, buyer_interest_at,
       supplier:supplier_offerings(logo_url, certifications)`
    )
    .eq("request_id", id)
    .in("status", VISIBLE_MATCH_STATUSES)
    .order("match_score", { ascending: false });

  const matches = (rawMatches ?? []) as unknown as BuyerMatch[];

  void logEvent(user.id, "buyer", "request_viewed", "request", id);
  if (matches.length > 0) {
    void logEvent(user.id, "buyer", "matches_viewed", "request", id, {
      match_count: matches.length,
    });
  }

  const productName = (request.product_name as string | null) ?? "";
  const cleanedName = productName ? cleanRequestName(productName) : "";
  const certs = (request.certifications as string[] | null) ?? [];
  const hasKosher = certs.some((c) => c.toLowerCase().includes("kosher"));

  return (
    <section className="px-6 py-12">
      <div className="max-w-3xl mx-auto">
        <Link href="/en/portal" className="text-sm text-orange-400 hover:underline">
          ← My requests
        </Link>

        <div className="dark-card p-6 mt-6">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
            <h1 className="text-xl font-semibold text-white">
              {cleanedName || productName || "Sourcing request"}
            </h1>
            <StatusBadge status={request.status as string | null} />
          </div>

          {(request.category || hasKosher || request.private_label) && (
            <div className="flex flex-wrap gap-2">
              {request.category && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-300">
                  {request.category as string}
                </span>
              )}
              {hasKosher && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-300">
                  ✡ Kosher required
                </span>
              )}
              {(request.private_label as boolean | null) && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-300">
                  Private label
                </span>
              )}
            </div>
          )}

          {(request.message as string | null) && (
            <p className="mt-4 text-sm text-slate-300 leading-relaxed border-t border-white/10 pt-4">
              {request.message as string}
            </p>
          )}

          <div className="mt-3 flex items-center justify-between flex-wrap gap-2 text-xs text-slate-500">
            <span>
              Submitted{" "}
              {new Date(request.created_at as string).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
            <span>
              {matches.length} supplier{matches.length !== 1 ? "s" : ""} matched
            </span>
          </div>
        </div>

        <h2 className="text-lg font-semibold text-white mt-10 mb-4">Matched suppliers</h2>

        {matches.length === 0 ? (
          <div className="dark-card p-6 text-sm text-slate-400">
            Waiting for our team to match you with suppliers.
          </div>
        ) : (
          <div className="space-y-3">
            {matches.map((m) => (
              <BuyerMatchCard key={m.id} match={m} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
