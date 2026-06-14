import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import CatalogueBuilder from "@/components/admin/CatalogueBuilder";
import type { CatalogueProduct } from "@/app/admin/catalogue/actions";
import CatalogueGrid from "@/components/admin/CatalogueGrid";

export default async function AdminCataloguePage() {
  const [productsResult, presCountResult, openRequestsResult] = await Promise.all([
    supabaseAdmin
      .from("catalogue_products")
      .select("*")
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("catalogue_presentations")
      .select("*", { count: "exact", head: true }),
    supabaseAdmin
      .from("sourcing_requests")
      .select("id, product_name, company")
      .neq("status", "closed")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const products = (productsResult.data ?? []) as CatalogueProduct[];
  const presCount = presCountResult.count ?? 0;
  const openRequests = (openRequestsResult.data ?? []) as {
    id: string;
    product_name: string | null;
    company: string | null;
  }[];

  const readyCount = products.filter((p) => p.status === "ready").length;
  const draftCount = products.filter((p) => p.status === "draft").length;

  // Linked-match counts per product, keyed by `${supplier_id}::${product_name}`
  const supplierIds = Array.from(
    new Set(products.map((p) => p.supplier_id).filter((id): id is string => Boolean(id)))
  );

  const linkedCounts: Record<string, number> = {};

  if (supplierIds.length > 0) {
    const { data: matchRows } = await supabaseAdmin
      .from("sourcing_matches")
      .select("request_id, supplier_id, product_name, status")
      .in("supplier_id", supplierIds)
      .neq("status", "rejected");

    const matches = (matchRows ?? []) as {
      request_id: string;
      supplier_id: string;
      product_name: string | null;
      status: string;
    }[];

    const requestIds = Array.from(new Set(matches.map((m) => m.request_id)));

    const { data: requestRows } =
      requestIds.length > 0
        ? await supabaseAdmin
            .from("sourcing_requests")
            .select("id, status")
            .in("id", requestIds)
        : { data: [] as { id: string; status: string }[] };

    const closedRequestIds = new Set(
      (requestRows ?? [])
        .filter((r) => (r as { status: string }).status === "closed")
        .map((r) => (r as { id: string }).id)
    );

    for (const m of matches) {
      if (closedRequestIds.has(m.request_id)) continue;
      const key = `${m.supplier_id}::${m.product_name}`;
      linkedCounts[key] = (linkedCounts[key] ?? 0) + 1;
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* TOP BAR */}
      <div className="border-b border-gray-200 bg-white px-6 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold text-gray-800">Product Catalogue</span>
          <span className="text-xs text-gray-400 flex gap-1.5">
            <span className="bg-green-100 text-green-700 rounded-full px-2 py-0.5 font-semibold">
              {readyCount} ready
            </span>
            {draftCount > 0 && (
              <span className="bg-slate-100 text-slate-600 rounded-full px-2 py-0.5 font-semibold">
                {draftCount} draft
              </span>
            )}
            <span className="text-gray-300">·</span>
            <span>{products.length} total</span>
            {presCount > 0 && (
              <>
                <span className="text-gray-300">·</span>
                <span>{presCount} presentations</span>
              </>
            )}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <CatalogueBuilder products={products} />
          <Link
            href="/admin/catalogue/new"
            className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition"
          >
            + Add product
          </Link>
        </div>
      </div>

      {/* GRID WITH TABS */}
      <div className="p-6 max-w-7xl mx-auto">
        {products.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">
            No products yet.{" "}
            <Link href="/admin/catalogue/new" className="text-orange-500 hover:underline">
              Add one
            </Link>
            .
          </div>
        ) : (
          <CatalogueGrid
            products={products}
            openRequests={openRequests}
            linkedCounts={linkedCounts}
          />
        )}
      </div>
    </main>
  );
}
