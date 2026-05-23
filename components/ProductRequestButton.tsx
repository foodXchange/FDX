"use client";

import { useState } from "react";
import SourcingWidget from "@/components/SourcingWidget";

type CatalogueProduct = {
  id: string;
  product_name: string;
  brand_name: string | null;
  format: string | null;
  certifications: string[];
  country_of_origin: string | null;
};

interface Props {
  product: CatalogueProduct;
}

export default function ProductRequestButton({ product }: Props) {
  const [open, setOpen] = useState(false);

  const initialDescription = [
    "I am interested in sourcing:",
    product.product_name,
    product.format ?? "",
    product.certifications.join(", "),
    product.country_of_origin ? `Country: ${product.country_of_origin}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const productUrl =
    typeof window !== "undefined"
      ? window.location.href
      : `https://fdx.trading/en/products/${product.id}`;

  const shareText = encodeURIComponent(
    `${product.brand_name ? product.brand_name + " — " : ""}${product.product_name} | Available for import to Israel via FoodXchange`
  );

  return (
    <>
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-5 rounded-2xl text-lg transition"
        >
          Request this product
        </button>

        {/* Share row */}
        <div className="flex gap-3">
          <a
            href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(productUrl)}&title=${shareText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center text-sm py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-700 transition"
          >
            Share on LinkedIn
          </a>
          <a
            href={`https://wa.me/?text=${shareText}%20${encodeURIComponent(productUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center text-sm py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:border-green-300 hover:text-green-700 transition"
          >
            Share on WhatsApp
          </a>
        </div>
      </div>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
              <div>
                {product.brand_name && (
                  <p className="text-xs text-slate-500">{product.brand_name}</p>
                )}
                <p className="text-base font-semibold text-slate-900">
                  Request: {product.product_name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xl leading-none ml-4"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              <SourcingWidget
                source="product-detail"
                initialDescription={initialDescription}
                onSuccess={() => setOpen(false)}
                compact
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
