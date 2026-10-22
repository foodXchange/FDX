"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSampleKit } from "@/context/SampleKitContext";
import { generateProductSpec, type TechnicalProductSpec } from "@/lib/products/specGenerator";
import type { PublicCatalogueProduct } from "@/app/en/products/page";

interface Props {
  product: PublicCatalogueProduct | null;
  onClose: () => void;
  isHebrew?: boolean;
}

export default function ProductSpecModal({ product, onClose, isHebrew = true }: Props) {
  const { addItem, removeItem, isItemInKit } = useSampleKit();
  const [activeTab, setActiveTab] = useState<"logistics" | "nutrition">("logistics");

  if (!product) return null;

  const spec: TechnicalProductSpec = generateProductSpec(product);
  const inKit = isItemInKit(product.id);

  const calculatorUrl = `/${isHebrew ? "he" : "en"}/calculator?product=${encodeURIComponent(
    spec.productName
  )}&category=${encodeURIComponent(spec.category)}`;

  const sourcingUrl = `/${isHebrew ? "he" : "en"}/sourcing?product=${encodeURIComponent(
    spec.productName
  )}&category=${encodeURIComponent(spec.category)}`;

  const generateWhatsAppShare = () => {
    const specUrl = `https://fdx.trading/${isHebrew ? "he" : "en"}/products/spec/${spec.productId}`;
    const text = isHebrew
      ? `*מפרט טכני ומשטוח למוצר — FoodXchange*
📦 *מוצר:* ${spec.productName}
🏭 *יצרן:* ${spec.supplierName} (${spec.countryFlag} ${spec.countryOfOrigin})
📐 *אריזה ומשטוח:* ${spec.palletization.unitsPerCarton} יח׳ בקרטון | ${spec.palletization.totalUnitsPerPallet.toLocaleString()} יח׳ במשטח
🚢 *מכולת 40ft HC:* ${spec.palletization.unitsPer40ftHC.toLocaleString()} יח׳ (${spec.palletization.palletsPer40ftHC} משטחי יורו)
✡️ *כשרות:* ${spec.kosherTypes.join(", ")}
🏷️ *תקנים:* ${spec.certifications.join(", ")}
🔗 *קישור ישיר למפרט:* ${specUrl}`
      : `*Technical Product Spec & Palletization — FoodXchange*
📦 *Product:* ${spec.productName}
🏭 *Manufacturer:* ${spec.supplierName} (${spec.countryFlag} ${spec.countryOfOrigin})
📐 *Packaging:* ${spec.palletization.unitsPerCarton} units/box | ${spec.palletization.totalUnitsPerPallet.toLocaleString()} units/Euro-pallet
🚢 *40ft HC Capacity:* ${spec.palletization.unitsPer40ftHC.toLocaleString()} units (${spec.palletization.palletsPer40ftHC} Euro-pallets)
✡️ *Kosher:* ${spec.kosherTypes.join(", ")}
🏷️ *Certifications:* ${spec.certifications.join(", ")}
🔗 *Direct Spec Link:* ${specUrl}`;

    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  };

  return (
    <div
      dir={isHebrew ? "rtl" : "ltr"}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] overflow-y-auto shadow-2xl relative my-auto animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 sticky top-0 bg-slate-900/95 backdrop-blur-xl z-20">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">📋</span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                {isHebrew ? "מפרט טכני, משטוח ולוגיסטיקה" : "Technical Spec & Palletization Sheet"}
              </h2>
              <span className="text-xs text-slate-400">
                {spec.countryFlag} {spec.supplierName} · {spec.categoryHe}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={generateWhatsAppShare()}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 rounded-xl border border-emerald-800/50 transition text-xs"
              title={isHebrew ? "שתף מפרט ב-WhatsApp" : "Share via WhatsApp"}
            >
              💬
            </a>
            <button
              onClick={() => window.print()}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition text-xs"
              title={isHebrew ? "הדפס דף מפרט A4" : "Print Spec Sheet"}
            >
              🖨️
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Body: 2 Columns */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT: Product Packshot & Commercial Actions (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Packshot Image Box */}
            <div className="relative h-60 w-full bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden flex items-center justify-center p-4">
              {product.image_url ? (
                <Image
                  src={product.image_url}
                  alt={spec.productName}
                  fill
                  className="object-contain p-3"
                  sizes="350px"
                />
              ) : (
                <span className="text-5xl">📦</span>
              )}

              {/* Private label badge */}
              {spec.privateLabelReady && (
                <span className="absolute top-3 right-3 bg-slate-900/90 border border-orange-500/40 text-orange-400 text-[10px] font-bold px-2.5 py-1 rounded-md shadow-sm">
                  🏷️ {isHebrew ? "מותג פרטי (Private Label)" : "Private Label Ready"}
                </span>
              )}
            </div>

            {/* Title & Origin */}
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white leading-snug">
                {spec.productName}
              </h3>
              <p className="text-xs text-slate-400">
                {isHebrew ? "יצרן:" : "Factory:"} {spec.supplierName} ({spec.countryFlag} {spec.countryOfOrigin})
              </p>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {spec.kosherTypes.map((k) => (
                <span
                  key={k}
                  className="text-[11px] font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-800/50 px-2.5 py-0.5 rounded-md"
                >
                  ✡️ {k}
                </span>
              ))}
              {spec.certifications.map((cert) => (
                <span
                  key={cert}
                  className="text-[10px] bg-slate-950 text-slate-300 border border-slate-800 px-2 py-0.5 rounded"
                >
                  {cert}
                </span>
              ))}
            </div>

            {/* Commercial Action Buttons */}
            <div className="space-y-2 pt-3 border-t border-slate-800">
              {/* Add to Tasting Sample Kit */}
              <button
                type="button"
                onClick={() => {
                  if (inKit) {
                    removeItem(product.id);
                  } else {
                    addItem({
                      id: product.id,
                      product_name: spec.productName,
                      category: spec.category,
                      image_url: product.image_url,
                      supplier_name: spec.supplierName,
                      country_of_origin: spec.countryOfOrigin,
                      kosher_types: spec.kosherTypes,
                      certifications: spec.certifications,
                      sample_format: spec.formatDescription,
                    });
                  }
                }}
                className={`w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold transition shadow-md cursor-pointer ${
                  inKit
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500"
                    : "bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/20"
                }`}
              >
                <span>📦</span>
                <span>
                  {inKit
                    ? isHebrew
                      ? "✓ בערכת הטעימות שלך"
                      : "✓ In Tasting Sample Box"
                    : isHebrew
                    ? "+ הוסף לערכת טעימות למשרד"
                    : "+ Add to Tasting Sample Box"}
                </span>
              </button>

              {/* Landed Cost Calculator Link */}
              <Link
                href={calculatorUrl}
                className="w-full inline-flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold py-2.5 px-4 rounded-xl border border-slate-700 transition"
              >
                <span>⚡</span>
                <span>{isHebrew ? "פתח במחשבון עלות נחיתה" : "Landed Cost Calculator"}</span>
              </Link>

              {/* Sourcing RFQ */}
              <Link
                href={sourcingUrl}
                className="w-full inline-flex items-center justify-center gap-1.5 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-semibold py-2 px-3 rounded-xl border border-slate-800 transition"
              >
                <span>{isHebrew ? "בקש הצעת מחיר RFQ למכולה ←" : "Request Factory RFQ ←"}</span>
              </Link>
            </div>
          </div>

          {/* RIGHT: Technical, Palletization & SI 1145 Tabs (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Tabs Bar */}
            <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab("logistics")}
                className={`flex-1 py-2 rounded-lg transition cursor-pointer ${
                  activeTab === "logistics"
                    ? "bg-slate-800 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                📦 {isHebrew ? "מפרט משטוח ומכולות" : "Palletization & Container"}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("nutrition")}
                className={`flex-1 py-2 rounded-lg transition cursor-pointer ${
                  activeTab === "nutrition"
                    ? "bg-slate-800 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                🏷️ {isHebrew ? "ת״י 1145 וסימון תזונתי" : "SI 1145 Label & Nutrients"}
              </button>
            </div>

            {/* TAB 1: Palletization & Container Logistics */}
            {activeTab === "logistics" ? (
              <div className="space-y-4 text-xs">
                {/* Master Carton Specs */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                  <span className="font-bold text-slate-200 block text-xs">
                    📦 {isHebrew ? "מפרט קרטון מאסטר (Master Carton):" : "Master Carton Specifications:"}
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-slate-300">
                    <div>
                      <span className="text-slate-500 block text-[11px]">
                        {isHebrew ? "יחידות בקרטון מאסטר:" : "Units per Carton:"}
                      </span>
                      <span className="font-bold text-white font-mono text-sm">
                        {spec.palletization.unitsPerCarton} {isHebrew ? "יח׳" : "units"}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[11px]">
                        {isHebrew ? "משקל קרטון ברוטו:" : "Carton Gross Weight:"}
                      </span>
                      <span className="font-bold text-white font-mono text-sm">
                        {spec.palletization.cartonWeightKg} {isHebrew ? "ק״ג" : "kg"}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[11px]">
                        {isHebrew ? "פורמט אריזת יחידה:" : "Unit Format:"}
                      </span>
                      <span className="font-semibold text-slate-200 truncate block">
                        {spec.formatDescription}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Euro-Pallet Breakdown (120x80cm) */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200 block text-xs">
                      📐 {isHebrew ? "מפרט משטח יורו סטנדרטי (Euro-Pallet 120x80 cm):" : "Euro-Pallet Matrix (120x80 cm):"}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Ti: {spec.palletization.cartonsPerLayer} / Hi: {spec.palletization.layersPerPallet}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-300">
                    <div>
                      <span className="text-slate-500 block text-[11px]">
                        {isHebrew ? "קרטונים במשטח:" : "Cartons per Pallet:"}
                      </span>
                      <span className="font-bold text-white font-mono text-sm">
                        {spec.palletization.totalCartonsPerPallet}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[11px]">
                        {isHebrew ? "סה״כ יחידות במשטח:" : "Total Units/Pallet:"}
                      </span>
                      <span className="font-bold text-emerald-400 font-mono text-sm">
                        {spec.palletization.totalUnitsPerPallet.toLocaleString()}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[11px]">
                        {isHebrew ? "גובה משטח:" : "Pallet Height:"}
                      </span>
                      <span className="font-bold text-white font-mono text-sm">
                        {spec.palletization.palletHeightCm} {isHebrew ? "ס״מ" : "cm"}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[11px]">
                        {isHebrew ? "משקל משטח ברוטו:" : "Pallet Gross Weight:"}
                      </span>
                      <span className="font-bold text-white font-mono text-sm">
                        {spec.palletization.palletGrossWeightKg} {isHebrew ? "ק״ג" : "kg"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Ocean Container Loading Capacity */}
                <div className="bg-gradient-to-br from-slate-950 to-slate-900 p-4 rounded-2xl border border-slate-800 space-y-3">
                  <span className="font-bold text-slate-200 block text-xs">
                    🚢 {isHebrew ? "קיבולת העמסה במכולות יבוא לישראל (נמל חיפה / אשדוד):" : "Ocean Container Capacity (Haifa / Ashdod):"}
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-300 text-xs">
                          {isHebrew ? "מכולת 20ft Dry" : "20ft Dry Container"}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {spec.palletization.palletsPer20ft} {isHebrew ? "משטחים" : "pallets"}
                        </span>
                      </div>
                      <div className="text-base font-black text-white font-mono">
                        {spec.palletization.unitsPer20ft.toLocaleString()}{" "}
                        <span className="text-xs font-normal text-slate-400">
                          {isHebrew ? "יחידות נטו" : "units"}
                        </span>
                      </div>
                    </div>

                    <div className="bg-slate-900/90 p-3 rounded-xl border border-orange-500/30 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-orange-400 text-xs">
                          {isHebrew ? "מכולת 40ft High Cube ⭐" : "40ft High Cube ⭐"}
                        </span>
                        <span className="text-[10px] text-orange-400/80 font-mono">
                          {spec.palletization.palletsPer40ftHC} {isHebrew ? "משטחים" : "pallets"}
                        </span>
                      </div>
                      <div className="text-base font-black text-white font-mono">
                        {spec.palletization.unitsPer40ftHC.toLocaleString()}{" "}
                        <span className="text-xs font-normal text-slate-400">
                          {isHebrew ? "יחידות נטו" : "units"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Storage & Shelf Life */}
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span>
                    🌡️ {isHebrew ? "משטר טמפרטורה:" : "Temperature:"} <strong className="text-slate-200">{spec.temperatureRegimeHe}</strong> ({spec.temperatureRange})
                  </span>
                  <span>
                    ⏳ {isHebrew ? "חיי מדף:" : "Shelf Life:"} <strong className="text-slate-200">{spec.shelfLifeMonths} {isHebrew ? "חודשים" : "months"}</strong>
                  </span>
                </div>
              </div>
            ) : (
              /* TAB 2: SI 1145 Label & Nutrients */
              <div className="space-y-4 text-xs">
                {/* Israeli Red Badges Status Banner */}
                <div
                  className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
                    spec.nutrition.isCleanLabel
                      ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
                      : "bg-slate-950 border-slate-800 text-slate-300"
                  }`}
                >
                  <div>
                    <span className="font-bold block text-sm">
                      {spec.nutrition.isCleanLabel
                        ? isHebrew
                          ? "✓ תווית נקייה (Clean Label) — ללא סימונים אדומים!"
                          : "✓ Clean Label — Zero Red Warning Badges!"
                        : isHebrew
                        ? "סימונים תזונתיים לפי תקנות הגנת בריאות הציבור:"
                        : "Mandatory Front-of-Package Badges:"}
                    </span>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {isHebrew
                        ? "עומד בדרישות תקן ת״י 1145 לסימון מזון ארוז מראש בישראל."
                        : "Tested per Israeli Ministry of Health & SI 1145 standards."}
                    </p>
                  </div>

                  {/* Red Circles Display */}
                  <div className="flex items-center gap-1.5 shrink-0" dir="ltr">
                    {spec.nutrition.hasRedSugar && (
                      <span
                        className="w-8 h-8 rounded-full bg-rose-600 text-white font-black flex items-center justify-center text-[10px] shadow-md"
                        title="סוכר ברמה גבוהה"
                      >
                        סוכר
                      </span>
                    )}
                    {spec.nutrition.hasRedSodium && (
                      <span
                        className="w-8 h-8 rounded-full bg-rose-600 text-white font-black flex items-center justify-center text-[10px] shadow-md"
                        title="נתרן ברמה גבוהה"
                      >
                        נתרן
                      </span>
                    )}
                    {spec.nutrition.hasRedFat && (
                      <span
                        className="w-8 h-8 rounded-full bg-rose-600 text-white font-black flex items-center justify-center text-[10px] shadow-md"
                        title="שומן רווי ברמה גבוהה"
                      >
                        שומן
                      </span>
                    )}
                    {spec.nutrition.isCleanLabel && (
                      <span className="text-2xl">🌿</span>
                    )}
                  </div>
                </div>

                {/* Nutrition Facts Table per 100g */}
                <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
                  <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between font-bold text-slate-200">
                    <span>{isHebrew ? "טבלת סימון תזונתי" : "Nutrition Facts Panel"}</span>
                    <span className="text-[11px] font-normal text-slate-400 font-mono">
                      {isHebrew ? "ל-100 גרם / מ״ל מוצר" : "Per 100g / 100ml"}
                    </span>
                  </div>

                  <div className="divide-y divide-slate-800/80 text-xs">
                    <div className="px-4 py-2 flex items-center justify-between">
                      <span className="text-slate-400">{isHebrew ? "אנרגיה (קלוריות):" : "Energy (Calories):"}</span>
                      <span className="font-mono font-bold text-white">{spec.nutrition.energyKcal} kcal</span>
                    </div>

                    <div className="px-4 py-2 flex items-center justify-between">
                      <span className="text-slate-400">{isHebrew ? "סך השומנים (גרם):" : "Total Fat (g):"}</span>
                      <span className="font-mono font-bold text-white">{spec.nutrition.totalFatG} g</span>
                    </div>

                    <div className="px-4 py-2 flex items-center justify-between ps-8 text-slate-400">
                      <span>{isHebrew ? "מתוכם חומצות שומן רוויות (גרם):" : "Of which Saturated Fat (g):"}</span>
                      <span className="font-mono font-semibold text-slate-200">{spec.nutrition.saturatedFatG} g</span>
                    </div>

                    <div className="px-4 py-2 flex items-center justify-between">
                      <span className="text-slate-400">{isHebrew ? "פחמימות (גרם):" : "Carbohydrates (g):"}</span>
                      <span className="font-mono font-bold text-white">{spec.nutrition.carbohydratesG} g</span>
                    </div>

                    <div className="px-4 py-2 flex items-center justify-between ps-8 text-slate-400">
                      <span>{isHebrew ? "מתוכן סוכרים (גרם):" : "Of which Sugars (g):"}</span>
                      <span className="font-mono font-semibold text-slate-200">{spec.nutrition.sugarsG} g</span>
                    </div>

                    <div className="px-4 py-2 flex items-center justify-between">
                      <span className="text-slate-400">{isHebrew ? "חלבונים (גרם):" : "Protein (g):"}</span>
                      <span className="font-mono font-bold text-white">{spec.nutrition.proteinG} g</span>
                    </div>

                    <div className="px-4 py-2 flex items-center justify-between">
                      <span className="text-slate-400">{isHebrew ? "נתרן (מ״ג):" : "Sodium (mg):"}</span>
                      <span className="font-mono font-bold text-white">{spec.nutrition.sodiumMg} mg</span>
                    </div>
                  </div>
                </div>

                {/* Allergen Declaration Box */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                  <span className="font-bold text-slate-200 block text-xs">
                    ⚠️ {isHebrew ? "הצהרת אלרגנים (ת״י 1145):" : "Allergen Declaration:"}
                  </span>
                  <div className="space-y-1 text-[11px] text-slate-400">
                    <p>
                      <strong className="text-slate-300">{isHebrew ? "מכיל:" : "Contains:"} </strong>
                      {isHebrew
                        ? spec.nutrition.allergensContainsHe.join(", ") || "ללא אלרגנים ידועים"
                        : spec.nutrition.allergensContainsEn.join(", ") || "No known allergens"}
                    </p>
                    {spec.nutrition.allergensMayContainHe.length > 0 && (
                      <p>
                        <strong className="text-slate-300">{isHebrew ? "עלול להכיל עקבות:" : "May contain traces of:"} </strong>
                        {isHebrew
                          ? spec.nutrition.allergensMayContainHe.join(", ")
                          : spec.nutrition.allergensMayContainEn.join(", ")}
                      </p>
                    )}
                  </div>
                </div>

                {/* Chief Rabbinate Kosher Declaration */}
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                  <span className="font-bold text-emerald-400 block">
                    ✡️ {isHebrew ? "אישור כשרות הרבנות הראשית לישראל:" : "Kosher Authorization:"}
                  </span>
                  <p className="font-mono text-slate-300">
                    {isHebrew
                      ? `כשר פרווה / מהדרין בהשגחת גוף הכשרות המפקח באירופה ובאישור מחלקת היבוא של הרבנות הראשית לישראל.`
                      : `Kosher Parve / Mehadrin authorized by European certifying agency and Chief Rabbinate of Israel.`}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
