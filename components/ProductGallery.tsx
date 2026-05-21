"use client";

import { useState } from "react";
import ProductCard from "@/components/ProductCard";
import SourcingWidget from "@/components/SourcingWidget";
import type { PublicCatalogueProduct } from "@/app/en/products/page";

interface Props {
  products: PublicCatalogueProduct[];
}

export default function ProductGallery({ products }: Props) {
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [requestProduct, setRequestProduct] =
    useState<PublicCatalogueProduct | null>(null);

  const categories = [
    "all",
    ...Array.from(new Set(products.map((p) => p.category))).sort(),
  ];

  const filtered = products.filter((p) => {
    const matchCat =
      activeCategory === "all" || p.category === activeCategory;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      p.product_name.toLowerCase().includes(q) ||
      (p.brand_name?.toLowerCase().includes(q) ?? false) ||
      p.category.toLowerCase().includes(q) ||
      p.tags.some((t) => t.toLowerCase().includes(q));
    return matchCat && matchSearch;
  });

  const initialDescription = requestProduct
    ? [
        "I am interested in sourcing:",
        requestProduct.product_name,
        requestProduct.format ?? "",
        requestProduct.certifications.join(", "),
        requestProduct.country_of_origin
          ? `Country: ${requestProduct.country_of_origin}`
          : "",
      ]
        .filter(Boolean)
        .join("\n")
    : "";

  return (
    <>
      {/* STICKY FILTER + SEARCH BAR */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          {/* Category pills */}
          <div className="flex gap-2 overflow-x-auto scrollbar-none flex-1 min-w-0">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`text-sm px-4 py-2 rounded-full whitespace-nowrap transition flex-shrink-0 ${
                  activeCategory === cat
                    ? "bg-orange-500 text-white"
                    : "border border-slate-200 text-slate-600 hover:border-orange-300"
                }`}
              >
                {cat === "all" ? `All (${products.length})` : cat}
              </button>
            ))}
          </div>

          {/* Search input */}
          <div className="relative flex-shrink-0 w-full sm:w-64">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">
              🔍
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400"
            />
          </div>
        </div>
      </div>

      {/* PRODUCT GRID */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">🔍</p>
            <p className="text-xl font-semibold text-slate-900 mb-2">
              No products found
            </p>
            <p className="text-slate-500 mb-6">
              Try a different search or category
            </p>
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setActiveCategory("all");
              }}
              className="text-orange-600 hover:text-orange-700 text-sm font-medium transition border border-orange-300 px-4 py-2 rounded-lg"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filtered.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onRequest={setRequestProduct}
              />
            ))}
          </div>
        )}
      </div>

      {/* REQUEST MODAL */}
      {requestProduct && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setRequestProduct(null);
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3 min-w-0">
                {requestProduct.catalogue_image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={requestProduct.catalogue_image_url}
                    alt={requestProduct.product_name}
                    className="w-12 h-12 rounded-lg object-contain border border-slate-100 flex-shrink-0"
                  />
                )}
                <div className="min-w-0">
                  <p className="text-xs text-slate-500">
                    {requestProduct.brand_name ?? requestProduct.category}
                  </p>
                  <p className="text-base font-semibold text-slate-900 truncate">
                    {requestProduct.product_name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRequestProduct(null)}
                className="text-slate-400 hover:text-slate-600 text-xl leading-none flex-shrink-0 ml-3"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* Pre-fill info */}
            <div className="mx-6 mt-4 bg-orange-50 border border-orange-100 rounded-xl p-4">
              <p className="text-xs font-semibold text-orange-700 mb-2">
                ✦ We&apos;ll pre-fill your request with:
              </p>
              <div className="flex flex-wrap gap-1.5">
                <span className="bg-orange-100 text-orange-700 text-xs rounded-full px-2 py-0.5">
                  {requestProduct.product_name}
                </span>
                {requestProduct.format && (
                  <span className="bg-orange-100 text-orange-700 text-xs rounded-full px-2 py-0.5">
                    {requestProduct.format}
                  </span>
                )}
                {requestProduct.certifications.slice(0, 3).map((c) => (
                  <span
                    key={c}
                    className="bg-orange-100 text-orange-700 text-xs rounded-full px-2 py-0.5"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>

            {/* Sourcing widget */}
            <div className="p-6">
              <SourcingWidget
                source="product-gallery"
                initialDescription={initialDescription}
                onSuccess={() => setRequestProduct(null)}
                compact
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
