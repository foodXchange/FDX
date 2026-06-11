import { supabaseAdmin } from "@/lib/supabaseAdmin";
import RequestsTable from "@/components/admin/RequestsTable";
import ScriptGenerator from "@/components/admin/ScriptGenerator";
import BulkMatchButton from "@/components/admin/BulkMatchButton";
import BulkReMatchButton from "@/components/admin/BulkReMatchButton";

export type RequestRow = {
  id: string;
  name: string | null;
  email: string | null;
  company: string | null;
  buyer_id: string | null;
  message: string | null;
  product_name: string | null;
  category: string | null;
  certifications: string[] | null;
  target_market: string | null;
  private_label: boolean | null;
  ai_analysis: Record<string, unknown> | null;
  source: string | null;
  status: string | null;
  created_at: string;
  images: { url: string }[];
  match_count: number;
  best_match_score: number | null;
  is_published?: boolean | null;
  published_product_name?: string | null;
  published_message?: string | null;
  intent_json?: Record<string, unknown> | null;
};

export default async function AdminRequestsPage() {
  const [requestsResult, imagesResult] = await Promise.all([
    supabaseAdmin
      .from("sourcing_requests")
      .select(
        "id, name, email, company, buyer_id, message, product_name, category, certifications, target_market, private_label, ai_analysis, source, status, created_at, is_published, published_product_name, published_message, intent_json"
      )
      .order("created_at", { ascending: false })
      .limit(200),
    supabaseAdmin.from("request_images").select("request_id, url"),
  ]);

  const rawRequests = (requestsResult.data ?? []) as Omit<
    RequestRow,
    "images" | "match_count" | "best_match_score"
  >[];
  const rawImages = (imagesResult.data ?? []) as {
    request_id: string;
    url: string;
  }[];

  const requestIds = rawRequests.map((r) => r.id);

  const matchDataResult =
    requestIds.length > 0
      ? await supabaseAdmin
          .from("sourcing_matches")
          .select("request_id, match_score")
          .in("request_id", requestIds)
          .neq("status", "rejected")
      : { data: [] };

  const matchCountMap = new Map<string, number>();
  const bestScoreMap = new Map<string, number>();
  for (const m of matchDataResult.data ?? []) {
    const row = m as { request_id: string; match_score: number };
    matchCountMap.set(row.request_id, (matchCountMap.get(row.request_id) ?? 0) + 1);
    const current = bestScoreMap.get(row.request_id) ?? 0;
    if (row.match_score > current) bestScoreMap.set(row.request_id, row.match_score);
  }

  const imageMap = new Map<string, { url: string }[]>();
  for (const img of rawImages) {
    const existing = imageMap.get(img.request_id) ?? [];
    existing.push({ url: img.url });
    imageMap.set(img.request_id, existing);
  }

  const requests: RequestRow[] = rawRequests.map((r) => ({
    ...r,
    images: imageMap.get(r.id) ?? [],
    match_count: matchCountMap.get(r.id) ?? 0,
    best_match_score: bestScoreMap.get(r.id) ?? null,
  }));

  const totalCount = requests.length;
  const matchedCount = requests.filter((r) => r.status === "matched").length;
  const unmatchedCount = requests.filter(
    (r) => r.status !== "matched" && r.status !== "closed"
  ).length;
  const highScoreCount = requests.filter(
    (r) => (r.best_match_score ?? 0) >= 70
  ).length;
  const awaitingCount = requests.filter((r) => r.status === "matched").length;

  const unmatchedIds = requests
    .filter((r) => r.status !== "matched" && r.status !== "closed")
    .map((r) => r.id);

  const reMatchIds = requests
    .filter((r) => r.status === "matched" && r.product_name !== null)
    .map((r) => r.id);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white px-6 py-3 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3 flex-wrap mb-3">
          <span className="text-sm font-semibold text-gray-800">
            Sourcing Requests
          </span>
          <BulkMatchButton unmatchedIds={unmatchedIds} />
          <BulkReMatchButton reMatchIds={reMatchIds} />
          <div className="ml-auto">
            <ScriptGenerator />
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 flex-wrap">
          <StatCard label="Total" count={totalCount} color="gray" />
          <StatCard label="Matched" count={matchedCount} color="green" />
          <StatCard label="Unmatched" count={unmatchedCount} color="orange" />
          <StatCard label="High score ≥70" count={highScoreCount} color="blue" />
          <StatCard label="Awaiting" count={awaitingCount} color="purple" />
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto">
        <RequestsTable requests={requests} />
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
  const styles = {
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
