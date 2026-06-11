import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { BuyersTableClient, type BuyerRow } from "@/components/admin/BuyersTableClient";

export const dynamic = "force-dynamic";

export default async function AdminBuyersPage() {
  const [buyersResult, requestsResult] = await Promise.all([
    supabaseAdmin
      .from("buyers")
      .select("id, company_name, logo_url, contact_name, contact_email, country, buyer_type, active")
      .order("company_name", { ascending: true }),
    supabaseAdmin
      .from("sourcing_requests")
      .select("buyer_id")
      .not("buyer_id", "is", null),
  ]);

  const requestCounts = new Map<string, number>();
  for (const row of requestsResult.data ?? []) {
    const buyerId = (row as { buyer_id: string | null }).buyer_id;
    if (!buyerId) continue;
    requestCounts.set(buyerId, (requestCounts.get(buyerId) ?? 0) + 1);
  }

  const buyers: BuyerRow[] = (buyersResult.data ?? []).map((buyer) => ({
    ...(buyer as Omit<BuyerRow, "request_count">),
    request_count: requestCounts.get(buyer.id) ?? 0,
  }));

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white px-6 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold text-gray-800">Buyer Database</span>
          <span className="text-xs text-gray-400">{buyers.length} total</span>
        </div>
        <Link
          href="/admin/buyers/new"
          className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition"
        >
          + Add buyer
        </Link>
      </div>

      <div className="p-6 max-w-7xl mx-auto">
        <BuyersTableClient buyers={buyers} />
      </div>
    </main>
  );
}
