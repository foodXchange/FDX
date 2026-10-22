"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSampleKit } from "@/context/SampleKitContext";
import { SHELF_BENCHMARKS, type ShelfBenchmarkItem } from "@/lib/benchmark/shelfBenchmarkData";

interface Props {
  isHebrew?: boolean;
}

export default function BenchmarkMatrixClient({ isHebrew = true }: Props) {
  const { addItem, removeItem, isItemInKit } = useSampleKit();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedCountry, setSelectedCountry] = useState<string>("all");
  const [volumeSlider, setVolumeSlider] = useState<number>(4); // Default 4 containers per year

  // Categories list
  const categories = useMemo(() => {
    const map = new Map<string, { en: string; he: string; icon: string }>();
    SHELF_BENCHMARKS.forEach((b) => {
      if (!map.has(b.category)) {
        map.set(b.category, { en: b.category, he: b.category_he, icon: b.category_icon });
      }
    });
    return Array.from(map.entries()).map(([cat, meta]) => ({
      category: cat,
      ...meta,
    }));
  }, []);

  // Countries list
  const countries = useMemo(() => {
    const map = new Map<string, { nameHe: string; nameEn: string; flag: string }>();
    SHELF_BENCHMARKS.forEach((b) => {
      if (!map.has(b.supplier_country)) {
        map.set(b.supplier_country, {
          nameHe: b.supplier_country_he,
          nameEn: b.supplier_country,
          flag: b.supplier_flag,
        });
      }
    });
    return Array.from(map.entries()).map(([country, meta]) => ({
      country,
      ...meta,
    }));
  }, []);

  // Filtered items
  const filteredBenchmarks = useMemo(() => {
    return SHELF_BENCHMARKS.filter((item) => {
      if (selectedCategory !== "all" && item.category !== selectedCategory) return false;
      if (selectedCountry !== "all" && item.supplier_country !== selectedCountry) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchBrand =
          item.brand_name_he.toLowerCase().includes(q) ||
          item.brand_name_en.toLowerCase().includes(q) ||
          item.brand_importer_he.toLowerCase().includes(q);
        const matchReplacement =
          item.replacement_name_he.toLowerCase().includes(q) ||
          item.replacement_name_en.toLowerCase().includes(q) ||
          item.supplier_name.toLowerCase().includes(q) ||
          item.category_he.toLowerCase().includes(q);
        if (!matchBrand && !matchReplacement) return false;
      }
      return true;
    });
  }, [searchTerm, selectedCategory, selectedCountry]);

  // Aggregate KPI metrics
  const avgConsumerSavingsPct = useMemo(() => {
    if (SHELF_BENCHMARKS.length === 0) return 0;
    const totalSavings = SHELF_BENCHMARKS.reduce((acc, curr) => {
      const saving = (curr.shelf_price_ils - curr.target_retail_price_ils) / curr.shelf_price_ils;
      return acc + saving;
    }, 0);
    return Math.round((totalSavings / SHELF_BENCHMARKS.length) * 100);
  }, []);

  const avgMarginExpansionBps = useMemo(() => {
    if (SHELF_BENCHMARKS.length === 0) return 0;
    const totalExpansion = SHELF_BENCHMARKS.reduce((acc, curr) => {
      return acc + (curr.target_retail_margin_pct - curr.brand_estimated_margin_pct);
    }, 0);
    return Math.round(totalExpansion / SHELF_BENCHMARKS.length);
  }, []);

  const totalAnnualPotentialSavings = useMemo(() => {
    return filteredBenchmarks.reduce((acc, curr) => {
      const unitsPerYear = curr.units_per_container * volumeSlider;
      const profitBrand = unitsPerYear * (curr.shelf_price_ils * (curr.brand_estimated_margin_pct / 100));
      const profitPL = unitsPerYear * (curr.target_retail_price_ils - curr.estimated_landed_cost_ils);
      return acc + Math.max(0, profitPL - profitBrand);
    }, 0);
  }, [filteredBenchmarks, volumeSlider]);

  const generateWhatsAppShare = (item: ShelfBenchmarkItem) => {
    const unitsPerYear = item.units_per_container * volumeSlider;
    const profitBrand = unitsPerYear * (item.shelf_price_ils * (item.brand_estimated_margin_pct / 100));
    const profitPL = unitsPerYear * (item.target_retail_price_ils - item.estimated_landed_cost_ils);
    const extraProfit = Math.round(profitPL - profitBrand);
    const savingsPct = Math.round(
      ((item.shelf_price_ils - item.target_retail_price_ils) / item.shelf_price_ils) * 100
    );

    const text = isHebrew
      ? `*תחשיב החלפת מותג מדף פרטי — FoodXchange*
📌 *מותג יעד:* ${item.brand_name_he} (מחיר מדף: ₪${item.shelf_price_ils.toFixed(2)})
🏭 *חלופת יצרן אירופי:* ${item.replacement_name_he} (${item.supplier_flag} ${item.supplier_name})
💰 *עלות נחיתה במרלו״ג:* ₪${item.estimated_landed_cost_ils.toFixed(2)} (FOB: €${item.factory_fob_eur.toFixed(2)})
🎯 *מחיר יעד לצרכן:* ₪${item.target_retail_price_ils.toFixed(2)} (${savingsPct}% חיסכון לצרכן)
📈 *מרווח לרשת:* ${item.target_retail_margin_pct}% (לעומת ${item.brand_estimated_margin_pct}% במותג)
💵 *תוספת רווח גולמי שנתי (${volumeSlider} מכולות):* ₪${extraProfit.toLocaleString()}
קישור לבחינה מלאה: https://fdx.trading/he/benchmark`
      : `*Private Label Shelf Replacement Benchmark — FoodXchange*
📌 *Target Brand:* ${item.brand_name_en} (Shelf: ₪${item.shelf_price_ils.toFixed(2)})
🏭 *European Factory Alt:* ${item.replacement_name_en} (${item.supplier_flag} ${item.supplier_name})
💰 *Est. Landed Cost:* ₪${item.estimated_landed_cost_ils.toFixed(2)} (FOB: €${item.factory_fob_eur.toFixed(2)})
🎯 *Target Consumer Price:* ₪${item.target_retail_price_ils.toFixed(2)} (${savingsPct}% consumer saving)
📈 *Chain Gross Margin:* ${item.target_retail_margin_pct}% (vs ${item.brand_estimated_margin_pct}% on brand)
💵 *Extra Gross Profit (${volumeSlider} FCLs):* ₪${extraProfit.toLocaleString()}
Full Matrix: https://fdx.trading/en/benchmark`;

    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  };

  return (
    <div dir={isHebrew ? "rtl" : "ltr"} className="space-y-8">
      {/* ── HERO BANNER ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 p-6 sm:p-10 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-4xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 text-xs font-bold uppercase tracking-wider">
            <span>⚡</span>
            <span>{isHebrew ? "מטריצת החלפת מותגי מדף לקניינים" : "Competitive Shelf Replacement Matrix"}</span>
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
            {isHebrew ? (
              <>
                החלפת מוצרי מדף יקרים ב-
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-300">
                  Private Label אירופאי
                </span>
              </>
            ) : (
              <>
                Replace Expensive National Brands with{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-300">
                  Direct European Private Label
                </span>
              </>
            )}
          </h1>

          <p className="text-sm sm:text-base text-slate-300 max-w-3xl leading-relaxed">
            {isHebrew
              ? "ניתוח כלכלי השוואתי עבור הנהלות רשתות השיווק וקנייני הסחר בישראל. שילוב בין הוזלת סל הצרכן ב-20%-35% לבין הרחבת מרווח המדף הגולמי של הרשת ל-40%-50%, ביבוא ישיר ממפעלי ייצור מאושרים באירופה."
              : "Comparative financial intelligence for Israeli retail supermarket buyers and category managers. Lower consumer shelf prices by 20%-35% while expanding chain gross margins to 40%-50% through direct European factory sourcing."}
          </p>

          {/* KPI Snapshot Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-4">
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-1">
              <span className="text-xs text-slate-400 block">
                {isHebrew ? "ממוצע הוזלת מחיר לצרכן" : "Avg Consumer Price Drop"}
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-emerald-400">
                  -{avgConsumerSavingsPct}%
                </span>
                <span className="text-xs text-slate-500">
                  {isHebrew ? "מול מותג מדף מוביל" : "vs national brand"}
                </span>
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-1">
              <span className="text-xs text-slate-400 block">
                {isHebrew ? "ממוצע הרחבת מרווח גולמי לרשת" : "Avg Chain Margin Expansion"}
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-orange-400">
                  +{avgMarginExpansionBps}%
                </span>
                <span className="text-xs text-slate-500">
                  {isHebrew ? "תוספת למרווח (במקום ~18%)" : "higher gross margin"}
                </span>
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-1">
              <span className="text-xs text-slate-400 block">
                {isHebrew
                  ? `תוספת רווח גולמי (${volumeSlider} מכולות לקטגוריה)`
                  : `Extra Gross Profit (${volumeSlider} FCLs/cat)`}
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-white font-mono">
                  ₪{Math.round(totalAnnualPotentialSavings / 1000).toLocaleString()}K
                </span>
                <span className="text-xs text-slate-400">
                  {isHebrew ? "לשנה לכל הרשת" : "net chain profit"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── GLOBAL CONTROLS & VOLUME SLIDER ── */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-5 shadow-lg">
        {/* Top Controls Row */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1">
            <span className="absolute inset-y-0 start-3.5 flex items-center text-slate-500 pointer-events-none text-sm">
              🔍
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={
                isHebrew
                  ? "חפש לפי מותג מדף (יד מרדכי, מוטי, ברילה, ריו מרה, סנפרוסט...) או יצרן..."
                  : "Search by brand (Mutti, Barilla, Rio Mare, Heinz...) or factory..."
              }
              className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 ps-10 pe-4 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute inset-y-0 end-3 flex items-center text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Volume Slider */}
          <div className="bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-800 flex items-center gap-3 shrink-0">
            <div className="text-xs">
              <span className="text-slate-400 block">
                {isHebrew ? "היקף צריכה שנתי לרשת:" : "Annual Chain Consumption:"}
              </span>
              <span className="text-white font-bold font-mono">
                {volumeSlider} {isHebrew ? "מכולות FCL" : "FCL Containers"}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="16"
              value={volumeSlider}
              onChange={(e) => setVolumeSlider(Number(e.target.value))}
              className="accent-orange-500 w-28 sm:w-36 cursor-pointer"
            />
          </div>
        </div>

        {/* Category & Country Filter Pills */}
        <div className="space-y-3 pt-2 border-t border-slate-800/80">
          {/* Categories */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer ${
                selectedCategory === "all"
                  ? "bg-orange-500 text-white shadow-md shadow-orange-500/20"
                  : "bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800"
              }`}
            >
              {isHebrew ? "כל הקטגוריות" : "All Categories"} ({SHELF_BENCHMARKS.length})
            </button>
            {categories.map((c) => (
              <button
                key={c.category}
                onClick={() => setSelectedCategory(c.category)}
                className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap flex items-center gap-1.5 transition cursor-pointer ${
                  selectedCategory === c.category
                    ? "bg-orange-500 text-white font-bold shadow-md shadow-orange-500/20"
                    : "bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800"
                }`}
              >
                <span>{c.icon}</span>
                <span>{isHebrew ? c.he : c.en}</span>
              </button>
            ))}
          </div>

          {/* Countries */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
            <span className="text-slate-500 text-[11px] font-semibold whitespace-nowrap">
              {isHebrew ? "מדינת יצרן אירופאי:" : "European Factory Origin:"}
            </span>
            <button
              onClick={() => setSelectedCountry("all")}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                selectedCountry === "all"
                  ? "bg-slate-700 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {isHebrew ? "כל המדינות" : "All Countries"}
            </button>
            {countries.map((c) => (
              <button
                key={c.country}
                onClick={() => setSelectedCountry(c.country)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1 transition ${
                  selectedCountry === c.country
                    ? "bg-slate-700 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <span>{c.flag}</span>
                <span>{isHebrew ? c.nameHe : c.nameEn}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── BENCHMARK CARDS LIST ── */}
      {filteredBenchmarks.length === 0 ? (
        <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-4">
          <span className="text-4xl block">🔍</span>
          <p className="text-slate-200 font-bold text-base">
            {isHebrew ? "לא נמצאו מותגי מדף תואמים לחיפוש" : "No benchmark matches found"}
          </p>
          <button
            onClick={() => {
              setSearchTerm("");
              setSelectedCategory("all");
              setSelectedCountry("all");
            }}
            className="text-orange-400 hover:underline text-xs"
          >
            {isHebrew ? "אפס סינונים ✕" : "Reset filters ✕"}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredBenchmarks.map((item) => {
            const inKit = isItemInKit(item.id);

            // Calculations per item
            const unitsPerYear = item.units_per_container * volumeSlider;
            const consumerSavingsPerUnit = item.shelf_price_ils - item.target_retail_price_ils;
            const consumerSavingsPct = Math.round(
              (consumerSavingsPerUnit / item.shelf_price_ils) * 100
            );

            const brandProfitPerUnit = item.shelf_price_ils * (item.brand_estimated_margin_pct / 100);
            const plProfitPerUnit = item.target_retail_price_ils - item.estimated_landed_cost_ils;
            const extraProfitPerUnit = plProfitPerUnit - brandProfitPerUnit;
            const extraProfitYearly = Math.round(extraProfitPerUnit * unitsPerYear);
            const marginGainBps = item.target_retail_margin_pct - item.brand_estimated_margin_pct;

            const calculatorUrl = `/${isHebrew ? "he" : "en"}/calculator?product=${encodeURIComponent(
              item.replacement_name_he
            )}&fob=${item.factory_fob_eur}&category=${encodeURIComponent(item.category)}`;

            const sourcingUrl = `/${isHebrew ? "he" : "en"}/sourcing?product=${encodeURIComponent(
              item.replacement_name_he
            )}&category=${encodeURIComponent(item.category)}`;

            return (
              <div
                key={item.id}
                className="bg-slate-900/90 hover:bg-slate-850/90 border border-slate-800 hover:border-orange-500/40 rounded-3xl p-5 sm:p-7 transition-all shadow-xl space-y-6"
              >
                {/* Card Top: Category Badge & Container Spec */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{item.category_icon}</span>
                    <span className="text-xs font-bold text-slate-300">
                      {isHebrew ? item.category_he : item.category}
                    </span>
                    <span className="text-slate-600">·</span>
                    <span className="text-xs text-slate-400">
                      {item.shelf_life_months} {isHebrew ? "חודשי תוקף" : "months shelf-life"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono bg-slate-950 text-slate-300 border border-slate-800 px-2.5 py-1 rounded-lg">
                      {item.container_type} · {item.units_per_container.toLocaleString()}{" "}
                      {isHebrew ? "יח׳/מכולה" : "units/FCL"}
                    </span>
                    <span className="text-[11px] font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-800/50 px-2.5 py-1 rounded-lg">
                      ✡️ {isHebrew ? item.kosher_type_he : item.kosher_type_en}
                    </span>
                  </div>
                </div>

                {/* Main 2-Sided Comparison Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                  {/* LEFT: Israeli National Shelf Brand (5 cols) */}
                  <div className="lg:col-span-5 bg-slate-950/80 rounded-2xl p-4 sm:p-5 border border-rose-950/50 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
                          {isHebrew ? "מותג מדף ישראלי מוביל" : "Current National Brand"}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {isHebrew ? "יבואן / מפיץ:" : "Distributor:"} {isHebrew ? item.brand_importer_he : item.brand_importer_en}
                        </span>
                      </div>

                      <h3 className="text-base sm:text-lg font-bold text-white leading-snug">
                        {isHebrew ? item.brand_name_he : item.brand_name_en}
                      </h3>
                      <p className="text-xs text-slate-400">
                        {isHebrew ? item.shelf_format_he : item.shelf_format_en}
                      </p>
                    </div>

                    {/* Brand Economics Box */}
                    <div className="bg-slate-900/90 rounded-xl p-3 border border-slate-800/80 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">
                          {isHebrew ? "מחיר ממוצע לצרכן על המדף:" : "Avg Retail Consumer Price:"}
                        </span>
                        <span className="text-base font-bold text-white font-mono">
                          ₪{item.shelf_price_ils.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800">
                        <span className="text-slate-400">
                          {isHebrew ? "מרווח גולמי משוער לרשת:" : "Est. Chain Gross Margin:"}
                        </span>
                        <span className="text-xs font-semibold text-rose-400 font-mono">
                          ~{item.brand_estimated_margin_pct}% ({isHebrew ? "נשחק ע״י יבואנים" : "eroded by monopoly"})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* CENTER: VS Indicator & Savings Pill (2 cols) */}
                  <div className="lg:col-span-2 flex flex-col items-center justify-center py-2 text-center space-y-2">
                    <span className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-black text-slate-300 shadow-md">
                      VS
                    </span>
                    <div className="bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs px-3 py-1.5 rounded-xl font-bold shadow-md">
                      <div>-{consumerSavingsPct}% {isHebrew ? "לצרכן" : "Consumer"}</div>
                      <div className="text-[10px] text-emerald-400 font-normal">
                        (חיסכון ₪{consumerSavingsPerUnit.toFixed(2)})
                      </div>
                    </div>
                  </div>

                  {/* RIGHT: Direct European Factory Replacement (5 cols) */}
                  <div className="lg:col-span-5 bg-slate-950/80 rounded-2xl p-4 sm:p-5 border border-emerald-950/50 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
                          {isHebrew ? "חלופת מותג פרטי ישיר (PL)" : "Direct Factory Private Label"}
                        </span>
                        <span className="text-[11px] text-slate-300 font-semibold inline-flex items-center gap-1">
                          <span>{item.supplier_flag}</span>
                          <span>{item.supplier_name}</span>
                        </span>
                      </div>

                      <h3 className="text-base sm:text-lg font-bold text-white leading-snug text-emerald-300">
                        {isHebrew ? item.replacement_name_he : item.replacement_name_en}
                      </h3>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {item.certifications.slice(0, 3).map((cert) => (
                          <span
                            key={cert}
                            className="text-[10px] bg-slate-900 text-slate-300 border border-slate-700 px-2 py-0.5 rounded"
                          >
                            {cert}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* PL Economics Box */}
                    <div className="bg-slate-900/90 rounded-xl p-3 border border-emerald-800/30 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">
                          {isHebrew ? "עלות נחיתה במרלו״ג (Landed):" : "Est. Landed Cost in Israel:"}
                        </span>
                        <div className="text-end">
                          <span className="text-sm font-bold text-white font-mono">
                            ₪{item.estimated_landed_cost_ils.toFixed(2)}
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            (FOB: €{item.factory_fob_eur.toFixed(2)})
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800">
                        <span className="text-slate-300 font-bold">
                          {isHebrew ? "מחיר מומלץ על המדף לרשת:" : "Target Consumer Shelf Price:"}
                        </span>
                        <span className="text-base font-black text-emerald-400 font-mono">
                          ₪{item.target_retail_price_ils.toFixed(2)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800 text-orange-400 font-bold">
                        <span>{isHebrew ? "מרווח גולמי חדש לרשת:" : "New Chain Gross Margin:"}</span>
                        <span>
                          {item.target_retail_margin_pct}% (+{marginGainBps}% {isHebrew ? "שיפור" : "expansion"})
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Annual Chain Economics Banner */}
                <div className="bg-gradient-to-r from-orange-950/40 via-slate-950 to-emerald-950/40 rounded-2xl p-4 border border-orange-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="space-y-1 text-center sm:text-start">
                    <span className="text-xs font-bold text-orange-300 block">
                      {isHebrew
                        ? `💵 פוטנציאל תוספת רווח שנתי לרשת (${volumeSlider} מכולות):`
                        : `💵 Annual Extra Profit Potential for Chain (${volumeSlider} FCLs):`}
                    </span>
                    <p className="text-xs text-slate-400">
                      {isHebrew
                        ? `צריכה של ${unitsPerYear.toLocaleString()} יחידות בשנה מייצרת לרשת מרווח שקלי עודף ללא תחרות יבואנים.`
                        : `Annual volume of ${unitsPerYear.toLocaleString()} units unlocks massive margin gain vs distributor monopoly.`}
                    </p>
                  </div>

                  <div className="text-center sm:text-end shrink-0">
                    <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono block">
                      +₪{extraProfitYearly.toLocaleString()}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {isHebrew ? "תוספת רווח גולמי נטו" : "Net gross profit addition"}
                    </span>
                  </div>
                </div>

                {/* Sensory & Quality Highlights */}
                <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1">
                  <span className="font-bold text-slate-200 block">
                    {isHebrew ? "🔬 דגשים סנסוריים ובדיקות איכות:" : "🔬 Sensory & Lab Highlights:"}
                  </span>
                  <p className="leading-relaxed text-slate-400">
                    {isHebrew ? item.sensory_notes_he : item.sensory_notes_en}
                  </p>
                </div>

                {/* Action Buttons Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Add to Sample Kit Button */}
                    <button
                      type="button"
                      onClick={() => {
                        if (inKit) {
                          removeItem(item.id);
                        } else {
                          addItem({
                            id: item.id,
                            product_name: item.replacement_name_he,
                            category: item.category,
                            image_url: item.packshot_url,
                            supplier_name: item.supplier_name,
                            country_of_origin: item.supplier_country,
                            kosher_types: [item.kosher_type_he],
                            certifications: item.certifications,
                            sample_format: item.shelf_format_he,
                          });
                        }
                      }}
                      className={`inline-flex items-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer ${
                        inKit
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500"
                          : "bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/20"
                      }`}
                    >
                      <span>📦</span>
                      <span>
                        {inKit
                          ? isHebrew
                            ? "✓ בערכת הטעימות"
                            : "✓ In Tasting Box"
                          : isHebrew
                          ? "+ הוסף דוגמה לערכת טעימות"
                          : "+ Add to Tasting Box"}
                      </span>
                    </button>

                    {/* Open in Landed Cost Calculator */}
                    <Link
                      href={calculatorUrl}
                      className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold py-2.5 px-4 rounded-xl border border-slate-700 transition"
                    >
                      <span>⚡</span>
                      <span>{isHebrew ? "פתח במחשבון עלות נחיתה" : "Landed Cost Calculator"}</span>
                    </Link>

                    {/* Sourcing RFQ */}
                    <Link
                      href={sourcingUrl}
                      className="inline-flex items-center gap-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold py-2.5 px-3.5 rounded-xl border border-slate-700 transition"
                    >
                      <span>{isHebrew ? "בקש הצעת מחיר RFQ ←" : "Request RFQ ←"}</span>
                    </Link>
                  </div>

                  {/* Share & Print */}
                  <div className="flex items-center gap-2">
                    <a
                      href={generateWhatsAppShare(item)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/50 py-2 px-3 rounded-xl text-xs font-semibold transition"
                      title={isHebrew ? "שתף תחשיב לקניין בווטסאפ" : "Share via WhatsApp"}
                    >
                      <span>💬</span>
                      <span className="hidden sm:inline">{isHebrew ? "שתף תחשיב ב-WhatsApp" : "Share WhatsApp"}</span>
                    </a>

                    <button
                      onClick={() => window.print()}
                      className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl border border-slate-700 transition text-xs"
                      title={isHebrew ? "הדפס דף השוואה A4" : "Print Spec Sheet"}
                    >
                      🖨️
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── FOOTER ADVISORY BANNER ── */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center space-y-4">
        <h3 className="text-lg sm:text-xl font-bold text-white">
          {isHebrew
            ? "מעוניינים בבנצ'מרק של מותג ישראלי נוסף שאינו מופיע ברשימה?"
            : "Looking for an Alternative to a Specific Israeli Brand?"}
        </h3>
        <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mx-auto leading-relaxed">
          {isHebrew
            ? "צוות הסחר והרגולציה של FoodXchange מאתר מפעלי יצרן מובילים באירופה לפי מפרט טכני מדויק (Reverse Sourcing). שלחו לנו ברקוד, צילום תווית או מחיר יעד, ואנו נחזיר תחשיב נחיתה ומפעל מאושר תוך 48 שעות."
            : "Our sourcing desk specializes in European Reverse Sourcing for Israeli retail. Send us a retail barcode, label spec, or target CIF price, and we will benchmark certified European factories within 48 hours."}
        </p>
        <div className="pt-2 flex flex-wrap gap-3 justify-center">
          <Link
            href={`/${isHebrew ? "he" : "en"}/sourcing`}
            className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs sm:text-sm py-3 px-6 rounded-xl transition shadow-lg shadow-orange-500/20"
          >
            <span>{isHebrew ? "הגש בקשת בנצ'מרק ו-RFQ אישי ←" : "Request Custom Brand Benchmark ←"}</span>
          </Link>
          <a
            href="https://wa.me/972525222291?text=%D7%A9%D7%9C%D7%95%D7%9D%20%D7%90%D7%95%D7%93%D7%99%2C%20%D7%90%D7%A0%D7%99%20%D7%9E%D7%A2%D7%95%D7%A0%D7%99%D7%99%D7%9F%20%D7%9C%D7%91%D7%97%D7%95%D7%9F%20%D7%97%D7%9C%D7%95%D7%A4%D7%AA%20Private%20Label%20%D7%9C%D7%9E%D7%95%D7%AA%D7%92%20%D7%9E%D7%93%D7%A3%20%D7%91%D7%A8%D7%A9%D7%AA"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs sm:text-sm py-3 px-6 rounded-xl border border-slate-700 transition"
          >
            <span>💬</span>
            <span>{isHebrew ? "שיחה ישירה עם אודי ב-WhatsApp" : "Direct WhatsApp with Udi"}</span>
          </a>
        </div>
      </div>
    </div>
  );
}
