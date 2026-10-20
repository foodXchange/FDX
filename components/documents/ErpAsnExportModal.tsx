"use client";

import { useState } from "react";
import {
  type ErpAsnPayload,
  generatePriorityErpCsv,
  generateSapIdocCsv,
  generateAsnJson,
} from "@/lib/documents/erpAsnGenerator";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  data: ErpAsnPayload;
}

export default function ErpAsnExportModal({ isOpen, onClose, data }: Props) {
  const [activeTab, setActiveTab] = useState<"priority" | "sap" | "json">("priority");
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const priorityCsv = generatePriorityErpCsv(data);
  const sapCsv = generateSapIdocCsv(data);
  const jsonPayload = generateAsnJson(data);

  const downloadFile = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPriority = () => {
    downloadFile(
      priorityCsv,
      `PRIORITY_ASN_${data.poNumber}_${data.containerNumber}.csv`,
      "text/csv;charset=utf-8"
    );
  };

  const handleDownloadSap = () => {
    downloadFile(
      sapCsv,
      `SAP_IDOC_ASN_${data.poNumber}_${data.containerNumber}.csv`,
      "text/csv;charset=utf-8"
    );
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(jsonPayload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" dir="rtl">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-7 space-y-6 shadow-2xl relative text-slate-100 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20 text-lg">
              📦
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">ייצוא מנשר קליטת מלאי למרלוג (ERP Inbound ASN)</h3>
              <p className="text-xs text-slate-400">
                סנכרון אוטומטי למערכות Priority ERP / SAP S/4HANA · מכולה {data.containerNumber}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Cargo Snapshot */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-slate-500 block">הזמנת רכש (PO):</span>
            <span className="font-mono font-bold text-slate-200">{data.poNumber}</span>
          </div>
          <div>
            <span className="text-slate-500 block">מכולה ומטען:</span>
            <span className="font-medium text-slate-200">{data.palletCount} משטחי יורו ({data.totalUnits.toLocaleString()} יח׳)</span>
          </div>
          <div>
            <span className="text-slate-500 block">רשימון יבוא מכס:</span>
            <span className="font-mono font-bold text-emerald-400">{data.customsDeclarationNumber || "שחרור מסלול ירוק"}</span>
          </div>
          <div>
            <span className="text-slate-500 block">מרלוג יעד:</span>
            <span className="font-semibold text-slate-200">{data.buyerCompany}</span>
          </div>
        </div>

        {/* Format Selector Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <button
            onClick={() => setActiveTab("priority")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "priority"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "bg-slate-800/60 text-slate-400 hover:text-slate-200"
            }`}
          >
            📋 פריוריטי (Priority ERP CSV)
          </button>
          <button
            onClick={() => setActiveTab("sap")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "sap"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "bg-slate-800/60 text-slate-400 hover:text-slate-200"
            }`}
          >
            🏢 SAP S/4HANA (IDoc CSV)
          </button>
          <button
            onClick={() => setActiveTab("json")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "json"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "bg-slate-800/60 text-slate-400 hover:text-slate-200"
            }`}
          >
            ⚡ EDI Webhook (JSON)
          </button>
        </div>

        {/* Tab Content & Code Preview */}
        <div className="space-y-3">
          {activeTab === "priority" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">
                  קובץ CSV מותאם עברית (UTF-8 עם BOM) לייבוא במסך <strong>״קבלת סחורה מספק״</strong> בפריוריטי:
                </span>
                <span className="font-mono text-emerald-400 text-[11px] font-bold">24 Pallets Mapped</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-[11px] text-slate-300 max-h-48 overflow-y-auto whitespace-pre leading-relaxed select-all">
                {priorityCsv.slice(1, 800)}...
              </div>
              <button
                onClick={handleDownloadPriority}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
              >
                <span>📥</span>
                <span>הורד קובץ יבוא לפריוריטי (Priority ERP CSV)</span>
              </button>
            </div>
          )}

          {activeTab === "sap" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">
                  מנשר SAP Inbound Delivery (פורמט Handling Unit SSCC ורשימון מכס):
                </span>
                <span className="font-mono text-indigo-400 text-[11px] font-bold">IDoc Ready</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-[11px] text-slate-300 max-h-48 overflow-y-auto whitespace-pre leading-relaxed select-all" dir="ltr">
                {sapCsv.slice(0, 800)}...
              </div>
              <button
                onClick={handleDownloadSap}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 transition-all cursor-pointer"
              >
                <span>📥</span>
                <span>הורד מנשר אספקה SAP S/4HANA (IDoc CSV)</span>
              </button>
            </div>
          )}

          {activeTab === "json" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">
                  מבנה נתונים REST API לשליחה ישירה ל-WMS / ERP של המרלוג:
                </span>
                <span className="font-mono text-amber-400 text-[11px] font-bold">JSON Schema v1.0</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-[11px] text-emerald-400 max-h-48 overflow-y-auto whitespace-pre leading-relaxed select-all" dir="ltr">
                {JSON.stringify(jsonPayload, null, 2).slice(0, 900)}...
              </div>
              <button
                onClick={handleCopyJson}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-all cursor-pointer"
              >
                <span>{copied ? "✓ הועתק ללוח!" : "📋 העתק JSON מלא ללוח"}</span>
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>כולל 24 מספרי משטח SSCC תקניים, משקל ברוטו/נטו ומספר רשימון ירוק.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
}
