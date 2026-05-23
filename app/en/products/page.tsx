import type { Metadata } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import ProductGallery from "@/components/ProductGallery";

export const revalidate = 0;

export type PublicCatalogueProduct = {
  id: string;
  product_name: string;
  category: string;
  kosher_types: string[];
  certifications: string[];
  formats: string[];
  description: string | null;
  private_label: boolean;
  scrape_confidence: number;
  supplier: {
    id: string;
    company_name: string;
    country_of_origin: string | null;
    status: string | null;
  } | null;
};

export type CategoryImageData = {
  image_url: string | null;
  gradient_from: string;
  gradient_to: string;
};

export const metadata: Metadata = {
  title: "Products We Source | FoodXchange",
  description:
    "Browse food products available for import to Israel — olive oils, tuna, sauces, spices, and more. All kosher certified options available. Request any product directly.",
  alternates: {
    canonical: "https://fdx.trading/en/products",
  },
  openGraph: {
    title: "Products We Source | FoodXchange",
    description:
      "Browse food products available for import to Israel — olive oils, tuna, sauces, spices, and more. All kosher certified options available. Request any product directly.",
    url: "https://fdx.trading/en/products",
    type: "website",
    siteName: "FoodXchange",
  },
};

export default async function ProductsPage() {
  const [{ data, error }, { count: totalCount }, { data: catImageData }] =
    await Promise.all([
      supabaseAdmin
        .from("supplier_products")
        .select(
          `id,
           product_name,
           category,
           kosher_types,
           certifications,
           formats,
           description,
           private_label,
           scrape_confidence,
           supplier:supplier_offerings!inner(
             id,
             company_name,
             country_of_origin,
             status
           )`
        )
        .eq("is_published", true)
        .not("kosher_types", "eq", "{}")
        .order("scrape_confidence", { ascending: false })
        .limit(1000),
      supabaseAdmin
        .from("supplier_products")
        .select("*", { count: "exact", head: true })
        .eq("is_published", true)
        .not("kosher_types", "eq", "{}"),
      supabaseAdmin
        .from("category_images")
        .select("category, image_url, gradient_from, gradient_to"),
    ]);

  console.log("Products fetched:", data?.length, "total:", totalCount, error);

  const products = (data ?? []) as unknown as PublicCatalogueProduct[];
  const displayCount = totalCount ?? products.length;

  const categoryImages: Record<string, CategoryImageData> = Object.fromEntries(
    (catImageData ?? []).map((r) => [
      r.category,
      {
        image_url: r.image_url,
        gradient_from: r.gradient_from,
        gradient_to: r.gradient_to,
      },
    ])
  );

  return (
    <main className="bg-white text-slate-900">
      {/* HERO */}
      <section className="bg-linear-to-b from-slate-900 to-slate-800 text-white py-20 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <p className="text-orange-400 text-xs font-semibold tracking-widest uppercase mb-3">
            SOURCING CATALOGUE
          </p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Products we source for Israel
          </h1>
          <p className="text-slate-300 text-lg mt-4 max-w-2xl mx-auto leading-relaxed">
            Premium food products from verified European manufacturers — olive
            oils, seafood, sauces, spices, and more. All with kosher options.
            Request any product and we handle everything.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
            <span className="bg-white/10 text-slate-300 text-sm px-4 py-2 rounded-full">
              {displayCount} kosher product{displayCount !== 1 ? "s" : ""}
            </span>
            <span className="bg-white/10 text-slate-300 text-sm px-4 py-2 rounded-full">
              Kosher certified
            </span>
            <span className="bg-white/10 text-slate-300 text-sm px-4 py-2 rounded-full">
              Private label on request
            </span>
          </div>
        </div>
      </section>

      <ProductGallery products={products} categoryImages={categoryImages} />
    </main>
  );
}
