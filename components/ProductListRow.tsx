"use client";

import type { PublicCatalogueProduct, CategoryImageData } from "@/app/en/products/page";
import {
  cleanProductName,
  CATEGORY_COLORS,
} from "@/lib/products/cleanProductName";

interface Props {
  product: PublicCatalogueProduct;
  onRequest: (product: PublicCatalogueProduct) => void;
  showImages?: boolean;
  categoryImage?: CategoryImageData;
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

function kosherBadgeCls(type: string): string {
  const lower = type.toLowerCase();
  if (lower.includes("badatz")) return "bg-red-500/15 text-red-400 border-red-500/25";
  if (lower.includes("ou")) return "bg-blue-500/15 text-blue-400 border-blue-500/25";
  if (lower.includes("chief") || lower.includes("rabbinate"))
    return "bg-amber-500/15 text-amber-400 border-amber-500/25";
  return "bg-white/6 text-slate-400 border-white/10";
}

export default function ProductListRow({
  product,
  onRequest,
  showImages,
  categoryImage,
  isInBasket = false,
  onToggleBasket,
}: Props) {
  const color = CATEGORY_COLORS[product.category] ?? "#888780";
  const country = product.supplier?.country_of_origin ?? null;
  const flag = country ? (COUNTRY_FLAG[country] ?? null) : null;
  const kosherType = product.kosher_types?.[0] ?? null;
  const qualityCerts = product.certifications.filter(
    (c) => !product.kosher_types.includes(c)
  );
  const displayCerts = qualityCerts.slice(0, 2);
  const extraCerts = qualityCerts.length - 2;
  const displayFormats = product.formats.slice(0, 2);
  const displayName = cleanProductName(product.product_name, product.category);

  return (
    <div
      className={`relative flex items-center gap-3 px-5 overflow-hidden hover:bg-white/3 transition-colors duration-150 cursor-default ${
        isInBasket ? "bg-orange-500/10" : ""
      }`}
      style={{ height: 72 }}
    >
      {/* Left category color bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 shrink-0"
        style={{ backgroundColor: color }}
      />

      {/* Basket checkbox */}
      <button
        type="button"
        onClick={() => onToggleBasket?.(product)}
        className="shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors"
        style={{
          borderColor: isInBasket ? "#f97316" : "rgba(255,255,255,0.2)",
          background: isInBasket ? "#f97316" : "transparent",
        }}
        aria-label={isInBasket ? "Remove from request" : "Add to request"}
      >
        {isInBasket && (
          <svg viewBox="0 0 12 12" className="w-3 h-3" aria-hidden>
            <path
              d="M2 6l3 3 5-5"
              stroke="white"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
            />
          </svg>
        )}
      </button>

      {/* Optional category image thumbnail (40px) */}
      {showImages && categoryImage?.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={categoryImage.image_url}
          alt=""
          className="hidden md:block w-10 h-10 rounded-lg object-cover shrink-0"
        />
      )}

      {/* Column 1 — Category badge + Product name + Country (mobile only) */}
      <div className="flex flex-col justify-center min-w-0 overflow-hidden pl-2 flex-1">
        <span
          className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded self-start whitespace-nowrap mb-0.5"
          style={{
            backgroundColor: color + "22",
            color: color,
          }}
        >
          {product.category}
        </span>
        <p className="text-sm font-medium text-dark-text-primary leading-snug line-clamp-1">
          {displayName}
        </p>
        {country && (
          <p className="text-[11px] text-slate-400 truncate md:hidden">
            {flag ? `${flag} ` : ""}{country}
          </p>
        )}
      </div>

      {/* Column 2 — Kosher + Certs (160px) — hidden on mobile */}
      <div
        className="hidden md:flex flex-col justify-center gap-1 shrink-0"
        style={{ width: 160 }}
      >
        {kosherType && (
          <span
            className={`text-[10px] font-semibold border rounded-full px-2 py-0.5 self-start whitespace-nowrap ${kosherBadgeCls(kosherType)}`}
          >
            &#x2721; {kosherType}
          </span>
        )}
        {displayCerts.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {displayCerts.map((cert) => (
              <span
                key={cert}
                className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full px-2 py-0.5 whitespace-nowrap"
              >
                {cert}
              </span>
            ))}
            {extraCerts > 0 && (
              <span className="text-[10px] text-slate-500">+{extraCerts}</span>
            )}
          </div>
        )}
      </div>

      {/* Column 3 — Formats + Private label (110px) — hidden on mobile */}
      <div
        className="hidden md:flex flex-col justify-center gap-1 shrink-0"
        style={{ width: 110 }}
      >
        {displayFormats.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {displayFormats.map((fmt) => (
              <span
                key={fmt}
                className="text-[10px] bg-white/6 text-slate-400 rounded px-1.5 py-0.5 whitespace-nowrap"
              >
                {fmt}
              </span>
            ))}
          </div>
        )}
        {product.private_label && (
          <span className="text-[10px] text-slate-500 whitespace-nowrap">
            &#x1F3F7; Private label
          </span>
        )}
      </div>

      {/* Column 4 — Country (80px) — hidden on mobile */}
      <div
        className="hidden md:flex flex-col justify-center shrink-0"
        style={{ width: 80 }}
      >
        {country && (
          <p className="text-[11px] text-slate-400 truncate">
            {flag ? `${flag} ` : ""}{country}
          </p>
        )}
      </div>

      {/* Column 5 — Action (100px) */}
      <div className="flex items-center justify-end shrink-0" style={{ width: 100 }}>
        <button
          type="button"
          onClick={() => onRequest(product)}
          className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold px-3 py-2 rounded-lg transition whitespace-nowrap"
        >
          <span className="hidden md:inline">Request </span>&#x2192;
        </button>
      </div>
    </div>
  );
}
