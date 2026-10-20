"use client";

import React, { useState, useTransition, useMemo } from "react";
import {
  type TripartiteEventType,
  type TripartiteEventPayload,
  type TripartiteNotificationLog,
  formatTripartiteMessage,
} from "@/lib/notifications/tripartiteDispatchEngine";

export interface TripartiteDispatchCockpitProps {
  requestId: string;
  poNumber?: string;
  buyerCompany: string;
  buyerContact?: string;
  buyerPhone?: string;
  buyerEmail?: string;
  supplierName: string;
  supplierCountry: string;
  supplierEmail?: string;
  supplierPhone?: string;
  productName: string;
  orderVolume?: string;
  totalOrderValueEur?: number;
  advance30Eur?: number;
  balance70Eur?: number;
  containerNumber?: string;
  billOfLading?: string;
  vesselName?: string;
  shippingLine?: string;
  etaPort?: string;
  customsDeclarationNumber?: string;
  warehousePalletCount?: number;
  receivingOfficer?: string;
  grnNumber?: string;
  currentStage?: string;
  initialLogs?: TripartiteNotificationLog[];
  onTriggerDispatch?: (
    eventType: TripartiteEventType,
    channel: "whatsapp" | "email" | "both"
  ) => Promise<{ ok: boolean; message: string; whatsappUrl?: string }>;
}

const EVENT_TRIGGERS: {
  key: TripartiteEventType;
  titleEn: string;
  titleHe: string;
  recipientBadge: string;
  recipientRole: "buyer" | "factory" | "customs";
  color: string;
  icon: string;
  stageMatch: string[];
}[] = [
  {
    key: "po_signed_advance_due",
    titleEn: "1. Commercial PO Signed & 30% Advance Due",
    titleHe: "1. חתימת הזמנת רכש ודרישת מקדמת 30%",
    recipientBadge: "Buyer (Hebrew)",
    recipientRole: "buyer",
    color: "border-blue-300 bg-blue-50/50 text-blue-950",
    icon: "📄",
    stageMatch: ["order_po_issued", "commercial_negotiation"],
  },
  {
    key: "advance_verified_production_released",
    titleEn: "2. 30% Advance Verified & Factory Production Released",
    titleHe: "2. אישור מקדמת 30% והפעלת ייצור במפעל",
    recipientBadge: "Factory (EN/ES/IT)",
    recipientRole: "factory",
    color: "border-amber-300 bg-amber-50/50 text-amber-950",
    icon: "🏭",
    stageMatch: ["manufacturing", "order_po_issued"],
  },
  {
    key: "container_loaded_vessel_departed",
    titleEn: "3. Container Loaded & Ocean Vessel Sea Departure",
    titleHe: "3. מכולה הועמסה ויצאה בים התיכון לאשדוד",
    recipientBadge: "Buyer (Hebrew)",
    recipientRole: "buyer",
    color: "border-sky-300 bg-sky-50/50 text-sky-950",
    icon: "🚢",
    stageMatch: ["manufacturing", "customs_warehouse"],
  },
  {
    key: "vessel_approaching_customs_dispatch",
    titleEn: "4. Vessel 48h from Ashdod · Customs Pack Handover",
    titleHe: "4. אונייה בקרבת אשדוד · מסירת תיק לעמיל מכס",
    recipientBadge: "Customs Broker (Hebrew)",
    recipientRole: "customs",
    color: "border-indigo-300 bg-indigo-50/50 text-indigo-950",
    icon: "🇮🇱",
    stageMatch: ["customs_warehouse"],
  },
  {
    key: "customs_cleared_inland_trucking",
    titleEn: "5. Customs Green Channel Cleared · Inland Trucking",
    titleHe: "5. שחרור מכס מסלול ירוק והובלה יבשתית למרלוג",
    recipientBadge: "Buyer Logistics (Hebrew)",
    recipientRole: "buyer",
    color: "border-emerald-300 bg-emerald-50/50 text-emerald-950",
    icon: "🚚",
    stageMatch: ["customs_warehouse"],
  },
  {
    key: "grn_dock_accepted_deal_closed",
    titleEn: "6. Dock GRN Signed & Deal 100% Closed",
    titleHe: "6. חתימה על תעודת קבלה (GRN) וסגירת עסקה",
    recipientBadge: "Buyer & Factory",
    recipientRole: "buyer",
    color: "border-purple-300 bg-purple-50/50 text-purple-950",
    icon: "🏁",
    stageMatch: ["completed"],
  },
];

export default function TripartiteDispatchCockpit({
  requestId,
  poNumber = "FDX-PO-2604",
  buyerCompany,
  buyerContact,
  buyerPhone,
  buyerEmail,
  supplierName,
  supplierCountry,
  supplierEmail,
  supplierPhone,
  productName,
  orderVolume = "24,000 Units (1 x 40ft HQ FCL)",
  totalOrderValueEur = 44400,
  advance30Eur = 13320,
  balance70Eur = 31080,
  containerNumber = "MSKU-9481029",
  billOfLading = "MSCUVAL881920",
  vesselName = "MSC LEANNE / Voyage 2604E",
  shippingLine = "MSC",
  etaPort = "Pending Port Berth",
  customsDeclarationNumber,
  warehousePalletCount = 24,
  receivingOfficer,
  grnNumber,
  currentStage = "manufacturing",
  initialLogs = [],
  onTriggerDispatch,
}: TripartiteDispatchCockpitProps) {
  const [expandedTrigger, setExpandedTrigger] = useState<TripartiteEventType | null>(null);
  const [logs, setLogs] = useState<TripartiteNotificationLog[]>(initialLogs);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Common payload memo
  const basePayload = useMemo<TripartiteEventPayload>(() => {
    return {
      requestId,
      eventType: "po_signed_advance_due",
      poNumber,
      buyerCompany,
      buyerContact,
      buyerPhone,
      buyerEmail,
      supplierName,
      supplierCountry,
      supplierEmail,
      supplierPhone,
      productName,
      orderVolume,
      totalOrderValueEur,
      advance30Eur,
      balance70Eur,
      containerNumber,
      billOfLading,
      vesselName,
      shippingLine,
      etaPort,
      customsDeclarationNumber,
      warehousePalletCount,
      receivingOfficer,
      grnNumber,
    };
  }, [
    requestId,
    poNumber,
    buyerCompany,
    buyerContact,
    buyerPhone,
    buyerEmail,
    supplierName,
    supplierCountry,
    supplierEmail,
    supplierPhone,
    productName,
    orderVolume,
    totalOrderValueEur,
    advance30Eur,
    balance70Eur,
    containerNumber,
    billOfLading,
    vesselName,
    shippingLine,
    etaPort,
    customsDeclarationNumber,
    warehousePalletCount,
    receivingOfficer,
    grnNumber,
  ]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDispatch = (
    triggerKey: TripartiteEventType,
    channel: "whatsapp" | "email" | "both"
  ) => {
    setActionNotice(null);

    const payloadForEvent: TripartiteEventPayload = {
      ...basePayload,
      eventType: triggerKey,
    };
    const formatted = formatTripartiteMessage(payloadForEvent);

    if (channel === "whatsapp") {
      window.open(formatted.whatsappUrl, "_blank");
      // optimistic log
      const newLog: TripartiteNotificationLog = {
        id: `LOG-${Date.now().toString(36).toUpperCase()}`,
        eventType: triggerKey,
        recipientRole: formatted.recipientRole,
        recipientName: formatted.recipientName,
        recipientContact: formatted.recipientContact,
        channel: "whatsapp",
        status: "delivered",
        timestamp: new Date().toISOString(),
        previewText: formatted.whatsappText.slice(0, 120) + "...",
        actionUrl: formatted.portalUrl,
      };
      setLogs((prev) => [newLog, ...prev]);
      setActionNotice(`✓ WhatsApp message opened for ${formatted.recipientName}`);
      return;
    }

    startTransition(async () => {
      if (onTriggerDispatch) {
        const res = await onTriggerDispatch(triggerKey, channel);
        if (res.ok) {
          setActionNotice(res.message);
          if (res.whatsappUrl && channel === "both") {
            window.open(res.whatsappUrl, "_blank");
          }
          const newLog: TripartiteNotificationLog = {
            id: `LOG-${Date.now().toString(36).toUpperCase()}`,
            eventType: triggerKey,
            recipientRole: formatted.recipientRole,
            recipientName: formatted.recipientName,
            recipientContact: formatted.recipientContact,
            channel,
            status: "delivered",
            timestamp: new Date().toISOString(),
            previewText: formatted.whatsappText.slice(0, 120) + "...",
            actionUrl: formatted.portalUrl,
          };
          setLogs((prev) => [newLog, ...prev]);
        } else {
          setActionNotice(`Error: ${res.message}`);
        }
      } else {
        // Fallback client simulation if server action is not supplied
        setActionNotice(`✓ Dispatched ${channel} alert to ${formatted.recipientName}`);
        const newLog: TripartiteNotificationLog = {
          id: `LOG-${Date.now().toString(36).toUpperCase()}`,
          eventType: triggerKey,
          recipientRole: formatted.recipientRole,
          recipientName: formatted.recipientName,
          recipientContact: formatted.recipientContact,
          channel,
          status: "delivered",
          timestamp: new Date().toISOString(),
          previewText: formatted.whatsappText.slice(0, 120) + "...",
          actionUrl: formatted.portalUrl,
        };
        setLogs((prev) => [newLog, ...prev]);
      }
    });
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden font-sans space-y-6 p-6">
      {/* ── COCKPIT HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-slate-900 to-indigo-950 text-white flex items-center justify-center text-2xl shadow-sm shrink-0">
            📡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                Automated Tripartite Dispatch Desk
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                ACTIVE RADAR
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Autonomous lifecycle messaging across Buyer (Hebrew), European Factory (EN/IT/ES), and Ashdod Customs Broker.
            </p>
          </div>
        </div>

        {/* Quick Deal Reference Tags */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs font-mono font-semibold text-slate-700">
            PO: {poNumber}
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-800">
            {buyerCompany}
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-900">
            {supplierName} ({supplierCountry})
          </span>
        </div>
      </div>

      {actionNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between">
          <span>{actionNotice}</span>
          <button
            type="button"
            onClick={() => setActionNotice(null)}
            className="text-emerald-600 hover:text-emerald-900 font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── THE 6 LIFECYCLE EVENT TRIGGER CARDS ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {EVENT_TRIGGERS.map((t) => {
          const isCurrent = t.stageMatch.includes(currentStage);
          const isExpanded = expandedTrigger === t.key;
          const payloadForEvent: TripartiteEventPayload = {
            ...basePayload,
            eventType: t.key,
          };
          const formatted = formatTripartiteMessage(payloadForEvent);

          return (
            <div
              key={t.key}
              className={`rounded-2xl border p-4 transition flex flex-col justify-between ${
                isCurrent
                  ? `${t.color} shadow-sm ring-2 ring-slate-900/10`
                  : "border-slate-200 bg-slate-50/50 text-slate-700 hover:border-slate-300"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xl">{t.icon}</span>
                    <span className="text-xs font-bold text-slate-900">{t.titleEn}</span>
                  </div>
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                      isCurrent
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-600 border-slate-200"
                    }`}
                  >
                    {t.recipientBadge}
                  </span>
                </div>

                <div className="text-[11px] font-medium text-slate-600 line-clamp-2 mt-1" dir={t.recipientRole === "factory" ? "ltr" : "rtl"}>
                  {formatted.whatsappText}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-200/80 mt-3 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setExpandedTrigger(isExpanded ? null : t.key)}
                  className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 transition flex items-center gap-1 cursor-pointer"
                >
                  <span>{isExpanded ? "Hide Preview" : "Preview"}</span>
                  <span className="text-[9px]">{isExpanded ? "▲" : "▼"}</span>
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleDispatch(t.key, "whatsapp")}
                    className="text-[11px] font-bold px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition flex items-center gap-1 cursor-pointer shadow-2xs"
                    title="Send via WhatsApp Web"
                  >
                    <span>💬</span>
                    <span>WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleDispatch(t.key, "email")}
                    className="text-[11px] font-bold px-2.5 py-1 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white rounded-lg transition flex items-center gap-1 cursor-pointer shadow-2xs"
                    title="Dispatch Email via Resend"
                  >
                    <span>✉️</span>
                    <span>Email</span>
                  </button>
                </div>
              </div>

              {/* Expanded Template Preview Drawer */}
              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-slate-300 text-xs space-y-2 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold">
                    <span>RECIPIENT: {formatted.recipientName} ({formatted.recipientContact})</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(formatted.whatsappText, t.key)}
                      className="text-blue-600 hover:text-blue-800 cursor-pointer"
                    >
                      {copiedKey === t.key ? "✓ Copied" : "Copy Text"}
                    </button>
                  </div>
                  <div
                    className="p-2.5 rounded-xl bg-white border border-slate-200 font-mono text-[11px] text-slate-800 whitespace-pre-wrap max-h-36 overflow-y-auto leading-relaxed"
                    dir={t.recipientRole === "factory" ? "ltr" : "rtl"}
                  >
                    {formatted.whatsappText}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── DISPATCH AUDIT TRAIL & ACTIVITY LOG ── */}
      <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/70 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <span>📜</span>
            <span>Real-Time Dispatch Activity Log & Communication Audit</span>
          </h3>
          <span className="text-[10px] font-mono text-slate-500">
            {logs.length} events logged
          </span>
        </div>

        {logs.length > 0 ? (
          <div className="divide-y divide-slate-200 max-h-48 overflow-y-auto">
            {logs.map((log) => (
              <div key={log.id} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{log.recipientName}</span>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                      {log.channel}
                    </span>
                    <span className="text-[10px] text-emerald-700 font-semibold">
                      ✓ {log.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate max-w-xl">
                    {log.previewText}
                  </p>
                </div>

                <div className="text-[10px] font-mono text-slate-400 shrink-0 text-right">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center text-slate-400 text-xs italic">
            No notification events dispatched yet for this deal. Click any trigger above to launch WhatsApp or Email.
          </div>
        )}
      </div>
    </div>
  );
}
