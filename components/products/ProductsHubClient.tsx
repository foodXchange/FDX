"use client";

import { useState } from "react";
import Link from "next/link";
import AiSearchPanel from "@/components/products/AiSearchPanel";
import ProductListRow from "@/components/ProductListRow";
import RequestProductModal from "@/components/products/RequestProductModal";
import { CATEGORY_COLORS } from "@/lib/products/cleanProductName";
import { toCategorySlug } from "@/lib/products/categorySlug";
import type {
  PublicCatalogueProduct,
  CategoryImageData,
  ComputedCatStat,
} from "@/app/en/products/page";

interface Props {
  allCategories: string[];
  stats: Record<string, ComputedCatStat>;
  catImages: Record<string, CategoryImageData>;
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

export default function ProductsHubClient({ allCategories, stats, catImages }: Props) {
  const [aiResults, setAiResults] = useState<PublicCatalogueProduct[] | null>(null);
  const [activeQuery, setActiveQuery] = useState<string | null>(null);
  const [requestProduct, setRequestProduct] = useState<PublicCatalogueProduct | null>(null);

  return (
    <>
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* AI Search Panel — global search across all categories */}
        <AiSearchPanel
          onResults={(results, query) => {
            setAiResults(results);
            setActiveQuery(query);
          }}
          onClear={() => {
            setAiResults(null);
            setActiveQuery(null);
          }}
        />

        {/* Category grid — shown when no AI search is active */}
        {aiResults === null && (
          <>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-6">
              Browse by category
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {allCategories.map((cat) => {
                const slug = toCategorySlug(cat);
                const stat = stats[cat];
                const img = catImages[cat];
                const catColor = CATEGORY_COLORS[cat] ?? "#888780";
                const gradient =
                  img?.gradient_from && img?.gradient_to
                    ? `linear-gradient(135deg, ${img.gradient_from}, ${img.gradient_to})`
                    : `linear-gradient(135deg, ${catColor}cc, ${catColor}66)`;
                const topFlags = (stat?.top_countries ?? [])
                  .map((c) => COUNTRY_FLAG[c] ?? "🌍")
                  .join(" ");

                return (
                  <Link
                    key={cat}
                    href={`/en/products/${slug}`}
                    className="group block rounded-2xl overflow-hidden border border-dark-border hover:border-orange-500/40 hover:shadow-xl hover:shadow-black/40 transition-all duration-300"
                    style={{ transform: "scale(1)", willChange: "transform" }}
                  >
                    {/* Image area — 160px */}
                    <div className="relative overflow-hidden" style={{ height: 160 }}>
                      <div
                        className="absolute inset-0 flex items-center justify-center"
                        style={{ background: gradient }}
                      >
                        <span className="text-white font-semibold text-sm px-3 text-center drop-shadow">
                          {cat}
                        </span>
                      </div>
                      {img?.image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={img.image_url}
                          alt={cat}
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      )}
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <div
                        className="absolute bottom-0 left-0 right-0 h-0.5 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"
                        style={{ backgroundColor: "#f97316" }}
                      />
                    </div>

                    {/* Card footer */}
                    <div className="bg-dark-700 px-4 py-3">
                      <p className="text-[13px] font-medium text-dark-text-primary leading-snug mb-0.5">
                        {cat}
                      </p>
                      {stat ? (
                        <>
                          <p className="text-[11px] text-slate-400">
                            {stat.count} product{stat.count !== 1 ? "s" : ""}
                            {stat.country_count > 0
                              ? ` · ${stat.country_count} countr${stat.country_count !== 1 ? "ies" : "y"}`
                              : ""}
                          </p>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-[11px] text-green-400 font-medium">
                              ✡ {stat.kosher_pct === 100 ? "All kosher" : `${stat.kosher_pct}% kosher`}
                            </span>
                            {topFlags && <span className="text-sm">{topFlags}</span>}
                          </div>
                        </>
                      ) : (
                        <p className="text-[11px] text-slate-400">Explore products</p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Bottom CTA */}
            <div className="border-t border-dark-border mt-14 py-12 text-center">
              <p className="text-slate-400 text-sm mb-1">Can&apos;t find what you need?</p>
              <Link
                href="/en/sourcing"
                className="text-orange-400 hover:text-orange-300 font-semibold text-sm transition"
              >
                Submit a sourcing request and we find it for you →
              </Link>
            </div>
          </>
        )}

        {/* AI results — shown when search is active */}
        {aiResults !== null && aiResults.length > 0 && (
          <>
            <div className="divide-y divide-white/6 border border-dark-border rounded-2xl overflow-hidden">
              {aiResults.map((product) => (
                <ProductListRow
                  key={product.id}
                  product={product}
                  onRequest={setRequestProduct}
                  showImages={false}
                  categoryImage={catImages[product.category] ?? undefined}
                />
              ))}
            </div>

            {/* Lead capture */}
            <div className="mt-8 dark-card p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-dark-text-primary">
                  Can&apos;t find exactly what you need?
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Submit a sourcing request — we search our full supplier network.
                </p>
              </div>
              <Link
                href="/en/sourcing"
                className="shrink-0 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition"
              >
                Submit request &#x2192;
              </Link>
            </div>
          </>
        )}

        {/* Zero-results state */}
        {aiResults !== null && aiResults.length === 0 && (
          <div className="text-center py-16">
            <p className="text-dark-text-primary font-semibold text-lg mb-2">
              No exact matches found for &ldquo;{activeQuery}&rdquo;
            </p>
            <p className="text-slate-400 text-sm mb-6">
              Submit a sourcing request and we will find it for you.
            </p>
            <Link
              href="/en/sourcing"
              className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-7 py-3 rounded-xl text-sm transition inline-block"
            >
              Submit sourcing request &#x2192;
            </Link>
          </div>
        )}
      </div>

      {requestProduct && (
        <RequestProductModal
          product={requestProduct}
          onClose={() => setRequestProduct(null)}
        />
      )}
    </>
  );
}
