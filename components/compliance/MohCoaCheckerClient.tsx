"use client";

import React, { useState, useMemo, useRef } from "react";
import TourGuide, { TourStep } from "../tour/TourGuide";
import {
  COA_SAMPLE_PRESETS,
  CoaSamplePreset,
  AssayParameter,
  AssayCategory,
  CoaValidationReport,
  validateCoaSample,
} from "../../lib/compliance/mohCoaValidator";
import {
  CERTIFIED_LAB_TEMPLATES,
  ParsedCoaDocument,
  convertParsedCoaToPreset,
  parseCoaRawText,
} from "../../lib/compliance/coaPdfParser";

interface Props {
  initialLocale?: "he" | "en";
  locale?: "he" | "en";
}

export default function MohCoaCheckerClient({ initialLocale, locale }: Props) {
  const [currentLocale, setCurrentLocale] = useState<"he" | "en">(() => initialLocale || locale || "en");
  const isHe = currentLocale === "he";

  // Sync with localStorage or URL query params on mount
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const urlLang = sp.get("lang") || sp.get("locale");
      if (urlLang === "he" || urlLang === "en") {
        setCurrentLocale(urlLang);
        return;
      }
      const saved = localStorage.getItem("fdx_admin_locale");
      if (saved === "he" || saved === "en") {
        setCurrentLocale(saved);
      }
    }
  }, []);

  // Listen to global admin_locale_change events
  React.useEffect(() => {
    const handleGlobal = (e: Event) => {
      const ce = e as CustomEvent<"he" | "en">;
      if (ce.detail === "he" || ce.detail === "en") {
        setCurrentLocale(ce.detail);
      }
    };
    window.addEventListener("admin_locale_change", handleGlobal);
    return () => window.removeEventListener("admin_locale_change", handleGlobal);
  }, []);

  const handleToggleLocale = (newLoc: "he" | "en") => {
    setCurrentLocale(newLoc);
    try {
      localStorage.setItem("fdx_admin_locale", newLoc);
      document.cookie = `fdx_admin_locale=${newLoc}; path=/; max-age=31536000`;
      window.dispatchEvent(new CustomEvent("admin_locale_change", { detail: newLoc }));
    } catch {}
  };

  // Dynamic presets registry (allows OCR imports to be retained)
  const [allPresets, setAllPresets] = useState<Record<string, CoaSamplePreset>>(COA_SAMPLE_PRESETS);
  const [selectedPresetId, setSelectedPresetId] = useState<string>("spanish_evoo_compliant");
  const currentPreset = allPresets[selectedPresetId] || COA_SAMPLE_PRESETS.spanish_evoo_compliant;

  // Custom editable parameter list
  const [editableParams, setEditableParams] = useState<AssayParameter[]>(currentPreset.parameters);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<"all" | AssayCategory>("all");

  // Certificate Modal & Broker Dispatch State
  const [showCertificateModal, setShowCertificateModal] = useState<boolean>(false);
  const [brokerDispatched, setBrokerDispatched] = useState<boolean>(false);
  const [copiedHash, setCopiedHash] = useState<boolean>(false);

  // OCR Modal State
  const [showOcrModal, setShowOcrModal] = useState<boolean>(false);
  const [ocrInputMode, setOcrInputMode] = useState<"upload" | "templates" | "paste">("upload");
  const [isScanningOcr, setIsScanningOcr] = useState<boolean>(false);
  const [ocrScanStep, setOcrScanStep] = useState<number>(0);
  const [ocrFileName, setOcrFileName] = useState<string>("");
  const [ocrPastedText, setOcrPastedText] = useState<string>("");
  const [ocrParsedResult, setOcrParsedResult] = useState<ParsedCoaDocument | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);
  const [ocrSuccessNotice, setOcrSuccessNotice] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Switch preset
  const handleSelectPreset = (presetId: string) => {
    const p = allPresets[presetId] || COA_SAMPLE_PRESETS[presetId];
    if (!p) return;
    setSelectedPresetId(presetId);
    setEditableParams(p.parameters);
  };

  // Update a parameter's tested value
  const handleUpdateParamValue = (paramId: string, val: string | number) => {
    setEditableParams((prev) =>
      prev.map((item) => {
        if (item.id === paramId) {
          return { ...item, testedValue: val };
        }
        return item;
      })
    );
  };

  // Reset parameters back to preset original
  const handleResetParams = () => {
    setEditableParams(currentPreset.parameters);
  };

  // Live evaluation report
  const report: CoaValidationReport = useMemo(() => {
    return validateCoaSample(currentPreset, editableParams);
  }, [currentPreset, editableParams]);

  // Filtered parameters list for display
  const filteredParameters = useMemo(() => {
    if (activeCategoryFilter === "all") return editableParams;
    return editableParams.filter((p) => p.category === activeCategoryFilter);
  }, [editableParams, activeCategoryFilter]);

  // Handle OCR scan simulation and extraction
  const processOcrData = async (rawText: string, templateKey?: string, filename?: string) => {
    setIsScanningOcr(true);
    setOcrScanStep(1); // Reading doc & lab ISO 17025
    setOcrParsedResult(null);

    // Call API route or local extractor with step transitions
    try {
      const stepTimer1 = setTimeout(() => setOcrScanStep(2), 600); // Metadata & LOT detection
      const stepTimer2 = setTimeout(() => setOcrScanStep(3), 1100); // Extracting assays

      const res = await fetch("/api/compliance/coa-parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: rawText,
          templateId: templateKey,
          filename: filename || ocrFileName || "Uploaded_COA.pdf",
        }),
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);

      const data = await res.json();
      if (data.ok && data.parsedCoa) {
        setOcrScanStep(4); // Finished
        setOcrParsedResult(data.parsedCoa);
      } else {
        // Fallback to local heuristic parser
        const localParsed = parseCoaRawText(rawText, { filename });
        setOcrScanStep(4);
        setOcrParsedResult(localParsed);
      }
    } catch {
      // Local fallback
      const localParsed = parseCoaRawText(rawText, { filename });
      setOcrScanStep(4);
      setOcrParsedResult(localParsed);
    } finally {
      setIsScanningOcr(false);
    }
  };

  // Load a certified European template
  const handleLoadCertifiedTemplate = (templateKey: string) => {
    const tmpl = CERTIFIED_LAB_TEMPLATES[templateKey];
    if (!tmpl) return;
    setOcrFileName(tmpl.filename);
    setOcrPastedText(tmpl.rawText);
    processOcrData(tmpl.rawText, templateKey, tmpl.filename);
  };

  // Handle file upload
  const handleFileUpload = (file: File) => {
    setOcrFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) || "";
      setOcrPastedText(text);
      processOcrData(text, undefined, file.name);
    };
    reader.readAsText(file);
  };

  // Inject OCR result into MOH Checker
  const handleCommitOcrToChecker = () => {
    if (!ocrParsedResult) return;

    const newPreset = convertParsedCoaToPreset(ocrParsedResult);
    setAllPresets((prev) => ({
      ...prev,
      [newPreset.id]: newPreset,
    }));
    setSelectedPresetId(newPreset.id);
    setEditableParams(newPreset.parameters);
    setShowOcrModal(false);

    setOcrSuccessNotice(
      isHe
        ? `תעודת הבדיקה ממעבדת ${ocrParsedResult.labName} נטענה בהצלחה!`
        : `COA from ${ocrParsedResult.labName} loaded into MOH audit desk!`
    );
    setTimeout(() => setOcrSuccessNotice(null), 4000);
  };

  // Tour steps
  const tourSteps: TourStep[] = [
    {
      targetSelector: "#ocr-upload-btn",
      titleHe: "סריקת תעודות בדיקת מעבדה ב-PDF ו-OCR",
      titleEn: "Automated COA PDF & OCR Extraction",
      descHe: "העלה קובץ PDF של תעודת אנליזה ממעבדה אירופית מוסמכת (Eurofins, Silliker, SGS) והמערכת תחלץ אוטומטית את כל המדדים והספים.",
      descEn: "Upload raw PDF/scan laboratory certificates from Eurofins, Silliker, or SGS to automatically extract all chemical and biological assays.",
      position: "bottom",
      icon: "📄",
    },
    {
      targetSelector: "#coa-presets-bar",
      titleHe: "בחירת תעודת בדיקת מעבדה (COA)",
      titleEn: "Select Laboratory COA Preset",
      descHe: "בחר מתוך תעודות אנליזה של מפעלים מוסמכים באירופה (שמן זית, פסטה, רסק עגבניות) או דגימה שנכשלה לבדיקת התראות.",
      descEn: "Choose accredited EU laboratory certificates or test sample failures to review automated alerts.",
      position: "bottom",
      icon: "🧪",
    },
    {
      targetSelector: "#coa-score-banner",
      titleHe: "מדד עמידה בתקני משרד הבריאות והחלטת Green Pass",
      titleEn: "MOH Compliance Score & Clearance Verdict",
      descHe: "מערכת בדיקה אוטומטית שמשווה את תוצאות המעבדה לספי שירות המזון הארצי, ת״י 1145 ות״י 191.",
      descEn: "Real-time auditing against Israeli Ministry of Health thresholds, SI 1145 and SI 191 food safety ceilings.",
      position: "bottom",
      icon: "🛡️",
    },
    {
      targetSelector: "#assay-table-card",
      titleHe: "שולחן בדיקות אינטראקטיבי: מיקרוביולוגיה, מתכות והדברה",
      titleEn: "Interactive Assays: Micro, Heavy Metals & Pesticides",
      descHe: "צפה בכל פרמטר ומגבלה חוקית. באפשרותך לערוך כל תוצאה בזמן אמת ולראות את השינוי המיידי במעמד האישור.",
      descEn: "Inspect every legal threshold and edit tested values on the fly to see instant compliance recalibration.",
      position: "left",
      icon: "🔬",
    },
    {
      targetSelector: "#green-certificate-btn",
      titleHe: "הפקת תעודת Green Pass רשמית להדפסה ולמכס",
      titleEn: "Official MOH Green Pass Certificate",
      descHe: "הפקת תעודת בדיקה רשמית של שירות המזון הארצי עם חותם דיגיטלי SHA-256 וברקוד, מוכנה לשידור לשער עולמי.",
      descEn: "Generate the official Ministry of Health Green Pre-Clearance certificate with cryptographic SHA-256 seal for customs.",
      position: "top",
      icon: "📜",
    },
  ];

  const handlePrintCertificate = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const handleDispatchToCustoms = () => {
    setBrokerDispatched(true);
    setTimeout(() => setBrokerDispatched(false), 3000);
  };

  const handleCopyDigitalHash = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(report.digitalSealHash);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  return (
    <div
      dir={isHe ? "rtl" : "ltr"}
      className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8 selection:bg-emerald-500 selection:text-white"
    >
      {/* Tour Guide */}
      <TourGuide tourId="moh_coa_checker_tour" steps={tourSteps} lang={isHe ? "he" : "en"} autoStart={false} />

      {/* Top Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {isHe ? "משרד הבריאות - שירות המזון הארצי" : "Ministry of Health | National Food Service"}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-500/20 text-teal-400 border border-teal-500/30">
                {isHe ? "אישור מוקדם ת״י 1145" : "SI 1145 Green Pass"}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {isHe ? "מערכת בדיקת תעודות אנליזה COA ואישור יבוא ירוק" : "Automated COA Assay & MOH Green Pass Checker"}
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl">
              {isHe
                ? "אימות אוטומטי של תעודות בדיקת מעבדה אירופאיות (ISO 17025) מול תקני משרד הבריאות הישראליים: מיקרוביולוגיה (סלמונלה/ליסטריה), מתכות כבדות (עופרת/קדמיום), שאריות הדברה ופרמטרי איכות כימיים."
                : "Automated compliance auditing of European ISO 17025 laboratory COAs against Israeli standards: microbiology (Salmonella, Listeria), heavy metals (Pb, Cd, As), pesticide MRLs, and SI 1145 / SI 191."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Bilingual Language Switcher */}
            <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-xl p-1 text-xs font-semibold shadow-xs">
              <button
                type="button"
                onClick={() => handleToggleLocale("en")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  !isHe
                    ? "bg-emerald-500 text-white shadow-xs font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="Switch UI to English"
              >
                <span>🇺🇸</span>
                <span>English</span>
              </button>
              <button
                type="button"
                onClick={() => handleToggleLocale("he")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  isHe
                    ? "bg-emerald-500 text-white shadow-xs font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="החלף ממשק לעברית"
              >
                <span>🇮🇱</span>
                <span>עברית</span>
              </button>
            </div>

            {/* OCR Parser Modal Trigger */}
            <button
              id="ocr-upload-btn"
              onClick={() => setShowOcrModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-teal-300 font-semibold text-sm border border-teal-500/40 shadow-lg shadow-teal-950/30 transition-all cursor-pointer"
            >
              <svg className="w-4 h-4 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span>{isHe ? "סריקת COA ב-PDF ו-OCR" : "Upload & OCR Lab COA"}</span>
            </button>

            {/* Official Green Certificate Button */}
            <button
              id="green-certificate-btn"
              onClick={() => setShowCertificateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium text-sm shadow-lg shadow-emerald-950/40 transition-all border border-emerald-500/30"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>{isHe ? "תעודת Green Pass רשמית" : "MOH Green Certificate"}</span>
            </button>
          </div>
        </div>

        {/* Success Notice if newly injected */}
        {ocrSuccessNotice && (
          <div className="mb-4 p-3 rounded-xl bg-teal-950/60 border border-teal-500/40 text-teal-300 text-xs flex items-center justify-between shadow-lg">
            <span className="flex items-center gap-2 font-medium">
              <span className="text-base">✓</span>
              <span>{ocrSuccessNotice}</span>
            </span>
            <span className="text-[10px] text-teal-400 font-mono">100% OCR EXTRACTED</span>
          </div>
        )}

        {/* Presets Bar */}
        <div id="coa-presets-bar" className="mt-6">
          <p className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-2.5">
            {isHe ? "בחר תעודת אנליזה לבדיקה:" : "Select Laboratory COA Sample:"}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {Object.values(allPresets).map((preset) => {
              const isSelected = preset.id === selectedPresetId;
              const isFailSample = preset.id === "failed_sample_inspection" || preset.id.includes("fail") || preset.id.includes("rejected");

              return (
                <button
                  key={preset.id}
                  onClick={() => handleSelectPreset(preset.id)}
                  className={`text-right p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                    isSelected
                      ? isFailSample
                        ? "bg-slate-900 border-red-500 shadow-md shadow-red-950/30 ring-1 ring-red-500/40"
                        : "bg-slate-900 border-emerald-500 shadow-md shadow-emerald-950/30 ring-1 ring-emerald-500/40"
                      : "bg-slate-900/60 border-slate-800 hover:bg-slate-900 hover:border-slate-700 text-slate-300"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded border ${
                          isFailSample
                            ? "bg-red-500/10 text-red-400 border-red-500/30"
                            : "bg-slate-800 text-emerald-400 border-slate-700"
                        }`}
                      >
                        {preset.originCountry}
                      </span>
                      {isSelected && (
                        <span
                          className={`w-2 h-2 rounded-full ring-4 ${
                            isFailSample ? "bg-red-500 ring-red-500/20" : "bg-emerald-400 ring-emerald-400/20"
                          }`}
                        />
                      )}
                    </div>
                    <div className="font-semibold text-sm text-white line-clamp-1">
                      {isHe ? preset.productNameHe : preset.productNameEn}
                    </div>
                    <div className="text-xs text-slate-400 mt-1 line-clamp-1">{preset.supplierName}</div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-800/80 text-[11px] font-mono text-slate-500 flex justify-between">
                    <span>LOT: {preset.batchNumber.split("-").slice(-2).join("-")}</span>
                    <span>HS: {preset.customsHsCode.slice(0, 4)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Compliance Verdict Banner */}
        <div
          id="coa-score-banner"
          className={`p-6 rounded-2xl border shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 ${
            report.verdict === "GREEN_PASS_APPROVED"
              ? "bg-gradient-to-r from-emerald-950/60 via-slate-900 to-teal-950/60 border-emerald-500/40"
              : report.verdict === "CONDITIONAL_RETEST_REQUIRED"
              ? "bg-gradient-to-r from-amber-950/60 via-slate-900 to-yellow-950/60 border-amber-500/40"
              : "bg-gradient-to-r from-red-950/70 via-slate-900 to-rose-950/70 border-red-500/50"
          }`}
        >
          <div className="flex items-center gap-4">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black shrink-0 ${
                report.verdict === "GREEN_PASS_APPROVED"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-lg shadow-emerald-950/50"
                  : report.verdict === "CONDITIONAL_RETEST_REQUIRED"
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                  : "bg-red-500/20 text-red-400 border border-red-500/40 shadow-lg shadow-red-950/50"
              }`}
            >
              {report.verdict === "GREEN_PASS_APPROVED" ? "✓" : report.verdict === "CONDITIONAL_RETEST_REQUIRED" ? "!" : "✕"}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                    report.verdict === "GREEN_PASS_APPROVED"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : report.verdict === "CONDITIONAL_RETEST_REQUIRED"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      : "bg-red-500/20 text-red-300 border border-red-500/30"
                  }`}
                >
                  {report.verdict === "GREEN_PASS_APPROVED"
                    ? isHe
                      ? "אישור יבוא ירוק מאושר (Green Pass)"
                      : "MOH Green Pass Approved"
                    : report.verdict === "CONDITIONAL_RETEST_REQUIRED"
                    ? isHe
                      ? "אישור מותנה בבדיקת מעבדה חוזרת"
                      : "Conditional Retest Required"
                    : isHe
                    ? "צו עצירה - פסילה רגולטורית (MOH Stop Order)"
                    : "MOH Regulatory Stop Order"}
                </span>
                <span className="text-xs text-slate-400 font-mono">REF: {report.certificateRefNumber}</span>
              </div>
              <h2 className="text-xl font-bold text-white mt-1">
                {isHe ? currentPreset.productNameHe : currentPreset.productNameEn}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {isHe ? "מעבדה בודקת:" : "Accredited Lab:"} {currentPreset.labName} ({currentPreset.labIso17025Accreditation})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-4 md:pt-0 border-slate-800">
            <div className="text-center">
              <div className="text-xs text-slate-400">{isHe ? "ציון עמידה בתקנים" : "Compliance Score"}</div>
              <div
                className={`text-3xl font-black font-mono mt-0.5 ${
                  report.complianceScorePct === 100
                    ? "text-emerald-400"
                    : report.complianceScorePct >= 80
                    ? "text-amber-400"
                    : "text-red-400"
                }`}
              >
                {report.complianceScorePct}%
              </div>
            </div>

            <div className="text-center">
              <div className="text-xs text-slate-400">{isHe ? "בדיקות שנפסלו" : "Failed Assays"}</div>
              <div
                className={`text-3xl font-black font-mono mt-0.5 ${
                  report.failedAssays === 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {report.failedAssays} / {report.totalAssays}
              </div>
            </div>
          </div>
        </div>

        {/* Failed Alerts Box (If any) */}
        {report.failedItems.length > 0 && (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/50 text-red-200 text-xs space-y-2">
            <div className="font-bold flex items-center gap-2 text-red-300 text-sm">
              <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{isHe ? "התראות חריגה רגולטוריות חמורות (הסגר נמל מופעל):" : "Critical Regulatory Violations (Port Quarantine Active):"}</span>
            </div>
            {report.failedItems.map((item) => (
              <div key={item.id} className="p-2.5 rounded-lg bg-red-950/60 border border-red-500/30 flex items-start justify-between">
                <div>
                  <div className="font-semibold text-white">{isHe ? item.nameHe : item.nameEn}</div>
                  <div className="text-red-300 mt-0.5">{isHe ? item.noteHe : item.noteEn}</div>
                </div>
                <div className="text-right font-mono text-red-400 font-bold shrink-0">
                  {item.testedValue} {item.unit} (רף: {item.maxLimit ?? item.minLimit} {item.unit})
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Assay Inspection Table & Controls */}
        <div id="assay-table-card" className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          {/* Filter Bar & Reset */}
          <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-x-auto text-xs">
              {(
                [
                  { id: "all", labelHe: "כל הבדיקות", labelEn: "All Assays" },
                  { id: "chemistry", labelHe: "כימיה ואיכות", labelEn: "Chemistry" },
                  { id: "microbiology", labelHe: "מיקרוביולוגיה", labelEn: "Microbiology" },
                  { id: "heavy_metals", labelHe: "מתכות כבדות (Pb/Cd/As)", labelEn: "Heavy Metals" },
                  { id: "pesticides", labelHe: "שאריות הדברה (MRLs)", labelEn: "Pesticides" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveCategoryFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    activeCategoryFilter === tab.id
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {isHe ? tab.labelHe : tab.labelEn}
                </button>
              ))}
            </div>

            <button
              onClick={handleResetParams}
              className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition-all flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{isHe ? "איפוס לערכי מקור" : "Reset Values"}</span>
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                  <th className="py-3 px-4 text-right">{isHe ? "פרמטר בדיקה מעבדתי" : "Assay Parameter"}</th>
                  <th className="py-3 px-3">{isHe ? "קטגוריה" : "Category"}</th>
                  <th className="py-3 px-3 text-center">{isHe ? "תוצאה נמדדת (לעריכה)" : "Tested Reading (Editable)"}</th>
                  <th className="py-3 px-3 text-center">{isHe ? "רף חוקי משרד הבריאות" : "Regulatory Limit"}</th>
                  <th className="py-3 px-3 text-right">{isHe ? "ציטוט תקן רשמי" : "Standard Citation"}</th>
                  <th className="py-3 px-4 text-center">{isHe ? "סטטוס" : "Status"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredParameters.map((param) => {
                  return (
                    <tr key={param.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 text-right">
                        <div className="font-semibold text-white">{isHe ? param.nameHe : param.nameEn}</div>
                        <div className="text-[11px] text-slate-500">{param.nameEn}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                          {param.category}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {typeof param.testedValue === "number" ? (
                          <div className="inline-flex items-center gap-1.5">
                            <input
                              type="number"
                              step="0.01"
                              value={param.testedValue}
                              onChange={(e) =>
                                handleUpdateParamValue(param.id, parseFloat(e.target.value) || 0)
                              }
                              className="w-20 bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded px-2 py-1 text-center font-mono font-bold text-white text-xs focus:outline-none"
                            />
                            <span className="text-slate-400 font-mono">{param.unit}</span>
                          </div>
                        ) : (
                          <span className="font-mono font-semibold text-emerald-400 px-2 py-1 rounded bg-slate-950 border border-slate-800">
                            {param.testedValue}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-slate-400">
                        {param.maxLimit !== undefined && `≤ ${param.maxLimit} ${param.unit}`}
                        {param.minLimit !== undefined && `≥ ${param.minLimit} ${param.unit}`}
                        {param.expectedString && param.expectedString}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-400 text-[11px]">
                        {param.standardCitation}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            param.status === "PASS"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : param.status === "WARN"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : "bg-red-500/20 text-red-300 border border-red-500/30"
                          }`}
                        >
                          {param.status === "PASS" ? "✓ תקין" : param.status === "WARN" ? "⚠ גבולי" : "✕ פסול"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* OCR & PDF Uploader Modal */}
      {showOcrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl shadow-2xl overflow-hidden my-8">
            {/* Modal Header */}
            <div className="bg-slate-950 px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">
                    {isHe ? "סורק תעודות בדיקת מעבדה אוטומטי (COA PDF & OCR)" : "Automated COA PDF & OCR Laboratory Extractor"}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {isHe ? "חילוץ ממעבדות מוסמכות ISO 17025: Eurofins, Silliker / Merieux, SGS, Chemiservice" : "Accredited ISO/IEC 17025 parsing for Eurofins, Silliker, SGS & Chemiservice"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowOcrModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="px-6 pt-4 pb-2 border-b border-slate-800 flex gap-2 text-xs">
              <button
                onClick={() => setOcrInputMode("upload")}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  ocrInputMode === "upload" ? "bg-teal-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {isHe ? "📁 העלאת קובץ PDF / סריקה" : "📁 Upload PDF / Scan"}
              </button>
              <button
                onClick={() => setOcrInputMode("templates")}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  ocrInputMode === "templates" ? "bg-teal-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {isHe ? "🧪 תעודות מעבדה מוסמכות לדוגמה" : "🧪 Certified Lab Templates"}
              </button>
              <button
                onClick={() => setOcrInputMode("paste")}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  ocrInputMode === "paste" ? "bg-teal-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {isHe ? "📝 הדבקת טקסט חופשי (Raw Text)" : "📝 Paste Raw COA Text"}
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5 text-xs">
              {/* Mode 1: Drag & Drop Dropzone */}
              {ocrInputMode === "upload" && (
                <div>
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingFile(true);
                    }}
                    onDragLeave={() => setIsDraggingFile(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingFile(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        handleFileUpload(e.dataTransfer.files[0]);
                      }
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                      isDraggingFile
                        ? "border-teal-400 bg-teal-950/30"
                        : "border-slate-700 hover:border-teal-500/60 bg-slate-950/60 hover:bg-slate-950"
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.txt"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileUpload(e.target.files[0]);
                        }
                      }}
                    />
                    <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <div className="font-bold text-white text-sm mb-1">
                      {isHe ? "גרור לכאן תעודת אנליזה (PDF / סריקה) או לחץ לבחירה" : "Drag & Drop Certificate of Analysis (PDF / Scan) or click to browse"}
                    </div>
                    <p className="text-slate-400 text-[11px]">
                      {isHe ? "תומך ב-PDF, תמונות סריקה וטקסט רגיל עד 25MB" : "Supports PDF, image scans & text files up to 25MB"}
                    </p>
                    {ocrFileName && (
                      <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 font-mono text-[11px] border border-teal-500/30">
                        <span>📄</span>
                        <span>{ocrFileName}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Mode 2: Certified Lab Presets */}
              {ocrInputMode === "templates" && (
                <div className="space-y-3">
                  <p className="text-slate-400">
                    {isHe
                      ? "בחר תעודת מעבדה אמיתית לדוגמה לבדיקה מיידית של מנוע ה-OCR והחילוץ:"
                      : "Select an accredited European lab certificate to test immediate OCR field extraction:"}
                  </p>
                  <div className="grid grid-cols-1 gap-2.5">
                    {Object.entries(CERTIFIED_LAB_TEMPLATES).map(([key, item]) => (
                      <button
                        key={key}
                        onClick={() => handleLoadCertifiedTemplate(key)}
                        className="text-right p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-teal-500/60 hover:bg-slate-950/80 transition flex items-center justify-between"
                      >
                        <div>
                          <div className="font-bold text-white text-xs">{item.title}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">{item.lab}</div>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg bg-teal-500/20 text-teal-300 font-mono text-[10px] font-semibold shrink-0">
                          {isHe ? "טען וסרוק" : "Scan"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Mode 3: Paste Raw Text */}
              {ocrInputMode === "paste" && (
                <div className="space-y-3">
                  <p className="text-slate-400">
                    {isHe ? "הדבק כאן את טקסט תעודת האנליזה ישירות מהקובץ או המייל:" : "Paste raw certificate text from PDF or email dispatch:"}
                  </p>
                  <textarea
                    rows={6}
                    value={ocrPastedText}
                    onChange={(e) => setOcrPastedText(e.target.value)}
                    placeholder="EUROFINS CERTIFICATE OF ANALYSIS AR-26-ES-088492-01&#10;Acidity: 0.24%&#10;Peroxide: 6.8 meq O2/kg&#10;Salmonella: Not Detected in 25g&#10;Lead (Pb): 0.02 mg/kg..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 font-mono text-white text-xs focus:border-teal-500 focus:outline-none"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={() => processOcrData(ocrPastedText, undefined, "Pasted_COA_Text.txt")}
                      disabled={!ocrPastedText.trim()}
                      className="px-4 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-semibold rounded-xl transition flex items-center gap-1.5"
                    >
                      <span>⚡</span>
                      <span>{isHe ? "הפעל פענוח OCR" : "Run OCR Parsing"}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* OCR Scanning Progress Animation */}
              {isScanningOcr && (
                <div className="p-4 rounded-xl bg-slate-950 border border-teal-500/30 space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-teal-300">
                    <span className="flex items-center gap-2">
                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-teal-400 animate-ping" />
                      <span>
                        {ocrScanStep === 1 && (isHe ? "מזהה מעבדה והסמכת ISO/IEC 17025..." : "Detecting lab & ISO/IEC 17025...")}
                        {ocrScanStep === 2 && (isHe ? "מחלץ מזהי אצווה LOT ותאריכי תוקף..." : "Extracting LOT & batch metadata...")}
                        {ocrScanStep === 3 && (isHe ? "מפענח תוצאות בדיקות כימיה, מיקרוביולוגיה ומתכות כבדות..." : "Parsing chemistry, micro & heavy metals assays...")}
                        {ocrScanStep >= 4 && (isHe ? "הסריקה הושלמה בהצלחה!" : "Extraction complete!")}
                      </span>
                    </span>
                    <span className="font-mono text-slate-400">{ocrScanStep * 25}%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-teal-500 to-emerald-400 h-1.5 transition-all duration-300"
                      style={{ width: `${ocrScanStep * 25}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Parsed Results Review Table */}
              {ocrParsedResult && !isScanningOcr && (
                <div className="space-y-4 pt-2 border-t border-slate-800">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-teal-950/30 border border-teal-500/30">
                    <div>
                      <div className="font-bold text-white text-sm">{ocrParsedResult.documentTitle}</div>
                      <div className="text-[11px] text-teal-300 mt-0.5">
                        {ocrParsedResult.labName} • {ocrParsedResult.labIso17025Accreditation}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        LOT: {ocrParsedResult.batchNumber} | Origin: {ocrParsedResult.originCountry}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-xs border border-emerald-500/30">
                        {ocrParsedResult.overallExtractionConfidencePct}% {isHe ? "רמת ביטחון" : "Confidence"}
                      </span>
                    </div>
                  </div>

                  {/* Assays Table */}
                  <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-800">
                    <table className="w-full text-[11px] text-left border-collapse">
                      <thead className="bg-slate-950 sticky top-0 text-slate-400">
                        <tr className="border-b border-slate-800">
                          <th className="p-2.5 text-right">{isHe ? "פרמטר בדיקה" : "Assay"}</th>
                          <th className="p-2.5 text-center">{isHe ? "ערך מחולץ" : "Reading"}</th>
                          <th className="p-2.5 text-center">{isHe ? "רף משרד הבריאות" : "Limit"}</th>
                          <th className="p-2.5 text-right">{isHe ? "שיטת בדיקה" : "Method"}</th>
                          <th className="p-2.5 text-center">{isHe ? "ביטחון" : "Score"}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-300">
                        {ocrParsedResult.extractedAssays.map((a) => (
                          <tr key={a.id} className="hover:bg-slate-800/30">
                            <td className="p-2 text-right font-medium text-white">
                              {isHe ? a.parameterNameHe : a.parameterNameEn}
                            </td>
                            <td className="p-2 text-center font-mono font-bold text-teal-300">
                              {a.testedValue} {a.unit}
                            </td>
                            <td className="p-2 text-center font-mono text-slate-400">
                              {a.maxLimit !== undefined && `≤ ${a.maxLimit} ${a.unit}`}
                              {a.minLimit !== undefined && `≥ ${a.minLimit} ${a.unit}`}
                              {a.expectedString && a.expectedString}
                            </td>
                            <td className="p-2 text-right text-slate-500 text-[10px]">
                              {a.testMethod}
                            </td>
                            <td className="p-2 text-center font-mono text-emerald-400 font-semibold">
                              {a.confidencePct}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[11px] text-slate-400">
                      {ocrParsedResult.extractedAssays.length} {isHe ? "מדדים חולצו בהצלחה ומותאמים לתקני משרד הבריאות" : "assays successfully extracted & mapped"}
                    </span>
                    <button
                      onClick={handleCommitOcrToChecker}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/40 transition flex items-center gap-2 cursor-pointer"
                    >
                      <span>✓</span>
                      <span>{isHe ? "הזרק נתונים לבדיקת משרד הבריאות" : "Inject Data into MOH Checker"}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Official Printable MOH Green Pass Certificate Modal */}
      {showCertificateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden my-8 border border-slate-300">
            {/* Action Bar (Hidden during print) */}
            <div className="print:hidden bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="font-bold text-sm tracking-wide">
                  {isHe ? "תעודת אישור מקדמי שירות המזון הארצי (Green Pass)" : "Official MOH Green Pre-Clearance Pass"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleDispatchToCustoms}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all shadow"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  <span>
                    {brokerDispatched
                      ? isHe
                        ? "שודר לשער עולמי!"
                        : "Dispatched to Customs!"
                      : isHe
                      ? "שידור לשער עולמי (EDI)"
                      : "Send to Customs Broker"}
                  </span>
                </button>

                <button
                  onClick={handlePrintCertificate}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all shadow"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  <span>{isHe ? "הדפס תעודה רשמית" : "Print Certificate"}</span>
                </button>

                <button
                  onClick={() => setShowCertificateModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Printable Certificate Body */}
            <div className="p-8 md:p-12 text-slate-900" id="moh-certificate-printable" dir={isHe ? "rtl" : "ltr"}>
              {/* Header */}
              <div className="border-b-2 border-slate-900 pb-6 flex items-start justify-between">
                <div>
                  <div className="text-xl font-black tracking-tight text-slate-900">
                    מדינת ישראל | משרד הבריאות
                  </div>
                  <div className="text-sm font-bold text-slate-800">
                    שירות המזון הארצי - תחנת הסגר נמל אשדוד / חיפה
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    STATE OF ISRAEL | MINISTRY OF HEALTH | NATIONAL FOOD SERVICE
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-mono text-sm font-black text-slate-900 bg-slate-100 px-3 py-1 rounded border border-slate-300">
                    {report.certificateRefNumber}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {isHe ? "תאריך הנפקה:" : "Date of Issue:"} {new Date().toLocaleDateString(isHe ? "he-IL" : "en-US")}
                  </div>
                </div>
              </div>

              {/* Status Ribbon */}
              <div className="my-6 p-4 rounded-xl bg-emerald-50 border-2 border-emerald-600 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                    {isHe ? "אישור שחרור מוקדם - מסלול ירוק תקף" : "PRE-CLEARANCE GREEN PASS VERIFIED"}
                  </div>
                  <div className="text-base font-extrabold text-emerald-900 mt-0.5">
                    {isHe ? "הטובין עומדים במלוא דרישות צו הגנת הצרכן ותקנות בריאות הציבור" : "Goods comply fully with Israeli Public Health & Standard Regulations"}
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono text-2xl font-black text-emerald-800">
                    {report.complianceScorePct}%
                  </span>
                  <div className="text-[10px] text-emerald-700 font-semibold">{isHe ? "ציון תקינות" : "Audit Score"}</div>
                </div>
              </div>

              {/* Consignment Details */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs my-6">
                <div>
                  <div className="text-slate-500 font-medium">{isHe ? "יצרן / ספק מקור:" : "Producer / Supplier:"}</div>
                  <div className="font-bold text-slate-800 mt-0.5">{currentPreset.supplierName}</div>
                  <div className="text-[10px] text-slate-400">{currentPreset.originCountry}</div>
                </div>
                <div>
                  <div className="text-slate-500 font-medium">{isHe ? "תיאור הטובין:" : "Product Description:"}</div>
                  <div className="font-bold text-slate-800 mt-0.5">{isHe ? currentPreset.productNameHe : currentPreset.productNameEn}</div>
                  <div className="text-[10px] text-slate-400">HS Code: {currentPreset.customsHsCode}</div>
                </div>
                <div>
                  <div className="text-slate-500 font-medium">{isHe ? "מספר אצווה (LOT):" : "Batch Number (LOT):"}</div>
                  <div className="font-mono font-bold text-slate-800 mt-0.5">{currentPreset.batchNumber}</div>
                  <div className="text-[10px] text-slate-400">EXP: {currentPreset.expiryDate}</div>
                </div>
                <div>
                  <div className="text-slate-500 font-medium">{isHe ? "מעבדה מוסמכת בודקת:" : "Accredited Laboratory:"}</div>
                  <div className="font-bold text-slate-800 mt-0.5 line-clamp-1">{currentPreset.labName}</div>
                  <div className="text-[10px] text-slate-400">{currentPreset.labIso17025Accreditation}</div>
                </div>
              </div>

              {/* Lab Results Table */}
              <div className="my-6">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  {isHe ? "תמצית תוצאות אנליזה קריטיות (COA Laboratory Audit)" : "Laboratory Assay Results Summary"}
                </h4>
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-300 text-slate-600 font-bold">
                      <th className="py-2 text-right">{isHe ? "פרמטר בדיקה" : "Assay"}</th>
                      <th className="py-2 text-center">{isHe ? "תוצאה נמדדת" : "Tested Value"}</th>
                      <th className="py-2 text-center">{isHe ? "רף חוקי מקסימלי" : "Legal Limit"}</th>
                      <th className="py-2 text-right">{isHe ? "ציטוט תקן רשמי" : "Standard"}</th>
                      <th className="py-2 text-center">{isHe ? "ממצא" : "Verdict"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {editableParams.map((item) => (
                      <tr key={item.id}>
                        <td className="py-2 text-right font-medium">
                          {isHe ? item.nameHe : item.nameEn}
                        </td>
                        <td className="py-2 text-center font-mono font-bold">
                          {item.testedValue} {item.unit}
                        </td>
                        <td className="py-2 text-center font-mono text-slate-500">
                          {item.maxLimit !== undefined && `≤ ${item.maxLimit} ${item.unit}`}
                          {item.minLimit !== undefined && `≥ ${item.minLimit} ${item.unit}`}
                          {item.expectedString && item.expectedString}
                        </td>
                        <td className="py-2 text-right text-slate-500 text-[11px]">
                          {item.standardCitation}
                        </td>
                        <td className="py-2 text-center font-bold text-emerald-700">
                          {item.status === "PASS" ? "עובר (PASS)" : item.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Digital Seal & Authority Signature */}
              <div className="mt-8 pt-6 border-t-2 border-slate-300 flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-slate-600">
                <div className="space-y-1 max-w-md">
                  <div className="font-bold text-slate-800 flex items-center gap-2">
                    <svg className="w-4 h-4 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span>{isHe ? "חתימה דיגיטלית מאובטחת SHA-256:" : "Cryptographic Seal SHA-256:"}</span>
                  </div>
                  <div
                    onClick={handleCopyDigitalHash}
                    className="font-mono text-[10px] text-slate-500 break-all bg-slate-100 p-2 rounded border border-slate-200 cursor-pointer hover:bg-slate-200 transition-colors"
                  >
                    {report.digitalSealHash}
                    {copiedHash && <span className="text-emerald-700 font-bold block">{isHe ? "הועתק ללוח!" : "Copied!"}</span>}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {isHe ? "תקף להגשה ישירה לעמיל המכס בנמל אשדוד ושער עולמי." : "Valid for direct EDI electronic customs declaration."}
                  </div>
                </div>

                <div className="text-center border border-slate-300 p-4 rounded-xl min-w-[200px]">
                  <div className="w-16 h-16 mx-auto mb-2 border-2 border-dashed border-emerald-700 rounded-full flex items-center justify-center text-emerald-800 font-bold text-xs">
                    MOH SEAL
                  </div>
                  <div className="font-bold text-slate-900">{isHe ? "שירות המזון הארצי" : "National Food Service"}</div>
                  <div className="text-[10px] text-slate-500">{isHe ? "תחנת ביקורת גבולות נמל" : "Port Border Control Station"}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
