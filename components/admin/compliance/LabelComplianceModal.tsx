"use client";

import { useState } from "react";
import {
  SAMPLE_ARTWORK_PRESETS,
  type LabelComplianceReport,
  type NutritionPer100,
} from "@/lib/compliance/labelComplianceEngine";

interface Props {
  deal: {
    id: string;
    company_name: string;
    product_name: string;
    buyer_company?: string | null;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function LabelComplianceModal({
  deal,
  isOpen,
  onClose,
  onSuccess,
}: Props) {
  if (!isOpen) return null;

  return (
    <LabelComplianceModalInner
      deal={deal}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}

function LabelComplianceModalInner({
  deal,
  onClose,
  onSuccess,
}: {
  deal: Props["deal"];
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const [selectedPreset, setSelectedPreset] = useState<string>("canned-tomatoes");
  const [activeTab, setActiveTab] = useState<"preset" | "custom">("preset");
  const [isLiquid, setIsLiquid] = useState(false);
  const [productNameHebrew, setProductNameHebrew] = useState("שמן זית כתית מעולה חומציות מרבית 0.5%");
  const [importerText, setImporterText] = useState("מיובא ע״י: פודאקסצ'יינג' בע״מ, רח' המלאכה 14 תל אביב, ח.פ 516492810");
  const [kosherText, setKosherText] = useState("כשר פרווה בהשגחת בד״ץ מדריד ובאישור הרבנות הראשית לישראל");
  const [allergensText, setAllergensText] = useState("אינו מכיל אלרגנים");
  const [ingredientsText, setIngredientsText] = useState("רכיבים: 100% שמן זית בכבישה קרה.");

  const [nutrition, setNutrition] = useState<NutritionPer100>({
    calories: 824,
    totalFat: 91.6,
    saturatedFat: 13.0,
    transFat: 0.0,
    sodium: 2,
    totalCarbs: 0.0,
    sugars: 0.0,
    protein: 0.0,
  });

  const [report, setReport] = useState<LabelComplianceReport>(
    SAMPLE_ARTWORK_PRESETS["canned-tomatoes"].report
  );
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  // Switch preset
  function handleSelectPreset(key: string) {
    setSelectedPreset(key);
    if (SAMPLE_ARTWORK_PRESETS[key]) {
      setReport(SAMPLE_ARTWORK_PRESETS[key].report);
    }
  }

  // Run custom compliance audit
  async function handleRunAudit() {
    setLoading(true);
    setSaveSuccess(false);

    try {
      const res = await fetch("/api/admin/compliance/analyze-label", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          activeTab === "preset"
            ? {
                presetKey: selectedPreset,
                dealId: deal?.id,
              }
            : {
                productName: deal?.product_name || "Custom Food Product",
                category: "Imported Food",
                isLiquid,
                nutrition,
                hebrewTextFound: {
                  productNameHebrew,
                  importerHebrew: importerText,
                  kosherHebrew: kosherText,
                  allergensHebrew: allergensText,
                  ingredientsHebrew: ingredientsText,
                },
                dealId: deal?.id,
              }
        ),
      });

      const data = await res.json().catch(() => null);
      if (res.ok && data?.report) {
        setReport(data.report);
        if (deal?.id) setSaveSuccess(true);
        if (onSuccess) onSuccess();
      }
    } finally {
      setLoading(false);
    }
  }

  function copyDesignerNotes() {
    const text = report.correctionsForDesigner.join("\n• ");
    navigator.clipboard.writeText(`Israeli Label Compliance Audit Notes (${report.productNameHebrew}):\n• ${text}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-4xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col text-slate-100">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold text-xl border border-orange-500/30">
              🏷️
            </span>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  SI 1145 &amp; Red Badge Law
                </span>
                {deal && (
                  <span className="text-xs text-slate-400 font-medium">
                    Deal: {deal.product_name} ({deal.company_name})
                  </span>
                )}
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Israeli Supermarket Packaging &amp; Label Compliance
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between gap-3 flex-wrap shrink-0">
          <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab("preset")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === "preset"
                  ? "bg-orange-500 text-white shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span>⚡ Fast Presets (4)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("custom")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === "custom"
                  ? "bg-orange-500 text-white shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span>✏️ Custom Label Parameters</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRunAudit}
              disabled={loading}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-orange-600 hover:bg-orange-500 text-white transition shadow-lg shadow-orange-600/20 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              <span>{loading ? "Analyzing..." : "🔍 Run Compliance Audit"}</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-6 flex-1">
          {/* Preset Selector */}
          {activeTab === "preset" ? (
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-300">
                Choose a Realistic European Packaging Preset:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                {Object.entries(SAMPLE_ARTWORK_PRESETS).map(([key, item]) => {
                  const isSelected = selectedPreset === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleSelectPreset(key)}
                      className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? "bg-orange-500/15 border-orange-500 text-white ring-1 ring-orange-500/30"
                          : "bg-slate-800/60 border-slate-700/80 text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      <div>
                        <div className="text-[10px] font-bold text-orange-400 uppercase tracking-wider mb-1">
                          {item.category}
                        </div>
                        <div className="text-xs font-bold text-white line-clamp-2">
                          {item.name}
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Score: {item.report.overallScore}%</span>
                        <span
                          className={`font-extrabold px-1.5 py-0.2 rounded text-[10px] ${
                            item.report.status === "APPROVED"
                              ? "bg-emerald-500/20 text-emerald-300"
                              : item.report.status === "CONDITIONAL_APPROVAL"
                              ? "bg-amber-500/20 text-amber-300"
                              : "bg-red-500/20 text-red-300"
                          }`}
                        >
                          {item.report.status.replace("_", " ")}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Custom Form Controls */
            <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Hebrew Product Denomination (שם המזון בעברית):
                  </label>
                  <input
                    type="text"
                    value={productNameHebrew}
                    onChange={(e) => setProductNameHebrew(e.target.value)}
                    className="w-full text-xs bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Food State Regime:
                  </label>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsLiquid(false)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border ${
                        !isLiquid
                          ? "bg-orange-500 text-white border-orange-500"
                          : "bg-slate-800 text-slate-400 border-slate-700"
                      }`}
                    >
                      Solid Food (per 100g)
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsLiquid(true)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border ${
                        isLiquid
                          ? "bg-orange-500 text-white border-orange-500"
                          : "bg-slate-800 text-slate-400 border-slate-700"
                      }`}
                    >
                      Liquid / Beverage (per 100ml)
                    </button>
                  </div>
                </div>
              </div>

              {/* Nutritional Inputs */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Nutritional Values per 100{isLiquid ? "ml" : "g"} (for Red Badge Calculation):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400">Calories (kcal)</span>
                    <input
                      type="number"
                      value={nutrition.calories}
                      onChange={(e) => setNutrition({ ...nutrition, calories: Number(e.target.value) })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Total Fat (g)</span>
                    <input
                      type="number"
                      step="0.1"
                      value={nutrition.totalFat}
                      onChange={(e) => setNutrition({ ...nutrition, totalFat: Number(e.target.value) })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Saturated Fat (g)</span>
                    <input
                      type="number"
                      step="0.1"
                      value={nutrition.saturatedFat}
                      onChange={(e) => setNutrition({ ...nutrition, saturatedFat: Number(e.target.value) })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Sodium (mg)</span>
                    <input
                      type="number"
                      value={nutrition.sodium}
                      onChange={(e) => setNutrition({ ...nutrition, sodium: Number(e.target.value) })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Sugars (g)</span>
                    <input
                      type="number"
                      step="0.1"
                      value={nutrition.sugars}
                      onChange={(e) => setNutrition({ ...nutrition, sugars: Number(e.target.value) })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Protein (g)</span>
                    <input
                      type="number"
                      step="0.1"
                      value={nutrition.protein}
                      onChange={(e) => setNutrition({ ...nutrition, protein: Number(e.target.value) })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Hebrew Mandatory Texts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400">Ingredients (רכיבים):</span>
                  <input
                    type="text"
                    value={ingredientsText}
                    onChange={(e) => setIngredientsText(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400">Registered Importer (פרטי היבואן):</span>
                  <input
                    type="text"
                    value={importerText}
                    onChange={(e) => setImporterText(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400">Kosher Clause (כשרות ואישור הרה״ר):</span>
                  <input
                    type="text"
                    value={kosherText}
                    onChange={(e) => setKosherText(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400">Allergen Box (מידע על אלרגנים):</span>
                  <input
                    type="text"
                    value={allergensText}
                    onChange={(e) => setAllergensText(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Audit Results Dashboard */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-3xl p-5 space-y-6">
            {/* Top Score Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="flex items-center gap-3">
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl border ${
                    report.overallScore >= 90
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                      : report.overallScore >= 65
                      ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                      : "bg-red-500/20 text-red-400 border-red-500/30"
                  }`}
                >
                  {report.overallScore}%
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-black uppercase px-2 py-0.5 rounded-full ${
                        report.status === "APPROVED"
                          ? "bg-emerald-500 text-slate-950"
                          : report.status === "CONDITIONAL_APPROVAL"
                          ? "bg-amber-400 text-slate-950"
                          : "bg-red-500 text-white"
                      }`}
                    >
                      {report.status.replace("_", " ")}
                    </span>
                    <span className="text-xs text-slate-400">
                      Standard SI 1145 Audit
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white mt-1">
                    {report.productNameHebrew}
                  </h3>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={copyDesignerNotes}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer flex items-center gap-1.5"
                >
                  <span>{copied ? "✓ Copied" : "📋 Copy Designer Notes"}</span>
                </button>
              </div>
            </div>

            {/* Front-of-Package Red Badges Evaluation */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300 uppercase tracking-wider">
                <span>Front-of-Package Red Warning Badges (סימון תזונתי אדום):</span>
                <span className="text-slate-400 font-normal">
                  Thresholds: Sodium &ge;{report.redLabels.thresholds.sodium}mg, Sugar &ge;{report.redLabels.thresholds.sugar}g, Sat Fat &ge;{report.redLabels.thresholds.saturatedFat}g
                </span>
              </div>

              {report.redLabels.count === 0 ? (
                <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex items-center gap-3 text-xs text-emerald-300">
                  <span className="text-2xl">🌱</span>
                  <div>
                    <div className="font-bold text-emerald-200">
                      Clean Front Label (0 Red Circles Required)
                    </div>
                    <div className="text-emerald-400 text-[11px]">
                      Nutritional values are strictly under all Israeli warning limits. Product qualifies for clean supermarket display without warning marks.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-red-950/30 border border-red-500/30 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-red-300">
                    <span className="text-xl">⚠️</span>
                    <span>
                      {report.redLabels.count} Mandatory Red Warning Circle{report.redLabels.count === 1 ? "" : "s"} Required on Front Artwork:
                    </span>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Sodium Red Circle */}
                    {report.redLabels.highSodium && (
                      <div className="w-24 h-24 rounded-full bg-red-600 text-white flex flex-col items-center justify-center p-2 text-center shadow-lg border-2 border-white/80 shrink-0">
                        <span className="text-base font-black">🧂</span>
                        <span className="text-[10px] font-black leading-tight mt-0.5">נתרן</span>
                        <span className="text-[9px] font-extrabold leading-tight">ברמה גבוהה</span>
                      </div>
                    )}

                    {/* Sugar Red Circle */}
                    {report.redLabels.highSugar && (
                      <div className="w-24 h-24 rounded-full bg-red-600 text-white flex flex-col items-center justify-center p-2 text-center shadow-lg border-2 border-white/80 shrink-0">
                        <span className="text-base font-black">🥄</span>
                        <span className="text-[10px] font-black leading-tight mt-0.5">סוכר</span>
                        <span className="text-[9px] font-extrabold leading-tight">ברמה גבוהה</span>
                      </div>
                    )}

                    {/* Saturated Fat Red Circle */}
                    {report.redLabels.highSaturatedFat && (
                      <div className="w-24 h-24 rounded-full bg-red-600 text-white flex flex-col items-center justify-center p-2 text-center shadow-lg border-2 border-white/80 shrink-0">
                        <span className="text-base font-black">❤️</span>
                        <span className="text-[10px] font-black leading-tight mt-0.5">שומן רווי</span>
                        <span className="text-[9px] font-extrabold leading-tight">ברמה גבוהה</span>
                      </div>
                    )}

                    <div className="text-xs text-red-200 leading-relaxed max-w-md">
                      <p className="font-semibold">
                        Israeli Public Health Food Regulations:
                      </p>
                      <p className="text-[11px] text-red-300/90 mt-0.5">
                        These symbols must be positioned together on the upper-right quadrant of the front-of-package artwork. Minimum diameter: 15mm.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Checklist of SI 1145 Mandates */}
            <div className="space-y-2.5">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Regulatory Checklist Items ({report.checks.length}):
              </div>

              <div className="space-y-2 text-xs">
                {report.checks.map((chk) => (
                  <div
                    key={chk.id}
                    className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-start justify-between gap-3"
                  >
                    <div className="flex items-start gap-2.5">
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center font-black text-xs shrink-0 mt-0.5 ${
                          chk.status === "pass"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : chk.status === "warn"
                            ? "bg-amber-500/20 text-amber-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {chk.status === "pass" ? "✓" : chk.status === "warn" ? "!" : "✕"}
                      </span>
                      <div>
                        <div className="font-bold text-white flex items-center gap-2">
                          <span>{chk.label}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                            {chk.category}
                          </span>
                        </div>
                        {chk.foundText && (
                          <div className="text-slate-300 text-[11px] mt-0.5">
                            <span className="text-slate-500">Found: </span>
                            {chk.foundText}
                          </div>
                        )}
                        {chk.recommendation && (
                          <div className="text-amber-400 text-[11px] font-medium mt-1">
                            👉 {chk.recommendation}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Designer Correction Action Items */}
            <div className="p-4 rounded-2xl bg-orange-950/20 border border-orange-500/30 space-y-2">
              <div className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>🎨</span>
                <span>Action Items for European Factory Designer:</span>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-200">
                {report.correctionsForDesigner.map((note, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-orange-400 font-bold shrink-0">{idx + 1}.</span>
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>

            {saveSuccess && (
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2">
                <span>✓</span>
                <span>Audit saved to deal breakdown &amp; message thread dispatched!</span>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-400">
            Validated against Israeli Food Labeling Standard SI 1145 (2026 Edition)
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition cursor-pointer"
          >
            Close Reviewer
          </button>
        </div>
      </div>
    </div>
  );
}
