import type { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import ProductGallery from "@/components/ProductGallery";

export const revalidate = 3600;

export type PublicCatalogueProduct = {
  id: string;
  product_name: string;
  brand_name: string | null;
  tagline: string | null;
  category: string;
  subcategory: string | null;
  format: string | null;
  size: string | null;
  country_of_origin: string | null;
  certifications: string[];
  catalogue_image_url: string | null;
  featured: boolean;
  tags: string[];
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
  const { data } = await supabase
    .from("catalogue_products")
    .select(
      "id,product_name,brand_name,tagline,category,subcategory,format,size,country_of_origin,certifications,catalogue_image_url,featured,tags"
    )
    .eq("status", "ready")
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false });

  const products = (data ?? []) as PublicCatalogueProduct[];

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
              {products.length} product{products.length !== 1 ? "s" : ""}
            </span>
            <span className="bg-white/10 text-slate-300 text-sm px-4 py-2 rounded-full">
              Kosher options available
            </span>
            <span className="bg-white/10 text-slate-300 text-sm px-4 py-2 rounded-full">
              Private label on request
            </span>
          </div>
        </div>
      </section>

      <ProductGallery products={products} />
    </main>
  );
}
