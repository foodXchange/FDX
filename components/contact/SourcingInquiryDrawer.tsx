"use client";

import { useState } from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  cardHandle: string;
  lang: "en" | "he";
  suggestions: string[];
}

export function SourcingInquiryDrawer({
  isOpen,
  onClose,
  cardHandle,
  lang,
  suggestions,
}: Props) {
  const [product, setProduct] = useState("");
  const [volume, setVolume] = useState("");
  const [kosher, setKosher] = useState("Rabbinate");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [contact, setContact] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<{
    requestId: string;
    whatsappFollowup: string;
  } | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!product.trim()) {
      setError(lang === "he" ? "נא להזין מוצר מבוקש" : "Please enter the required product.");
      return;
    }
    if (!name.trim()) {
      setError(lang === "he" ? "נא להזין שם איש קשר" : "Please enter your name.");
      return;
    }
    if (!contact.trim()) {
      setError(
        lang === "he"
          ? "נא להזין אימייל או טלפון לחזרה"
          : "Please provide an email or phone number for follow-up."
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/card/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handle: cardHandle,
          product_name: product.trim(),
          volume_per_year: volume.trim(),
          kosher_type: kosher,
          name: name.trim(),
          company: company.trim(),
          contact: contact.trim(),
          notes: notes.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Submission failed");
      }

      setSubmitted({
        requestId: data.requestId,
        whatsappFollowup: data.whatsappFollowup,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  const isRtl = lang === "he";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div
        className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-t-3xl sm:rounded-2xl shadow-2xl p-6 text-white max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-orange-500/20 text-[#F47920] flex items-center justify-center font-bold text-lg">
              ⚡
            </span>
            <div>
              <h3 className="font-bold text-base text-white">
                {isRtl ? "בקשת רכש / סורסינג מהירה" : "Quick Sourcing Inquiry"}
              </h3>
              <p className="text-xs text-slate-400">
                {isRtl
                  ? "הגדר את הדרישה — אנו נאתר יצרן אירופאי מתאים"
                  : "Specify your requirement — we source verified European factories"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors text-sm"
          >
            ✕
          </button>
        </div>

        {submitted ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto text-3xl font-bold">
              ✓
            </div>
            <div>
              <h4 className="text-lg font-bold text-white mb-1">
                {isRtl ? "הבקשה נקלטה בהצלחה!" : "Inquiry Received!"}
              </h4>
              <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
                {isRtl
                  ? "אודי וצוות FoodXchange יבחנו את המפרט ויחזרו אליך עם אפשרויות מיצרנים אירופאים רלוונטיים בהקדם."
                  : "Udi and the FoodXchange team will review your specs and reach out with verified European factory options shortly."}
              </p>
            </div>

            <div className="pt-3 space-y-2.5">
              <a
                href={submitted.whatsappFollowup}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-[#1DA851] hover:bg-[#189a47] text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 text-sm transition-colors shadow-md shadow-emerald-600/25"
              >
                <span>💬</span>
                <span>
                  {isRtl ? "פתח צ׳אט מהיר בוואטסאפ עם אודי" : "Ping Udi directly on WhatsApp"}
                </span>
              </a>
              <button
                onClick={onClose}
                className="w-full bg-white/10 hover:bg-white/15 text-white font-medium py-2.5 rounded-xl text-xs transition-colors"
              >
                {isRtl ? "סגור חלון" : "Close"}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-sm">
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
                {error}
              </div>
            )}

            {/* Suggestions Chips */}
            {suggestions.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  {isRtl ? "לחיצה לבחירה מרכש פעיל:" : "Quick select from active sourcing:"}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.slice(0, 4).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setProduct(item.split("—")[0].trim())}
                      className="text-xs px-2.5 py-1 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 border border-orange-500/20 transition-colors truncate max-w-full text-start"
                    >
                      + {item}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Product */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {isRtl ? "מוצר מבוקש / מפרט *" : "Product / Specification *"}
              </label>
              <input
                type="text"
                required
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                placeholder={
                  isRtl
                    ? "לדוגמה: שמן זית כתית מעולה 750 מ״ל מותג פרטי"
                    : "e.g. Extra Virgin Olive Oil 750ml Private Label"
                }
                className="w-full bg-slate-800/80 border border-white/15 focus:border-[#F47920] rounded-xl px-3.5 py-2.5 text-white text-sm outline-none placeholder-slate-500 transition-colors"
              />
            </div>

            {/* Volume & Kosher standard (2-col) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {isRtl ? "היקף / כמות משוערת" : "Estimated Annual Volume"}
                </label>
                <input
                  type="text"
                  value={volume}
                  onChange={(e) => setVolume(e.target.value)}
                  placeholder={isRtl ? "למשל: 2 מכולות / שנה" : "e.g. 2x 40ft containers / yr"}
                  className="w-full bg-slate-800/80 border border-white/15 focus:border-[#F47920] rounded-xl px-3.5 py-2.5 text-white text-sm outline-none placeholder-slate-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {isRtl ? "דרישת כשרות" : "Kosher Standard"}
                </label>
                <select
                  value={kosher}
                  onChange={(e) => setKosher(e.target.value)}
                  className="w-full bg-slate-800 border border-white/15 focus:border-[#F47920] rounded-xl px-3.5 py-2.5 text-white text-sm outline-none transition-colors"
                >
                  <option value="Rabbinate">
                    {isRtl ? "רבנות ראשית (Chief Rabbinate)" : "Chief Rabbinate"}
                  </option>
                  <option value="Badatz">
                    {isRtl ? "בד״ץ (Badatz Mehadrin)" : "Badatz Mehadrin"}
                  </option>
                  <option value="Standard">
                    {isRtl ? "כשרות רגילה (Standard Kosher)" : "Standard Kosher"}
                  </option>
                  <option value="None">
                    {isRtl ? "ללא צורך בכשרות (Not Required)" : "Not Required"}
                  </option>
                </select>
              </div>
            </div>

            {/* Contact details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {isRtl ? "שם מלא *" : "Your Name *"}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={isRtl ? "ישראל ישראלי" : "John Smith"}
                  className="w-full bg-slate-800/80 border border-white/15 focus:border-[#F47920] rounded-xl px-3.5 py-2.5 text-white text-sm outline-none placeholder-slate-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {isRtl ? "חברה / רשת שיווק" : "Company / Retailer"}
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder={isRtl ? "שם החברה" : "Company Name"}
                  className="w-full bg-slate-800/80 border border-white/15 focus:border-[#F47920] rounded-xl px-3.5 py-2.5 text-white text-sm outline-none placeholder-slate-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {isRtl ? "אימייל או נייד (וואטסאפ) לחזרה *" : "Email or WhatsApp Number *"}
              </label>
              <input
                type="text"
                required
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder={isRtl ? "050-1234567 או buyer@company.co.il" : "name@company.com or +972-50..."}
                className="w-full bg-slate-800/80 border border-white/15 focus:border-[#F47920] rounded-xl px-3.5 py-2.5 text-white text-sm outline-none placeholder-slate-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {isRtl ? "הערות נוספות (אופציונלי)" : "Additional Notes (Optional)"}
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={
                  isRtl
                    ? "למשל: דרוש מותג פרטי, יעד אספקה רבעון 3..."
                    : "e.g. Target FOB/CIF price, private label branding..."
                }
                className="w-full bg-slate-800/80 border border-white/15 focus:border-[#F47920] rounded-xl px-3.5 py-2 text-white text-sm outline-none placeholder-slate-500 transition-colors resize-none"
              />
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="w-1/3 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium transition-colors"
              >
                {isRtl ? "ביטול" : "Cancel"}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="w-2/3 py-3 rounded-xl bg-[#F47920] hover:bg-[#d96810] text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{isRtl ? "שולח..." : "Submitting..."}</span>
                  </>
                ) : (
                  <>
                    <span>⚡</span>
                    <span>{isRtl ? "שלח בקשת רכש" : "Submit Inquiry"}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
