import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { updateSupplier } from "@/app/admin/suppliers/actions";
import SupplierDetailTabs from "@/components/admin/SupplierDetailTabs";

export default async function EditSupplierPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [supplierResult, contactsResult, documentsResult, factoriesResult, productsResult] =
    await Promise.all([
      supabaseAdmin
        .from("supplier_offerings")
        .select("*")
        .eq("id", id)
        .single(),
      supabaseAdmin
        .from("supplier_contacts")
        .select("*")
        .eq("supplier_id", id)
        .order("is_primary", { ascending: false }),
      supabaseAdmin
        .from("supplier_documents")
        .select("*")
        .eq("supplier_id", id)
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("supplier_factories")
        .select("*")
        .eq("supplier_id", id)
        .order("is_primary", { ascending: false }),
      supabaseAdmin
        .from("supplier_products")
        .select("*")
        .eq("supplier_id", id)
        .order("scrape_confidence", { ascending: false }),
    ]);

  if (!supplierResult.data) return notFound();

  const bound = updateSupplier.bind(null, id);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white px-6 py-3 flex items-center gap-4 sticky top-0 z-10 shadow-sm">
        <a
          href="/admin/suppliers"
          className="text-sm text-orange-600 hover:text-orange-700 font-medium"
        >
          ← Suppliers
        </a>
        <span className="text-sm font-semibold text-gray-800">
          {supplierResult.data.company_name as string}
        </span>
        {supplierResult.data.verified && (
          <span className="text-xs bg-green-100 text-green-700 rounded-full px-2 py-0.5">
            ✓ Verified
          </span>
        )}
        <span className="text-xs text-gray-400 ml-auto">
          Updated{" "}
          {supplierResult.data.updated_at
            ? new Date(supplierResult.data.updated_at as string).toLocaleDateString(
                "en-US",
                { month: "short", day: "numeric", year: "numeric" }
              )
            : "—"}
        </span>
      </div>

      <SupplierDetailTabs
        supplierId={id}
        initialData={supplierResult.data}
        contacts={(contactsResult.data ?? []) as Record<string, unknown>[]}
        documents={(documentsResult.data ?? []) as Record<string, unknown>[]}
        factories={(factoriesResult.data ?? []) as Parameters<typeof SupplierDetailTabs>[0]["factories"]}
        products={(productsResult.data ?? []) as Parameters<typeof SupplierDetailTabs>[0]["products"]}
        action={bound}
      />
    </main>
  );
}
