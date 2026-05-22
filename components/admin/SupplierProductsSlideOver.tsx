"use client";

import { useEffect, useState } from "react";

type Product = {
  id: string;
  product_name: string;
  category: string;
  subcategory: string | null;
  description: string | null;
  formats: string[];
  certifications: string[];
  kosher_types: string[];
  tags: string[];
  markets_suitable: string[];
  scrape_confidence: number;
  manually_verified: boolean;
  last_scraped_at: string | null;
};

function ConfidenceBadge({ score }: { score: number }) {
  if (score >= 0.8)
    return (
      <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">
        High confidence
      </span>
    );
  if (score >= 0.5)
    return (
      <span className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full font-medium">
        Medium confidence
      </span>
    );
  return (
    <span className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full font-medium">
      Low confidence — verify
    </span>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
      {label}
    </span>
  );
}

export default function SupplierProductsSlideOver({
  supplierId,
  companyName,
  onClose,
}: {
  supplierId: string;
  companyName: string;
  onClose: () => void;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifiedIds, setVerifiedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch(`/api/admin/scraper?supplierId=${supplierId}`)
      .then((r) => r.json())
      .then((json: { products?: Product[] }) => {
        setProducts(json.products ?? []);
        const preVerified = new Set(
          (json.products ?? [])
            .filter((p) => p.manually_verified)
            .map((p) => p.id)
        );
        setVerifiedIds(preVerified);
      })
      .finally(() => setLoading(false));
  }, [supplierId]);

  async function toggleVerified(productId: string) {
    const nowVerified = !verifiedIds.has(productId);
    setVerifiedIds((prev) => {
      const next = new Set(prev);
      if (nowVerified) next.add(productId);
      else next.delete(productId);
      return next;
    });

    await fetch("/api/admin/scraper/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, manually_verified: nowVerified }),
    }).catch(() => null);
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div>
            <h2 className="font-semibold text-gray-900 text-sm">
              Products — {companyName}
            </h2>
            {!loading && (
              <p className="text-xs text-slate-400 mt-0.5">
                {products.length} product{products.length !== 1 ? "s" : ""}{" "}
                extracted
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition p-1"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-16 text-slate-400 text-sm">
              Loading…
            </div>
          )}

          {!loading && products.length === 0 && (
            <div className="text-center py-16 text-slate-400 text-sm">
              No products found for this supplier.
            </div>
          )}

          {products.map((p) => (
            <div
              key={p.id}
              className={`border rounded-xl p-4 space-y-3 transition ${
                verifiedIds.has(p.id)
                  ? "border-green-200 bg-green-50/30"
                  : "border-gray-200 bg-white"
              }`}
            >
              {/* Name + category */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-gray-900 text-sm leading-tight">
                    {p.product_name}
                  </p>
                  {p.subcategory && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      {p.subcategory}
                    </p>
                  )}
                </div>
                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium whitespace-nowrap flex-shrink-0">
                  {p.category}
                </span>
              </div>

              {/* Description */}
              {p.description && (
                <p className="text-xs text-slate-600 leading-relaxed">
                  {p.description}
                </p>
              )}

              {/* Formats */}
              {p.formats.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {p.formats.map((f) => (
                    <Chip key={f} label={f} />
                  ))}
                </div>
              )}

              {/* Certifications */}
              {p.certifications.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {p.certifications.map((c) => (
                    <span
                      key={c}
                      className="text-xs bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              )}

              {/* Footer: confidence + verify toggle */}
              <div className="flex items-center justify-between pt-1">
                <ConfidenceBadge score={p.scrape_confidence} />
                <button
                  onClick={() => toggleVerified(p.id)}
                  className={`flex items-center gap-1.5 text-xs font-medium transition ${
                    verifiedIds.has(p.id)
                      ? "text-green-600"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded border flex items-center justify-center transition ${
                      verifiedIds.has(p.id)
                        ? "bg-green-500 border-green-500 text-white"
                        : "border-slate-300"
                    }`}
                  >
                    {verifiedIds.has(p.id) && "✓"}
                  </span>
                  {verifiedIds.has(p.id) ? "Verified" : "Mark as verified"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
