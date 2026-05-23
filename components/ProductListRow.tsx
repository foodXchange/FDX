"use client";

import type { PublicCatalogueProduct, CategoryImageData } from "@/app/en/products/page";
import {
  cleanProductName,
  cleanSupplierName,
  CATEGORY_COLORS,
} from "@/lib/products/cleanProductName";

interface Props {
  product: PublicCatalogueProduct;
  onRequest: (product: PublicCatalogueProduct) => void;
  showImages?: boolean;
  categoryImage?: CategoryImageData;
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

function kosherBadgeCls(type: string): string {
  const lower = type.toLowerCase();
  if (lower.includes("badatz")) return "bg-red-500/15 text-red-400 border-red-500/25";
  if (lower.includes("ou")) return "bg-blue-500/15 text-blue-400 border-blue-500/25";
  if (lower.includes("chief") || lower.includes("rabbinate"))
    return "bg-amber-500/15 text-amber-400 border-amber-500/25";
  return "bg-white/6 text-slate-400 border-white/10";
}

export default function ProductListRow({ product, onRequest, showImages, categoryImage }: Props) {
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
  const supplierDisplay = product.supplier
    ? cleanSupplierName(product.supplier.company_name)
    : null;

  return (
    <div
      className="relative flex items-center gap-3 px-5 overflow-hidden hover:bg-white/3 transition-colors duration-150 cursor-default"
      style={{ height: 72 }}
    >
      {/* Left category color bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 shrink-0"
        style={{ backgroundColor: color }}
      />

      {/* Optional category image thumbnail (40px) */}
      {showImages && categoryImage?.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={categoryImage.image_url}
          alt=""
          className="hidden md:block w-10 h-10 rounded-lg object-cover shrink-0"
        />
      )}

      {/* Column 1 — Category badge + Product name + Supplier (flex-grow) */}
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
        {supplierDisplay && (
          <p className="text-[11px] text-slate-400 truncate">
            {supplierDisplay}
            {country ? ` · ${flag ?? country}` : ""}
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
            ✡ {kosherType}
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
            🏷 Private label
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
          <span className="hidden md:inline">Request </span>→
        </button>
      </div>
    </div>
  );
}
