import { supabaseAdmin } from "@/lib/supabaseAdmin";
import RequestsTable from "@/components/admin/RequestsTable";

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
  images: string[];
};

export default async function AdminRequestsPage() {
  const [requestsResult, imagesResult] = await Promise.all([
    supabaseAdmin
      .from("sourcing_requests")
      .select(
        "id, name, email, company, message, product_name, category, certifications, target_market, private_label, ai_analysis, source, status, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(100),
    supabaseAdmin.from("request_images").select("request_id, url"),
  ]);

  const rawRequests = (requestsResult.data ?? []) as Omit<RequestRow, "images">[];
  const rawImages = (imagesResult.data ?? []) as { request_id: string; url: string }[];

  // Build imagesByRequest map
  const imageMap = new Map<string, string[]>();
  for (const img of rawImages) {
    const existing = imageMap.get(img.request_id) ?? [];
    existing.push(img.url);
    imageMap.set(img.request_id, existing);
  }

  const requests: RequestRow[] = rawRequests.map((r) => ({
    ...r,
    images: imageMap.get(r.id) ?? [],
  }));

  const newCount = requests.filter((r) => r.status === "new").length;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white px-6 py-3 flex items-center gap-4 sticky top-0 z-10 shadow-sm">
        <span className="text-sm font-semibold text-gray-800">Sourcing Requests</span>
        <span className="text-xs text-gray-400">
          {newCount > 0 && (
            <span className="bg-orange-100 text-orange-700 rounded-full px-2 py-0.5 font-semibold mr-2">
              {newCount} new
            </span>
          )}
          {requests.length} total
        </span>
      </div>

      <div className="p-6 max-w-6xl mx-auto">
        <RequestsTable requests={requests} />
      </div>
    </main>
  );
}
