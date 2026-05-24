import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { slugToCategory, SLUG_TO_CATEGORY } from "@/lib/products/categorySlug";
import { CATEGORY_COLORS } from "@/lib/products/cleanProductName";
import CategoryProductsClient from "@/components/products/CategoryProductsClient";
import type { PublicCatalogueProduct, CategoryImageData } from "@/app/en/products/page";

export const revalidate = 3600;

type Params = Promise<{ slug: string }>;

const COUNTRY_FLAG: Record<string, string> = {
  Spain: "🇪🇸", Italy: "🇮🇹", France: "🇫🇷", Portugal: "🇵🇹", Greece: "🇬🇷",
  Turkey: "🇹🇷", Morocco: "🇲🇦", Israel: "🇮🇱", Germany: "🇩🇪", Netherlands: "🇳🇱",
  Poland: "🇵🇱", Belgium: "🇧🇪", Ukraine: "🇺🇦", Romania: "🇷🇴", Bulgaria: "🇧🇬",
};

export function generateStaticParams() {
  return Object.keys(SLUG_TO_CATEGORY).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const category = slugToCategory(slug);
  if (!category) return { title: "Products | FoodXchange" };

  const canonical = `https://fdx.trading/en/products/${slug}`;
  const { count } = await supabaseAdmin
    .from("supplier_products")
    .select("*", { count: "exact", head: true })
    .or("is_published.eq.true,is_published.is.null")
    .eq("category", category);

  const title = `Kosher ${category} Suppliers for Israel — FoodXchange`;
  const description = `${count ?? ""} kosher-certified ${category} products from verified European manufacturers. Chief Rabbinate certification. Private label available. Request sourcing today.`.trim();

  const { data: catImg } = await supabaseAdmin
    .from("category_images")
    .select("image_url, image_alt")
    .eq("category", category)
    .single();

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      siteName: "FoodXchange",
      images: catImg?.image_url ? [{ url: catImg.image_url, alt: catImg.image_alt ?? title }] : [],
    },
  };
}

export default async function CategoryProductsPage({ params }: { params: Params }) {
  const { slug } = await params;
  const category = slugToCategory(slug);
  if (!category) redirect("/en/products");

  const [{ data: rawProducts }, { data: catImageRaw }] = await Promise.all([
    supabaseAdmin
      .from("supplier_products")
      .select(
        `id, product_name, category, kosher_types, certifications, formats,
         description, private_label, scrape_confidence,
         supplier:supplier_offerings!inner(id, company_name, country_of_origin, status)`
      )
      .or("is_published.eq.true,is_published.is.null")
      .eq("category", category)
      .order("scrape_confidence", { ascending: false }),
    supabaseAdmin
      .from("category_images")
      .select("image_url, gradient_from, gradient_to, image_alt")
      .eq("category", category)
      .single(),
  ]);

  const products = (rawProducts ?? []) as unknown as PublicCatalogueProduct[];
  const catImage: CategoryImageData | null = catImageRaw
    ? {
        image_url: catImageRaw.image_url,
        gradient_from: catImageRaw.gradient_from,
        gradient_to: catImageRaw.gradient_to,
      }
    : null;

  // Compute hero stats
  const countries = new Set(
    products
      .map((p) => p.supplier?.country_of_origin)
      .filter((c): c is string => !!c)
  );
  const topCountries = Array.from(countries).slice(0, 4);
  const catColor = CATEGORY_COLORS[category] ?? "#888780";
  const gradient = catImage
    ? `linear-gradient(135deg, ${catImage.gradient_from}, ${catImage.gradient_to})`
    : `linear-gradient(135deg, ${catColor}cc, ${catColor}88)`;

  return (
    <main>
      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-6 pt-5 pb-2">
        <nav className="text-sm text-slate-400 flex items-center gap-2">
          <Link href="/en/products" className="hover:text-orange-400 transition">
            ← All categories
          </Link>
          <span className="text-slate-600">›</span>
          <span className="text-slate-200 font-medium">{category}</span>
        </nav>
      </div>

      {/* Category hero */}
      <div className="relative overflow-hidden mx-6 rounded-2xl mb-0" style={{ height: 180 }}>
        {/* Gradient base */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: gradient }}
        />

        {/* Category image on top */}
        {catImage?.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={catImage.image_url}
            alt={category}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {/* Dark overlay + text */}
        <div className="absolute inset-0 bg-black/50 flex flex-col items-start justify-end px-8 pb-6">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-1">{category}</h1>
          <div className="flex items-center gap-3 text-white/80 text-sm">
            <span>
              {products.length} product{products.length !== 1 ? "s" : ""}
            </span>
            {countries.size > 0 && (
              <>
                <span>·</span>
                <span>{countries.size} countr{countries.size !== 1 ? "ies" : "y"}</span>
              </>
            )}
            {topCountries.length > 0 && (
              <>
                <span>·</span>
                <span>
                  {topCountries.map((c) => COUNTRY_FLAG[c] ?? "🌍").join(" ")}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Client component — all filtering, sorting, pagination, AI search, modal */}
      <CategoryProductsClient
        products={products}
        category={category}
        categoryImage={catImage}
      />

      {/* Bottom CTA */}
      <section className="bg-slate-900 py-12 px-6 text-center mt-8">
        <p className="text-orange-400 text-xs font-semibold uppercase tracking-wider mb-2">
          NEED SOMETHING ELSE?
        </p>
        <h2 className="text-xl font-bold text-white mb-2">Browse all categories</h2>
        <p className="text-slate-400 text-sm mb-6 max-w-md mx-auto">
          Hundreds of verified kosher food products from European manufacturers.
        </p>
        <Link
          href="/en/products"
          className="inline-flex bg-orange-500 hover:bg-orange-600 text-white font-semibold px-7 py-3 rounded-xl text-sm transition"
        >
          View all categories →
        </Link>
      </section>
    </main>
  );
}
