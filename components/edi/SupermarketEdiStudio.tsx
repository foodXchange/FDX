"use client";

import React, { useState, useMemo, useEffect } from "react";
import TourGuide, { TourStep } from "../tour/TourGuide";
import {
  SUPERMARKET_CHAINS,
  SupermarketChainId,
  ErpSystemType,
  EdiDocumentType,
  EdiTransactionInput,
  EdiGenerationResult,
  generateSupermarketEdiTransaction,
  generateSscc18PalletCode,
} from "../../lib/edi/supermarketEdiEngine";

interface Props {
  initialLocale?: "he" | "en";
  locale?: "he" | "en";
}

export default function SupermarketEdiStudio({ initialLocale, locale }: Props) {
  const [currentLocale, setCurrentLocale] = useState<"he" | "en">(() => initialLocale || locale || "en");
  const isHe = currentLocale === "he";

  // Sync with localStorage or URL query params on mount
  useEffect(() => {
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
  useEffect(() => {
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

  // Selected Chain & ERP
  const [selectedChainId, setSelectedChainId] = useState<SupermarketChainId>("shufersal");
  const [selectedErp, setSelectedErp] = useState<ErpSystemType>("storenext_edifact");
  const [selectedDocType, setSelectedDocType] = useState<EdiDocumentType>("EDI_856_DESADV");

  // Editable parameters
  const [poNumber, setPoNumber] = useState<string>("FDX-PO-2026-8849");
  const [poDate, setPoDate] = useState<string>("2026-09-20");
  const [deliveryDate, setDeliveryDate] = useState<string>("2026-10-15");
  const [invoiceNumber, setInvoiceNumber] = useState<string>("INV-IL-260481");

  const [productNameHe, setProductNameHe] = useState<string>("שמן זית כתית מעולה 1 ליטר (חומציות מרבית 0.3%)");
  const [productNameEn, setProductNameEn] = useState<string>("Spanish Extra Virgin Olive Oil 1L");
  const [sku, setSku] = useState<string>("FDX-EVOO-1L");
  const [ean13, setEan13] = useState<string>("8410069018452"); // Valid GS1 checksum

  const [totalUnits, setTotalUnits] = useState<number>(24000);
  const [palletCount, setPalletCount] = useState<number>(24);
  const [unitsPerCarton, setUnitsPerCarton] = useState<number>(12);
  const [unitWholesalePriceIls, setUnitWholesalePriceIls] = useState<number>(10.89);

  const [containerNumber, setContainerNumber] = useState<string>("MSKU9481029");
  const [billOfLading, setBillOfLading] = useState<string>("MSCUVAL881920");
  const [batchNumber, setBatchNumber] = useState<string>("LOT-ES2026-EVOO-0884");
  const [expiryDate, setExpiryDate] = useState<string>("2028-09-15");
  const [mohGreenPassRef, setMohGreenPassRef] = useState<string>("MOH-IL-2026-778942-GP");

  // UI States
  const [copiedRaw, setCopiedRaw] = useState<boolean>(false);
  const [isTransmitting, setIsTransmitting] = useState<boolean>(false);
  const [transmissionAck, setTransmissionAck] = useState<{
    success: boolean;
    gatewayId: string;
    timestamp: string;
    message: string;
  } | null>(null);

  // Active Chain Profile
  const currentChain = SUPERMARKET_CHAINS[selectedChainId];

  // Live EDI Generation
  const ediResult: EdiGenerationResult = useMemo(() => {
    const input: EdiTransactionInput = {
      chainId: selectedChainId,
      erpType: selectedErp,
      docType: selectedDocType,
      poNumber,
      poDate,
      deliveryDate,
      invoiceNumber,
      buyerCompany: currentChain.nameHe,
      supplierName: "FoodXchange Institutional Desk / Direct Factory Gateway",
      supplierVatId: "51-628491-0",
      supplierGln: "7290001009988",
      productNameHe,
      productNameEn,
      sku,
      ean13,
      totalUnits,
      palletCount,
      unitsPerCarton,
      cartonsPerPallet: Math.round(totalUnits / palletCount / unitsPerCarton),
      unitWholesalePriceIls,
      vatRatePct: 18,
      containerNumber,
      billOfLading,
      mohGreenPassRef,
      batchNumber,
      expiryDate,
    };

    return generateSupermarketEdiTransaction(input);
  }, [
    selectedChainId,
    selectedErp,
    selectedDocType,
    poNumber,
    poDate,
    deliveryDate,
    invoiceNumber,
    currentChain,
    productNameHe,
    productNameEn,
    sku,
    ean13,
    totalUnits,
    palletCount,
    unitsPerCarton,
    unitWholesalePriceIls,
    containerNumber,
    billOfLading,
    mohGreenPassRef,
    batchNumber,
    expiryDate,
  ]);

  // Handle Chain Select
  const handleSelectChain = (chainId: SupermarketChainId) => {
    setSelectedChainId(chainId);
    const chain = SUPERMARKET_CHAINS[chainId];
    setSelectedErp(chain.defaultErp);
  };

  // Copy raw content
  const handleCopyRaw = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(ediResult.formattedContent);
      setCopiedRaw(true);
      setTimeout(() => setCopiedRaw(false), 2000);
    }
  };

  // Download EDI File
  const handleDownloadFile = () => {
    const blob = new Blob([ediResult.formattedContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = ediResult.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Simulate EDI transmission to StoreNext / SAP Gateway
  const handleSimulateTransmission = () => {
    setIsTransmitting(true);
    setTransmissionAck(null);

    setTimeout(() => {
      setIsTransmitting(false);
      setTransmissionAck({
        success: true,
        gatewayId: `SN-ACK-${Math.floor(100000 + Math.random() * 900000)}`,
        timestamp: new Date().toLocaleTimeString(isHe ? "he-IL" : "en-US"),
        message: isHe
          ? `המסר שודר בהצלחה לשרת סטורנקסט ונקלט במרלו״ג ${currentChain.centralDistributionCenter.nameHe} (אישור 997 / CONTRL התקבל)`
          : `Message transmitted to StoreNext EDI Gateway. Accepted by ${currentChain.centralDistributionCenter.nameEn} (997 CONTRL ACK Received)`,
      });
    }, 1200);
  };

  // Tour steps
  const tourSteps: TourStep[] = [
    {
      targetSelector: "#chain-selector-bar",
      titleHe: "בחירת רשת שיווק קמעונאית בישראל",
      titleEn: "Select Supermarket Chain",
      descHe: "בחר מבין רשתות המזון המובילות: שופרסל, רמי לוי, יוחננוף, ויקטורי או קרפור ישראל.",
      descEn: "Select major Israeli supermarket chains: Shufersal, Rami Levy, Yohananof, Victory, or Carrefour Israel.",
      position: "bottom",
      icon: "🏪",
    },
    {
      targetSelector: "#doc-type-selector",
      titleHe: "סוג מסמך EDI ופרוטוקול ERP",
      titleEn: "EDI Document Type & ERP Protocol",
      descHe: "מעבר בין הזמנת רכש (EDI 850), תעודת משלוח ASN (EDI 856), חשבונית מס (EDI 810) ומחירון פריטים חדשים (PRICAT).",
      descEn: "Toggle between Purchase Order (850), ASN Delivery (856), Tax Invoice (810), and Item Master Catalog (PRICAT).",
      position: "bottom",
      icon: "📄",
    },
    {
      targetSelector: "#edi-parameters-card",
      titleHe: "נתוני מכולה, משטחי SSCC וספרי קוד GS1",
      titleEn: "Container Logistics, SSCC & GS1 Codes",
      descHe: "הגדרת ברקוד EAN-13, מספרי מכולה, שטר מטען, אצווה ואישור משרד הבריאות Green Pass.",
      descEn: "Configure EAN-13 barcodes, SSCC-18 pallet serials, container numbers, and Ministry of Health compliance seals.",
      position: "left",
      icon: "📦",
    },
    {
      targetSelector: "#edi-code-viewer",
      titleHe: "תצוגת קוד EDI חי: סטורנקסט, SAP IDoc ופריוריטי",
      titleEn: "Live EDI Viewer: StoreNext, SAP & Priority",
      descHe: "קוד EDI אמיתי בתקן EDIFACT הבינלאומי של סטורנקסט, פורמט XML של SAP S/4HANA או ממשק ישיר לפריוריטי.",
      descEn: "Real-time generated StoreNext EDIFACT D96A, SAP S/4HANA IDoc XML, or Priority CSV/OData interfaces.",
      position: "right",
      icon: "⚡",
    },
    {
      targetSelector: "#transmit-edi-btn",
      titleHe: "שידור אלקטרוני וקבלת אישור 997 CONTRL",
      titleEn: "Transmit & 997 Functional Acknowledgment",
      descHe: "שדר בזמן אמת לשער סטורנקסט וקבל אישור קליטה אלקטרוני ישיר במרלו״ג הרשת.",
      descEn: "Simulate live electronic transmission and receive official StoreNext 997 CONTRL handshake acknowledgments.",
      position: "top",
      icon: "🚀",
    },
  ];

  return (
    <div
      dir={isHe ? "rtl" : "ltr"}
      className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8 selection:bg-emerald-500 selection:text-white"
    >
      {/* Tour Guide */}
      <TourGuide tourId="supermarket_edi_studio_tour" steps={tourSteps} lang={isHe ? "he" : "en"} autoStart={false} />

      {/* Top Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {isHe ? "קישוריות סטורנקסט ו-ERP רשתות" : "StoreNext & Retail ERP Gateways"}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                EDI 850 / 856 / 810
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {isHe ? "מחולל ממשקי EDI ו-ERP לרשתות שיווק קמעונאיות" : "Supermarket Chain ERP & EDI Connector Studio"}
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl">
              {isHe
                ? "הפקה ואימות אוטומטיים של מסרי סטורנקסט EDIFACT (D96A), SAP S/4HANA IDoc וממשקי פריוריטי להזמנות רכש (850), תעודות משלוח מרלו״ג (856 ASN), חשבוניות מס (810) ומניפסט משטחי GS1-128."
                : "Automated generation and compliance auditing of StoreNext EDIFACT (D96A), SAP S/4HANA IDocs, and Priority ERP interfaces for Purchase Orders (850), Inbound ASNs (856), Invoices (810), and SSCC-18 pallet manifests."}
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

            <button
              onClick={handleDownloadFile}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 font-medium text-sm border border-slate-700/80 transition shadow cursor-pointer"
            >
              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>{isHe ? "הורד קובץ" : "Download File"}</span>
            </button>

            <button
              id="transmit-edi-btn"
              onClick={handleSimulateTransmission}
              disabled={isTransmitting}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-medium text-sm shadow-lg shadow-emerald-950/40 transition-all border border-emerald-500/30 cursor-pointer"
            >
              {isTransmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{isHe ? "משדר לסטורנקסט..." : "Transmitting..."}</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>{isHe ? "שדר לשרת סטורנקסט / ERP" : "Transmit to StoreNext"}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Supermarket Chain Selector */}
        <div id="chain-selector-bar" className="mt-6">
          <p className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-2.5">
            {isHe ? "בחר רשת שיווק קמעונאית:" : "Select Supermarket Chain Profile:"}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {Object.values(SUPERMARKET_CHAINS).map((chain) => {
              const isSelected = chain.id === selectedChainId;
              return (
                <button
                  key={chain.id}
                  onClick={() => handleSelectChain(chain.id)}
                  className={`text-right p-3 rounded-xl border transition-all ${
                    isSelected
                      ? "bg-slate-900 border-emerald-500 ring-1 ring-emerald-500/40 shadow-lg shadow-emerald-950/30"
                      : "bg-slate-900/60 border-slate-800 hover:bg-slate-900 hover:border-slate-700 text-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700">
                      GLN: {chain.storeNextGln.slice(-5)}
                    </span>
                    {isSelected && <span className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-emerald-400/20" />}
                  </div>
                  <div className="font-bold text-xs text-white line-clamp-1">
                    {isHe ? chain.nameHe : chain.nameEn}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 line-clamp-1">
                    {chain.centralDistributionCenter.city} (תנאי {chain.preferredPaymentTermsDays}+)
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Document & Protocol Switcher */}
        <div id="doc-type-selector" className="mt-4 flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900/60 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2 overflow-x-auto text-xs">
            <span className="text-slate-400 font-semibold px-1">{isHe ? "מסמך:" : "Doc:"}</span>
            {(
              [
                { id: "EDI_856_DESADV", labelHe: "תעודת משלוח מרלו״ג (856 ASN)", labelEn: "Inbound ASN (856)" },
                { id: "EDI_850_ORDERS", labelHe: "הזמנת רכש רשת (850 PO)", labelEn: "Purchase Order (850)" },
                { id: "EDI_810_INVOIC", labelHe: "חשבונית מס מרכזת (810 INV)", labelEn: "Tax Invoice (810)" },
              ] as const
            ).map((doc) => (
              <button
                key={doc.id}
                onClick={() => setSelectedDocType(doc.id)}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  selectedDocType === doc.id
                    ? "bg-emerald-600 text-white font-bold"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {isHe ? doc.labelHe : doc.labelEn}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-semibold px-1">{isHe ? "פרוטוקול ERP:" : "Protocol:"}</span>
            {(
              [
                { id: "storenext_edifact", label: "StoreNext EDIFACT (D96A)" },
                { id: "sap_s4hana", label: "SAP S/4HANA (IDoc XML)" },
                { id: "priority_erp", label: "Priority ERP (CSV / OData)" },
              ] as const
            ).map((erp) => (
              <button
                key={erp.id}
                onClick={() => setSelectedErp(erp.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition ${
                  selectedErp === erp.id
                    ? "bg-blue-600 text-white font-bold"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {erp.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Grid: Parameters vs Live Formatted EDI Viewer */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 Cols): EDI Inputs & Metadata */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card: Consignment Logistics & Barcodes */}
          <div id="edi-parameters-card" className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span>{isHe ? "נתוני משלוח וברקודים GS1" : "Consignment & GS1 Barcodes"}</span>
              </h3>
              <span className="text-[11px] font-mono text-emerald-400 font-semibold">
                {currentChain.centralDistributionCenter.code}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              {/* PO Number & Delivery Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-medium block mb-1">
                    {isHe ? "מספר הזמנת רכש (PO):" : "PO Number:"}
                  </label>
                  <input
                    type="text"
                    value={poNumber}
                    onChange={(e) => setPoNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-medium block mb-1">
                    {isHe ? "תאריך אספקה מבוקש:" : "Delivery Date:"}
                  </label>
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Product Title & EAN Barcode */}
              <div>
                <label className="text-slate-400 font-medium block mb-1">
                  {isHe ? "תיאור פריט בעברית (לתעודת משלוח):" : "Product Hebrew Title:"}
                </label>
                <input
                  type="text"
                  value={productNameHe}
                  onChange={(e) => setProductNameHe(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-slate-400 font-medium">{isHe ? "ברקוד EAN-13:" : "EAN-13 Barcode:"}</label>
                    <span className="text-[10px] text-emerald-400 font-mono">GS1 Modulo-10</span>
                  </div>
                  <input
                    type="text"
                    value={ean13}
                    onChange={(e) => setEan13(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-medium block mb-1">
                    {isHe ? "מק״ט פנימי (SKU):" : "Internal SKU:"}
                  </label>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Quantities & Price */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800">
                <div>
                  <label className="text-slate-400 block mb-1">{isHe ? "סה״כ יחידות:" : "Total Units:"}</label>
                  <input
                    type="number"
                    value={totalUnits}
                    onChange={(e) => setTotalUnits(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">{isHe ? "משטחים (EPAL):" : "Pallets:"}</label>
                  <input
                    type="number"
                    value={palletCount}
                    onChange={(e) => setPalletCount(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">{isHe ? "מחיר סיטונאי (₪):" : "Wholesale (₪):"}</label>
                  <input
                    type="number"
                    step="0.01"
                    value={unitWholesalePriceIls}
                    onChange={(e) => setUnitWholesalePriceIls(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-emerald-500/50 rounded-lg px-2 py-1.5 text-emerald-400 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Maritime & Customs Cross References */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                <div>
                  <label className="text-slate-400 block mb-1">{isHe ? "מספר מכולה ימית:" : "Container ID:"}</label>
                  <input
                    type="text"
                    value={containerNumber}
                    onChange={(e) => setContainerNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">{isHe ? "שטר מטען (B/L):" : "Bill of Lading:"}</label>
                  <input
                    type="text"
                    value={billOfLading}
                    onChange={(e) => setBillOfLading(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
                  />
                </div>
              </div>

              {/* Batch & MOH Pass */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">{isHe ? "מספר אצווה (LOT):" : "Batch / LOT:"}</label>
                  <input
                    type="text"
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">
                    {isHe ? "אישור שירות המזון (MOH):" : "MOH Green Pass Ref:"}
                  </label>
                  <input
                    type="text"
                    value={mohGreenPassRef}
                    onChange={(e) => setMohGreenPassRef(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-emerald-400 font-mono text-[11px]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Validation Status Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-xs space-y-2">
            <div className="flex items-center justify-between font-bold">
              <span className="text-slate-300 flex items-center gap-1.5">
                <span className={ediResult.isValid ? "text-emerald-400" : "text-red-400"}>
                  {ediResult.isValid ? "✓" : "⚠"}
                </span>
                <span>{isHe ? "בדיקת תאימות תקני EDI ו-GS1:" : "EDI & GS1 Validation Audit:"}</span>
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                  ediResult.isValid
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "bg-red-500/20 text-red-300 border border-red-500/30"
                }`}
              >
                {ediResult.isValid ? "100% VALIDATED" : "ISSUES FOUND"}
              </span>
            </div>

            {ediResult.validationIssues.length === 0 ? (
              <p className="text-slate-400 text-[11px]">
                {isHe
                  ? "כל השדות, ספרי הביקורת של GS1, ספרת ביקורת Modulo-10 ומבנה המכולה תואמים במלואם."
                  : "All GS1 Modulo-10 checksums, container IDs and tax calculations match retail EDI specifications."}
              </p>
            ) : (
              <div className="space-y-1 pt-1">
                {ediResult.validationIssues.map((issue, idx) => (
                  <div
                    key={idx}
                    className={`p-2 rounded-lg text-[11px] ${
                      issue.severity === "ERROR"
                        ? "bg-red-950/40 text-red-300 border border-red-500/30"
                        : "bg-amber-950/40 text-amber-300 border border-amber-500/30"
                    }`}
                  >
                    <strong>[{issue.severity}]</strong> {isHe ? issue.messageHe : issue.messageEn}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (7 Cols): Live Code Output & Transmission */}
        <div className="lg:col-span-7 space-y-6">
          {/* EDI Code Viewer */}
          <div id="edi-code-viewer" className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col">
            {/* Viewer Toolbar */}
            <div className="px-5 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span className="font-mono text-xs font-bold text-white">{ediResult.fileName}</span>
                <span className="text-[10px] font-mono text-slate-500 uppercase px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                  {ediResult.formatType}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyRaw}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition flex items-center gap-1 cursor-pointer"
                >
                  {copiedRaw ? (
                    <>
                      <span className="text-emerald-400">✓</span>
                      <span>{isHe ? "הועתק!" : "Copied!"}</span>
                    </>
                  ) : (
                    <>
                      <span>📋</span>
                      <span>{isHe ? "העתק" : "Copy"}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Code Body */}
            <div className="p-4 bg-slate-950/90 overflow-x-auto max-h-[460px] font-mono text-xs leading-relaxed text-slate-200">
              <pre className="whitespace-pre">{ediResult.formattedContent}</pre>
            </div>

            {/* Financial Summary Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-slate-500">{isHe ? "סה״כ נטו:" : "Net Total:"}</span>{" "}
                  <strong className="text-slate-200 font-mono">₪{ediResult.totalNetAmountIls.toLocaleString()}</strong>
                </div>
                <div>
                  <span className="text-slate-500">{isHe ? "מע״מ 18%:" : "VAT 18%:"}</span>{" "}
                  <strong className="text-slate-200 font-mono">₪{ediResult.vatAmountIls.toLocaleString()}</strong>
                </div>
                <div>
                  <span className="text-slate-500">{isHe ? "לתשלום כולל:" : "Gross Total:"}</span>{" "}
                  <strong className="text-emerald-400 font-mono text-sm">₪{ediResult.totalGrossAmountIls.toLocaleString()}</strong>
                </div>
              </div>

              <div className="text-[11px] font-mono text-slate-500">
                ICN: {ediResult.interchangeControlNumber}
              </div>
            </div>
          </div>

          {/* Handshake Transmission Acknowledgment Banner (When triggered) */}
          {transmissionAck && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/70 via-slate-900 to-teal-950/70 border border-emerald-500/40 text-emerald-200 text-xs shadow-xl animate-fade-in">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🎉</span>
                  <div>
                    <div className="font-bold text-white text-sm">
                      {isHe ? "אישור קליטה אלקטרוני (CONTRL / 997 ACK) התקבל בהצלחה!" : "Electronic Handshake 997 CONTRL ACK Received!"}
                    </div>
                    <div className="text-emerald-300 mt-0.5">{transmissionAck.message}</div>
                  </div>
                </div>
                <div className="text-right font-mono text-[11px] text-slate-400">
                  <div>{transmissionAck.gatewayId}</div>
                  <div>{transmissionAck.timestamp}</div>
                </div>
              </div>
            </div>
          )}

          {/* Pallet SSCC-18 Barcode Manifest Preview */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-xs space-y-2">
            <div className="flex items-center justify-between font-bold text-slate-300">
              <span>{isHe ? "מניפסט משטחי GS1-128 (סריאליזציית SSCC-18 ל-24 משטחים):" : "GS1-128 SSCC-18 Pallet Serialization Manifest:"}</span>
              <span className="text-teal-400 font-mono">{palletCount} Euro Pallets</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
              <div className="p-2 rounded bg-slate-950 border border-slate-800 flex justify-between">
                <span className="text-slate-500">Pallet #01:</span>
                <span className="text-emerald-400 font-bold">{generateSscc18PalletCode("7290001009988", 1)}</span>
              </div>
              <div className="p-2 rounded bg-slate-950 border border-slate-800 flex justify-between">
                <span className="text-slate-500">Pallet #02:</span>
                <span className="text-emerald-400 font-bold">{generateSscc18PalletCode("7290001009988", 2)}</span>
              </div>
              <div className="p-2 rounded bg-slate-950 border border-slate-800 flex justify-between">
                <span className="text-slate-500">Pallet #03:</span>
                <span className="text-emerald-400 font-bold">{generateSscc18PalletCode("7290001009988", 3)}</span>
              </div>
              <div className="p-2 rounded bg-slate-950 border border-slate-800 flex justify-between">
                <span className="text-slate-500">Pallet #24:</span>
                <span className="text-emerald-400 font-bold">{generateSscc18PalletCode("7290001009988", 24)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
