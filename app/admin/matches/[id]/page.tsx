import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import AdminMatchThread from "@/components/admin/AdminMatchThread";

export const dynamic = "force-dynamic";

type MatchDetailRow = {
  id: string;
  request_id: string;
  supplier_id: string;
  company_name: string | null;
  product_name: string | null;
  match_score: number | null;
  status: string | null;
  created_at: string | null;
  sent_at: string | null;
  buyer_interest_at: string | null;
  supplier_responded_at: string | null;
  closed_at: string | null;
  sourcing_requests: {
    id: string;
    product_name: string | null;
    company: string | null;
    email: string | null;
  } | null;
};

const STATUS_CLASSES: Record<string, string> = {
  pending: "bg-slate-100 text-slate-600",
  suggested: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-600",
  sent: "bg-blue-100 text-blue-700",
  responded: "bg-purple-100 text-purple-700",
  closed: "bg-gray-200 text-gray-600",
};

function StatusBadge({ status }: { status: string | null }) {
  const key = status ?? "pending";
  const classes = STATUS_CLASSES[key] ?? "bg-gray-100 text-gray-500";
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${classes}`}>
      {key.charAt(0).toUpperCase() + key.slice(1)}
    </span>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function TimelineStep({
  label,
  timestamp,
}: {
  label: string;
  timestamp: string | null;
}) {
  const done = Boolean(timestamp);
  return (
    <div className="flex items-center gap-3">
      <div
        className={`h-2.5 w-2.5 rounded-full ${
          done ? "bg-orange-500" : "bg-gray-200"
        }`}
      />
      <div className="flex-1 flex items-center justify-between">
        <span className={`text-sm ${done ? "text-gray-800" : "text-gray-400"}`}>
          {label}
        </span>
        <span className="text-xs text-gray-400">{formatDate(timestamp)}</span>
      </div>
    </div>
  );
}

export default async function AdminMatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from("sourcing_matches")
    .select(
      `id, request_id, supplier_id, company_name, product_name, match_score, status,
       created_at, sent_at, buyer_interest_at, supplier_responded_at, closed_at,
       sourcing_requests(id, product_name, company, email)`
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    notFound();
  }

  const match = data as unknown as MatchDetailRow;
  const request = match.sourcing_requests;
  const buyerName = request?.company || request?.email || "Unknown buyer";
  const requestProduct = request?.product_name || match.product_name || "—";

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white px-6 py-4 sticky top-0 z-10 shadow-sm flex items-center justify-between">
        <div>
          <Link href="/admin/matches" className="text-xs text-gray-400 hover:text-gray-600">
            ← Back to matches
          </Link>
          <h1 className="text-base font-semibold text-gray-800 mt-1">Match thread</h1>
        </div>
        <StatusBadge status={match.status} />
      </div>

      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-400 mb-1">Supplier</p>
              <p className="font-medium text-gray-800">{match.company_name ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Buyer</p>
              <p className="font-medium text-gray-800">{buyerName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Request product</p>
              <p className="font-medium text-gray-800">{requestProduct}</p>
            </div>
          </div>
          {match.match_score !== null && (
            <div className="text-sm">
              <p className="text-xs text-gray-400 mb-1">Match score</p>
              <p className="font-medium text-gray-800">{match.match_score}%</p>
            </div>
          )}

          <div className="border-t border-gray-100 pt-4 space-y-3">
            <p className="text-xs text-gray-400 mb-1">Timeline</p>
            <TimelineStep label="Created" timestamp={match.created_at} />
            <TimelineStep label="Sent" timestamp={match.sent_at} />
            <TimelineStep label="Buyer interested" timestamp={match.buyer_interest_at} />
            <TimelineStep label="Replied" timestamp={match.supplier_responded_at} />
            <TimelineStep label="Closed" timestamp={match.closed_at} />
          </div>
        </div>

        <AdminMatchThread matchId={match.id} />
      </div>
    </main>
  );
}
