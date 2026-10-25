"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  parseSpecSheetAction,
  saveExtractedSpecToCatalogAction,
} from "@/app/admin/tools/spec-extractor/actions";
import {
  PRESET_SPEC_SHEETS,
  generatePriorityErpItemMasterCsv,
  type ExtractedTechnicalSpec,
} from "@/lib/compliance/specSheetExtractor";

interface Props {
  initialLang?: "he" | "en";
}

export default function SpecExtractorClient({ initialLang = "en" }: Props) {
  const [selectedPresetId, setSelectedPresetId] = useState<string>("granoro-penne-500g");
  const [rawText, setRawText] = useState<string>(
    PRESET_SPEC_SHEETS["granoro-penne-500g"].rawSampleText
  );
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [spec, setSpec] = useState<ExtractedTechnicalSpec>(
    PRESET_SPEC_SHEETS["granoro-penne-500g"].spec
  );
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [isTextEditorOpen, setIsTextEditorOpen] = useState<boolean>(false);

  // Switch Preset
  const handleSelectPreset = async (presetId: string) => {
    setSelectedPresetId(presetId);
    setSaveSuccessMsg(null);
    const preset = PRESET_SPEC_SHEETS[presetId];
    if (preset) {
      setRawText(preset.rawSampleText);
      setIsExtracting(true);
      const res = await parseSpecSheetAction({ presetId });
      setIsExtracting(false);
      if (res.ok && res.spec) {
        setSpec(res.spec);
      }
    }
  };

  // Run Extraction on custom raw text
  const handleRunExtraction = async () => {
    setIsExtracting(true);
    setSaveSuccessMsg(null);
    const res = await parseSpecSheetAction({ rawText });
    setIsExtracting(false);
    if (res.ok && res.spec) {
      setSpec(res.spec);
    }
  };

  // Handle File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (text) {
        setRawText(text);
        setIsTextEditorOpen(true);
        setIsExtracting(true);
        const res = await parseSpecSheetAction({ rawText: text });
        setIsExtracting(false);
        if (res.ok && res.spec) {
          setSpec(res.spec);
        }
      }
    };
    reader.readAsText(file);
  };

  // Copy Hebrew Label Text
  const handleCopyHebrewLabel = () => {
    const text = [
      `${spec.hebrewProductTitle} (${spec.unitNetWeightG} גרם)`,
      `רכיבים: ${spec.hebrewIngredients.join(", ")}.`,
      spec.allergensContainsHe.length > 0 ? `מידע על אלרגנים: מכיל ${spec.allergensContainsHe.join(", ")}.` : "",
      spec.allergensMayContainHe.length > 0 ? `עלול להכיל: ${spec.allergensMayContainHe.join(", ")}.` : "",
      `ערכים תזונתיים ל-100 גרם: אנרגיה: ${spec.nutritionPer100g.energyKcal} קלוריות, שומנים: ${spec.nutritionPer100g.totalFatG} גרם (מתוכם שומן רווי: ${spec.nutritionPer100g.saturatedFatG} גרם), נתרן: ${spec.nutritionPer100g.sodiumMg} מ״ג, פחמימות: ${spec.nutritionPer100g.carbohydratesG} גרם (מתוכן סוכרים: ${spec.nutritionPer100g.sugarsG} גרם), חלבונים: ${spec.nutritionPer100g.proteinG} גרם.`,
      spec.storageInstructionsHe,
      spec.importerDeclarationHe,
      `ארץ יצור: ${spec.countryOfOrigin}.`,
      spec.kosherStandardHe,
    ].filter(Boolean).join("\n\n");

    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  // Download Priority ERP CSV
  const handleDownloadErpCsv = () => {
    const csv = generatePriorityErpItemMasterCsv(spec);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Priority_ERP_Item_${spec.sku || "SPEC"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Trigger Native Print Dialog for Thermal Label
  const handlePrintLabel = () => {
    window.print();
  };

  // Save Extracted Spec to Catalog
  const handleSaveToCatalog = async () => {
    setIsSaving(true);
    setSaveSuccessMsg(null);
    const res = await saveExtractedSpecToCatalogAction(spec);
    setIsSaving(false);
    if (res.ok) {
      setSaveSuccessMsg(res.message || "Product successfully saved to FDX catalog!");
    } else {
      alert(`Save error: ${res.error}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🔬</span>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              AI Technical Spec Sheet Extractor (*Scheda Tecnica* to SI 1145)
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              MOH Israel SI 1145 Verified
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Upload European technical specification sheets (*scheda tecnica* in Italian, Spanish, French, or German) to instantly extract physicochemical specs and generate certified Israeli Standard SI 1145 Hebrew food packaging labels.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/supplier/onboarding"
            className="px-3.5 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition flex items-center gap-1.5"
          >
            <span>🏭</span>
            <span>Supplier Onboarding</span>
          </Link>
          <Link
            href="/admin/deals"
            className="px-3.5 py-1.5 text-xs font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition flex items-center gap-1.5 shadow-sm"
          >
            <span>📑</span>
            <span>Commercial Deals</span>
          </Link>
        </div>
      </div>

      {/* QUICK PRESETS & INPUT WORKBENCH */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <span>⚡</span>
            <span>Select European Factory Spec Sheet or Upload Document</span>
          </label>
          <span className="text-[11px] text-slate-500">Supports .PDF, .TXT, .PNG, .DOCX</span>
        </div>

        {/* Preset Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
          {Object.values(PRESET_SPEC_SHEETS).map((preset) => {
            const isSelected = selectedPresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPreset(preset.id)}
                className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 ${
                  isSelected
                    ? "bg-orange-500/15 border-orange-500 text-white shadow-xs font-medium"
                    : "bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/60"
                }`}
              >
                <span className="text-2xl shrink-0">{preset.flag}</span>
                <div className="space-y-0.5 truncate">
                  <p className="font-semibold text-white truncate">{preset.title}</p>
                  <p className="text-[11px] text-slate-400 truncate">{preset.subtitle}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Dropzone & Collapsible Text Input */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <label className="w-full sm:w-auto px-4 py-2.5 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-medium transition cursor-pointer flex items-center justify-center gap-2">
            <span>📄</span>
            <span>Upload Technical PDF / File</span>
            <input
              type="file"
              accept=".pdf,.txt,.docx,.png,.jpg,.jpeg"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          <button
            type="button"
            onClick={() => setIsTextEditorOpen(!isTextEditorOpen)}
            className="w-full sm:w-auto px-4 py-2.5 bg-slate-800/80 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-medium border border-slate-700 transition flex items-center justify-center gap-1.5"
          >
            <span>📝</span>
            <span>{isTextEditorOpen ? "Hide Raw Text Editor" : "Paste / Edit Raw Spec Sheet Text"}</span>
          </button>

          <button
            type="button"
            onClick={handleRunExtraction}
            disabled={isExtracting}
            className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold rounded-xl text-xs shadow-md shadow-orange-500/20 transition flex items-center justify-center gap-2 ml-auto disabled:opacity-50"
          >
            <span>{isExtracting ? "⏳" : "⚡"}</span>
            <span>{isExtracting ? "Extracting & Translating..." : "Run AI Extraction"}</span>
          </button>
        </div>

        {/* Collapsible Raw Text Editor */}
        {isTextEditorOpen && (
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <textarea
              rows={8}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste raw technical spec sheet text (Italian, Spanish, French, German, or English)..."
              className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 font-mono text-xs focus:outline-hidden focus:border-orange-500"
            />
          </div>
        )}
      </div>

      {/* SPLIT-SCREEN WORKBENCH */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ================= LEFT COLUMN: EUROPEAN FACTORY SPECIFICATION (5 Cols) ================= */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
            {/* Header Card */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950/60 border border-cyan-800/40 px-2 py-0.5 rounded-md uppercase">
                  European Source Dossier ({spec.originalLanguage.toUpperCase()})
                </span>
                <h3 className="text-sm font-bold text-white mt-1.5">{spec.documentTitle}</h3>
                <p className="text-xs text-slate-400">{spec.manufacturerName}</p>
                <p className="text-[11px] text-slate-500">{spec.manufacturerAddress}</p>
              </div>
              <span className="text-2xl">{spec.countryFlag}</span>
            </div>

            {/* Core Identification Barcodes */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80">
                <span className="text-[10px] text-slate-500 block">EAN-13 Barcode</span>
                <span className="font-mono font-bold text-white text-xs">{spec.ean13}</span>
              </div>
              <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80">
                <span className="text-[10px] text-slate-500 block">Customs HS / TARIC</span>
                <span className="font-mono font-bold text-amber-400 text-xs">{spec.hsCode}</span>
              </div>
              <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80">
                <span className="text-[10px] text-slate-500 block">Net Weight Unit</span>
                <span className="font-semibold text-white text-xs">{spec.unitNetWeightG}g {spec.drainedWeightG ? `(מסונן: ${spec.drainedWeightG}g)` : ""}</span>
              </div>
              <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80">
                <span className="text-[10px] text-slate-500 block">Shelf Life (TMC)</span>
                <span className="font-semibold text-emerald-400 text-xs">{spec.shelfLifeMonths} Months</span>
              </div>
            </div>

            {/* Original Ingredients & Allergens */}
            <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-2xl space-y-2 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Original Ingredients (*Ingredienti*)
              </span>
              <p className="text-slate-300 italic text-[11px] leading-relaxed">
                "{spec.originalIngredients}"
              </p>
              <div className="pt-1 flex flex-wrap gap-1 text-[10px]">
                {spec.allergensContainsEn.map((all, i) => (
                  <span key={i} className="bg-rose-950/60 text-rose-300 border border-rose-800/50 px-2 py-0.5 rounded-md font-semibold">
                    Contains: {all}
                  </span>
                ))}
                {spec.allergensMayContainEn.map((all, i) => (
                  <span key={i} className="bg-amber-950/60 text-amber-300 border border-amber-800/50 px-2 py-0.5 rounded-md">
                    May Contain: {all}
                  </span>
                ))}
              </div>
            </div>

            {/* Physicochemical & Lab Parameters */}
            <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-2xl space-y-2 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Physicochemical QA Parameters
              </span>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                {spec.qualityParams.moisturePercent && (
                  <div className="flex justify-between border-b border-slate-800/60 pb-1">
                    <span className="text-slate-400">Moisture:</span>
                    <span className="text-white font-mono font-semibold">{spec.qualityParams.moisturePercent}%</span>
                  </div>
                )}
                {spec.qualityParams.acidityPercent && (
                  <div className="flex justify-between border-b border-slate-800/60 pb-1">
                    <span className="text-slate-400">Acidity (Oleic):</span>
                    <span className="text-white font-mono font-semibold">{spec.qualityParams.acidityPercent}%</span>
                  </div>
                )}
                {spec.qualityParams.peroxideValue && (
                  <div className="flex justify-between border-b border-slate-800/60 pb-1">
                    <span className="text-slate-400">Peroxides:</span>
                    <span className="text-white font-mono font-semibold">{spec.qualityParams.peroxideValue} meq/kg</span>
                  </div>
                )}
                {spec.qualityParams.brix && (
                  <div className="flex justify-between border-b border-slate-800/60 pb-1">
                    <span className="text-slate-400">Brix:</span>
                    <span className="text-white font-mono font-semibold">{spec.qualityParams.brix}°</span>
                  </div>
                )}
                {spec.qualityParams.ph && (
                  <div className="flex justify-between border-b border-slate-800/60 pb-1">
                    <span className="text-slate-400">pH Level:</span>
                    <span className="text-white font-mono font-semibold">{spec.qualityParams.ph}</span>
                  </div>
                )}
                {spec.qualityParams.ashPercent && (
                  <div className="flex justify-between border-b border-slate-800/60 pb-1">
                    <span className="text-slate-400">Ash (Ceneri):</span>
                    <span className="text-white font-mono font-semibold">{spec.qualityParams.ashPercent}%</span>
                  </div>
                )}
              </div>
            </div>

            {/* Logistics & Palletization (Ti x Hi) */}
            <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-2xl space-y-2 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Logistics & Palletization (Ti × Hi)
              </span>
              <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Cartons/Layer</span>
                  <span className="text-white font-bold text-sm">{spec.logistics.cartonsPerLayer} (Ti)</span>
                </div>
                <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Layers/Pallet</span>
                  <span className="text-white font-bold text-sm">{spec.logistics.layersPerPallet} (Hi)</span>
                </div>
                <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Total Pallet Units</span>
                  <span className="text-cyan-400 font-bold text-sm">{spec.logistics.totalUnitsPerPallet}</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 text-center pt-1">
                Standard {spec.logistics.palletType} · Pallet Gross Weight: <strong>{spec.logistics.palletGrossWeightKg} kg</strong>
              </p>
            </div>
          </div>
        </div>

        {/* ================= RIGHT COLUMN: ISRAELI SI 1145 COMPLIANT HEBREW LABEL (7 Cols) ================= */}
        <div className="lg:col-span-7 space-y-4">
          {/* Action Ribbon */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/70 p-3 rounded-2xl border border-slate-800">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>🏷️</span>
              <span>Israeli Standard SI 1145 Food Label Sticker</span>
            </span>

            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={handleCopyHebrewLabel}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition flex items-center gap-1"
                title="Copy full Hebrew text to clipboard"
              >
                <span>📋</span>
                <span>{isCopied ? "Copied!" : "Copy Text"}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadErpCsv}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded-xl transition flex items-center gap-1"
                title="Download Priority ERP Inbound Item Master CSV"
              >
                <span>📥</span>
                <span>Priority ERP CSV</span>
              </button>

              <button
                type="button"
                onClick={handlePrintLabel}
                className="px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition flex items-center gap-1 shadow-sm"
              >
                <span>🖨️</span>
                <span>Print Sticker</span>
              </button>
            </div>
          </div>

          {/* PHYSICAL THERMAL STICKER MOCKUP (White background, Black Border, Hebrew RTL) */}
          <div
            id="printable-label"
            dir="rtl"
            className="bg-white text-black border-4 border-black rounded-2xl p-6 sm:p-7 shadow-2xl font-sans text-xs leading-normal space-y-4 select-text"
          >
            {/* Red Warning Badges Header (If triggered per Israeli Food Regulations) */}
            {(spec.redBadges.highSodium || spec.redBadges.highSugar || spec.redBadges.highSaturatedFat) && (
              <div className="flex items-center justify-center gap-3 border-2 border-red-600 bg-red-50 p-2.5 rounded-xl">
                {spec.redBadges.highSaturatedFat && (
                  <div className="flex flex-col items-center text-center">
                    <div className="w-14 h-14 rounded-full bg-red-600 text-white flex flex-col items-center justify-center p-1 font-bold shadow-sm">
                      <span className="text-[14px]">🧈</span>
                      <span className="text-[8px] leading-tight">שומן רווי</span>
                    </div>
                    <span className="text-[9px] font-extrabold text-red-700 mt-1">בכמות גבוהה</span>
                  </div>
                )}

                {spec.redBadges.highSugar && (
                  <div className="flex flex-col items-center text-center">
                    <div className="w-14 h-14 rounded-full bg-red-600 text-white flex flex-col items-center justify-center p-1 font-bold shadow-sm">
                      <span className="text-[14px]">🍬</span>
                      <span className="text-[8px] leading-tight">סוכר</span>
                    </div>
                    <span className="text-[9px] font-extrabold text-red-700 mt-1">בכמות גבוהה</span>
                  </div>
                )}

                {spec.redBadges.highSodium && (
                  <div className="flex flex-col items-center text-center">
                    <div className="w-14 h-14 rounded-full bg-red-600 text-white flex flex-col items-center justify-center p-1 font-bold shadow-sm">
                      <span className="text-[14px]">🧂</span>
                      <span className="text-[8px] leading-tight">נתרן</span>
                    </div>
                    <span className="text-[9px] font-extrabold text-red-700 mt-1">בכמות גבוהה</span>
                  </div>
                )}
              </div>
            )}

            {/* Hebrew Product Title & Net Weight */}
            <div className="text-center border-b-2 border-black pb-3 space-y-1">
              <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-black">
                {spec.hebrewProductTitle}
              </h2>
              <p className="text-sm font-bold text-gray-800">
                משקל נקי: {spec.unitNetWeightG} גרם {spec.drainedWeightG ? `| משקל מסונן: ${spec.drainedWeightG} גרם` : ""}
              </p>
            </div>

            {/* Ingredients Section */}
            <div className="space-y-1">
              <p className="text-[12px] font-bold">רכיבים:</p>
              <p className="text-[11px] leading-relaxed text-gray-900">
                {spec.hebrewIngredients.join(", ")}.
              </p>
            </div>

            {/* Mandatory Allergen Information Box */}
            <div className="border border-black bg-gray-50 p-2 rounded-lg text-[11px] space-y-0.5">
              <p className="font-bold">
                מידע על אלרגנים:{" "}
                <span className="font-extrabold">
                  {spec.allergensContainsHe.length > 0
                    ? `מכיל ${spec.allergensContainsHe.join(", ")}.`
                    : "אינו מכיל אלרגנים ידועים."}
                </span>
              </p>
              {spec.allergensMayContainHe.length > 0 && (
                <p className="text-gray-700">
                  עלול להכיל: {spec.allergensMayContainHe.join(", ")}.
                </p>
              )}
            </div>

            {/* Israeli Mandatory Nutrition Facts Table (100g) */}
            <div className="space-y-1">
              <p className="text-[11px] font-bold text-center">טבלת סימון תזונתי ל-100 גרם מוצר:</p>
              <table className="w-full text-[10px] border-collapse border border-black">
                <tbody>
                  <tr className="border-b border-black bg-gray-100 font-bold">
                    <td className="p-1 border-l border-black">אנרגיה (קלוריות)</td>
                    <td className="p-1 font-mono text-left">{spec.nutritionPer100g.energyKcal}</td>
                  </tr>
                  <tr className="border-b border-gray-400">
                    <td className="p-1 border-l border-black">סך השומנים (גרם)</td>
                    <td className="p-1 font-mono text-left">{spec.nutritionPer100g.totalFatG}</td>
                  </tr>
                  <tr className="border-b border-gray-400">
                    <td className="p-1 border-l border-black pr-3">מתוכם: חומצות שומן רוויות (גרם)</td>
                    <td className="p-1 font-mono text-left">{spec.nutritionPer100g.saturatedFatG}</td>
                  </tr>
                  <tr className="border-b border-gray-400">
                    <td className="p-1 border-l border-black pr-3">חומצות שומן טראנס (גרם)</td>
                    <td className="p-1 font-mono text-left">פחות מ-0.5</td>
                  </tr>
                  <tr className="border-b border-gray-400">
                    <td className="p-1 border-l border-black pr-3">כולסטרול (מ״ג)</td>
                    <td className="p-1 font-mono text-left">{spec.nutritionPer100g.cholesterolMg}</td>
                  </tr>
                  <tr className="border-b border-black font-semibold">
                    <td className="p-1 border-l border-black">נתרן (מ״ג)</td>
                    <td className="p-1 font-mono text-left">{spec.nutritionPer100g.sodiumMg}</td>
                  </tr>
                  <tr className="border-b border-gray-400">
                    <td className="p-1 border-l border-black">סך הפחמימות (גרם)</td>
                    <td className="p-1 font-mono text-left">{spec.nutritionPer100g.carbohydratesG}</td>
                  </tr>
                  <tr className="border-b border-gray-400">
                    <td className="p-1 border-l border-black pr-3">מתוכן: סוכרים (גרם)</td>
                    <td className="p-1 font-mono text-left">{spec.nutritionPer100g.sugarsG}</td>
                  </tr>
                  <tr className="border-b border-gray-400">
                    <td className="p-1 border-l border-black">סיבים תזונתיים (גרם)</td>
                    <td className="p-1 font-mono text-left">{spec.nutritionPer100g.dietaryFiberG}</td>
                  </tr>
                  <tr className="border-b border-black font-semibold">
                    <td className="p-1 border-l border-black">חלבונים (גרם)</td>
                    <td className="p-1 font-mono text-left">{spec.nutritionPer100g.proteinG}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Preparation Instructions if applicable */}
            {spec.preparationInstructionsHe && (
              <div className="text-[10px] text-gray-800 border-t border-gray-300 pt-1.5">
                <span className="font-bold">הוראות הכנה: </span>
                <span>{spec.preparationInstructionsHe}</span>
              </div>
            )}

            {/* Storage Conditions & Shelf Life */}
            <div className="text-[10px] text-gray-800 space-y-0.5 border-t border-gray-300 pt-1.5">
              <p>
                <strong>הוראות אחסון: </strong>
                {spec.storageInstructionsHe}
              </p>
              <p>
                <strong>עדיף להשתמש לפני: </strong>
                מודפס על גבי האריזה (חודש ושנה) | <strong>מספר אצווה: </strong>מודפס על האריזה.
              </p>
            </div>

            {/* Manufacturer & Importer Footnote */}
            <div className="text-[10px] text-gray-700 border-t border-black pt-2 space-y-0.5">
              <p>
                <strong>מיוצר ע״י: </strong>
                {spec.manufacturerName}, {spec.manufacturerAddress}, {spec.countryOfOrigin}.
              </p>
              <p>
                <strong>מיובא ומשווק ע״י: </strong>
                {spec.importerDeclarationHe}
              </p>
            </div>

            {/* Kosher Declaration Badge */}
            <div className="border border-black bg-gray-100 p-2 rounded-lg text-center font-bold text-[11px] text-black">
              ✡️ {spec.kosherStandardHe}
            </div>
          </div>

          {/* Catalog Save Banner */}
          <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <div>
              <p className="text-xs font-semibold text-white">Save Verified Product to FoodXchange Catalog</p>
              <p className="text-[11px] text-slate-400">
                Enables this SKU for Israeli supermarket RFQs and Tasting Sample Desk matching.
              </p>
              {saveSuccessMsg && (
                <p className="text-xs text-emerald-400 font-medium mt-1">✓ {saveSuccessMsg}</p>
              )}
            </div>
            <button
              type="button"
              onClick={handleSaveToCatalog}
              disabled={isSaving}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs transition disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save to FDX Catalog 💾"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
