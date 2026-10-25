"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { generatePriorityErpCsv } from "@/lib/documents/erpAsnGenerator";

export interface ContainerSkuItem {
  id: string;
  supplierName: string;
  factoryLocation: string;
  productName: string;
  productHebrewName: string;
  category: string;
  unitsPerCarton: number;
  cartonsPerPallet: number;
  pallets: number;
  unitWeightKg: number;
  factoryUnitPriceEur: number;
  color: string;
}

const CONTAINER_CONFIGS = {
  "40ft_hc": {
    name: "40ft High Cube (40' HC)",
    maxPallets: 24,
    maxCbm: 68.0,
    maxWeightKg: 26000,
    oceanFreightEur: 2450,
    cbmPerPallet: 2.3,
    description: "Standard ocean container for ambient high-volume retail goods (24 Euro Pallets)",
  },
  "20ft_dry": {
    name: "20ft Standard Dry (20' FCL)",
    maxPallets: 11,
    maxCbm: 28.0,
    maxWeightKg: 21500,
    oceanFreightEur: 1650,
    cbmPerPallet: 2.3,
    description: "Optimal for trial shipments or dense heavyweight items like olive oil and canned tomatoes",
  },
  "40ft_reefer": {
    name: "40ft Reefer (+4°C / -18°C)",
    maxPallets: 22,
    maxCbm: 60.0,
    maxWeightKg: 26000,
    oceanFreightEur: 3850,
    cbmPerPallet: 2.4,
    description: "Cold-chain temperature controlled for European cheeses, chilled butter, and frozen pasta",
  },
};

const CONSOLIDATION_HUBS = [
  {
    id: "italy_modena",
    name: "Modena Logistics Hub (Northern Italy)",
    country: "Italy",
    originPort: "Port of Genoa / La Spezia",
    destPort: "Port of Ashdod / Haifa",
    transitDays: "11-13 Days",
    inlandPickupPerSupplierEur: 280,
    terminalPortEur: 420,
    recommendedFor: "Pasta, Balsamic Vinegar, Pesto, Tomato Passata, Olive Oil",
  },
  {
    id: "spain_valencia",
    name: "Valencia Mediterranean Hub (Spain)",
    country: "Spain",
    originPort: "Port of Valencia / Barcelona",
    destPort: "Port of Ashdod",
    transitDays: "12-14 Days",
    inlandPickupPerSupplierEur: 310,
    terminalPortEur: 390,
    recommendedFor: "Olive Oils, Olives, Canned Tuna, Artichokes, Almonds",
  },
  {
    id: "nl_rotterdam",
    name: "Rotterdam Northwest Hub (Benelux & Germany)",
    country: "Netherlands / Germany",
    originPort: "Port of Rotterdam",
    destPort: "Port of Ashdod",
    transitDays: "14-16 Days",
    inlandPickupPerSupplierEur: 340,
    terminalPortEur: 450,
    recommendedFor: "Chocolates, Confectionery, Plant-Based Dairy, Cereals",
  },
];

const INITIAL_SKUS: ContainerSkuItem[] = [
  {
    id: "sku-1",
    supplierName: "Pastificio Granoro Srl",
    factoryLocation: "Corato (Bari), Italy",
    productName: "Bronze-Cut Penne Rigate 500g",
    productHebrewName: "פנה ריגטה ברונזה 500 גרם",
    category: "Pasta & Grains",
    unitsPerCarton: 18,
    cartonsPerPallet: 96,
    pallets: 8,
    unitWeightKg: 0.52,
    factoryUnitPriceEur: 0.74,
    color: "#f59e0b", // Amber
  },
  {
    id: "sku-2",
    supplierName: "Acetaia Reale di Modena",
    factoryLocation: "Modena, Italy",
    productName: "Balsamic Vinegar of Modena PGI 250ml",
    productHebrewName: "חומץ בלסמי ממודנה 250 מ״ל",
    category: "Vinegar & Condiments",
    unitsPerCarton: 12,
    cartonsPerPallet: 80,
    pallets: 4,
    unitWeightKg: 0.65,
    factoryUnitPriceEur: 2.15,
    color: "#8b5cf6", // Purple
  },
  {
    id: "sku-3",
    supplierName: "Frantoio San Martino Liguria",
    factoryLocation: "Imperia (Liguria), Italy",
    productName: "Pesto Genovese DOP Glass Jar 190g",
    productHebrewName: "פסטו ג׳נובזה מקורי 190 גרם",
    category: "Sauces & Spreads",
    unitsPerCarton: 12,
    cartonsPerPallet: 120,
    pallets: 6,
    unitWeightKg: 0.38,
    factoryUnitPriceEur: 1.42,
    color: "#10b981", // Emerald
  },
  {
    id: "sku-4",
    supplierName: "Olearia del Chianti",
    factoryLocation: "Panzano in Chianti (Tuscany), Italy",
    productName: "Extra Virgin Olive Oil 100% Italian 1L",
    productHebrewName: "שמן זית כתית מעולה איטלקי 1 ליטר",
    category: "Oils & Vinegars",
    unitsPerCarton: 12,
    cartonsPerPallet: 60,
    pallets: 6,
    unitWeightKg: 1.25,
    factoryUnitPriceEur: 5.60,
    color: "#06b6d4", // Cyan
  },
];

interface Props {
  initialLang?: "he" | "en";
}

export default function MixedContainerBuilder({ initialLang = "he" }: Props) {
  const router = useRouter();
  const [lang, setLang] = useState<"he" | "en">(initialLang);
  const isHe = lang === "he";

  const [containerType, setContainerType] = useState<"40ft_hc" | "20ft_dry" | "40ft_reefer">("40ft_hc");
  const [selectedHubId, setSelectedHubId] = useState<string>("italy_modena");
  const [skus, setSkus] = useState<ContainerSkuItem[]>(INITIAL_SKUS);
  const [eurRate, setEurRate] = useState<number>(4.05);

  const containerCfg = CONTAINER_CONFIGS[containerType];
  const hub = CONSOLIDATION_HUBS.find((h) => h.id === selectedHubId) || CONSOLIDATION_HUBS[0];

  // Calculations
  const calculations = useMemo(() => {
    let totalPallets = 0;
    let totalUnits = 0;
    let totalWeightKg = 0;
    let totalFactoryCostEur = 0;

    skus.forEach((sku) => {
      const unitsInSku = sku.pallets * sku.cartonsPerPallet * sku.unitsPerCarton;
      const weightInSku = unitsInSku * sku.unitWeightKg + sku.pallets * 25; // +25kg pallet tare
      const costInSku = unitsInSku * sku.factoryUnitPriceEur;

      totalPallets += sku.pallets;
      totalUnits += unitsInSku;
      totalWeightKg += weightInSku;
      totalFactoryCostEur += costInSku;
    });

    const totalCbm = Math.round(totalPallets * containerCfg.cbmPerPallet * 10) / 10;
    const palletFillPct = Math.round((totalPallets / containerCfg.maxPallets) * 100);
    const cbmFillPct = Math.round((totalCbm / containerCfg.maxCbm) * 100);
    const weightFillPct = Math.round((totalWeightKg / containerCfg.maxWeightKg) * 100);

    const distinctSuppliers = new Set(skus.map((s) => s.supplierName)).size;

    // Logistics breakdown
    const localCollectionEur = distinctSuppliers * hub.inlandPickupPerSupplierEur;
    const oceanFreightEur = containerCfg.oceanFreightEur;
    const portClearanceAshdodEur = hub.terminalPortEur + 250; // Terminal + customs broker
    const si1145LabFeeEur = 380; // Lab testing & Hebrew label verification
    const marineInsuranceEur = Math.round(totalFactoryCostEur * 0.0035 + 80);

    const totalConsolidatedLogisticsEur =
      localCollectionEur + oceanFreightEur + portClearanceAshdodEur + si1145LabFeeEur + marineInsuranceEur;

    const totalLandedCostEur = totalFactoryCostEur + totalConsolidatedLogisticsEur;
    const totalLandedCostIls = Math.round(totalLandedCostEur * eurRate);

    // Baseline if shipped as 4 separate LCL cargo lots
    const lclFreightEur = distinctSuppliers * 1450;
    const lclCfsDeconsolidationEur = distinctSuppliers * 680;
    const lclCustomsFilesEur = distinctSuppliers * 450;
    const totalLclCostEur = lclFreightEur + lclCfsDeconsolidationEur + lclCustomsFilesEur + totalFactoryCostEur;

    const savingsEur = Math.max(0, totalLclCostEur - totalLandedCostEur);
    const savingsPct = Math.round((savingsEur / totalLclCostEur) * 100);
    const savingsIls = Math.round(savingsEur * eurRate);

    return {
      totalPallets,
      totalUnits,
      totalWeightKg,
      totalCbm,
      totalFactoryCostEur,
      palletFillPct,
      cbmFillPct,
      weightFillPct,
      distinctSuppliers,
      localCollectionEur,
      oceanFreightEur,
      portClearanceAshdodEur,
      si1145LabFeeEur,
      marineInsuranceEur,
      totalConsolidatedLogisticsEur,
      totalLandedCostEur,
      totalLandedCostIls,
      savingsEur,
      savingsPct,
      savingsIls,
    };
  }, [skus, containerCfg, hub, eurRate]);

  // Handle pallet change for SKU
  const handlePalletChange = (skuId: string, delta: number) => {
    setSkus((prev) =>
      prev.map((item) => {
        if (item.id === skuId) {
          const newPallets = Math.max(1, item.pallets + delta);
          return { ...item, pallets: newPallets };
        }
        return item;
      })
    );
  };

  // Remove SKU
  const handleRemoveSku = (skuId: string) => {
    if (skus.length <= 1) {
      alert(isHe ? "חובה להשאיר לפחות פריט אחד במכולה" : "A container must have at least one product.");
      return;
    }
    setSkus((prev) => prev.filter((s) => s.id !== skuId));
  };

  // Add SKU
  const handleAddSampleSku = () => {
    const newId = `sku-${Date.now()}`;
    const colors = ["#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16"];
    const randomColor = colors[skus.length % colors.length];

    const newSku: ContainerSkuItem = {
      id: newId,
      supplierName: "Consorzio Parmigiano Reggiano",
      factoryLocation: "Parma, Italy",
      productName: "Parmigiano Reggiano DOP 24M Wedges 200g",
      productHebrewName: "פרמז׳ן רג׳אנו מיושן 24 חודש 200 גרם",
      category: "Dairy & Cheese",
      unitsPerCarton: 12,
      cartonsPerPallet: 100,
      pallets: 2,
      unitWeightKg: 0.22,
      factoryUnitPriceEur: 3.45,
      color: randomColor,
    };

    setSkus((prev) => [...prev, newSku]);
  };

  // Export to Priority ERP ASN CSV
  const handleDownloadErpCsv = () => {
    const firstSku = skus[0];
    const payload = {
      poNumber: `FDX-CONSOL-${Date.now().toString().slice(-6)}`,
      poDate: new Date().toISOString().slice(0, 10),
      buyerCompany: "Israeli Retail Chain (Supermarket Consignee)",
      supplierFactory: `Mixed Consolidated Hub (${hub.name})`,
      originCountry: hub.country,
      productName: `${skus.length} Mixed Consolidated European SKUs`,
      hebrewName: `מכולה משולבת ${skus.length} פריטי פרימיום מאירופה`,
      containerNumber: "MEDU8829103",
      billOfLading: "MSCU-884920",
      customsDeclarationNumber: `IL-2604-${Date.now().toString().slice(-4)}`,
      palletCount: calculations.totalPallets,
      totalUnits: calculations.totalUnits,
      unitsPerPallet: Math.round(calculations.totalUnits / calculations.totalPallets),
      netWeightKgPerUnit: 0.5,
      grossWeightKgPerUnit: 0.55,
      storageTemp: containerType === "40ft_reefer" ? "+4°C Chilled" : "+18°C Ambient",
      batchNumber: "LOT-CONSOL-2026",
      expiryDate: "31/12/2027",
    };

    const csvContent = generatePriorityErpCsv(payload);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Priority_ERP_Mixed_Container_${payload.poNumber}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to Deal Desk
  const handleExportToDealDesk = () => {
    const targetUrl = `/admin/deals?new=1&buyer=${encodeURIComponent("Israeli Retail Chain")}&product=${encodeURIComponent(`Mixed Container (${skus.length} SKUs: ${skus.map((s) => s.productName).slice(0, 2).join(", ")}...)`)}&supplier=${encodeURIComponent(`Consolidated via ${hub.name}`)}`;
    router.push(targetUrl);
  };

  return (
    <div
      className={`min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 lg:px-8 ${
        isHe ? "rtl" : "ltr"
      }`}
      dir={isHe ? "rtl" : "ltr"}
    >
      <div className="max-w-7xl mx-auto space-y-8">
        {/* TOP HEADER */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 mb-2">
              <span>🚢 {isHe ? "אופטימיזציית שילוח ואיחוד מטענים" : "Consolidated Groupage & Load Optimization"}</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              {isHe
                ? "מחשבון מכולה משולבת ואיחוד מפעלי מזון מאירופה"
                : "Mixed Container Builder & Multi-Factory Consolidation Hub"}
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-3xl leading-relaxed">
              {isHe
                ? "בנה מכולה משולבת של 20ft או 40ft ממספר יצרני מזון שונים באיטליה או ספרד. חישוב תפוסת נפח (CBM), משקל מקסימלי, חלוקת עלויות שילוח וחיסכון של עד 25% בעלות נחיתה ליחידה מול יבוא חלקי (LCL)."
                : "Combine pallets from multiple vetted European food plants into 1 shared container. Live CBM volume, weight payload limits, consolidated freight allocation, and up to 25% landed cost savings vs. LCL."}
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-end md:self-auto">
            {/* Lang Switch */}
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

            <Link
              href={isHe ? "/he/calculator" : "/en/calculator"}
              className="px-3.5 py-2 rounded-xl bg-slate-900 text-slate-300 hover:text-white text-xs font-semibold border border-slate-800 transition"
            >
              ← {isHe ? "מחשבון פריט בודד" : "Single SKU Landed Cost"}
            </Link>
          </div>
        </div>

        {/* CONTAINER CONFIG & CONSOLIDATION HUB SELECTOR */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Container Type */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <span>📐</span> {isHe ? "סוג מכולה ימית:" : "1. Container Specification:"}
            </label>
            <div className="space-y-2">
              {Object.entries(CONTAINER_CONFIGS).map(([k, cfg]) => {
                const isSelected = containerType === k;
                return (
                  <button
                    key={k}
                    onClick={() => setContainerType(k as any)}
                    className={`w-full text-left p-3 rounded-xl border text-xs transition flex items-center justify-between ${
                      isSelected
                        ? "bg-orange-500/15 border-orange-500/50 text-white"
                        : "bg-slate-950/60 border-slate-800/80 text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    <div>
                      <p className="font-bold text-white">{cfg.name}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {cfg.maxPallets} Pallets · {cfg.maxCbm} CBM · {cfg.maxWeightKg.toLocaleString()} kg
                      </p>
                    </div>
                    {isSelected && <span className="text-orange-400 font-bold">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Consolidation Hub */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <span>📍</span> {isHe ? "מרכז איחוד לוגיסטי באירופה:" : "2. European Consolidation Depot:"}
            </label>
            <select
              value={selectedHubId}
              onChange={(e) => setSelectedHubId(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-hidden focus:border-orange-500"
            >
              {CONSOLIDATION_HUBS.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.transitDays})
                </option>
              ))}
            </select>
            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
              <p>
                <strong>{isHe ? "נמל מוצא:" : "Origin Port:"}</strong> {hub.originPort}
              </p>
              <p>
                <strong>{isHe ? "נמל יעד:" : "Destination:"}</strong> {hub.destPort}
              </p>
              <p>
                <strong>{isHe ? "איסוף מקומי מיצרן:" : "Inland Pickup:"}</strong> €{hub.inlandPickupPerSupplierEur} / factory
              </p>
              <p className="text-cyan-400 text-[10px] pt-1">
                ⭐ {hub.recommendedFor}
              </p>
            </div>
          </div>

          {/* Savings Highlight Card */}
          <div className="bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-950 border border-emerald-500/40 rounded-2xl p-5 flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold uppercase mb-2">
                <span>💰</span> {isHe ? "חיסכון באיחוד מכולה מול LCL" : "Consolidation Advantage"}
              </div>
              <h3 className="text-lg font-bold text-white">
                {isHe ? "חיסכון כולל למכולה זו:" : "Net Logistics Savings:"}
              </h3>
              <p className="text-3xl font-black text-emerald-400 font-mono mt-1">
                €{calculations.savingsEur.toLocaleString()}
                <span className="text-sm font-sans text-slate-300 ml-1.5">
                  (≈ ₪{calculations.savingsIls.toLocaleString()})
                </span>
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {isHe
                  ? `הוזלה של ${calculations.savingsPct}% בהוצאות שילוח, עמילות מכס ודמי מסוף ימי בהשוואה ל-${calculations.distinctSuppliers} משלוחים חלקיים נפרדים.`
                  : `${calculations.savingsPct}% lower shipping, CFS depot, and clearance costs vs. ${calculations.distinctSuppliers} separate LCL shipments.`}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400">{isHe ? "שער המרה יורו/שקל:" : "FX EUR/ILS:"}</span>
              <div className="flex items-center gap-1 font-mono">
                <span>₪</span>
                <input
                  type="number"
                  step="0.01"
                  value={eurRate}
                  onChange={(e) => setEurRate(Number(e.target.value))}
                  className="w-16 px-1.5 py-0.5 bg-slate-950 border border-slate-800 rounded-md text-white text-center"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── VISUAL 2D CONTAINER BAY LAYOUT & CAPACITY METERS ── */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>📐</span>
                <span>{isHe ? "מפת פריסת משטחים בתוך המכולה (Bay Layout)" : "Interactive Container Bay Visualization"}</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {isHe
                  ? "הדמיית העמסת משטחי יורו (120x80 ס״מ) ב-2 שורות לאורך המכולה לפי צבעי היצרנים"
                  : "Euro Pallet loading diagram (1200x800mm) in 2 rows, color-coded by supplier plant"}
              </p>
            </div>

            {/* Capacity Pill Gauges */}
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span
                className={`px-3 py-1 rounded-full font-bold border ${
                  calculations.palletFillPct === 100
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                    : calculations.palletFillPct > 100
                    ? "bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse"
                    : "bg-amber-500/20 text-amber-400 border-amber-500/40"
                }`}
              >
                {calculations.totalPallets} / {containerCfg.maxPallets} {isHe ? "משטחים" : "Pallets"} ({calculations.palletFillPct}%)
              </span>

              <span className="px-3 py-1 rounded-full font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                {calculations.totalCbm} / {containerCfg.maxCbm} CBM ({calculations.cbmFillPct}%)
              </span>

              <span className="px-3 py-1 rounded-full font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">
                {calculations.totalWeightKg.toLocaleString()} / {containerCfg.maxWeightKg.toLocaleString()} kg ({calculations.weightFillPct}%)
              </span>
            </div>
          </div>

          {/* 2D CONTAINER VISUAL GRID */}
          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 relative overflow-x-auto">
            <div className="min-w-[640px]">
              {/* Container Front Header Label */}
              <div className="flex justify-between items-center text-[10px] uppercase font-mono text-slate-500 mb-2">
                <span>⚓ {isHe ? "חזית המכולה (פנים)" : "Container Deep (Front Wall)"}</span>
                <span>🚪 {isHe ? "דלתות אחוריות (פריקה)" : "Container Rear Doors (Unload Bay)"}</span>
              </div>

              {/* Container Box Shell */}
              <div className="border-4 border-slate-700 bg-slate-900/60 rounded-xl p-3 space-y-2">
                {/* Row 1 (Left Bay) */}
                <div className="grid grid-cols-12 gap-1.5 h-14">
                  {Array.from({ length: Math.ceil(containerCfg.maxPallets / 2) }).map((_, idx) => {
                    const palletIndex = idx * 2;
                    let currentAccumulator = 0;
                    let assignedSku: ContainerSkuItem | null = null;

                    for (const s of skus) {
                      if (palletIndex < currentAccumulator + s.pallets) {
                        assignedSku = s;
                        break;
                      }
                      currentAccumulator += s.pallets;
                    }

                    return (
                      <div
                        key={`bay-r1-${idx}`}
                        className={`rounded-lg border text-[10px] font-mono flex flex-col items-center justify-center transition-all ${
                          assignedSku
                            ? "border-white/20 text-white font-bold shadow-xs hover:scale-105 cursor-pointer"
                            : "border-dashed border-slate-800 text-slate-600 bg-slate-950/40"
                        }`}
                        style={{
                          backgroundColor: assignedSku ? `${assignedSku.color}33` : undefined,
                          borderColor: assignedSku ? assignedSku.color : undefined,
                        }}
                        title={assignedSku ? `${assignedSku.productName} (${assignedSku.supplierName})` : "Empty Bay"}
                      >
                        {assignedSku ? (
                          <>
                            <span className="truncate px-1 max-w-full text-[9px]">{assignedSku.supplierName.slice(0, 8)}</span>
                            <span className="text-[8px] opacity-75">#{palletIndex + 1}</span>
                          </>
                        ) : (
                          <span className="text-[9px]">#{palletIndex + 1}</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Row 2 (Right Bay) */}
                <div className="grid grid-cols-12 gap-1.5 h-14">
                  {Array.from({ length: Math.floor(containerCfg.maxPallets / 2) }).map((_, idx) => {
                    const palletIndex = idx * 2 + 1;
                    let currentAccumulator = 0;
                    let assignedSku: ContainerSkuItem | null = null;

                    for (const s of skus) {
                      if (palletIndex < currentAccumulator + s.pallets) {
                        assignedSku = s;
                        break;
                      }
                      currentAccumulator += s.pallets;
                    }

                    return (
                      <div
                        key={`bay-r2-${idx}`}
                        className={`rounded-lg border text-[10px] font-mono flex flex-col items-center justify-center transition-all ${
                          assignedSku
                            ? "border-white/20 text-white font-bold shadow-xs hover:scale-105 cursor-pointer"
                            : "border-dashed border-slate-800 text-slate-600 bg-slate-950/40"
                        }`}
                        style={{
                          backgroundColor: assignedSku ? `${assignedSku.color}33` : undefined,
                          borderColor: assignedSku ? assignedSku.color : undefined,
                        }}
                        title={assignedSku ? `${assignedSku.productName} (${assignedSku.supplierName})` : "Empty Bay"}
                      >
                        {assignedSku ? (
                          <>
                            <span className="truncate px-1 max-w-full text-[9px]">{assignedSku.supplierName.slice(0, 8)}</span>
                            <span className="text-[8px] opacity-75">#{palletIndex + 1}</span>
                          </>
                        ) : (
                          <span className="text-[9px]">#{palletIndex + 1}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Legend of Factories in Container */}
              <div className="flex flex-wrap items-center gap-4 mt-3 pt-2 text-xs">
                {skus.map((s) => (
                  <div key={s.id} className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="font-semibold text-slate-200">{s.supplierName}</span>
                    <span className="text-slate-500 font-mono">({s.pallets} Pallets)</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CAPACITY PROGRESS METERS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            {/* Pallets Meter */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">{isHe ? "ניצול משטחים:" : "Pallet Bay Fill:"}</span>
                <span className="font-bold text-white font-mono">{calculations.palletFillPct}%</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    calculations.palletFillPct > 100 ? "bg-rose-500" : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.min(100, calculations.palletFillPct)}%` }}
                />
              </div>
            </div>

            {/* Volume Meter */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">{isHe ? "ניצול נפח (CBM):" : "Volume Capacity (CBM):"}</span>
                <span className="font-bold text-cyan-400 font-mono">{calculations.cbmFillPct}%</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-500 transition-all duration-300"
                  style={{ width: `${Math.min(100, calculations.cbmFillPct)}%` }}
                />
              </div>
            </div>

            {/* Weight Payload Meter */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">{isHe ? "עומס משקל (Payload):" : "Weight Payload limit:"}</span>
                <span className="font-bold text-purple-400 font-mono">{calculations.weightFillPct}%</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    calculations.weightFillPct > 100 ? "bg-rose-500" : "bg-purple-500"
                  }`}
                  style={{ width: `${Math.min(100, calculations.weightFillPct)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── MULTI-SKU PALLET CONFIGURATION TABLE ── */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>📦</span>
                <span>{isHe ? "רשימת הפריטים והיצרנים במכולה המשולבת" : "Allocated Factories & SKUs in Groupage"}</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {isHe
                  ? "הגדר את מספר המשטחים, מחירי המפעל ותכולת האריזה עבור כל מפעל אירופי בנפרד"
                  : "Customize pallet allocations, factory pricing, and packaging per European manufacturer"}
              </p>
            </div>

            <button
              onClick={handleAddSampleSku}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
            >
              <span>+</span>
              <span>{isHe ? "הוסף יצרן/מוצר נוסף" : "Add Another European Plant"}</span>
            </button>
          </div>

          {/* MOBILE RESPONSIVE CARDS (VISIBLE ON MOBILE ONLY) */}
          <div className="block sm:hidden space-y-3">
            {skus.map((sku) => {
              const totalUnitsSku = sku.pallets * sku.cartonsPerPallet * sku.unitsPerCarton;
              const totalCostEur = totalUnitsSku * sku.factoryUnitPriceEur;
              const palletRatio = sku.pallets / Math.max(1, calculations.totalPallets);
              const allocatedLogisticsEur = calculations.totalConsolidatedLogisticsEur * palletRatio;
              const unitLandedEur = (totalCostEur + allocatedLogisticsEur) / Math.max(1, totalUnitsSku);
              const unitLandedIls = Math.round(unitLandedEur * eurRate * 100) / 100;

              return (
                <div key={sku.id} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <span className="w-3.5 h-3.5 rounded-full shrink-0 mt-1" style={{ backgroundColor: sku.color }} />
                      <div>
                        <h4 className="font-bold text-white text-xs leading-snug">{sku.productName}</h4>
                        <p className="text-[11px] text-slate-400">{sku.productHebrewName}</p>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                          🏭 {sku.supplierName} ({sku.factoryLocation})
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveSku(sku.id)}
                      className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-800 transition"
                      title="Remove SKU"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Stepper & Units */}
                  <div className="flex items-center justify-between bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/80">
                    <div>
                      <span className="text-[10px] uppercase text-slate-400 block">{isHe ? "הקצאת משטחים:" : "Pallets Allocation:"}</span>
                      <span className="text-xs text-slate-300 font-mono">{sku.unitsPerCarton} u/box · {sku.cartonsPerPallet} box/pal</span>
                    </div>

                    <div className="inline-flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-2 py-1">
                      <button
                        onClick={() => handlePalletChange(sku.id, -1)}
                        className="w-8 h-8 rounded-lg bg-slate-800 active:bg-slate-700 text-white font-bold flex items-center justify-center text-sm"
                      >
                        -
                      </button>
                      <span className="font-mono font-bold text-white text-base w-8 text-center">
                        {sku.pallets}
                      </span>
                      <button
                        onClick={() => handlePalletChange(sku.id, 1)}
                        className="w-8 h-8 rounded-lg bg-slate-800 active:bg-slate-700 text-white font-bold flex items-center justify-center text-sm"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Cost & Landed Grid */}
                  <div className="grid grid-cols-3 gap-2 text-[11px] pt-1">
                    <div className="bg-slate-900/60 p-2 rounded-lg">
                      <span className="text-slate-500 block text-[9px]">{isHe ? "סה״כ יחידות" : "Units"}</span>
                      <span className="font-bold text-slate-200 font-mono">{totalUnitsSku.toLocaleString()}</span>
                    </div>
                    <div className="bg-slate-900/60 p-2 rounded-lg">
                      <span className="text-slate-500 block text-[9px]">{isHe ? "מחיר מפעל" : "Factory"}</span>
                      <span className="font-bold text-amber-400 font-mono">€{sku.factoryUnitPriceEur.toFixed(2)}</span>
                    </div>
                    <div className="bg-slate-900/60 p-2 rounded-lg">
                      <span className="text-slate-500 block text-[9px]">{isHe ? "עלות נחיתה" : "Landed"}</span>
                      <span className="font-bold text-emerald-400 font-mono">₪{unitLandedIls.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* DESKTOP TABLE VIEW (VISIBLE ON TABLET & DESKTOP) */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-semibold">
                  <th className="py-3 px-3">{isHe ? "מפעל ומוצר" : "Supplier & Product"}</th>
                  <th className="py-3 px-3 text-center">{isHe ? "אריזה וקרטונים" : "Packaging"}</th>
                  <th className="py-3 px-3 text-center">{isHe ? "הקצאת משטחים" : "Pallets"}</th>
                  <th className="py-3 px-3 text-right">{isHe ? "סה״כ יחידות" : "Total Units"}</th>
                  <th className="py-3 px-3 text-right">{isHe ? "מחיר מפעל (EUR)" : "Ex-Works Price"}</th>
                  <th className="py-3 px-3 text-right">{isHe ? "עלות נחיתה משוערת" : "Landed Cost (ILS)"}</th>
                  <th className="py-3 px-3 text-center">{isHe ? "פעולות" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {skus.map((sku) => {
                  const totalUnitsSku = sku.pallets * sku.cartonsPerPallet * sku.unitsPerCarton;
                  const totalCostEur = totalUnitsSku * sku.factoryUnitPriceEur;

                  // Share of container logistics allocated by pallet ratio
                  const palletRatio = sku.pallets / Math.max(1, calculations.totalPallets);
                  const allocatedLogisticsEur = calculations.totalConsolidatedLogisticsEur * palletRatio;
                  const unitLandedEur = (totalCostEur + allocatedLogisticsEur) / Math.max(1, totalUnitsSku);
                  const unitLandedIls = Math.round(unitLandedEur * eurRate * 100) / 100;

                  return (
                    <tr key={sku.id} className="hover:bg-slate-950/40">
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: sku.color }} />
                          <div>
                            <p className="font-bold text-white">{sku.productName}</p>
                            <p className="text-[11px] text-slate-400">{sku.productHebrewName}</p>
                            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                              🏭 {sku.supplierName} ({sku.factoryLocation})
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-center text-slate-400 font-mono">
                        {sku.unitsPerCarton} u/box · {sku.cartonsPerPallet} box/pal
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <div className="inline-flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-2 py-1">
                          <button
                            onClick={() => handlePalletChange(sku.id, -1)}
                            className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center text-xs"
                          >
                            -
                          </button>
                          <span className="font-mono font-bold text-white text-sm w-8 text-center">
                            {sku.pallets}
                          </span>
                          <button
                            onClick={() => handlePalletChange(sku.id, 1)}
                            className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center text-xs"
                          >
                            +
                          </button>
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-200">
                        {totalUnitsSku.toLocaleString()}
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono text-amber-400 font-bold">
                        €{sku.factoryUnitPriceEur.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono font-bold text-emerald-400">
                        ₪{unitLandedIls.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <button
                          onClick={() => handleRemoveSku(sku.id)}
                          className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-800 transition"
                          title="Remove SKU from container"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── COMMERCIAL CONSOLIDATED SUMMARY & ACTION DESK ── */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-orange-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Financial Summary */}
            <div className="lg:col-span-7 space-y-4">
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                <span>📑</span>
                <span>{isHe ? "סיכום מסחרי למכולה משולבת" : "Consolidated Commercial Order Summary"}</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 text-[11px] block">{isHe ? "סה״כ מוצרים במכולה:" : "Total Units:"}</span>
                  <span className="text-lg font-bold text-white font-mono">{calculations.totalUnits.toLocaleString()}</span>
                  <span className="text-[10px] text-slate-500 block">{calculations.distinctSuppliers} {isHe ? "מפעלים שונים" : "distinct factories"}</span>
                </div>

                <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 text-[11px] block">{isHe ? "עלות מפעלי מקור (FOB):" : "Total Factory Value:"}</span>
                  <span className="text-lg font-bold text-amber-300 font-mono">€{calculations.totalFactoryCostEur.toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                  <span className="text-[10px] text-slate-500 block">{isHe ? "לפני שילוח" : "Ex-Works / FOB"}</span>
                </div>

                <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 text-[11px] block">{isHe ? "עלות נחיתה כוללת במרלו״ג:" : "Total Landed Cost:"}</span>
                  <span className="text-lg font-bold text-emerald-400 font-mono">₪{calculations.totalLandedCostIls.toLocaleString()}</span>
                  <span className="text-[10px] text-slate-500 block">(€{Math.round(calculations.totalLandedCostEur).toLocaleString()})</span>
                </div>
              </div>

              <div className="bg-slate-950/90 p-4 rounded-xl border border-slate-800/80 text-xs space-y-2">
                <div className="flex justify-between text-slate-300">
                  <span>{isHe ? "שילוח ימי ודמי מסוף ימי:" : "Consolidated Ocean & Terminal Fees:"}</span>
                  <span className="font-mono font-bold text-white">€{(calculations.oceanFreightEur + calculations.portClearanceAshdodEur).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>{isHe ? "איסוף יבשתי מקומי ממפעלי אירופה:" : "Local European Hub Pickup & Storage:"}</span>
                  <span className="font-mono font-bold text-white">€{calculations.localCollectionEur.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>{isHe ? "בדיקות מעבדה ת״י 1145 ותיווי:" : "SI 1145 Lab Testing & Label Verification:"}</span>
                  <span className="font-mono font-bold text-white">€{calculations.si1145LabFeeEur.toLocaleString()}</span>
                </div>
                <div className="h-px bg-slate-800 my-1" />
                <div className="flex justify-between text-emerald-400 font-bold">
                  <span>{isHe ? "חיסכון כולל מול שילוח חלקי (LCL):" : "Net Consolidation Savings:"}</span>
                  <span className="font-mono">€{calculations.savingsEur.toLocaleString()} (₪{calculations.savingsIls.toLocaleString()})</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="lg:col-span-5 space-y-3 flex flex-col justify-center">
              <button
                onClick={handleExportToDealDesk}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-2xl shadow-xl shadow-orange-500/25 transition text-center flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>⚡</span>
                <span>{isHe ? "הפקת הזמנת רכש Pro-Forma למכולה" : "Issue Consolidated Pro-Forma PO"}</span>
              </button>

              <button
                onClick={handleDownloadErpCsv}
                className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold rounded-2xl border border-slate-700 transition flex items-center justify-center gap-2 cursor-pointer text-xs"
              >
                <span>📥</span>
                <span>{isHe ? "הורד תעודת משלוח ל-Priority ERP (.CSV)" : "Download Priority ERP Receiving Manifest"}</span>
              </button>

              <div className="text-center">
                <span className="text-[11px] text-slate-500">
                  {isHe
                    ? "תנאי תשלום בנקאיים: 30% מקדמה להפעלת הייצור · 70% כנגד שטר מטען (B/L)"
                    : "Payment Terms: 30% Wire to initiate manufacturing · 70% against B/L"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
