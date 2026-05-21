import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { updateCatalogueProduct } from "@/app/admin/catalogue/actions";
import type { CatalogueProduct, CatalogueProductInput } from "@/app/admin/catalogue/actions";
import CatalogueProductForm from "@/components/admin/CatalogueProductForm";
import PreviewPdfButton from "@/components/admin/PreviewPdfButton";
import ScriptGenerator from "@/components/admin/ScriptGenerator";

type Params = Promise<{ id: string }>;

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "ready"
      ? "bg-green-100 text-green-700"
      : status === "archived"
      ? "bg-gray-100 text-gray-500"
      : "bg-slate-100 text-slate-600";
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${cls}`}>
      {status}
    </span>
  );
}

export default async function EditCatalogueProductPage({ params }: { params: Params }) {
  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from("catalogue_products")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) notFound();

  const product = data as CatalogueProduct;

  async function handleUpdate(formData: CatalogueProductInput) {
    "use server";
    return updateCatalogueProduct(id, formData);
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white px-6 py-3 flex items-center gap-4 sticky top-0 z-10 shadow-sm">
        <Link
          href="/admin/catalogue"
          className="text-sm text-gray-500 hover:text-gray-700 transition flex items-center gap-1"
        >
          ← Catalogue
        </Link>
        <span className="text-sm font-semibold text-gray-800 truncate max-w-48">
          {product.brand_name ?? product.product_name}
        </span>
        <StatusBadge status={product.status ?? "draft"} />
        <div className="ml-auto flex items-center gap-2">
          <ScriptGenerator
            defaultTopic={`${product.product_name} — why this product is perfect for Israeli retail${product.certifications.some((c) => c.toLowerCase().includes("kosher")) ? " (kosher certified)" : ""}`}
          />
          <PreviewPdfButton productId={product.id} />
        </div>
      </div>

      <CatalogueProductForm
        action={handleUpdate}
        initialData={{ ...product, id: product.id }}
      />
    </main>
  );
}
