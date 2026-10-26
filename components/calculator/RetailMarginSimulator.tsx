"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import TourGuide, { TourStep } from "../tour/TourGuide";
import {
  RETAIL_BENCHMARK_PRESETS,
  RetailBenchmarkPreset,
  RetailMarginResult,
  calculateRetailMargin,
} from "../../lib/calculator/retailMarginEngine";

interface Props {
  locale?: "he" | "en";
}

export default function RetailMarginSimulator({ locale = "he" }: Props) {
  const isHe = locale === "he";

  // Selected Preset
  const [selectedPresetId, setSelectedPresetId] = useState<string>("olive_oil_evoo");
  const currentPreset = RETAIL_BENCHMARK_PRESETS[selectedPresetId] || RETAIL_BENCHMARK_PRESETS.olive_oil_evoo;

  // Custom Editable Overrides
  const [cifEur, setCifEur] = useState<number>(currentPreset.factoryCifEur);
  const [fxRate, setFxRate] = useState<number>(currentPreset.defaultExchangeRate);
  const [targetShelfPrice, setTargetShelfPrice] = useState<number>(currentPreset.privateLabelTargetShelfPriceIls);
  const [benchmarkShelfPrice, setBenchmarkShelfPrice] = useState<number>(currentPreset.nationalBrandShelfPriceIls);
  const [benchmarkWholesaleCost, setBenchmarkWholesaleCost] = useState<number>(currentPreset.nationalBrandWholesaleCostIls);

  // Modal for 1-Page Category Review Deck
  const [showDeckModal, setShowDeckModal] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Handle Preset Change
  const handleSelectPreset = (presetId: string) => {
    const p = RETAIL_BENCHMARK_PRESETS[presetId];
    if (!p) return;
    setSelectedPresetId(presetId);
    setCifEur(p.factoryCifEur);
    setFxRate(p.defaultExchangeRate);
    setTargetShelfPrice(p.privateLabelTargetShelfPriceIls);
    setBenchmarkShelfPrice(p.nationalBrandShelfPriceIls);
    setBenchmarkWholesaleCost(p.nationalBrandWholesaleCostIls);
  };

  // Calculate live results
  const marginResult: RetailMarginResult = useMemo(() => {
    return calculateRetailMargin(currentPreset, {
      factoryCifEur: cifEur,
      exchangeRate: fxRate,
      targetShelfPriceIls: targetShelfPrice,
      benchmarkShelfPriceIls: benchmarkShelfPrice,
      benchmarkWholesaleCostIls: benchmarkWholesaleCost,
    });
  }, [currentPreset, cifEur, fxRate, targetShelfPrice, benchmarkShelfPrice, benchmarkWholesaleCost]);

  // Tour steps
  const tourSteps: TourStep[] = [
    {
      targetSelector: "#preset-selector-bar",
      titleHe: "בחירת קטגוריית מוצר ומותג ייחוס",
      titleEn: "Select Category & National Benchmark",
      descHe: "בחר מתוך תבניות שוק מובילות: שמן זית מול יד מרדכי, פסטה מול ברילה, עגבניות מול מוטי, או זיתים מול בית השיטה.",
      descEn: "Select retail staple categories benchmarked against national leaders (Barilla, Mutti, Yad Mordechai, Beit Hashita).",
      position: "bottom",
      icon: "🛒",
    },
    {
      targetSelector: "#cif-inputs-card",
      titleHe: "פרמטרי עלות יבוא CIF ושער חליפין",
      titleEn: "CIF Factory Cost & FX Parameters",
      descHe: "שנה בזמן אמת את מחיר ה-CIF במפעל באירופה (€) ואת שער ההמרה אירו/שקל לחישוב מדויק של עלויות הבסיס.",
      descEn: "Fine-tune factory CIF export price in EUR and EUR/ILS exchange rate for instantaneous recalculation.",
      position: "bottom",
      icon: "💶",
    },
    {
      targetSelector: "#cost-waterfall-card",
      titleHe: "מפל עלויות נחיתה בישראל (Landed Cost Waterfall)",
      titleEn: "Landed Cost Waterfall Breakdown",
      descHe: "פירוט מלא של כל שלב בשרשרת: דמי נמל, עמילות מכס, כשרות מהדרין, סימון ת״י 1145 והובלה למרלו״ג הרשת.",
      descEn: "Full itemized waterfall: Port THC, Customs Clearance, Kosher supervision, SI 1145 Hebrew thermal labeling, and DC inland freight.",
      position: "left",
      icon: "📊",
    },
    {
      targetSelector: "#margin-comparison-card",
      titleHe: "השוואת רווחיות רשת: מותג פרטי מול מותג ארצי",
      titleEn: "Retail Gross Margin Comparison",
      descHe: "ראה כיצד היבוא הישיר מקפיץ את הרווח הגולמי של הרשת מ-14% ל-40%+ תוך הוזלת המחיר לצרכן ב-30%!",
      descEn: "Discover how direct B2B sourcing expands supermarket margin from 14% to 40%+ while lowering shelf price by 30%.",
      position: "right",
      icon: "📈",
    },
    {
      targetSelector: "#deck-export-button",
      titleHe: "הפקת מצגת מנהל קטגוריה ב-1 עמוד להדפסה",
      titleEn: "Generate 1-Page Category Review Deck",
      descHe: "לחץ כאן לצפייה והדפסה של מסמך סקירת קטגוריה רשמי ומקצועי המוכן לחתימת מנהל סחר וסמנכ״ל הרשת.",
      descEn: "Click to generate a printable, executive-ready 1-Page Category Review Deck with executive sign-off block.",
      position: "top",
      icon: "📄",
    },
  ];

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div
      dir={isHe ? "rtl" : "ltr"}
      className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8 selection:bg-emerald-500 selection:text-white"
    >
      {/* Interactive Tour Guide */}
      <TourGuide tourId="retail_margin_simulator_tour" steps={tourSteps} lang={isHe ? "he" : "en"} autoStart={false} />

      {/* Top Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {isHe ? "מודול קמעונאות B2B2C" : "Retail B2B2C Engine"}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                {isHe ? "תחשיב רווח גולמי רשת" : "Supermarket Margin Simulator"}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {isHe ? "סימולטור מרווח מדף קמעונאי ועלות נחיתה במרלו״ג" : "Supermarket Retail Margin & Landed Cost Simulator"}
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl">
              {isHe
                ? "ניתוח כלכלי מקיף של עלויות יבוא CIF מאירופה לשקל, מפל רגולציה ולוגיסטיקה מקומית (ת״י 1145, כשרות, נמל), והשוואת רווחיות הרשת מול מותגים מובילים."
                : "Full waterfall simulation from European factory CIF into ILS, Israeli regulatory compliance (SI 1145, Kosher, THC), and gross margin expansion vs. national benchmark brands."}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="deck-export-button"
              onClick={() => setShowDeckModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium text-sm shadow-lg shadow-emerald-950/40 transition-all border border-emerald-500/30"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {isHe ? "סקירת קטגוריה (1-Page Deck)" : "1-Page Category Deck"}
            </button>

            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-medium text-sm border border-slate-700/60 transition-all"
            >
              {copiedLink ? (
                <>
                  <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{isHe ? "הועתק!" : "Copied!"}</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  <span>{isHe ? "שתף" : "Share"}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Preset Selector Bar */}
        <div id="preset-selector-bar" className="mt-6">
          <p className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-2.5">
            {isHe ? "בחר תבנית קטגוריה קמעונאית:" : "Select Retail Category Benchmark:"}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {Object.values(RETAIL_BENCHMARK_PRESETS).map((preset) => {
              const isSelected = preset.id === selectedPresetId;
              return (
                <button
                  key={preset.id}
                  onClick={() => handleSelectPreset(preset.id)}
                  className={`text-right p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                    isSelected
                      ? "bg-slate-900 border-emerald-500 shadow-md shadow-emerald-950/30 ring-1 ring-emerald-500/40"
                      : "bg-slate-900/60 border-slate-800 hover:bg-slate-900 hover:border-slate-700 text-slate-300"
                  }`}
                >
                  <div className="w-full">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700">
                        {isHe ? preset.categoryNameHe : preset.categoryNameEn}
                      </span>
                      {isSelected && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 ring-4 ring-emerald-400/20" />
                      )}
                    </div>
                    <div className="font-semibold text-sm text-white line-clamp-1">
                      {isHe ? preset.productNameHe : preset.productNameEn}
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-800/80 text-xs flex items-center justify-between text-slate-400">
                    <span>{isHe ? "ייחוס:" : "Vs:"}</span>
                    <span className="font-medium text-slate-300">{preset.nationalBrandName}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Grid: Inputs vs. Waterfall vs. Margin Comparisons */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 Cols): Parameter Inputs */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card: Sourcing & Pricing Inputs */}
          <div id="cif-inputs-card" className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                {isHe ? "נתוני מקור ותמחור מדף" : "Sourcing & Shelf Pricing"}
              </h3>
              <span className="text-xs text-slate-400">{currentPreset.containerType}</span>
            </div>

            <div className="space-y-4 text-sm">
              {/* Factory CIF in EUR */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-slate-300 font-medium">
                    {isHe ? "מחיר CIF מפעל באירופה (€):" : "Factory CIF Price (€):"}
                  </label>
                  <span className="text-xs font-mono text-emerald-400 font-semibold">€{cifEur.toFixed(3)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0.10"
                    value={cifEur}
                    onChange={(e) => setCifEur(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:border-emerald-500 focus:outline-none"
                  />
                  <span className="text-slate-400 text-xs whitespace-nowrap">€ / {isHe ? "יחידה" : "unit"}</span>
                </div>
              </div>

              {/* EUR to ILS Exchange Rate */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-slate-300 font-medium">
                    {isHe ? "שער המרה EUR / ILS:" : "EUR/ILS FX Rate:"}
                  </label>
                  <span className="text-xs font-mono text-blue-400 font-semibold">₪{fxRate.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="3.0"
                    max="5.5"
                    value={fxRate}
                    onChange={(e) => setFxRate(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:border-blue-500 focus:outline-none"
                  />
                  <span className="text-slate-400 text-xs whitespace-nowrap">₪ / €</span>
                </div>
              </div>

              {/* Calculated Base CIF in ILS */}
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400 text-xs">
                  {isHe ? "עלות CIF בסיסית בשקלים:" : "Base CIF in ILS:"}
                </span>
                <span className="font-mono font-bold text-white text-base">₪{marginResult.baseCifIls.toFixed(2)}</span>
              </div>

              {/* Private Label Target Shelf Price (inc. 18% VAT) */}
              <div className="pt-2 border-t border-slate-800">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-slate-300 font-medium">
                    {isHe ? "מחיר יעד לצרכן על המדף (כולל 18% מע״מ):" : "Target Consumer Shelf Price (inc. 18% VAT):"}
                  </label>
                  <span className="text-xs font-mono text-emerald-400 font-semibold">₪{targetShelfPrice.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.10"
                    min="1.0"
                    value={targetShelfPrice}
                    onChange={(e) => setTargetShelfPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-emerald-500/50 rounded-xl px-3 py-2 text-emerald-400 font-bold font-mono focus:border-emerald-500 focus:outline-none"
                  />
                  <span className="text-slate-400 text-xs whitespace-nowrap">₪ / {isHe ? "יחידה" : "unit"}</span>
                </div>
                <div className="mt-1 text-xs text-slate-400 flex justify-between">
                  <span>{isHe ? "הכנסה נטו לרשת (לפני מע״מ):" : "Net Supermarket Revenue (ex. VAT):"}</span>
                  <span className="font-mono text-slate-300 font-medium">₪{marginResult.netRevenueExVatIls.toFixed(2)}</span>
                </div>
              </div>

              {/* Benchmark National Brand Comparison Inputs */}
              <div className="pt-2 border-t border-slate-800 space-y-3">
                <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide">
                  {isHe ? "נתוני מותג מוביל בשוק (ייחוס):" : "National Brand Benchmark Inputs:"}
                </p>
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>{isHe ? "מחיר מדף מותג מוביל (כולל מע״מ):" : "National Brand Shelf Price (inc. VAT):"}</span>
                    <span className="font-mono text-amber-400">₪{benchmarkShelfPrice.toFixed(2)}</span>
                  </div>
                  <input
                    type="number"
                    step="0.10"
                    value={benchmarkShelfPrice}
                    onChange={(e) => setBenchmarkShelfPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono text-sm focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>{isHe ? "מחיר קנייה סיטונאי של הרשת מספק מקומי:" : "Supermarket Wholesale Cost from Local Supplier:"}</span>
                    <span className="font-mono text-amber-400">₪{benchmarkWholesaleCost.toFixed(2)}</span>
                  </div>
                  <input
                    type="number"
                    step="0.10"
                    value={benchmarkWholesaleCost}
                    onChange={(e) => setBenchmarkWholesaleCost(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono text-sm focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Container Specs */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-xs text-slate-400">
            <div className="flex items-center justify-between font-medium text-slate-300 mb-2">
              <span>{isHe ? "מפרט מכולת יבוא מלאה (FCL):" : "Full Container Load (FCL) Specs:"}</span>
              <span className="text-emerald-400 font-mono font-bold">
                {marginResult.containerVolumeUnits.toLocaleString()} {isHe ? "יח׳" : "units"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
              <div>
                <span className="text-slate-500">{isHe ? "מבנה משלוח:" : "Container:"}</span>{" "}
                <span className="text-slate-300 font-medium">{currentPreset.containerType}</span>
              </div>
              <div>
                <span className="text-slate-500">{isHe ? "משטחים:" : "Pallets:"}</span>{" "}
                <span className="text-slate-300 font-medium">{currentPreset.palletCount} {isHe ? "משטחי יורו" : "EUR pallets"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (7 Cols): Landed Waterfall & Margin Cards */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card: Landed Cost Waterfall */}
          <div id="cost-waterfall-card" className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-white flex items-center gap-2">
                  <svg className="w-5 h-5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  {isHe ? "מפל עלויות נחיתה בישראל (Landed Cost Waterfall)" : "Israeli Landed Cost Waterfall"}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isHe ? "עלויות ליחידה אחת המגיעה ישירות למרלו״ג הרשת" : "Itemized cost breakdown per unit delivered to Supermarket Central DC"}
                </p>
              </div>
              <span className="font-mono text-emerald-400 font-extrabold text-lg">
                ₪{marginResult.totalLandedCostIls.toFixed(2)}
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              {/* Step 1: Base CIF in ILS */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px]">
                    1
                  </span>
                  <div>
                    <div className="font-medium text-slate-200">
                      {isHe ? "עלות יבוא CIF בנמל אשדוד/חיפה" : "CIF Base Price (Ashdod/Haifa Port)"}
                    </div>
                    <div className="text-[10px] text-slate-500">€{cifEur.toFixed(3)} × ₪{fxRate.toFixed(2)}</div>
                  </div>
                </div>
                <span className="font-mono font-bold text-slate-200">₪{marginResult.baseCifIls.toFixed(2)}</span>
              </div>

              {/* Step 2: THC & Port Handling */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center font-bold text-[10px]">
                    2
                  </span>
                  <div>
                    <div className="font-medium text-slate-300">
                      {isHe ? "דמי נמל וסבלות מסוף (THC + Wharfage)" : "Port Terminal Handling (THC & Wharfage)"}
                    </div>
                    <div className="text-[10px] text-slate-500">{isHe ? "אגרות נמל פריקה ושינוע מכולה" : "Port unloading & quay handling"}</div>
                  </div>
                </div>
                <span className="font-mono text-slate-300">₪{marginResult.portTerminalHandlingIls.toFixed(2)}</span>
              </div>

              {/* Step 3: Customs Clearance */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center font-bold text-[10px]">
                    3
                  </span>
                  <div>
                    <div className="font-medium text-slate-300">
                      {isHe ? "עמילות מכס ושער עולמי (Customs Brokerage)" : "Customs Clearance & Shaar Olami EDI"}
                    </div>
                    <div className="text-[10px] text-slate-500">{isHe ? "רישום תיק מכס, בדיקות וסיווג פקודת יבוא" : "EDI customs file, tariff classification"}</div>
                  </div>
                </div>
                <span className="font-mono text-slate-300">₪{marginResult.customsBrokerageIls.toFixed(2)}</span>
              </div>

              {/* Step 4: Kosher Supervision */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center font-bold text-[10px]">
                    4
                  </span>
                  <div>
                    <div className="font-medium text-slate-300">
                      {isHe ? "אגרת פיקוח כשרות (הרבנות הראשית / מהדרין)" : "Kashrut Supervision Fee (Rabbinate / Badatz)"}
                    </div>
                    <div className="text-[10px] text-slate-500">{isHe ? "אישור כשרות יבוא רשמי לתצוגה ברשת" : "Import kosher compliance seal"}</div>
                  </div>
                </div>
                <span className="font-mono text-slate-300">₪{marginResult.kashrutFeeIls.toFixed(2)}</span>
              </div>

              {/* Step 5: SI 1145 Thermal Labeling */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center font-bold text-[10px]">
                    5
                  </span>
                  <div>
                    <div className="font-medium text-slate-300">
                      {isHe ? "מדבקת סימון מזון ת״י 1145 בעברית" : "SI 1145 Hebrew Nutritional Labeling"}
                    </div>
                    <div className="text-[10px] text-slate-500">{isHe ? "הדבקה תרמית של טבלת ערכים תזונתיים וסימון אדום" : "Thermal labeling of Hebrew allergens & nutrition"}</div>
                  </div>
                </div>
                <span className="font-mono text-slate-300">₪{marginResult.labelingCostIls.toFixed(2)}</span>
              </div>

              {/* Step 6: Inland DC Trucking */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center font-bold text-[10px]">
                    6
                  </span>
                  <div>
                    <div className="font-medium text-slate-300">
                      {isHe ? "הובלה יבשתית מהנמל למרלו״ג הרשת" : "Inland DC Container Haulage"}
                    </div>
                    <div className="text-[10px] text-slate-500">{isHe ? "שינוע סמיטריילר מנמל אשדוד למרכז לוגיסטי" : "Trucking from port roadstead to supermarket DC"}</div>
                  </div>
                </div>
                <span className="font-mono text-slate-300">₪{marginResult.inlandTruckingIls.toFixed(2)}</span>
              </div>

              {/* Total Landed Summary Bar */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between font-bold text-sm bg-emerald-950/20 p-3 rounded-xl border border-emerald-500/20">
                <span className="text-emerald-300">
                  {isHe ? "עלות נחיתה סופית במרלו״ג ליחידה (Landed Cost):" : "Net Landed Cost at Central DC per Unit:"}
                </span>
                <span className="font-mono text-emerald-400 text-base">₪{marginResult.totalLandedCostIls.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Card: Supermarket Gross Margin Comparison */}
          <div id="margin-comparison-card" className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <h3 className="font-bold text-white mb-4 pb-2 border-b border-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                {isHe ? "השוואת מרווחי רווחיות רשת" : "Supermarket Margin Comparison"}
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                {isHe ? `הרחבת מרווח של +${marginResult.marginExpansionPct}%` : `+${marginResult.marginExpansionPct}% Margin Expansion`}
              </span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* National Brand Benchmark */}
              <div className="bg-slate-950 p-4 rounded-xl border border-amber-500/30 relative">
                <div className="text-xs font-semibold text-amber-400 mb-1 flex items-center justify-between">
                  <span>{isHe ? "מותג מוביל קיים" : "National Benchmark"}</span>
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px]">
                    {isHe ? "מרווח נמוך" : "Low Margin"}
                  </span>
                </div>
                <div className="text-sm font-bold text-slate-200 line-clamp-1 mb-3">
                  {marginResult.benchmarkBrandName}
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>{isHe ? "מחיר מדף (כולל מע״מ):" : "Shelf Price (inc. VAT):"}</span>
                    <span className="font-mono text-slate-200">₪{marginResult.benchmarkShelfPriceIls.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>{isHe ? "מחיר קנייה מספק:" : "Wholesale Buy Cost:"}</span>
                    <span className="font-mono text-slate-200">₪{marginResult.benchmarkWholesaleCostIls.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>{isHe ? "רווח גולמי ליחידה:" : "Gross Profit per Unit:"}</span>
                    <span className="font-mono text-amber-400 font-semibold">₪{marginResult.benchmarkGrossProfitIls.toFixed(2)}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-sm font-bold">
                    <span className="text-slate-300">{isHe ? "שיעור רווח גולמי:" : "Gross Margin %:"}</span>
                    <span className="font-mono text-amber-400 text-base">{marginResult.benchmarkGrossMarginPct}%</span>
                  </div>
                </div>
              </div>

              {/* FDX Private Label Import */}
              <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/40 relative shadow-lg shadow-emerald-950/20">
                <div className="text-xs font-semibold text-emerald-400 mb-1 flex items-center justify-between">
                  <span>{isHe ? "יבוא ישיר מותג פרטי (FDX)" : "FDX Direct Private Label"}</span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                    {isHe ? "רווחיות מקסימלית" : "High Profit"}
                  </span>
                </div>
                <div className="text-sm font-bold text-emerald-300 line-clamp-1 mb-3">
                  {isHe ? currentPreset.productNameHe : currentPreset.productNameEn}
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>{isHe ? "מחיר מדף מוזל לצרכן:" : "Discount Shelf Price:"}</span>
                    <span className="font-mono text-emerald-400 font-bold">₪{marginResult.targetShelfPriceIls.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>{isHe ? "עלות נחיתה במרלו״ג:" : "Central DC Landed Cost:"}</span>
                    <span className="font-mono text-slate-200">₪{marginResult.totalLandedCostIls.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>{isHe ? "רווח גולמי ליחידה:" : "Gross Profit per Unit:"}</span>
                    <span className="font-mono text-emerald-400 font-bold">₪{marginResult.supermarketGrossProfitIls.toFixed(2)}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-sm font-bold">
                    <span className="text-slate-300">{isHe ? "שיעור רווח גולמי:" : "Gross Margin %:"}</span>
                    <span className="font-mono text-emerald-400 text-lg">{marginResult.supermarketGrossMarginPct}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Container Level ROI Banner */}
            <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-emerald-950/50 via-teal-950/40 to-slate-950 border border-emerald-500/30">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                <div>
                  <div className="text-[11px] text-slate-400">{isHe ? "הוזלה לצרכן על המדף" : "Consumer Price Saving"}</div>
                  <div className="text-xl font-black text-teal-400 mt-0.5">
                    {marginResult.consumerPriceSavingPct > 0 ? `-${marginResult.consumerPriceSavingPct}%` : "0%"}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-400">{isHe ? "רווח גולמי כולל למכולה (FCL)" : "Total FCL Gross Profit"}</div>
                  <div className="text-xl font-black text-emerald-400 mt-0.5 font-mono">
                    ₪{marginResult.totalContainerGrossProfitIls.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-400">{isHe ? "תוספת רווח נטו מול מותג ארצי" : "Incremental Profit vs. Brand"}</div>
                  <div className="text-xl font-black text-emerald-300 mt-0.5 font-mono">
                    +₪{marginResult.extraContainerProfitVsBenchmarkIls.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 1-Page Category Review Deck Modal (Printable) */}
      {showDeckModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden my-8 border border-slate-200">
            {/* Top Toolbar (Hidden on Print) */}
            <div className="print:hidden bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="font-bold text-sm tracking-wide">
                  {isHe ? "סקירת קטגוריה להנהלה | FoodXchange Executive Deck" : "FoodXchange Executive Category Review Deck"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all shadow"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  <span>{isHe ? "הדפס / שמור כ-PDF" : "Print / Save PDF"}</span>
                </button>
                <button
                  onClick={() => setShowDeckModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Printable 1-Page Document Body */}
            <div className="p-8 md:p-10 text-slate-900" id="category-deck-printable" dir={isHe ? "rtl" : "ltr"}>
              {/* Document Header */}
              <div className="flex justify-between items-start pb-6 border-b-2 border-slate-900">
                <div>
                  <div className="text-2xl font-black tracking-tight text-slate-900">
                    FOODXCHANGE <span className="text-emerald-700 font-semibold text-lg">| PRIVATE LABEL SOURCING</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {isHe ? "מסמך סקירת כדאיות קטגוריה ואישור מנהל סחר" : "Retail Category Profitability Deck & Trade Director Approval"}
                  </div>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <div className="font-bold text-slate-800 font-mono">DOC-REV-2026-CAT</div>
                  <div>{new Date().toLocaleDateString(isHe ? "he-IL" : "en-US")}</div>
                  <div className="text-emerald-700 font-semibold">{isHe ? "גרסה מנהלת רשת" : "Supermarket Board Copy"}</div>
                </div>
              </div>

              {/* Title & Product Info */}
              <div className="my-6">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                  {isHe ? currentPreset.categoryNameHe : currentPreset.categoryNameEn}
                </span>
                <h2 className="text-2xl font-extrabold text-slate-900 mt-2">
                  {isHe ? currentPreset.productNameHe : currentPreset.productNameEn}
                </h2>
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 mt-1">
                  <span>
                    <strong>{isHe ? "מותג ייחוס:" : "Benchmark:"}</strong> {marginResult.benchmarkBrandName}
                  </span>
                  <span>•</span>
                  <span>
                    <strong>{isHe ? "נפח מכולה:" : "FCL Volume:"}</strong> {marginResult.containerVolumeUnits.toLocaleString()} {isHe ? "יחידות" : "units"}
                  </span>
                  <span>•</span>
                  <span>
                    <strong>{isHe ? "שער המרה:" : "FX Rate:"}</strong> €1.00 = ₪{fxRate.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Key Executive Metrics Highlights */}
              <div className="grid grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-center my-6">
                <div>
                  <div className="text-[11px] font-semibold text-slate-500">{isHe ? "עלות נחיתה במרלו״ג" : "DC Landed Cost"}</div>
                  <div className="text-xl font-black text-slate-900 font-mono mt-0.5">₪{marginResult.totalLandedCostIls.toFixed(2)}</div>
                  <div className="text-[10px] text-slate-400">€{cifEur.toFixed(3)} CIF</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500">{isHe ? "מחיר מדף מוצע לצרכן" : "Target Shelf Price"}</div>
                  <div className="text-xl font-black text-emerald-700 font-mono mt-0.5">₪{marginResult.targetShelfPriceIls.toFixed(2)}</div>
                  <div className="text-[10px] text-emerald-600 font-medium">{marginResult.consumerPriceSavingPct}% {isHe ? "חיסכון לצרכן" : "savings"}</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500">{isHe ? "מרווח רווח גולמי רשת" : "Supermarket Margin"}</div>
                  <div className="text-xl font-black text-emerald-700 font-mono mt-0.5">{marginResult.supermarketGrossMarginPct}%</div>
                  <div className="text-[10px] text-slate-500">{isHe ? "מול" : "vs"} {marginResult.benchmarkGrossMarginPct}% {isHe ? "במותג ארצי" : "brand"}</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500">{isHe ? "תוספת רווח למכולה" : "Incremental Profit"}</div>
                  <div className="text-xl font-black text-emerald-800 font-mono mt-0.5">+₪{marginResult.extraContainerProfitVsBenchmarkIls.toLocaleString()}</div>
                  <div className="text-[10px] text-slate-500">40ft HC FCL</div>
                </div>
              </div>

              {/* Pricing & Landed Waterfall Comparison Table */}
              <div className="my-6">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  {isHe ? "פירוט מפל עלויות ורווחיות (ש״ח ליחידה)" : "Itemized Cost Waterfall & Economics (ILS / Unit)"}
                </h4>
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-300 text-slate-600 font-bold">
                      <th className="py-2 text-right">{isHe ? "רכיב עלות / רווחיות" : "Cost / Revenue Component"}</th>
                      <th className="py-2 text-center">{isHe ? "מותג מוביל (ייחוס)" : "National Benchmark"}</th>
                      <th className="py-2 text-center text-emerald-700">{isHe ? "מותג פרטי FDX (יבוא)" : "FDX Private Label"}</th>
                      <th className="py-2 text-left">{isHe ? "הערות רגולציה / מפרט" : "Regulatory & Logistics Notes"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="py-2 text-right font-medium">{isHe ? "עלות בסיס במפעל (CIF בנמל)" : "Base CIF Factory Price"}</td>
                      <td className="py-2 text-center font-mono text-slate-500">-</td>
                      <td className="py-2 text-center font-mono font-bold text-slate-800">₪{marginResult.baseCifIls.toFixed(2)}</td>
                      <td className="py-2 text-left text-slate-500 text-[11px]">{isHe ? "מפעל מאושר IFS / BRC באירופה" : "IFS / BRC certified EU factory"}</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-right font-medium">{isHe ? "סבלות נמל ודמי מסוף (THC)" : "Port Handling & THC"}</td>
                      <td className="py-2 text-center font-mono text-slate-500">-</td>
                      <td className="py-2 text-center font-mono text-slate-800">₪{marginResult.portTerminalHandlingIls.toFixed(2)}</td>
                      <td className="py-2 text-left text-slate-500 text-[11px]">{isHe ? "נמל אשדוד / חיפה פריקה ישירה" : "Ashdod / Haifa discharge"}</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-right font-medium">{isHe ? "עמילות מכס ופתיחת תיק שער עולמי" : "Customs Clearance & EDI"}</td>
                      <td className="py-2 text-center font-mono text-slate-500">-</td>
                      <td className="py-2 text-center font-mono text-slate-800">₪{marginResult.customsBrokerageIls.toFixed(2)}</td>
                      <td className="py-2 text-left text-slate-500 text-[11px]">{isHe ? "סיווג תעריף מכס 0% פטור הדדי" : "Customs HS classification"}</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-right font-medium">{isHe ? "פיקוח כשרות (הרבנות / מהדרין)" : "Kosher Rabbinate Supervision"}</td>
                      <td className="py-2 text-center font-mono text-slate-500">-</td>
                      <td className="py-2 text-center font-mono text-slate-800">₪{marginResult.kashrutFeeIls.toFixed(2)}</td>
                      <td className="py-2 text-left text-slate-500 text-[11px]">{isHe ? "אישור כשרות יבוא הרבנות הראשית" : "Import kosher certificate approved"}</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-right font-medium">{isHe ? "סימון תרמי בעברית ת״י 1145" : "SI 1145 Hebrew Labeling"}</td>
                      <td className="py-2 text-center font-mono text-slate-500">-</td>
                      <td className="py-2 text-center font-mono text-slate-800">₪{marginResult.labelingCostIls.toFixed(2)}</td>
                      <td className="py-2 text-left text-slate-500 text-[11px]">{isHe ? "טבלה תזונתית, אלרגנים וסמל אדום" : "Mandatory nutritional warning"}</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-right font-medium">{isHe ? "שינוע סמיטריילר למרלו״ג הרשת" : "Inland Haulage to DC"}</td>
                      <td className="py-2 text-center font-mono text-slate-500">-</td>
                      <td className="py-2 text-center font-mono text-slate-800">₪{marginResult.inlandTruckingIls.toFixed(2)}</td>
                      <td className="py-2 text-left text-slate-500 text-[11px]">{isHe ? "אספקה ישירה למשטחי אחסון" : "Direct DC distribution delivery"}</td>
                    </tr>
                    <tr className="bg-slate-100 font-bold">
                      <td className="py-2 text-right">{isHe ? "עלות קנייה / נחיתה במרלו״ג (נטו):" : "Net Wholesale / Landed Cost:"}</td>
                      <td className="py-2 text-center font-mono text-slate-700">₪{marginResult.benchmarkWholesaleCostIls.toFixed(2)}</td>
                      <td className="py-2 text-center font-mono text-emerald-800">₪{marginResult.totalLandedCostIls.toFixed(2)}</td>
                      <td className="py-2 text-left text-emerald-700 font-semibold">{isHe ? "חיסכון בקנייה: ₪" + (marginResult.benchmarkWholesaleCostIls - marginResult.totalLandedCostIls).toFixed(2) : "Wholesale saving: ₪" + (marginResult.benchmarkWholesaleCostIls - marginResult.totalLandedCostIls).toFixed(2)}</td>
                    </tr>
                    <tr className="font-bold">
                      <td className="py-2 text-right">{isHe ? "מחיר מדף מומלץ לצרכן (כולל 18% מע״מ):" : "Consumer Shelf Price (inc. 18% VAT):"}</td>
                      <td className="py-2 text-center font-mono text-slate-700">₪{marginResult.benchmarkShelfPriceIls.toFixed(2)}</td>
                      <td className="py-2 text-center font-mono text-emerald-800">₪{marginResult.targetShelfPriceIls.toFixed(2)}</td>
                      <td className="py-2 text-left text-emerald-700 font-semibold">-{marginResult.consumerPriceSavingPct}% {isHe ? "הוזלה לצרכן" : "retail discount"}</td>
                    </tr>
                    <tr className="bg-emerald-50 text-emerald-900 font-extrabold text-sm">
                      <td className="py-2.5 text-right">{isHe ? "שיעור רווח גולמי לרשת (% מתוך נטו):" : "Supermarket Gross Margin (% of Net):"}</td>
                      <td className="py-2.5 text-center font-mono text-amber-800">{marginResult.benchmarkGrossMarginPct}%</td>
                      <td className="py-2.5 text-center font-mono text-emerald-800 text-base">{marginResult.supermarketGrossMarginPct}%</td>
                      <td className="py-2.5 text-left text-emerald-800 font-black">+{marginResult.marginExpansionPct}% {isHe ? "הרחבת מרווח" : "expansion"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Sign-Off / Approval Section */}
              <div className="mt-8 pt-6 border-t-2 border-slate-300 grid grid-cols-3 gap-6 text-xs text-slate-600">
                <div className="border border-slate-200 p-3 rounded-lg">
                  <div className="font-bold text-slate-800 mb-4">{isHe ? "מנהל קטגוריה וסחר:" : "Category Manager Approval:"}</div>
                  <div className="border-b border-dashed border-slate-400 mb-1" />
                  <div className="text-[10px] text-slate-400">{isHe ? "חתימה ותאריך" : "Signature & Date"}</div>
                </div>
                <div className="border border-slate-200 p-3 rounded-lg">
                  <div className="font-bold text-slate-800 mb-4">{isHe ? "סמנכ״ל רכש ושרשרת אספקה:" : "VP Supply Chain Approval:"}</div>
                  <div className="border-b border-dashed border-slate-400 mb-1" />
                  <div className="text-[10px] text-slate-400">{isHe ? "חתימה ותאריך" : "Signature & Date"}</div>
                </div>
                <div className="border border-slate-200 p-3 rounded-lg">
                  <div className="font-bold text-slate-800 mb-4">{isHe ? "בקרת כספים וחשבות:" : "Finance & Controlling:"}</div>
                  <div className="border-b border-dashed border-slate-400 mb-1" />
                  <div className="text-[10px] text-slate-400">{isHe ? "חתימה ותאריך" : "Signature & Date"}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
