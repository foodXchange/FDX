"use client";

import type { PublicCatalogueProduct } from "@/app/en/products/page";
import { cleanProductName, CATEGORY_COLORS } from "@/lib/products/cleanProductName";

export interface ProductCardProps {
  product: PublicCatalogueProduct;
  onRequest: (product: PublicCatalogueProduct) => void;
  onViewSpec?: (product: PublicCatalogueProduct) => void;
  isInBasket?: boolean;
  onToggleBasket?: (product: PublicCatalogueProduct) => void;
}

const COUNTRY_FLAG: Record<string, string> = {
  Spain: "\u{1F1EA}\u{1F1F8}",
  Italy: "\u{1F1EE}\u{1F1F9}",
  France: "\u{1F1EB}\u{1F1F7}",
  Portugal: "\u{1F1F5}\u{1F1F9}",
  Greece: "\u{1F1EC}\u{1F1F7}",
  Turkey: "\u{1F1F9}\u{1F1F7}",
  Morocco: "\u{1F1F2}\u{1F1E6}",
  Israel: "\u{1F1EE}\u{1F1F1}",
  Germany: "\u{1F1E9}\u{1F1EA}",
  Netherlands: "\u{1F1F3}\u{1F1F1}",
  Poland: "\u{1F1F5}\u{1F1F1}",
  Belgium: "\u{1F1E7}\u{1F1EA}",
  Ukraine: "\u{1F1FA}\u{1F1E6}",
  Romania: "\u{1F1F7}\u{1F1F4}",
  Bulgaria: "\u{1F1E7}\u{1F1EC}",
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

export default function ProductCard({
  product,
  onRequest,
  isInBasket = false,
  onToggleBasket,
  onViewSpec,
}: ProductCardProps) {
  const color = CATEGORY_COLORS[product.category] ?? "#888780";
  const country = product.supplier?.country_of_origin ?? null;
  const flag = country ? (COUNTRY_FLAG[country] ?? null) : null;
  const kosherType = product.kosher_types?.[0] ?? null;
  const displayCerts = product.certifications
    .filter((c) => !product.kosher_types.includes(c))
    .slice(0, 2);
  const displayName = cleanProductName(product.product_name, product.category);

  return (
    <div className="group relative bg-dark-700 rounded-2xl overflow-hidden border border-dark-border hover:border-orange-500/40 hover:shadow-xl hover:shadow-black/40 transition-all duration-300 flex flex-col">
      {/* Category color top bar */}
      <div style={{ height: 6, backgroundColor: color }} />

      {product.image_url && (
        <div
          onClick={() => onViewSpec?.(product)}
          className={`relative h-36 bg-white/95 flex items-center justify-center p-2 overflow-hidden ${
            onViewSpec ? "cursor-pointer" : ""
          }`}
          title="Click to view technical specifications"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.image_url}
            alt={displayName}
            onError={(e) => {
              const parent = e.currentTarget.parentElement;
              if (parent) parent.style.display = "none";
            }}
            className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      )}

      {/* PRODUCT INFO */}
      <div className="p-4 flex flex-col gap-1 flex-1 relative">
        {/* Kosher badge */}
        {kosherType && (
          <span className="badge-kosher absolute top-4 right-4">
            &#x2721; {kosherType}
          </span>
        )}

        {/* Private label badge */}
        {product.private_label && (
          <span className="self-start bg-white/10 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full mb-1">
            Private label
          </span>
        )}

        <p
          onClick={() => onViewSpec?.(product)}
          className={`text-base font-semibold text-dark-text-primary leading-snug line-clamp-2 pr-16 ${
            onViewSpec ? "cursor-pointer hover:text-orange-400 transition" : ""
          }`}
          title="Click to view technical specifications"
        >
          {displayName}
        </p>

        {country && (
          <p className="text-xs text-slate-400">
            {flag ? `${flag} ` : ""}{country}
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

        {/* Add to sample kit */}
        <button
          type="button"
          onClick={() => onToggleBasket?.(product)}
          className={`mt-3 w-full py-2 rounded-xl text-xs font-semibold border transition duration-200 cursor-pointer ${
            isInBasket
              ? "bg-emerald-600 border-emerald-500 text-white"
              : "bg-white/5 border-white/10 text-slate-300 hover:border-orange-500/40 hover:text-orange-400"
          }`}
        >
          {isInBasket ? "✓ In Tasting Box" : "+ Tasting Sample"}
        </button>

        {/* Actions sub-row */}
        <div className="grid grid-cols-2 gap-1.5 mt-1.5">
          {onViewSpec && (
            <button
              type="button"
              onClick={() => onViewSpec(product)}
              className="py-1.5 rounded-xl text-xs font-semibold bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:border-white/20 transition cursor-pointer"
            >
              📋 Spec
            </button>
          )}
          <button
            type="button"
            onClick={() => onRequest(product)}
            className={`py-1.5 rounded-xl text-xs font-semibold bg-white/5 border border-white/10 text-slate-300 hover:text-orange-400 hover:border-orange-500/40 transition cursor-pointer ${
              !onViewSpec ? "col-span-2" : ""
            }`}
          >
            RFQ &#x2192;
          </button>
        </div>
      </div>

      {/* Hover overlay (desktop) */}
      <div className="absolute inset-0 bg-dark-900/90 opacity-0 group-hover:opacity-100 transition-opacity duration-300 hidden md:flex flex-col gap-2 items-center justify-center p-4 rounded-2xl">
        {onViewSpec && (
          <button
            type="button"
            onClick={() => onViewSpec(product)}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs border border-slate-600 transition shadow-md cursor-pointer"
          >
            📋 Technical Spec Sheet
          </button>
        )}
        <button
          type="button"
          onClick={() => onRequest(product)}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 px-4 rounded-xl text-xs transition cursor-pointer"
        >
          Request Factory RFQ
        </button>
      </div>
    </div>
  );
}
