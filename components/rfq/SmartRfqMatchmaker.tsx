"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { runSmartRfqMatch, type SmartRfqResult, type MatchedFactoryOption } from "@/app/he/rfq/actions";
import { useSampleKit } from "@/context/SampleKitContext";

interface Props {
  initialLang?: "he" | "en";
}

const POPULAR_BENCHMARKS = [
  {
    id: "pasta-penne-500g",
    labelHe: "פסטה ברונזה 500 גרם (חלופה לברילה / דה צ׳קו)",
    labelEn: "Bronze-Cut Pasta 500g (Barilla / De Cecco Benchmark)",
    icon: "🍝",
    productName: "Bronze-Cut Penne Rigate 500g",
    category: "Pasta & Grains",
    targetCifEur: 0.82,
    benchmarkBrand: "Barilla / De Cecco (₪8.90)",
  },
  {
    id: "olive-oil-750ml",
    labelHe: "שמן זית כתית מעולה 750 מ״ל (חלופה ליד מרדכי / פיליפו בריו)",
    labelEn: "Extra Virgin Olive Oil 750ml (Yad Mordechai / Filippo Berio)",
    icon: "🫒",
    productName: "Extra Virgin Olive Oil 750ml <0.4% Acidity",
    category: "Oils & Fats",
    targetCifEur: 3.20,
    benchmarkBrand: "Yad Mordechai / Filippo Berio (₪37.90)",
  },
  {
    id: "crushed-tomatoes-400g",
    labelHe: "עגבניות מרוסקות פולפה 400 גרם (חלופה למוטי Mutti)",
    labelEn: "Finely Chopped Tomatoes 400g Polpa (Mutti Benchmark)",
    icon: "🥫",
    productName: "Finely Chopped Tomatoes 400g Polpa 100% Italian",
    category: "Tomato Products",
    targetCifEur: 0.58,
    benchmarkBrand: "Mutti Polpa (₪6.90)",
  },
  {
    id: "tuna-olive-oil-3pack",
    labelHe: "טונה בהירה בשמן זית 3x80 גרם (חלופה לריו מרה Rio Mare)",
    labelEn: "Solid Light Tuna in Olive Oil 3x80g (Rio Mare Benchmark)",
    icon: "🐟",
    productName: "Solid Light Yellowfin Tuna in Olive Oil 3x80g",
    category: "Canned Fish",
    targetCifEur: 2.10,
    benchmarkBrand: "Rio Mare (₪24.90)",
  },
  {
    id: "hazelnut-spread-350g",
    labelHe: "ממרח אגוזי לוז וקקאו 350 גרם (חלופה לנוטלה Nutella)",
    labelEn: "Cocoa & Hazelnut Spread 350g (Nutella Benchmark)",
    icon: "🌰",
    productName: "Hazelnut & Cocoa Spread 350g (Palm Oil Free)",
    category: "Confectionery & Sweets",
    targetCifEur: 1.65,
    benchmarkBrand: "Nutella (₪16.90)",
  },
];

export default function SmartRfqMatchmaker({ initialLang = "he" }: Props) {
  const router = useRouter();
  const { addItem, openModal } = useSampleKit();
  const [lang, setLang] = useState<"he" | "en">(initialLang);
  const isHe = lang === "he";

  // Form State
  const [productName, setProductName] = useState("Bronze-Cut Penne Rigate 500g");
  const [category, setCategory] = useState("Pasta & Grains");
  const [targetCifEur, setTargetCifEur] = useState<number>(0.84);
  const [kosherStandard, setKosherStandard] = useState<"chief_rabbinate" | "badatz" | "ou" | "any">("chief_rabbinate");
  const [privateLabelType, setPrivateLabelType] = useState<"oem_buyer_brand" | "factory_brand" | "bulk_foodservice">("oem_buyer_brand");
  const [annualContainers, setAnnualContainers] = useState<number>(4);
  const [selectedBenchmarkId, setSelectedBenchmarkId] = useState<string>("pasta-penne-500g");

  // Loading & Results
  const [isMatching, setIsMatching] = useState(false);
  const [result, setResult] = useState<SmartRfqResult | null>(null);
  const [addedSampleIds, setAddedSampleIds] = useState<string[]>([]);

  // Initial matching run on mount
  useEffect(() => {
    handleRunMatch();
  }, []);

  const handleSelectPreset = (preset: typeof POPULAR_BENCHMARKS[0]) => {
    setSelectedBenchmarkId(preset.id);
    setProductName(preset.productName);
    setCategory(preset.category);
    setTargetCifEur(preset.targetCifEur);
  };

  const handleRunMatch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsMatching(true);

    const res = await runSmartRfqMatch({
      productName,
      category,
      targetCifEur,
      kosherStandard,
      privateLabelType,
      annualContainers,
      benchmarkBrandId: selectedBenchmarkId,
    });

    setIsMatching(false);
    if (res.ok && res.result) {
      setResult(res.result);
    }
  };

  // Add individual sample to kit
  const handleAddSample = (factory: MatchedFactoryOption) => {
    addItem({
      id: factory.supplierId,
      name: factory.productHebrewName || factory.productName,
      category: category,
      brand: factory.supplierName,
      supplier_name: factory.supplierName,
      image_url: factory.packshotUrl,
      unit_size: "Consumer Shelf Pack",
      origin_country: factory.country,
      kosher_classification: factory.kosherStatus,
      source: "search",
    });

    setAddedSampleIds((prev) => [...prev, factory.supplierId]);
  };

  // Add all 3 matched samples and open kit
  const handleOrderAllSamples = () => {
    if (!result) return;
    result.topMatches.forEach((m) => {
      addItem({
        id: m.supplierId,
        name: m.productHebrewName || m.productName,
        category: category,
        brand: m.supplierName,
        supplier_name: m.supplierName,
        image_url: m.packshotUrl,
        unit_size: "Evaluation Sample Pack",
        origin_country: m.country,
        kosher_classification: m.kosherStatus,
        source: "search",
      });
    });

    openModal();
  };

  // Transfer to Commercial Pro-Forma Deal Desk
  const handleIssueProForma = (factory: MatchedFactoryOption) => {
    const targetUrl = `/admin/deals?new=1&buyer=${encodeURIComponent("Israeli Retail Chain")}&product=${encodeURIComponent(factory.productName)}&supplier=${encodeURIComponent(factory.supplierName)}`;
    router.push(targetUrl);
  };

  // WhatsApp Share Message
  const handleShareWhatsApp = () => {
    if (!result) return;
    const top = result.topMatches[0];
    const text = isHe
      ? `שלום, הפקתי סקירת סורסינג מותג פרטי ב-FoodXchange עבור ${productName}:
🏭 מפעל מוביל: ${top.supplierName} (${top.countryHe})
🎯 חלופה למותג מדף: ${result.benchmarkBrandName} (${result.benchmarkShelfPriceIls} ₪)
🇮🇱 עלות נחיתה משוערת: ${top.landedCostIls} ₪ ליחידה
🛒 מרווח קמעונאי צפוי: ${top.retailerMarginPct}% (רווח שנתי נוסף לרשת: ₪${top.annualExtraProfitIls.toLocaleString()})
✡️ כשרות: ${top.kosherStatusHe}

ניתן לצפות בסקירה המלאה ולהזמין ערכת דוגמאות בקישור:
https://fdx.trading/he/rfq`
      : `Hi, here is the Private Label Sourcing Deck from FoodXchange for ${productName}:
🏭 Matched Plant: ${top.supplierName} (${top.country})
🎯 Brand Benchmark: ${result.benchmarkBrandName}
🇮🇱 Landed Cost: ₪${top.landedCostIls} / unit
📊 Retailer Margin: ${top.retailerMarginPct}%
✡️ Kosher: ${top.kosherStatus}

View full deck: https://fdx.trading/en/rfq`;

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div
      className={`min-h-screen bg-slate-950 text-white py-10 px-4 sm:px-6 lg:px-8 ${
        isHe ? "rtl" : "ltr"
      }`}
      dir={isHe ? "rtl" : "ltr"}
    >
      <div className="max-w-7xl mx-auto space-y-8">
        {/* TOP HEADER */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20 mb-2">
              <span>⚡ {isHe ? "מערכת התאמת מותג פרטי לרשתות מזון" : "Smart RFQ & Private Label Matchmaker"}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              {isHe
                ? "מערכת התאמת מפעלי אירופה לקנייני רשתות שיווק"
                : "Smart RFQ Matchmaker & Retail Sourcing Decks"}
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-3xl leading-relaxed">
              {isHe
                ? "הגדר את מוצר המדף אותו תרצה להחליף או לבחון. המערכת סורקת 58,347 מוצרים ו-5,048 יצרני מזון מאומתים באירופה, ומפיקה עבורך מצגת סורסינג רשמית עם בדיקת עלות נחיתה, מרווחי מדף, תקינת ת״י 1145 ודוגמאות טעימה."
                : "Specify your target benchmark product or RFQ parameters. Match instantly against 58,347 catalog items and 5,048 vetted European food plants to generate an executive sourcing deck with landed margins and sample dispatch."}
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-end md:self-auto">
            {/* Language Switcher */}
            <div className="bg-slate-900 border border-slate-800 p-1 rounded-xl flex text-xs font-bold" dir="ltr">
              <button
                onClick={() => setLang("en")}
                className={`px-3 py-1.5 rounded-lg transition ${
                  lang === "en" ? "bg-orange-500 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setLang("he")}
                className={`px-3 py-1.5 rounded-lg transition ${
                  lang === "he" ? "bg-orange-500 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                עברית
              </button>
            </div>

            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold border border-slate-800 transition flex items-center gap-1.5"
            >
              <span>🖨️</span>
              <span className="hidden sm:inline">{isHe ? "הדפס מצגת" : "Print Deck"}</span>
            </button>
          </div>
        </div>

        {/* ── 1-CLICK POPULAR BENCHMARK CHIPS ── */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            {isHe ? "⚡ בחר תרחיש החלפת מותג מדף נפוץ:" : "⚡ Load Popular Supermarket Benchmark:"}
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            {POPULAR_BENCHMARKS.map((preset) => {
              const isSelected = selectedBenchmarkId === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => handleSelectPreset(preset)}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? "bg-orange-500/15 border-orange-500/60 shadow-lg shadow-orange-500/10"
                      : "bg-slate-900/70 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{preset.icon}</span>
                    <span className="text-xs font-bold text-white truncate">
                      {isHe ? preset.labelHe.split("(")[0] : preset.labelEn.split("(")[0]}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 truncate">{preset.benchmarkBrand}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── RFQ CONFIGURATION FORM ── */}
        <form onSubmit={handleRunMatch} className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">{isHe ? "שם מוצר יעד / מפרט:" : "Target Product / Spec:"}</label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-orange-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">{isHe ? "קטגוריית מזון:" : "Food Category:"}</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-orange-500"
              >
                <option value="Pasta & Grains">פסטה ודגנים (Pasta & Grains)</option>
                <option value="Oils & Fats">שמנים ושומנים (Oils & Fats)</option>
                <option value="Tomato Products">מוצרי עגבניות ורטבים (Tomato Products)</option>
                <option value="Canned Fish">שימורי דגים (Canned Fish)</option>
                <option value="Sauces & Condiments">רטבים, חומצים ותבלינים (Sauces)</option>
                <option value="Confectionery & Sweets">ממתקים, שוקולד ומאפים (Confectionery)</option>
                <option value="Dairy & Cheese">גבינות ומוצרי חלב אירופאיים (Dairy)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">{isHe ? "יעד מחיר מקסימלי CIF (€):" : "Max Target Price CIF (€):"}</label>
              <input
                type="number"
                step="0.01"
                value={targetCifEur}
                onChange={(e) => setTargetCifEur(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-orange-500 font-mono font-bold text-amber-400"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">{isHe ? "דרישת כשרות:" : "Kosher Standard:"}</label>
              <select
                value={kosherStandard}
                onChange={(e) => setKosherStandard(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-orange-500"
              >
                <option value="chief_rabbinate">רבנות ראשית לישראל (Chief Rabbinate)</option>
                <option value="badatz">בד״ץ מהדרין (Badatz Mehadrin)</option>
                <option value="ou">OU / OK / Star-K Kosher</option>
                <option value="any">כל כשרות / ללא דרישה (Any)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-2">
            <div>
              <label className="block text-slate-400 mb-1">{isHe ? "סוג אריזה ומותג:" : "Branding / Private Label:"}</label>
              <select
                value={privateLabelType}
                onChange={(e) => setPrivateLabelType(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-orange-500"
              >
                <option value="oem_buyer_brand">מותג פרטי של הרשת (OEM Private Label)</option>
                <option value="factory_brand">מותג היצרן האירופי (European Brand)</option>
                <option value="bulk_foodservice">אריזה מוסדית לשוק המקצועי (Foodservice)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">{isHe ? "היקף צפוי בשנה (מכולות FCL):" : "Estimated Annual Volume (FCL):"}</label>
              <select
                value={annualContainers}
                onChange={(e) => setAnnualContainers(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-orange-500 font-mono"
              >
                <option value={1}>1 מכולה (ניסיון רשת / Trial)</option>
                <option value={2}>2 מכולות בשנה</option>
                <option value={4}>4 מכולות בשנה (רבעונית)</option>
                <option value={12}>12 מכולות בשנה (מכולה חודשית קבועה)</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={isMatching}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-xl shadow-lg shadow-orange-500/25 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>🔍</span>
                <span>{isMatching ? (isHe ? "מאתר מפעלי מקור..." : "Scanning 5,000+ plants...") : (isHe ? "הרץ התאמה חכמה והפק מצגת" : "Run Smart Match & Generate Deck")}</span>
              </button>
            </div>
          </div>
        </form>

        {/* ── SOURCING DECK PRESENTATION (IF RESULT LOADED) ── */}
        {result && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* EXECUTIVE SUMMARY BANNER */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-orange-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 border-b border-slate-800 pb-6">
                <div>
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold uppercase mb-2">
                    <span>🏆 {isHe ? "מצגת סורסינג רשמית לרשתות שיווק" : "Official Retail Sourcing Deck"}</span>
                  </div>
                  <h2 className="text-xl sm:text-3xl font-black text-white">
                    {productName}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-300 mt-1">
                    {isHe ? "השוואת מותג מדף בנצ׳מרק: " : "Benchmark Shelf Brand: "}
                    <strong className="text-amber-400">{result.benchmarkBrandName}</strong>
                    {" · "}
                    <span className="font-mono text-slate-300">₪{result.benchmarkShelfPriceIls.toFixed(2)}</span>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
                  <button
                    onClick={handleOrderAllSamples}
                    className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-orange-500/20 transition flex items-center gap-2 cursor-pointer"
                  >
                    <span>📦</span>
                    <span>{isHe ? "הזמן ערכת טעימה לכל המפעלים" : "Order Sample Kit for All Plants"}</span>
                  </button>

                  <button
                    onClick={handleShareWhatsApp}
                    className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <span>💬</span>
                    <span>{isHe ? "שלח בוואטסאפ" : "Share WhatsApp"}</span>
                  </button>
                </div>
              </div>

              {/* KPI 4-PACK */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-6">
                <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800">
                  <p className="text-[11px] text-slate-400 uppercase tracking-wider">{isHe ? "עלות נחיתה ממוצעת" : "Avg Landed Cost"}</p>
                  <p className="text-2xl font-black text-white font-mono mt-1">₪{result.aggregateSummary.avgLandedCostIls.toFixed(2)}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{isHe ? "במרלו״ג הרשת (נמל אשדוד)" : "At Israeli DC"}</p>
                </div>

                <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800">
                  <p className="text-[11px] text-slate-400 uppercase tracking-wider">{isHe ? "מרווח גולמי לרשת" : "Retail Gross Margin"}</p>
                  <p className="text-2xl font-black text-emerald-400 font-mono mt-1">
                    {result.aggregateSummary.avgRetailerMarginPct}%
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{isHe ? "לעומת 16% במותג יבואן" : "vs. 16% on brand"}</p>
                </div>

                <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800">
                  <p className="text-[11px] text-slate-400 uppercase tracking-wider">{isHe ? "תוספת רווח גולמי שנתי" : "Annual Extra Profit"}</p>
                  <p className="text-2xl font-black text-amber-400 font-mono mt-1">
                    ₪{result.aggregateSummary.annualGrossProfitPotentialIls.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{annualContainers} {isHe ? "מכולות בשנה" : "FCL / year"}</p>
                </div>

                <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800">
                  <p className="text-[11px] text-slate-400 uppercase tracking-wider">{isHe ? "נתיב איחוד מומלץ" : "Logistics Hub"}</p>
                  <p className="text-sm font-bold text-cyan-300 mt-1 line-clamp-2">
                    {result.aggregateSummary.recommendedHub}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">11-13 {isHe ? "ימי הפלגה" : "transit days"}</p>
                </div>
              </div>
            </div>

            {/* ── TOP MATCHED EUROPEAN FACTORY CARDS ── */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>🏭</span>
                  <span>{isHe ? "מפעלי מקור מומלצים ומאומתים באירופה" : "Recommended European Production Plants"}</span>
                </h3>
                <span className="text-xs text-slate-400">
                  {result.topMatches.length} {isHe ? "מפעלים מובילים מתוך 5,048" : "top plants from 5,048"}
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {result.topMatches.map((factory, index) => {
                  const isAdded = addedSampleIds.includes(factory.supplierId);

                  return (
                    <div
                      key={factory.supplierId}
                      className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl hover:border-slate-700 transition flex flex-col justify-between"
                    >
                      <div>
                        {/* Top Banner with packshot & match badge */}
                        <div className="relative h-44 bg-slate-950 overflow-hidden">
                          {factory.packshotUrl && (
                            <Image
                              src={factory.packshotUrl}
                              alt={factory.productName}
                              fill
                              className="object-cover opacity-80 group-hover:scale-105 transition-transform"
                            />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />

                          {/* Match score badge */}
                          <div className="absolute top-3 left-3 bg-emerald-500/90 text-slate-950 font-black text-xs px-2.5 py-1 rounded-xl shadow-md flex items-center gap-1">
                            <span>⭐</span>
                            <span>{factory.matchScore}% {isHe ? "התאמה" : "Match"}</span>
                          </div>

                          {/* Country pill */}
                          <div className="absolute top-3 right-3 bg-slate-900/90 text-white font-semibold text-xs px-2.5 py-1 rounded-xl border border-slate-700/80 flex items-center gap-1.5">
                            <span>{factory.countryFlag}</span>
                            <span>{isHe ? factory.countryHe : factory.country}</span>
                          </div>

                          {/* Product title overlay */}
                          <div className="absolute bottom-3 inset-x-3">
                            <h4 className="text-base font-black text-white leading-tight drop-shadow-md">
                              {isHe ? factory.productHebrewName : factory.productName}
                            </h4>
                            <p className="text-xs text-slate-300 font-medium mt-0.5 truncate drop-shadow-xs">
                              🏭 {factory.supplierName}
                            </p>
                          </div>
                        </div>

                        {/* Card Body */}
                        <div className="p-5 space-y-4 text-xs">
                          {/* Financial Matrix (Landed vs Benchmark) */}
                          <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800/80 space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-slate-400">{isHe ? "עלות נחיתה למרלו״ג (Landed):" : "Unit Landed Cost:"}</span>
                              <span className="font-mono font-bold text-white text-sm">₪{factory.landedCostIls.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-400">{isHe ? "מחיר מדף מומלץ לצרכן:" : "Target Consumer Shelf:"}</span>
                              <span className="font-mono font-bold text-amber-300 text-sm">₪{factory.suggestedShelfIls.toFixed(2)}</span>
                            </div>
                            <div className="h-px bg-slate-800 my-1" />
                            <div className="flex justify-between items-center text-emerald-400 font-bold">
                              <span>{isHe ? "מרווח גולמי לרשת השיווק:" : "Retailer Gross Margin:"}</span>
                              <span className="font-mono text-base">{factory.retailerMarginPct}%</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] text-slate-400">
                              <span>{isHe ? "חיסכון לצרכן מול המותג:" : "Consumer Basket Saving:"}</span>
                              <span className="font-mono text-cyan-300 font-semibold">{factory.consumerSavingPct}% פחות</span>
                            </div>
                          </div>

                          {/* Quality Audits & Kosher */}
                          <div className="space-y-1.5 text-[11px]">
                            <div className="flex items-center gap-1.5 text-slate-300">
                              <span className="text-emerald-400">🛡️</span>
                              <span>{factory.certifications.slice(0, 2).join(" · ")}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-amber-300">
                              <span>✡️</span>
                              <span className="truncate">{isHe ? factory.kosherStatusHe : factory.kosherStatus}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-400">
                              <span>📦</span>
                              <span>MOQ: {factory.moqPallets} {isHe ? "משטחים" : "Pallets"} · {factory.leadTimeWeeks} {isHe ? "שבועות אספקה" : "weeks lead time"}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="p-5 pt-0 grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleAddSample(factory)}
                          className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition flex items-center justify-center gap-1 cursor-pointer ${
                            isAdded
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                              : "bg-slate-800 hover:bg-slate-700 text-white border-slate-700"
                          }`}
                        >
                          <span>{isAdded ? "✓" : "📦"}</span>
                          <span>{isAdded ? (isHe ? "נוסף לערכה" : "In Kit") : (isHe ? "דוגמת טעימה" : "Sample Kit")}</span>
                        </button>

                        <button
                          onClick={() => handleIssueProForma(factory)}
                          className="py-2 px-2.5 rounded-xl text-xs font-semibold bg-orange-500 hover:bg-orange-600 text-white transition flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                        >
                          <span>⚡</span>
                          <span>{isHe ? "הוצא Pro-Forma" : "Issue PO"}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
