import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import PipelineTable from "./PipelineTable";
import type { PipelineRow } from "./PipelineTable";
import DigestButton from "./DigestButton";

const TABS = ["all", "new", "approved", "sent", "responded", "closed"] as const;
type Tab = (typeof TABS)[number];

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function PipelinePage({ searchParams }: PageProps) {
  const { tab: rawTab } = await searchParams;
  const tab: Tab = TABS.includes(rawTab as Tab) ? (rawTab as Tab) : "all";

  const { data: rawMatches } = await supabaseAdmin
    .from("sourcing_matches")
    .select(
      `id, request_id, status, match_score,
       product_name, company_name, country,
       approved_at, sent_at, responded_at, closed_at, sent_via,
       sourcing_requests!request_id(company, product_name)`
    )
    .neq("status", "rejected")
    .order("match_score", { ascending: false })
    .limit(500);

  type RawMatch = {
    id: string;
    request_id: string;
    status: string;
    match_score: number;
    product_name: string;
    company_name: string;
    country: string | null;
    approved_at: string | null;
    sent_at: string | null;
    responded_at: string | null;
    closed_at: string | null;
    sent_via: string | null;
    sourcing_requests: { company: string | null; product_name: string | null } | null;
  };

  const allMatches: PipelineRow[] = ((rawMatches ?? []) as unknown as RawMatch[]).map((m) => ({
    id: m.id,
    request_id: m.request_id,
    status: m.status,
    match_score: m.match_score,
    product_name: m.product_name,
    company_name: m.company_name,
    country: m.country,
    approved_at: m.approved_at,
    sent_at: m.sent_at,
    responded_at: m.responded_at,
    closed_at: m.closed_at,
    sent_via: m.sent_via,
    buyer_company: m.sourcing_requests?.company ?? null,
    buyer_product: m.sourcing_requests?.product_name ?? null,
  }));

  const today = new Date().toISOString().slice(0, 10);
  const totalActive = allMatches.filter((m) =>
    ["pending", "new", "approved", "sent"].includes(m.status)
  ).length;
  const awaitingResponse = allMatches.filter((m) => m.status === "sent").length;
  const respondedToday = allMatches.filter(
    (m) => m.responded_at?.startsWith(today)
  ).length;

  const filtered =
    tab === "all"
      ? allMatches
      : tab === "new"
      ? allMatches.filter((m) => m.status === "pending" || m.status === "new")
      : allMatches.filter((m) => m.status === tab);

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Sticky header */}
      <div className="border-b border-gray-200 bg-white px-6 py-3 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3 flex-wrap mb-3">
          <span className="text-sm font-semibold text-gray-800">Pipeline</span>
          <div className="ml-auto">
            <DigestButton />
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <StatCard label="Active" count={totalActive} color="blue" />
          <StatCard label="Awaiting response" count={awaitingResponse} color="orange" />
          <StatCard label="Responded today" count={respondedToday} color="green" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-gray-200">
          {TABS.map((t) => {
            const count =
              t === "all"
                ? allMatches.length
                : t === "new"
                ? allMatches.filter(
                    (m) => m.status === "pending" || m.status === "new"
                  ).length
                : allMatches.filter((m) => m.status === t).length;
            return (
              <Link
                key={t}
                href={`/admin/pipeline?tab=${t}`}
                className={`px-4 py-2 text-xs font-medium rounded-t-lg transition-colors ${
                  tab === t
                    ? "bg-white border border-b-white border-gray-200 text-gray-900 -mb-px"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
                <span className="ml-1.5 text-gray-400">{count}</span>
              </Link>
            );
          })}
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <PipelineTable rows={filtered} />
        </div>
      </div>
    </main>
  );
}

function StatCard({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: "gray" | "green" | "orange" | "blue" | "purple";
}) {
  const styles: Record<string, string> = {
    gray: "bg-slate-50 text-slate-600",
    green: "bg-green-50 text-green-700",
    orange: "bg-orange-50 text-orange-700",
    blue: "bg-blue-50 text-blue-700",
    purple: "bg-purple-50 text-purple-700",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full ${styles[color]}`}
    >
      {count} {label}
    </span>
  );
}
