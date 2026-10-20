"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import type {
  BuyerBriefApproval,
  SampleDispatchProtocol,
  PackagingArtworkWorkflow,
  CommercialOrderLifecycle,
  AgentQuotationMargin,
} from "@/app/admin/requests/actions";
import {
  buyerApproveBrief,
  buyerSubmitSensoryEvaluation,
  buyerApprovePackaging,
  buyerSubmitWireTransfer,
} from "@/app/track/actions";

export interface BuyerPortalData {
  requestId: string;
  productName: string;
  cleanedName: string;
  buyerCompany: string;
  benchmarkBrand: string | null;
  category: string | null;
  packagingPreference: string | null;
  volumePerYear: string | null;
  certifications: string[];
  imageUrl: string | null;
  briefApproval: BuyerBriefApproval | null;
  sampleDispatch: SampleDispatchProtocol | null;
  packagingArtwork: PackagingArtworkWorkflow | null;
  orderWorkflow: CommercialOrderLifecycle | null;
  sellerBrief: string | null;
  offers: {
    matchId: string;
    producerCode: string;
    country: string | null;
    productName: string;
    matchScore: number;
    sellingPrice: number | null;
    currency: string;
    incoterm: string;
    netWeight: string | null;
    packagingFormat: string | null;
    kosherType: string | null;
    certifications: string[];
    leadTimeWeeks: number | null;
    moq: string | null;
  }[];
}

interface Props {
  data: BuyerPortalData;
}

type TabKey = "overview" | "offers" | "samples" | "packaging" | "settlement" | "logistics";

export default function BuyerCollaborationPortal({ data }: Props) {
  const [lang, setLang] = useState<"he" | "en">("he");
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [isPending, startTransition] = useTransition();

  // Local optimistic state
  const [briefApproved, setBriefApproved] = useState(data.briefApproval?.status === "approved");
  const [briefNotes, setBriefNotes] = useState(data.briefApproval?.notes || "");
  const [briefActionMsg, setBriefActionMsg] = useState<string | null>(null);

  // Wire Transfer & Settlement state
  const fc = data.orderWorkflow?.financial_clearance;
  const initialWireStatus = fc?.advance_milestone_30?.status || "pending_buyer_wire";
  const [wireStatus, setWireStatus] = useState(initialWireStatus);
  const [swiftRef, setSwiftRef] = useState(fc?.advance_milestone_30?.swift_mt103_reference || "");
  const [remitterBank, setRemitterBank] = useState(fc?.advance_milestone_30?.remitter_bank || "Bank Leumi");
  const [wireDate, setWireDate] = useState(fc?.advance_milestone_30?.wire_date || new Date().toISOString().slice(0, 10));
  const [wireNotes, setWireNotes] = useState(fc?.advance_milestone_30?.notes || "");
  const [wireActionMsg, setWireActionMsg] = useState<string | null>(null);
  const [showWireModal, setShowWireModal] = useState(false);
  const [copiedBankField, setCopiedBankField] = useState<string | null>(null);

  const totalCalculated = data.orderWorkflow?.total_order_value || (fc?.gross_buyer_contract_value || 20880);
  const advanceAmount = fc?.advance_milestone_30?.buyer_wire_amount || (totalCalculated * 0.3);
  const balanceAmount = fc?.balance_milestone_70?.buyer_wire_amount || (totalCalculated * 0.7);

  const copyBankField = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedBankField(fieldName);
    setTimeout(() => setCopiedBankField(null), 2000);
  };

  const handleWireSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!swiftRef.trim()) return;

    startTransition(async () => {
      const res = await buyerSubmitWireTransfer(data.requestId, {
        milestone: "advance_30",
        swift_reference: swiftRef.trim(),
        remitter_bank: remitterBank.trim(),
        wire_amount: advanceAmount,
        wire_date: wireDate,
        notes: wireNotes,
        remitter_name: data.buyerCompany,
      });

      if (res.ok) {
        setWireStatus("wire_submitted_by_buyer");
        setWireActionMsg(
          lang === "he"
            ? "✓ אסמכתאת ההעברה הבנקאית נקלטה בהצלחה! מחלקת הסליקה בודקת את פרטי ההעברה לקראת הפעלת הייצור במפעל."
            : "✓ Bank wire receipt successfully submitted! The settlement desk is verifying funds to release factory production."
        );
        setShowWireModal(false);
        setTimeout(() => setWireActionMsg(null), 6000);
      }
    });
  };


  // Tasting Scorecard State
  const existingSensory = data.sampleDispatch?.sensory_evaluation;
  const [tasteScore, setTasteScore] = useState<number>(existingSensory?.taste_score ?? 5);
  const [textureScore, setTextureScore] = useState<number>(existingSensory?.texture_score ?? 5);
  const [aromaScore, setAromaScore] = useState<number>(existingSensory?.aroma_score ?? 5);
  const [packagingScore, setPackagingScore] = useState<number>(existingSensory?.packaging_score ?? 5);
  const [verdict, setVerdict] = useState<"passed" | "rejected" | "reformulation_needed">(
    (existingSensory?.overall_verdict as any) || "passed"
  );
  const [tastingNotes, setTastingNotes] = useState(existingSensory?.notes || "");
  const [evaluatorName, setEvaluatorName] = useState(existingSensory?.evaluator_name || data.buyerCompany);
  const [sensorySubmitted, setSensorySubmitted] = useState(
    existingSensory?.overall_verdict === "passed" || existingSensory?.overall_verdict === "rejected"
  );
  const [sensoryMsg, setSensoryMsg] = useState<string | null>(null);

  // Packaging Approval State
  const existingBuyerMarketing = data.packagingArtwork?.approval_gates?.buyer_marketing;
  const [packagingApproved, setPackagingApproved] = useState(existingBuyerMarketing?.status === "approved");
  const [packagingApprover, setPackagingApprover] = useState(existingBuyerMarketing?.approver_name || "");
  const [packagingNotes, setPackagingNotes] = useState(existingBuyerMarketing?.notes || "");
  const [packagingMsg, setPackagingMsg] = useState<string | null>(null);

  const isRtl = lang === "he";

  // Actions
  function handleApproveBrief() {
    startTransition(async () => {
      const res = await buyerApproveBrief(data.requestId, briefNotes);
      if (res.ok) {
        setBriefApproved(true);
        setBriefActionMsg(lang === "he" ? "✓ המפרט אושר בהצלחה!" : "✓ Specification approved successfully!");
        setTimeout(() => setBriefActionMsg(null), 4000);
      }
    });
  }

  function handleTastingSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await buyerSubmitSensoryEvaluation(data.requestId, {
        taste_score: tasteScore,
        texture_score: textureScore,
        aroma_score: aromaScore,
        packaging_score: packagingScore,
        overall_verdict: verdict,
        notes: tastingNotes,
        evaluator_name: evaluatorName || data.buyerCompany,
      });
      if (res.ok) {
        setSensorySubmitted(true);
        setSensoryMsg(
          lang === "he"
            ? "✓ תוצאות הטעימה והבדיקה הסנסורית נשמרו ונשלחו לסוכן!"
            : "✓ Sensory tasting scorecard recorded and forwarded to your agent!"
        );
        setTimeout(() => setSensoryMsg(null), 4000);
      }
    });
  }

  function handleApprovePackaging() {
    if (!packagingApprover.trim()) return;
    startTransition(async () => {
      const res = await buyerApprovePackaging(data.requestId, packagingApprover, packagingNotes);
      if (res.ok) {
        setPackagingApproved(true);
        setPackagingMsg(
          lang === "he"
            ? "✓ העיצוב הגרפי ואריזת המותג הפרטי אושרו להדפסה!"
            : "✓ Packaging artwork approved for production!"
        );
        setTimeout(() => setPackagingMsg(null), 4000);
      }
    });
  }

  // Live Courier Info
  const awbNumber = data.sampleDispatch?.shipment?.awb_tracking_number;
  const courierName = data.sampleDispatch?.shipment?.courier_name || data.sampleDispatch?.courier_instructions?.courier_name || "DHL Express";
  const sampleDelivered = data.sampleDispatch?.status === "delivered" || data.sampleDispatch?.status === "tasting_passed";

  // Project Tag
  const projectRef = `[FDX-REQ-${data.requestId.slice(0, 8).toUpperCase()}]`;

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans"
    >
      {/* ── Top Navigation Bar ── */}
      <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center font-black text-white text-sm shadow-sm">
              FDX
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium leading-none">
                {lang === "he" ? "פורטל לקוחות ורכש פרטי" : "Buyer Sourcing Portal"}
              </div>
              <h1 className="text-sm font-bold text-white leading-tight mt-0.5 truncate max-w-[200px] sm:max-w-xs">
                {data.cleanedName}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-block font-mono text-[11px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
              {projectRef}
            </span>
            <div className="inline-flex rounded-lg bg-slate-800 p-0.5 border border-slate-700 text-xs">
              <button
                onClick={() => setLang("he")}
                className={`px-2 py-1 rounded font-semibold transition ${
                  lang === "he" ? "bg-orange-600 text-white shadow-2xs" : "text-slate-400 hover:text-white"
                }`}
              >
                עברית
              </button>
              <button
                onClick={() => setLang("en")}
                className={`px-2 py-1 rounded font-semibold transition ${
                  lang === "en" ? "bg-orange-600 text-white shadow-2xs" : "text-slate-400 hover:text-white"
                }`}
              >
                EN
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Project Header Hero ── */}
      <section className="bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white border-b border-slate-800 py-6 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden relative shrink-0 flex items-center justify-center shadow-md">
                {data.imageUrl ? (
                  <Image
                    src={data.imageUrl}
                    alt={data.cleanedName}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <span className="text-2xl">🥫</span>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {lang === "he" ? "פרויקט פעיל" : "Active Sourcing Project"}
                  </span>
                  <span className="text-xs text-slate-400">
                    {lang === "he" ? `עבור ${data.buyerCompany}` : `For ${data.buyerCompany}`}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
                  {data.cleanedName}
                </h2>
                <p className="text-xs text-slate-300 mt-1 flex items-center gap-3 flex-wrap">
                  {data.benchmarkBrand && (
                    <span>
                      {lang === "he" ? "מותג בנצ'מרק:" : "Benchmark Brand:"} <strong>{data.benchmarkBrand}</strong>
                    </span>
                  )}
                  {data.packagingPreference && <span>· {data.packagingPreference}</span>}
                  {data.certifications.length > 0 && <span>· {data.certifications.join(", ")}</span>}
                </p>
              </div>
            </div>

            {/* Quick Status Pill */}
            <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-3 shrink-0 sm:text-left text-xs">
              <div className="text-slate-400 text-[11px] font-medium">
                {lang === "he" ? "שלב נוכחי בפרויקט" : "Current Milestone"}
              </div>
              <div className="text-sm font-bold text-amber-300 mt-0.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                {awbNumber
                  ? lang === "he"
                    ? "שילוח דוגמאות בבלדרות אווירית"
                    : "Courier Sample Evaluation"
                  : briefApproved
                  ? lang === "he"
                    ? "בחינת הצעות ספקים ומחירים"
                    : "Supplier Offers & Quote Review"
                  : lang === "he"
                  ? "אישור מפרט הבריף"
                  : "Specification Sign-Off"}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Navigation Tabs ── */}
      <div className="bg-white border-b border-slate-200 sticky top-14 z-20 shadow-2xs">
        <div className="max-w-5xl mx-auto px-4 flex items-center gap-1 sm:gap-4 overflow-x-auto text-xs font-semibold py-1">
          <button
            onClick={() => setActiveTab("overview")}
            className={`py-3 px-3 rounded-lg border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "overview"
                ? "border-orange-600 text-orange-600 font-bold bg-orange-50/50"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>📋</span>
            <span>{lang === "he" ? "מפרט ובריף" : "Specification Brief"}</span>
            {briefApproved && <span className="text-emerald-600">✓</span>}
          </button>

          <button
            onClick={() => setActiveTab("offers")}
            className={`py-3 px-3 rounded-lg border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "offers"
                ? "border-orange-600 text-orange-600 font-bold bg-orange-50/50"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>⚖️</span>
            <span>{lang === "he" ? "הצעות ספקים ומחירים" : "Verified Offers & Pricing"}</span>
            <span className="bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded-full text-[10px]">
              {data.offers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("samples")}
            className={`py-3 px-3 rounded-lg border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "samples"
                ? "border-orange-600 text-orange-600 font-bold bg-orange-50/50"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>📦</span>
            <span>{lang === "he" ? "מעקב דוגמאות וטעימות" : "Courier Samples & Tasting"}</span>
            {awbNumber && <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />}
            {sensorySubmitted && <span className="text-emerald-600">✓</span>}
          </button>

          <button
            onClick={() => setActiveTab("packaging")}
            className={`py-3 px-3 rounded-lg border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "packaging"
                ? "border-orange-600 text-orange-600 font-bold bg-orange-50/50"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>🎨</span>
            <span>{lang === "he" ? "גרפיקה ומותג פרטי" : "Private Label Artwork"}</span>
            {packagingApproved && <span className="text-emerald-600">✓</span>}
          </button>

          <button
            onClick={() => setActiveTab("settlement")}
            className={`py-3 px-3 rounded-lg border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "settlement"
                ? "border-orange-600 text-orange-600 font-bold bg-orange-50/50"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>💳</span>
            <span>{lang === "he" ? "הזמנה ומקדמת ייצור (30%)" : "Commercial Order & Deposit"}</span>
            {(wireStatus === "wire_submitted_by_buyer" || wireStatus === "released_to_factory" || wireStatus === "cleared_in_escrow") && (
              <span className="text-emerald-600 font-bold">✓</span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("logistics")}
            className={`py-3 px-3 rounded-lg border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "logistics"
                ? "border-orange-600 text-orange-600 font-bold bg-orange-50/50"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>🚢</span>
            <span>{lang === "he" ? "שילוח ומכולה" : "Ocean Freight"}</span>
          </button>
        </div>
      </div>

      {/* ── Main Content Area ── */}
      <main className="max-w-5xl mx-auto px-4 py-8 flex-1 w-full text-xs">
        {/* ── TAB 1: Specification Brief Sign-Off ── */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {briefActionMsg && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold text-sm">
                {briefActionMsg}
              </div>
            )}

            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {lang === "he" ? "מפרט דרישות המוצר (Sourcing Brief)" : "Product Sourcing Specification"}
                  </h3>
                  <p className="text-slate-500 text-xs mt-0.5">
                    {lang === "he"
                      ? "המפרט מנוסח על פי הבנצ'מרק שהגדרתם, ללא פרטים מזהים ישירים שלכם מול המפעלים."
                      : "Anonymized technical brief distributed to our verified European factory network."}
                  </p>
                </div>
                {briefApproved ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    ✓ {lang === "he" ? "המפרט מאושר" : "Brief Approved"}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    ⏳ {lang === "he" ? "ממתין לאישורך" : "Awaiting Your Sign-Off"}
                  </span>
                )}
              </div>

              {/* Specs Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 py-6 border-b border-slate-100">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase">
                    {lang === "he" ? "מוצר מבוקש" : "Target Product"}
                  </span>
                  <div className="text-sm font-bold text-slate-900 mt-1">{data.cleanedName}</div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase">
                    {lang === "he" ? "מותג בנצ'מרק להשוואה" : "Benchmark Reference"}
                  </span>
                  <div className="text-sm font-bold text-slate-900 mt-1">
                    {data.benchmarkBrand || (lang === "he" ? "איכות סטנדרט מובילה" : "Industry Standard")}
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase">
                    {lang === "he" ? "אריזה ומשקל" : "Packaging Preference"}
                  </span>
                  <div className="text-sm font-bold text-slate-900 mt-1">
                    {data.packagingPreference || "1L / Bottle"}
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase">
                    {lang === "he" ? "דרישות כשרות ותקנים" : "Compliance & Kosher"}
                  </span>
                  <div className="text-sm font-bold text-slate-900 mt-1">
                    {data.certifications.length > 0 ? data.certifications.join(", ") : "BRC, IFS, Kosher"}
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase">
                    {lang === "he" ? "צפי כמות שנתית" : "Target Annual Volume"}
                  </span>
                  <div className="text-sm font-bold text-slate-900 mt-1">
                    {data.volumePerYear || (lang === "he" ? "1-3 מכולות" : "1-3 FCL Containers")}
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase">
                    {lang === "he" ? "סוג מיתוג" : "Branding Mode"}
                  </span>
                  <div className="text-sm font-bold text-slate-900 mt-1">
                    {lang === "he" ? "מותג פרטי של הקונה (Private Label)" : "Private Label"}
                  </div>
                </div>
              </div>

              {/* Brief Content Preview */}
              {data.sellerBrief && (
                <div className="py-6 border-b border-slate-100">
                  <h4 className="font-bold text-slate-800 text-xs mb-2">
                    {lang === "he" ? "נוסח הפנייה המקצועי למפעלים:" : "Anonymized RFQ Text:"}
                  </h4>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs leading-relaxed whitespace-pre-wrap">
                    {data.sellerBrief}
                  </div>
                </div>
              )}

              {/* Approval Box */}
              {!briefApproved ? (
                <div className="pt-6">
                  <h4 className="font-bold text-slate-900 text-sm mb-2">
                    {lang === "he" ? "אישור להתקדם לאיתור ספקים ומחירים" : "Sign-Off to Launch Sourcing"}
                  </h4>
                  <p className="text-slate-600 text-xs mb-3">
                    {lang === "he"
                      ? "בלחיצה על הכפתור, הנכם מאשרים את מפרט הבנצ'מרק ומסמיכים אותנו לפנות למפעלים המתאימים לקבלת הצעות מחיר ודוגמאות."
                      : "By confirming, you authorize our trade desk to approach matching factories for commercial quotes and sample dispatch."}
                  </p>
                  <textarea
                    rows={2}
                    value={briefNotes}
                    onChange={(e) => setBriefNotes(e.target.value)}
                    placeholder={
                      lang === "he"
                        ? "הערות או דגשים מיוחדים נוספים למפרט (אופציונלי)..."
                        : "Any specific notes or adjustments for the brief (optional)..."
                    }
                    className="w-full p-3 rounded-lg border border-slate-200 text-xs mb-3 bg-slate-50 focus:bg-white"
                  />
                  <button
                    onClick={handleApproveBrief}
                    disabled={isPending}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition shadow-sm text-xs"
                  >
                    {isPending ? "מעדכן..." : lang === "he" ? "✓ אני מאשר/ת את מפרט הבריף" : "✓ Confirm Specification Brief"}
                  </button>
                </div>
              ) : (
                <div className="pt-6 flex items-center justify-between text-xs text-slate-500">
                  <span>
                    {lang === "he" ? "הבריף אושר ונמצא בתהליך איתור ומשא ומתן מול המפעלים." : "Brief approved and distributed to certified suppliers."}
                  </span>
                  <button
                    onClick={() => setActiveTab("offers")}
                    className="text-orange-600 font-bold hover:underline"
                  >
                    {lang === "he" ? "צפייה בהצעות הספקים →" : "View Supplier Offers →"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 2: Verified Offers & Pricing ── */}
        {activeTab === "offers" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {lang === "he" ? "הצעות מחיר מספקים מאומתים באירופה" : "Verified European Manufacturer Offers"}
              </h3>
              <p className="text-slate-500 text-xs mt-0.5">
                {lang === "he"
                  ? "הצעות מסחריות הכוללות מחירי נחיתה (CIF), תקני איכות והתאמה למפרט הבנצ'מרק שלכם."
                  : "All quotes include landed import terms (CIF), Kosher standards, and laboratory specifications."}
              </p>
            </div>

            {data.offers.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-500">
                <span className="text-3xl">⏳</span>
                <p className="mt-2 text-sm font-semibold text-slate-700">
                  {lang === "he" ? "הספקים בוחנים כעת את הבריף" : "Suppliers are reviewing your RFQ"}
                </p>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  {lang === "he"
                    ? "פנינו למפעלים מובילים בספרד, איטליה ואירופה. הצעות מחיר יתעדכנו כאן מיידית."
                    : "Quotes from top-tier European mills will appear here as soon as they are received."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.offers.map((offer) => (
                  <div
                    key={offer.matchId}
                    className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-orange-400 transition flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                          <span>{offer.country === "Spain" ? "🇪🇸" : offer.country === "Italy" ? "🇮🇹" : offer.country === "Poland" ? "🇵🇱" : "🇪🇺"}</span>
                          <span>{offer.producerCode}</span>
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {offer.matchScore}% {lang === "he" ? "התאמה" : "Match"}
                        </span>
                      </div>

                      {/* Product Name */}
                      <h4 className="font-bold text-slate-900 text-sm">{offer.productName}</h4>

                      {/* Price Banner */}
                      <div className="my-4 p-3 rounded-xl bg-orange-50/70 border border-orange-200 flex items-center justify-between">
                        <div>
                          <div className="text-[10px] uppercase font-bold text-orange-900">
                            {lang === "he" ? "מחיר מוצע ליחידה" : "Quoted Selling Price"}
                          </div>
                          <div className="text-xl font-black text-orange-700">
                            {offer.sellingPrice
                              ? `€${offer.sellingPrice.toFixed(2)}`
                              : lang === "he"
                              ? "במשא ומתן"
                              : "Under Negotiation"}
                          </div>
                        </div>
                        <div className="text-right text-[11px] text-orange-900 font-semibold">
                          <div>{offer.incoterm || "CIF Ashdod"}</div>
                          <div className="text-slate-500 font-normal">
                            {offer.netWeight || "1L"} · {offer.packagingFormat || "Bottle"}
                          </div>
                        </div>
                      </div>

                      {/* Specs List */}
                      <div className="space-y-1.5 text-xs text-slate-600 mb-4">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">{lang === "he" ? "כשרות:" : "Kosher:"}</span>
                          <span className="font-semibold text-slate-800">{offer.kosherType || "Kosher Rabbinate"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">{lang === "he" ? "תקנים:" : "Standards:"}</span>
                          <span className="font-semibold text-slate-800">{offer.certifications.join(", ") || "BRC, IFS"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">{lang === "he" ? "כמות מינימום (MOQ):" : "MOQ:"}</span>
                          <span className="font-semibold text-slate-800">{offer.moq || "1 x 40ft HQ FCL"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">{lang === "he" ? "זמן אספקה:" : "Lead Time:"}</span>
                          <span className="font-semibold text-slate-800">
                            {offer.leadTimeWeeks ? `${offer.leadTimeWeeks} ${lang === "he" ? "שבועות" : "weeks"}` : "3 weeks"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">
                        {lang === "he" ? "דוגמאות מוכנות לשילוח" : "Samples ready for dispatch"}
                      </span>
                      <button
                        onClick={() => setActiveTab("samples")}
                        className="px-3.5 py-1.5 rounded-lg bg-slate-900 text-white font-bold hover:bg-slate-800 text-xs shadow-2xs"
                      >
                        {lang === "he" ? "שילוח דוגמאות ב-DHL ←" : "Request DHL Sample →"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 3: Courier Sample Live Tracker & Tasting Scorecard ── */}
        {activeTab === "samples" && (
          <div className="space-y-6">
            {sensoryMsg && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold text-sm">
                {sensoryMsg}
              </div>
            )}

            {/* Courier Tracking Status Card */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {lang === "he" ? "מעקב שילוח דוגמאות בבלדרות אווירית" : "Courier Sample Dispatch Tracking"}
                  </h3>
                  <p className="text-slate-500 text-xs mt-0.5">
                    {lang === "he"
                      ? "הדוגמאות נשלחות ישירות מהמפעל באריזה מוגנת למשרדכם לצורך בדיקת טעם ומרקם."
                      : "Factory lab samples dispatched under strict anti-breakage protocols for sensory validation."}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    sampleDelivered
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      : awbNumber
                      ? "bg-sky-100 text-sky-800 border border-sky-200"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {sampleDelivered
                    ? lang === "he"
                      ? "✓ הדוגמאות נמסרו למשרדכם"
                      : "✓ Delivered"
                    : awbNumber
                    ? lang === "he"
                      ? "✈️ בטיסה בינלאומית"
                      : "✈️ In Flight"
                    : lang === "he"
                    ? "בהכנה לשילוח"
                    : "Preparing Dispatch"}
                </span>
              </div>

              {awbNumber ? (
                <div className="my-6 p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="text-[11px] text-slate-500 font-medium uppercase">
                      {courierName} {lang === "he" ? "מספר שטר מטען (AWB):" : "Air Waybill Tracking #:"}
                    </div>
                    <div className="text-lg font-mono font-bold text-slate-900 mt-0.5">{awbNumber}</div>
                    <div className="text-slate-500 text-xs mt-1">
                      {lang === "he" ? "הצהרת מכס: דוגמאות מזון להערכה סנסורית בלבד" : "Customs Declaration: Food Samples for Sensory Evaluation Only"}
                    </div>
                  </div>

                  <a
                    href={`https://www.dhl.com/en/express/tracking.html?AWB=${encodeURIComponent(awbNumber)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 rounded-xl bg-orange-600 text-white font-bold hover:bg-orange-700 transition shadow-xs text-xs self-start sm:self-auto flex items-center gap-1.5"
                  >
                    <span>🔍 {lang === "he" ? "מעקב חי באתר הבלדרות" : "Live Courier Tracking"}</span>
                  </a>
                </div>
              ) : (
                <div className="my-6 p-4 rounded-xl bg-slate-50 border border-dashed border-slate-300 text-center text-slate-500">
                  <span className="text-xl">📦</span>
                  <p className="mt-1 font-semibold text-slate-700">
                    {lang === "he" ? "שטר המטען בהנפקה מול המפעל" : "Air Waybill being issued"}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {lang === "he"
                      ? "הנחיות שילוח מוגנות ואריזה אטומה נשלחו למפעל."
                      : "Packaging guidelines issued to factory."}
                  </p>
                </div>
              )}

              {/* ── Interactive Sensory Tasting Scorecard ── */}
              <div className="pt-6 border-t border-slate-200">
                <div className="mb-4">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span>👅 {lang === "he" ? "כרטיס הערכה סנסורית וטעימות לקונה" : "Buyer Sensory Tasting Scorecard"}</span>
                    {sensorySubmitted && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                        {lang === "he" ? "הוגש בהצלחה" : "Submitted"}
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {lang === "he"
                      ? "דירוג איכות הטעימה שלכם ישמש כאישור רשמי להתקדמות לשלב ה-QA, תיק הרגולציה וההזמנה."
                      : "Rate the sample compared to your target benchmark to authorize QA and production."}
                  </p>
                </div>

                <form onSubmit={handleTastingSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    {/* Taste Score */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        {lang === "he" ? "טעם וארומה (1-5)" : "Taste & Flavor (1-5)"}
                      </label>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setTasteScore(star)}
                            className={`text-lg transition ${
                              star <= tasteScore ? "text-amber-400" : "text-slate-300"
                            }`}
                          >
                            ★
                          </button>
                        ))}
                        <span className="ml-2 font-bold text-slate-800 text-xs">({tasteScore}/5)</span>
                      </div>
                    </div>

                    {/* Texture Score */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        {lang === "he" ? "מרקם ותחושת פה (1-5)" : "Texture & Mouthfeel (1-5)"}
                      </label>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setTextureScore(star)}
                            className={`text-lg transition ${
                              star <= textureScore ? "text-amber-400" : "text-slate-300"
                            }`}
                          >
                            ★
                          </button>
                        ))}
                        <span className="ml-2 font-bold text-slate-800 text-xs">({textureScore}/5)</span>
                      </div>
                    </div>

                    {/* Aroma Score */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        {lang === "he" ? "צבע ומראה ויזואלי (1-5)" : "Visual & Aroma (1-5)"}
                      </label>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setAromaScore(star)}
                            className={`text-lg transition ${
                              star <= aromaScore ? "text-amber-400" : "text-slate-300"
                            }`}
                          >
                            ★
                          </button>
                        ))}
                        <span className="ml-2 font-bold text-slate-800 text-xs">({aromaScore}/5)</span>
                      </div>
                    </div>

                    {/* Packaging Score */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        {lang === "he" ? "איכות אריזה ופקק (1-5)" : "Packaging & Seal (1-5)"}
                      </label>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setPackagingScore(star)}
                            className={`text-lg transition ${
                              star <= packagingScore ? "text-amber-400" : "text-slate-300"
                            }`}
                          >
                            ★
                          </button>
                        ))}
                        <span className="ml-2 font-bold text-slate-800 text-xs">({packagingScore}/5)</span>
                      </div>
                    </div>
                  </div>

                  {/* Verdict & Notes */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        {lang === "he" ? "החלטה סופית לטעימה:" : "Overall Sensory Verdict:"}
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setVerdict("passed")}
                          className={`p-2 rounded-lg text-xs font-bold border transition ${
                            verdict === "passed"
                              ? "bg-emerald-50 border-emerald-500 text-emerald-800 shadow-2xs"
                              : "bg-white border-slate-200 text-slate-600"
                          }`}
                        >
                          ✓ {lang === "he" ? "עובר בהצלחה" : "Passed ✓"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setVerdict("reformulation_needed")}
                          className={`p-2 rounded-lg text-xs font-bold border transition ${
                            verdict === "reformulation_needed"
                              ? "bg-amber-50 border-amber-500 text-amber-800 shadow-2xs"
                              : "bg-white border-slate-200 text-slate-600"
                          }`}
                        >
                          ⚠️ {lang === "he" ? "נדרש דיוק" : "Adjust"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setVerdict("rejected")}
                          className={`p-2 rounded-lg text-xs font-bold border transition ${
                            verdict === "rejected"
                              ? "bg-rose-50 border-rose-500 text-rose-800 shadow-2xs"
                              : "bg-white border-slate-200 text-slate-600"
                          }`}
                        >
                          ✕ {lang === "he" ? "לא מתאים" : "Reject"}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        {lang === "he" ? "שם הבודק / הטועם מטעם החברה:" : "Evaluator Name:"}
                      </label>
                      <input
                        type="text"
                        value={evaluatorName}
                        onChange={(e) => setEvaluatorName(e.target.value)}
                        placeholder="e.g. Dana Cohen / Quality Manager"
                        className="w-full p-2 rounded-lg border border-slate-200 text-xs bg-slate-50 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {lang === "he" ? "הערות סנסוריות נוספות למפעל:" : "Additional Sensory Notes for Factory:"}
                    </label>
                    <textarea
                      rows={2}
                      value={tastingNotes}
                      onChange={(e) => setTastingNotes(e.target.value)}
                      placeholder={
                        lang === "he"
                          ? "לדוגמה: מרקם חלק ומצוין, טעם מאוזן מאוד וקרוב מאוד לבנצ'מרק..."
                          : "e.g. Excellent flavor profile, balanced acidity, identical to benchmark..."
                      }
                      className="w-full p-3 rounded-lg border border-slate-200 text-xs bg-slate-50 focus:bg-white"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isPending}
                    className="px-6 py-2.5 rounded-xl bg-orange-600 text-white font-bold hover:bg-orange-700 transition shadow-xs text-xs"
                  >
                    {isPending
                      ? "שומר נתונים..."
                      : lang === "he"
                      ? "💾 שליחת כרטיס הטעימה לסוכן המסחרי"
                      : "💾 Submit Sensory Scorecard"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 4: Private Label & Packaging Sign-Off ── */}
        {activeTab === "packaging" && (
          <div className="space-y-6">
            {packagingMsg && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold text-sm">
                {packagingMsg}
              </div>
            )}

            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {lang === "he" ? "אישור גרפיקה ותווית מותג פרטי (Private Label)" : "Private Label Artwork Sign-Off"}
                  </h3>
                  <p className="text-slate-500 text-xs mt-0.5">
                    {lang === "he"
                      ? "בדיקת פריסת דיי-ליין, מיקום הדפסת תאריך ב-Inkjet, וטבלת ערכים תזונתיים בעברית."
                      : "3-Way sign-off: Food Advisory Regulatory Check -> Buyer Marketing -> Factory Print Engineer."}
                  </p>
                </div>
                {packagingApproved ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    ✓ {lang === "he" ? "גרפיקה מאושרת לייצור" : "Artwork Approved"}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    ⏳ {lang === "he" ? "ממתין לאישור סופי" : "Sign-Off Pending"}
                  </span>
                )}
              </div>

              {/* Regulatory Verification Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-6">
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                  <div className="font-bold flex items-center gap-1">
                    <span>✓</span>
                    <span>{lang === "he" ? "יועץ מזון ורגולציה" : "Food Advisory Certified"}</span>
                  </div>
                  <div className="text-[11px] text-emerald-700 mt-1">
                    {lang === "he" ? "טבלת ערכים ואלרגנים בעברית אומתו" : "Hebrew nutrition & allergens verified"}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900">
                  <div className="font-bold flex items-center gap-1">
                    <span>📐</span>
                    <span>{lang === "he" ? "מפרט גליל ודיי-ליין" : "Cylinder & Dieline Specs"}</span>
                  </div>
                  <div className="text-[11px] text-indigo-700 mt-1">
                    {lang === "he" ? "רווח הדפסת Inkjet ותקן הטבעה" : "Inkjet date gap & tolerance verified"}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
                  <div className="font-bold flex items-center gap-1">
                    <span>✡️</span>
                    <span>{lang === "he" ? "סימון כשרות" : "Kosher Seal Layout"}</span>
                  </div>
                  <div className="text-[11px] text-amber-700 mt-1">
                    {lang === "he" ? "חותמת רבנות מאושרת במיקום נראה" : "Supervision seal correctly positioned"}
                  </div>
                </div>
              </div>

              {/* Sign-Off Form */}
              {!packagingApproved ? (
                <div className="pt-4 border-t border-slate-100">
                  <h4 className="font-bold text-slate-900 text-sm mb-2">
                    {lang === "he" ? "אישור שיווק/הנהלה להדפסת גלילי האריזה" : "Executive Marketing Sign-Off"}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        {lang === "he" ? "שם המאשר/ת מטעם הקונה:" : "Approver Name & Title:"}
                      </label>
                      <input
                        type="text"
                        value={packagingApprover}
                        onChange={(e) => setPackagingApprover(e.target.value)}
                        placeholder="e.g. Yossi Levi / CMO"
                        className="w-full p-2.5 rounded-lg border border-slate-200 text-xs bg-slate-50 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        {lang === "he" ? "הערות להדפסת מסטר (אופציונלי):" : "Print Notes (Optional):"}
                      </label>
                      <input
                        type="text"
                        value={packagingNotes}
                        onChange={(e) => setPackagingNotes(e.target.value)}
                        placeholder="e.g. Finish: Glossy finish confirmed"
                        className="w-full p-2.5 rounded-lg border border-slate-200 text-xs bg-slate-50 focus:bg-white"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleApprovePackaging}
                    disabled={isPending || !packagingApprover.trim()}
                    className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition shadow-sm text-xs disabled:opacity-50"
                  >
                    {isPending
                      ? "מעדכן..."
                      : lang === "he"
                      ? "✓ אישור סופי של האריזה והורדה לדפוס"
                      : "✓ Authorize Packaging Print Master"}
                  </button>
                </div>
              ) : (
                <div className="pt-4 border-t border-slate-100 text-slate-500 text-xs flex items-center justify-between">
                  <span>
                    {lang === "he"
                      ? `העיצוב אושר על ידי ${packagingApprover || "הקונה"} ונשלח להדפסת גלילים במפעל.`
                      : `Artwork approved by ${packagingApprover || "Buyer"} and dispatched to print engineer.`}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 4.5: Commercial Order & Deposit Settlement ── */}
        {activeTab === "settlement" && (
          <div className="space-y-6">
            {wireActionMsg && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold text-xs animate-in fade-in">
                {wireActionMsg}
              </div>
            )}

            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {lang === "he" ? "הזמנה מסחרית ומקדמת ייצור (30%)" : "Commercial Purchase Order & Deposit Settlement"}
                  </h3>
                  <p className="text-slate-500 text-xs mt-0.5">
                    {lang === "he"
                      ? "הסדרת מקדמת הייצור (30%) כנגד הזמנת רכש מסחרית להפעלת קו הביקבוק והדפסת התוויות במפעל."
                      : "Settle the 30% advance deposit to commence bottling line production and approved private label printing."}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full border flex items-center gap-1.5 ${
                    wireStatus === "released_to_factory"
                      ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                      : wireStatus === "cleared_in_escrow"
                      ? "bg-blue-100 text-blue-800 border-blue-300"
                      : wireStatus === "wire_submitted_by_buyer"
                      ? "bg-amber-100 text-amber-800 border-amber-300"
                      : "bg-slate-100 text-slate-700 border-slate-300"
                  }`}>
                    <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                    <span>
                      {wireStatus === "released_to_factory"
                        ? lang === "he" ? "ייצור פעיל במפעל ✓" : "Production Active ✓"
                        : wireStatus === "cleared_in_escrow"
                        ? lang === "he" ? "התשלום נקלט בנאמנות" : "Cleared in Escrow"
                        : wireStatus === "wire_submitted_by_buyer"
                        ? lang === "he" ? "אסמכתא בבדיקה" : "Wire In Review"
                        : lang === "he" ? "ממתין להעברה בנקאית" : "Awaiting Wire"}
                    </span>
                  </span>
                </div>
              </div>

              {/* Order Commercial Financial Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase">
                    {lang === "he" ? "שווי הזמנה כולל" : "Total Contract Value"}
                  </div>
                  <div className="text-base font-black text-slate-900 mt-1">
                    {data.orderWorkflow?.currency || "EUR"} {totalCalculated.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {data.orderWorkflow?.order_volume || "24,000 Units (1 x 40ft HQ FCL)"}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200">
                  <div className="text-[11px] font-semibold text-amber-800 uppercase">
                    {lang === "he" ? "מקדמה נדרשת להפעלת ייצור (30%)" : "30% Advance Deposit Due"}
                  </div>
                  <div className="text-base font-black text-amber-950 mt-1">
                    {data.orderWorkflow?.currency || "EUR"} {advanceAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-[11px] text-amber-700 mt-0.5 font-medium">
                    {lang === "he" ? "תנאי פתיחת ייצור והדפסה" : "Commences bottling & printing"}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase">
                    {lang === "he" ? "יתרה כנגד שטר מטען (70%)" : "70% Balance on B/L"}
                  </div>
                  <div className="text-base font-black text-slate-900 mt-1">
                    {data.orderWorkflow?.currency || "EUR"} {balanceAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {lang === "he" ? "כנגד שטר מטען ימי ודוח בדיקה" : "Against Clean B/L Copy & PSI"}
                  </div>
                </div>
              </div>

              {/* Status Banner */}
              {wireStatus === "wire_submitted_by_buyer" && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 flex items-start gap-3">
                  <span className="text-xl">⏳</span>
                  <div>
                    <h4 className="font-bold text-amber-950 text-xs">
                      {lang === "he" ? "אסמכתאת ההעברה נמסרה בהצלחה" : "Bank Wire Confirmation Submitted"}
                    </h4>
                    <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                      {lang === "he"
                        ? `אסמכתא ${swiftRef} מבנק ${remitterBank} נמצאת באימות סופי מול דסק הסליקה הבינלאומי. עם אישור הקליטה, קו הייצור במפעל יופעל מיידית.`
                        : `Wire confirmation ${swiftRef} from ${remitterBank} is being verified by our settlement desk. Factory production line is scheduled.`}
                    </p>
                  </div>
                </div>
              )}

              {wireStatus === "released_to_factory" && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 flex items-start gap-3">
                  <span className="text-xl">🎉</span>
                  <div>
                    <h4 className="font-bold text-emerald-950 text-xs">
                      {lang === "he" ? "התשלום אושר · הייצור המסחרי פעיל" : "Deposit Cleared · Commercial Production Running"}
                    </h4>
                    <p className="text-[11px] text-emerald-800 mt-0.5 leading-relaxed">
                      {lang === "he"
                        ? "מקדמת הייצור הועברה למפעל. המוצר נמצא בהליך מילוי וביקבוק. עם העמסת המכולה, יונפק שטר מטען ימי ומספר מעקב בטאב השילוח הימי."
                        : "The 30% advance is released to the European factory. Once production finishes and the container is sealed, live vessel tracking activates in Tab 5."}
                    </p>
                  </div>
                </div>
              )}

              {/* Designated International Settlement Banking Coordinates */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between">
                  <span className="font-bold text-xs uppercase tracking-wider">
                    {lang === "he" ? "פרטי חשבון בנק רשמי להעברה (SWIFT / IBAN)" : "Designated International Settlement Banking Coordinates"}
                  </span>
                  <span className="text-[11px] text-amber-400 font-mono">
                    PO: {data.orderWorkflow?.po_number || "PO-FDX-01"}
                  </span>
                </div>

                <div className="divide-y divide-slate-100 bg-white">
                  <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        {lang === "he" ? "שם המוטב" : "Beneficiary Name"}
                      </span>
                      <p className="font-bold text-slate-900 font-mono text-xs">
                        FoodXchange Trade Ltd - Client Settlement Account
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        IBAN (International Bank Account Number)
                      </span>
                      <p className="font-bold text-slate-950 font-mono text-sm tracking-wider">
                        ES76 2100 0418 4502 0005 1294
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyBankField("ES7621000418450200051294", "iban")}
                      className="text-xs font-semibold px-2.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 transition"
                    >
                      {copiedBankField === "iban" ? "✓ הועתק!" : lang === "he" ? "העתק IBAN" : "Copy IBAN"}
                    </button>
                  </div>

                  <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        SWIFT / BIC Code
                      </span>
                      <p className="font-bold text-indigo-700 font-mono text-xs">
                        CAIXESBBXXX
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyBankField("CAIXESBBXXX", "swift")}
                      className="text-xs font-semibold px-2.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 transition"
                    >
                      {copiedBankField === "swift" ? "✓ הועתק!" : lang === "he" ? "העתק SWIFT" : "Copy SWIFT"}
                    </button>
                  </div>

                  <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-amber-50/40">
                    <div>
                      <span className="text-[10px] font-bold text-amber-800 uppercase">
                        {lang === "he" ? "הערה מחייבת בהעברה (Field 70)" : "Mandatory Payment Reference (Field 70)"}
                      </span>
                      <p className="font-bold text-amber-950 font-mono text-xs">
                        [FDX-REQ-{data.requestId.slice(0, 8).toUpperCase()}] ADV-30
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyBankField(`[FDX-REQ-${data.requestId.slice(0, 8).toUpperCase()}] ADV-30`, "memo")}
                      className="text-xs font-semibold px-2.5 py-1 rounded bg-white hover:bg-amber-100 border border-amber-300 text-amber-900 transition"
                    >
                      {copiedBankField === "memo" ? "✓ הועתק!" : lang === "he" ? "העתק הערה" : "Copy Reference"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowWireModal(true)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-xs font-bold px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white transition shadow-xs cursor-pointer"
                >
                  <span>📤</span>
                  <span>
                    {wireStatus === "wire_submitted_by_buyer"
                      ? lang === "he" ? "עדכון אסמכתאת העברה" : "Update Wire Receipt"
                      : lang === "he" ? "העלאת אסמכתאת העברה בנקאית" : "Submit Bank Wire Receipt"}
                  </span>
                </button>

                <div className="text-slate-400 text-[11px] text-center sm:text-left">
                  {lang === "he"
                    ? "✓ מוגן בהסכם בלעדיות ומניעת עקיפה (ICC NCNDA 758)"
                    : "✓ Protected under ICC NCNDA 758 Tripartite Working Agreement"}
                </div>
              </div>
            </div>

            {/* Wire Submission Modal */}
            {showWireModal && (
              <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                <form
                  onSubmit={handleWireSubmit}
                  className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150"
                >
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🏦</span>
                      <h3 className="text-sm font-bold text-slate-900">
                        {lang === "he" ? "הגשת אסמכתאת העברה בנקאית (30%)" : "Submit Bank Wire Transfer Receipt"}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowWireModal(false)}
                      className="w-7 h-7 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center text-sm font-bold transition cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="p-6 space-y-4 text-xs">
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 font-medium">
                      {lang === "he" ? "סכום ההעברה:" : "Transfer Amount:"}{" "}
                      <strong className="text-emerald-900 text-sm">
                        {data.orderWorkflow?.currency || "EUR"} {advanceAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </strong>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                        {lang === "he" ? "מספר אסמכתא / SWIFT MT103 Ref" : "SWIFT Reference / Transaction ID"} *
                      </label>
                      <input
                        type="text"
                        required
                        value={swiftRef}
                        onChange={(e) => setSwiftRef(e.target.value)}
                        placeholder="SWIFT-IL-9481920"
                        className="w-full border border-slate-200 rounded-lg p-2.5 font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                          {lang === "he" ? "הבנק המעביר" : "Remitter Bank"} *
                        </label>
                        <input
                          type="text"
                          required
                          value={remitterBank}
                          onChange={(e) => setRemitterBank(e.target.value)}
                          placeholder="Bank Leumi / Bank Hapoalim"
                          className="w-full border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                          {lang === "he" ? "תאריך ביצוע" : "Transfer Date"} *
                        </label>
                        <input
                          type="date"
                          required
                          value={wireDate}
                          onChange={(e) => setWireDate(e.target.value)}
                          className="w-full border border-slate-200 rounded-lg p-2.5 font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                        {lang === "he" ? "הערות להעברה (אופציונלי)" : "Notes / Slip Details (Optional)"}
                      </label>
                      <textarea
                        rows={2}
                        value={wireNotes}
                        onChange={(e) => setWireNotes(e.target.value)}
                        placeholder={lang === "he" ? "הועבר מחשבון החברה הראשי..." : "Transferred from treasury account..."}
                        className="w-full border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  </div>

                  <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setShowWireModal(false)}
                      className="text-xs text-slate-500 hover:text-slate-800 font-semibold px-3 py-1.5 rounded-lg transition"
                    >
                      {lang === "he" ? "ביטול" : "Cancel"}
                    </button>
                    <button
                      type="submit"
                      disabled={isPending}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-50 px-4 py-2 rounded-xl transition shadow-xs cursor-pointer"
                    >
                      {isPending ? (
                        <span>{lang === "he" ? "קולט אסמכתא…" : "Submitting…"}</span>
                      ) : (
                        <span>{lang === "he" ? "אישור והגשת אסמכתא" : "Confirm & Submit Slip"}</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

                {/* ── TAB 5: Ocean Freight & Container Logistics ── */}
        {activeTab === "logistics" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
              <div className="pb-4 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900">
                  {lang === "he" ? "מעקב שילוח ימי ולוגיסטיקת מכולה" : "Ocean Freight & Container Tracking"}
                </h3>
                <p className="text-slate-500 text-xs mt-0.5">
                  {lang === "he"
                    ? "מעקב ישיר על תנועת המכולה מנמל המוצא ועד לכניסה למחסן ההפצה שלכם."
                    : "Live shipping line vessel tracking from origin port to destination warehouse."}
                </p>
              </div>

              {data.orderWorkflow?.container_number ? (
                <div className="my-6 space-y-4">
                  <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="text-[11px] text-slate-400 font-semibold uppercase">
                        {data.orderWorkflow.shipping_line || "MSC / ZIM"} · {lang === "he" ? "מספר מכולה" : "Container ID"}
                      </div>
                      <div className="text-xl font-mono font-bold text-emerald-400 mt-0.5">
                        {data.orderWorkflow.container_number}
                      </div>
                      <div className="text-slate-300 text-xs mt-1">
                        {lang === "he" ? "אונייה:" : "Vessel:"} {data.orderWorkflow.vessel_name || "Ocean Carrier"} · {lang === "he" ? "שטר מטען ימי:" : "B/L:"} {data.orderWorkflow.bill_of_lading || "B/L Issued"}
                      </div>
                    </div>

                    <div className="text-right sm:border-l sm:border-slate-800 sm:pl-6">
                      <div className="text-[11px] text-slate-400">
                        {lang === "he" ? "זמן הגעה משוער (ETA)" : "Estimated Port Arrival"}
                      </div>
                      <div className="text-lg font-bold text-amber-300 mt-0.5">
                        {data.orderWorkflow.eta_port || (lang === "he" ? "בעדכון" : "Pending ETA")}
                      </div>
                    </div>
                  </div>

                  {/* Port Milestones */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="font-bold text-slate-900">{lang === "he" ? "1. נמל מוצא" : "1. Origin Port"}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {data.orderWorkflow.port_of_origin || "Valencia Port"}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="font-bold text-slate-900">{lang === "he" ? "2. שחרור מכס בישראל" : "2. Customs Clearance"}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {data.orderWorkflow.customs_status || (lang === "he" ? "ממתין לעגינה" : "Awaiting Berth")}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="font-bold text-slate-900">{lang === "he" ? "3. מחסן יעד הקונה" : "3. Buyer Warehouse"}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {data.orderWorkflow.buyer_warehouse_address || (lang === "he" ? "מחסן מרכזי" : "Main Warehouse")}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="my-8 p-6 rounded-xl bg-slate-50 border border-dashed border-slate-300 text-center text-slate-500">
                  <span className="text-2xl">🚢</span>
                  <p className="mt-2 font-bold text-slate-800 text-sm">
                    {lang === "he" ? "השילוח הימי יופעל לאחר סיום ייצור ההזמנה" : "Ocean container will be assigned upon production"}
                  </p>
                  <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                    {lang === "he"
                      ? "לאחר אישור הדוגמאות והאריזה, יונפק שטר מטען ימי ומספר מכולה למעקב חי בזמן אמת."
                      : "Container number, vessel tracking, and bill of lading will activate once goods are loaded."}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ── Floating Trade Agent Support ── */}
      <footer className="bg-white border-t border-slate-200 py-4 px-4 sticky bottom-0 z-20 shadow-md">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-slate-600 font-medium">
              {lang === "he" ? "סוכן סחר ייעודי זמין עבורכם" : "Dedicated Trade Agent Online"}
            </span>
            <span className="text-slate-300">·</span>
            <span className="font-mono text-slate-500 text-[11px]">{projectRef}</span>
          </div>

          <a
            href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
              `Hello FoodXchange, regarding our sourcing project ${data.cleanedName} ${projectRef}, I have a question:`
            )}`}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition shadow-2xs flex items-center gap-2"
          >
            <span>💬</span>
            <span>{lang === "he" ? "שיחה מהירה בוואטסאפ עם הסוכן" : "Chat on WhatsApp with Agent"}</span>
          </a>
        </div>
      </footer>
    </div>
  );
}
