"use client";

import { useState } from "react";
import type { AssortmentMatchRow } from "./OpportunitiesDashboardClient";

interface PitchGeneratorModalProps {
  match: AssortmentMatchRow | null;
  gmailUser?: string | null;
  initialTab?: "buyer" | "supplier";
  onClose: () => void;
  onStatusUpdated?: (matchId: string, newStatus: AssortmentMatchRow["status"]) => void;
}

export function PitchGeneratorModal({
  match,
  gmailUser,
  initialTab = "buyer",
  onClose,
  onStatusUpdated,
}: PitchGeneratorModalProps) {
  const [activeTab, setActiveTab] = useState<"buyer" | "supplier">(initialTab);
  const [lang, setLang] = useState<"he" | "en">("he");
  const [copied, setCopied] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendSuccessMessage, setSendSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!match) return null;

  const buyerName = match.buyer?.company_name || "Enterprise Retailer";
  const buyerContactEmail = match.buyer?.contact_email || "";
  const targetSku = match.assortment?.product_name || "Private Label Item";
  const retailPrice = match.assortment?.retail_price_ils
    ? `₪${match.assortment.retail_price_ils.toFixed(2)}`
    : "Current Shelf Price";
  const supplierName = match.supplier?.company_name || "Direct Factory";
  const supplierCountry = match.supplier?.country_of_origin || "Europe";
  const supplierContactEmail = match.supplier?.contact_email || "";
  const matchedProduct = match.supplier_product?.product_name || targetSku;
  const marginGain = match.potential_margin_gain || "15-25% estimated margin spread";
  const formats = match.supplier_product?.formats?.join(", ") || "Retail & Foodservice formats available";

  // Pre-drafted text for Buyer Pitch
  const defaultEnglishSubject = `Private Label Sourcing Opportunity: ${matchedProduct} (${supplierCountry}) for ${buyerName}`;
  const defaultEnglishBody = `Hi ${buyerName} Commercial & Private-Label Sourcing Team,

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

  const defaultHebrewSubject = `הצעת רכש למותג הפרטי: אלטרנטיבת ייצור ישירה ל-${targetSku} מ-${supplierCountry}`;
  const defaultHebrewBody = `שלום לצוות הסחר והמותג הפרטי של ${buyerName},

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

  // Pre-drafted text for Factory RFQ
  const defaultRfqSubject = `Private Label Manufacturing RFQ: ${matchedProduct} for ${buyerName} [Israel Retail]`;
  const defaultRfqBody = `Dear ${supplierName} Export & Commercial Sales Team,

FoodXchange (FDX) is an institutional food trade network operating direct sourcing tenders for premier retail supermarket chains and private-label distributors in Israel.

We are currently structuring a private-label program for ${buyerName} (major supermarket chain in Israel) and have matched your catalog item:
• Matched Product: ${matchedProduct}
• Desired Formats: ${formats}
• Benchmark Shelf Line: ${targetSku}

Please review the following requirements and provide your preliminary indications:
1. Private Label Capabilities: Can you package under buyer private brand with customized bilingual Hebrew/English labelling?
2. Indicative Pricing: What is your estimated FOB and CIF Ashdod/Haifa price indication for full container loads (FCL)?
3. Compliance & Kosher: Please confirm your quality certifications (BRC / IFS / ISO 22000) and Kosher certification status (Chief Rabbinate / OU / OK or equivalent).
4. Sampling: Are production samples ready for dispatch for buyer quality tasting?

Please reply directly to this email with your product specification sheets and commercial terms.

Best regards,
Sourcing & Supply Chain Operations
FoodXchange Global Trade Desk
sourcing@fdx.trading · www.fdx.trading`;

  // Local state for editable fields
  const [buyerRecipient, setBuyerRecipient] = useState(buyerContactEmail);
  const [buyerSubject, setBuyerSubject] = useState(lang === "he" ? defaultHebrewSubject : defaultEnglishSubject);
  const [buyerBody, setBuyerBody] = useState(lang === "he" ? defaultHebrewBody : defaultEnglishBody);

  const [supplierRecipient, setSupplierRecipient] = useState(supplierContactEmail);
  const [supplierSubject, setSupplierSubject] = useState(defaultRfqSubject);
  const [supplierBody, setSupplierBody] = useState(defaultRfqBody);

  // Switch buyer language
  const handleLanguageChange = (newLang: "he" | "en") => {
    setLang(newLang);
    if (newLang === "he") {
      setBuyerSubject(defaultHebrewSubject);
      setBuyerBody(defaultHebrewBody);
    } else {
      setBuyerSubject(defaultEnglishSubject);
      setBuyerBody(defaultEnglishBody);
    }
  };

  const handleCopy = async () => {
    try {
      const subject = activeTab === "buyer" ? buyerSubject : supplierSubject;
      const body = activeTab === "buyer" ? buyerBody : supplierBody;
      await navigator.clipboard.writeText(`${subject}\n\n${body}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error("Failed to copy:", e);
    }
  };

  const handleDownload = () => {
    const subject = activeTab === "buyer" ? buyerSubject : supplierSubject;
    const body = activeTab === "buyer" ? buyerBody : supplierBody;
    const blob = new Blob([`${subject}\n\n${body}`], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `FDX-${activeTab === "buyer" ? "Pitch" : "RFQ"}-${buyerName.replace(/\s+/g, "_")}-${match.id.slice(0, 6)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSendEmail = async () => {
    const to = activeTab === "buyer" ? buyerRecipient.trim() : supplierRecipient.trim();
    if (!to || !to.includes("@")) {
      setErrorMessage(`Please provide a valid recipient email for the ${activeTab === "buyer" ? "buyer" : "factory"}.`);
      return;
    }

    setIsSending(true);
    setErrorMessage(null);
    setSendSuccessMessage(null);

    try {
      const res = await fetch("/api/admin/opportunities/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: match.id,
          recipientType: activeTab,
          to,
          subject: activeTab === "buyer" ? buyerSubject : supplierSubject,
          bodyText: activeTab === "buyer" ? buyerBody : supplierBody,
          targetSku,
          retailPrice,
          factoryName: supplierName,
          factoryCountry: supplierCountry,
          marginGain,
        }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setSendSuccessMessage(
          `✓ Successfully dispatched via ${data.via === "gmail" ? "Gmail" : "Resend"} to ${to}!`
        );
        onStatusUpdated?.(match.id, data.newStatus);
        setTimeout(() => {
          onClose();
        }, 2200);
      } else {
        setErrorMessage(data.error || "Failed to dispatch email. Please check credentials.");
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Network error while sending email.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-3.5 border-b border-slate-200 bg-slate-50/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{activeTab === "buyer" ? "💡" : "🏭"}</span>
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <span>Outbound Outreach Hub</span>
                {gmailUser ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold lowercase">
                    🟢 {gmailUser}
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-semibold">
                    Outbound Resend / SMTP
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500">
                {buyerName} · {targetSku}
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

        {/* Tab Selection Strip */}
        <div className="px-6 py-2 border-b border-slate-200 bg-white flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setActiveTab("buyer");
                setErrorMessage(null);
                setSendSuccessMessage(null);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === "buyer"
                  ? "bg-orange-500 text-white shadow-2xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span>💡</span>
              <span>1. Pitch Retailer ({buyerName})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("supplier");
                setErrorMessage(null);
                setSendSuccessMessage(null);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === "supplier"
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span>🏭</span>
              <span>2. Dispatch Factory RFQ ({supplierName})</span>
            </button>
          </div>

          {activeTab === "buyer" && (
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100 text-[11px]">
              <button
                type="button"
                onClick={() => handleLanguageChange("he")}
                className={`px-2.5 py-1 rounded-md font-semibold transition ${
                  lang === "he"
                    ? "bg-white text-orange-600 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                🇮🇱 עברית
              </button>
              <button
                type="button"
                onClick={() => handleLanguageChange("en")}
                className={`px-2.5 py-1 rounded-md font-semibold transition ${
                  lang === "en"
                    ? "bg-white text-orange-600 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                🌐 English
              </button>
            </div>
          )}
        </div>

        {/* Match Summary Pill Bar */}
        <div className="px-6 py-2.5 bg-orange-50/30 border-b border-orange-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-500">Target Line:</span>
            <span className="bg-white px-2 py-0.5 rounded border border-orange-200 text-slate-900 font-medium truncate max-w-56">
              {targetSku} ({retailPrice})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-500">Factory Parity:</span>
            <span className="bg-white px-2 py-0.5 rounded border border-orange-200 text-slate-900 font-medium truncate max-w-56">
              {supplierName} ({supplierCountry})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-500">Parity Score:</span>
            <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
              {match.match_score}%
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold">
              ✗ {errorMessage}
            </div>
          )}

          {sendSuccessMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
              {sendSuccessMessage}
            </div>
          )}

          {/* Recipient Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {activeTab === "buyer"
                ? `Buyer Category Manager Email (${buyerName})`
                : `Factory Export Email (${supplierName})`}
            </label>
            <div className="relative">
              <input
                type="email"
                placeholder={
                  activeTab === "buyer"
                    ? "e.g. category-manager@retailer.co.il"
                    : "e.g. export@pastificio-mennucci.it"
                }
                value={activeTab === "buyer" ? buyerRecipient : supplierRecipient}
                onChange={(e) =>
                  activeTab === "buyer"
                    ? setBuyerRecipient(e.target.value)
                    : setSupplierRecipient(e.target.value)
                }
                className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-orange-500"
              />
              {!buyerRecipient && activeTab === "buyer" && (
                <span className="absolute right-3 top-2 text-[10px] text-orange-600 font-semibold bg-orange-50 px-1.5 py-0.5 rounded">
                  Enter buyer email
                </span>
              )}
            </div>
          </div>

          {/* Subject Line */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Subject Line
            </label>
            <input
              type="text"
              value={activeTab === "buyer" ? buyerSubject : supplierSubject}
              onChange={(e) =>
                activeTab === "buyer"
                  ? setBuyerSubject(e.target.value)
                  : setSupplierSubject(e.target.value)
              }
              dir={activeTab === "buyer" && lang === "he" ? "rtl" : "ltr"}
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-orange-500"
            />
          </div>

          {/* Email Body */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email Body (Includes FDX Brand Benchmark Box)
            </label>
            <textarea
              rows={9}
              value={activeTab === "buyer" ? buyerBody : supplierBody}
              onChange={(e) =>
                activeTab === "buyer"
                  ? setBuyerBody(e.target.value)
                  : setSupplierBody(e.target.value)
              }
              dir={activeTab === "buyer" && lang === "he" ? "rtl" : "ltr"}
              className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:outline-none focus:border-orange-500 leading-relaxed"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition shadow-2xs"
            >
              {copied ? "✓ Copied" : "📋 Copy"}
            </button>
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition shadow-2xs"
            >
              💾 .txt
            </button>
            <a
              href={`mailto:${activeTab === "buyer" ? buyerRecipient : supplierRecipient}?subject=${encodeURIComponent(
                activeTab === "buyer" ? buyerSubject : supplierSubject
              )}&body=${encodeURIComponent(activeTab === "buyer" ? buyerBody : supplierBody)}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition shadow-2xs"
            >
              ✉️ Mail Client
            </a>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSendEmail}
              disabled={isSending}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white text-xs font-bold transition shadow-xs disabled:opacity-50 ${
                activeTab === "buyer"
                  ? "bg-orange-600 hover:bg-orange-700"
                  : "bg-slate-900 hover:bg-slate-800"
              }`}
            >
              <span>{isSending ? "⏳" : "🚀"}</span>
              <span>
                {isSending
                  ? "Sending..."
                  : activeTab === "buyer"
                  ? "Send Pitch via Gmail"
                  : "Send RFQ to Factory"}
              </span>
            </button>

            <button
              onClick={onClose}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 text-xs font-medium transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
