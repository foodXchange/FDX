"use client";

import React, { useState, useTransition } from "react";
import { buyerAcceptOfferAndIssuePo } from "@/app/track/actions";

interface OfferItem {
  matchId: string;
  producerCode: string;
  country: string | null;
  productName: string;
  sellingPrice: number | null;
  currency: string;
  incoterm: string;
  netWeight: string | null;
  packagingFormat: string | null;
  kosherType: string | null;
  certifications: string[];
  leadTimeWeeks: number | null;
  moq: string | null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  requestId: string;
  buyerCompany: string;
  offer: OfferItem;
  lang: "he" | "en";
  onSuccess: (poNumber: string, totalValue: number, advanceDue: number) => void;
}

export default function BuyerPoModal({
  isOpen,
  onClose,
  requestId,
  buyerCompany,
  offer,
  lang,
  onSuccess,
}: Props) {
  const [isPending, startTransition] = useTransition();

  // Parsing initial quantity from MOQ or standard 24,000 (1x40ft)
  const defaultQty = 24000;
  const [quantity, setQuantity] = useState<number>(defaultQty);
  const [buyerPoNumber, setBuyerPoNumber] = useState("");
  const [destinationWarehouse, setDestinationWarehouse] = useState(
    `${buyerCompany} Central Logistics Warehouse, Ashdod`
  );
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const unitPrice = offer.sellingPrice ?? 1.85;
  const currency = offer.currency || "EUR";
  const incoterm = offer.incoterm || "CIF Ashdod Port (Israel)";

  const totalContract = Number((unitPrice * quantity).toFixed(2));
  const advance30 = Number((totalContract * 0.3).toFixed(2));
  const balance70 = Number((totalContract * 0.7).toFixed(2));

  const countryFlag =
    offer.country === "Spain"
      ? "🇪🇸"
      : offer.country === "Italy"
      ? "🇮🇹"
      : offer.country === "France"
      ? "🇫🇷"
      : offer.country === "Germany"
      ? "🇩🇪"
      : "🇪🇺";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim()) {
      setErrorMsg(
        lang === "he"
          ? "נא למלא שם איש קשר מורשה להוצאת ההזמנה"
          : "Please enter the authorized procurement officer name"
      );
      return;
    }
    if (quantity <= 0) {
      setErrorMsg(lang === "he" ? "כמות יחידות לא תקינה" : "Invalid order quantity");
      return;
    }

    setErrorMsg(null);

    startTransition(async () => {
      const res = await buyerAcceptOfferAndIssuePo({
        requestId,
        matchId: offer.matchId,
        producerCode: offer.producerCode,
        quantityUnits: quantity,
        buyerPoNumber: buyerPoNumber.trim() || undefined,
        destinationWarehouse: destinationWarehouse.trim() || undefined,
        contactName: contactName.trim(),
        contactEmail: contactEmail.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        specialInstructions: specialInstructions.trim() || undefined,
      });

      if (!res.ok) {
        setErrorMsg(res.error);
        return;
      }

      onSuccess(res.poNumber, res.totalValueEur, res.advanceDueEur);
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      dir={lang === "he" ? "rtl" : "ltr"}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-orange-400">
              {lang === "he" ? "חתימה והוצאת הזמנת רכש מסחרית" : "Commercial Purchase Order Issuance"}
            </div>
            <h3 className="text-base font-bold flex items-center gap-2">
              <span>{countryFlag}</span>
              <span>{offer.producerCode}</span>
              <span className="text-slate-400 text-xs font-normal">· {offer.productName}</span>
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center text-sm font-bold transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs">
          {/* Selected Product & Spec Recap */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="font-bold text-slate-900 text-sm">
                {offer.productName}
              </span>
              <span className="text-xs font-black text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-full border border-emerald-200">
                {currency} {unitPrice.toFixed(2)} / {lang === "he" ? "יח'" : "unit"} ({incoterm})
              </span>
            </div>

            <div className="flex flex-wrap gap-2 text-[11px] text-slate-600">
              <span className="bg-white border border-slate-200 px-2 py-0.5 rounded">
                {offer.netWeight || "1L"} · {offer.packagingFormat || "Standard Packaging"}
              </span>
              <span className="bg-white border border-slate-200 px-2 py-0.5 rounded">
                {lang === "he" ? "כשרות:" : "Kosher:"} {offer.kosherType || "Kosher Rabbinate"}
              </span>
              <span className="bg-white border border-slate-200 px-2 py-0.5 rounded">
                {offer.certifications.join(", ") || "BRC, IFS"}
              </span>
              <span className="bg-white border border-slate-200 px-2 py-0.5 rounded">
                {lang === "he" ? "זמן ייצור:" : "Lead Time:"} {offer.leadTimeWeeks || 3} {lang === "he" ? "שבועות" : "weeks"}
              </span>
            </div>
          </div>

          {/* 1. Order Quantity & Presets */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold uppercase tracking-wider text-[11px] text-slate-700">
                {lang === "he" ? "1. כמות יחידות בהזמנה (Units):" : "1. Order Quantity (Units):"} *
              </label>
              <span className="text-[11px] text-slate-500">
                {lang === "he" ? `מינימום ספק (MOQ): ${offer.moq || "1 מכולה"}` : `Supplier MOQ: ${offer.moq || "1 Container"}`}
              </span>
            </div>

            <div className="flex gap-2 mb-2">
              {[
                { label: lang === "he" ? "12,000 (מכולה 20')" : "12,000 (20ft FCL)", qty: 12000 },
                { label: lang === "he" ? "24,000 (מכולה 40' HQ)" : "24,000 (40ft HQ)", qty: 24000 },
                { label: lang === "he" ? "48,000 (2 מכולות)" : "48,000 (2 Containers)", qty: 48000 },
              ].map((preset) => (
                <button
                  key={preset.qty}
                  type="button"
                  onClick={() => setQuantity(preset.qty)}
                  className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border transition cursor-pointer ${
                    quantity === preset.qty
                      ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <input
              type="number"
              min="1000"
              step="500"
              required
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value) || 0)}
              className="w-full text-sm font-bold border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* 2. Interactive Commercial & Financial Breakdown */}
          <div className="p-4 rounded-xl bg-orange-50/70 border border-orange-200/90 space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-orange-800">
              {lang === "he" ? "2. סיכום שווי מסחרי ותנאי תשלום:" : "2. Commercial Financial Split & Settlement:"}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white p-3 rounded-lg border border-orange-200/80">
                <div className="text-[10px] font-semibold text-slate-500 uppercase">
                  {lang === "he" ? "שווי הזמנה כולל (CIF)" : "Total Contract Value (CIF)"}
                </div>
                <div className="text-base font-black text-slate-900 mt-0.5">
                  {currency} {totalContract.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {quantity.toLocaleString()} {lang === "he" ? "יח'" : "units"} × {currency} {unitPrice.toFixed(2)}
                </div>
              </div>

              <div className="bg-white p-3 rounded-lg border border-amber-300">
                <div className="text-[10px] font-bold text-amber-800 uppercase flex items-center justify-between">
                  <span>{lang === "he" ? "מקדמת ייצור (30%)" : "30% Advance Deposit"}</span>
                  <span className="text-amber-600">⚡</span>
                </div>
                <div className="text-base font-black text-amber-900 mt-0.5">
                  {currency} {advance30.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-amber-700 mt-0.5 font-medium">
                  {lang === "he" ? "להפעלת קו ייצור והדפסה" : "Commences bottling line"}
                </div>
              </div>

              <div className="bg-white p-3 rounded-lg border border-orange-200/80">
                <div className="text-[10px] font-semibold text-slate-500 uppercase">
                  {lang === "he" ? "יתרה כנגד שטר מטען (70%)" : "70% Balance on B/L"}
                </div>
                <div className="text-base font-black text-slate-900 mt-0.5">
                  {currency} {balance70.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {lang === "he" ? "כנגד עותק שטר מטען ימי" : "Against ocean B/L copy"}
                </div>
              </div>
            </div>
          </div>

          {/* 3. Logistics & PO Logistics Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                {lang === "he" ? "מספר הזמנה פנימי של הקונה (PO Ref):" : "Buyer Internal PO Number (Optional):"}
              </label>
              <input
                type="text"
                value={buyerPoNumber}
                onChange={(e) => setBuyerPoNumber(e.target.value)}
                placeholder={lang === "he" ? "לדוגמה: PO-2026-SHUFER-042" : "e.g. PO-2026-042"}
                className="w-full text-xs border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                {lang === "he" ? "יעד פריקה / מחסן לוגיסטי בישראל:" : "Destination Warehouse in Israel:"}
              </label>
              <input
                type="text"
                value={destinationWarehouse}
                onChange={(e) => setDestinationWarehouse(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          {/* 4. Authorized Procurement Signer */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1 border-t border-slate-100">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                {lang === "he" ? "שם מורשה חתימה / קניין:" : "Authorized Procurement Officer:"} *
              </label>
              <input
                type="text"
                required
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder={lang === "he" ? "שם מלא" : "Full Name"}
                className="w-full text-xs border border-slate-200 rounded-lg p-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                {lang === "he" ? "דוא\"ל ישיר לעדכוני ייצור:" : "Direct Email for PO Status:"}
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="buyer@chain.co.il"
                className="w-full text-xs border border-slate-200 rounded-lg p-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                {lang === "he" ? "טלפון / נייד לאימות:" : "Mobile / WhatsApp:"}
              </label>
              <input
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="054-..."
                className="w-full text-xs border border-slate-200 rounded-lg p-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          {/* Special Instructions */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              {lang === "he" ? "דגשים מיוחדים למפעל / הנחיות הדפסת מותג פרטי:" : "Special Production or Labeling Instructions:"}
            </label>
            <textarea
              rows={2}
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder={
                lang === "he"
                  ? "הדפסת תווית עברית מאושרת, משטוח יורו פאלט בלבד, סימון כשרות בולט..."
                  : "Private label front sticker, Euro pallet loading only, Kosher stamp required..."
              }
              className="w-full text-xs border border-slate-200 rounded-lg p-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Error Notice */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Legal / Escrow Guarantee Notice */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
            {lang === "he"
              ? "🔒 בטחונות מסחריים: הזמנת הרכש מעוגנת בתנאי סחר בינלאומיים (Incoterms 2020) ובחוזה תיווך מוגן ICC NCNDA 758. מקדמת ה-30% נסלקת ישירות לחשבון נאמנות ומפוקחת עד להשלמת בדיקת איכות קדם-שילוח (PSI)."
              : "🔒 Commercial Safeguards: PO is issued under ICC NCNDA 758 and Incoterms 2020 terms. The 30% advance deposit is held under settlement supervision until pre-shipment inspection (PSI) verification."}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition cursor-pointer"
            >
              {lang === "he" ? "ביטול" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold text-xs shadow-md disabled:opacity-50 transition cursor-pointer flex items-center gap-2"
            >
              {isPending ? (
                <span>{lang === "he" ? "מפיק הזמנת רכש..." : "Issuing Purchase Order..."}</span>
              ) : (
                <span>
                  {lang === "he"
                    ? `אישור וחתימה על הזמנת רכש (${currency} ${totalContract.toLocaleString()}) ←`
                    : `Sign & Issue Official Commercial PO (${currency} ${totalContract.toLocaleString()}) →`}
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
