import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { updateBuyer } from "@/app/admin/buyers/actions";
import BuyerDetailTabs from "@/components/admin/BuyerDetailTabs";
import ImpersonateButton from "@/components/admin/ImpersonateButton";

export default async function EditBuyerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [buyerResult, requestsResult] = await Promise.all([
    supabaseAdmin.from("buyers").select("*").eq("id", id).single(),
    supabaseAdmin
      .from("sourcing_requests")
      .select("id, product_name, category, status, created_at")
      .eq("buyer_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (!buyerResult.data) return notFound();

  const bound = updateBuyer.bind(null, id);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white px-6 py-3 flex items-center gap-4 sticky top-0 z-10 shadow-sm">
        <a
          href="/admin/buyers"
          className="text-sm text-orange-600 hover:text-orange-700 font-medium"
        >
          ← Buyers
        </a>
        <span className="text-sm font-semibold text-gray-800">
          {buyerResult.data.company_name as string}
        </span>
        {buyerResult.data.active && (
          <span className="text-xs bg-green-100 text-green-700 rounded-full px-2 py-0.5">
            Active
          </span>
        )}
        <ImpersonateButton kind="buyer" id={id} label="View as buyer" />
        <a
          href={`/admin/requests/new?buyer_id=${id}&company=${encodeURIComponent(
            String(buyerResult.data.company_name ?? "")
          )}&name=${encodeURIComponent(
            String(buyerResult.data.contact_name ?? "")
          )}&email=${encodeURIComponent(String(buyerResult.data.contact_email ?? ""))}`}
          className="text-sm text-orange-600 hover:text-orange-700 font-medium"
        >
          Submit request for buyer →
        </a>
        <span className="text-xs text-gray-400 ml-auto">
          Updated{" "}
          {buyerResult.data.updated_at
            ? new Date(buyerResult.data.updated_at as string).toLocaleDateString(
                "en-US",
                { month: "short", day: "numeric", year: "numeric" }
              )
            : "—"}
        </span>
      </div>

      <BuyerDetailTabs
        buyerId={id}
        initialData={buyerResult.data}
        requests={requestsResult.data ?? []}
        action={bound}
      />
    </main>
  );
}
