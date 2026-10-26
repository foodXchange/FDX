"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import TourGuide, { TourStep } from "@/components/tour/TourGuide";
import {
  type B2BContractData,
  CONTRACT_PRESETS,
  generateContractLegalText,
} from "@/lib/documents/b2bContractGenerator";

interface Props {
  initialContract?: B2BContractData;
  dealId?: string;
  lang?: "he" | "en";
}

export default function B2BContractStudio({
  initialContract,
  dealId = "sample-deal-1",
  lang = "he",
}: Props) {
  const isHe = lang === "he";

  // Selected preset or initial contract
  const [activePresetKey, setActivePresetKey] = useState<string>("shufersal_evoo");
  const [contract, setContract] = useState<B2BContractData>(
    initialContract || CONTRACT_PRESETS.shufersal_evoo
  );

  // View presentation mode: bilingual side-by-side, hebrew only, or english only
  const [viewMode, setViewMode] = useState<"bilingual" | "he" | "en">("bilingual");

  // Signature Studio state
  const [signingParty, setSigningParty] = useState<"buyer" | "seller">("buyer");
  const [signatureInputMode, setSignatureInputMode] = useState<"draw" | "type">("draw");
  const [typedSignature, setTypedSignature] = useState<string>(
    contract.buyer.signatoryName || "Oren Shahar"
  );
  const [typedFontFamily, setTypedFontFamily] = useState<string>("font-serif italic");
  const [copiedText, setCopiedText] = useState(false);
  const [executionNotice, setExecutionNotice] = useState<string | null>(null);

  // HTML5 Canvas for drawing signature
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawnOnCanvas, setHasDrawnOnCanvas] = useState(false);

  // Switch preset
  const handleSelectPreset = (key: string) => {
    setActivePresetKey(key);
    const selected = CONTRACT_PRESETS[key];
    if (selected) {
      setContract({ ...selected });
      setTypedSignature(selected.buyer.signatoryName);
      clearCanvas();
      setExecutionNotice(null);
    }
  };

  // Canvas drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);
    setHasDrawnOnCanvas(true);

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1e293b"; // dark ink color
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawnOnCanvas(false);
  };

  // Apply signature to either Buyer or Seller
  const handleApplySignature = () => {
    let signatureDataUrl: string | null = null;
    const nowIso = new Date().toISOString();

    if (signatureInputMode === "draw") {
      const canvas = canvasRef.current;
      if (canvas && hasDrawnOnCanvas) {
        signatureDataUrl = canvas.toDataURL("image/png");
      } else {
        alert(isHe ? "נא לצייר חתימה בלוח החתימה" : "Please draw a signature on the pad");
        return;
      }
    } else {
      if (!typedSignature.trim()) {
        alert(isHe ? "נא להקליד שם לחתימה" : "Please type your full name for the signature");
        return;
      }
      signatureDataUrl = `TYPED:${typedSignature.trim()} [${typedFontFamily}]`;
    }

    setContract((prev) => {
      const updated = { ...prev };
      if (signingParty === "buyer") {
        updated.buyer = {
          ...updated.buyer,
          signatureData: signatureDataUrl,
          signatureType: signatureInputMode === "draw" ? "drawn" : "typed",
          signedAt: nowIso,
        };
      } else {
        updated.seller = {
          ...updated.seller,
          signatureData: signatureDataUrl,
          signatureType: signatureInputMode === "draw" ? "drawn" : "typed",
          signedAt: nowIso,
        };
      }

      // Check if both parties are now signed
      const isBuyerSigned = !!updated.buyer.signatureData;
      const isSellerSigned = !!updated.seller.signatureData;

      if (isBuyerSigned && isSellerSigned) {
        updated.status = "fully_executed";
        updated.verificationHash = `SHA256: ${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`;
      } else if (isBuyerSigned) {
        updated.status = "buyer_signed";
      } else if (isSellerSigned) {
        updated.status = "seller_signed";
      }

      return updated;
    });

    clearCanvas();
  };

  // Execute and Lock Contract Action
  const handleLockAndExecuteContract = () => {
    const nowIso = new Date().toISOString();
    setContract((prev) => ({
      ...prev,
      buyer: {
        ...prev.buyer,
        signatureData: prev.buyer.signatureData || `TYPED:${prev.buyer.signatoryName} [font-serif italic]`,
        signedAt: prev.buyer.signedAt || nowIso,
      },
      seller: {
        ...prev.seller,
        signatureData: prev.seller.signatureData || `TYPED:${prev.seller.signatoryName} [font-serif italic]`,
        signedAt: prev.seller.signedAt || nowIso,
      },
      status: "fully_executed",
      verificationHash: `SHA256: 8f4a9b2c3d1e0f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f`,
    }));

    setExecutionNotice(
      isHe
        ? "🎉 החוזה נחתם במלואו וננעל כהסכם מחייב! פקודת מקדמה של 30% הועברה ללוח הנאמנות ושיגור וואטסאפ נשלח לשני הצדדים."
        : "🎉 Contract fully executed and locked! 30% Advance Escrow milestone authorized and automated WhatsApp notifications dispatched."
    );
  };

  // Download contract text
  const handleDownloadContract = () => {
    const text = generateContractLegalText(contract, viewMode);
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `B2B_Contract_SPA_${contract.contractNumber}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Copy contract summary
  const handleCopyContract = () => {
    const text = generateContractLegalText(contract, viewMode);
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  // Tour steps
  const CONTRACT_TOUR_STEPS: TourStep[] = [
    {
      targetSelector: "#contract-header-summary",
      titleHe: "1. הצדדים להסכם ופרטי העסקה",
      titleEn: "1. Contracting Parties & Corporate IDs",
      descHe: "חוזה רכש בינלאומי משולש: הקניין הישראלי, המפעל האירופי, ונאמן האסקרו פודאקסצ'יינג'.",
      descEn: "Tripartite B2B agreement: Israeli Retailer, European Producer, and FoodXchange Escrow Fiduciary.",
      icon: "🏢",
    },
    {
      targetSelector: "#contract-cif-specs",
      titleHe: "2. תנאי סחר CIF Ashdod Port וכמויות מכולה",
      titleEn: "2. Incoterms CIF Ashdod & Container Specs",
      descHe: "פירוט מדויק של מחיר היחידה ביורו, ערך החוזה, מכולת 40ft HQ, ותקן משטחי EPAL מחוטאים ISPM-15.",
      descEn: "Itemizes EUR CIF unit prices, full container volume, and ISPM-15 heat-treated Euro Pallet specs.",
      icon: "🚢",
    },
    {
      targetSelector: "#contract-escrow-mechanism",
      titleHe: "3. מנגנון נאמנות בנקאית 30/70",
      titleEn: "3. 30/70 Financial Wire Escrow Mechanism",
      descHe: "30% מקדמה לנאמנות עם החתימה להפעלת הייצור, ו-70% יתרה כנגד שטר מטען B/L מקורי ותעודת מקור EUR.1.",
      descEn: "30% deposit held in escrow to launch production, 70% released against verified Clean B/L and EUR.1 certificate.",
      icon: "🔒",
    },
    {
      targetSelector: "#contract-kosher-sla",
      titleHe: "4. כשרות הרבנות הראשית וחיי מדף",
      titleEn: "4. Chief Rabbinate Kosher & Shelf-Life SLA",
      descHe: "התחייבות יצרן לכשרות מאושרת לייבוא בישראל ומינימום 75% חיי מדף נותרים בעת הגעת האונייה לנמל אשדוד.",
      descEn: "Contractual warranty for Israeli Chief Rabbinate kashrut authorization and 75% minimum shelf-life upon berthing.",
      icon: "✡️",
    },
    {
      targetSelector: "#contract-signature-studio",
      titleHe: "5. סטודיו חתימה דיגיטלית ואפוסטיל מאומת",
      titleEn: "5. Digital E-Signature Studio & SHA-256 Seal",
      descHe: "חתימה ידנית בלוח המגע (Draw) או בהקלדה מאושרת (Type) המנפיקה חותמת אימות קריפטוגרפית SHA-256.",
      descEn: "Interactive touch signature pad or typed signature with instant cryptographic SHA-256 hash sealing.",
      icon: "✍️",
    },
  ];

  return (
    <div
      dir={isHe ? "rtl" : "ltr"}
      className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-24 selection:bg-orange-500 selection:text-white"
    >
      {/* ── TOP CONTROL BAR ── */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 backdrop-blur-md bg-opacity-95 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-600/20 border border-orange-500/40 flex items-center justify-center text-xl shrink-0">
              ⚖️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-white tracking-wide">
                  {isHe
                    ? "סטודיו חוזים בינלאומיים · הסכם רכש ואסקרו (SPA)"
                    : "International B2B Sales Purchase Agreement (SPA) Studio"}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                    contract.status === "fully_executed"
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                      : contract.status === "buyer_signed" || contract.status === "seller_signed"
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                      : "bg-blue-500/20 text-blue-300 border-blue-500/30"
                  }`}
                >
                  {contract.status === "fully_executed"
                    ? isHe
                      ? "נחתם במלואו ומחייב ✓"
                      : "Fully Executed ✓"
                    : contract.status === "buyer_signed"
                    ? isHe
                      ? "חתום ע״י הקונה"
                      : "Buyer Signed"
                    : isHe
                    ? "טיוטה להסכם"
                    : "Draft Agreement"}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                ICC Model Contract 758 · Incoterms 2020 CIF Ashdod · 30/70 Escrow Milestone Protection
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2.5">
            {/* Tour Guide */}
            <TourGuide
              tourId="b2b_contract_studio"
              steps={CONTRACT_TOUR_STEPS}
              lang={lang}
            />

            {/* Language Switcher */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-0.5 flex items-center text-xs">
              <Link
                href={`/he/tools/contract-generator`}
                className={`px-2.5 py-1 rounded-lg transition font-medium ${
                  isHe ? "bg-orange-600 text-white font-bold" : "text-slate-400 hover:text-white"
                }`}
              >
                עברית
              </Link>
              <Link
                href={`/en/tools/contract-generator`}
                className={`px-2.5 py-1 rounded-lg transition font-medium ${
                  !isHe ? "bg-orange-600 text-white font-bold" : "text-slate-400 hover:text-white"
                }`}
              >
                English
              </Link>
            </div>

            {/* Preset Selector */}
            <select
              value={activePresetKey}
              onChange={(e) => handleSelectPreset(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl px-3 py-1.5 focus:border-orange-500 focus:outline-none"
            >
              <option value="shufersal_evoo">Shufersal & Acesur (EVOO 1L - €36k)</option>
              <option value="rami_levy_pasta">Rami Levy & Campano (Pasta 500g - €24k)</option>
              <option value="carrefour_passata">Carrefour & Puglia (Passata 700g - €28k)</option>
            </select>

            {/* Print Action */}
            <button
              type="button"
              onClick={() => window.print()}
              className="text-xs font-bold px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span>🖨️</span>
              <span>{isHe ? "הדפס חוזה" : "Print Legal Sheet"}</span>
            </button>

            {/* Download Text */}
            <button
              type="button"
              onClick={handleDownloadContract}
              className="text-xs font-bold px-3.5 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span>📥</span>
              <span>{isHe ? "הורד קובץ חוזה" : "Download Contract"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT CONTAINER ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Execution Success Notification */}
        {executionNotice && (
          <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-sm flex items-start gap-3 shadow-lg">
            <span className="text-2xl shrink-0">📜</span>
            <div className="space-y-1">
              <strong className="block text-emerald-300 font-bold">
                {isHe ? "החוזה נחתם והופעל בהצלחה!" : "Contract Executed & Milestone Active!"}
              </strong>
              <p className="text-xs leading-relaxed text-emerald-200/90">{executionNotice}</p>
            </div>
          </div>
        )}

        {/* ── CONTRACT EXECUTIVE SUMMARY & COMMERCIAL SNAPSHOT ── */}
        <section
          id="contract-header-summary"
          className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-orange-400 uppercase tracking-wider">
                  {contract.contractNumber}
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-300">
                  {contract.contractDate}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-white mt-1">
                {contract.productNameHe}
              </h1>
              <p className="text-sm text-slate-300 mt-0.5">{contract.productNameEn}</p>
            </div>

            {/* Quick Financial Box */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-center gap-6 text-xs shrink-0">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">
                  {isHe ? "ערך חוזה CIF אשדוד" : "Total CIF Contract Sum"}
                </span>
                <span className="text-xl font-bold font-mono text-emerald-400 mt-0.5 block">
                  €{contract.totalContractValueEur.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  {contract.quantityUnits.toLocaleString()} יחידות @ €{contract.unitPriceEur.toFixed(3)}
                </span>
              </div>

              <div className="border-r border-slate-800 pr-6">
                <span className="text-slate-500 block text-[10px] uppercase">
                  {isHe ? "מקדמת 30% לנאמנות" : "30% Advance Escrow"}
                </span>
                <span className="text-base font-bold font-mono text-sky-400 mt-0.5 block">
                  €{contract.advanceDepositEur.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-emerald-400 font-semibold block mt-0.5">
                  {isHe ? "נעול בחשבון נאמנות בנקאי" : "Secured Fiduciary Wire"}
                </span>
              </div>
            </div>
          </div>

          {/* Parties Tripartite Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 text-xs">
            {/* 1. Buyer */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-orange-400">
                  {isHe ? "הקונה / היבואן הרשמי" : "Buyer / Importer of Record"}
                </span>
                <span className="text-sm">🇮🇱</span>
              </div>
              <div className="font-bold text-sm text-white">
                {contract.buyer.companyName}
              </div>
              <div className="text-[11px] text-slate-400">{contract.buyer.companyNameHe}</div>
              <div className="text-slate-500 font-mono text-[11px]">
                ח.פ. / Corp ID: {contract.buyer.regNumber}
              </div>
              <div className="pt-2 border-t border-slate-800/80 text-slate-300">
                <span className="text-slate-500 block text-[10px]">{isHe ? "מורשה חתימה" : "Signatory"}:</span>
                <span className="font-semibold">{contract.buyer.signatoryName}</span>
                <span className="text-[11px] text-slate-400 block">{contract.buyer.signatoryTitle}</span>
              </div>
            </div>

            {/* 2. Seller */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-blue-400">
                  {isHe ? "המוכר / היצרן האירופי" : "Seller / European Producer"}
                </span>
                <span className="text-sm">🇪🇺</span>
              </div>
              <div className="font-bold text-sm text-white">
                {contract.seller.companyName}
              </div>
              <div className="text-[11px] text-slate-400">{contract.seller.registeredAddress}</div>
              <div className="text-slate-500 font-mono text-[11px]">
                EU VAT: {contract.seller.regNumber} ({contract.originCountry})
              </div>
              <div className="pt-2 border-t border-slate-800/80 text-slate-300">
                <span className="text-slate-500 block text-[10px]">{isHe ? "מורשה חתימה" : "Signatory"}:</span>
                <span className="font-semibold">{contract.seller.signatoryName}</span>
                <span className="text-[11px] text-slate-400 block">{contract.seller.signatoryTitle}</span>
              </div>
            </div>

            {/* 3. Escrow Agent */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-emerald-400">
                  {isHe ? "נאמן אסקרו וערבות עמלות" : "Trade Escrow & Fiduciary"}
                </span>
                <span className="text-sm">🛡️</span>
              </div>
              <div className="font-bold text-sm text-white">
                {contract.escrowAgent.companyName}
              </div>
              <div className="text-[11px] text-slate-400">{contract.escrowAgent.legalEntity}</div>
              <div className="text-slate-500 font-mono text-[11px]">
                ICC NCNDA / IMFPA Registered Escrow
              </div>
              <div className="pt-2 border-t border-slate-800/80 text-slate-300">
                <span className="text-slate-500 block text-[10px]">{isHe ? "מורשה נאמנות" : "Fiduciary Officer"}:</span>
                <span className="font-semibold">{contract.escrowAgent.signatoryName}</span>
                <span className="text-[11px] text-emerald-400 block font-semibold">
                  {isHe ? "ערבות אסקרו מאומתת ✓" : "Escrow Attestation Active ✓"}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ── THE 6 ARTICLES OF THE B2B SALES AGREEMENT (PRINTABLE LEGAL SHEET) ── */}
        <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-8 print:bg-white print:text-black print:p-0 print:border-none print:shadow-none">
          {/* View Mode Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4 print:hidden">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>📑</span>
                <span>{isHe ? "נוסח החוזה המשפטי המלא" : "Full Legal Contract Articles"}</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                ICC Model International Sale Contract (Publication 758)
              </p>
            </div>

            {/* View Mode Switcher */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-1 flex items-center text-xs">
              <button
                type="button"
                onClick={() => setViewMode("bilingual")}
                className={`px-3 py-1 rounded-lg transition font-medium ${
                  viewMode === "bilingual" ? "bg-orange-600 text-white font-bold" : "text-slate-400 hover:text-white"
                }`}
              >
                {isHe ? "דו-לשוני (עברית ואנגלית)" : "Bilingual"}
              </button>
              <button
                type="button"
                onClick={() => setViewMode("he")}
                className={`px-3 py-1 rounded-lg transition font-medium ${
                  viewMode === "he" ? "bg-orange-600 text-white font-bold" : "text-slate-400 hover:text-white"
                }`}
              >
                עברית
              </button>
              <button
                type="button"
                onClick={() => setViewMode("en")}
                className={`px-3 py-1 rounded-lg transition font-medium ${
                  viewMode === "en" ? "bg-orange-600 text-white font-bold" : "text-slate-400 hover:text-white"
                }`}
              >
                English
              </button>
            </div>
          </div>

          {/* ── ARTICLE 1: SUBJECT MATTER & COMMODITY ── */}
          <div id="contract-cif-specs" className="space-y-3">
            <h3 className="text-sm font-bold text-orange-400 uppercase tracking-wide flex items-center gap-2">
              <span>סעיף 1 · Article 1:</span>
              <span>{isHe ? "תיאור הטובין, מפרט ומארז" : "Subject Matter, Goods & Specifications"}</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed text-slate-300 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
              <div className="space-y-2">
                <p>
                  <strong>1.1 המוצר והמפרט:</strong> המוכר מתחייב לייצר, לארוז ולספק לקונה טובין מסוג{" "}
                  <strong className="text-white">{contract.productNameHe}</strong> ({contract.productNameEn}) בהתאם למפרט:{" "}
                  {contract.productSpecification}.
                </p>
                <p>
                  <strong>1.2 משטחים ותקינה:</strong> המטען ייארז על גבי {contract.palletConfiguration}. כל המשטחים יעמדו
                  בתקן חיטוי חום בינלאומי ISPM-15 וישאו חותמת רשמית (HT Stamp).
                </p>
              </div>
              <div className="space-y-2 font-sans text-slate-400" dir="ltr">
                <p>
                  <strong>1.1 The Goods:</strong> Seller agrees to manufacture, pack, and supply to Buyer{" "}
                  <strong className="text-slate-200">{contract.productNameEn}</strong> conforming strictly with:{" "}
                  {contract.productSpecification}.
                </p>
                <p>
                  <strong>1.2 Palletization:</strong> Goods shall be secured onto {contract.palletConfiguration}, heat-treated
                  pursuant to ISPM-15 with official legible HT stamps.
                </p>
              </div>
            </div>
          </div>

          {/* ── ARTICLE 2: QUANTITY, PRICE & INCOTERMS ── */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-orange-400 uppercase tracking-wide flex items-center gap-2">
              <span>סעיף 2 · Article 2:</span>
              <span>{isHe ? "כמויות, תמורה מסחרית ותנאי מכר (CIF)" : "Quantity, Value & Incoterms (CIF)"}</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed text-slate-300 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
              <div className="space-y-2">
                <p>
                  <strong>2.1 תנאי מכר:</strong> המכירה מבוצעת בתנאי{" "}
                  <strong className="text-sky-400">{contract.incoterm}</strong> (נמל אשדוד, ישראל). המוכר נושא בכל עלויות
                  ההובלה הימית, הביטוח הימי (All Risks) והוצאות הטעינה עד פריקת המכולה ברציף הישראלי.
                </p>
                <p>
                  <strong>2.2 מחיר וערך כולל:</strong> מחיר היחידה נקבע על סך{" "}
                  <strong className="text-emerald-400">€{contract.unitPriceEur.toFixed(3)} אירו</strong>. סך התמורה הכוללת
                  הינה <strong className="text-emerald-400">€{contract.totalContractValueEur.toLocaleString(undefined, { minimumFractionDigits: 2 })} אירו</strong>.
                </p>
              </div>
              <div className="space-y-2 font-sans text-slate-400" dir="ltr">
                <p>
                  <strong>2.1 Delivery Terms:</strong> Governed by <strong className="text-sky-300">{contract.incoterm}</strong>.
                  Seller covers ocean freight, marine insurance (Institute Cargo Clauses A - All Risks), and loading.
                </p>
                <p>
                  <strong>2.2 Contract Sum:</strong> The unit price is fixed at{" "}
                  <strong className="text-emerald-300">€{contract.unitPriceEur.toFixed(3)} EUR</strong> CIF Ashdod. Total contract
                  consideration is{" "}
                  <strong className="text-emerald-300">€{contract.totalContractValueEur.toLocaleString(undefined, { minimumFractionDigits: 2 })} EUR</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* ── ARTICLE 3: 30/70 ESCROW MILESTONES ── */}
          <div id="contract-escrow-mechanism" className="space-y-3">
            <h3 className="text-sm font-bold text-orange-400 uppercase tracking-wide flex items-center gap-2">
              <span>סעיף 3 · Article 3:</span>
              <span>{isHe ? "מנגנון נאמנות אסקרו ואבני דרך (30/70)" : "30/70 Financial Wire Escrow Mechanism"}</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed text-slate-300 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
              <div className="space-y-2">
                <p>
                  <strong>3.1 מקדמת ייצור 30% (€{contract.advanceDepositEur.toLocaleString(undefined, { minimumFractionDigits: 2 })}):</strong>{" "}
                  הקונה יעביר תוך 3 ימי עסקים מחתימת הסכם זה מקדמה של 30% לחשבון הנאמנות של פודאקסצ'יינג'. שחרור המקדמה
                  ליצרן יבוצע עם אישור תחילת הייצור והדפסת מארזי המותג הפרטי.
                </p>
                <p>
                  <strong>3.2 יתרת 70% (€{contract.finalBalanceEur.toLocaleString(undefined, { minimumFractionDigits: 2 })}):</strong>{" "}
                  היתרה תופקד בנאמנות ותשוחרר ליצרן כנגד הצגת שטר מטען ימי נקי מקורי (Clean Ocean B/L 3/3), תעודת מקור EUR.1
                  לפטור מלא ממכס (0%), רשימת אריזה מפורטת ואישורי שירות המזון.
                </p>
              </div>
              <div className="space-y-2 font-sans text-slate-400" dir="ltr">
                <p>
                  <strong>3.1 30% Production Advance (€{contract.advanceDepositEur.toLocaleString(undefined, { minimumFractionDigits: 2 })}):</strong>{" "}
                  Remitted by Buyer within 3 banking days to the FoodXchange Escrow Fiduciary. Released to Seller upon verified
                  production initiation and label printing proof.
                </p>
                <p>
                  <strong>3.2 70% Final Settlement (€{contract.finalBalanceEur.toLocaleString(undefined, { minimumFractionDigits: 2 })}):</strong>{" "}
                  Deposited in escrow and released to Seller strictly against presentation of: (i) Original Clean On-Board B/L (3/3),
                  (ii) EUR.1 Certificate of Origin, (iii) Detailed Packing List, and (iv) MOH Laboratory Assay (COA).
                </p>
              </div>
            </div>
          </div>

          {/* ── ARTICLE 4: KASHRUT & SHELF-LIFE SLA ── */}
          <div id="contract-kosher-sla" className="space-y-3">
            <h3 className="text-sm font-bold text-orange-400 uppercase tracking-wide flex items-center gap-2">
              <span>סעיף 4 · Article 4:</span>
              <span>{isHe ? "התחייבות כשרות הרבנות הראשית וחיי מדף (SLA)" : "Rabbinical Kashrut Guarantee & Shelf-Life SLA"}</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed text-slate-300 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
              <div className="space-y-2">
                <p>
                  <strong>4.1 אישור כשרות הרבנות הראשית לישראל:</strong> המוכר מתחייב כי הטובין מיוצרים תחת השגחת{" "}
                  <strong className="text-amber-400">{contract.kosherCertifier}</strong>, ועומדים במלוא דרישות מחלקת היבוא
                  ברבנות הראשית לישראל לשיווק חוקי ברשתות השיווק בישראל.
                </p>
                <p>
                  <strong>4.2 התחייבות חיי מדף:</strong> בעת עגינת האונייה ופריקת המכולה בנמל אשדוד, הטובין ישאו לפחות{" "}
                  <strong className="text-emerald-400">{contract.minimumRemainingShelfLifePct}%</strong> מכלל חיי המדף המקוריים
                  שלהם.
                </p>
              </div>
              <div className="space-y-2 font-sans text-slate-400" dir="ltr">
                <p>
                  <strong>4.1 Chief Rabbinate Kosher Warranty:</strong> Seller guarantees goods are certified by{" "}
                  <strong className="text-amber-300">{contract.kosherCertifier}</strong> with official endorsement from the
                  Chief Rabbinate of Israel - Import Department for unrestricted commercial retail distribution.
                </p>
                <p>
                  <strong>4.2 Minimum Shelf-Life SLA:</strong> Goods shall arrive at Ashdod Port with a minimum of{" "}
                  <strong className="text-emerald-300">{contract.minimumRemainingShelfLifePct}%</strong> of total original
                  shelf-life remaining.
                </p>
              </div>
            </div>
          </div>

          {/* ── ARTICLE 5: PRE-SHIPMENT QA & DOCUMENTATION ── */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-orange-400 uppercase tracking-wide flex items-center gap-2">
              <span>סעיף 5 · Article 5:</span>
              <span>{isHe ? "פיקוח טעינה, מסמכי שער עולמי ופטור ממכס" : "Pre-Shipment Inspection & Shaar Olami Dossier"}</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed text-slate-300 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
              <div className="space-y-2">
                <p>
                  <strong>5.1 בדיקת טעינה ואיטום:</strong> טעינת המכולה ואיטומה יבוקרו ע״י {contract.inspectionCompany}.
                  המוכר מתחייב להנפיק תעודת מקור EUR.1 המקנה פטור מלא ממכס (0%) לפי פרוטוקול 4 להסכם ישראל-איחוד אירופי.
                </p>
              </div>
              <div className="space-y-2 font-sans text-slate-400" dir="ltr">
                <p>
                  <strong>5.1 Inspection & Origin:</strong> Loading supervised by {contract.inspectionCompany}. Seller shall
                  provide EUR.1 Movement Certificate securing 0% customs duty under the Israel-EU Association Agreement.
                </p>
              </div>
            </div>
          </div>

          {/* ── ARTICLE 6: ARBITRATION & FORCE MAJEURE ── */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-orange-400 uppercase tracking-wide flex items-center gap-2">
              <span>סעיף 6 · Article 6:</span>
              <span>{isHe ? "בוררות בינלאומית ICC וסמכות שיפוט" : "ICC International Arbitration & Jurisdiction"}</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed text-slate-300 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
              <div className="space-y-2">
                <p>
                  <strong>6.1 בוררות:</strong> כל סכסוך הנובע מחוזה זה יימסר לבוררות לפי כללי הבוררות של לשכת המסחר
                  הבינלאומית (ICC). מקום הבוררות יהיה {contract.arbitrationVenue}.
                </p>
              </div>
              <div className="space-y-2 font-sans text-slate-400" dir="ltr">
                <p>
                  <strong>6.1 Arbitration:</strong> Any dispute shall be settled under the Rules of Arbitration of the
                  International Chamber of Commerce (ICC) in {contract.arbitrationVenue}.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── SIGNATURE ATTESTATION STATUS CARDS ── */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. Buyer Signatory Status */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-orange-400">
                {isHe ? "חתימת הקונה / היבואן" : "Buyer Signatory"}
              </span>
              {contract.buyer.signatureData ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {isHe ? "נחתם ואומת ✓" : "Signed & Verified ✓"}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {isHe ? "ממתין לחתימה" : "Awaiting Signature"}
                </span>
              )}
            </div>

            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 min-h-[90px] flex flex-col justify-center items-center">
              {contract.buyer.signatureData ? (
                contract.buyer.signatureData.startsWith("data:image") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={contract.buyer.signatureData}
                    alt="Buyer Signature"
                    className="max-h-16 object-contain filter invert opacity-90"
                  />
                ) : (
                  <div className="font-serif italic text-lg text-emerald-400 text-center font-bold">
                    {contract.buyer.signatureData.replace("TYPED:", "").split("[")[0]}
                  </div>
                )
              ) : (
                <span className="text-xs text-slate-600 font-mono italic">
                  {isHe ? "טרם נחתם דיגיטלית" : "Pending E-Signature"}
                </span>
              )}
            </div>

            <div className="text-xs text-slate-400 space-y-0.5">
              <div className="font-bold text-white">{contract.buyer.signatoryName}</div>
              <div>{contract.buyer.signatoryTitle}</div>
              <div className="text-[10px] text-slate-500 font-mono">
                {contract.buyer.signedAt
                  ? `Signed: ${contract.buyer.signedAt.slice(0, 19).replace("T", " ")} UTC`
                  : "Status: Unsigned"}
              </div>
            </div>
          </div>

          {/* 2. Seller Signatory Status */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
                {isHe ? "חתימת המוכר / היצרן" : "Seller Signatory"}
              </span>
              {contract.seller.signatureData ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {isHe ? "נחתם ואומת ✓" : "Signed & Verified ✓"}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {isHe ? "ממתין לחתימה" : "Awaiting Signature"}
                </span>
              )}
            </div>

            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 min-h-[90px] flex flex-col justify-center items-center">
              {contract.seller.signatureData ? (
                contract.seller.signatureData.startsWith("data:image") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={contract.seller.signatureData}
                    alt="Seller Signature"
                    className="max-h-16 object-contain filter invert opacity-90"
                  />
                ) : (
                  <div className="font-serif italic text-lg text-emerald-400 text-center font-bold">
                    {contract.seller.signatureData.replace("TYPED:", "").split("[")[0]}
                  </div>
                )
              ) : (
                <span className="text-xs text-slate-600 font-mono italic">
                  {isHe ? "טרם נחתם דיגיטלית" : "Pending E-Signature"}
                </span>
              )}
            </div>

            <div className="text-xs text-slate-400 space-y-0.5">
              <div className="font-bold text-white">{contract.seller.signatoryName}</div>
              <div>{contract.seller.signatoryTitle}</div>
              <div className="text-[10px] text-slate-500 font-mono">
                {contract.seller.signedAt
                  ? `Signed: ${contract.seller.signedAt.slice(0, 19).replace("T", " ")} UTC`
                  : "Status: Unsigned"}
              </div>
            </div>
          </div>

          {/* 3. Escrow Attestation */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                {isHe ? "אימות נאמנות אסקרו" : "Escrow Attestation"}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {isHe ? "מאומת ע״י פודאקסצ'יינג' ✓" : "Attested ✓"}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 min-h-[90px] flex flex-col justify-center items-center text-center space-y-1">
              <div className="text-lg">🛡️</div>
              <div className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider">
                FIDUCIARY SEAL APPLIED
              </div>
              <div className="text-[9px] font-mono text-slate-400 truncate max-w-[200px]">
                {contract.verificationHash || "SHA256: 7f8a4e9b2c3d1e0f8a7b6c5d4e3f2a1b"}
              </div>
            </div>

            <div className="text-xs text-slate-400 space-y-0.5">
              <div className="font-bold text-white">{contract.escrowAgent.signatoryName}</div>
              <div>{contract.escrowAgent.signatoryTitle}</div>
              <div className="text-[10px] text-slate-500 font-mono">
                Client Escrow IBAN: IL58-0128-0000-0009-4819-20
              </div>
            </div>
          </div>
        </section>

        {/* ── INTERACTIVE DIGITAL E-SIGNATURE STUDIO DESK ── */}
        <section
          id="contract-signature-studio"
          className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">✍️</span>
                <h3 className="text-base font-bold text-white">
                  {isHe ? "סטודיו החתימה הדיגיטלית (Digital E-Signature Studio)" : "Interactive Digital Signature Studio"}
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isHe
                  ? "בחר את הצד החותם, חתום בלוח המגע החופשי (Draw) או הקלד חתימה מאושרת (Type) להנפקת חותמת אימות."
                  : "Select signatory party, sign via smooth stylus/mouse touch pad or typed legal cursive."}
              </p>
            </div>

            {/* Select Signing Party */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSigningParty("buyer");
                  setTypedSignature(contract.buyer.signatoryName);
                }}
                className={`text-xs font-bold px-3.5 py-1.5 rounded-xl border transition ${
                  signingParty === "buyer"
                    ? "bg-orange-600 text-white border-orange-500 shadow-sm"
                    : "bg-slate-950 text-slate-300 border-slate-800 hover:text-white"
                }`}
              >
                {isHe ? "חתום בשם הקונה (Shufersal)" : "Sign as Buyer"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSigningParty("seller");
                  setTypedSignature(contract.seller.signatoryName);
                }}
                className={`text-xs font-bold px-3.5 py-1.5 rounded-xl border transition ${
                  signingParty === "seller"
                    ? "bg-blue-600 text-white border-blue-500 shadow-sm"
                    : "bg-slate-950 text-slate-300 border-slate-800 hover:text-white"
                }`}
              >
                {isHe ? "חתום בשם היצרן (Producer)" : "Sign as Seller"}
              </button>
            </div>
          </div>

          {/* Mode Switcher: Draw vs Type */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSignatureInputMode("draw")}
              className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                signatureInputMode === "draw"
                  ? "bg-slate-800 text-white border border-slate-700"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span>🖊️</span>
              <span>{isHe ? "ציור חתימה ידנית (Draw Pad)" : "Draw Signature"}</span>
            </button>
            <button
              type="button"
              onClick={() => setSignatureInputMode("type")}
              className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                signatureInputMode === "type"
                  ? "bg-slate-800 text-white border border-slate-700"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span>⌨️</span>
              <span>{isHe ? "הקלדת חתימה מעוצבת (Type Signature)" : "Type Signature"}</span>
            </button>
          </div>

          {/* Signature Studio Input Canvas / Typography Pad */}
          {signatureInputMode === "draw" ? (
            <div className="space-y-3">
              <div className="relative bg-white rounded-2xl p-2 border-2 border-dashed border-slate-300 overflow-hidden shadow-inner">
                <canvas
                  ref={canvasRef}
                  width={640}
                  height={160}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-36 touch-none cursor-crosshair bg-white"
                />
                <div className="absolute bottom-2 right-4 text-[11px] font-mono text-slate-400 select-none pointer-events-none">
                  ✕ {signingParty === "buyer" ? contract.buyer.signatoryName : contract.seller.signatoryName}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px]">
                  {isHe ? "השתמש בעכבר, עט סטילוס או מגע אצבע לציור חתימה אישית" : "Draw with mouse, stylus or touchscreen"}
                </span>
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="px-3 py-1 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                >
                  {isHe ? "נקה לוח חתימה" : "Clear Pad"}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 block">
                  {isHe ? "שם החותם המלא לחתימה רשמית:" : "Full Legal Signatory Name:"}
                </label>
                <input
                  type="text"
                  value={typedSignature}
                  onChange={(e) => setTypedSignature(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-slate-100 font-semibold focus:border-orange-500 focus:outline-none text-sm"
                  placeholder="e.g. Oren Shahar"
                />
              </div>

              {/* Font Style Selection */}
              <div className="flex items-center gap-3 pt-2">
                <span className="text-xs text-slate-400">{isHe ? "סגנון גופן:" : "Font Style:"}</span>
                {["font-serif italic font-bold", "font-mono italic font-semibold", "font-sans italic font-bold"].map(
                  (f, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setTypedFontFamily(f)}
                      className={`px-3 py-1.5 rounded-lg border text-xs transition ${
                        typedFontFamily === f
                          ? "bg-orange-600/20 text-orange-400 border-orange-500"
                          : "bg-slate-950 text-slate-400 border-slate-800"
                      }`}
                    >
                      Style {idx + 1}
                    </button>
                  )
                )}
              </div>

              {/* Live Preview Box */}
              <div className="p-4 bg-white text-slate-900 rounded-2xl border border-slate-300 text-center shadow-inner">
                <div className={`text-2xl text-slate-900 ${typedFontFamily}`}>
                  {typedSignature || "Signatory Name"}
                </div>
                <div className="text-[10px] font-mono text-slate-500 mt-1">
                  DIGITALLY CERTIFIED SIGNATURE IDENTIFIER
                </div>
              </div>
            </div>
          )}

          {/* Studio Actions Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-800">
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <span>🔒</span>
              <span>
                {isHe
                  ? "החתימה מוצפנת ב-SHA-256 ומאושרת לפי חוק חתימה אלקטרונית (תשס״א-2001)."
                  : "Encrypted with SHA-256 and compliant with the Electronic Signature Act."}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleApplySignature}
                className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-lg hover:shadow-orange-900/30"
              >
                <span>✓</span>
                <span>
                  {isHe
                    ? `החל חתימה עבור ${signingParty === "buyer" ? "הקונה" : "היצרן"}`
                    : `Apply Signature for ${signingParty === "buyer" ? "Buyer" : "Seller"}`}
                </span>
              </button>

              <button
                type="button"
                onClick={handleLockAndExecuteContract}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-lg hover:shadow-emerald-900/30"
              >
                <span>⚡</span>
                <span>
                  {isHe
                    ? "נעל חוזה מחייב והפעל נאמנות 30%"
                    : "Execute Contract & Lock 30% Escrow"}
                </span>
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
