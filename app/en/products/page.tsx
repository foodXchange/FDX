import type { Metadata } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { CATEGORY_SLUGS } from "@/lib/products/categorySlug";
import ProductsHubClient from "@/components/products/ProductsHubClient";

// Keep type exports — imported by ProductListRow, ProductCard, ProductGallery, CategoryProductsClient
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

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Kosher Food Products for Israel — European Manufacturers | FoodXchange",
  description:
    "Browse 600+ kosher-certified food products from verified European manufacturers. Olive oil, tomato products, snacks, frozen foods, and more. Chief Rabbinate certified. Request sourcing today.",
  alternates: { canonical: "https://fdx.trading/en/products" },
  openGraph: {
    title: "Kosher Food Products for Israel — European Manufacturers | FoodXchange",
    description:
      "Browse 600+ kosher-certified food products from verified European manufacturers. Chief Rabbinate certified. Request sourcing today.",
    url: "https://fdx.trading/en/products",
    type: "website",
    siteName: "FoodXchange",
  },
};

type RawStatRow = {
  category: string;
  kosher_types: string[] | null;
  supplier: { country_of_origin: string | null } | null;
};

export type ComputedCatStat = {
  count: number;
  kosher_pct: number;
  country_count: number;
  top_countries: string[];
};

export default async function ProductsPage() {
  const [{ data: statsData }, { data: catImageData }] = await Promise.all([
    supabaseAdmin
      .from("supplier_products")
      .select(
        "category, kosher_types, supplier:supplier_offerings!inner(country_of_origin)"
      )
      .or("is_published.eq.true,is_published.is.null"),
    supabaseAdmin
      .from("category_images")
      .select("category, image_url, gradient_from, gradient_to"),
  ]);

  // Compute per-category stats
  const raw: Record<string, { count: number; kosherCount: number; countries: Set<string> }> = {};

  for (const p of (statsData ?? []) as unknown as RawStatRow[]) {
    const cat = p.category;
    if (!cat) continue;
    if (!raw[cat]) raw[cat] = { count: 0, kosherCount: 0, countries: new Set() };
    raw[cat].count++;
    if ((p.kosher_types ?? []).length > 0) raw[cat].kosherCount++;
    const country = p.supplier?.country_of_origin;
    if (country) raw[cat].countries.add(country);
  }

  const stats: Record<string, ComputedCatStat> = Object.fromEntries(
    Object.entries(raw).map(([cat, s]) => [
      cat,
      {
        count: s.count,
        kosher_pct: s.count > 0 ? Math.round((s.kosherCount / s.count) * 100) : 0,
        country_count: s.countries.size,
        top_countries: Array.from(s.countries).slice(0, 3),
      },
    ])
  );

  const totalCount = Object.values(raw).reduce((sum, s) => sum + s.count, 0);

  const catImages: Record<string, { image_url: string | null; gradient_from: string; gradient_to: string }> =
    Object.fromEntries(
      (catImageData ?? []).map((r) => [
        r.category,
        { image_url: r.image_url, gradient_from: r.gradient_from, gradient_to: r.gradient_to },
      ])
    );

  const allCategories = Object.keys(CATEGORY_SLUGS);

  return (
    <main>
      {/* HERO */}
      <section
        className="text-white py-20 px-6 text-center"
        style={{ background: "#0f1923" }}
      >
        <div className="max-w-3xl mx-auto">
          <p className="text-orange-400 text-xs font-semibold tracking-widest uppercase mb-3">
            SOURCING CATALOGUE
          </p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Products we source for Israel
          </h1>
          <p className="text-slate-300 text-base mt-4 max-w-2xl mx-auto leading-relaxed">
            {totalCount}+ kosher-certified products · 17 categories · European manufacturers
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
            <span className="bg-white/10 text-slate-300 text-sm px-4 py-2 rounded-full">
              ✡ All kosher certified
            </span>
            <span className="bg-white/10 text-slate-300 text-sm px-4 py-2 rounded-full">
              Private label available
            </span>
            <span className="bg-white/10 text-slate-300 text-sm px-4 py-2 rounded-full">
              BRC · IFS · Organic
            </span>
            <span className="bg-white/10 text-slate-300 text-sm px-4 py-2 rounded-full">
              Request any product
            </span>
          </div>
        </div>
      </section>

      <ProductsHubClient
        allCategories={allCategories}
        stats={stats}
        catImages={catImages}
      />
    </main>
  );
}
