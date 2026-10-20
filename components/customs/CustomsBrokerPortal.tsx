"use client";

import React, { useState, useTransition } from "react";
import ExportDocumentHandoverModal from "@/components/documents/ExportDocumentHandoverModal";
import ErpAsnExportModal from "@/components/documents/ErpAsnExportModal";
import type { CommercialOrderLifecycle } from "@/app/admin/requests/actions";
import { submitCustomsBrokerClearance } from "@/app/customs/actions";

export interface CustomsBrokerPortalProps {
  requestId: string;
  buyerCompany: string;
  buyerContact?: string;
  buyerPhone?: string;
  buyerEmail?: string;
  buyerWarehouseAddress?: string;
  supplierName: string;
  supplierCountry: string;
  productName: string;
  orderVolume?: string;
  containerCount?: number;
  workflow?: CommercialOrderLifecycle | null;
  poNumber?: string;
  poDate?: string;
  customsSignoff?: {
    customsDeclarationNumber?: string;
    releaseChannel?: string;
    gatePassNumber?: string;
    clearingAgentName?: string;
    clearingAgency?: string;
    notes?: string;
    clearedAt?: string;
    status?: string;
  } | null;
}

export default function CustomsBrokerPortal({
  requestId,
  buyerCompany,
  buyerContact,
  buyerPhone,
  buyerEmail,
  buyerWarehouseAddress,
  supplierName,
  supplierCountry,
  productName,
  orderVolume = "24,000 Units (1 x 40ft HQ FCL)",
  containerCount = 1,
  workflow,
  poNumber,
  poDate,
  customsSignoff,
}: CustomsBrokerPortalProps) {
  const [showDocModal, setShowDocModal] = useState(false);
  const [activeDocTab, setActiveDocTab] = useState<string>("bl");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Form inputs for customs broker
  const isAlreadyCleared =
    workflow?.customs_status === "customs_cleared" || customsSignoff?.status === "cleared";

  const [clearingAgency, setClearingAgency] = useState<string>(
    customsSignoff?.clearingAgency || "ד.ס.ו שילוח ועמילות מכס (DSV)"
  );
  const [clearingAgentName, setClearingAgentName] = useState<string>(
    customsSignoff?.clearingAgentName || "אלון ברקוביץ' (מורשה מכס #4912)"
  );
  const [customsDeclarationNumber, setCustomsDeclarationNumber] = useState<string>(
    customsSignoff?.customsDeclarationNumber ||
      workflow?.customs_declaration_number ||
      `IL-2604-${requestId.slice(0, 6).toUpperCase()}`
  );
  const [releaseChannel, setReleaseChannel] = useState<"green" | "document_inspection" | "physical_check">(
    (customsSignoff?.releaseChannel as "green" | "document_inspection" | "physical_check") || "green"
  );
  const [gatePassNumber, setGatePassNumber] = useState<string>(
    customsSignoff?.gatePassNumber || `DO-ASH-${requestId.slice(0, 5).toUpperCase()}-21`
  );
  const [notes, setNotes] = useState<string>(
    customsSignoff?.notes ||
      "הצהרת יבוא נבדקה ואושרה במסלול ירוק. המכולה שוחררה להובלה יבשתית ישירה למחסן הלקוח."
  );

  const [isPending, startTransition] = useTransition();
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [actionErrorMsg, setActionErrorMsg] = useState<string | null>(null);
  const [showAsnModal, setShowAsnModal] = useState<boolean>(false);

  const activeContainer = workflow?.container_number || "MSKU-9481029";
  const activeBl = workflow?.bill_of_lading || "MSCUVAL881920";
  const activeVessel = workflow?.vessel_name || "MSC LEANNE / Voyage 2604E";
  const activeLine = workflow?.shipping_line || "MSC (Mediterranean Shipping Company)";
  const activePo = poNumber || workflow?.po_number || `FDX-PO-${requestId.slice(0, 6).toUpperCase()}`;

  const copyToClipboard = (text: string, key: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const handleClearanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActionErrorMsg(null);
    setActionSuccessMsg(null);

    startTransition(async () => {
      const res = await submitCustomsBrokerClearance({
        requestId,
        customsDeclarationNumber,
        releaseChannel,
        gatePassNumber,
        clearingAgentName,
        clearingAgency,
        notes,
      });

      if (res.ok) {
        setActionSuccessMsg(res.message);
      } else {
        setActionErrorMsg(res.error);
      }
    });
  };

  // 6 Essential customs documents definition
  const customsDocuments = [
    {
      id: "bl",
      title: "שטר מטען ימי מקורי (Clean Ocean B/L 3/3)",
      titleEn: "Original Bill of Lading",
      docRef: activeBl,
      issuer: activeLine,
      status: "מאומת ותקין לשחרור",
      badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      icon: "🚢",
      description: "שטר מטען ימי נקי שהונפק ע״י חברת הספנות לנמל אשדוד לפקודת היבואן (Consignee).",
    },
    {
      id: "invoice",
      title: "חשבונית מסחרית מקורית (Commercial Invoice)",
      titleEn: "Commercial Invoice",
      docRef: `INV-EU-${requestId.slice(0, 5).toUpperCase()}`,
      issuer: supplierName,
      status: "מאושרת ומגובה בהסכם",
      badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      icon: "💶",
      description: "חשבונית ספק ביורו בתנאי מכר CIF Ashdod Port, כוללת פירוט יחידות וערך מטען לצורכי מכס.",
    },
    {
      id: "packing",
      title: "רשימת אריזה מפורטת (Detailed Packing List)",
      titleEn: "Packing List",
      docRef: `PKL-${requestId.slice(0, 5).toUpperCase()}`,
      issuer: `${supplierName} QA Logistics`,
      status: "מאושרת וכוללת חותמת",
      badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      icon: "📦",
      description: "פירוט מדויק של 24 משטחים, 24,000 יחידות, משקל נקי 19,800 ק״ג ומשקל ברוטו 21,600 ק״ג.",
    },
    {
      id: "eur1",
      title: "תעודת מקור אירופית EUR.1 (פטור ממכס 0%)",
      titleEn: "EUR.1 Movement Certificate",
      docRef: `EUR1-ES-${requestId.slice(0, 6).toUpperCase()}`,
      issuer: "European Customs Authority",
      status: "תקפה לפטור מלא ממכס",
      badgeColor: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
      icon: "🇪🇺",
      description: "תעודת מקור רשמית המקנה פטור מלא ממכס (0% שיעור מכס) בהתאם לפרוטוקול 4 להסכם ישראל-איחוד אירופי.",
    },
    {
      id: "kosher",
      title: "אישור כשרות הרבנות הראשית לישראל (מחלקת היבוא)",
      titleEn: "Chief Rabbinate Kosher Certificate",
      docRef: `RAB-IL-2026-${requestId.slice(0, 4).toUpperCase()}`,
      issuer: "הרבנות הראשית לישראל / בד״ץ מוכר",
      status: "מאושרת לשיווק קמעונאי",
      badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
      icon: "✡️",
      description: "אישור כשרות תקף מיובא המאושר ע״י מחלקת היבוא ברבנות הראשית לשיווק חוקי ברשתות השיווק בישראל.",
    },
    {
      id: "health",
      title: "אישור שירות המזון הארצי ותעודת אנליזה (MOH COA)",
      titleEn: "Ministry of Health Certificate of Analysis",
      docRef: `MOH-FCS-${requestId.slice(0, 5).toUpperCase()}`,
      issuer: "שירות המזון הארצי - משרד הבריאות",
      status: "בדיקות מעבדה תקינות",
      badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
      icon: "🔬",
      description: "תעודת אנליזה מלאה ממעבדה מוסמכת אירופית ובדיקת מיקרוביולוגיה ומתכות כבדות מאושרת.",
    },
  ];

  return (
    <div dir="rtl" className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
      {/* ── TOP GOVERNMENT & CUSTOMS CLEARING BAR ── */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 backdrop-blur-md bg-opacity-95 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-xl shrink-0">
              🇮🇱
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-white tracking-wide">
                  שער עולמי · תיק שחרור מכס מכולה
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  נמל אשדוד (רציף 21)
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                פורטל ייעודי לעמיל מכס מורשה · FoodXchange Institutional Sourcing Desk
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {isAlreadyCleared ? (
              <div className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-xs font-bold flex items-center gap-2 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>רשימון שוחרר (מסלול ירוק) ✓</span>
              </div>
            ) : (
              <div className="px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                <span>ממתין להצהרת עמיל מכס</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowDocModal(true)}
              className="text-xs font-bold px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span>📑</span>
              <span>פתח חבילת מסמכים מלאה</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT CONTAINER ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Success / Error Banners */}
        {actionSuccessMsg && (
          <div className="p-4 rounded-2xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 text-sm flex items-start gap-3 shadow-lg">
            <span className="text-2xl shrink-0">🎉</span>
            <div className="space-y-1">
              <strong className="block text-emerald-300 font-bold">פעולת השחרור הושלמה בהצלחה!</strong>
              <p className="text-xs leading-relaxed text-emerald-200/90">{actionSuccessMsg}</p>
            </div>
          </div>
        )}

        {actionErrorMsg && (
          <div className="p-4 rounded-2xl bg-rose-950/70 border border-rose-500/40 text-rose-200 text-sm flex items-start gap-3 shadow-lg">
            <span className="text-2xl shrink-0">⚠️</span>
            <div className="space-y-1">
              <strong className="block text-rose-300 font-bold">שגיאה ברישום השחרור</strong>
              <p className="text-xs leading-relaxed text-rose-200/90">{actionErrorMsg}</p>
            </div>
          </div>
        )}

        {/* ── CARGO & VESSEL TELEMETRY OVERVIEW CARD ── */}
        <section className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-800/80">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                  הזמנת רכש מסחרית: {activePo}
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-300">
                  {poDate || new Date().toISOString().slice(0, 10)}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-white mt-1">
                {productName} · {orderVolume}
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                יבואן רשמי (Importer of Record):{" "}
                <strong className="text-slate-200">{buyerCompany}</strong> · יצואן/יצרן:{" "}
                <strong className="text-slate-200">{supplierName}</strong> ({supplierCountry})
              </p>
            </div>

            {/* Importer Quick Contact */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-xs text-slate-300 flex items-center gap-4 shrink-0">
              <div>
                <span className="text-[10px] text-slate-500 block">איש קשר ביבואן (רכש / לוגיסטיקה)</span>
                <span className="font-bold text-slate-200">{buyerContact || "אגף סחר וייבוא קמעונאי"}</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">{buyerPhone || "03-9500000"}</span>
              </div>
              <div className="border-r border-slate-800 pr-4">
                <span className="text-[10px] text-slate-500 block">יעד פריקה סופי</span>
                <span className="font-semibold text-sky-400 max-w-[200px] truncate block">
                  {buyerWarehouseAddress || "מרלוג מרכזי, פארק תעשיות שורק"}
                </span>
              </div>
            </div>
          </div>

          {/* Logistics Telemetry Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-6 text-xs">
            {/* 1. Container Number */}
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
              <span className="text-[10px] text-slate-500 font-semibold uppercase">מספר מכולה</span>
              <div className="font-mono font-bold text-sm text-emerald-400 my-1 truncate">
                {activeContainer}
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(activeContainer, "cont")}
                className="text-[10px] text-slate-400 hover:text-white transition text-right cursor-pointer"
              >
                {copiedKey === "cont" ? "✓ הועתק" : "העתק מספר מכולה"}
              </button>
            </div>

            {/* 2. Bill of Lading */}
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
              <span className="text-[10px] text-slate-500 font-semibold uppercase">שטר מטען ימי (B/L)</span>
              <div className="font-mono font-bold text-sm text-sky-400 my-1 truncate">
                {activeBl}
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(activeBl, "bl")}
                className="text-[10px] text-slate-400 hover:text-white transition text-right cursor-pointer"
              >
                {copiedKey === "bl" ? "✓ הועתק" : "העתק מספר B/L"}
              </button>
            </div>

            {/* 3. Ocean Vessel */}
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
              <span className="text-[10px] text-slate-500 font-semibold uppercase">אונייה וקו ספנות</span>
              <div className="font-semibold text-slate-200 my-1 truncate">
                {activeVessel}
              </div>
              <span className="text-[10px] text-slate-500">{activeLine}</span>
            </div>

            {/* 4. Port of Discharge */}
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
              <span className="text-[10px] text-slate-500 font-semibold uppercase">נמל פריקה ורציף</span>
              <div className="font-semibold text-slate-200 my-1 truncate">
                {workflow?.port_of_destination || "נמל אשדוד (ILASH)"}
              </div>
              <span className="text-[10px] text-amber-400 font-mono font-semibold">Pier 21 / Bonded Yard</span>
            </div>

            {/* 5. Israeli Customs Classification (HS Code) */}
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
              <span className="text-[10px] text-slate-500 font-semibold uppercase">פרט מכס (HS Code)</span>
              <div className="font-mono font-bold text-indigo-300 my-1">
                1509.2000
              </div>
              <span className="text-[10px] text-emerald-400">פטור מכס מלא (0% EUR.1)</span>
            </div>

            {/* 6. Estimated Berth (ETA) */}
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
              <span className="text-[10px] text-slate-500 font-semibold uppercase">מועד עגינה משוער</span>
              <div className="font-bold text-amber-300 my-1 font-mono">
                {workflow?.eta_port || "בעגינה / בטיפול רציף"}
              </div>
              <span className="text-[10px] text-slate-500">נמל אשדוד - מסוף מכולות</span>
            </div>
          </div>
        </section>

        {/* ── THE 6-DOCUMENT CUSTOMS CLEARANCE SUITE ── */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>📁</span>
                <span>תיק מסמכי שחרור מקוריים (6-Document Customs Package)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                כל המסמכים המקוריים נבדקו, חתומים דיגיטלית ומאושרים להגשה למערכת ״שער עולמי״ של רשות המסים.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowAsnModal(true)}
                className="text-xs font-bold px-3.5 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <span>📦</span>
                <span>מנשר מרלוג (Priority ASN)</span>
              </button>
              <button
                type="button"
                onClick={() => setShowDocModal(true)}
                className="text-xs font-bold px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <span>📥</span>
                <span>הורד את כל המסמכים (ZIP / PDF)</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customsDocuments.map((doc) => (
              <div
                key={doc.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-2xl">{doc.icon}</span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${doc.badgeColor}`}
                    >
                      {doc.status}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white mt-3 leading-snug">
                    {doc.title}
                  </h3>
                  <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                    {doc.docRef} · {doc.issuer}
                  </div>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    {doc.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveDocTab(doc.id);
                      setShowDocModal(true);
                    }}
                    className="text-xs font-semibold text-sky-400 hover:text-sky-300 transition flex items-center gap-1 cursor-pointer"
                  >
                    <span>👁️</span>
                    <span>צפייה במסמך</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => copyToClipboard(doc.docRef, doc.id)}
                    className="text-[11px] text-slate-400 hover:text-white transition cursor-pointer"
                  >
                    {copiedKey === doc.id ? "✓ הועתק" : "העתק סימוכין"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── INTERACTIVE ISRAELI CUSTOMS CLEARANCE FILING DESK ── */}
        <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="pb-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">✍️</span>
                <h2 className="text-base font-bold text-white">
                  הצהרת שחרור מכס ורשימון שער עולמי (Customs Broker Sign-off)
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                מילוי רשימון השחרור מאשר את התרת המכולה ומפעיל אוטומטית פקודת מסירה יבשתית למוביל למחסן היבואן.
              </p>
            </div>

            {isAlreadyCleared && (
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-xl border border-emerald-500/30">
                הצהרת יבוא מאושרת במערכת
              </span>
            )}
          </div>

          <form onSubmit={handleClearanceSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {/* 1. Clearing Agency */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">
                  סוכנות עמילות המכס המטפלת
                </label>
                <select
                  disabled={isAlreadyCleared}
                  value={clearingAgency}
                  onChange={(e) => setClearingAgency(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-slate-100 font-semibold focus:border-blue-500 focus:outline-none"
                >
                  <option value="ד.ס.ו שילוח ועמילות מכס (DSV)">ד.ס.ו שילוח ועמילות מכס (DSV)</option>
                  <option value="פריץ קומפניז שילוח בינלאומי (Fritz)">פריץ קומפניז שילוח בינלאומי (Fritz)</option>
                  <option value="עמית שילוח ועמילות מכס (Amit)">עמית שילוח ועמילות מכס (Amit)</option>
                  <option value="מנטפילד שילוח בינלאומי (Mentfield)">מנטפילד שילוח בינלאומי (Mentfield)</option>
                  <option value="גולד ליין שילוח (Goldline)">גולד ליין שילוח (Goldline)</option>
                  <option value="עמיל מכס מורשה עצמאי">עמיל מכס מורשה עצמאי</option>
                </select>
              </div>

              {/* 2. Clearing Agent Name & License */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">
                  שם עמיל המכס החתום ומספר רישיון
                </label>
                <input
                  type="text"
                  disabled={isAlreadyCleared}
                  required
                  placeholder="לדוגמה: אלון ברקוביץ' (מורשה #4912)"
                  value={clearingAgentName}
                  onChange={(e) => setClearingAgentName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-slate-100 font-semibold focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* 3. Customs Declaration Number (רשימון שער עולמי) */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">
                  מספר הצהרת יבוא / רשימון מכס (שער עולמי)
                </label>
                <input
                  type="text"
                  disabled={isAlreadyCleared}
                  required
                  placeholder="e.g. IL-2604-881920"
                  value={customsDeclarationNumber}
                  onChange={(e) => setCustomsDeclarationNumber(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 font-mono font-bold text-emerald-400 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* 4. Release Channel */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">
                  מסלול שחרור במכס (Shaar Olami Channel)
                </label>
                <select
                  disabled={isAlreadyCleared}
                  value={releaseChannel}
                  onChange={(e) =>
                    setReleaseChannel(e.target.value as "green" | "document_inspection" | "physical_check")
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-slate-100 font-semibold focus:border-blue-500 focus:outline-none"
                >
                  <option value="green">🟢 מסלול ירוק - התרת שחרור אוטומטית (Green Channel)</option>
                  <option value="document_inspection">🟡 בדיקת מסמכים (Documentary Inspection)</option>
                  <option value="physical_check">🔴 בדיקה פיזית ברציף (Physical Container Check)</option>
                </select>
              </div>

              {/* 5. Gate-Pass / Delivery Order # */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">
                  מספר פקודת מסירה / שער נמל (Delivery Order / Gate Pass)
                </label>
                <input
                  type="text"
                  disabled={isAlreadyCleared}
                  placeholder="e.g. DO-ASH-88192-21"
                  value={gatePassNumber}
                  onChange={(e) => setGatePassNumber(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 font-mono text-slate-100 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* 6. Notes for Inland Trucking & Warehouse Receiving */}
            <div className="text-xs">
              <label className="block font-semibold text-slate-300 mb-1.5">
                הערות עמיל מכס והנחיות למוביל יבשתי למחסן היבואן
              </label>
              <textarea
                rows={2}
                disabled={isAlreadyCleared}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="הערות תיאום הובלה, משקל, דרישות שמירת טמפרטורה, שעות פריקה..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-slate-200 focus:border-blue-500 focus:outline-none leading-relaxed"
              ></textarea>
            </div>

            {/* Submit Action Bar */}
            <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-slate-400 flex items-center gap-2">
                <span>🛡️</span>
                <span>
                  חתימת עמיל המכס מועברת אוטומטית למערכות FoodXchange, מרלוג היבואן וחשבות העסקה.
                </span>
              </div>

              {!isAlreadyCleared ? (
                <button
                  type="submit"
                  disabled={isPending}
                  className="text-xs font-bold px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:shadow-emerald-900/30"
                >
                  {isPending ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      <span>רושם שחרור במערכת...</span>
                    </>
                  ) : (
                    <>
                      <span>✓</span>
                      <span>אשר שחרור מכס והפק פקודת מסירה יבשתית (Gate-Out)</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="text-xs font-semibold text-emerald-400 flex items-center gap-2">
                  <span>✅ שוחרר בהצלחה · רשימון #{customsDeclarationNumber}</span>
                </div>
              )}
            </div>
          </form>
        </section>
      </main>

      {/* ── OFFICIAL 6-DOCUMENT MODAL PREVIEW ── */}
      <ExportDocumentHandoverModal
        isOpen={showDocModal}
        onClose={() => setShowDocModal(false)}
        requestId={requestId}
        poNumber={activePo}
        buyerCompany={buyerCompany}
        supplierName={supplierName}
        productName={productName}
        containerNumber={activeContainer}
        billOfLading={activeBl}
        shippingLine={activeLine}
        vesselName={activeVessel}
        etaPort={workflow?.eta_port || undefined}
        isBalanceCleared={true}
      />

      {/* ── ERP INBOUND ASN EXPORT MODAL ── */}
      <ErpAsnExportModal
        isOpen={showAsnModal}
        onClose={() => setShowAsnModal(false)}
        data={{
          poNumber: activePo,
          poDate: poDate || new Date().toISOString().slice(0, 10),
          buyerCompany,
          supplierFactory: supplierName,
          originCountry: supplierCountry,
          productName,
          hebrewName: productName,
          containerNumber: activeContainer,
          billOfLading: activeBl,
          customsDeclarationNumber: customsDeclarationNumber || undefined,
          palletCount: 24,
          totalUnits: 24000,
          unitsPerPallet: 1000,
          netWeightKgPerUnit: 0.4,
          grossWeightKgPerUnit: 0.44,
          storageTemp: "+18.2°C Dry Ambient",
          dockBay: "Bay 04",
          licensePlate: "84-912-33",
        }}
      />
    </div>
  );
}
