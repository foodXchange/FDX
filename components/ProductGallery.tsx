"use client";

import { useState, useEffect } from "react";
import ProductCard from "@/components/ProductCard";
import ProductListRow from "@/components/ProductListRow";
import SourcingWidget from "@/components/SourcingWidget";
import BasketModal from "@/components/BasketModal";
import { cleanProductName } from "@/lib/products/cleanProductName";
import type { PublicCatalogueProduct, CategoryImageData } from "@/app/en/products/page";

interface Props {
  products: PublicCatalogueProduct[];
  categoryImages: Record<string, CategoryImageData>;
}

type View = "list" | "grid";
type Sort = "relevance" | "az" | "category";

const PAGE_SIZE = 50;

export default function ProductGallery({ products, categoryImages }: Props) {
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<View>("list");
  const [sort, setSort] = useState<Sort>("relevance");
  const [page, setPage] = useState(1);
  const [showImages, setShowImages] = useState(false);
  const [requestProduct, setRequestProduct] =
    useState<PublicCatalogueProduct | null>(null);

  const [basket, setBasket] = useState<PublicCatalogueProduct[]>([]);
  const [basketModalOpen, setBasketModalOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("fdx-products-view");
    if (saved === "grid" || saved === "list") setView(saved);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && basket.length > 0 && !basketModalOpen && !requestProduct) {
        if (window.confirm(`Clear ${basket.length} selected product${basket.length !== 1 ? "s" : ""}?`)) {
          setBasket([]);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [basket, basketModalOpen, requestProduct]);

  function toggleBasket(product: PublicCatalogueProduct) {
    setBasket((prev) =>
      prev.some((p) => p.id === product.id)
        ? prev.filter((p) => p.id !== product.id)
        : [...prev, product]
    );
  }

  function isInBasket(id: string) {
    return basket.some((p) => p.id === id);
  }

  function handleSetView(v: View) {
    setView(v);
    setPage(1);
    localStorage.setItem("fdx-products-view", v);
  }

  function handleSetSort(s: Sort) {
    setSort(s);
    setPage(1);
  }

  function handleSetCategory(cat: string) {
    setActiveCategory(cat);
    setPage(1);
  }

  function handleSetSearch(q: string) {
    setSearch(q);
    setPage(1);
  }

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
      p.category.toLowerCase().includes(q) ||
      (p.supplier?.company_name.toLowerCase().includes(q) ?? false) ||
      p.certifications.some((c) => c.toLowerCase().includes(q));
    return matchCat && matchSearch;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sort === "az")
      return cleanProductName(a.product_name, a.category).localeCompare(
        cleanProductName(b.product_name, b.category)
      );
    if (sort === "category") return a.category.localeCompare(b.category);
    return 0;
  });

  const paginated = sorted.slice(0, page * PAGE_SIZE);
  const hasMore = sorted.length > paginated.length;

  const initialDescription = requestProduct
    ? [
        "I am interested in sourcing:",
        requestProduct.product_name,
        requestProduct.formats[0] ?? "",
        requestProduct.certifications.join(", "),
        requestProduct.supplier?.country_of_origin
          ? `Country: ${requestProduct.supplier.country_of_origin}`
          : "",
      ]
        .filter(Boolean)
        .join("\n")
    : "";

  const sortBtn = (s: Sort, label: string) => (
    <button
      key={s}
      type="button"
      onClick={() => handleSetSort(s)}
      className={`text-xs px-3 py-1.5 rounded-lg transition ${
        sort === s
          ? "bg-slate-800 text-white"
          : "border border-slate-200 text-slate-500 hover:border-slate-400"
      }`}
    >
      {label}
    </button>
  );

  return (
    <>
      {/* STICKY FILTER + SEARCH BAR */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 space-y-3">
          {/* Row 1: category pills + search */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div
              className="flex gap-2 overflow-x-auto flex-1 min-w-0 [&::-webkit-scrollbar]:hidden"
              style={{ scrollbarWidth: "none" }}
            >
              {categories.map((cat) => {
                const catImg = cat !== "all" ? categoryImages[cat] : null;
                const thumbUrl = catImg?.image_url ?? null;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleSetCategory(cat)}
                    className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full whitespace-nowrap transition shrink-0 ${
                      activeCategory === cat
                        ? "bg-orange-500 text-white"
                        : "border border-slate-200 text-slate-600 hover:border-orange-300"
                    }`}
                  >
                    {thumbUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumbUrl}
                        alt=""
                        className="w-5 h-5 rounded-full object-cover shrink-0"
                      />
                    )}
                    {cat === "all"
                      ? `All (${products.length})`
                      : `${cat} (${products.filter((p) => p.category === cat).length})`}
                  </button>
                );
              })}
            </div>
            <div className="relative shrink-0 w-full sm:w-64">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">
                &#x1F50D;
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => handleSetSearch(e.target.value)}
                placeholder="Search products..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400"
              />
            </div>
          </div>

          {/* Row 2: count + sort + controls */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-500">
                {filtered.length} product{filtered.length !== 1 ? "s" : ""}
              </span>
              <div className="flex gap-1">
                {sortBtn("relevance", "Relevance")}
                {sortBtn("az", "A–Z")}
                {sortBtn("category", "Category")}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Show images toggle (list view only) */}
              {view === "list" && (
                <button
                  type="button"
                  onClick={() => setShowImages((v) => !v)}
                  className={`text-xs px-3 py-1.5 rounded-lg transition border ${
                    showImages
                      ? "bg-slate-100 border-slate-300 text-slate-700"
                      : "border-slate-200 text-slate-400 hover:border-slate-300"
                  }`}
                >
                  {showImages ? "Hide images" : "Show images"}
                </button>
              )}

              {/* View toggle */}
              <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => handleSetView("list")}
                  title="List view"
                  className={`px-3 py-1.5 text-sm transition ${
                    view === "list"
                      ? "bg-orange-500 text-white"
                      : "text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  &#x2261; List
                </button>
                <button
                  type="button"
                  onClick={() => handleSetView("grid")}
                  title="Grid view"
                  className={`px-3 py-1.5 text-sm border-l border-slate-200 transition ${
                    view === "grid"
                      ? "bg-orange-500 text-white"
                      : "text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  &#x229E; Grid
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PRODUCT LIST / GRID */}
      <div className="max-w-7xl mx-auto px-6 py-10">
        {paginated.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">&#x1F50D;</p>
            <p className="text-xl font-semibold text-slate-900 mb-2">
              No products found
            </p>
            <p className="text-slate-500 mb-6">
              Try a different search or category
            </p>
            <button
              type="button"
              onClick={() => {
                handleSetSearch("");
                handleSetCategory("all");
              }}
              className="text-orange-600 hover:text-orange-700 text-sm font-medium transition border border-orange-300 px-4 py-2 rounded-lg"
            >
              Clear filters
            </button>
          </div>
        ) : view === "list" ? (
          <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden bg-white">
            {paginated.map((product) => (
              <ProductListRow
                key={product.id}
                product={product}
                onRequest={setRequestProduct}
                showImages={showImages}
                categoryImage={categoryImages[product.category]}
                isInBasket={isInBasket(product.id)}
                onToggleBasket={toggleBasket}
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
                isInBasket={isInBasket(product.id)}
                onToggleBasket={toggleBasket}
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
              className="border border-slate-200 text-slate-600 hover:border-orange-400 hover:text-orange-600 text-sm font-medium px-8 py-3 rounded-xl transition"
            >
              Load more ({sorted.length - paginated.length} remaining)
            </button>
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
              <div className="min-w-0">
                <p className="text-xs text-slate-500">
                  {requestProduct.supplier?.company_name ??
                    requestProduct.category}
                </p>
                <p className="text-base font-semibold text-slate-900 truncate">
                  {requestProduct.product_name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRequestProduct(null)}
                className="text-slate-400 hover:text-slate-600 text-xl leading-none shrink-0 ml-3"
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            {/* Pre-fill info */}
            <div className="mx-6 mt-4 bg-orange-50 border border-orange-100 rounded-xl p-4">
              <p className="text-xs font-semibold text-orange-700 mb-2">
                &#x2736; We&apos;ll pre-fill your request with:
              </p>
              <div className="flex flex-wrap gap-1.5">
                <span className="bg-orange-100 text-orange-700 text-xs rounded-full px-2 py-0.5">
                  {requestProduct.product_name}
                </span>
                {requestProduct.formats[0] && (
                  <span className="bg-orange-100 text-orange-700 text-xs rounded-full px-2 py-0.5">
                    {requestProduct.formats[0]}
                  </span>
                )}
                {requestProduct.kosher_types.slice(0, 1).map((k) => (
                  <span
                    key={k}
                    className="bg-orange-100 text-orange-700 text-xs rounded-full px-2 py-0.5"
                  >
                    &#x2721; {k}
                  </span>
                ))}
                {requestProduct.certifications.slice(0, 2).map((c) => (
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

      {/* BASKET BOTTOM BAR */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-40 transition-transform duration-300 ${
          basket.length > 0 ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="bg-slate-900 border-t border-white/10 shadow-2xl px-6 py-3">
          <div className="max-w-7xl mx-auto flex items-center gap-4 flex-wrap">
            <span className="text-sm font-semibold text-white shrink-0">
              {basket.length} product{basket.length !== 1 ? "s" : ""} selected
            </span>

            <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
              {basket.slice(0, 3).map((p) => (
                <span
                  key={p.id}
                  className="text-xs bg-white/10 text-slate-300 rounded-full px-2.5 py-0.5 truncate max-w-40"
                >
                  {cleanProductName(p.product_name, p.category)}
                </span>
              ))}
              {basket.length > 3 && (
                <span className="text-xs text-slate-500">
                  +{basket.length - 3} more
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setBasketModalOpen(true)}
              className="shrink-0 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-5 py-2 rounded-xl transition"
            >
              Request all &#x2192;
            </button>
          </div>
        </div>
      </div>

      {/* BASKET MODAL */}
      {basketModalOpen && (
        <BasketModal
          basket={basket}
          onRemove={(id) => setBasket((prev) => prev.filter((p) => p.id !== id))}
          onClose={() => setBasketModalOpen(false)}
          onSuccess={() => {
            setBasket([]);
            setBasketModalOpen(false);
          }}
        />
      )}
    </>
  );
}
