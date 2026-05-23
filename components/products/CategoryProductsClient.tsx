"use client";

import { useState, useEffect } from "react";
import ProductListRow from "@/components/ProductListRow";
import ProductCard from "@/components/ProductCard";
import AiSearchPanel from "@/components/products/AiSearchPanel";
import RequestProductModal from "@/components/products/RequestProductModal";
import { cleanProductName } from "@/lib/products/cleanProductName";
import type { PublicCatalogueProduct, CategoryImageData } from "@/app/en/products/page";

interface Props {
  products: PublicCatalogueProduct[];
  category: string;
  categoryImage: CategoryImageData | null;
}

type View = "list" | "grid";
type SortKey = "relevance" | "az" | "country";

const PAGE_SIZE = 50;

export default function CategoryProductsClient({
  products,
  category,
  categoryImage,
}: Props) {
  const [kosherFilter, setKosherFilter] = useState<string | null>(null);
  const [certFilter, setCertFilter] = useState<string | null>(null);
  const [privateLabelOnly, setPrivateLabelOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>("relevance");
  const [view, setView] = useState<View>("list");
  const [page, setPage] = useState(1);
  const [aiResults, setAiResults] = useState<PublicCatalogueProduct[] | null>(null);
  const [requestProduct, setRequestProduct] = useState<PublicCatalogueProduct | null>(null);
  const [showImages, setShowImages] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("fdx-products-view");
    if (saved === "grid" || saved === "list") setView(saved as View);
  }, []);

  function handleSetView(v: View) {
    setView(v);
    localStorage.setItem("fdx-products-view", v);
    setPage(1);
  }

  const allKosherTypes = Array.from(
    new Set(products.flatMap((p) => p.kosher_types ?? []))
  ).sort();

  const hasBrc = products.some((p) =>
    p.certifications.some((c) => c.toLowerCase().includes("brc"))
  );
  const hasOrganic = products.some((p) =>
    p.certifications.some((c) => c.toLowerCase().includes("organic"))
  );
  const hasPrivateLabel = products.some((p) => p.private_label);

  const displayList = aiResults ?? products;

  const filtered = displayList.filter((p) => {
    if (kosherFilter && !p.kosher_types.some((k) => k === kosherFilter)) return false;
    if (privateLabelOnly && !p.private_label) return false;
    if (certFilter === "BRC" && !p.certifications.some((c) => c.toLowerCase().includes("brc")))
      return false;
    if (
      certFilter === "Organic" &&
      !p.certifications.some((c) => c.toLowerCase().includes("organic"))
    )
      return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sort === "az")
      return cleanProductName(a.product_name, a.category).localeCompare(
        cleanProductName(b.product_name, b.category)
      );
    if (sort === "country") {
      const ca = a.supplier?.country_of_origin ?? "";
      const cb = b.supplier?.country_of_origin ?? "";
      return ca.localeCompare(cb);
    }
    return 0;
  });

  const paginated = sorted.slice(0, page * PAGE_SIZE);
  const hasMore = sorted.length > paginated.length;

  function clearAllFilters() {
    setKosherFilter(null);
    setCertFilter(null);
    setPrivateLabelOnly(false);
    setPage(1);
  }

  const hasActiveFilter = kosherFilter || certFilter || privateLabelOnly;

  const pillBase =
    "text-xs px-3 py-1.5 rounded-full border transition whitespace-nowrap shrink-0 cursor-pointer";
  const pillActive = "bg-orange-500 border-orange-500 text-white";
  const pillInactive = "border-white/10 text-slate-400 hover:border-orange-500/40";

  return (
    <>
      {/* Filter + controls bar */}
      <div className="bg-dark-800 border-b border-dark-border sticky top-0 z-10 shadow-[0_1px_0_rgba(255,255,255,0.07)]">
        <div className="max-w-7xl mx-auto px-6 py-3 space-y-2">
          {/* Row 1: filter pills + view controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-slate-500 shrink-0">
              {filtered.length} product{filtered.length !== 1 ? "s" : ""}
            </span>

            {/* Kosher filter pills */}
            {allKosherTypes.map((kt) => (
              <button
                key={kt}
                type="button"
                onClick={() => {
                  setKosherFilter(kosherFilter === kt ? null : kt);
                  setPage(1);
                }}
                className={`${pillBase} ${kosherFilter === kt ? pillActive : pillInactive}`}
              >
                ✡ {kt}
              </button>
            ))}

            {/* Cert pills */}
            {hasBrc && (
              <button
                type="button"
                onClick={() => {
                  setCertFilter(certFilter === "BRC" ? null : "BRC");
                  setPage(1);
                }}
                className={`${pillBase} ${certFilter === "BRC" ? pillActive : pillInactive}`}
              >
                BRC certified
              </button>
            )}
            {hasOrganic && (
              <button
                type="button"
                onClick={() => {
                  setCertFilter(certFilter === "Organic" ? null : "Organic");
                  setPage(1);
                }}
                className={`${pillBase} ${certFilter === "Organic" ? pillActive : pillInactive}`}
              >
                Organic
              </button>
            )}
            {hasPrivateLabel && (
              <button
                type="button"
                onClick={() => {
                  setPrivateLabelOnly(!privateLabelOnly);
                  setPage(1);
                }}
                className={`${pillBase} ${privateLabelOnly ? pillActive : pillInactive}`}
              >
                Private label
              </button>
            )}

            {hasActiveFilter && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-xs text-slate-500 hover:text-slate-300 transition ml-1"
              >
                Clear ×
              </button>
            )}

            {/* Right side controls */}
            <div className="ml-auto flex items-center gap-2">
              {/* Sort */}
              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value as SortKey);
                  setPage(1);
                }}
                className="text-xs border border-white/10 rounded-lg px-2 py-1.5 focus:outline-none focus:border-orange-500/50 bg-dark-700 text-slate-300"
              >
                <option value="relevance">Relevance</option>
                <option value="az">A–Z</option>
                <option value="country">Country</option>
              </select>

              {/* Show images toggle (list only) */}
              {view === "list" && (
                <button
                  type="button"
                  onClick={() => setShowImages((v) => !v)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition ${
                    showImages
                      ? "bg-white/8 border-white/15 text-slate-300"
                      : "border-white/10 text-slate-500 hover:border-white/20"
                  }`}
                >
                  {showImages ? "Hide images" : "Show images"}
                </button>
              )}

              {/* View toggle */}
              <div className="flex rounded-lg border border-white/10 overflow-hidden">
                <button
                  type="button"
                  onClick={() => handleSetView("list")}
                  className={`px-3 py-1.5 text-sm transition ${
                    view === "list"
                      ? "bg-orange-500 text-white"
                      : "text-slate-400 hover:bg-white/5"
                  }`}
                >
                  ≡ List
                </button>
                <button
                  type="button"
                  onClick={() => handleSetView("grid")}
                  className={`px-3 py-1.5 text-sm border-l border-white/10 transition ${
                    view === "grid"
                      ? "bg-orange-500 text-white"
                      : "text-slate-400 hover:bg-white/5"
                  }`}
                >
                  ⊞ Grid
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* AI Search panel */}
        <AiSearchPanel
          category={category}
          onResults={(results) => {
            setAiResults(results);
            setPage(1);
          }}
          onClear={() => setAiResults(null)}
        />

        {/* Product list/grid */}
        {paginated.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-400 mb-4">
              No products found with these filters.
            </p>
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-orange-400 hover:text-orange-300 text-sm font-medium border border-orange-500/30 px-4 py-2 rounded-lg transition"
            >
              Clear filters
            </button>
          </div>
        ) : view === "list" ? (
          <div className="divide-y divide-white/6 border border-dark-border rounded-2xl overflow-hidden">
            {paginated.map((product) => (
              <ProductListRow
                key={product.id}
                product={product}
                onRequest={setRequestProduct}
                showImages={showImages}
                categoryImage={categoryImage ?? undefined}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {paginated.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onRequest={setRequestProduct}
              />
            ))}
          </div>
        )}

        {/* Load more */}
        {hasMore && (
          <div className="mt-10 text-center">
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              className="border border-white/10 text-slate-400 hover:border-orange-500/40 hover:text-orange-400 text-sm font-medium px-8 py-3 rounded-xl transition"
            >
              Load {Math.min(PAGE_SIZE, sorted.length - paginated.length)} more (
              {sorted.length - paginated.length} remaining)
            </button>
          </div>
        )}
      </div>

      {/* Request modal */}
      {requestProduct && (
        <RequestProductModal
          product={requestProduct}
          onClose={() => setRequestProduct(null)}
        />
      )}
    </>
  );
}
