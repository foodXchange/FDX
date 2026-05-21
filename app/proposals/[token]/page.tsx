import type { Metadata } from "next";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getCard } from "@/lib/contactCards";
import ProposalTracker from "@/components/ProposalTracker";
import ProposalProductView from "@/components/ProposalProductView";
import ProposalRequestButton from "@/components/ProposalRequestButton";

export const dynamic = "force-dynamic";

type Params = Promise<{ token: string }>;

type ProposalProduct = {
  id: string;
  product_name: string;
  brand_name: string | null;
  tagline: string | null;
  category: string;
  format: string | null;
  size: string | null;
  country_of_origin: string | null;
  certifications: string[];
  catalogue_image_url: string | null;
  tags: string[];
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

const COUNTRY_FLAG: Record<string, string> = {
  Spain: "🇪🇸",
  Italy: "🇮🇹",
  France: "🇫🇷",
  Portugal: "🇵🇹",
  Greece: "🇬🇷",
  Turkey: "🇹🇷",
  Morocco: "🇲🇦",
  Israel: "🇮🇱",
  Germany: "🇩🇪",
  Netherlands: "🇳🇱",
  Poland: "🇵🇱",
};

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { token } = await params;
  const { data } = await supabase
    .from("proposals")
    .select("title, buyer_name")
    .eq("token", token)
    .eq("status", "active")
    .single();

  const title = data?.title
    ? `${data.title} | FoodXchange`
    : "Product Selection | FoodXchange";

  return {
    title,
    description: "Personalised product selection from FoodXchange — strategic food sourcing for the Israeli market.",
    robots: { index: false, follow: false },
  };
}

export default async function ProposalPage({ params }: { params: Params }) {
  const { token } = await params;
  const udi = getCard("udi");
  const waNumber = udi?.whatsapp ?? "972525222291";
  const waHref = `https://wa.me/${waNumber}?text=${encodeURIComponent("Hi, I'd like to know more about the products in the proposal.")}`;

  const { data: proposal } = await supabase
    .from("proposals")
    .select("*")
    .eq("token", token)
    .eq("status", "active")
    .single();

  if (!proposal) {
    return (
      <main className="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-16 text-center">
        <p className="text-4xl mb-4">📦</p>
        <h1 className="text-2xl font-semibold text-slate-900 mb-3">
          This proposal has expired
        </h1>
        <p className="text-slate-500 mb-8">
          Contact us to request a new selection.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-green-500 hover:bg-green-600 text-white font-semibold px-6 py-3 rounded-xl transition"
          >
            WhatsApp us
          </a>
          <Link
            href="/en/products"
            className="border border-slate-200 text-slate-600 hover:border-orange-400 hover:text-orange-600 font-semibold px-6 py-3 rounded-xl transition"
          >
            Browse products
          </Link>
        </div>
      </main>
    );
  }

  // Fetch products in the exact product_ids order
  const productIds = proposal.product_ids as string[];
  const { data: rawProducts } = await supabase
    .from("catalogue_products")
    .select(
      "id,product_name,brand_name,tagline,category,format,size,country_of_origin,certifications,catalogue_image_url,tags"
    )
    .in("id", productIds)
    .eq("status", "ready");

  const products = productIds
    .map((id: string) => rawProducts?.find((p) => p.id === id))
    .filter((p): p is ProposalProduct => p !== undefined);

  return (
    <main className="bg-white min-h-screen pb-24">
      <ProposalTracker token={token} />

      {/* STICKY HEADER */}
      <div className="sticky top-0 bg-white border-b border-slate-100 shadow-sm py-3 px-4 flex items-center justify-between z-10">
        <span className="font-semibold text-base text-slate-900">
          Food<span className="text-orange-500">X</span>change
        </span>
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-green-500 hover:bg-green-600 text-white text-xs px-3 py-2 rounded-lg transition flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          WhatsApp us
        </a>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* PERSONAL MESSAGE */}
        {proposal.personal_message && (
          <div className="bg-orange-50 border border-orange-100 rounded-2xl p-5 mx-4 mt-4">
            <p className="text-xs font-semibold text-orange-600 uppercase tracking-wider mb-1">
              For {proposal.buyer_name}
            </p>
            <p className="text-slate-700 text-sm leading-relaxed">
              {proposal.personal_message}
            </p>
          </div>
        )}

        {/* PRODUCT LIST */}
        <div className="space-y-6 px-4 py-6">
          {products.map((product) => {
            const emoji = CATEGORY_EMOJI[product.category] ?? "📦";
            const flag = product.country_of_origin
              ? (COUNTRY_FLAG[product.country_of_origin] ?? "🌍")
              : null;

            return (
              <ProposalProductView
                key={product.id}
                token={token}
                productId={product.id}
              >
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  {/* Image */}
                  <div className="aspect-[4/3] bg-white flex items-center justify-center p-6">
                    {product.catalogue_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.catalogue_image_url}
                        alt={`${product.brand_name ?? ""} ${product.product_name}`}
                        className="max-h-[280px] object-contain"
                      />
                    ) : (
                      <span className="text-7xl text-slate-200">{emoji}</span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-5">
                    {product.brand_name && (
                      <p className="text-xs font-semibold text-orange-600 uppercase tracking-wider mb-1">
                        {product.brand_name}
                      </p>
                    )}
                    <h2 className="text-2xl font-bold text-slate-900 mb-2 leading-snug">
                      {product.product_name}
                    </h2>

                    {/* Format + country */}
                    {(product.format || flag) && (
                      <p className="text-sm text-slate-500 mb-3">
                        {[product.format, flag && product.country_of_origin
                          ? `${flag} ${product.country_of_origin}`
                          : null]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}

                    {/* Certifications */}
                    {product.certifications.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {product.certifications.map((cert) => {
                          const lower = cert.toLowerCase();
                          const cls = lower.includes("kosher")
                            ? "bg-blue-50 text-blue-700 border-blue-100"
                            : lower.includes("halal")
                            ? "bg-green-50 text-green-700 border-green-100"
                            : lower.includes("organic")
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                            : "bg-slate-50 text-slate-600 border-slate-200";
                          return (
                            <span
                              key={cert}
                              className={`text-xs rounded-full px-3 py-1 border ${cls}`}
                            >
                              {cert}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {/* Tagline */}
                    {product.tagline && (
                      <p className="text-slate-600 text-sm italic mt-3 border-l-2 border-orange-300 pl-3">
                        {product.tagline}
                      </p>
                    )}

                    {/* Request button */}
                    <ProposalRequestButton
                      token={token}
                      product={product}
                    />
                  </div>
                </div>
              </ProposalProductView>
            );
          })}
        </div>
      </div>

      {/* STICKY BOTTOM CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-4 flex gap-3 z-10">
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-xl text-center text-sm transition"
        >
          Questions? WhatsApp us
        </a>
        <Link
          href="/en/products"
          className="flex-1 border border-slate-200 text-slate-600 hover:border-orange-400 font-semibold py-3 rounded-xl text-center text-sm transition"
        >
          See all products
        </Link>
      </div>
    </main>
  );
}
