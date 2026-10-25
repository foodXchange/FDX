"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";

export interface LandedCostCalculatorProps {
  initialLang?: "he" | "en";
}

interface ProductPreset {
  id: string;
  nameHe: string;
  nameEn: string;
  icon: string;
  category: string;
  currency: "EUR" | "USD" | "GBP";
  factoryCost: number;
  incoterm: "EXW" | "FOB" | "CIF" | "DDP";
  unitsPerContainer: number;
  containerType: "20dry" | "40dry" | "40reefer";
  inlandEur: number;
  oceanFreightUsd: number;
  targetShelfPriceIl: number;
  targetMarginPercent: number;
  benchmarkBrand: string;
  benchmarkShelfPriceIl: number;
  customsDutyPercent: number;
}

const PRESETS: ProductPreset[] = [
  {
    id: "evoo",
    nameHe: "שמן זית כתית מעולה 750 מ״ל",
    nameEn: "Extra Virgin Olive Oil 750ml",
    icon: "🫒",
    category: "שמנים ורטבים",
    currency: "EUR",
    factoryCost: 3.85,
    incoterm: "CIF",
    unitsPerContainer: 21000,
    containerType: "40dry",
    inlandEur: 0,
    oceanFreightUsd: 0,
    targetShelfPriceIl: 29.9,
    targetMarginPercent: 32,
    benchmarkBrand: "פיליפו בריו (Filippo Berio)",
    benchmarkShelfPriceIl: 39.9,
    customsDutyPercent: 0,
  },
  {
    id: "tuna",
    nameHe: "רביעיית טונה בהירה בשמן 4x160 גרם",
    nameEn: "Canned Light Tuna 4-Pack 4x160g",
    icon: "🥫",
    category: "שימורי דגים",
    currency: "EUR",
    factoryCost: 2.15,
    incoterm: "FOB",
    unitsPerContainer: 36000,
    containerType: "40dry",
    inlandEur: 0,
    oceanFreightUsd: 2100,
    targetShelfPriceIl: 18.9,
    targetMarginPercent: 34,
    benchmarkBrand: "ריו מרה (Rio Mare)",
    benchmarkShelfPriceIl: 26.9,
    customsDutyPercent: 0,
  },
  {
    id: "fries",
    nameHe: "צ׳יפס בלגי מובחר קפוא 2.5 ק״ג",
    nameEn: "Premium Belgian Frozen Fries 2.5kg",
    icon: "🍟",
    category: "מזון קפוא",
    currency: "EUR",
    factoryCost: 1.45,
    incoterm: "EXW",
    unitsPerContainer: 8200,
    containerType: "40reefer",
    inlandEur: 650,
    oceanFreightUsd: 3400,
    targetShelfPriceIl: 16.9,
    targetMarginPercent: 35,
    benchmarkBrand: "לוטוסה (Lutosa)",
    benchmarkShelfPriceIl: 24.9,
    customsDutyPercent: 0,
  },
  {
    id: "pasta",
    nameHe: "פסטה איטלקית פרימיום 500 גרם",
    nameEn: "Premium Italian Durum Pasta 500g",
    icon: "🍝",
    category: "פסטה ודגנים",
    currency: "EUR",
    factoryCost: 0.52,
    incoterm: "FOB",
    unitsPerContainer: 44000,
    containerType: "40dry",
    inlandEur: 0,
    oceanFreightUsd: 1900,
    targetShelfPriceIl: 5.9,
    targetMarginPercent: 36,
    benchmarkBrand: "ברילה (Barilla)",
    benchmarkShelfPriceIl: 8.9,
    customsDutyPercent: 0,
  },
  {
    id: "tomatoes",
    nameHe: "עגבניות איטלקיות מרוסקות 400 גרם",
    nameEn: "Finely Chopped Tomatoes 400g",
    icon: "🍅",
    category: "שימורי עגבניות",
    currency: "EUR",
    factoryCost: 0.44,
    incoterm: "CIF",
    unitsPerContainer: 48000,
    containerType: "20dry",
    inlandEur: 0,
    oceanFreightUsd: 0,
    targetShelfPriceIl: 4.5,
    targetMarginPercent: 33,
    benchmarkBrand: "מוטי (Mutti)",
    benchmarkShelfPriceIl: 6.9,
    customsDutyPercent: 0,
  },
];

export default function LandedCostCalculator({ initialLang = "he" }: LandedCostCalculatorProps) {
  const [lang, setLang] = useState<"he" | "en">(initialLang);
  const isHe = lang === "he";

  // Active preset or custom
  const [activePresetId, setActivePresetId] = useState<string>("evoo");
  const [productName, setProductName] = useState<string>("שמן זית כתית מעולה 750 מ״ל");

  // Factory inputs
  const [currency, setCurrency] = useState<"EUR" | "USD" | "GBP">("EUR");
  const [eurRate, setEurRate] = useState<number>(4.05);
  const [usdRate, setUsdRate] = useState<number>(3.75);
  const [gbpRate, setGbpRate] = useState<number>(4.85);
  const [factoryCost, setFactoryCost] = useState<number>(3.85);
  const [incoterm, setIncoterm] = useState<"EXW" | "FOB" | "CIF" | "DDP">("CIF");
  const [unitsPerContainer, setUnitsPerContainer] = useState<number>(21000);
  const [containerType, setContainerType] = useState<"20dry" | "40dry" | "40reefer">("40dry");

  // International Freight & Insurance
  const [inlandEur, setInlandEur] = useState<number>(0);
  const [oceanFreightUsd, setOceanFreightUsd] = useState<number>(0);
  const [marineInsurancePercent, setMarineInsurancePercent] = useState<number>(0.3);

  // Israeli Customs, Ports & Clearance
  const [destinationPort, setDestinationPort] = useState<string>("ashdod");
  const [customsDutyPercent, setCustomsDutyPercent] = useState<number>(0);
  const [portCharges, setPortCharges] = useState<number>(2200);
  const [customsBrokerage, setCustomsBrokerage] = useState<number>(1450);
  const [healthAndStandards, setHealthAndStandards] = useState<number>(1250);
  const [localHaulage, setLocalHaulage] = useState<number>(1800);

  // Retail & Shelf Economics
  const [vatPercent, setVatPercent] = useState<number>(18);
  const [pricingMode, setPricingMode] = useState<"targetPrice" | "targetMargin">("targetPrice");
  const [targetShelfPrice, setTargetShelfPrice] = useState<number>(29.9);
  const [targetMarginPercent, setTargetMarginPercent] = useState<number>(32);
  const [benchmarkBrand, setBenchmarkBrand] = useState<string>("פיליפו בריו (Filippo Berio)");
  const [benchmarkShelfPrice, setBenchmarkShelfPrice] = useState<number>(39.9);
  const [annualContainers, setAnnualContainers] = useState<number>(6);

  // UI state
  const [copiedState, setCopiedState] = useState<boolean>(false);
  const [showAdvancedParams, setShowAdvancedParams] = useState<boolean>(false);

  // Handle Preset selection
  const handleSelectPreset = (p: ProductPreset) => {
    setActivePresetId(p.id);
    setProductName(isHe ? p.nameHe : p.nameEn);
    setCurrency(p.currency);
    setFactoryCost(p.factoryCost);
    setIncoterm(p.incoterm);
    setUnitsPerContainer(p.unitsPerContainer);
    setContainerType(p.containerType);
    setInlandEur(p.inlandEur);
    setOceanFreightUsd(p.oceanFreightUsd);
    setTargetShelfPrice(p.targetShelfPriceIl);
    setTargetMarginPercent(p.targetMarginPercent);
    setBenchmarkBrand(p.benchmarkBrand);
    setBenchmarkShelfPrice(p.benchmarkShelfPriceIl);
    setCustomsDutyPercent(p.customsDutyPercent);
  };

  // Calculations
  const calculations = useMemo(() => {
    const rateToIls = currency === "EUR" ? eurRate : currency === "USD" ? usdRate : gbpRate;
    const usdToIls = usdRate;

    // Unit factory cost in ILS
    const unitFactoryIls = factoryCost * rateToIls;
    const totalFactoryIls = unitFactoryIls * unitsPerContainer;

    // Freight and insurance
    let inlandFreightIls = 0;
    let oceanFreightIls = 0;
    let marineInsuranceIls = 0;

    if (incoterm === "EXW") {
      inlandFreightIls = inlandEur * eurRate;
      oceanFreightIls = oceanFreightUsd * usdToIls;
      marineInsuranceIls =
        (totalFactoryIls + inlandFreightIls + oceanFreightIls) * (marineInsurancePercent / 100);
    } else if (incoterm === "FOB") {
      oceanFreightIls = oceanFreightUsd * usdToIls;
      marineInsuranceIls =
        (totalFactoryIls + oceanFreightIls) * (marineInsurancePercent / 100);
    } else if (incoterm === "CIF" || incoterm === "DDP") {
      // Included in unit factory cost
      inlandFreightIls = 0;
      oceanFreightIls = 0;
      marineInsuranceIls = 0;
    }

    const cifValueIls = totalFactoryIls + inlandFreightIls + oceanFreightIls + marineInsuranceIls;
    const cifPerUnitIls = unitsPerContainer > 0 ? cifValueIls / unitsPerContainer : 0;

    // Customs & Port Clearance
    let customsDutyIls = 0;
    let portChargesIls = portCharges;
    let customsBrokerageIls = customsBrokerage;
    let healthAndStandardsIls = healthAndStandards;
    let localHaulageIls = localHaulage;

    if (incoterm === "DDP") {
      customsDutyIls = 0;
      portChargesIls = 0;
      customsBrokerageIls = 0;
      healthAndStandardsIls = 0;
      localHaulageIls = 0;
    } else {
      customsDutyIls = cifValueIls * (customsDutyPercent / 100);
    }

    const totalClearanceIls =
      customsDutyIls +
      portChargesIls +
      customsBrokerageIls +
      healthAndStandardsIls +
      localHaulageIls;

    const clearancePerUnitIls = unitsPerContainer > 0 ? totalClearanceIls / unitsPerContainer : 0;

    // Landed Cost
    const totalLandedIls = cifValueIls + totalClearanceIls;
    const unitLandedIls = unitsPerContainer > 0 ? totalLandedIls / unitsPerContainer : 0;

    // Retail Economics
    let finalConsumerShelfPrice = targetShelfPrice;
    let finalNetShelfPrice = 0;
    let finalRetailerMarginPercent = targetMarginPercent;
    let retailerProfitPerUnitIls = 0;

    if (pricingMode === "targetPrice") {
      finalConsumerShelfPrice = targetShelfPrice;
      finalNetShelfPrice = finalConsumerShelfPrice / (1 + vatPercent / 100);
      retailerProfitPerUnitIls = finalNetShelfPrice - unitLandedIls;
      finalRetailerMarginPercent =
        finalNetShelfPrice > 0 ? (retailerProfitPerUnitIls / finalNetShelfPrice) * 100 : 0;
    } else {
      finalRetailerMarginPercent = targetMarginPercent;
      const marginDecimal = finalRetailerMarginPercent / 100;
      finalNetShelfPrice = marginDecimal < 1 ? unitLandedIls / (1 - marginDecimal) : unitLandedIls;
      finalConsumerShelfPrice = finalNetShelfPrice * (1 + vatPercent / 100);
      retailerProfitPerUnitIls = finalNetShelfPrice - unitLandedIls;
    }

    const totalRetailerProfitPerContainer = retailerProfitPerUnitIls * unitsPerContainer;
    const annualRetailerProfitTotal = totalRetailerProfitPerContainer * annualContainers;

    // Benchmark comparison
    const consumerSavingPerUnitIls = Math.max(0, benchmarkShelfPrice - finalConsumerShelfPrice);
    const consumerSavingPercent =
      benchmarkShelfPrice > 0 ? (consumerSavingPerUnitIls / benchmarkShelfPrice) * 100 : 0;
    const annualConsumerSavings = consumerSavingPerUnitIls * unitsPerContainer * annualContainers;

    // Cost Breakdown Waterfall shares
    const factoryShare = totalLandedIls > 0 ? (totalFactoryIls / totalLandedIls) * 100 : 0;
    const freightShare =
      totalLandedIls > 0
        ? ((inlandFreightIls + oceanFreightIls + marineInsuranceIls) / totalLandedIls) * 100
        : 0;
    const clearanceShare =
      totalLandedIls > 0 ? (totalClearanceIls / totalLandedIls) * 100 : 0;

    return {
      rateToIls,
      unitFactoryIls,
      totalFactoryIls,
      inlandFreightIls,
      oceanFreightIls,
      marineInsuranceIls,
      cifValueIls,
      cifPerUnitIls,
      customsDutyIls,
      portChargesIls,
      customsBrokerageIls,
      healthAndStandardsIls,
      localHaulageIls,
      totalClearanceIls,
      clearancePerUnitIls,
      totalLandedIls,
      unitLandedIls,
      finalConsumerShelfPrice,
      finalNetShelfPrice,
      finalRetailerMarginPercent,
      retailerProfitPerUnitIls,
      totalRetailerProfitPerContainer,
      annualRetailerProfitTotal,
      consumerSavingPerUnitIls,
      consumerSavingPercent,
      annualConsumerSavings,
      factoryShare,
      freightShare,
      clearanceShare,
    };
  }, [
    currency,
    eurRate,
    usdRate,
    gbpRate,
    factoryCost,
    unitsPerContainer,
    incoterm,
    inlandEur,
    oceanFreightUsd,
    marineInsurancePercent,
    customsDutyPercent,
    portCharges,
    customsBrokerage,
    healthAndStandards,
    localHaulage,
    pricingMode,
    targetShelfPrice,
    targetMarginPercent,
    vatPercent,
    benchmarkShelfPrice,
    annualContainers,
  ]);

  // Formatted currency helper
  const formatIls = (val: number, decimals: number = 2) =>
    `₪${val.toLocaleString("en-IL", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;

  const formatCurr = (val: number, curr: string = currency, decimals: number = 2) => {
    const symbol = curr === "EUR" ? "€" : curr === "USD" ? "$" : curr === "GBP" ? "£" : "₪";
    return `${symbol}${val.toLocaleString("en-IL", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
  };

  // Generate WhatsApp message
  const generateWhatsAppMessage = () => {
    const text = isHe
      ? `שלום אודי, בצעתי תחשיב עלות נחיתה ורווחיות מדף ב-FoodXchange עבור:
📦 מוצר: ${productName}
🏭 מחיר מפעל: ${formatCurr(factoryCost, currency)} (${incoterm})
🚢 כמות למכולה: ${unitsPerContainer.toLocaleString()} יח׳
🇮🇱 עלות נחיתה למרלו״ג: ${formatIls(calculations.unitLandedIls, 2)} ליחידה
🛒 מחיר מדף מומלץ: ${formatIls(calculations.finalConsumerShelfPrice, 2)} (כולל ${vatPercent}% מע״מ)
📊 מרווח גולמי לקמעונאי: ${calculations.finalRetailerMarginPercent.toFixed(1)}% (${formatIls(calculations.retailerProfitPerUnitIls, 2)} ליחידה)
💰 רווח גולמי למכולה: ${formatIls(calculations.totalRetailerProfitPerContainer, 0)}
🎯 חיסכון לצרכן מול ${benchmarkBrand}: ${calculations.consumerSavingPercent.toFixed(0)}% (חיסכון של ${formatIls(calculations.consumerSavingPerUnitIls, 2)})

אשמח לקבל הצעת מחיר רשמית ממפעל מאומת ומפרט דוגמאות לטעימה.`
      : `Hi Udi, I ran a landed cost and retail margin calculation on FoodXchange for:
📦 Product: ${productName}
🏭 Factory Cost: ${formatCurr(factoryCost, currency)} (${incoterm})
🚢 Container Volume: ${unitsPerContainer.toLocaleString()} units
🇮🇱 Landed Cost at DC: ${formatIls(calculations.unitLandedIls, 2)} / unit
🛒 Suggested Shelf Price: ${formatIls(calculations.finalConsumerShelfPrice, 2)} (incl. ${vatPercent}% VAT)
📊 Retail Gross Margin: ${calculations.finalRetailerMarginPercent.toFixed(1)}% (${formatIls(calculations.retailerProfitPerUnitIls, 2)} / unit)
💰 Container Gross Profit: ${formatIls(calculations.totalRetailerProfitPerContainer, 0)}
🎯 Consumer Saving vs ${benchmarkBrand}: ${calculations.consumerSavingPercent.toFixed(0)}% (${formatIls(calculations.consumerSavingPerUnitIls, 2)} / unit)

Please provide an official factory quotation and sample tasting details.`;

    return encodeURIComponent(text);
  };

  // Copy Executive Summary
  const handleCopySummary = () => {
    const summary = isHe
      ? `=== תחשיב עלות נחיתה ורווחיות מדף | FoodXchange ===
מוצר: ${productName}
מחיר מפעל: ${formatCurr(factoryCost, currency)} (${incoterm}) | שער המרה: ₪${calculations.rateToIls.toFixed(2)}
כמות במכולה: ${unitsPerContainer.toLocaleString()} יחידות (${containerType})
עלות נחיתה ליחידה במרלו״ג: ${formatIls(calculations.unitLandedIls, 2)}
עלות כוללת למכולה (Landed): ${formatIls(calculations.totalLandedIls, 0)}
--- כלכלת מדף ורווחיות ---
מחיר מומלץ לצרכן (כולל מע״מ): ${formatIls(calculations.finalConsumerShelfPrice, 2)}
מרווח גולמי לקמעונאי: ${calculations.finalRetailerMarginPercent.toFixed(1)}% (${formatIls(calculations.retailerProfitPerUnitIls, 2)} ליחידה)
רווח גולמי כולל למכולה: ${formatIls(calculations.totalRetailerProfitPerContainer, 0)}
רווח גולמי שנתי (${annualContainers} מכולות): ${formatIls(calculations.annualRetailerProfitTotal, 0)}
--- השוואת בנצ׳מרק מדף ---
מותג מוביל להשוואה: ${benchmarkBrand} (${formatIls(benchmarkShelfPrice, 2)})
חיסכון לצרכן ליחידה: ${formatIls(calculations.consumerSavingPerUnitIls, 2)} (${calculations.consumerSavingPercent.toFixed(1)}% פחות)
חיסכון מצטבר לצרכנים בשנה: ${formatIls(calculations.annualConsumerSavings, 0)}`
      : `=== Landed Cost & Retail Margin Summary | FoodXchange ===
Product: ${productName}
Factory Price: ${formatCurr(factoryCost, currency)} (${incoterm}) | FX Rate: ₪${calculations.rateToIls.toFixed(2)}
Volume: ${unitsPerContainer.toLocaleString()} units (${containerType})
Unit Landed Cost (DC): ${formatIls(calculations.unitLandedIls, 2)}
Total Landed Cost / Container: ${formatIls(calculations.totalLandedIls, 0)}
--- Retail Shelf Economics ---
Suggested Shelf Price (incl. VAT): ${formatIls(calculations.finalConsumerShelfPrice, 2)}
Retail Gross Margin: ${calculations.finalRetailerMarginPercent.toFixed(1)}% (${formatIls(calculations.retailerProfitPerUnitIls, 2)} / unit)
Gross Profit / Container: ${formatIls(calculations.totalRetailerProfitPerContainer, 0)}
Annual Gross Profit (${annualContainers} containers): ${formatIls(calculations.annualRetailerProfitTotal, 0)}
--- Benchmark Brand Comparison ---
Benchmark Brand: ${benchmarkBrand} (${formatIls(benchmarkShelfPrice, 2)})
Consumer Savings / Unit: ${formatIls(calculations.consumerSavingPerUnitIls, 2)} (${calculations.consumerSavingPercent.toFixed(1)}% lower)
Annual Consumer Savings: ${formatIls(calculations.annualConsumerSavings, 0)}`;

    navigator.clipboard.writeText(summary);
    setCopiedState(true);
    setTimeout(() => setCopiedState(false), 3000);
  };

  // RFQ redirect URL with params
  const rfqHref = `/he/sourcing?product=${encodeURIComponent(productName)}&volume=${unitsPerContainer}&targetPrice=${encodeURIComponent(formatCurr(factoryCost, currency))}&brand=${encodeURIComponent(benchmarkBrand)}`;

  return (
    <div
      dir={isHe ? "rtl" : "ltr"}
      className="w-full bg-slate-950 text-slate-100 min-h-screen py-8 px-4 sm:px-6 lg:px-8 selection:bg-orange-500 selection:text-white"
    >
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Top Header / Switcher */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20 mb-2">
              <span>{isHe ? "⚡ מחשבון סחר בינלאומי לקניינים" : "⚡ B2B Strategic Sourcing Calculator"}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {isHe
                ? "מחשבון עלות נחיתה ורווחיות מדף לקמעונאים ויבואנים"
                : "Retail Landed Cost & Gross Margin Simulator"}
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              {isHe
                ? "המרת מחירי מפעל באירופה (€/$) לעלות נחיתה מדויקת במרלו״ג (ILS ₪), כולל הובלה, אגרות נמל, עמילות מכס, רווחיות גולמית והשוואת בנצ׳מרק למותגים מובילים."
                : "Translate European factory quotes (€/$) into landed cost at Israeli distribution centers, with freight, port clearance, retailer gross margins, and brand benchmark savings."}
            </p>

            {/* Mode Switcher Tabs */}
            <div className="flex items-center gap-2 pt-3">
              <span className="px-3 py-1.5 rounded-xl bg-orange-500 text-white text-xs font-bold shadow-xs">
                📦 {isHe ? "חישוב פריט בודד" : "Single SKU Landed Cost"}
              </span>
              <Link
                href={isHe ? "/he/calculator/container" : "/en/calculator/container"}
                className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-400 hover:text-cyan-300 text-xs font-bold border border-cyan-500/30 transition flex items-center gap-1.5 shadow-sm"
              >
                <span>🚢</span>
                <span>{isHe ? "מחשבון מכולה משולבת (איחוד יצרנים) ↗" : "Mixed Container Builder (Consolidation) ↗"}</span>
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            {/* Language Toggle */}
            <div className="inline-flex items-center rounded-lg border border-slate-700 bg-slate-900 p-1 text-xs font-bold" dir="ltr">
              <button
                onClick={() => setLang("en")}
                className={`px-2.5 py-1 rounded-md transition ${
                  lang === "en" ? "bg-orange-500 text-white shadow-xs" : "text-slate-400 hover:text-white"
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setLang("he")}
                className={`px-2.5 py-1 rounded-md transition ${
                  lang === "he" ? "bg-orange-500 text-white shadow-xs" : "text-slate-400 hover:text-white"
                }`}
              >
                עב
              </button>
            </div>

            {/* Print / Save button */}
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-xs font-medium text-slate-300 hover:text-white hover:border-slate-500 transition"
              title={isHe ? "הדפס / שמור כ-PDF" : "Print / Save PDF"}
            >
              <span>🖨️</span>
              <span className="hidden sm:inline">{isHe ? "הדפס / PDF" : "Print"}</span>
            </button>
          </div>
        </div>

        {/* 1-Click Retail Presets Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>{isHe ? "⚡ טען תרחיש קטגוריה מוכן לקמעונאות ישראלית:" : "⚡ Load retail category preset:"}</span>
            <span className="text-orange-400">{isHe ? "מבוסס מחירי יצרן אמיתיים מאירופה" : "Live European factory benchmarks"}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {PRESETS.map((p) => {
              const isSelected = activePresetId === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => handleSelectPreset(p)}
                  className={`flex items-center gap-2 p-3 rounded-xl border text-start transition text-xs font-semibold ${
                    isSelected
                      ? "border-orange-500 bg-orange-500/10 text-white shadow-md shadow-orange-500/10 ring-1 ring-orange-500/30"
                      : "border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700 hover:bg-slate-800/60"
                  }`}
                >
                  <span className="text-xl shrink-0">{p.icon}</span>
                  <div className="min-w-0">
                    <div className="font-bold truncate text-slate-100">{isHe ? p.nameHe : p.nameEn}</div>
                    <div className="text-[11px] text-slate-400 font-normal">
                      {p.currency === "EUR" ? "€" : "$"}{p.factoryCost.toFixed(2)} · {p.incoterm}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Top KPI Cards (Live Results Bar) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Card 1: Unit Landed Cost */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 relative overflow-hidden">
            <div className="text-xs font-semibold text-slate-400 mb-1 flex items-center justify-between">
              <span>{isHe ? "עלות נחיתה ליחידה במרלו״ג" : "Unit Landed Cost (DC)"}</span>
              <span className="text-base">🇮🇱</span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {formatIls(calculations.unitLandedIls, 2)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <span>{isHe ? "מקור:" : "Origin:"}</span>
              <span className="font-mono text-slate-300">
                {formatCurr(factoryCost, currency)} ({incoterm})
              </span>
            </div>
          </div>

          {/* Card 2: Consumer Shelf Price */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 relative overflow-hidden">
            <div className="text-xs font-semibold text-slate-400 mb-1 flex items-center justify-between">
              <span>{isHe ? "מחיר מדף מומלץ (כולל מע״מ)" : "Suggested Shelf Price"}</span>
              <span className="text-base">🛒</span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-orange-400 tracking-tight">
              {formatIls(calculations.finalConsumerShelfPrice, 2)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <span>{isHe ? "לפני מע״מ:" : "Net ex-VAT:"}</span>
              <span className="font-mono text-slate-300">
                {formatIls(calculations.finalNetShelfPrice, 2)}
              </span>
            </div>
          </div>

          {/* Card 3: Retail Gross Margin */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 relative overflow-hidden">
            <div className="text-xs font-semibold text-slate-400 mb-1 flex items-center justify-between">
              <span>{isHe ? "מרווח גולמי לרשת" : "Retail Gross Margin"}</span>
              <span className="text-base">📈</span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight">
              {calculations.finalRetailerMarginPercent.toFixed(1)}%
            </div>
            <div className="text-[11px] text-emerald-400/80 mt-1 flex items-center gap-1">
              <span>{isHe ? "רווח יחידה:" : "Unit margin:"}</span>
              <span className="font-mono font-bold">
                +{formatIls(calculations.retailerProfitPerUnitIls, 2)}
              </span>
            </div>
          </div>

          {/* Card 4: Total Gross Profit / Container */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 relative overflow-hidden">
            <div className="text-xs font-semibold text-slate-400 mb-1 flex items-center justify-between">
              <span>{isHe ? "רווח גולמי כולל למכולה" : "Gross Profit / Container"}</span>
              <span className="text-base">💰</span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight">
              {formatIls(calculations.totalRetailerProfitPerContainer, 0)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <span>{isHe ? `ל-${annualContainers} מכולות/שנה:` : `Annual (${annualContainers} FCL):`}</span>
              <span className="font-mono font-bold text-slate-200">
                {formatIls(calculations.annualRetailerProfitTotal, 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Main 2-Column Calculator Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT / FIRST: Input Controls (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Step 1: Factory & Sourcing Terms */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-500/20 text-orange-400 text-xs font-black">1</span>
                  <h2 className="text-base font-bold text-white">
                    {isHe ? "עלות מפעל בחו״ל ותנאי מכר (Sourcing Terms)" : "Factory Cost & Incoterms"}
                  </h2>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  1 {currency} = ₪{calculations.rateToIls.toFixed(2)}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Product Name */}
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    {isHe ? "שם המוצר / קטגוריה" : "Product Name / Category"}
                  </label>
                  <input
                    type="text"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-hidden focus:border-orange-500 transition"
                  />
                </div>

                {/* Currency Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    {isHe ? "מטבע הצעת המחיר" : "Quotation Currency"}
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(["EUR", "USD", "GBP"] as const).map((curr) => (
                      <button
                        key={curr}
                        type="button"
                        onClick={() => setCurrency(curr)}
                        className={`py-2 text-xs font-bold rounded-lg border transition ${
                          currency === curr
                            ? "border-orange-500 bg-orange-500/20 text-white"
                            : "border-slate-800 bg-slate-950 text-slate-400 hover:text-white"
                        }`}
                      >
                        {curr === "EUR" ? "€ EUR" : curr === "USD" ? "$ USD" : "£ GBP"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live FX Rate Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    {isHe ? `שער המרה ${currency} לש״ח` : `${currency} to ILS FX Rate`}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={currency === "EUR" ? eurRate : currency === "USD" ? usdRate : gbpRate}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      if (currency === "EUR") setEurRate(val);
                      else if (currency === "USD") setUsdRate(val);
                      else setGbpRate(val);
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white focus:outline-hidden focus:border-orange-500 transition"
                  />
                </div>

                {/* Factory Unit Price */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    {isHe ? `מחיר יחידה מהמפעל (${currency === "EUR" ? "€" : currency === "USD" ? "$" : "£"})` : `Unit Factory Price (${currency})`}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={factoryCost}
                      onChange={(e) => setFactoryCost(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-white focus:outline-hidden focus:border-orange-500 transition"
                    />
                    <span className="absolute end-3.5 top-2.5 text-xs text-slate-400 font-mono">
                      ≈ {formatIls(calculations.unitFactoryIls, 2)}
                    </span>
                  </div>
                </div>

                {/* Incoterm */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    {isHe ? "תנאי מכר (Incoterms)" : "Incoterm"}
                  </label>
                  <select
                    value={incoterm}
                    onChange={(e) => setIncoterm(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-hidden focus:border-orange-500 transition cursor-pointer"
                  >
                    <option value="CIF">CIF (נמל אשדוד / חיפה - כולל הובלה ימית וביטוח)</option>
                    <option value="FOB">FOB (נמל מוצא באירופה - ולנסיה / אנטוורפן / גנואה)</option>
                    <option value="EXW">EXW (שער מפעל באירופה - דורש הובלה יבשתית)</option>
                    <option value="DDP">DDP (עד מחסן הלקוח - פטור מכל אגרה ישראלית)</option>
                  </select>
                </div>

                {/* Container Volume */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    {isHe ? "כמות יחידות במכולה מלאה (FCL)" : "Units per Full Container"}
                  </label>
                  <input
                    type="number"
                    step="500"
                    min="100"
                    value={unitsPerContainer}
                    onChange={(e) => setUnitsPerContainer(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white focus:outline-hidden focus:border-orange-500 transition"
                  />
                </div>

                {/* Container Type */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    {isHe ? "סוג מכולה ימית" : "Container Equipment"}
                  </label>
                  <select
                    value={containerType}
                    onChange={(e) => setContainerType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-hidden focus:border-orange-500 transition cursor-pointer"
                  >
                    <option value="40dry">40ft HC Dry (יבשה מוגבהת - עד 24 משטחים)</option>
                    <option value="20dry">20ft Dry (יבשה קצרה - עד 11 משטחים)</option>
                    <option value="40reefer">40ft Reefer (קירור / הקפאה מבוקרת טמפ׳)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Step 2: International Freight & Port Logistics */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-500/20 text-orange-400 text-xs font-black">2</span>
                  <h2 className="text-base font-bold text-white">
                    {isHe ? "שילוח ימי, נמלי ישראל ומכס (Port & Clearance)" : "Ocean Freight & Customs Clearance"}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAdvancedParams(!showAdvancedParams)}
                  className="text-xs text-orange-400 hover:text-orange-300 font-medium"
                >
                  {showAdvancedParams ? (isHe ? "הסתר פירוט" : "Hide details") : (isHe ? "ערוך פירוט אגרות" : "Edit fees")}
                </button>
              </div>

              {/* Conditional Freight row (if EXW or FOB) */}
              {(incoterm === "EXW" || incoterm === "FOB") && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
                  {incoterm === "EXW" && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">
                        {isHe ? "הובלה יבשתית באירופה (ממפעל לנמל - €)" : "European Inland Haulage (€)"}
                      </label>
                      <input
                        type="number"
                        step="50"
                        value={inlandEur}
                        onChange={(e) => setInlandEur(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-white"
                      />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      {isHe ? "הובלה ימית מאירופה לאשדוד/חיפה ($)" : "Ocean Freight ($ USD)"}
                    </label>
                    <input
                      type="number"
                      step="50"
                      value={oceanFreightUsd}
                      onChange={(e) => setOceanFreightUsd(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-white"
                    />
                  </div>
                </div>
              )}

              {/* Destination Port & FTA Duty */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    {isHe ? "נמל יעד בישראל" : "Destination Port"}
                  </label>
                  <select
                    value={destinationPort}
                    onChange={(e) => setDestinationPort(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-hidden focus:border-orange-500 transition cursor-pointer"
                  >
                    <option value="ashdod">נמל אשדוד / נמל הדרום</option>
                    <option value="haifa">נמל חיפה / נמל המפרץ</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                    <span>{isHe ? "שיעור מכס בישראל (%)" : "Israeli Customs Tariff (%)"}</span>
                    <span className="text-[10px] text-emerald-400 font-semibold">{isHe ? "0% בהסכם סחר אירופי (EUR.1)" : "0% under EU-IL FTA"}</span>
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={customsDutyPercent}
                    onChange={(e) => setCustomsDutyPercent(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white focus:outline-hidden focus:border-orange-500 transition"
                  />
                </div>
              </div>

              {/* Advanced Port & Clearing Fee Breakdowns */}
              {showAdvancedParams && (
                <div className="space-y-3 pt-3 border-t border-slate-800 text-xs">
                  <div className="text-slate-400 font-semibold">
                    {isHe ? "אגרות שחרור, מעבדה והובלה מקומית בישראל (₪ למכולה):" : "Israeli Port, Lab & Domestic Transport (ILS per container):"}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                    <div>
                      <span className="text-slate-400 block text-[11px] font-sans">{isHe ? "אגרות נמל וסוורות" : "Port dues"}</span>
                      <input
                        type="number"
                        value={portCharges}
                        onChange={(e) => setPortCharges(parseInt(e.target.value, 10) || 0)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 mt-1"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px] font-sans">{isHe ? "עמילות ופקודת מסירה" : "Brokerage"}</span>
                      <input
                        type="number"
                        value={customsBrokerage}
                        onChange={(e) => setCustomsBrokerage(parseInt(e.target.value, 10) || 0)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 mt-1"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px] font-sans">{isHe ? "תחנת הסגר ובדיקות" : "Lab & Health"}</span>
                      <input
                        type="number"
                        value={healthAndStandards}
                        onChange={(e) => setHealthAndStandards(parseInt(e.target.value, 10) || 0)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 mt-1"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px] font-sans">{isHe ? "הובלה יבשתית למרלו״ג" : "DC Haulage"}</span>
                      <input
                        type="number"
                        value={localHaulage}
                        onChange={(e) => setLocalHaulage(parseInt(e.target.value, 10) || 0)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 mt-1"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Step 3: Retail Shelf Pricing & Margin Target */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-500/20 text-orange-400 text-xs font-black">3</span>
                  <h2 className="text-base font-bold text-white">
                    {isHe ? "תמחור מדף ורווחיות הרשת (Retail Shelf Economics)" : "Shelf Pricing & Margin Simulator"}
                  </h2>
                </div>

                {/* Pricing Mode Toggle */}
                <div className="inline-flex rounded-lg border border-slate-700 bg-slate-950 p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setPricingMode("targetPrice")}
                    className={`px-2.5 py-1 rounded font-semibold transition ${
                      pricingMode === "targetPrice"
                        ? "bg-orange-500 text-white"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {isHe ? "לפי מחיר מדף" : "By Shelf Price"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPricingMode("targetMargin")}
                    className={`px-2.5 py-1 rounded font-semibold transition ${
                      pricingMode === "targetMargin"
                        ? "bg-orange-500 text-white"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {isHe ? "לפי מרווח גולמי %" : "By Gross Margin %"}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {pricingMode === "targetPrice" ? (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      {isHe ? "מחיר מדף יעד לצרכן (כולל מע״מ ₪)" : "Target Consumer Shelf Price (incl. VAT ₪)"}
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.5"
                      value={targetShelfPrice}
                      onChange={(e) => setTargetShelfPrice(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-base font-mono font-bold text-orange-400 focus:outline-hidden focus:border-orange-500 transition"
                    />
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      {isHe ? "מרווח גולמי יעד לקמעונאי (%)" : "Target Retail Gross Margin (%)"}
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="5"
                      max="80"
                      value={targetMarginPercent}
                      onChange={(e) => setTargetMarginPercent(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-base font-mono font-bold text-emerald-400 focus:outline-hidden focus:border-orange-500 transition"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    {isHe ? "שיעור מע״מ קמעונאי בישראל (%)" : "Retail VAT (%)"}
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={vatPercent}
                    onChange={(e) => setVatPercent(parseFloat(e.target.value) || 18)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white focus:outline-hidden focus:border-orange-500 transition"
                  />
                </div>

                {/* Benchmark Brand */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    {isHe ? "מותג מוביל על המדף להשוואה (בנצ׳מרק)" : "Benchmark Brand on Shelf"}
                  </label>
                  <input
                    type="text"
                    value={benchmarkBrand}
                    onChange={(e) => setBenchmarkBrand(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-hidden focus:border-orange-500 transition"
                  />
                </div>

                {/* Benchmark Shelf Price */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    {isHe ? "מחיר מדף נוכחי למותג המוביל (₪)" : "Current Benchmark Shelf Price (₪)"}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    value={benchmarkShelfPrice}
                    onChange={(e) => setBenchmarkShelfPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white focus:outline-hidden focus:border-orange-500 transition"
                  />
                </div>
              </div>

              {/* Annual Volume Slider */}
              <div className="space-y-2 pt-3 border-t border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">
                    {isHe ? "היקף יבוא שנתי צפוי לרשת (מכולות בשנה):" : "Projected Annual Import Volume (Containers/Year):"}
                  </span>
                  <span className="font-bold text-orange-400 font-mono">
                    {annualContainers} {isHe ? "מכולות" : "FCLs"} ({(annualContainers * unitsPerContainer).toLocaleString()} {isHe ? "יח׳" : "units"})
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="24"
                  step="1"
                  value={annualContainers}
                  onChange={(e) => setAnnualContainers(parseInt(e.target.value, 10))}
                  className="w-full accent-orange-500 h-2 bg-slate-950 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* RIGHT / SECOND: Commercial Intelligence & Waterfall Breakdown (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Executive Summary Card */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-orange-500/30 rounded-2xl p-6 shadow-xl space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-lg font-black text-white">
                    {isHe ? "תמצית כלכלית לקניין" : "Commercial Brief"}
                  </h3>
                  <p className="text-xs text-slate-400 truncate max-w-xs">{productName}</p>
                </div>
                <span className="text-2xl">📊</span>
              </div>

              {/* Cost Waterfall Visual Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>{isHe ? "מבנה עלות הנחיתה (Waterfall):" : "Landed Cost Composition:"}</span>
                  <span className="font-mono text-orange-400 font-bold">{formatIls(calculations.unitLandedIls, 2)}</span>
                </div>
                <div className="h-4 w-full bg-slate-950 rounded-full overflow-hidden flex p-0.5 border border-slate-800">
                  <div
                    style={{ width: `${calculations.factoryShare}%` }}
                    className="bg-orange-500 h-full rounded-l-full transition-all duration-500"
                    title={`Factory: ${calculations.factoryShare.toFixed(1)}%`}
                  />
                  <div
                    style={{ width: `${calculations.freightShare}%` }}
                    className="bg-sky-500 h-full transition-all duration-500"
                    title={`Freight & Insurance: ${calculations.freightShare.toFixed(1)}%`}
                  />
                  <div
                    style={{ width: `${calculations.clearanceShare}%` }}
                    className="bg-purple-500 h-full rounded-r-full transition-all duration-500"
                    title={`Port & Clearance: ${calculations.clearanceShare.toFixed(1)}%`}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />
                    {isHe ? "מפעל" : "Factory"} ({calculations.factoryShare.toFixed(0)}%)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-sky-500 inline-block" />
                    {isHe ? "שילוח" : "Freight"} ({calculations.freightShare.toFixed(0)}%)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />
                    {isHe ? "נמל ומכס" : "Port/Clearance"} ({calculations.clearanceShare.toFixed(0)}%)
                  </span>
                </div>
              </div>

              {/* Economic Breakdown Table */}
              <div className="space-y-2 text-xs border-t border-slate-800 pt-4">
                <div className="flex justify-between py-1 text-slate-300">
                  <span>{isHe ? "מחיר מפעל נטו ליחידה" : "Factory Price / Unit"}</span>
                  <span className="font-mono font-semibold text-white">{formatIls(calculations.unitFactoryIls, 2)} ({formatCurr(factoryCost, currency)})</span>
                </div>
                <div className="flex justify-between py-1 text-slate-300">
                  <span>{isHe ? "שילוח ימי וביטוח ליחידה" : "Freight & Insurance / Unit"}</span>
                  <span className="font-mono text-slate-300">
                    +{formatIls(
                      unitsPerContainer > 0
                        ? (calculations.inlandFreightIls + calculations.oceanFreightIls + calculations.marineInsuranceIls) / unitsPerContainer
                        : 0,
                      2
                    )}
                  </span>
                </div>
                <div className="flex justify-between py-1 text-slate-300">
                  <span>{isHe ? "אגרות נמל, עמילות ובדיקות ליחידה" : "Port, Brokerage & Lab / Unit"}</span>
                  <span className="font-mono text-slate-300">+{formatIls(calculations.clearancePerUnitIls, 2)}</span>
                </div>

                <div className="flex justify-between py-2 border-t border-slate-800 text-sm font-bold text-white">
                  <span>{isHe ? "עלות נחיתה כוללת במרלו״ג (Landed)" : "Total Landed Cost / Unit"}</span>
                  <span className="font-mono text-orange-400">{formatIls(calculations.unitLandedIls, 2)}</span>
                </div>

                <div className="flex justify-between py-1 text-slate-300">
                  <span>{isHe ? "מחיר מדף מומלץ לצרכן (כולל מע״מ)" : "Retail Shelf Price (incl. VAT)"}</span>
                  <span className="font-mono font-bold text-white">{formatIls(calculations.finalConsumerShelfPrice, 2)}</span>
                </div>
                <div className="flex justify-between py-1 text-slate-300">
                  <span>{isHe ? "רווח גולמי לקמעונאי ליחידה" : "Retail Gross Profit / Unit"}</span>
                  <span className="font-mono font-bold text-emerald-400">+{formatIls(calculations.retailerProfitPerUnitIls, 2)} ({calculations.finalRetailerMarginPercent.toFixed(1)}%)</span>
                </div>
              </div>

              {/* Benchmark Competitive Advantage Box */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="text-xs font-bold text-white flex items-center justify-between">
                  <span>{isHe ? "🎯 יתרון תחרותי מול המותג המוביל" : "🎯 Advantage vs Benchmark"}</span>
                  <span className="text-[11px] text-orange-400 font-mono">
                    {benchmarkBrand} ({formatIls(benchmarkShelfPrice, 2)})
                  </span>
                </div>
                <div className="text-xs text-slate-300 space-y-1">
                  <div className="flex justify-between">
                    <span>{isHe ? "חיסכון לצרכן על המדף:" : "Consumer savings / unit:"}</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {formatIls(calculations.consumerSavingPerUnitIls, 2)} ({calculations.consumerSavingPercent.toFixed(1)}% {isHe ? "פחות" : "cheaper"})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>{isHe ? `רווח גולמי שנתי (${annualContainers} מכולות):` : `Annual chain profit (${annualContainers} FCL):`}</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {formatIls(calculations.annualRetailerProfitTotal, 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* CTAs and Sharing */}
              <div className="space-y-3 pt-2">
                {/* 1-Click WhatsApp Share */}
                <a
                  href={`https://wa.me/972525222291?text=${generateWhatsAppMessage()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl text-sm transition shadow-lg shadow-emerald-900/30"
                >
                  <span>💬</span>
                  <span>{isHe ? "שלח תחשיב זה לאודי בווטסאפ" : "Share Calculation via WhatsApp"}</span>
                </a>

                {/* Direct RFQ link */}
                <Link
                  href={rfqHref}
                  className="w-full inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-xl text-sm transition shadow-lg shadow-orange-950/40"
                >
                  <span>🚀</span>
                  <span>{isHe ? "בקש הצעת מחיר רשמית ממפעל (RFQ)" : "Request Official Factory RFQ"}</span>
                </Link>

                {/* Copy Summary */}
                <button
                  type="button"
                  onClick={handleCopySummary}
                  className="w-full inline-flex items-center justify-center gap-2 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 font-semibold py-2.5 px-4 rounded-xl text-xs transition"
                >
                  <span>{copiedState ? "✅" : "📋"}</span>
                  <span>
                    {copiedState
                      ? isHe ? "התחשיב הועתק ללוח בהצלחה!" : "Copied to clipboard!"
                      : isHe ? "העתק דוח מנהלים מעוצב (טקסט)" : "Copy Executive Summary"}
                  </span>
                </button>
              </div>
            </div>

            {/* Regulatory Note Box */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-xs text-slate-400 space-y-2">
              <div className="font-bold text-slate-200 flex items-center gap-1.5">
                <span>🛡️</span>
                <span>{isHe ? "הערת עמילות ורגולציה ביבוא מזון" : "Regulatory & Logistics Compliance Note"}</span>
              </div>
              <p className="leading-relaxed">
                {isHe
                  ? "התחשיב מבוסס על שחרור במסלול ירוק תחת רפורמת היבוא האירופאי, פטור ממכס במסגרת הסכם הסחר ישראל-איחוד אירופי (מותנה בתעודת מקור EUR.1 / הצהרת יצואן בחשבון) ודרישות סימון לפי ת״י 1145. נתוני ההובלה והאגרות עשויים להשתנות מעת לעת בהתאם למועדי שיוט והיטלי עומס בנמלים."
                  : "Estimates assume Green Channel release under the European Food Reform, 0% customs duty under the EU-Israel Free Trade Agreement (pending valid EUR.1 certificate or invoice declaration), and standard Israeli labeling compliance under SI 1145."}
              </p>
              <div className="pt-2">
                <Link
                  href={isHe ? "/he/import-guide" : "/en/import-guide"}
                  className="text-orange-400 hover:underline font-medium inline-flex items-center gap-1"
                >
                  <span>{isHe ? "למדריך המלא: רגולציה וכשרות ביבוא מזון ←" : "Explore full Food Import Guide ←"}</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
