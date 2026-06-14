import { redirect } from "next/navigation";
import { getSupplierContext } from "@/lib/supabase/getSupplierContext";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import NoCompanyState from "@/components/supplier-portal/NoCompanyState";
import ProductsManager, { type SupplierPortalProduct } from "@/components/supplier-portal/ProductsManager";

export default async function SupplierPortalProductsPage() {
  const ctx = await getSupplierContext();
  if (!ctx) redirect("/en/supplier-portal/login");
  if (!ctx.supplierId) return <NoCompanyState />;

  const { data } = await supabaseAdmin
    .from("supplier_products")
    .select("id, product_name, category, description, certifications, kosher_types, private_label, image_url, image_source, is_published")
    .eq("supplier_id", ctx.supplierId)
    .order("product_name", { ascending: true });

  return (
    <section className="px-6 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">My Products</h1>
          <p className="text-sm text-slate-400 mt-1">
            New and edited products are reviewed by our team before they appear in the directory.
          </p>
        </div>
        <ProductsManager supplierId={ctx.supplierId} initialProducts={(data ?? []) as SupplierPortalProduct[]} />
      </div>
    </section>
  );
}
