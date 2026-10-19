"use client";

import { useState } from "react";
import type { AssortmentMatchRow } from "./OpportunitiesDashboardClient";

interface PitchGeneratorModalProps {
  match: AssortmentMatchRow | null;
  onClose: () => void;
  onStatusUpdated?: (matchId: string, newStatus: AssortmentMatchRow["status"]) => void;
}

export function PitchGeneratorModal({
  match,
  onClose,
  onStatusUpdated,
}: PitchGeneratorModalProps) {
  const [lang, setLang] = useState<"he" | "en">("he");
  const [copied, setCopied] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  if (!match) return null;

  const buyerName = match.buyer?.company_name || "Enterprise Retailer";
  const targetSku = match.assortment?.product_name || "Private Label Item";
  const retailPrice = match.assortment?.retail_price_ils
    ? `₪${match.assortment.retail_price_ils.toFixed(2)}`
    : "Current Shelf Price";
  const supplierName = match.supplier?.company_name || "Direct Factory";
  const supplierCountry = match.supplier?.country_of_origin || "Europe";
  const matchedProduct = match.supplier_product?.product_name || targetSku;
  const marginGain = match.potential_margin_gain || "15-25% estimated margin spread";
  const formats = match.supplier_product?.formats?.join(", ") || "Retail & Foodservice formats available";

  const englishSubject = `Private Label Sourcing Opportunity: ${matchedProduct} (${supplierCountry}) for ${buyerName}`;
  const englishBody = `Hi ${buyerName} Commercial & Private-Label Sourcing Team,

FDX Trade Operations has identified a high-confidence factory parity opportunity for your retail portfolio:

• Target Line: ${targetSku}
• Current Shelf Benchmark: ${retailPrice}
• Verified Factory Match: ${supplierName} (${supplierCountry})
• Factory Product: ${matchedProduct}
• Packaging Formats: ${formats}
• Match Confidence: ${match.match_score}% (Vector Parity: ${((match.vector_similarity ?? 0.75) * 100).toFixed(1)}%)
• Projected Commercial Advantage: ${marginGain}

Why This Match?
${match.pitch_angle || "Direct manufacturer sourcing bypassing regional middlemen, ensuring full Kosher certification compliance, traceable origin, and optimized container load economics."}

Next Steps:
We have active supplier documentation and specifications on file. Please let us know if you would like us to arrange sample shipments, CIF Ashdod/Haifa price quotes, or a direct manufacturer introduction.

Best regards,
FDX Global Food Exchange Sourcing Desk
sourcing@fdx.trading`;

  const hebrewSubject = `הצעת רכש למותג הפרטי: אלטרנטיבת ייצור ישירה ל-${targetSku} מ-${supplierCountry}`;
  const hebrewBody = `שלום לצוות הסחר והמותג הפרטי של ${buyerName},

מערכת המודיעין המסחרי של FDX זיהתה הזדמנות מובהקת לייעול עלויות ושיפור רווחיות עבור קו המותג הפרטי שלכם:

• מוצר יעד: ${targetSku}
• מחיר מדף נוכחי: ${retailPrice}
• מפעל יצרן מאומת: ${supplierName} (${supplierCountry})
• מפרט יצרן: ${matchedProduct} (${formats})
• ציון התאמה טכנולוגית: ${match.match_score}%
• פוטנציאל שיפור רווחיות גולמית: ${marginGain}

יתרונות מרכזיים להצעה:
${match.pitch_angle || "עבודה ישירה מול מפעל היצרן באירופה ללא פערי תיווך, עמידה מלאה בדרישות כשרות (הרבנות הראשית / בד\"ץ), ואפשרות להתאמת אריזה ומתכון ייעודיים."}

שלבים להמשך:
מפרטי המוצר, דפי נתונים ותעודות כשרות זמינים במערכת FDX. נשמח לתאם עבורכם משלוח דוגמאות מיידי והצעת מחיר CIF נמלי ישראל.

בברכה,
דסק סחר ומותג פרטי — FDX Global Food Exchange
sourcing@fdx.trading`;

  const currentSubject = lang === "he" ? hebrewSubject : englishSubject;
  const currentBody = lang === "he" ? hebrewBody : englishBody;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${currentSubject}\n\n${currentBody}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error("Failed to copy:", e);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([`${currentSubject}\n\n${currentBody}`], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `FDX-Pitch-${buyerName.replace(/\s+/g, "_")}-${match.id.slice(0, 6)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleMarkPitched = async () => {
    setIsUpdatingStatus(true);
    try {
      const res = await fetch("/api/admin/opportunities/update-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: match.id, status: "pitched" }),
      });
      if (res.ok) {
        onStatusUpdated?.(match.id, "pitched");
        onClose();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💡</span>
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Commercial Pitch &amp; RFP Generator
              </h3>
              <p className="text-xs text-slate-500">
                Direct Co-Packing Pitch for <strong className="text-slate-800">{buyerName}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1.5 hover:bg-slate-200/60 transition"
          >
            ✕
          </button>
        </div>

        {/* Match Summary Pill Bar */}
        <div className="px-6 py-3 bg-orange-50/40 border-b border-orange-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Target SKU:</span>
            <span className="bg-white px-2 py-0.5 rounded border border-orange-200 text-orange-950 font-medium">
              {targetSku} ({retailPrice})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Factory:</span>
            <span className="bg-white px-2 py-0.5 rounded border border-orange-200 text-slate-900 font-medium">
              {supplierName} ({supplierCountry})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Match Confidence:</span>
            <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
              {match.match_score}%
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Pitch Language
            </span>
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100 text-xs">
              <button
                type="button"
                onClick={() => setLang("he")}
                className={`px-3 py-1 rounded-md font-semibold transition ${
                  lang === "he"
                    ? "bg-white text-orange-600 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                🇮🇱 עברית (Hebrew)
              </button>
              <button
                type="button"
                onClick={() => setLang("en")}
                className={`px-3 py-1 rounded-md font-semibold transition ${
                  lang === "en"
                    ? "bg-white text-orange-600 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                🌐 English
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Subject Line
            </label>
            <input
              type="text"
              readOnly
              value={currentSubject}
              dir={lang === "he" ? "rtl" : "ltr"}
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Commercial Proposal Brief
            </label>
            <textarea
              readOnly
              rows={11}
              value={currentBody}
              dir={lang === "he" ? "rtl" : "ltr"}
              className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-800 focus:outline-none leading-relaxed"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition shadow-2xs"
            >
              {copied ? "✓ Copied to Clipboard!" : "📋 Copy Pitch"}
            </button>
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition shadow-2xs"
            >
              💾 Save .txt
            </button>
            <a
              href={`mailto:?subject=${encodeURIComponent(currentSubject)}&body=${encodeURIComponent(currentBody)}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition shadow-2xs"
            >
              ✉️ Open Mail Client
            </a>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleMarkPitched}
              disabled={isUpdatingStatus}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold transition shadow-2xs disabled:opacity-50"
            >
              {isUpdatingStatus ? "Updating..." : "🚀 Mark as Pitched"}
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 text-xs font-medium transition"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
