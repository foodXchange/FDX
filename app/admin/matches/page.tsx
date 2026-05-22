import { supabaseAdmin } from "@/lib/supabaseAdmin";
import MatchDashboardClient from "@/components/admin/MatchDashboardClient";

export const dynamic = "force-dynamic";

export type MatchRow = {
  id: string;
  request_id: string;
  supplier_id: string;
  match_score: number;
  product_name: string | null;
  company_name: string | null;
  country: string | null;
  match_summary: string | null;
  whatsapp_message: string | null;
  status: string;
  approved_at: string | null;
  rejected_at: string | null;
  match_breakdown: {
    kosher_types?: string[];
    certifications?: string[];
    reasons?: string[];
  } | null;
  request: {
    id: string;
    product_name: string | null;
    company: string | null;
    email: string | null;
    category: string | null;
  } | null;
  supplier: {
    company_name: string;
    country_of_origin: string | null;
  } | null;
};

export default async function MatchesPage() {
  const { data, error } = await supabaseAdmin
    .from("sourcing_matches")
    .select(
      `id, request_id, supplier_id, match_score, product_name, company_name,
       country, match_summary, whatsapp_message, status, approved_at, rejected_at,
       match_breakdown,
       request:sourcing_requests(id, product_name, company, email, category),
       supplier:supplier_offerings(company_name, country_of_origin)`
    )
    .order("match_score", { ascending: false })
    .limit(500);

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <p className="text-red-600 text-sm">Error loading matches: {error.message}</p>
      </main>
    );
  }

  const matches = (data ?? []) as unknown as MatchRow[];

  const total = matches.length;
  const pending = matches.filter((m) => m.status === "pending").length;
  const approved = matches.filter((m) => m.status === "approved").length;
  const rejected = matches.filter((m) => m.status === "rejected").length;
  const sent = matches.filter((m) => m.status === "sent").length;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white px-6 py-4 sticky top-0 z-10 shadow-sm">
        <h1 className="text-base font-semibold text-gray-800 mb-3">
          Match Dashboard
        </h1>
        <div className="flex items-center gap-3 flex-wrap">
          <StatCard label="Total" count={total} color="gray" />
          <StatCard label="Pending" count={pending} color="orange" />
          <StatCard label="Approved" count={approved} color="green" />
          <StatCard label="Rejected" count={rejected} color="red" />
          <StatCard label="Sent" count={sent} color="blue" />
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto">
        <MatchDashboardClient matches={matches} />
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
  color: "gray" | "orange" | "green" | "red" | "blue";
}) {
  const styles = {
    gray: "bg-slate-50 text-slate-600",
    orange: "bg-orange-50 text-orange-700",
    green: "bg-green-50 text-green-700",
    red: "bg-red-50 text-red-700",
    blue: "bg-blue-50 text-blue-700",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1 rounded-full ${styles[color]}`}
    >
      {count.toLocaleString()} {label}
    </span>
  );
}
