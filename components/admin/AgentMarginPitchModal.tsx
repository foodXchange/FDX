"use client";

import { useState, useTransition } from "react";
import type { ComparisonSupplier } from "./ProductComparisonMatrix";
import {
  type AgentQuotationMargin,
  saveAgentQuotationMargin,
} from "@/app/admin/requests/actions";

interface Props {
  requestId: string;
  buyerCompany: string;
  supplier: ComparisonSupplier;
  benchmark: {
    productName: string;
    benchmarkBrand?: string | null;
    category?: string | null;
    netWeight?: string | null;
    packagingFormat?: string | null;
    targetPrice?: string | null;
    targetVolume?: string | null;
    certifications: string[];
    imageUrl?: string | null;
  };
  onClose: () => void;
  onSaved: (margin: AgentQuotationMargin) => void;
}

type TabMode = "economics" | "whatsapp" | "proforma";

export default function AgentMarginPitchModal({
  requestId,
  buyerCompany,
  supplier,
  benchmark,
  onClose,
  onSaved,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabMode>("economics");
  const [isPending, startTransition] = useTransition();
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // Existing margin or defaults
  const existingMargin = supplier.agent_margin;
  const initialFactoryCost = supplier.quote?.unit_price ?? 0.82;
  const [factoryCost, setFactoryCost] = useState<number>(existingMargin?.factory_cost ?? initialFactoryCost);
  const [marginType, setMarginType] = useState<"markup" | "percentage">(
    existingMargin?.margin_type ?? "markup"
  );
  const [marginValue, setMarginValue] = useState<number>(
    existingMargin?.margin_value ?? (marginType === "markup" ? 0.1 : 12)
  );
  const [containerUnits, setContainerUnits] = useState<number>(
    existingMargin?.container_units ?? 24000
  );
  const [currency, setCurrency] = useState<string>(existingMargin?.currency ?? supplier.quote?.currency ?? "EUR");
  const [incoterms, setIncoterms] = useState<string>(
    existingMargin?.incoterms ?? supplier.quote?.incoterm ?? "CIF Ashdod Port"
  );
  const [paymentTerms, setPaymentTerms] = useState<string>(
    existingMargin?.payment_terms ?? "30% Deposit upon PO, 70% against shipping documents (B/L)"
  );
  const [validDays, setValidDays] = useState<number>(existingMargin?.valid_days ?? 14);
  const [notes, setNotes] = useState<string>(existingMargin?.notes ?? "");
  const [pitchLanguage, setPitchLanguage] = useState<"he" | "en">("he");

  // Calculated buyer quoted price
  const buyerQuotedPrice =
    marginType === "markup"
      ? Number((factoryCost + marginValue).toFixed(3))
      : Number((factoryCost * (1 + marginValue / 100)).toFixed(3));

  const perUnitSpread = Number((buyerQuotedPrice - factoryCost).toFixed(3));
  const factoryTotalEur = Number((factoryCost * containerUnits).toFixed(2));
  const buyerTotalEur = Number((buyerQuotedPrice * containerUnits).toFixed(2));
  const containerProfitEur = Math.round(buyerTotalEur - factoryTotalEur);
  const marginPercentage = factoryCost > 0 ? Number(((perUnitSpread / factoryCost) * 100).toFixed(1)) : 0;

  const quoteRef = `FDX-QT-${requestId.slice(0, 8).toUpperCase()}-${supplier.matchId.slice(0, 4).toUpperCase()}`;

  function handleSave() {
    startTransition(async () => {
      const payload: AgentQuotationMargin = {
        margin_type: marginType,
        margin_value: marginValue,
        factory_cost: factoryCost,
        buyer_quoted_price: buyerQuotedPrice,
        currency,
        container_units: containerUnits,
        container_profit_eur: containerProfitEur,
        payment_terms: paymentTerms,
        incoterms,
        valid_days: validDays,
        notes,
      };

      const res = await saveAgentQuotationMargin(supplier.matchId, payload);
      if (res.ok) {
        onSaved(payload);
        setCopyFeedback("✓ Margin saved to deal successfully!");
        setTimeout(() => setCopyFeedback(null), 3000);
      }
    });
  }

  // WhatsApp Pitch Text
  const whatsappHebrew = `שלום ${buyerCompany},
בשורות מצוינות לגבי איתור המוצר: *${benchmark.productName}*!
איתרנו הצעה מעולה ממפעל אירופאי מוביל עם התאמה גבוהה (${supplier.matchScore}%) למפרט שביקשתם.

*פרטי ההצעה המסחרית:*
▫️ *מחיר ליחידה:* €${buyerQuotedPrice.toFixed(2)} ${incoterms}
▫️ *אריזה ומשקל:* ${supplier.quote?.net_weight || benchmark.netWeight || "1L"} (${supplier.quote?.packaging_format || benchmark.packagingFormat || "אריזת מדף"})
▫️ *כשרות:* ${supplier.quote?.kosher_type || "כשר בהשגחת הרבנות הראשית"}
▫️ *תקני איכות בינלאומיים:* ${(supplier.quote?.certifications || ["BRC", "IFS"]).join(", ")}
▫️ *כמות למכולה:* ${containerUnits.toLocaleString()} יחידות (FCL 40ft)
▫️ *זמן אספקה לייצור:* ${supplier.quote?.lead_time_weeks || 3} שבועות
▫️ *תנאי תשלום:* ${paymentTerms}

📦 *שילוח דוגמאות:*
דוגמאות מוכנות לשילוח מהיר עם בלדרות בינלאומית (DHL/FedEx) לצורך טעימות, בדיקת מרקם ואישור סנסורי שלכם.

האם תרצו שננחה את המפעל להוציא אליכם מארז דוגמאות השבוע?`;

  const whatsappEnglish = `Hello ${buyerCompany},
Great news regarding your sourcing inquiry for *${benchmark.productName}*!
We have matched a top-tier European certified manufacturer (${supplier.matchScore}% benchmark match) matching your exact private label requirements.

*Commercial Offer Highlights:*
▫️ *Unit Price:* €${buyerQuotedPrice.toFixed(2)} ${incoterms}
▫️ *Packaging & Weight:* ${supplier.quote?.net_weight || benchmark.netWeight || "1L"} (${supplier.quote?.packaging_format || benchmark.packagingFormat || "Retail Pack"})
▫️ *Kosher Supervision:* ${supplier.quote?.kosher_type || "Kosher certified"}
▫️ *Quality Standards:* ${(supplier.quote?.certifications || ["BRC", "IFS"]).join(", ")}
▫️ *MOQ / Container:* ${containerUnits.toLocaleString()} units (40ft HQ FCL)
▫️ *Production Lead Time:* ${supplier.quote?.lead_time_weeks || 3} weeks
▫️ *Payment Terms:* ${paymentTerms}

📦 *Courier Samples:*
Lab and sensory sample bottles are ready for dispatch via DHL Express for your internal sensory tasting and laboratory validation.

Shall we issue the courier sample dispatch instructions for your review this week?`;

  const currentWhatsappText = pitchLanguage === "he" ? whatsappHebrew : whatsappEnglish;

  function copyText(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopyFeedback(`✓ ${label} copied to clipboard!`);
    setTimeout(() => setCopyFeedback(null), 3000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
                Agent Commercial Engine
              </span>
              <span className="text-slate-400 text-xs">·</span>
              <span className="text-xs text-slate-300 font-mono">Ref: {quoteRef}</span>
            </div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <span>Agent Margin & Buyer Quotation Hub</span>
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Source: <strong className="text-white">{supplier.companyName}</strong> ({supplier.country}) · Quoting for: <strong className="text-amber-300">{buyerCompany}</strong>
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center transition-colors text-sm"
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center border-b border-slate-200 bg-slate-50 px-6 shrink-0 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("economics")}
            className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "economics"
                ? "border-indigo-600 text-indigo-600 font-bold bg-white"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>🧮 Margin & Profit Calculator</span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-mono">
              +€{containerProfitEur.toLocaleString()}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("whatsapp")}
            className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "whatsapp"
                ? "border-indigo-600 text-indigo-600 font-bold bg-white"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>📱 1-Click WhatsApp Pitch</span>
          </button>
          <button
            onClick={() => setActiveTab("proforma")}
            className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "proforma"
                ? "border-indigo-600 text-indigo-600 font-bold bg-white"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>📄 Anonymized Quotation Sheet (PDF)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 text-xs">
          {copyFeedback && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between">
              <span>{copyFeedback}</span>
              <span className="text-emerald-600">✓</span>
            </div>
          )}

          {/* ── TAB 1: Economics & Margin Calculator ── */}
          {activeTab === "economics" && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div className="text-slate-500 text-[11px] font-medium">Factory Net Cost</div>
                  <div className="text-xl font-extrabold text-slate-800 mt-0.5">
                    €{factoryCost.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Raw factory quote</div>
                </div>

                <div className="bg-indigo-50 p-3.5 rounded-xl border border-indigo-200">
                  <div className="text-indigo-700 text-[11px] font-medium">Your Quoted Buyer Price</div>
                  <div className="text-xl font-extrabold text-indigo-700 mt-0.5">
                    €{buyerQuotedPrice.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-indigo-600/80 mt-0.5">
                    +€{perUnitSpread.toFixed(2)} ({marginPercentage}%) spread
                  </div>
                </div>

                <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200">
                  <div className="text-emerald-700 text-[11px] font-medium">Agent Profit / FCL</div>
                  <div className="text-xl font-extrabold text-emerald-700 mt-0.5">
                    +€{containerProfitEur.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-emerald-600/80 mt-0.5">
                    Net margin per container
                  </div>
                </div>

                <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200">
                  <div className="text-amber-800 text-[11px] font-medium">Total Cargo Invoiced</div>
                  <div className="text-xl font-extrabold text-amber-800 mt-0.5">
                    €{buyerTotalEur.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-amber-700 mt-0.5">
                    {containerUnits.toLocaleString()} units
                  </div>
                </div>
              </div>

              {/* Form Controls */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
                <h4 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">
                  Configure Your Commercial Spread
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Factory Base Cost (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={factoryCost}
                      onChange={(e) => setFactoryCost(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Margin Structure
                    </label>
                    <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-100 rounded-lg">
                      <button
                        type="button"
                        onClick={() => {
                          setMarginType("markup");
                          setMarginValue(0.1);
                        }}
                        className={`py-1.5 px-2 rounded-md font-semibold text-[11px] transition ${
                          marginType === "markup"
                            ? "bg-white text-indigo-700 shadow-2xs font-bold"
                            : "text-slate-600"
                        }`}
                      >
                        +€ Per Unit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMarginType("percentage");
                          setMarginValue(12);
                        }}
                        className={`py-1.5 px-2 rounded-md font-semibold text-[11px] transition ${
                          marginType === "percentage"
                            ? "bg-white text-indigo-700 shadow-2xs font-bold"
                            : "text-slate-600"
                        }`}
                      >
                        +% Percentage
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      {marginType === "markup" ? "Spread Amount (+€)" : "Markup Rate (+%)"}
                    </label>
                    <input
                      type="number"
                      step={marginType === "markup" ? "0.01" : "0.5"}
                      value={marginValue}
                      onChange={(e) => setMarginValue(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-900 font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Container Load (Units)
                    </label>
                    <input
                      type="number"
                      value={containerUnits}
                      onChange={(e) => setContainerUnits(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Incoterms
                    </label>
                    <input
                      type="text"
                      value={incoterms}
                      onChange={(e) => setIncoterms(e.target.value)}
                      placeholder="e.g. CIF Ashdod Port"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Price Validity (Days)
                    </label>
                    <input
                      type="number"
                      value={validDays}
                      onChange={(e) => setValidDays(parseInt(e.target.value) || 14)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Agreed Payment Milestones
                  </label>
                  <input
                    type="text"
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              {/* Action Bar */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-slate-500">
                  Settings are stored in the match record and auto-populate all buyer documents.
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isPending}
                    className="px-5 py-2 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition shadow-xs flex items-center gap-1.5"
                  >
                    {isPending ? "Saving..." : "💾 Save Margin & Update Quotes"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 2: 1-Click WhatsApp Pitch ── */}
          {activeTab === "whatsapp" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    Ready-to-Send WhatsApp Commercial Pitch
                  </h4>
                  <p className="text-slate-500 text-[11px]">
                    Formatted to pitch to the buyer immediately with your margin built in, hiding the factory direct source.
                  </p>
                </div>

                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                  <button
                    onClick={() => setPitchLanguage("he")}
                    className={`px-3 py-1 rounded text-xs font-semibold ${
                      pitchLanguage === "he" ? "bg-white text-indigo-700 shadow-2xs font-bold" : "text-slate-600"
                    }`}
                  >
                    🇮🇱 עברית
                  </button>
                  <button
                    onClick={() => setPitchLanguage("en")}
                    className={`px-3 py-1 rounded text-xs font-semibold ${
                      pitchLanguage === "en" ? "bg-white text-indigo-700 shadow-2xs font-bold" : "text-slate-600"
                    }`}
                  >
                    🇬🇧 English
                  </button>
                </div>
              </div>

              <div className="relative">
                <textarea
                  dir={pitchLanguage === "he" ? "rtl" : "ltr"}
                  rows={14}
                  value={currentWhatsappText}
                  readOnly
                  className="w-full p-4 rounded-xl font-mono text-xs bg-slate-900 text-emerald-400 border border-slate-800 leading-relaxed focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => copyText(currentWhatsappText, "WhatsApp Pitch")}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition shadow-xs flex items-center gap-1.5"
                >
                  📋 Copy WhatsApp Pitch
                </button>

                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(currentWhatsappText)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition shadow-xs flex items-center gap-1.5"
                >
                  <span>💬 Open Directly in WhatsApp</span>
                </a>
              </div>
            </div>
          )}

          {/* ── TAB 3: Printable Anonymized Quotation Sheet (PDF) ── */}
          {activeTab === "proforma" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    Official Proforma Quotation Sheet
                  </h4>
                  <p className="text-slate-500 text-[11px]">
                    Non-circumvention ready. Displays the certified factory code while protecting your direct supplier contacts.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-lg bg-slate-900 text-white font-bold hover:bg-slate-800 transition shadow-xs flex items-center gap-1.5"
                >
                  🖨️ Print / Save as PDF
                </button>
              </div>

              {/* Printable Document Box */}
              <div className="border border-slate-300 rounded-xl p-8 bg-white shadow-xs text-slate-800 space-y-6 print:border-none print:shadow-none print:p-0">
                {/* Letterhead */}
                <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
                  <div>
                    <h1 className="text-xl font-black text-slate-900 tracking-tight">
                      FOODXCHANGE TRADE LTD
                    </h1>
                    <p className="text-[11px] text-slate-500">
                      International Food & Beverage Sourcing & Supply Chain
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Tel Aviv · Valencia · Bologna · Warsaw · contact@foodxchange.com
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                      Official Quotation
                    </span>
                    <div className="font-mono font-bold text-sm text-slate-900 mt-1">{quoteRef}</div>
                    <div className="text-[10px] text-slate-500">
                      Date: {new Date().toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {/* Buyer & Supplier Spec Grid */}
                <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs">
                  <div>
                    <span className="font-bold text-slate-500 uppercase text-[10px]">Client / Buyer:</span>
                    <div className="font-bold text-slate-900 text-sm mt-0.5">{buyerCompany}</div>
                    <div className="text-slate-600 mt-0.5">Destination: {incoterms}</div>
                  </div>
                  <div>
                    <span className="font-bold text-slate-500 uppercase text-[10px]">Manufacturer Origin:</span>
                    <div className="font-bold text-slate-900 text-sm mt-0.5">
                      European Certified Producer #{supplier.country ? supplier.country.slice(0, 2).toUpperCase() : "EU"}-{supplier.supplierId.slice(0, 4).toUpperCase()}
                    </div>
                    <div className="text-slate-600 mt-0.5">
                      Country of Origin: {supplier.country || "European Union"} · Match: {supplier.matchScore}%
                    </div>
                  </div>
                </div>

                {/* Offer Table */}
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-300 bg-slate-100">
                      <th className="p-2.5 font-bold text-slate-800">Item Description</th>
                      <th className="p-2.5 font-bold text-slate-800">Packaging / Net Weight</th>
                      <th className="p-2.5 font-bold text-slate-800">Compliance & Kosher</th>
                      <th className="p-2.5 font-bold text-slate-800 text-right">Unit Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="p-2.5">
                        <div className="font-bold text-slate-900">{benchmark.productName}</div>
                        <div className="text-[10px] text-slate-500">Benchmark: {benchmark.benchmarkBrand || "Standard Market"}</div>
                      </td>
                      <td className="p-2.5">
                        {supplier.quote?.net_weight || benchmark.netWeight || "1L"}
                        <span className="block text-[10px] text-slate-500">
                          {supplier.quote?.packaging_format || benchmark.packagingFormat || "Bottle"}
                        </span>
                      </td>
                      <td className="p-2.5">
                        <span className="font-semibold text-slate-900">
                          {supplier.quote?.kosher_type || "Kosher Rabbinate"}
                        </span>
                        <span className="block text-[10px] text-slate-500">
                          {(supplier.quote?.certifications || ["BRC", "IFS"]).join(", ")}
                        </span>
                      </td>
                      <td className="p-2.5 text-right font-bold text-sm text-slate-900">
                        €{buyerQuotedPrice.toFixed(2)}
                        <span className="block text-[10px] text-slate-500 font-normal">/ unit ({incoterms})</span>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Commercial Terms Summary */}
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs space-y-1.5">
                  <div className="font-bold text-slate-900 text-xs mb-1">Commercial Delivery & Payment Terms:</div>
                  <div>• <strong>MOQ / Order Volume:</strong> {containerUnits.toLocaleString()} units (1 x 40ft HQ Container).</div>
                  <div>• <strong>Payment Milestones:</strong> {paymentTerms}.</div>
                  <div>• <strong>Price Validity:</strong> {validDays} calendar days from date of issuance.</div>
                  <div>• <strong>Courier Samples:</strong> Available upon request via DHL Express for sensory evaluation.</div>
                </div>

                {/* Signatures */}
                <div className="pt-6 grid grid-cols-2 gap-8 border-t border-slate-200 text-xs">
                  <div>
                    <div className="text-slate-400 text-[10px] uppercase font-bold">Issued by:</div>
                    <div className="font-bold text-slate-900 mt-1">FoodXchange Trade Brokerage</div>
                    <div className="text-slate-500 text-[10px]">Authorized Signature</div>
                    <div className="h-10 border-b border-dashed border-slate-400 mt-2" />
                  </div>
                  <div>
                    <div className="text-slate-400 text-[10px] uppercase font-bold">Accepted by Client:</div>
                    <div className="font-bold text-slate-900 mt-1">{buyerCompany}</div>
                    <div className="text-slate-500 text-[10px]">Authorized Signature & Stamp</div>
                    <div className="h-10 border-b border-dashed border-slate-400 mt-2" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
