"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { type DealRecord, signCommercialDeal } from "@/app/admin/deals/actions";
import { generatePriorityErpCsv } from "@/lib/documents/erpAsnGenerator";

interface Props {
  deal: DealRecord;
}

export default function ProFormaViewer({ deal: initialDeal }: Props) {
  const [deal, setDeal] = useState<DealRecord>(initialDeal);
  const [lang, setLang] = useState<"en" | "he">("en");

  // Signer inputs
  const [signerName, setSignerName] = useState(deal.buyerContact || "");
  const [signerTitle, setSignerTitle] = useState("Chief Procurement Officer / VP Sourcing");
  const [signingRole, setSigningRole] = useState<"buyer" | "supplier">("buyer");
  const [isSigning, setIsSigning] = useState(false);
  const [signSuccess, setSignSuccess] = useState(false);

  // Touch & Mouse Canvas Signature
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [savedSignatureUrl, setSavedSignatureUrl] = useState<string | null>(null);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1e3a8a"; // deep blue ink
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const startDrawingTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || e.touches.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    ctx.beginPath();
    ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1e3a8a";
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const drawTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || e.touches.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
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
    setHasDrawn(false);
    setSavedSignatureUrl(null);
  };

  const ilsValue = Math.round(deal.grossContractValue * 4.05);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadErpCsv = () => {
    const payload = {
      poNumber: deal.poNumber,
      poDate: deal.poDate,
      buyerCompany: deal.buyerCompany,
      supplierFactory: deal.supplierName,
      originCountry: deal.supplierCountry,
      productName: deal.productName,
      hebrewName: deal.productHebrewName || deal.productName,
      skuCode: `FDX-${deal.poNumber.slice(-5)}`,
      eanBarcode: "8001234567890",
      containerNumber: deal.containerNumber || "MEDU8829103",
      billOfLading: deal.billOfLading || "MSCU-884920",
      customsDeclarationNumber: deal.customsDeclaration || `IL-2604-${deal.poNumber.slice(-4)}`,
      palletCount: deal.palletCount,
      totalUnits: deal.totalUnits,
      unitsPerPallet: Math.round(deal.totalUnits / deal.palletCount),
      netWeightKgPerUnit: 0.5,
      grossWeightKgPerUnit: 0.54,
      storageTemp: "+18°C Dry Ambient",
      batchNumber: `LOT-${deal.poNumber.slice(-4)}-26`,
      expiryDate: "30/06/2027",
    };

    const csvContent = generatePriorityErpCsv(payload);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Priority_ERP_ASN_${deal.poNumber}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSignContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signerName.trim() || !signerTitle.trim()) {
      alert("Please enter full signer name and title.");
      return;
    }

    setIsSigning(true);
    const res = await signCommercialDeal(deal.id, signingRole, signerName, signerTitle);
    setIsSigning(false);

    if (res.ok) {
      if (hasDrawn && canvasRef.current) {
        try {
          const dataUrl = canvasRef.current.toDataURL("image/png");
          setSavedSignatureUrl(dataUrl);
        } catch {}
      }

      setSignSuccess(true);
      const now = new Date().toISOString();
      if (signingRole === "buyer") {
        setDeal((prev) => ({
          ...prev,
          buyerSigned: true,
          buyerSignedAt: now,
          buyerSignerName: `${signerName} (${signerTitle})`,
        }));
      } else {
        setDeal((prev) => ({
          ...prev,
          supplierSigned: true,
          supplierSignedAt: now,
          supplierSignerName: `${signerName} (${signerTitle})`,
        }));
      }
    } else {
      alert(`Signature failed: ${res.error}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 sm:px-6 lg:px-8 text-slate-800">
      {/* ACTION BAR (HIDDEN IN PRINT) */}
      <div className="print:hidden max-w-5xl mx-auto mb-6 bg-slate-900 text-white rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/deals"
            className="text-xs font-medium text-slate-400 hover:text-white flex items-center gap-1 transition"
          >
            ← Back to Deals Desk
          </Link>
          <span className="text-slate-600">|</span>
          <span className="font-mono text-xs font-bold text-orange-400 bg-orange-500/10 border border-orange-500/30 px-2.5 py-1 rounded-lg">
            {deal.poNumber}
          </span>
          <span className="text-xs text-slate-300">
            Status: <strong className="text-white capitalize">{deal.currentStage.replace(/_/g, " ")}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Bilingual Switch */}
          <div className="bg-slate-800 p-0.5 rounded-xl border border-slate-700 flex text-xs">
            <button
              onClick={() => setLang("en")}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${lang === "en" ? "bg-orange-500 text-white" : "text-slate-400 hover:text-white"}`}
            >
              EN
            </button>
            <button
              onClick={() => setLang("he")}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${lang === "he" ? "bg-orange-500 text-white" : "text-slate-400 hover:text-white"}`}
            >
              עברית
            </button>
          </div>

          <button
            onClick={handleDownloadErpCsv}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-medium rounded-xl border border-slate-700 transition flex items-center gap-1.5"
            title="Download Priority ERP manifest"
          >
            <span>📥</span>
            <span>Priority ERP</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-xl shadow-md transition flex items-center gap-1.5"
          >
            <span>🖨️</span>
            <span>Download Official PDF / Print</span>
          </button>
        </div>
      </div>

      {/* DOCUMENT CONTAINER (OFFICIAL A4 B2B CONTRACT) */}
      <div
        className="max-w-5xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-200 p-8 sm:p-12 print:p-0 print:border-none print:shadow-none print:rounded-none"
        dir={lang === "he" ? "rtl" : "ltr"}
      >
        {/* HEADER SECTION */}
        <div className="flex flex-col sm:flex-row justify-between items-start border-b-2 border-slate-900 pb-6 gap-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black tracking-tighter text-slate-900">
                FOOD<span className="text-orange-500">X</span>CHANGE
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-900 text-white px-2 py-0.5 rounded-sm">
                B2B DEAL DESK
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Global B2B Food Trading & Escrow Settlement Platform
              <br />
              Rothschild Blvd 22, Tel Aviv-Yafo, Israel | ESCROW ID: IL-FDX-8820
            </p>
          </div>

          <div className="text-right sm:text-right" dir="ltr">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
              COMMERCIAL PRO-FORMA INVOICE
            </h1>
            <p className="text-xs font-bold text-orange-600 uppercase tracking-wider">
              Binding International Sales Contract
            </p>
            <div className="mt-2 text-xs space-y-0.5 text-slate-600 font-mono">
              <p>
                <strong>Pro-Forma #:</strong> <span className="text-slate-900 font-bold">{deal.poNumber}</span>
              </p>
              <p>
                <strong>Issue Date:</strong> {deal.poDate}
              </p>
              <p>
                <strong>Validity:</strong> 14 Days from Issue (FX & Freight Locked)
              </p>
              <p>
                <strong>Incoterms:</strong> {deal.incoterms}
              </p>
            </div>
          </div>
        </div>

        {/* PARTIES SECTION (SELLER & BUYER) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6 border-b border-slate-200 text-xs">
          {/* SELLER / EXPORTER */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              SELLER / EXPORTER (EUROPEAN PRODUCER)
            </p>
            <p className="text-sm font-bold text-slate-900">{deal.supplierName}</p>
            <p className="text-slate-600">Location & Origin: {deal.supplierCountry}</p>
            <p className="text-slate-600">Port of Loading: {deal.portOfOrigin || "Port of Genoa / Valencia"}</p>
            <p className="text-slate-600 font-mono">Factory EU Approval: IT-08-542/CE (Veterinary Clean)</p>
            {deal.supplierIban && (
              <p className="text-slate-600 font-mono pt-1 text-[11px]">
                <strong>Factory IBAN:</strong> {deal.supplierIban}
              </p>
            )}
          </div>

          {/* BUYER / IMPORTER */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              BUYER / IMPORTER (ISRAELI RETAIL CHAIN)
            </p>
            <p className="text-sm font-bold text-slate-900">{deal.buyerCompany}</p>
            <p className="text-slate-600">Registration / VAT ID (ח.פ.): <span className="font-mono">{deal.buyerVat || "51-584920-1"}</span></p>
            <p className="text-slate-600">Authorized Procurement Lead: {deal.buyerContact || "Commercial Buying Officer"}</p>
            <p className="text-slate-600">Email: {deal.buyerEmail || "import@retail.co.il"}</p>
            <p className="text-slate-600">Port of Discharge: {deal.portOfDestination || "Port of Ashdod, Israel"}</p>
          </div>
        </div>

        {/* PRODUCTS & PACKAGING SPECIFICATION TABLE */}
        <div className="py-6 border-b border-slate-200">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3">
            1. ORDER SPECIFICATION & COMMERCIAL VALUE
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-semibold">
                  <th className="py-2.5 px-3">Item #</th>
                  <th className="py-2.5 px-3">Description & MoH Title</th>
                  <th className="py-2.5 px-3 text-center">Packaging Spec</th>
                  <th className="py-2.5 px-3 text-center">Pallets</th>
                  <th className="py-2.5 px-3 text-right">Total Units</th>
                  <th className="py-2.5 px-3 text-right">Unit Price (CIF)</th>
                  <th className="py-2.5 px-3 text-right">Total (EUR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr className="hover:bg-slate-50/80">
                  <td className="py-3 px-3 font-mono text-slate-500">01</td>
                  <td className="py-3 px-3">
                    <p className="font-bold text-slate-900">{deal.productName}</p>
                    <p className="text-[11px] text-slate-500 font-medium">{deal.productHebrewName}</p>
                    <div className="flex items-center gap-2 mt-1 text-[10px]">
                      <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-xs font-medium">
                        {deal.kosherStandard}
                      </span>
                      <span className="bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded-xs font-medium">
                        SI 1145 Compliant
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-center text-slate-600">
                    {deal.unitsPerCarton} units/box
                    <br />
                    {deal.cartonsPerPallet} boxes/pallet
                  </td>
                  <td className="py-3 px-3 text-center font-bold text-slate-900">{deal.palletCount} EPAL</td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                    {deal.totalUnits.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-700">
                    €{deal.buyerUnitPrice.toFixed(2)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                    €{deal.grossContractValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-900 font-bold">
                  <td colSpan={4} className="py-3 px-3 text-right uppercase tracking-wider text-slate-700">
                    Total Contract Value (CIF Ashdod/Haifa):
                  </td>
                  <td className="py-3 px-3 text-right font-mono">{deal.totalUnits.toLocaleString()}</td>
                  <td className="py-3 px-3 text-right font-mono">—</td>
                  <td className="py-3 px-3 text-right font-mono text-base text-slate-900">
                    €{deal.grossContractValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
                <tr className="bg-slate-100 text-slate-600 text-[11px]">
                  <td colSpan={7} className="py-2 px-3 text-right font-medium">
                    Equivalent in Israeli Shekels (FX locked at 4.05 ILS/EUR): ≈ ₪{ilsValue.toLocaleString()} (Excl. VAT)
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* CONTAINER & LOGISTICS METRICS */}
        <div className="py-6 border-b border-slate-200 text-xs">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3">
            2. CONTAINER & SHIPPING METRICS
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <p className="text-slate-500 text-[10px] uppercase">Container Configuration</p>
              <p className="font-bold text-slate-900 mt-0.5">{deal.containerType.replace("_", " ").toUpperCase()}</p>
            </div>
            <div>
              <p className="text-slate-500 text-[10px] uppercase">Pallet Count</p>
              <p className="font-bold text-slate-900 mt-0.5">{deal.palletCount} Euro Pallets (120x80cm)</p>
            </div>
            <div>
              <p className="text-slate-500 text-[10px] uppercase">Gross Cargo Weight</p>
              <p className="font-bold text-slate-900 mt-0.5">{deal.grossWeightKg.toLocaleString()} kg</p>
            </div>
            <div>
              <p className="text-slate-500 text-[10px] uppercase">Est. Ocean Transit</p>
              <p className="font-bold text-slate-900 mt-0.5">11-13 Days (Direct Sea Route)</p>
            </div>
          </div>
        </div>

        {/* ESCROW PAYMENT TERMS & BANKING SCHEDULE */}
        <div className="py-6 border-b border-slate-200 text-xs space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
            3. ESCROW PAYMENT SCHEDULE (30% / 70% SECURITY PROTOCOL)
          </h2>
          <p className="text-slate-600 leading-relaxed">
            All payments are safeguarded through FoodXchange Global Escrow. Capital is released to the European factory strictly upon verified production and shipping milestones:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* MILESTONE 1: 30% DEPOSIT */}
            <div className="border border-amber-300 bg-amber-50/50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-amber-900 text-sm">Milestone 1: 30% Advance Deposit</span>
                <span className="font-mono font-bold text-amber-800 text-sm">
                  €{deal.advanceDeposit30.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                • Due within 5 business days of Pro-Forma signing.
                <br />
                • Releases factory production queue, raw materials procurement, and Chief Rabbinate kosher supervisor scheduling.
              </p>
              <div className="pt-1">
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-amber-200 text-amber-900 rounded-xs">
                  Trigger: Signed Pro-Forma Contract
                </span>
              </div>
            </div>

            {/* MILESTONE 2: 70% BALANCE */}
            <div className="border border-cyan-300 bg-cyan-50/50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-cyan-900 text-sm">Milestone 2: 70% Balance Against B/L</span>
                <span className="font-mono font-bold text-cyan-800 text-sm">
                  €{deal.balanceAgainstBl70.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                • Payable upon presentation of original Clean On-Board Bill of Lading (B/L), EU Health Certificate, and Packing List.
                <br />
                • Releases original shipping documents to the Israeli Customs Broker for port clearance.
              </p>
              <div className="pt-1">
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-cyan-200 text-cyan-900 rounded-xs">
                  Trigger: Cargo Vessel Departure Scan
                </span>
              </div>
            </div>
          </div>

          {/* BANK WIRE ESCROW COORDINATES */}
          <div className="bg-slate-900 text-white rounded-xl p-4 text-xs font-mono space-y-1">
            <p className="text-orange-400 font-bold text-[11px] uppercase tracking-wider">
              FoodXchange International Escrow Bank Account:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
              <div>
                <span className="text-slate-400 block">Beneficiary:</span>
                <span className="text-white">FoodXchange Escrow Desk Ltd</span>
              </div>
              <div>
                <span className="text-slate-400 block">IBAN:</span>
                <span className="text-white">IL560128820000002604819</span>
              </div>
              <div>
                <span className="text-slate-400 block">SWIFT / BIC:</span>
                <span className="text-white">POALILITTLV</span>
              </div>
            </div>
            <p className="text-slate-400 text-[10px] pt-1 font-sans">
              * Payment Reference: <strong className="text-white font-mono">{deal.poNumber}</strong>
            </p>
          </div>
        </div>

        {/* REGULATORY & STATUTORY GUARANTEES */}
        <div className="py-6 border-b border-slate-200 text-xs space-y-2 text-slate-600">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
            4. REGULATORY, KOSHER & STATUTORY COMPLIANCE ANNEX
          </h2>
          <ul className="list-disc pl-5 space-y-1 text-[11px]">
            <li>
              <strong>Israeli Standard SI 1145:</strong> Exporter guarantees compliance with Ministry of Health SI 1145 labeling, including nutritional facts panel, ingredient breakdown in descending order, allergen declarations bolded, and red front-of-pack warning stamps if sugar, sodium, or saturated fat exceed regulatory thresholds.
            </li>
            <li>
              <strong>Kosher Certification:</strong> The production run is supervised under {deal.kosherStandard}. Kosher batch certificates will accompany the vessel manifest.
            </li>
            <li>
              <strong>Shelf Life Guarantee:</strong> The supplier guarantees that upon arrival at the Port of Ashdod / Haifa, products shall retain no less than 75% of their total stated shelf-life.
            </li>
            <li>
              <strong>Jurisdiction & Dispute:</strong> This commercial agreement is governed by the International Chamber of Commerce (ICC) arbitration rules and Incoterms 2020.
            </li>
          </ul>
        </div>

        {/* SIGNATURE & EXECUTION SECTION */}
        <div className="pt-6 text-xs space-y-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
            5. CONTRACT EXECUTION & BINDING SIGNATURES
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* BUYER SIGNATURE BOX */}
            <div className="border-2 border-slate-200 rounded-xl p-4 flex flex-col justify-between min-h-[170px] bg-slate-50/50">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  ACCEPTED & CONFIRMED BY BUYER
                </p>
                <p className="font-bold text-slate-900 mt-1">{deal.buyerCompany}</p>
              </div>

              {deal.buyerSigned ? (
                <div className="bg-emerald-50 border border-emerald-300 p-2.5 rounded-lg text-center space-y-0.5">
                  <span className="text-emerald-700 font-bold block text-xs">✓ DIGITALLY SIGNED & EXECUTED</span>
                  {savedSignatureUrl && signingRole === "buyer" && (
                    <img src={savedSignatureUrl} alt="Buyer Signature" className="h-10 mx-auto object-contain my-1 border-b border-emerald-200" />
                  )}
                  <p className="text-[10px] text-emerald-800 font-medium">{deal.buyerSignerName}</p>
                  <p className="text-[9px] text-slate-500 font-mono">{deal.buyerSignedAt?.slice(0, 19).replace("T", " ")} UTC</p>
                </div>
              ) : (
                <div className="border border-dashed border-slate-300 p-3 rounded-lg text-center">
                  <span className="text-slate-400 block text-[11px]">Awaiting Buyer Signature</span>
                </div>
              )}

              <p className="text-[10px] text-slate-400 pt-2 border-t border-slate-200">
                Authorized Officer Signature & Seal
              </p>
            </div>

            {/* SELLER SIGNATURE BOX */}
            <div className="border-2 border-slate-200 rounded-xl p-4 flex flex-col justify-between min-h-[170px] bg-slate-50/50">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  ACCEPTED & CONFIRMED BY SELLER
                </p>
                <p className="font-bold text-slate-900 mt-1">{deal.supplierName}</p>
              </div>

              {deal.supplierSigned ? (
                <div className="bg-emerald-50 border border-emerald-300 p-2.5 rounded-lg text-center space-y-0.5">
                  <span className="text-emerald-700 font-bold block text-xs">✓ DIGITALLY SIGNED & EXECUTED</span>
                  {savedSignatureUrl && signingRole === "supplier" && (
                    <img src={savedSignatureUrl} alt="Seller Signature" className="h-10 mx-auto object-contain my-1 border-b border-emerald-200" />
                  )}
                  <p className="text-[10px] text-emerald-800 font-medium">{deal.supplierSignerName}</p>
                  <p className="text-[9px] text-slate-500 font-mono">{deal.supplierSignedAt?.slice(0, 19).replace("T", " ")} UTC</p>
                </div>
              ) : (
                <div className="border border-dashed border-slate-300 p-3 rounded-lg text-center">
                  <span className="text-slate-400 block text-[11px]">Awaiting Factory Signature</span>
                </div>
              )}

              <p className="text-[10px] text-slate-400 pt-2 border-t border-slate-200">
                Authorized Factory Director Signature & Seal
              </p>
            </div>

            {/* ESCROW BROKER SEAL */}
            <div className="border-2 border-slate-200 rounded-xl p-4 flex flex-col justify-between min-h-[170px] bg-slate-50/50">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  ESCROW BROKERAGE CLEARANCE
                </p>
                <p className="font-bold text-slate-900 mt-1">FoodXchange Deal Desk</p>
              </div>

              <div className="bg-orange-50 border border-orange-200 p-2.5 rounded-lg text-center space-y-0.5">
                <span className="text-orange-700 font-bold block text-xs">🔒 ESCROW PROTOCOL ACTIVE</span>
                <p className="text-[10px] text-orange-800 font-medium">30/70 Wire Milestones Enforced</p>
                <p className="text-[9px] text-slate-500 font-mono">HASH: SHA256-FDX-{deal.poNumber}</p>
              </div>

              <p className="text-[10px] text-slate-400 pt-2 border-t border-slate-200">
                Official Escrow Officer Verification
              </p>
            </div>
          </div>

          {/* INTERACTIVE E-SIGN BOX (IF NOT YET SIGNED BY VIEWER) */}
          {(!deal.buyerSigned || !deal.supplierSigned) && (
            <div id="signature-section" className="print:hidden bg-slate-900 text-white p-6 rounded-2xl shadow-xl mt-6 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">✍️</span>
                <div>
                  <h3 className="font-bold text-sm text-white">Execute Digital Commercial Signature</h3>
                  <p className="text-xs text-slate-400">
                    Signing below electronically confirms acceptance of the Pro-Forma terms and activates the 30% wire escrow milestone.
                  </p>
                </div>
              </div>

              {signSuccess && (
                <div className="bg-emerald-500/20 border border-emerald-500/40 p-3 rounded-xl text-emerald-300 text-xs">
                  ✓ Signature successfully registered and sealed with cryptographic timestamp!
                </div>
              )}

              <form onSubmit={handleSignContract} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Your Full Legal Name</label>
                  <input
                    type="text"
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    required
                    placeholder="e.g. David Levi"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Your Corporate Title</label>
                  <input
                    type="text"
                    value={signerTitle}
                    onChange={(e) => setSignerTitle(e.target.value)}
                    required
                    placeholder="e.g. VP Commercial Procurement"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Signing On Behalf Of</label>
                  <select
                    value={signingRole}
                    onChange={(e) => setSigningRole(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-orange-500"
                  >
                    <option value="buyer">Buyer: {deal.buyerCompany}</option>
                    <option value="supplier">Seller / Factory: {deal.supplierName}</option>
                  </select>
                </div>

                {/* Touch / Stylus Drawing Canvas */}
                <div className="sm:col-span-3 space-y-1.5 pt-2">
                  <div className="flex justify-between items-center text-slate-400">
                    <label className="flex items-center gap-1.5 font-medium">
                      <span>✍️</span>
                      <span>
                        {lang === "he"
                          ? "חתימת אצבע / עט מגע / עכבר ישירות על המסך:"
                          : "Draw Legal Signature (Touch / Finger / Stylus):"}
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={clearCanvas}
                      className="text-[10px] text-amber-400 hover:text-amber-300 font-semibold underline cursor-pointer"
                    >
                      {lang === "he" ? "נקה לוח" : "Clear Pad"}
                    </button>
                  </div>
                  <div className="relative bg-white rounded-xl border border-slate-700 overflow-hidden shadow-inner">
                    <canvas
                      ref={canvasRef}
                      width={600}
                      height={120}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawingTouch}
                      onTouchMove={drawTouch}
                      onTouchEnd={stopDrawing}
                      className="w-full h-28 bg-white cursor-crosshair touch-none"
                    />
                    {!hasDrawn && (
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-slate-400/60 text-xs italic">
                        {lang === "he"
                          ? "חתום כאן באצבע או בעט מגע..."
                          : "Draw your signature here with finger or mouse..."}
                      </div>
                    )}
                  </div>
                </div>

                <div className="sm:col-span-3 flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isSigning}
                    className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold rounded-xl text-xs shadow-lg shadow-orange-500/20 transition disabled:opacity-50"
                  >
                    {isSigning ? "Registering Signature..." : "Confirm & Execute Binding Pro-Forma ✍️"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* ── STICKY MOBILE ACTION DOCK (ANCHORED AT BOTTOM OF SCREEN) ── */}
      <div
        className="fixed bottom-0 inset-x-0 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800 p-3 z-40 sm:hidden print:hidden shadow-2xl flex items-center justify-between gap-2"
        dir={lang === "he" ? "rtl" : "ltr"}
      >
        <div className="min-w-0 flex-1">
          <p className="text-[10px] text-slate-400 font-mono truncate">
            {deal.poNumber} · <strong className="text-white">€{deal.grossContractValue.toLocaleString()}</strong>
          </p>
          <p className="text-[11px] text-amber-400 font-bold truncate">
            {lang === "he" ? "30% מקדמה: " : "30% Wire: "}€{deal.advanceDeposit30.toLocaleString()}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              const el = document.getElementById("signature-section");
              el?.scrollIntoView({ behavior: "smooth" });
            }}
            className="px-3.5 py-2 bg-gradient-to-r from-orange-500 to-amber-500 active:from-orange-600 active:to-amber-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-orange-500/30 transition flex items-center gap-1.5"
          >
            <span>✍️</span>
            <span>{deal.buyerSigned ? (lang === "he" ? "הסכם נחתם ✓" : "Signed ✓") : (lang === "he" ? "חתימה על הזמנה" : "Sign PO")}</span>
          </button>

          <button
            onClick={handlePrint}
            className="p-2 bg-slate-800 text-slate-200 border border-slate-700 rounded-xl text-xs active:scale-95 transition"
            title="Download PDF"
          >
            🖨️
          </button>
        </div>
      </div>
    </div>
  );
}
