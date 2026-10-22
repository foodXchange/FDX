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

  if (!product) return { title: "מפרט טכני למוצר | FoodXchange" };

  const cleanName = cleanProductName(product.product_name, product.category);
  const supplierName = (product.supplier as { company_name?: string } | null)?.company_name || "מפעל אירופאי מאומת";

  return {
    title: `מפרט טכני ומשטוח: ${cleanName} (${supplierName}) | FoodXchange`,
    description: `מפרט טכני, משטוח מכולות יבוא, סימון תזונתי לפי ת״י 1145 וכשרות עבור ${cleanName}. יבוא ישיר לקמעונאים ורשתות שיווק.`,
  };
}

export default async function HebrewProductSpecPage({ params }: { params: Params }) {
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
    <main dir="rtl" className="min-h-screen bg-slate-950 text-white py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Link href="/he" className="hover:text-white transition">ראשי</Link>
          <span>/</span>
          <Link href="/he/products" className="hover:text-white transition">קטלוג מוצרים</Link>
          <span>/</span>
          <span className="text-slate-200">{spec.categoryHe}</span>
          <span>/</span>
          <span className="text-orange-400 font-semibold truncate">{spec.productName}</span>
        </div>

        {/* Full Spec View Component */}
        <ProductSpecView product={product} spec={spec} isHebrew={true} />
      </div>
    </main>
  );
}
