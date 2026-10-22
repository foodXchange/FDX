"use client";

import React, { useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSampleKit } from "@/context/SampleKitContext";

const COUNTRY_FLAG: Record<string, string> = {
  Spain: "🇪🇸",
  Italy: "🇮🇹",
  France: "🇫🇷",
  Portugal: "🇵🇹",
  Greece: "🇬🇷",
  Turkey: "🇹🇷",
  Morocco: "🇲🇦",
  Israel: "🇮🇱",
  Germany: "🇩🇪",
  Netherlands: "🇳🇱",
  Poland: "🇵🇱",
  Belgium: "🇧🇪",
  Ukraine: "🇺🇦",
  Romania: "🇷🇴",
  Bulgaria: "🇧🇬",
};

export default function SampleKitModal() {
  const { items, removeItem, clearKit, isKitOpen, closeKit, updateItemFormat } = useSampleKit();
  const pathname = usePathname();
  const isHe = pathname?.startsWith("/he") ?? false;

  const [company, setCompany] = useState("");
  const [name, setName] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [targetTastingDate, setTargetTastingDate] = useState("");
  const [specialNotes, setSpecialNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    trackingCode: string;
    itemCount: number;
    company: string;
    name: string;
  } | null>(null);

  if (!isKitOpen || (pathname && pathname.startsWith("/admin"))) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const sessionId = crypto.randomUUID();
      const res = await fetch("/api/sourcing/samples", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          company,
          name,
          role_title: roleTitle || undefined,
          whatsapp,
          email: email || undefined,
          delivery_address: deliveryAddress,
          target_tasting_date: targetTastingDate || undefined,
          special_notes: specialNotes || undefined,
          items,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit sample kit request");
      }

      setSuccessData(data);
      clearKit();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const generateWhatsAppMessage = () => {
    if (!successData) return "";
    const trackingUrl = `https://fdx.trading/${isHe ? "he/" : ""}track?code=${successData.trackingCode}`;
    const text = isHe
      ? `שלום אודי, הגשתי כעת בקשה לערכת דוגמאות טעימה ב-FoodXchange:
📦 מספר מעקב: ${successData.trackingCode}
🏢 רשת / חברה: ${company}
👤 קניין: ${name} (${roleTitle || "מנהל קטגוריה"})
📍 כתובת למשלוח: ${deliveryAddress}
📅 תאריך טעימה מתוכנן: ${targetTastingDate || "הקדם האפשרי"}
📋 כמות מוצרים: ${successData.itemCount} דוגמאות
🔗 מעקב חי: ${trackingUrl}

אשמח לוודא מולך שקיבלתם את הפרטים ושמועדי השילוח באקספרס מאושרים.`
      : `Hi Udi, I submitted a Tasting Sample Kit dispatch request on FoodXchange:
📦 Tracking Code: ${successData.trackingCode}
🏢 Retailer / Importer: ${company}
👤 Buyer: ${name} (${roleTitle || "Category Manager"})
📍 Delivery Address: ${deliveryAddress}
📅 Target Tasting Date: ${targetTastingDate || "ASAP"}
📋 Total items: ${successData.itemCount} samples
🔗 Live Tracking: ${trackingUrl}

Please confirm receipt and estimated DHL dispatch schedule.`;

    return encodeURIComponent(text);
  };

  return (
    <div
      dir={isHe ? "rtl" : "ltr"}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeKit();
      }}
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] overflow-y-auto shadow-2xl relative my-auto animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 sticky top-0 bg-slate-900/95 backdrop-blur-xl z-20">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-orange-500/20 text-orange-400 text-lg">
              📦
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                {isHe ? "ערכת דוגמאות לשולחן הטעימות והערכת איכות" : "Tasting Sample Box Dispatch Request"}
              </h2>
              <p className="text-xs text-slate-400">
                {isHe
                  ? `${items.length} מוצרים נבחרו למשלוח אקספרס ישירות מהמפעלים באירופה`
                  : `${items.length} European factory samples selected for courier dispatch`}
              </p>
            </div>
          </div>

          <button
            onClick={closeKit}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        {successData ? (
          /* SUCCESS VIEW */
          <div className="p-8 sm:p-12 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 text-3xl font-bold flex items-center justify-center mx-auto border border-emerald-500/30">
              ✓
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-black text-white">
                {isHe ? "בקשת הדוגמאות התקבלה בהצלחה!" : "Sample Request Confirmed!"}
              </h3>
              <p className="text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
                {isHe
                  ? `הבקשה נרשמה במערכת עבור ${company}. אנו מרכזים את הדוגמאות מול המפעלים הרלוונטיים באירופה לקראת שילוח באקספרס.`
                  : `Your request has been logged for ${company}. We are coordinating sample collection from European manufacturing plants.`}
              </p>
            </div>

            {/* Tracking Reference Card */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 max-w-sm mx-auto font-mono text-center space-y-2">
              <span className="text-xs text-slate-500 block font-sans">
                {isHe ? "מספר מעקב פנימי למשלוח:" : "Tracking Reference:"}
              </span>
              <span className="text-xl font-black text-orange-400 block tracking-wider">
                {successData.trackingCode}
              </span>
              <div className="pt-2">
                <a
                  href={isHe ? `/he/track?code=${successData.trackingCode}` : `/track?code=${successData.trackingCode}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 font-black py-2.5 px-4 rounded-xl text-xs transition shadow-md shadow-orange-950/30 w-full"
                >
                  <span>🔎</span>
                  <span>{isHe ? "פתח דף מעקב חי אחר החבילה ←" : "Open Live Tracking Page ←"}</span>
                </a>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto pt-2">
              <a
                href={`https://wa.me/972525222291?text=${generateWhatsAppMessage()}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-5 rounded-xl text-xs sm:text-sm transition shadow-lg shadow-emerald-950/40"
              >
                <span>💬</span>
                <span>{isHe ? "עדכן את אודי בווטסאפ (אישור מיידי)" : "Ping Udi via WhatsApp"}</span>
              </a>

              <button
                onClick={() => {
                  setSuccessData(null);
                  closeKit();
                }}
                className="border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white font-semibold py-3 px-5 rounded-xl text-xs sm:text-sm transition"
              >
                {isHe ? "סגור חלון" : "Close Window"}
              </button>
            </div>
          </div>
        ) : items.length === 0 ? (
          /* EMPTY VIEW */
          <div className="p-12 text-center space-y-4">
            <span className="text-5xl block">📦</span>
            <h3 className="text-lg font-bold text-white">
              {isHe ? "ערכת הטעימות ריקה כרגע" : "Your Tasting Sample Box is Empty"}
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              {isHe
                ? "עיינו בקטלוג המוצרים או במחשבון עלויות הנחיתה, ולחצו על כפתור \"+ הוסף לערכת טעימות\" על גבי כל מוצר שמעניין את הרשת שלכם."
                : "Explore our Product Catalog and click \"+ Add to Tasting Kit\" on any European product you would like to test."}
            </p>
            <div className="pt-2">
              <button
                onClick={closeKit}
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs py-2.5 px-6 rounded-xl transition"
              >
                {isHe ? "חזרה לקטלוג המוצרים ←" : "Browse Products ←"}
              </button>
            </div>
          </div>
        ) : (
          /* MAIN 2-COLUMN BUILDER FORM */
          <form onSubmit={handleSubmit} className="p-5 sm:p-7 grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* LEFT / FIRST: Items Selected in Kit (5 cols) */}
            <div className="lg:col-span-5 space-y-4 order-2 lg:order-1">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-slate-300">
                  {isHe ? "מוצרים בערכה לבדיקה:" : "Selected Samples:"} ({items.length})
                </span>
                <button
                  type="button"
                  onClick={clearKit}
                  className="text-[11px] text-slate-500 hover:text-rose-400 transition"
                >
                  {isHe ? "רוקן ערכה ✕" : "Clear all ✕"}
                </button>
              </div>

              {/* Items List */}
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {items.map((item) => {
                  const flag = item.country_of_origin
                    ? COUNTRY_FLAG[item.country_of_origin] ?? "🌍"
                    : "🌍";

                  return (
                    <div
                      key={item.id}
                      className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex items-start gap-3 relative group"
                    >
                      {/* Thumbnail */}
                      <div className="relative w-12 h-12 rounded-lg bg-slate-900 border border-slate-800 shrink-0 overflow-hidden flex items-center justify-center">
                        {item.image_url ? (
                          <Image
                            src={item.image_url}
                            alt={item.product_name}
                            fill
                            className="object-contain p-1"
                          />
                        ) : (
                          <span className="text-base">📦</span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-bold text-white leading-snug line-clamp-2">
                            {item.product_name}
                          </h4>
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="text-slate-500 hover:text-rose-400 text-xs shrink-0 p-1"
                            title={isHe ? "הסר מוצר" : "Remove item"}
                          >
                            ✕
                          </button>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-slate-400">
                          <span>{flag} {item.supplier_name || "מפעל מאומת"}</span>
                          {item.kosher_types && item.kosher_types.length > 0 && (
                            <span className="text-emerald-400 font-mono">
                              ✡️ {item.kosher_types[0]}
                            </span>
                          )}
                        </div>

                        {/* Format selector */}
                        <div className="pt-1">
                          <input
                            type="text"
                            placeholder={isHe ? "פורמט דגימה (למשל: בקבוק 750 מ״ל / פחית 160 גרם)..." : "Sample format (e.g. 750ml bottle)..."}
                            value={item.sample_format || ""}
                            onChange={(e) => updateItemFormat(item.id, e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-md px-2 py-1 text-[11px] text-slate-300 placeholder-slate-600 focus:outline-none focus:border-orange-500"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Courier Timeline Graphic */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 space-y-2 text-xs">
                <span className="font-bold text-slate-300 block">
                  {isHe ? "✈️ לוח זמנים צפוי לשילוח אקספרס:" : "✈️ Courier Delivery SLA:"}
                </span>
                <div className="text-[11px] text-slate-400 space-y-1">
                  <div className="flex items-center gap-2 text-slate-300">
                    <span className="text-orange-400">1.</span>
                    <span>{isHe ? "איסוף דגימות מאירופה (1-2 ימי עסקים)" : "European factory dispatch (1-2 days)"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <span className="text-orange-400">2.</span>
                    <span>{isHe ? "טיסת מטען אקספרס DHL לנמל התעופה בן גוריון" : "DHL Express cargo flight to TLV Gateway"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <span className="text-orange-400">3.</span>
                    <span>{isHe ? "מסירה בשולחן הטעימות במשרדך (סה״כ 3-5 ימים)" : "Office delivery for retail tasting (3-5 days)"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT / SECOND: Delivery & Buyer Details Form (7 cols) */}
            <div className="lg:col-span-7 space-y-4 order-1 lg:order-2">
              <div className="border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-slate-300">
                  {isHe ? "פרטי משלוח לקניין / הנהלת הרשת בישראל:" : "Delivery Address & Buyer Details:"}
                </span>
              </div>

              {error && (
                <div className="bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs p-3 rounded-xl">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Retail Chain / Importer Name */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-300">
                    {isHe ? "שם הרשת / חברה / יבואן *" : "Company / Retail Chain Name *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder={isHe ? "למשל: שופרסל / ויקטורי / יוחננוף / רמי לוי / דיפלומט" : "e.g. Shufersal / Victory / Importer Ltd"}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                  />
                </div>

                {/* Buyer Name */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">
                    {isHe ? "שם הקניין / מנהל הרכש *" : "Buyer / Category Manager *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={isHe ? "ישראל ישראלי" : "John Smith"}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                  />
                </div>

                {/* Role / Category Title */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">
                    {isHe ? "תפקיד / מחלקת סחר" : "Role / Title"}
                  </label>
                  <input
                    type="text"
                    value={roleTitle}
                    onChange={(e) => setRoleTitle(e.target.value)}
                    placeholder={isHe ? "מנהל קטגוריית שמנים ושימורים" : "Senior Category Manager"}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                  />
                </div>

                {/* WhatsApp Phone */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">
                    {isHe ? "טלפון / וואטסאפ לתיאום משלוח *" : "Phone / WhatsApp for Delivery *"}
                  </label>
                  <input
                    type="tel"
                    required
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="052-5222291"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 font-mono"
                    dir="ltr"
                  />
                </div>

                {/* Email for updates */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">
                    {isHe ? "כתובת דוא״ל לעדכוני מעקב" : "Email for Tracking Updates"}
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="buyer@retail.co.il"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 font-mono"
                    dir="ltr"
                  />
                </div>

                {/* Delivery Address */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-300">
                    {isHe ? "כתובת למשלוח בישראל (משרדי הנהלה / מרלו״ג) *" : "Courier Delivery Address in Israel *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder={isHe ? "רחוב, מספר, עיר, קומה / שער מרלו״ג" : "Street, Number, City, Logistics gate"}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                  />
                </div>

                {/* Target Tasting Date */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">
                    {isHe ? "תאריך יעד מתוכנן לטעימה" : "Target Tasting Review Date"}
                  </label>
                  <input
                    type="text"
                    value={targetTastingDate}
                    onChange={(e) => setTargetTastingDate(e.target.value)}
                    placeholder={isHe ? "למשל: סוף החודש / 15.11" : "e.g. Next week / Mid-month"}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                  />
                </div>

                {/* Notes & Lab Instructions */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-300">
                    {isHe ? "דגשים מיוחדים (בדיקת מעבדה, כשרות מבוקשת, מותג פרטי)" : "Special Instructions / Lab Testing Focus"}
                  </label>
                  <textarea
                    rows={2}
                    value={specialNotes}
                    onChange={(e) => setSpecialNotes(e.target.value)}
                    placeholder={isHe ? "למשל: נדרשת בדיקת חמיצות לשמן זית, דרישה לכשרות מהדרין..." : "e.g. Acidity lab testing required, private label packaging specs..."}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-3.5 px-6 rounded-xl text-xs sm:text-sm transition shadow-lg shadow-orange-500/30 cursor-pointer"
                >
                  {submitting ? (
                    <span>{isHe ? "רושם הזמנת דוגמאות..." : "Submitting dispatch request..."}</span>
                  ) : (
                    <>
                      <span>{isHe ? "שגר הזמנת ערכת דוגמאות באקספרס" : "Dispatch Tasting Sample Box"}</span>
                      <span>←</span>
                    </>
                  )}
                </button>
                <p className="text-[11px] text-slate-500 text-center mt-2">
                  {isHe
                    ? "ללא התחייבות כספית · שילוח מבוקר לקנייני רשתות מאומתים בישראל"
                    : "No financial commitment · Dedicated for verified Israeli retail category buyers"}
                </p>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
