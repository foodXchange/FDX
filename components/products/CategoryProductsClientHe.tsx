"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { cleanProductName } from "@/lib/products/cleanProductName";
import { getHebrewCategoryMeta } from "@/lib/products/hebrewCategoryMap";
import { useSampleKit } from "@/context/SampleKitContext";
import ProductSpecModal from "@/components/products/ProductSpecModal";
import type {
  PublicCatalogueProduct,
  CategoryImageData,
} from "@/app/en/products/page";

interface Props {
  products: PublicCatalogueProduct[];
  category: string;
  categorySlug: string;
  categoryImage: CategoryImageData | null;
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

const COUNTRY_NAMES_HE: Record<string, string> = {
  Spain: "ספרד",
  Italy: "איטליה",
  France: "צרפת",
  Portugal: "פורטוגל",
  Greece: "יוון",
  Turkey: "טורקיה",
  Morocco: "מרוקו",
  Israel: "ישראל",
  Germany: "גרמניה",
  Netherlands: "הולנד",
  Poland: "פולין",
  Belgium: "בלגיה",
  Ukraine: "אוקראינה",
  Romania: "רומניה",
  Bulgaria: "בולגריה",
};

const PAGE_SIZE = 48;

export default function CategoryProductsClientHe({
  products,
  category,
  categorySlug,
  categoryImage,
}: Props) {
  const meta = getHebrewCategoryMeta(category);
  const { addItem, removeItem, isItemInKit } = useSampleKit();
  const [selectedProductForSpec, setSelectedProductForSpec] = useState<PublicCatalogueProduct | null>(null);

  // Filters state
  const [searchFilter, setSearchFilter] = useState("");
  const [kosherFilter, setKosherFilter] = useState<string>("all");
  const [certFilter, setCertFilter] = useState<string>("all");
  const [privateLabelOnly, setPrivateLabelOnly] = useState(false);
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(1);

  // Available filters from dataset
  const allCountries = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      const c = p.supplier?.country_of_origin;
      if (c) set.add(c);
    });
    return Array.from(set).sort();
  }, [products]);

  const allKosherTypes = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      (p.kosher_types ?? []).forEach((k) => set.add(k));
    });
    return Array.from(set).sort();
  }, [products]);

  // Filtered dataset
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase();
        const matchName = p.product_name.toLowerCase().includes(q);
        const matchSupplier = p.supplier?.company_name?.toLowerCase().includes(q) ?? false;
        if (!matchName && !matchSupplier) return false;
      }

      if (kosherFilter !== "all") {
        if (kosherFilter === "any_kosher") {
          if (!p.kosher_types || p.kosher_types.length === 0) return false;
        } else {
          if (!p.kosher_types?.includes(kosherFilter)) return false;
        }
      }

      if (privateLabelOnly && !p.private_label) return false;

      if (certFilter !== "all") {
        const hasCert = p.certifications?.some((c) =>
          c.toLowerCase().includes(certFilter.toLowerCase())
        );
        if (!hasCert) return false;
      }

      if (countryFilter !== "all") {
        if (p.supplier?.country_of_origin !== countryFilter) return false;
      }

      return true;
    });
  }, [
    products,
    searchFilter,
    kosherFilter,
    privateLabelOnly,
    certFilter,
    countryFilter,
  ]);

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / PAGE_SIZE);
  const paginatedProducts = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredProducts.slice(start, start + PAGE_SIZE);
  }, [filteredProducts, page]);

  return (
    <div dir="rtl" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* ── BREADCRUMBS & LANGUAGE TOGGLE ── */}
      <div className="flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Link href="/he" className="hover:text-white transition">
            ראשי
          </Link>
          <span>/</span>
          <Link href="/he/products" className="hover:text-white transition">
            קטלוג מוצרים
          </Link>
          <span>/</span>
          <span className="text-orange-400 font-semibold">{meta.title}</span>
        </div>

        <Link
          href={`/en/products/${categorySlug}`}
          className="border border-slate-700 bg-slate-900 hover:border-slate-500 text-slate-300 hover:text-white px-2.5 py-1 rounded-md text-xs font-bold transition"
          dir="ltr"
        >
          EN
        </Link>
      </div>

      {/* ── CATEGORY HERO HEADER ── */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-4xl filter drop-shadow">{meta.icon}</span>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {meta.title}
              </h1>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                {category} · {products.length.toLocaleString()} מוצרים מאומתים
              </p>
            </div>
          </div>

          <p className="text-sm text-slate-300 leading-relaxed">
            {meta.description}
          </p>

          <div className="flex flex-wrap gap-2 text-xs pt-1">
            <span className="bg-slate-800 text-slate-300 px-3 py-1 rounded-full border border-slate-700/80">
              🏷️ מותג פרטי (PL) זמין
            </span>
            <span className="bg-slate-800 text-slate-300 px-3 py-1 rounded-full border border-slate-700/80">
              ✡️ נתיבי כשרות רבנות ובד״ץ
            </span>
            <span className="bg-slate-800 text-slate-300 px-3 py-1 rounded-full border border-slate-700/80">
              🚢 אספקה במכולות FCL לאשדוד/חיפה
            </span>
          </div>
        </div>
      </div>

      {/* ── FILTER & SEARCH TOOLBAR ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Keyword Search */}
          <div className="lg:col-span-2 relative">
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => {
                setSearchFilter(e.target.value);
                setPage(1);
              }}
              placeholder="סינון חופשי לפי שם מוצר או מפעל..."
              className="w-full bg-slate-950 border border-slate-700 focus:border-orange-500 text-white placeholder-slate-500 rounded-xl py-2.5 pr-9 pl-3 text-xs focus:outline-hidden transition"
            />
            <span className="absolute right-3 top-2.5 text-slate-400 text-sm">🔍</span>
          </div>

          {/* Kosher Filter */}
          <div>
            <select
              value={kosherFilter}
              onChange={(e) => {
                setKosherFilter(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl py-2.5 px-3 text-xs focus:outline-hidden focus:border-orange-500 transition cursor-pointer"
            >
              <option value="all">✡️ כל סוגי הכשרות</option>
              <option value="any_kosher">✡️ כל המוצרים הכשרים בלבד</option>
              {allKosherTypes.map((k) => (
                <option key={k} value={k}>
                  כשרות: {k}
                </option>
              ))}
            </select>
          </div>

          {/* Country Filter */}
          <div>
            <select
              value={countryFilter}
              onChange={(e) => {
                setCountryFilter(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl py-2.5 px-3 text-xs focus:outline-hidden focus:border-orange-500 transition cursor-pointer"
            >
              <option value="all">🌍 כל מדינות המקור</option>
              {allCountries.map((c) => (
                <option key={c} value={c}>
                  {COUNTRY_FLAG[c] ?? "🌍"} {COUNTRY_NAMES_HE[c] ?? c}
                </option>
              ))}
            </select>
          </div>

          {/* Private Label & View controls */}
          <div className="flex items-center justify-between sm:justify-end gap-3">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-300 select-none">
              <input
                type="checkbox"
                checked={privateLabelOnly}
                onChange={(e) => {
                  setPrivateLabelOnly(e.target.checked);
                  setPage(1);
                }}
                className="w-4 h-4 rounded-sm border-slate-700 bg-slate-950 text-orange-500 focus:ring-orange-500"
              />
              <span>מותג פרטי (PL)</span>
            </label>

            {/* View Toggle */}
            <div className="inline-flex rounded-lg border border-slate-800 bg-slate-950 p-0.5">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded ${
                  viewMode === "grid"
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
                title="תצוגת רשת"
              >
                ▦
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded ${
                  viewMode === "list"
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
                title="תצוגת רשימה"
              >
                ☰
              </button>
            </div>
          </div>
        </div>

        {/* Results Count & Active Tags */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800/60">
          <span>
            מוצגים <strong className="text-white">{filteredProducts.length}</strong> מוצרים
            {products.length !== filteredProducts.length && (
              <span> (מתוך {products.length})</span>
            )}
          </span>

          {(searchFilter || kosherFilter !== "all" || countryFilter !== "all" || privateLabelOnly) && (
            <button
              onClick={() => {
                setSearchFilter("");
                setKosherFilter("all");
                setCountryFilter("all");
                setPrivateLabelOnly(false);
                setCertFilter("all");
                setPage(1);
              }}
              className="text-orange-400 hover:underline"
            >
              נקה את כל הסינונים ✕
            </button>
          )}
        </div>
      </div>

      {/* ── PRODUCTS DISPLAY ── */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-20 bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-4">
          <span className="text-4xl block">📦</span>
          <p className="text-slate-200 font-bold text-base">
            לא נמצאו מוצרים התואמים את הסינונים שנבחרו
          </p>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            מפעלים רבים ברשת שלנו מסוגלים לייצר מוצרים מותאמים אישית (Bespoke OEM) בהתאם למפרט המדויק שלך.
          </p>
          <div className="pt-2">
            <Link
              href={`/he/sourcing?category=${encodeURIComponent(category)}`}
              className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold py-3 px-6 rounded-xl transition"
            >
              <span>הגש בקשת איתור למפעל בקטגוריה זו ←</span>
            </Link>
          </div>
        </div>
      ) : viewMode === "grid" ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {paginatedProducts.map((p) => {
            const country = p.supplier?.country_of_origin;
            const flag = country ? COUNTRY_FLAG[country] ?? "🌍" : "🌍";
            const countryHe = country ? COUNTRY_NAMES_HE[country] ?? country : "אירופה";
            const rfqUrl = `/he/sourcing?product=${encodeURIComponent(
              cleanProductName(p.product_name, category)
            )}&category=${encodeURIComponent(category)}`;

            const inKit = isItemInKit(p.id);

            return (
              <div
                key={p.id}
                className="bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-orange-500/40 rounded-2xl overflow-hidden transition flex flex-col justify-between shadow-md group"
              >
                {/* Packshot Image */}
                <div
                  onClick={() => setSelectedProductForSpec(p)}
                  className="relative h-48 w-full bg-slate-950 flex items-center justify-center overflow-hidden border-b border-slate-800 cursor-pointer group-hover:opacity-95"
                  title="לחץ לצפייה במפרט טכני ומשטוח"
                >
                  {p.image_url ? (
                    <Image
                      src={p.image_url}
                      alt={p.product_name}
                      fill
                      className="object-contain p-3 group-hover:scale-105 transition duration-300"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    />
                  ) : (
                    <div className="text-slate-600 text-3xl font-mono">
                      {meta.icon}
                    </div>
                  )}

                  {/* Top Badges */}
                  <div className="absolute top-2 right-2 flex flex-col gap-1 z-10">
                    {p.private_label && (
                      <span className="bg-slate-900/90 backdrop-blur-sm border border-orange-500/40 text-orange-400 text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                        🏷️ מותג פרטי
                      </span>
                    )}
                  </div>

                  <div className="absolute top-2 left-2 z-10">
                    <span className="bg-slate-900/90 backdrop-blur-sm border border-slate-700 text-slate-200 text-[10px] font-semibold px-2 py-0.5 rounded shadow-sm inline-flex items-center gap-1">
                      <span>{flag}</span>
                      <span>{countryHe}</span>
                    </span>
                  </div>
                </div>

                {/* Info Content */}
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <h3
                      onClick={() => setSelectedProductForSpec(p)}
                      className="font-bold text-white text-sm line-clamp-2 leading-snug group-hover:text-orange-400 transition cursor-pointer"
                      title="לחץ לצפייה במפרט טכני ומשטוח"
                    >
                      {cleanProductName(p.product_name, category)}
                    </h3>

                    <div className="text-xs text-slate-400 truncate">
                      {p.supplier?.company_name || "מפעל מאומת באירופה"}
                    </div>
                  </div>

                  {/* Specs & Badges */}
                  <div className="space-y-2 pt-2 border-t border-slate-800/80 text-xs">
                    {/* Kosher tags */}
                    {p.kosher_types && p.kosher_types.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap">
                        {p.kosher_types.slice(0, 2).map((k) => (
                          <span
                            key={k}
                            className="inline-flex items-center gap-1 text-[10px] bg-emerald-950/60 text-emerald-300 border border-emerald-800/50 px-2 py-0.5 rounded"
                          >
                            <span>✡️</span>
                            <span>{k}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Certifications */}
                    {p.certifications && p.certifications.length > 0 && (
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 truncate">
                        <span>תקנים:</span>
                        <span className="text-slate-300 font-mono">
                          {p.certifications.slice(0, 2).join(", ")}
                        </span>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="pt-2 flex flex-col gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (inKit) {
                            removeItem(p.id);
                          } else {
                            addItem({
                              id: p.id,
                              product_name: cleanProductName(p.product_name, category),
                              category: category,
                              image_url: p.image_url,
                              supplier_name: p.supplier?.company_name,
                              country_of_origin: country,
                              kosher_types: p.kosher_types,
                              certifications: p.certifications,
                            });
                          }
                        }}
                        className={`w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl font-bold text-xs transition shadow-sm cursor-pointer ${
                          inKit
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500"
                            : "bg-orange-500/10 hover:bg-orange-500 text-orange-400 hover:text-white border border-orange-500/30 hover:border-orange-500"
                        }`}
                      >
                        <span>{inKit ? "✓ בערכת הטעימות" : "+ הוסף לערכת טעימות"}</span>
                      </button>

                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedProductForSpec(p)}
                          className="w-full inline-flex items-center justify-center gap-1 bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold py-1.5 px-2 rounded-xl border border-slate-700 transition cursor-pointer"
                          title="מפרט טכני, משטוח ות״י 1145"
                        >
                          <span>📋</span>
                          <span>מפרט טכני</span>
                        </button>

                        <Link
                          href={rfqUrl}
                          className="w-full inline-flex items-center justify-center gap-1 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold py-1.5 px-2 rounded-xl border border-slate-700 transition"
                        >
                          <span>RFQ</span>
                          <span>←</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* LIST VIEW */
        <div className="space-y-2.5">
          {paginatedProducts.map((p) => {
            const country = p.supplier?.country_of_origin;
            const flag = country ? COUNTRY_FLAG[country] ?? "🌍" : "🌍";
            const countryHe = country ? COUNTRY_NAMES_HE[country] ?? country : "אירופה";
            const rfqUrl = `/he/sourcing?product=${encodeURIComponent(
              cleanProductName(p.product_name, category)
            )}&category=${encodeURIComponent(category)}`;

            const inKit = isItemInKit(p.id);

            return (
              <div
                key={p.id}
                className="bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-orange-500/40 rounded-xl p-3 sm:p-4 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    onClick={() => setSelectedProductForSpec(p)}
                    className="relative w-14 h-14 bg-slate-950 rounded-lg shrink-0 overflow-hidden border border-slate-800 flex items-center justify-center cursor-pointer hover:opacity-90"
                    title="לחץ לצפייה במפרט טכני ומשטוח"
                  >
                    {p.image_url ? (
                      <Image
                        src={p.image_url}
                        alt={p.product_name}
                        fill
                        className="object-contain p-1"
                      />
                    ) : (
                      <span className="text-lg">{meta.icon}</span>
                    )}
                  </div>

                  <div className="min-w-0 space-y-1">
                    <h3
                      onClick={() => setSelectedProductForSpec(p)}
                      className="font-bold text-white text-sm truncate hover:text-orange-400 transition cursor-pointer"
                      title="לחץ לצפייה במפרט טכני ומשטוח"
                    >
                      {cleanProductName(p.product_name, category)}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>{p.supplier?.company_name || "מפעל מאומת באירופה"}</span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1">
                        <span>{flag}</span>
                        <span>{countryHe}</span>
                      </span>
                      {p.private_label && (
                        <>
                          <span>·</span>
                          <span className="text-orange-400 font-semibold">מותג פרטי (PL)</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  {p.kosher_types && p.kosher_types.length > 0 && (
                    <span className="text-[11px] bg-emerald-950/60 text-emerald-300 border border-emerald-800/50 px-2 py-1 rounded hidden md:inline-block">
                      ✡️ {p.kosher_types[0]}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => setSelectedProductForSpec(p)}
                    className="inline-flex items-center gap-1 py-2 px-2.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
                    title="צפה במפרט טכני, משטוח ות״י 1145"
                  >
                    <span>📋</span>
                    <span>מפרט</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (inKit) {
                        removeItem(p.id);
                      } else {
                        addItem({
                          id: p.id,
                          product_name: cleanProductName(p.product_name, category),
                          category: category,
                          image_url: p.image_url,
                          supplier_name: p.supplier?.company_name,
                          country_of_origin: country,
                          kosher_types: p.kosher_types,
                          certifications: p.certifications,
                        });
                      }
                    }}
                    className={`inline-flex items-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
                      inKit
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500"
                        : "bg-orange-500/10 hover:bg-orange-500 text-orange-400 hover:text-white border border-orange-500/30 hover:border-orange-500"
                    }`}
                  >
                    <span>{inKit ? "✓ בערכה" : "+ הוסף לטעימות"}</span>
                  </button>

                  <Link
                    href={rfqUrl}
                    className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold py-2 px-3 rounded-lg border border-slate-700 transition"
                  >
                    <span>RFQ ←</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── PAGINATION BAR ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-6">
          <button
            onClick={() => {
              setPage((p) => Math.max(1, p - 1));
              window.scrollTo({ top: 400, behavior: "smooth" });
            }}
            disabled={page === 1}
            className="px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-700 bg-slate-900 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            → הקודם
          </button>

          <span className="text-xs text-slate-400 px-3 font-mono">
            עמוד {page} מתוך {totalPages}
          </span>

          <button
            onClick={() => {
              setPage((p) => Math.min(totalPages, p + 1));
              window.scrollTo({ top: 400, behavior: "smooth" });
            }}
            disabled={page === totalPages}
            className="px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-700 bg-slate-900 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            הבא ←
          </button>
        </div>
      )}

      {/* ── BOTTOM SOURCING CTA ── */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 text-center space-y-3">
        <h3 className="text-base font-bold text-white">
          לא מצאתם את הפורמט או את המפרט המדויק עבור {meta.title}?
        </h3>
        <p className="text-xs text-slate-400 max-w-xl mx-auto">
          אנו מייצגים ומאתרים יצרנים נוספים באירופה לפי דרישה. שלחו לנו מפרט טכני או תמונת דוגמה וקבלו מענה תוך 24 שעות.
        </p>
        <div className="pt-2 flex flex-wrap gap-3 justify-center">
          <Link
            href={`/he/sourcing?category=${encodeURIComponent(category)}`}
            className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold py-2.5 px-5 rounded-xl transition"
          >
            <span>הגש בקשת RFQ למוצרי {meta.title} ←</span>
          </Link>
          <a
            href={`https://wa.me/972525222291?text=${encodeURIComponent(
              `שלום אודי, אני מעוניין לבדוק יצרנים אירופאים בקטגוריית ${meta.title} עבור הרשת שלנו.`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2.5 px-5 rounded-xl transition"
          >
            <span>💬 שיחה בווטסאפ</span>
          </a>
        </div>
      </div>

      {/* ── TECHNICAL PRODUCT SPEC & PALLETIZATION MODAL ── */}
      {selectedProductForSpec && (
        <ProductSpecModal
          product={selectedProductForSpec}
          onClose={() => setSelectedProductForSpec(null)}
          isHebrew={true}
        />
      )}
    </div>
  );
}
