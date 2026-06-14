import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { relativeTime } from "@/lib/format/relativeTime";
import MatchPipelineBadge from "@/components/matches/MatchPipelineBadge";

export const revalidate = 0;

type Params = Promise<{ id: string }>;

type RequestRow = {
  id: string;
  product_name: string | null;
  status: string | null;
  created_at: string | null;
};

type MatchRow = {
  id: string;
  product_name: string | null;
  company_name: string | null;
  status: string | null;
  supplier_response: string | null;
  sent_at: string | null;
  closed_at: string | null;
  request_id: string;
};

type EventRow = {
  id: string;
  event_type: string;
  entity_type: string | null;
  entity_id: string | null;
  event_data: Record<string, unknown> | null;
  created_at: string;
};

const EVENT_LABELS: Record<string, string> = {
  request_submitted: "Submitted a sourcing request",
  request_viewed: "Viewed a request",
  matches_viewed: "Viewed matches",
  message_sent: "Sent a message",
  deal_accepted: "Accepted a deal",
};

const REQUEST_STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  reviewed: "bg-yellow-100 text-yellow-700",
  matched: "bg-green-100 text-green-700",
  closed: "bg-slate-100 text-slate-500",
  sent: "bg-purple-100 text-purple-700",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default async function BuyerDrilldownPage({ params }: { params: Params }) {
  const { id } = await params;

  const buyerResult = await supabaseAdmin
    .from("buyer_profiles")
    .select("id, name, email, company, created_at")
    .eq("id", id)
    .single();

  if (!buyerResult.data) return notFound();
  const buyer = buyerResult.data;

  const [requestsResult, eventsResult] = await Promise.all([
    supabaseAdmin
      .from("sourcing_requests")
      .select("id, product_name, status, created_at")
      .eq("auth_user_id", id)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("platform_events")
      .select("id, event_type, entity_type, entity_id, event_data, created_at")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const requests = (requestsResult.data ?? []) as RequestRow[];
  const events = (eventsResult.data ?? []) as EventRow[];
  const requestIds = requests.map((r) => r.id);

  let matches: MatchRow[] = [];
  if (requestIds.length > 0) {
    const { data } = await supabaseAdmin
      .from("sourcing_matches")
      .select("id, product_name, company_name, status, supplier_response, sent_at, closed_at, request_id")
      .in("request_id", requestIds)
      .order("sent_at", { ascending: false });
    matches = (data ?? []) as MatchRow[];
  }

  const matchCountByRequest = new Map<string, number>();
  for (const m of matches) {
    if (!m.sent_at) continue;
    matchCountByRequest.set(m.request_id, (matchCountByRequest.get(m.request_id) ?? 0) + 1);
  }

  return (
    <main className="bg-slate-50 min-h-screen py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <Link href="/en/admin/qa-metrics" className="text-sm text-slate-400 hover:text-slate-600 transition">
          ← QA Metrics
        </Link>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 mt-3">
          <h1 className="text-xl font-semibold text-slate-900">
            {buyer.name || buyer.company || buyer.email}
          </h1>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-slate-500">
            {buyer.company && <span>{buyer.company}</span>}
            <span>{buyer.email}</span>
            <span>Joined {formatDate(buyer.created_at)}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 mt-6">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">
            Requests ({requests.length})
          </h2>
          {requests.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No requests yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 uppercase tracking-wide border-b border-slate-100">
                    <th className="py-2 pr-4 font-medium">Product</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 pr-4 font-medium">Matches sent</th>
                    <th className="py-2 pr-4 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {requests.map((r) => (
                    <tr key={r.id}>
                      <td className="py-2.5 pr-4 text-slate-800">{r.product_name ?? "—"}</td>
                      <td className="py-2.5 pr-4">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${
                            REQUEST_STATUS_COLORS[r.status ?? "new"] ?? "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {r.status ?? "new"}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 text-slate-600">{matchCountByRequest.get(r.id) ?? 0}</td>
                      <td className="py-2.5 pr-4 text-xs text-slate-500">{formatDate(r.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 mt-6">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">
            Matches Received ({matches.length})
          </h2>
          {matches.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No matches yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 uppercase tracking-wide border-b border-slate-100">
                    <th className="py-2 pr-4 font-medium">Product</th>
                    <th className="py-2 pr-4 font-medium">Supplier</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 pr-4 font-medium">Sent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {matches.map((m) => (
                    <tr key={m.id}>
                      <td className="py-2.5 pr-4 text-slate-800">{m.product_name ?? "—"}</td>
                      <td className="py-2.5 pr-4 text-slate-600">{m.company_name ?? "—"}</td>
                      <td className="py-2.5 pr-4">
                        <MatchPipelineBadge match={m} />
                      </td>
                      <td className="py-2.5 pr-4 text-xs text-slate-500">{formatDate(m.sent_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 mt-6">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">Recent Activity</h2>
          {events.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No activity recorded yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {events.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                  <span className="text-slate-700">{EVENT_LABELS[e.event_type] ?? e.event_type}</span>
                  <span className="text-xs text-slate-400 shrink-0">{relativeTime(e.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
