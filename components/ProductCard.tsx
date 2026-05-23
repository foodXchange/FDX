"use client";

import type { PublicCatalogueProduct } from "@/app/en/products/page";
import { cleanProductName, CATEGORY_COLORS } from "@/lib/products/cleanProductName";

export interface ProductCardProps {
  product: PublicCatalogueProduct;
  onRequest: (product: PublicCatalogueProduct) => void;
}

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
  Belgium: "🇧🇪",
  Ukraine: "🇺🇦",
  Romania: "🇷🇴",
  Bulgaria: "🇧🇬",
};

function certChipCls(cert: string): string {
  const lower = cert.toLowerCase();
  if (
    lower.includes("brc") ||
    lower.includes("ifs") ||
    lower.includes("fssc") ||
    lower.includes("iso")
  )
    return "bg-blue-500/10 text-blue-400 border-blue-500/20";
  if (lower.includes("organic")) return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  if (lower.includes("halal")) return "bg-green-500/10 text-green-400 border-green-500/20";
  return "bg-white/6 text-slate-400 border-white/10";
}

export default function ProductCard({ product, onRequest }: ProductCardProps) {
  const color = CATEGORY_COLORS[product.category] ?? "#888780";
  const country = product.supplier?.country_of_origin ?? null;
  const flag = country ? (COUNTRY_FLAG[country] ?? "🌍") : null;
  const kosherType = product.kosher_types?.[0] ?? null;
  const displayCerts = product.certifications
    .filter((c) => !product.kosher_types.includes(c))
    .slice(0, 2);
  const displayName = cleanProductName(product.product_name, product.category);

  return (
    <div className="group relative bg-dark-700 rounded-2xl overflow-hidden border border-dark-border hover:border-orange-500/40 hover:shadow-xl hover:shadow-black/40 transition-all duration-300 flex flex-col">
      {/* Category color top bar */}
      <div style={{ height: 6, backgroundColor: color }} />

      {/* PRODUCT INFO */}
      <div className="p-4 flex flex-col gap-1 flex-1 relative">
        {/* Kosher badge */}
        {kosherType && (
          <span className="badge-kosher absolute top-4 right-4">
            ✡ {kosherType}
          </span>
        )}

        {/* Private label badge */}
        {product.private_label && (
          <span className="self-start bg-white/10 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full mb-1">
            Private label
          </span>
        )}

        <p className="text-base font-semibold text-dark-text-primary leading-snug line-clamp-2 pr-16">
          {displayName}
        </p>

        {product.supplier && (
          <p className="text-xs text-slate-400">
            {product.supplier.company_name}
            {country ? ` · ${flag ?? country}` : ""}
          </p>
        )}

        {/* Certifications */}
        {displayCerts.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {displayCerts.map((cert) => (
              <span
                key={cert}
                className={`text-[10px] rounded-full px-2 py-0.5 border ${certChipCls(cert)}`}
              >
                {cert}
              </span>
            ))}
          </div>
        )}

        {/* Request button */}
        <button
          type="button"
          onClick={() => onRequest(product)}
          className="mt-3 w-full py-2.5 rounded-xl border border-brand-border text-orange-400 font-semibold text-sm hover:bg-brand hover:text-white hover:border-transparent transition duration-200"
        >
          Request →
        </button>
      </div>

      {/* Hover overlay (desktop) */}
      <div className="absolute inset-0 bg-dark-900/90 opacity-0 group-hover:opacity-100 transition-opacity duration-300 hidden md:flex items-center justify-center rounded-2xl">
        <button
          type="button"
          onClick={() => onRequest(product)}
          className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-xl text-sm transition transform scale-95 group-hover:scale-100"
        >
          Request this product
        </button>
      </div>
    </div>
  );
}
