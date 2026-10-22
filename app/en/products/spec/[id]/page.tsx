import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { generateProductSpec } from "@/lib/products/specGenerator";
import { cleanProductName } from "@/lib/products/cleanProductName";
import ProductSpecView from "@/components/products/ProductSpecView";
import type { PublicCatalogueProduct } from "@/app/en/products/page";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const { data: product } = await supabaseAdmin
    .from("supplier_products")
    .select("product_name, category, supplier:supplier_offerings(company_name, country_of_origin)")
    .eq("id", id)
    .maybeSingle();

  if (!product) return { title: "Product Technical Specification | FoodXchange" };

  const cleanName = cleanProductName(product.product_name, product.category);
  const supplierName = (product.supplier as { company_name?: string } | null)?.company_name || "Verified European Plant";

  return {
    title: `Technical Spec & Palletization: ${cleanName} (${supplierName}) | FoodXchange`,
    description: `Palletization matrix, container capacity (20ft/40ft), nutritional facts, and certifications for ${cleanName}. Direct B2B import for supermarket retail.`,
  };
}

export default async function EnglishProductSpecPage({ params }: { params: Params }) {
  const { id } = await params;

  const { data: rawProduct } = await supabaseAdmin
    .from("supplier_products")
    .select(
      `id, product_name, category, image_url, kosher_types, certifications, formats, sizes,
       description, private_label, scrape_confidence, shelf_life_months,
       supplier:supplier_offerings(id, company_name, country_of_origin)`
    )
    .eq("id", id)
    .maybeSingle();

  if (!rawProduct) {
    notFound();
  }

  const product = rawProduct as unknown as PublicCatalogueProduct;
  const spec = generateProductSpec(product);

  return (
    <main className="min-h-screen bg-slate-950 text-white py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Link href="/en" className="hover:text-white transition">Home</Link>
          <span>/</span>
          <Link href="/en/products" className="hover:text-white transition">Products Catalog</Link>
          <span>/</span>
          <span className="text-slate-200">{spec.category}</span>
          <span>/</span>
          <span className="text-orange-400 font-semibold truncate">{spec.productName}</span>
        </div>

        {/* Full Spec View Component */}
        <ProductSpecView product={product} spec={spec} isHebrew={false} />
      </div>
    </main>
  );
}
