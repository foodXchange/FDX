import { supabaseAdmin } from "@/lib/supabaseAdmin";
import RequestsTable from "@/components/admin/RequestsTable";
import ScriptGenerator from "@/components/admin/ScriptGenerator";

export type RequestRow = {
  id: string;
  name: string | null;
  email: string | null;
  company: string | null;
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
};

export default async function AdminRequestsPage() {
  const [requestsResult, imagesResult] = await Promise.all([
    supabaseAdmin
      .from("sourcing_requests")
      .select(
        "id, name, email, company, message, product_name, category, certifications, target_market, private_label, ai_analysis, source, status, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(200),
    supabaseAdmin.from("request_images").select("request_id, url"),
  ]);

  const rawRequests = (requestsResult.data ?? []) as Omit<
    RequestRow,
    "images" | "match_count"
  >[];
  const rawImages = (imagesResult.data ?? []) as {
    request_id: string;
    url: string;
  }[];

  const requestIds = rawRequests.map((r) => r.id);

  const matchCountsResult =
    requestIds.length > 0
      ? await supabaseAdmin
          .from("sourcing_matches")
          .select("request_id")
          .in("request_id", requestIds)
      : { data: [] };

  const matchCountMap = new Map<string, number>();
  for (const m of matchCountsResult.data ?? []) {
    const id = (m as { request_id: string }).request_id;
    matchCountMap.set(id, (matchCountMap.get(id) ?? 0) + 1);
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
  }));

  const newCount = requests.filter((r) => r.status === "new").length;
  const matchedCount = requests.filter((r) => r.match_count > 0).length;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white px-6 py-3 flex items-center gap-4 sticky top-0 z-10 shadow-sm">
        <span className="text-sm font-semibold text-gray-800">Sourcing Requests</span>
        <span className="text-xs text-gray-400 flex-1">
          {requests.length} total
          {newCount > 0 && (
            <span className="ml-2 bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 font-semibold">
              {newCount} new
            </span>
          )}
          {matchedCount > 0 && (
            <span className="ml-1.5 bg-green-100 text-green-700 rounded-full px-2 py-0.5 font-semibold">
              {matchedCount} matched
            </span>
          )}
        </span>
        <ScriptGenerator />
      </div>

      <div className="p-6 max-w-7xl mx-auto">
        <RequestsTable requests={requests} />
      </div>
    </main>
  );
}
