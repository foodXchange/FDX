"use client";

import Image from "next/image";
import type { PublicCatalogueProduct } from "@/app/en/products/page";

export interface ProductCardProps {
  product: PublicCatalogueProduct;
  onRequest: (product: PublicCatalogueProduct) => void;
}

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

function certColor(cert: string): string {
  const lower = cert.toLowerCase();
  if (lower.includes("kosher")) return "bg-blue-50 text-blue-700 border-blue-100";
  if (lower.includes("halal")) return "bg-green-50 text-green-700 border-green-100";
  if (lower.includes("organic")) return "bg-emerald-50 text-emerald-700 border-emerald-100";
  return "bg-slate-50 text-slate-600 border-slate-200";
}

export default function ProductCard({ product, onRequest }: ProductCardProps) {
  const emoji = CATEGORY_EMOJI[product.category] ?? "📦";
  const flag = product.country_of_origin
    ? (COUNTRY_FLAG[product.country_of_origin] ?? "🌍")
    : null;

  return (
    <div className="group relative bg-white rounded-2xl overflow-hidden border border-slate-100 hover:border-orange-300 hover:shadow-xl transition-all duration-300 flex flex-col cursor-pointer">
      {/* IMAGE AREA */}
      <div className="aspect-[3/4] bg-white relative overflow-hidden flex items-center justify-center p-4">
        {product.catalogue_image_url ? (
          <Image
            src={product.catalogue_image_url}
            alt={`${product.brand_name ?? ""} ${product.product_name}`}
            fill
            className="object-contain transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          />
        ) : (
          <div className="absolute inset-0 bg-linear-to-br from-slate-50 to-slate-100 flex flex-col items-center justify-center">
            <span className="text-5xl text-slate-300">{emoji}</span>
            <span className="text-xs text-slate-400 mt-2">Image coming soon</span>
          </div>
        )}

        {/* Featured badge */}
        {product.featured && (
          <div className="absolute top-3 left-3 bg-orange-500 text-white text-xs font-semibold px-3 py-1 rounded-full z-10">
            ★ Featured
          </div>
        )}

        {/* Country flag */}
        {flag && (
          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 text-xs text-slate-600 font-medium shadow-sm z-10">
            {flag}
          </div>
        )}

        {/* Hover overlay (desktop only) */}
        <div className="absolute inset-0 bg-slate-900/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 hidden md:flex items-center justify-center z-20">
          <button
            type="button"
            onClick={() => onRequest(product)}
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-xl text-sm transition transform scale-95 group-hover:scale-100"
          >
            Request this product
          </button>
        </div>
      </div>

      {/* PRODUCT INFO */}
      <div className="p-4 flex flex-col gap-1 flex-1">
        {product.brand_name && (
          <p className="text-xs font-semibold text-orange-600 uppercase tracking-wider">
            {product.brand_name}
          </p>
        )}
        <p className="text-base font-semibold text-slate-900 leading-snug">
          {product.product_name}
        </p>
        {(product.format || product.size) && (
          <p className="text-xs text-slate-500">
            {[product.format, product.size].filter(Boolean).join(" · ")}
          </p>
        )}

        {/* Certifications */}
        {product.certifications.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {product.certifications.slice(0, 3).map((cert) => (
              <span
                key={cert}
                className={`text-[10px] rounded-full px-2 py-0.5 border ${certColor(cert)}`}
              >
                {cert}
              </span>
            ))}
          </div>
        )}

        {/* Mobile request button */}
        <button
          type="button"
          onClick={() => onRequest(product)}
          className="mt-3 w-full py-2.5 rounded-xl border-2 border-orange-500 text-orange-600 font-semibold text-sm hover:bg-orange-500 hover:text-white transition duration-200 md:hidden"
        >
          Request this product
        </button>
      </div>
    </div>
  );
}
