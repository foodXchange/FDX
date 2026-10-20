"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
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
  buyerSignWarehouseGoodsReceipt,
} from "@/app/track/actions";
import BuyerPoModal from "./BuyerPoModal";
import CommercialPoDocumentModal from "@/components/documents/CommercialPoDocumentModal";
import ExportDocumentHandoverModal from "@/components/documents/ExportDocumentHandoverModal";
import GoodsReceiptDocumentModal from "@/components/documents/GoodsReceiptDocumentModal";
import MaritimeVesselTracker from "@/components/shipping/MaritimeVesselTracker";
import BuyerActionConciergeBanner, { type BuyerConciergeAction } from "./BuyerActionConciergeBanner";

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
  const initialBalanceStatus = fc?.balance_milestone_70?.status || "pending_buyer_wire";

  const [wireStatus, setWireStatus] = useState(initialWireStatus);
  const [balanceStatus, setBalanceStatus] = useState(initialBalanceStatus);
  const [selectedMilestone, setSelectedMilestone] = useState<"advance_30" | "balance_70">(
    initialWireStatus === "released_to_factory" ? "balance_70" : "advance_30"
  );
  const [swiftRef, setSwiftRef] = useState(
    (initialWireStatus === "released_to_factory"
      ? fc?.balance_milestone_70?.swift_mt103_reference
      : fc?.advance_milestone_30?.swift_mt103_reference) || ""
  );
  const [remitterBank, setRemitterBank] = useState(
    (initialWireStatus === "released_to_factory"
      ? fc?.balance_milestone_70?.remitter_bank
      : fc?.advance_milestone_30?.remitter_bank) || "Bank Leumi"
  );
  const [wireDate, setWireDate] = useState(
    (initialWireStatus === "released_to_factory"
      ? fc?.balance_milestone_70?.wire_date
      : fc?.advance_milestone_30?.wire_date) || new Date().toISOString().slice(0, 10)
  );
  const [wireNotes, setWireNotes] = useState(
    (initialWireStatus === "released_to_factory"
      ? fc?.balance_milestone_70?.notes
      : fc?.advance_milestone_30?.notes) || ""
  );
  const [wireActionMsg, setWireActionMsg] = useState<string | null>(null);
  const [showWireModal, setShowWireModal] = useState(false);
  const [copiedBankField, setCopiedBankField] = useState<string | null>(null);

  // Commercial PO Placement state
  const [poOffer, setPoOffer] = useState<BuyerPortalData["offers"][0] | null>(null);
  const [activePoNumber, setActivePoNumber] = useState(data.orderWorkflow?.po_number || null);
  const [showPoDocModal, setShowPoDocModal] = useState(false);
  const [showDocsModal, setShowDocsModal] = useState(false);

  // Warehouse Receiving & Goods Receipt Note (GRN) state
  const initialIsDelivered =
    data.orderWorkflow?.delivery_status === "arrived_at_warehouse" ||
    Boolean(data.orderWorkflow?.goods_accepted_by);
  const [isDelivered, setIsDelivered] = useState(initialIsDelivered);
  const [grnAcceptedBy, setGrnAcceptedBy] = useState(
    data.orderWorkflow?.goods_accepted_by || "אבי מזרחי (מנהל קבלת סחורה במרלוג)"
  );
  const [grnPalletCount, setGrnPalletCount] = useState<number>(
    data.orderWorkflow?.warehouse_pallet_count || 24
  );
  const [grnDriverPlate, setGrnDriverPlate] = useState("98-410-29");
  const [grnDockBay, setGrnDockBay] = useState("רציף 04 - מרלוג מרכזי");
  const [grnTempLogger, setGrnTempLogger] = useState("+18.2°C (תקין - רציפות קירור מלאה)");
  const [grnSealNumber, setGrnSealNumber] = useState("#IL-98402 (חותם שלם ותקין לפני שבירה)");
  const [grnNotes, setGrnNotes] = useState(
    data.orderWorkflow?.logistics_notes ||
      "המכולה נפרקה ברציף קבלה. כל 24 המשטחים נבדקו, ספירת קרטונים תקינה, אריזות שלמות ותוויות עברית מאושרות."
  );
  const [grnNumber, setGrnNumber] = useState(
    `GRN-IL-2604-${data.requestId.slice(0, 5).toUpperCase()}`
  );
  const [grnArrivedAt, setGrnArrivedAt] = useState<string | null>(
    data.orderWorkflow?.arrived_at || null
  );
  const [showGrnDocModal, setShowGrnDocModal] = useState(false);
  const [grnActionSuccess, setGrnActionSuccess] = useState<string | null>(null);
  const [grnActionError, setGrnActionError] = useState<string | null>(null);

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

    const isBalance = selectedMilestone === "balance_70";
    const amount = isBalance ? balanceAmount : advanceAmount;

    startTransition(async () => {
      const res = await buyerSubmitWireTransfer(data.requestId, {
        milestone: selectedMilestone,
        swift_reference: swiftRef.trim(),
        remitter_bank: remitterBank.trim(),
        wire_amount: amount,
        wire_date: wireDate,
        notes: wireNotes,
        remitter_name: data.buyerCompany,
      });

      if (res.ok) {
        if (isBalance) {
          setBalanceStatus("wire_submitted_by_buyer");
          setWireActionMsg(
            lang === "he"
              ? "✓ אסמכתאת תשלום יתרת 70% כנגד שטר מטען נקלטה בהצלחה! עם אישור הקליטה, מסמכי המקור ישוחררו לעמיל המכס בנמל אשדוד."
              : "✓ 70% balance wire confirmation received! Original shipping documents will be released to customs broker."
          );
        } else {
          setWireStatus("wire_submitted_by_buyer");
          setWireActionMsg(
            lang === "he"
              ? "✓ אסמכתאת ההעברה הבנקאית נקלטה בהצלחה! מחלקת הסליקה בודקת את פרטי ההעברה לקראת הפעלת הייצור במפעל."
              : "✓ Bank wire receipt successfully submitted! The settlement desk is verifying funds to release factory production."
          );
        }
        setShowWireModal(false);
        setTimeout(() => setWireActionMsg(null), 6000);
      }
    });
  };

  const handleGrnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setGrnActionError(null);
    setGrnActionSuccess(null);

    startTransition(async () => {
      const res = await buyerSignWarehouseGoodsReceipt({
        requestId: data.requestId,
        receivingOfficer: grnAcceptedBy,
        receivedPallets: grnPalletCount,
        truckLicensePlate: grnDriverPlate,
        dockBay: grnDockBay,
        tempLoggerReading: grnTempLogger,
        sealNumber: grnSealNumber,
        notes: grnNotes,
      });

      if (res.ok) {
        setIsDelivered(true);
        setGrnArrivedAt(res.arrivedAt);
        setGrnNumber(res.grnNumber);
        setGrnActionSuccess(
          lang === "he"
            ? `🎉 תעודת קבלת טובין (GRN #${res.grnNumber}) נחתמה ואושרה רשמית! כל ${grnPalletCount} המשטחים נקלטו במלאי המרלוג.`
            : `🎉 Goods Receipt Note (GRN #${res.grnNumber}) signed & verified! All ${grnPalletCount} pallets accepted into ERP inventory.`
        );
      } else {
        setGrnActionError(res.error);
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

  // Dynamic Concierge Next Best Action
  const getConciergeAction = (): BuyerConciergeAction => {
    if (!briefApproved) {
      return {
        stageNumber: 1,
        badgeLabel: lang === "he" ? "שלב 1: אישור מפרט" : "Step 1: Brief Sign-Off",
        badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
        title: lang === "he" ? "אישור בריף ומפרט המוצר המבוקש" : "Approve Product Sourcing Specification",
        description: lang === "he"
          ? "נא לאשר את מאפייני המוצר, הכשרות והאריזה על מנת שהסוכן ינעל את ההצעות הסופיות מול היצרנים האירופאיים."
          : "Please verify and sign off on technical specs, kosher supervision, and packaging preference.",
        buttonText: lang === "he" ? "צפה בבריף ואשר" : "Review & Sign Brief",
        buttonIcon: "📋",
        buttonActionType: "switch_tab",
        onButtonClick: () => setActiveTab("overview"),
      };
    }

    if (activePoNumber && wireStatus === "pending_buyer_wire") {
      return {
        stageNumber: 2,
        badgeLabel: lang === "he" ? "שלב 2: תשלום מקדמה" : "Step 2: Advance Deposit",
        badgeColor: "bg-rose-500/20 text-rose-300 border-rose-500/30",
        title: lang === "he" ? "העברת מקדמת 30% להפעלת הייצור במפעל" : "Remit 30% Production Advance Deposit",
        description: lang === "he"
          ? `הסכם PO נחתם בהצלחה. יש להזין אסמכתאת העברה בנקאית (€${advanceAmount.toLocaleString()}) לחשבון הנאמנות להפעלת קו הייצור באירופה.`
          : `PO signed. Please submit SWIFT MT103 wire confirmation (€${advanceAmount.toLocaleString()}) to release factory bottling.`,
        buttonText: lang === "he" ? "הזן אסמכתאת העברה (SWIFT)" : "Submit Wire Receipt",
        buttonIcon: "💳",
        buttonActionType: "open_modal",
        onButtonClick: () => {
          setSelectedMilestone("advance_30");
          setShowWireModal(true);
        },
      };
    }

    if (sampleDelivered && !sensorySubmitted) {
      return {
        stageNumber: 3,
        badgeLabel: lang === "he" ? "שלב 3: בדיקה סנסורית" : "Step 3: Tasting Evaluation",
        badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/30",
        title: lang === "he" ? "דוגמאות המפעל נמסרו למשרדכם! נא למלא משוב טעימה" : "Factory Samples Delivered! Complete Sensory Tasting",
        description: lang === "he"
          ? "ערכת הדוגמאות נמסרה ע״י DHL. דרגו טעם, מרקם, צבע וארומה לצורך אישור סופי או התאמת מתכון מול המפעל."
          : "Samples delivered by DHL. Record taste, texture, and aroma ratings to finalize recipe calibration.",
        buttonText: lang === "he" ? "מלא כרטיס בדיקה סנסורית" : "Fill Tasting Scorecard",
        buttonIcon: "🍷",
        buttonActionType: "switch_tab",
        onButtonClick: () => setActiveTab("samples"),
      };
    }

    if (sensorySubmitted && !packagingApproved) {
      return {
        stageNumber: 4,
        badgeLabel: lang === "he" ? "שלב 4: אישור גרפיקה" : "Step 4: Label Approval",
        badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/30",
        title: lang === "he" ? "אישור עיצוב גרפי ותווית עברית למותג פרטי" : "Approve Hebrew Private Label Artwork",
        description: lang === "he"
          ? "מפרט התווית בעברית (טבלת סימון תזונתי, אלרגנים, אישור כשרות) מוכן לאישור סופי לפני הדפסה במפעל."
          : "Hebrew nutritional & allergen label layout prepared according to MOH standards. Sign off to begin printing.",
        buttonText: lang === "he" ? "אשר תווית להדפסה" : "Approve Artwork",
        buttonIcon: "🎨",
        buttonActionType: "switch_tab",
        onButtonClick: () => setActiveTab("packaging"),
      };
    }

    if (balanceStatus === "pending_buyer_wire") {
      return {
        stageNumber: 5,
        badgeLabel: lang === "he" ? "שלב 5: יתרת 70% כנגד שטר מטען" : "Step 5: Balance Against B/L",
        badgeColor: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
        title: lang === "he" ? "המכולה שטה בים התיכון - העברת יתרת 70% כנגד B/L" : "Ocean Transit: Remit 70% Balance Against Clean B/L",
        description: lang === "he"
          ? `המכולה בהפלגה לאשדוד. שטר מטען ימי Clean B/L 3/3 הונפק. הזן אסמכתת יתרה (€${balanceAmount.toLocaleString()}) לשחרור מסמכי המקור לעמיל המכס.`
          : `Vessel underway to Ashdod Pier 21. Original Clean B/L issued. Submit balance wire (€${balanceAmount.toLocaleString()}) to release customs documents.`,
        buttonText: lang === "he" ? "הזן אסמכתאת יתרת 70%" : "Submit Balance Wire",
        buttonIcon: "💳",
        buttonActionType: "open_modal",
        onButtonClick: () => {
          setSelectedMilestone("balance_70");
          setShowWireModal(true);
        },
      };
    }

    if (!isDelivered && data.orderWorkflow?.customs_status === "customs_broker_clearing") {
      return {
        stageNumber: 6,
        badgeLabel: lang === "he" ? "שלב 6: שחרור מכס אשדוד" : "Step 6: Customs Clearance",
        badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
        title: lang === "he" ? "המכולה בנמל אשדוד רציף 21 - בהליך שחרור מכס מהיר" : "Container Docked at Ashdod Pier 21 - Green Lane Clearance",
        description: lang === "he"
          ? "עמיל המכס קיבל את תיק 6 המסמכים המלאים ומפיק רשימון יבוא במסלול הירוק. פקודת מסירה תועבר למוביל."
          : "Customs broker received complete 6-document bundle and is submitting declaration via Shaar Olami green lane.",
        buttonText: lang === "he" ? "כניסה לתיק מסמכי המכס" : "View Customs Portal",
        buttonIcon: "📑",
        buttonActionType: "link",
        targetLink: `/customs/${data.requestId}`,
      };
    }

    if (!isDelivered) {
      return {
        stageNumber: 7,
        badgeLabel: lang === "he" ? "שלב 7: קליטה במרלוג" : "Step 7: Dock Acceptance",
        badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
        title: lang === "he" ? "המכולה ברציף המרלוג - אשר תעודת קבלת טובין (GRN)" : "Container at Warehouse Dock - Sign Goods Receipt Note (GRN)",
        description: lang === "he"
          ? "משאית ההובלה הגיעה למחסן לפריקה. מנהל המרלוג מתבקש לאשר קליטת 24 משטחים ובדיקת שרשרת קור."
          : "Truck arrived at central warehouse dock. Warehouse officer sign-off required for 24 Euro-pallets.",
        buttonText: lang === "he" ? "אישור קליטת משטחים (GRN)" : "Sign Goods Receipt Note",
        buttonIcon: "📦",
        buttonActionType: "open_modal",
        onButtonClick: () => setShowGrnDocModal(true),
      };
    }

    return {
      stageNumber: 8,
      badgeLabel: lang === "he" ? "הושלם בהצלחה" : "100% Delivered",
      badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
      title: lang === "he" ? "עסקת היבוא הושלמה בהצלחה! 24 משטחים נקלטו במלאי המרלוג" : "Import Container Deal Completed! 24 Pallets Ingested into ERP",
      description: lang === "he"
        ? "תעודת קבלה רשמית (GRN) חתומה. ניתן להוריד מנשר Priority ERP או לבצע הזמנה חוזרת בקליק אחד."
        : "Official GRN signed & verified. Export Priority/SAP ASN or launch a 1-click repeat order run.",
      buttonText: lang === "he" ? "ניהול מכולות והזמנה חוזרת (Repeat Run)" : "View Portfolio & Re-Order",
      buttonIcon: "🔁",
      buttonActionType: "link",
      targetLink: "/track",
    };
  };

  const conciergeAction = getConciergeAction();

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
            <Link
              href="/track"
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 border border-slate-700 transition"
              title={lang === "he" ? "מעבר לתיק כל המכולות וההזמנות של הרשת" : "View corporate multi-container portfolio"}
            >
              <span>📁</span>
              <span>{lang === "he" ? "תיק מכולות הרשת" : "Buyer Portfolio"}</span>
            </Link>
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
                {activePoNumber
                  ? lang === "he"
                    ? `הזמנת רכש מסחרית פעילה (${activePoNumber})`
                    : `Commercial PO Active (${activePoNumber})`
                  : awbNumber
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
      <main className="max-w-5xl mx-auto px-4 py-8 flex-1 w-full text-xs space-y-6">
        {/* ── Smart Concierge Next Best Action Banner ── */}
        <BuyerActionConciergeBanner action={conciergeAction} lang={lang} />

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
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setActiveTab("samples")}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition cursor-pointer"
                      >
                        {lang === "he" ? "📦 בקש דוגמאות ב-DHL" : "📦 Request DHL Sample"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPoOffer(offer)}
                        className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold text-xs shadow-xs transition cursor-pointer flex items-center gap-1.5"
                      >
                        <span>🎯</span>
                        <span>{lang === "he" ? "בחר והוצא הזמנה (PO) ←" : "Accept & Issue Commercial PO →"}</span>
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

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setShowPoDocModal(true)}
                    className="text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <span>📄</span>
                    <span>{lang === "he" ? "הצג והורד הזמנת רכש רשמית (PDF)" : "Official PO & Proforma (PDF)"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowDocsModal(true)}
                    className="text-xs font-bold px-3 py-1.5 rounded-xl border border-blue-300 bg-blue-50/60 hover:bg-blue-100 text-blue-900 transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <span>📑</span>
                    <span>{lang === "he" ? "תיק מסמכי מכס ושילוח" : "Customs Package (B/L, EUR.1)"}</span>
                  </button>

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

              {/* ── 70% Final Balance Milestone Box (When 30% cleared) ── */}
              {wireStatus === "released_to_factory" && (
                <div className="p-5 rounded-2xl border-2 border-indigo-200 bg-gradient-to-r from-indigo-50/50 via-white to-blue-50/40 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                        2
                      </span>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">
                          {lang === "he" ? "שלב ב': תשלום יתרת 70% כנגד שטר מטען ימי ודוח בדיקה" : "Milestone 2: 70% Balance on Clean Ocean B/L & PSI"}
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          {lang === "he"
                            ? "שחרור מקורי של שטרי המטען ותעודת מקור EUR.1 לעמיל המכס בנמל אשדוד מותנה בסליקת היתרה."
                            : "Release of original 3/3 B/L and EUR.1 customs certificate to Ashdod port broker upon wire settlement."}
                        </p>
                      </div>
                    </div>

                    <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                      balanceStatus === "released_to_factory"
                        ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                        : balanceStatus === "wire_submitted_by_buyer"
                        ? "bg-amber-100 text-amber-800 border-amber-300"
                        : "bg-slate-100 text-slate-700 border-slate-300"
                    }`}>
                      {balanceStatus === "released_to_factory"
                        ? lang === "he" ? "העסקה הושלמה ✓" : "Fully Settled ✓"
                        : balanceStatus === "wire_submitted_by_buyer"
                        ? lang === "he" ? "אסמכתאת 70% בבדיקה" : "70% Wire In Review"
                        : lang === "he" ? "ממתין לתשלום יתרה" : "70% Balance Due"}
                    </span>
                  </div>

                  {balanceStatus === "wire_submitted_by_buyer" && (
                    <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 flex items-start gap-3">
                      <span className="text-xl">⏳</span>
                      <div>
                        <h5 className="font-bold text-amber-950 text-xs">
                          {lang === "he" ? "אסמכתאת תשלום היתרה (70%) נקלטה בהצלחה" : "70% Balance Wire Submitted"}
                        </h5>
                        <p className="text-[11px] text-amber-800 mt-0.5">
                          {lang === "he"
                            ? "דסק הסליקה מאמת את ההעברה. עם אישורה, מסמכי המקור ישוחררו אוטומטית לעמיל המכס לצורך שחרור המכולה בנמל אשדוד."
                            : "Our settlement desk is verifying funds. Once cleared, original documents are delivered to the customs broker."}
                        </p>
                      </div>
                    </div>
                  )}

                  {balanceStatus === "released_to_factory" && (
                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 flex items-start gap-3">
                      <span className="text-xl">🏆</span>
                      <div>
                        <h5 className="font-bold text-emerald-950 text-xs">
                          {lang === "he" ? "הסליקה הושלמה במלואה · המכולה שוחררה למסירה" : "Deal Fully Settled · Customs Release Authorized"}
                        </h5>
                        <p className="text-[11px] text-emerald-800 mt-0.5">
                          {lang === "he"
                            ? "כל תשלומי העסקה הוסדרו במלואם. תיק מסמכי המקור (B/L, EUR.1, כשרות) נמסר לעמיל המכס. המכולה בדרכה למחסן המרכזי."
                            : "Full deal financial clearance completed. Original shipping package handed over to Ashdod customs broker."}
                        </p>
                      </div>
                    </div>
                  )}

                  {balanceStatus !== "released_to_factory" && balanceStatus !== "wire_submitted_by_buyer" && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white rounded-xl border border-indigo-100">
                      <div>
                        <span className="text-[10px] font-bold text-indigo-700 uppercase">
                          {lang === "he" ? "סכום יתרה לתשלום (70%):" : "Balance Due (70%):"}
                        </span>
                        <div className="text-lg font-black text-slate-900 font-mono">
                          {data.orderWorkflow?.currency || "EUR"} {balanceAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMilestone("balance_70");
                          setShowWireModal(true);
                        }}
                        className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span>📤</span>
                        <span>{lang === "he" ? "העבר יתרת 70% והעלה אסמכתא" : "Submit 70% Balance Wire Slip"}</span>
                      </button>
                    </div>
                  )}
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
                        {selectedMilestone === "balance_70"
                          ? lang === "he" ? "הגשת אסמכתאת תשלום יתרה (70%)" : "Submit 70% Final Balance Wire"
                          : lang === "he" ? "הגשת אסמכתאת מקדמת ייצור (30%)" : "Submit 30% Advance Wire"}
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
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 font-medium flex items-center justify-between">
                      <div>
                        <span className="text-slate-600 block text-[11px]">
                          {selectedMilestone === "balance_70"
                            ? lang === "he" ? "תשלום יתרה כנגד שטר מטען (70%):" : "Final Balance Amount (70%):"
                            : lang === "he" ? "מקדמת פתיחת ייצור והדפסה (30%):" : "Production Advance Deposit (30%):"}
                        </span>
                        <strong className="text-emerald-900 text-base font-black font-mono">
                          {data.orderWorkflow?.currency || "EUR"}{" "}
                          {(selectedMilestone === "balance_70" ? balanceAmount : advanceAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </strong>
                      </div>

                      {wireStatus === "released_to_factory" && (
                        <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-emerald-300 text-[10px]">
                          <button
                            type="button"
                            onClick={() => setSelectedMilestone("advance_30")}
                            className={`px-2 py-0.5 rounded font-bold transition ${selectedMilestone === "advance_30" ? "bg-emerald-700 text-white" : "text-slate-600"}`}
                          >
                            30%
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedMilestone("balance_70")}
                            className={`px-2 py-0.5 rounded font-bold transition ${selectedMilestone === "balance_70" ? "bg-indigo-700 text-white" : "text-slate-600"}`}
                          >
                            70%
                          </button>
                        </div>
                      )}
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
            {!data.orderWorkflow?.container_number && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 text-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">🚢</span>
                  <div>
                    <span className="font-bold block">
                      {lang === "he"
                        ? "נתיב שילוח ימי מתוכנן (Valencia / Genoa → Ashdod Port)"
                        : "Scheduled Maritime Route (Valencia / Genoa → Ashdod Port)"}
                    </span>
                    <span className="text-amber-700 text-[11px]">
                      {lang === "he"
                        ? "פרטי המכולה, שטר המטען (B/L) וחיבור AIS ישיר יופעלו אוטומטית עם סיום הייצור והעמסת המטען בנמל המוצא."
                        : "Container ID, Ocean B/L, and live satellite AIS tracking activate once goods finish manufacturing and gate-in at origin port."}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1 bg-amber-200/60 rounded-md text-amber-900 shrink-0">
                  {lang === "he" ? "הדמיית נתיב מתוכנן" : "Planned Route"}
                </span>
              </div>
            )}

            <MaritimeVesselTracker
              requestId={data.requestId}
              orderStage={data.orderWorkflow?.current_stage || "manufacturing"}
              containerNumber={data.orderWorkflow?.container_number || "MSKU-9481029"}
              billOfLading={data.orderWorkflow?.bill_of_lading || "MSCUVAL881920"}
              shippingLine={data.orderWorkflow?.shipping_line || "MSC (Mediterranean Shipping Company)"}
              vesselName={data.orderWorkflow?.vessel_name || "MSC LEANNE"}
              portOfOrigin={data.orderWorkflow?.port_of_origin || "Valencia Port, Spain"}
              portOfDestination={data.orderWorkflow?.port_of_destination || "Ashdod Port, Israel"}
              etd={data.orderWorkflow?.etd}
              etaPort={data.orderWorkflow?.eta_port}
              customsStatus={data.orderWorkflow?.customs_status}
              deliveryStatus={data.orderWorkflow?.delivery_status}
              buyerWarehouseAddress={data.orderWorkflow?.buyer_warehouse_address}
              productName={data.cleanedName || data.productName}
              lang={lang}
            />

            {/* ── WAREHOUSE RECEIVING & GOODS RECEIPT NOTE (GRN) SECTION ── */}
            {isDelivered ? (
              <div className="bg-gradient-to-r from-emerald-950/85 to-slate-900 border border-emerald-500/40 rounded-2xl p-6 text-white shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-emerald-500/20">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-2xl shrink-0">
                      🏢
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base text-white">
                          {lang === "he" ? "קבלת טובין במרלוג - תעודת קבלה רשמית (GRN)" : "Warehouse Goods Receipt Confirmed (GRN)"}
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/30 text-emerald-300 border border-emerald-500/40">
                          ACCEPTED & STOCKED
                        </span>
                      </div>
                      <p className="text-xs text-emerald-200/80 mt-0.5">
                        {lang === "he"
                          ? "כל המשטחים נפרקו ברציף המרלוג, נבדקו מול שטר המטען ונקלטו במערכת המלאי (ERP) של היבואן."
                          : "All pallets unloaded at dock, verified against B/L, and booked into buyer ERP inventory."}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowGrnDocModal(true)}
                    className="text-xs font-bold px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition flex items-center gap-2 cursor-pointer shadow-sm shrink-0"
                  >
                    <span>📄</span>
                    <span>{lang === "he" ? "הצג תעודת קבלה רשמית (GRN PDF)" : "View Official GRN PDF"}</span>
                  </button>
                </div>

                {/* GRN Telemetry Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-emerald-900/50">
                    <span className="text-[10px] text-slate-400 block">{lang === "he" ? "מספר תעודת קבלה (GRN)" : "GRN Number"}</span>
                    <span className="font-mono font-bold text-emerald-400 text-sm mt-0.5 block">{grnNumber}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-emerald-900/50">
                    <span className="text-[10px] text-slate-400 block">{lang === "he" ? "משטחים שנקלטו" : "Pallets Received"}</span>
                    <span className="font-mono font-bold text-slate-200 text-sm mt-0.5 block">{grnPalletCount} Euro Pallets</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-emerald-900/50">
                    <span className="text-[10px] text-slate-400 block">{lang === "he" ? "קצין קבלת סחורה" : "Receiving Officer"}</span>
                    <span className="font-semibold text-slate-200 mt-0.5 block truncate">{grnAcceptedBy}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-emerald-900/50">
                    <span className="text-[10px] text-slate-400 block">{lang === "he" ? "מועד פריקה וקליטה" : "Arrival Timestamp"}</span>
                    <span className="font-mono font-semibold text-sky-400 mt-0.5 block truncate">
                      {grnArrivedAt ? new Date(grnArrivedAt).toLocaleDateString("he-IL") : "Completed"}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
                <div className="pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center text-xl shrink-0">
                      🏢
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        {lang === "he" ? "קליטת סחורה ברציף המרלוג ואישור תעודת קבלה (GRN)" : "Warehouse Dock Receiving & Pallet Acceptance (GRN)"}
                      </h3>
                      <p className="text-slate-500 text-xs mt-0.5">
                        {lang === "he"
                          ? "אימות חותם מכולה, רציפות קירור (מד-חום), ספירת משטחים וחתימה על תעודת קבלת טובין רשמית."
                          : "Verify container seal, cold-chain logger (+18°C), pallet tally, and execute official Goods Receipt Note."}
                      </p>
                    </div>
                  </div>

                  <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold rounded-xl shrink-0">
                    {lang === "he" ? "ממתין לפריקה במרלוג" : "Pending Dock Receiving"}
                  </span>
                </div>

                {grnActionSuccess && (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                    {grnActionSuccess}
                  </div>
                )}
                {grnActionError && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                    {grnActionError}
                  </div>
                )}

                {/* 4 Pre-flight Dock Checkboxes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <div className="flex items-center gap-2 text-slate-700">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>{lang === "he" ? "חותם בריח מכולה (#IL-98402) שלם ומאומת לפני חיתוך" : "Container bolt seal (#IL-98402) verified intact"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>{lang === "he" ? "מד-חום USB נבדק: +18.2°C תקין ללא חריגות טמפרטורה" : "Cold-chain data logger verified (+18.2°C - Normal)"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>{lang === "he" ? "ספירת משטחים: 24 משטחי עץ תקניים, ללא קרטונים פגועים" : "Pallet condition intact (24 Euro-pallets, undamaged)"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>{lang === "he" ? "תוויות פרייבט ליבל בעברית, סימון תזונתי וכשרות מאושרים" : "Hebrew label compliance & Chief Rabbinate Kosher verified"}</span>
                  </div>
                </div>

                {/* Dock Input Form */}
                <form onSubmit={handleGrnSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">
                        {lang === "he" ? "שם קצין / מנהל קבלת סחורה" : "Receiving Officer"}
                      </label>
                      <input
                        type="text"
                        required
                        value={grnAcceptedBy}
                        onChange={(e) => setGrnAcceptedBy(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl p-2.5 text-slate-900 font-semibold bg-white"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">
                        {lang === "he" ? "כמות משטחים שנפרקו בפועל" : "Pallets Received"}
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={60}
                        required
                        value={grnPalletCount}
                        onChange={(e) => setGrnPalletCount(Number(e.target.value))}
                        className="w-full border border-slate-200 rounded-xl p-2.5 font-bold font-mono text-emerald-700 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">
                        {lang === "he" ? "מספר רישוי משאית / מוביל יבשתי" : "Truck License Plate"}
                      </label>
                      <input
                        type="text"
                        value={grnDriverPlate}
                        onChange={(e) => setGrnDriverPlate(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl p-2.5 font-mono text-slate-900 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">
                        {lang === "he" ? "מספר שער / רציף פריקה" : "Receiving Dock Bay"}
                      </label>
                      <input
                        type="text"
                        value={grnDockBay}
                        onChange={(e) => setGrnDockBay(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl p-2.5 text-slate-900 bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">
                      {lang === "he" ? "הערות קבלת טובין ורישום למלאי" : "Receiving Inspection Notes"}
                    </label>
                    <textarea
                      rows={2}
                      value={grnNotes}
                      onChange={(e) => setGrnNotes(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-2.5 text-slate-700 text-xs leading-relaxed bg-white"
                    />
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <span className="text-[11px] text-slate-500">
                      {lang === "he"
                        ? "חתימה מאשרת קליטת המטען למלאי היבואן וסגירת התחייבות האספקה של הספק."
                        : "Signing issues official GRN document and books cargo into inventory."}
                    </span>

                    <button
                      type="submit"
                      disabled={isPending}
                      className="text-xs font-bold px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                    >
                      {isPending ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                          <span>{lang === "he" ? "מאשר פריקה ומנפיק תעודת קבלה..." : "Signing & Issuing GRN..."}</span>
                        </>
                      ) : (
                        <>
                          <span>✍️</span>
                          <span>{lang === "he" ? "אשר פריקה וחתום על תעודת קבלה רשמית (GRN)" : "Sign & Issue Official GRN Document"}</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* ── Commercial Purchase Order Issuance Modal ── */}
        {poOffer && (
          <BuyerPoModal
            isOpen={Boolean(poOffer)}
            onClose={() => setPoOffer(null)}
            requestId={data.requestId}
            buyerCompany={data.buyerCompany}
            offer={poOffer}
            lang={lang}
            onSuccess={(poNumber, totalValue, advanceDue) => {
              setPoOffer(null);
              setActivePoNumber(poNumber);
              setActiveTab("settlement");
              setWireActionMsg(
                lang === "he"
                  ? `🎉 הזמנת רכש מסחרית #${poNumber} הופקה ונחתמה בהצלחה (שווי חוזה: €${totalValue.toLocaleString()})! נא להסדיר את מקדמת ה-30% (€${advanceDue.toLocaleString()}) למטה להפעלת קו הייצור במפעל.`
                  : `🎉 Commercial PO #${poNumber} signed & issued successfully (Total: €${totalValue.toLocaleString()})! Please settle the 30% advance deposit (€${advanceDue.toLocaleString()}) below.`
              );
            }}
          />
        )}

        {/* ── Official B2B Commercial PO & Proforma Viewer Modal ── */}
        <CommercialPoDocumentModal
          isOpen={showPoDocModal}
          onClose={() => setShowPoDocModal(false)}
          poNumber={activePoNumber || data.orderWorkflow?.po_number || `FDX-PO-${data.requestId.slice(0, 6).toUpperCase()}`}
          poDate={data.orderWorkflow?.po_date || new Date().toISOString().slice(0, 10)}
          buyerCompany={data.buyerCompany}
          buyerSignatory="Procurement & Sourcing Director"
          buyerAddress={data.orderWorkflow?.buyer_warehouse_address || `${data.buyerCompany} Central Logistics Hub, Rishon LeZion, Israel`}
          supplierName={data.orderWorkflow?.selected_supplier_name || (data.offers[0] ? `Producer ${data.offers[0].producerCode}` : "European Certified Food Producer")}
          supplierCountry={data.offers[0]?.country || "European Union"}
          productName={data.cleanedName || data.productName}
          orderVolume={data.orderWorkflow?.order_volume || "24,000 Units (1 x 40ft HQ FCL)"}
          unitPrice={data.orderWorkflow?.agreed_unit_price || data.offers[0]?.sellingPrice || 1.85}
          currency={data.orderWorkflow?.currency || "EUR"}
          totalOrderValue={totalCalculated}
          incoterms={data.orderWorkflow?.incoterms || "CIF Ashdod Port (Incoterms 2020)"}
          paymentTerms={data.orderWorkflow?.payment_terms || "30% Advance Deposit on PO signing, 70% against B/L copy & PSI report"}
          certifications={data.certifications.length > 0 ? data.certifications : ["BRCGS Food Safety", "IFS", "Kosher"]}
          packagingPreference={data.packagingPreference || "Retail Sealed Pack"}
          targetWarehouse={data.orderWorkflow?.buyer_warehouse_address || `${data.buyerCompany} Central Distribution Center`}
        />

        {/* ── Official Customs & Export Document Handover Modal ── */}
        <ExportDocumentHandoverModal
          isOpen={showDocsModal}
          onClose={() => setShowDocsModal(false)}
          requestId={data.requestId}
          poNumber={activePoNumber || data.orderWorkflow?.po_number || `FDX-PO-${data.requestId.slice(0, 6).toUpperCase()}`}
          buyerCompany={data.buyerCompany}
          supplierName={data.orderWorkflow?.selected_supplier_name || (data.offers[0] ? `Producer ${data.offers[0].producerCode}` : "European Certified Food Producer")}
          productName={data.cleanedName || data.productName}
          containerNumber={data.orderWorkflow?.container_number || "MSKU-9481029"}
          billOfLading={data.orderWorkflow?.bill_of_lading || "MSCUVAL881920"}
          shippingLine={data.orderWorkflow?.shipping_line || "MSC (Mediterranean Shipping Company)"}
          vesselName={data.orderWorkflow?.vessel_name || "MSC LEANNE"}
          customsDeclaration={data.orderWorkflow?.customs_declaration_number || undefined}
          etaPort={data.orderWorkflow?.eta_port || undefined}
          isBalanceCleared={balanceStatus === "released_to_factory"}
        />

        {/* ── Official Goods Receipt Note (GRN) Document Viewer Modal ── */}
        <GoodsReceiptDocumentModal
          isOpen={showGrnDocModal}
          onClose={() => setShowGrnDocModal(false)}
          grnNumber={grnNumber}
          grnDate={grnArrivedAt || new Date().toISOString().slice(0, 10)}
          poNumber={activePoNumber || data.orderWorkflow?.po_number || `FDX-PO-${data.requestId.slice(0, 6).toUpperCase()}`}
          poDate={data.orderWorkflow?.po_date || new Date().toISOString().slice(0, 10)}
          buyerCompany={data.buyerCompany}
          buyerAddress={data.orderWorkflow?.buyer_warehouse_address || `${data.buyerCompany} Central Logistics Hub, Sorek Park, Israel`}
          receivingOfficer={grnAcceptedBy}
          receivingDockBay={grnDockBay}
          truckLicensePlate={grnDriverPlate}
          supplierName={data.orderWorkflow?.selected_supplier_name || (data.offers[0] ? `Producer ${data.offers[0].producerCode}` : "European Certified Food Producer")}
          supplierCountry={data.offers[0]?.country || "European Union"}
          productName={data.cleanedName || data.productName}
          orderVolume={data.orderWorkflow?.order_volume || "24,000 Units (1 x 40ft HQ FCL)"}
          containerNumber={data.orderWorkflow?.container_number || "MSKU-9481029"}
          billOfLading={data.orderWorkflow?.bill_of_lading || "MSCUVAL881920"}
          vesselName={data.orderWorkflow?.vessel_name || "MSC LEANNE / Voyage 2604E"}
          shippingLine={data.orderWorkflow?.shipping_line || "MSC (Mediterranean Shipping Company)"}
          customsDeclarationNumber={data.orderWorkflow?.customs_declaration_number || "IL-2604-881920"}
          warehousePalletCount={grnPalletCount}
          tempLoggerReading={grnTempLogger}
          sealNumber={grnSealNumber}
          inspectionNotes={grnNotes}
        />
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
