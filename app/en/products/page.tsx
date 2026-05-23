import type { Metadata } from "next";
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { CATEGORY_SLUGS, toCategorySlug } from "@/lib/products/categorySlug";
import { CATEGORY_COLORS } from "@/lib/products/cleanProductName";

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

const COUNTRY_FLAG: Record<string, string> = {
  Spain: "🇪🇸", Italy: "🇮🇹", France: "🇫🇷", Portugal: "🇵🇹", Greece: "🇬🇷",
  Turkey: "🇹🇷", Morocco: "🇲🇦", Israel: "🇮🇱", Germany: "🇩🇪", Netherlands: "🇳🇱",
  Poland: "🇵🇱", Belgium: "🇧🇪", Ukraine: "🇺🇦", Romania: "🇷🇴", Bulgaria: "🇧🇬",
};

type RawStatRow = {
  category: string;
  kosher_types: string[] | null;
  supplier: { country_of_origin: string | null } | null;
};

type ComputedCatStat = {
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
      .eq("is_published", true),
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
    <main className="bg-white text-slate-900">
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

      {/* CATEGORY GRID */}
      <section className="max-w-7xl mx-auto px-6 py-14">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-6">
          Browse by category
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {allCategories.map((cat) => {
            const slug = toCategorySlug(cat);
            const stat = stats[cat];
            const img = catImages[cat];
            const catColor = CATEGORY_COLORS[cat] ?? "#888780";
            const gradient = img?.gradient_from && img?.gradient_to
              ? `linear-gradient(135deg, ${img.gradient_from}, ${img.gradient_to})`
              : `linear-gradient(135deg, ${catColor}cc, ${catColor}66)`;
            const topFlags = (stat?.top_countries ?? [])
              .map((c) => COUNTRY_FLAG[c] ?? "🌍")
              .join(" ");

            return (
              <Link
                key={cat}
                href={`/en/products/${slug}`}
                className="group block rounded-2xl overflow-hidden border border-slate-100 hover:border-orange-300 hover:shadow-xl transition-all duration-300"
                style={{ transform: "scale(1)", willChange: "transform" }}
              >
                {/* Image area — 160px */}
                <div className="relative overflow-hidden" style={{ height: 160 }}>
                  {/* Gradient base */}
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ background: gradient }}
                  >
                    <span className="text-white font-semibold text-sm px-3 text-center drop-shadow">
                      {cat}
                    </span>
                  </div>
                  {/* Image on top */}
                  {img?.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={img.image_url}
                      alt={cat}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  )}
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  {/* Orange bottom border on hover */}
                  <div
                    className="absolute bottom-0 left-0 right-0 h-0.5 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"
                    style={{ backgroundColor: "#f97316" }}
                  />
                </div>

                {/* Card footer */}
                <div className="bg-white px-4 py-3">
                  <p className="text-[13px] font-medium text-slate-900 leading-snug mb-0.5">
                    {cat}
                  </p>
                  {stat ? (
                    <>
                      <p className="text-[11px] text-slate-400">
                        {stat.count} product{stat.count !== 1 ? "s" : ""}{stat.country_count > 0 ? ` · ${stat.country_count} countr${stat.country_count !== 1 ? "ies" : "y"}` : ""}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[11px] text-green-600 font-medium">
                          ✡ {stat.kosher_pct === 100 ? "All kosher" : `${stat.kosher_pct}% kosher`}
                        </span>
                        {topFlags && (
                          <span className="text-sm">{topFlags}</span>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="text-[11px] text-slate-400">Explore products</p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Below grid CTA */}
      <section className="border-t border-slate-100 py-12 px-6 text-center">
        <p className="text-slate-600 text-sm mb-1">Can&apos;t find what you need?</p>
        <Link
          href="/en/buyers"
          className="text-orange-600 hover:text-orange-700 font-semibold text-sm transition"
        >
          Submit a sourcing request and we find it for you →
        </Link>
      </section>
    </main>
  );
}
