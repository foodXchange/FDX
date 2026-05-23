import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ProductRequestButton from "@/components/ProductRequestButton";

export const revalidate = 3600;

type Params = Promise<{ id: string }>;

type CatalogueProduct = {
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
  private_label?: string | null;
  internal_notes?: string | null;
};

const CATEGORY_EMOJI: Record<string, string> = {
  "Oils & Fats": "🫒",
  "Fish & Seafood": "🐟",
  "Sauces & Condiments": "🍯",
  "Tomato Products": "🍅",
  Snacks: "🍿",
  "Spices & Herbs": "🌿",
  "Canned Foods": "🥫",
  Dairy: "🧀",
  Bakery: "🥖",
};

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { id } = await params;
  const { data } = await supabase
    .from("catalogue_products")
    .select("product_name,brand_name,tagline,catalogue_image_url")
    .eq("id", id)
    .eq("status", "ready")
    .single();

  const canonical = `https://fdx.trading/en/products/${id}`;

  if (!data) return { title: "Product | FoodXchange", alternates: { canonical } };

  const name = [data.brand_name, data.product_name].filter(Boolean).join(" ");
  const title = `${name} | FoodXchange Products`;
  const description = data.tagline
    ? `${data.tagline}. Available for import to Israel. Kosher options available.`
    : `${name}. Available for import to Israel. Kosher options available.`;

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
      images: data.catalogue_image_url
        ? [{ url: data.catalogue_image_url as string }]
        : [],
    },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;

  const { data } = await supabase
    .from("catalogue_products")
    .select("*")
    .eq("id", id)
    .eq("status", "ready")
    .single();

  if (!data) notFound();

  const product = data as CatalogueProduct;

  const { data: relatedData } = await supabase
    .from("catalogue_products")
    .select(
      "id,product_name,brand_name,catalogue_image_url,category,format,certifications,featured,subcategory,country_of_origin,tagline,size,tags"
    )
    .eq("status", "ready")
    .eq("category", product.category)
    .neq("id", id)
    .limit(4);

  const related = (relatedData ?? []) as CatalogueProduct[];

  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.product_name,
    brand: product.brand_name
      ? { "@type": "Brand", name: product.brand_name }
      : undefined,
    description: product.tagline ?? undefined,
    image: product.catalogue_image_url ?? undefined,
    offers: {
      "@type": "Offer",
      availability: "https://schema.org/InStock",
      seller: {
        "@type": "Organization",
        name: "FoodXchange",
      },
    },
  });

  const emoji = CATEGORY_EMOJI[product.category] ?? "📦";

  const details: { label: string; value: string }[] = [
    { label: "Category", value: product.category },
    product.subcategory ? { label: "Subcategory", value: product.subcategory } : null,
    product.format ? { label: "Format", value: product.format } : null,
    product.size ? { label: "Size", value: product.size } : null,
    product.country_of_origin
      ? { label: "Origin", value: product.country_of_origin }
      : null,
  ].filter((d): d is { label: string; value: string } => d !== null);

  return (
    <main className="bg-white text-slate-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />

      {/* Breadcrumb */}
      <div className="max-w-6xl mx-auto px-6 pt-6">
        <nav className="text-sm text-slate-500 flex items-center gap-2">
          <Link href="/en/products" className="hover:text-orange-600 transition">
            Products
          </Link>
          <span>›</span>
          <span className="text-slate-400">{product.category}</span>
        </nav>
      </div>

      {/* TWO-COLUMN LAYOUT */}
      <div className="max-w-6xl mx-auto px-6 py-8 grid lg:grid-cols-2 gap-12">
        {/* LEFT — product image */}
        <div className="rounded-2xl overflow-hidden bg-white border border-slate-100 p-8 aspect-square flex items-center justify-center relative">
          {product.catalogue_image_url ? (
            <Image
              src={product.catalogue_image_url}
              alt={`${product.brand_name ?? ""} ${product.product_name}`}
              fill
              className="object-contain p-8"
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-300">
              <span className="text-7xl">{emoji}</span>
              <span className="text-sm mt-3">Image coming soon</span>
            </div>
          )}
        </div>

        {/* RIGHT — product details */}
        <div className="flex flex-col justify-center">
          {product.brand_name && (
            <p className="text-orange-600 text-sm font-semibold uppercase tracking-wider mb-2">
              {product.brand_name}
            </p>
          )}
          <h1 className="text-4xl font-bold text-slate-900 mb-3 leading-tight">
            {product.product_name}
          </h1>
          {product.tagline && (
            <p className="text-slate-500 text-lg italic mb-6">{product.tagline}</p>
          )}

          {/* Details */}
          <div className="space-y-2 mb-6">
            {details.map((d) => (
              <div key={d.label} className="flex gap-3 text-sm">
                <span className="text-slate-400 w-24 shrink-0">{d.label}</span>
                <span className="text-slate-700 font-medium">{d.value}</span>
              </div>
            ))}
          </div>

          {/* Certifications */}
          {product.certifications.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {product.certifications.map((cert) => {
                const lower = cert.toLowerCase();
                const cls = lower.includes("kosher")
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : lower.includes("halal")
                  ? "bg-green-50 text-green-700 border-green-200"
                  : lower.includes("organic")
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-slate-50 text-slate-600 border-slate-200";
                return (
                  <span
                    key={cert}
                    className={`text-sm rounded-full px-4 py-1.5 border font-medium ${cls}`}
                  >
                    {cert}
                  </span>
                );
              })}
            </div>
          )}

          {/* Private label badge */}
          {product.private_label && product.private_label !== "No" && (
            <div className="bg-purple-50 border border-purple-100 text-purple-700 px-4 py-2 rounded-xl text-sm mb-6 inline-flex items-center gap-2 self-start">
              🏷️ Private label available
            </div>
          )}

          {/* Request button + share */}
          <ProductRequestButton product={product} />
        </div>
      </div>

      {/* RELATED PRODUCTS */}
      {related.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 pb-16 pt-4">
          <div className="border-t border-slate-100 pt-12">
            <h2 className="text-xl font-semibold text-slate-900 mb-6">
              More in {product.category}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {related.map((p) => (
                <Link
                  key={p.id}
                  href={`/en/products/${p.id}`}
                  className="block group bg-white rounded-2xl overflow-hidden border border-slate-100 hover:border-orange-300 hover:shadow-lg transition-all duration-300"
                >
                  <div className="aspect-square bg-linear-to-br from-slate-50 to-slate-100 flex items-center justify-center">
                    {p.catalogue_image_url ? (
                      <Image
                        src={p.catalogue_image_url}
                        alt={p.product_name}
                        width={200}
                        height={200}
                        className="object-contain p-4"
                      />
                    ) : (
                      <span className="text-4xl text-slate-300">
                        {CATEGORY_EMOJI[p.category] ?? "📦"}
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    {p.brand_name && (
                      <p className="text-[10px] text-orange-600 font-semibold uppercase tracking-wider">
                        {p.brand_name}
                      </p>
                    )}
                    <p className="text-sm font-semibold text-slate-900 leading-snug line-clamp-2">
                      {p.product_name}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* BOTTOM CTA */}
      <section className="bg-slate-900 py-16 px-6 text-center">
        <p className="text-orange-400 text-xs font-semibold uppercase tracking-wider mb-2">
          NEED SOMETHING ELSE?
        </p>
        <h2 className="text-2xl font-bold text-white mb-3">
          Browse our full catalogue
        </h2>
        <p className="text-slate-400 text-sm mb-8 max-w-md mx-auto">
          Hundreds of verified food products from European manufacturers,
          available for import to Israel.
        </p>
        <Link
          href="/en/products"
          className="inline-flex bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8 py-4 rounded-xl text-sm transition"
        >
          View all products →
        </Link>
      </section>
    </main>
  );
}
