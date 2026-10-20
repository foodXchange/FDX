"use client";

import { useState } from "react";

interface Props {
  requestId: string;
  poNumber: string;
  buyerCompany: string;
  buyerContact?: string;
  buyerPhone?: string;
  supplierName: string;
  supplierCountry?: string;
  productName: string;
  orderVolume?: string;
  containerNumber?: string;
  billOfLading?: string;
  vesselName?: string;
  etaPort?: string;
  stageName?: string;
  supplierPortalUrl?: string;
  buyerPortalUrl?: string;
}

export default function TripartiteQuickDispatchCard({
  requestId,
  poNumber,
  buyerCompany,
  buyerContact,
  supplierName,
  supplierCountry = "European Union",
  productName,
  orderVolume = "24,000 Units (1 x 40ft HQ FCL)",
  containerNumber = "MSKU-9481029",
  billOfLading = "MSCUVAL881920",
  vesselName = "MSC LEANNE",
  etaPort = "18/11/2026",
  stageName = "In Production",
  supplierPortalUrl,
  buyerPortalUrl,
}: Props) {
  const [copiedType, setCopiedType] = useState<string | null>(null);

  const bPortal = buyerPortalUrl || `https://foodxchange.com/track/${requestId}`;
  const sPortal = supplierPortalUrl || `https://foodxchange.com/track/${requestId}`;

  const buyerMsg = `שלום ${buyerContact || buyerCompany},
עדכון מדסק הסחר הבינלאומי FoodXchange עבור הזמנה [${poNumber}]:
מוצר: ${productName} (${orderVolume})
סטטוס מסחרי: ${stageName}
אונייה ומכולה: ${vesselName} · מכולה: ${containerNumber}
שטר מטען ימי: ${billOfLading}
צפי הגעה לנמל אשדוד: ${etaPort}
לצפייה בתיק המסמכים המלא (B/L, EUR.1, כשרות) ומעקב חי:
${bPortal}`;

  const factoryMsg = `Hello ${supplierName} Export Dept (${supplierCountry}),
FoodXchange Trade Desk update regarding Commercial PO [${poNumber}]:
Product: ${productName} (${orderVolume})
Stage: ${stageName}
Vessel Booking: ${vesselName} · B/L: ${billOfLading} · Container: ${containerNumber}
Please access the supplier milestone hub to confirm bottling schedules or upload laboratory COA:
${sPortal}`;

  const customsMsg = `שלום לעמיל המכס (Customs Broker),
עדכון מטעם FoodXchange עבור שחרור מכולה יבוא בנמל אשדוד:
יבואן רשמי: ${buyerCompany}
ספק יצרן: ${supplierName} (${supplierCountry})
מספר מכולה: ${containerNumber}
שטר מטען ימי (B/L): ${billOfLading}
אונייה: ${vesselName} · צפי עגינה: ${etaPort}
תיק מסמכים הכולל שטר מטען מקורי (3/3), EUR.1 לפטור ממכס, וכשרות הרבנות הראשית נמסר לשחרור.`;

  const copyText = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  return (
    <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-700 space-y-3 mb-6 text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <h3 className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
            <span>⚡</span>
            <span>Tripartite 1-Click Communications Desk</span>
          </h3>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 border border-emerald-800 px-2 py-0.5 rounded-full">
            PO: {poNumber}
          </span>
        </div>

        <div className="text-[11px] text-slate-300">
          Instant WhatsApp / Email Dispatch for Sourcing Agent
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Buyer Dispatch Card */}
        <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2 hover:bg-white/10 transition">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">
              1. To Buyer ({buyerCompany})
            </span>
            <span className="text-[10px] text-slate-400">Hebrew RTL</span>
          </div>

          <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
            "{buyerMsg.slice(0, 95)}..."
          </p>

          <div className="flex items-center gap-1.5 pt-1">
            <a
              href={`https://api.whatsapp.com/send?text=${encodeURIComponent(buyerMsg)}`}
              target="_blank"
              rel="noreferrer"
              className="flex-1 text-center py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition shadow-2xs flex items-center justify-center gap-1"
            >
              <span>💬</span>
              <span>Send WhatsApp</span>
            </a>
            <button
              type="button"
              onClick={() => copyText(buyerMsg, "buyer")}
              className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 border border-white/10 text-[10px] font-semibold transition"
            >
              {copiedType === "buyer" ? "✓" : "📋 Copy"}
            </button>
          </div>
        </div>

        {/* Factory Dispatch Card */}
        <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2 hover:bg-white/10 transition">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-orange-400 tracking-wider">
              2. To Factory ({supplierName})
            </span>
            <span className="text-[10px] text-slate-400">English / EU</span>
          </div>

          <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
            "{factoryMsg.slice(0, 95)}..."
          </p>

          <div className="flex items-center gap-1.5 pt-1">
            <a
              href={`https://api.whatsapp.com/send?text=${encodeURIComponent(factoryMsg)}`}
              target="_blank"
              rel="noreferrer"
              className="flex-1 text-center py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold text-[11px] transition shadow-2xs flex items-center justify-center gap-1"
            >
              <span>💬</span>
              <span>Send WhatsApp</span>
            </a>
            <button
              type="button"
              onClick={() => copyText(factoryMsg, "factory")}
              className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 border border-white/10 text-[10px] font-semibold transition"
            >
              {copiedType === "factory" ? "✓" : "📋 Copy"}
            </button>
          </div>
        </div>

        {/* Customs Broker Dispatch Card */}
        <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2 hover:bg-white/10 transition">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-blue-400 tracking-wider">
              3. To Customs Broker (Ashdod)
            </span>
            <span className="text-[10px] text-slate-400">Fritz / DSV</span>
          </div>

          <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
            "{customsMsg.slice(0, 95)}..."
          </p>

          <div className="flex items-center gap-1.5 pt-1">
            <a
              href={`https://api.whatsapp.com/send?text=${encodeURIComponent(customsMsg)}`}
              target="_blank"
              rel="noreferrer"
              className="flex-1 text-center py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] transition shadow-2xs flex items-center justify-center gap-1"
            >
              <span>💬</span>
              <span>Send WhatsApp</span>
            </a>
            <button
              type="button"
              onClick={() => copyText(customsMsg, "customs")}
              className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 border border-white/10 text-[10px] font-semibold transition"
            >
              {copiedType === "customs" ? "✓" : "📋 Copy"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
