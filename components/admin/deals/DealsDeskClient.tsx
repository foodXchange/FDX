"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  type DealRecord, 
  saveProFormaDeal, 
  advanceDealStage,
  getDealNotificationPreview,
  dispatchDealNotification,
} from "@/app/admin/deals/actions";
import { generatePriorityErpCsv } from "@/lib/documents/erpAsnGenerator";
import type { FormattedTripartiteMessage, TripartiteEventType } from "@/lib/notifications/tripartiteDispatchEngine";
import TourGuide, { type TourStep } from "@/components/tour/TourGuide";

const DEAL_DESK_TOUR_STEPS: TourStep[] = [
  {
    targetSelector: "#tour-deal-kpis",
    titleHe: "מדדי עסקאות ומחזור B2B",
    titleEn: "1. Deal Pipeline & Escrow Metrics",
    descHe: "מעקב אחר שווי חוזים כולל (GMV), מקדמות 30% בהמתנה להעברה, ורווחי עמלת תיווך לפודאקסצ'יינג'.",
    descEn: "Track total contract GMV, 30% advance escrow pending, active factory production runs, and broker pool earnings.",
    icon: "📊",
  },
  {
    targetSelector: "#tour-deals-list",
    titleHe: "רשימת עסקאות מסחריות ושטרי מטען",
    titleEn: "2. Commercial Deals & PO Manifests",
    descHe: "כל עסקה מכילה את תנאי ה-Incoterms, תקני הכשרות, פירוט מכולה, ומעקב אחר אבני הדרך הכספיות 30/70.",
    descEn: "Each deal itemizes Incoterms, kosher certifications, container specs, and 30/70 financial escrow milestones.",
    icon: "📑",
  },
  {
    targetSelector: "#tour-tripartite-btn",
    titleHe: "מוקד התראות וואטסאפ ואימייל משולש",
    titleEn: "3. Tripartite Automated Dispatch Hub",
    descHe: "שיגור אוטומטי של הודעות וואטסאפ ואימייל לקניין הישראלי, למפעל באירופה, ולעמיל המכס בנמל אשדוד בכל שלב בעסקה.",
    descEn: "Dispatch automated WhatsApp and email alerts to the Israeli Buyer, European Factory, and Customs Broker at every milestone.",
    icon: "🔔",
  },
  {
    targetSelector: "#tour-asn-btn",
    titleHe: "ייצוא פריוריטי ERP ASN לקליטה ברשת",
    titleEn: "4. Priority ERP Inbound Receiving ASN",
    descHe: "הורדת קובץ CSV בתקן פריוריטי ERP הכולל ברקודי משטחים SSCC, תאריכי תפוגה ומספרי אצווה לקליטה אוטומטית במרלו״ג.",
    descEn: "Download Priority ERP Inbound Receiving CSVs with SSCC barcodes, expiry dates, and lot numbers for supermarket DC intake.",
    icon: "📥",
  },
];

interface Props {
  initialDeals: DealRecord[];
}

const STAGE_CONFIG: Record<string, { label: string; badge: string; desc: string }> = {
  all: { label: "All Deals", badge: "bg-slate-800 text-slate-300", desc: "All commercial orders" },
  order_po_issued: { label: "Pro-Forma Issued", badge: "bg-blue-500/15 text-blue-400 border border-blue-500/30", desc: "Awaiting signatures & 30% wire" },
  commercial_negotiation: { label: "Signed / Escrow Pending", badge: "bg-amber-500/15 text-amber-400 border border-amber-500/30", desc: "Parties signed, 30% deposit verification" },
  manufacturing: { label: "Factory Production", badge: "bg-purple-500/15 text-purple-400 border border-purple-500/30", desc: "Kosher batch run & packaging at factory" },
  shipping_customs_warehouse: { label: "On Vessel / In Transit", badge: "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30", desc: "B/L issued, en route to Ashdod/Haifa" },
  customs_warehouse: { label: "Port Customs & SI 1145", badge: "bg-orange-500/15 text-orange-400 border border-orange-500/30", desc: "MoH release & customs inspection" },
  completed: { label: "Delivered & Cleared", badge: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30", desc: "Received at buyer DC, final settlement" },
};

const NOTIFY_EVENTS: { id: TripartiteEventType; label: string; recipient: string; icon: string }[] = [
  { id: "po_signed_advance_due", label: "PO Signed & 30% Advance Due", recipient: "Buyer (RTL WhatsApp & Wire Instructions)", icon: "✍️" },
  { id: "advance_verified_production_released", label: "30% Wire Confirmed → Release Production", recipient: "Factory (English Bottling & Run Order)", icon: "🏭" },
  { id: "container_loaded_vessel_departed", label: "Vessel Departed & B/L Issued (70% Due)", recipient: "Buyer (B/L Inspection & Balance Due)", icon: "🚢" },
  { id: "vessel_approaching_customs_dispatch", label: "Vessel Approaching Ashdod / Customs Alert", recipient: "Customs Broker (EUR.1 & Clearance Package)", icon: "🛃" },
  { id: "customs_cleared_inland_trucking", label: "Customs Cleared → Inland Trucking Dispatched", recipient: "Buyer Logistics (Delivery ETA & Dock ASN)", icon: "🚚" },
  { id: "grn_dock_accepted_deal_closed", label: "Dock Acceptance (GRN) & Escrow Settled", recipient: "All Parties (Deal Closed & Archive)", icon: "✅" },
];

export default function DealsDeskClient({ initialDeals }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [deals, setDeals] = useState<DealRecord[]>(initialDeals);
  const [selectedStage, setSelectedStage] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal State for New Pro-Forma
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form Fields
  const [formBuyerCompany, setFormBuyerCompany] = useState("Shufersal Retail Chain");
  const [formBuyerVat, setFormBuyerVat] = useState("51-008492-3");
  const [formBuyerContact, setFormBuyerContact] = useState("Rani Mor (Category Lead)");
  const [formBuyerEmail, setFormBuyerEmail] = useState("procurement@shufersal.co.il");
  const [formBuyerPhone, setFormBuyerPhone] = useState("+972-54-9988221");

  const [formSupplierName, setFormSupplierName] = useState("Pastificio Attilio Mastromauro Granoro Srl");
  const [formSupplierCountry, setFormSupplierCountry] = useState("Corato (Bari), Italy");
  const [formSupplierEmail, setFormSupplierEmail] = useState("export@granoro.it");
  const [formSupplierIban, setFormSupplierIban] = useState("IT60X0542811101000000123456");

  const [formProductName, setFormProductName] = useState("Penne Rigate Trafilata al Bronzo 500g");
  const [formProductHebrewName, setFormProductHebrewName] = useState("פנה ריגטה ברונזה 500 גרם");
  const [formContainerType, setFormContainerType] = useState<"20ft_dry" | "40ft_hc" | "40ft_reefer">("40ft_hc");
  const [formTotalUnits, setFormTotalUnits] = useState<number>(43200);
  const [formPalletCount, setFormPalletCount] = useState<number>(24);
  const [formUnitsPerCarton, setFormUnitsPerCarton] = useState<number>(18);
  const [formCartonsPerPallet, setFormCartonsPerPallet] = useState<number>(100);

  const [formBuyerUnitPrice, setFormBuyerUnitPrice] = useState<number>(0.84);
  const [formFactoryUnitPrice, setFormFactoryUnitPrice] = useState<number>(0.72);
  const [formCurrency, setFormCurrency] = useState("EUR");
  const [formIncoterms, setFormIncoterms] = useState("CIF Ashdod Port, Israel (Incoterms 2020)");
  const [formPortOfOrigin, setFormPortOfOrigin] = useState("Port of Salerno / Genoa, Italy");
  const [formPortOfDestination, setFormPortOfDestination] = useState("Port of Ashdod, Israel");
  const [formKosherStandard, setFormKosherStandard] = useState("Chief Rabbinate of Israel / OU Kosher Pareve");

  // Advance Stage Modal
  const [advanceModalDeal, setAdvanceModalDeal] = useState<DealRecord | null>(null);
  const [advanceStageTarget, setAdvanceStageTarget] = useState<string>("manufacturing");
  const [advVesselName, setAdvVesselName] = useState("MSC ISRAEL V.2604");
  const [advBlNumber, setAdvBlNumber] = useState("MSCU-8849201");
  const [advCustomsDec, setAdvCustomsDec] = useState("CUSTOMS-IL-260481");
  const [isAdvancing, setIsAdvancing] = useState(false);

  // Tripartite Notification Modal State
  const [notifyModalDeal, setNotifyModalDeal] = useState<DealRecord | null>(null);
  const [notifyEventType, setNotifyEventType] = useState<TripartiteEventType>("po_signed_advance_due");
  const [notifyChannel, setNotifyChannel] = useState<"whatsapp" | "email" | "both">("both");
  const [notifyPreview, setNotifyPreview] = useState<FormattedTripartiteMessage | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState<boolean>(false);
  const [isDispatchingNotify, setIsDispatchingNotify] = useState<boolean>(false);
  const [notifySuccessMsg, setNotifySuccessMsg] = useState<string | null>(null);
  const [notifyDirectWhatsappUrl, setNotifyDirectWhatsappUrl] = useState<string | null>(null);

  // Check URL params
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      const fromSample = searchParams.get("from_sample");
      const buyerName = searchParams.get("buyer");
      const prodName = searchParams.get("product");
      const suppName = searchParams.get("supplier");

      if (buyerName) setFormBuyerCompany(buyerName);
      if (prodName) {
        setFormProductName(prodName);
        setFormProductHebrewName(prodName);
      }
      if (suppName) setFormSupplierName(suppName);

      setIsModalOpen(true);
    }
  }, [searchParams]);

  // Derived calculations for Modal
  const modalCalculations = useMemo(() => {
    const grossVal = Math.round(formTotalUnits * formBuyerUnitPrice * 100) / 100;
    const factoryCost = Math.round(formTotalUnits * formFactoryUnitPrice * 100) / 100;
    const agentPool = Math.round((grossVal - factoryCost) * 100) / 100;
    const adv30 = Math.round(grossVal * 0.3 * 100) / 100;
    const bal70 = Math.round(grossVal * 0.7 * 100) / 100;
    const ilsGross = Math.round(grossVal * 4.05);

    // Container utilization:
    // 20ft: 28 CBM, 21,500kg
    // 40ft HC: 68 CBM, 26,000kg
    // 40ft Reefer: 60 CBM, 26,000kg
    const maxCbm = formContainerType === "20ft_dry" ? 28 : formContainerType === "40ft_hc" ? 68 : 60;
    const maxKg = formContainerType === "20ft_dry" ? 21500 : 26000;

    const estCbm = Math.round(formPalletCount * 2.1 * 10) / 10;
    const estKg = Math.round(formTotalUnits * 0.52 + formPalletCount * 25);

    const cbmPct = Math.min(100, Math.round((estCbm / maxCbm) * 100));
    const kgPct = Math.min(100, Math.round((estKg / maxKg) * 100));

    return { grossVal, factoryCost, agentPool, adv30, bal70, ilsGross, estCbm, maxCbm, estKg, maxKg, cbmPct, kgPct };
  }, [formTotalUnits, formBuyerUnitPrice, formFactoryUnitPrice, formPalletCount, formContainerType]);

  // Pipeline Metrics
  const metrics = useMemo(() => {
    const totalCount = deals.length;
    const totalGmv = deals.reduce((sum, d) => sum + (d.grossContractValue || 0), 0);
    const totalBrokerPool = deals.reduce((sum, d) => sum + (d.agentPool || 0), 0);
    const activeProduction = deals.filter((d) => d.currentStage === "manufacturing").length;
    const pendingWire = deals.filter((d) => d.currentStage === "order_po_issued" || d.currentStage === "commercial_negotiation").length;

    return { totalCount, totalGmv, totalBrokerPool, activeProduction, pendingWire };
  }, [deals]);

  // Filtered Deals
  const filteredDeals = useMemo(() => {
    return deals.filter((deal) => {
      if (selectedStage !== "all" && deal.currentStage !== selectedStage) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const mPo = deal.poNumber.toLowerCase().includes(q);
        const mBuyer = deal.buyerCompany.toLowerCase().includes(q);
        const mSupp = deal.supplierName.toLowerCase().includes(q);
        const mProd = deal.productName.toLowerCase().includes(q);
        return mPo || mBuyer || mSupp || mProd;
      }
      return true;
    });
  }, [deals, selectedStage, searchTerm]);

  // Copy link handler
  const handleCopyLink = (dealId: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://fdx.trading";
    const url = `${origin}/proforma/${dealId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(dealId);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Download Priority ERP ASN CSV
  const handleDownloadErpCsv = (deal: DealRecord) => {
    const payload = {
      poNumber: deal.poNumber,
      poDate: deal.poDate,
      buyerCompany: deal.buyerCompany,
      supplierFactory: deal.supplierName,
      originCountry: deal.supplierCountry,
      productName: deal.productName,
      hebrewName: deal.productHebrewName || deal.productName,
      skuCode: `FDX-${deal.poNumber.slice(-5)}`,
      eanBarcode: "8001234567890",
      containerNumber: deal.containerNumber || "MEDU8829103",
      billOfLading: deal.billOfLading || "MSCU-884920",
      customsDeclarationNumber: deal.customsDeclaration || `IL-2604-${deal.poNumber.slice(-4)}`,
      palletCount: deal.palletCount,
      totalUnits: deal.totalUnits,
      unitsPerPallet: Math.round(deal.totalUnits / deal.palletCount),
      netWeightKgPerUnit: 0.5,
      grossWeightKgPerUnit: 0.54,
      storageTemp: "+18°C Dry Ambient",
      batchNumber: `LOT-${deal.poNumber.slice(-4)}-26`,
      expiryDate: "30/06/2027",
    };

    const csvContent = generatePriorityErpCsv(payload);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Priority_ERP_ASN_${deal.poNumber}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle Create Pro-Forma Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const res = await saveProFormaDeal({
      buyerCompany: formBuyerCompany,
      buyerContact: formBuyerContact,
      buyerEmail: formBuyerEmail,
      buyerPhone: formBuyerPhone,
      buyerVat: formBuyerVat,
      supplierName: formSupplierName,
      supplierCountry: formSupplierCountry,
      supplierEmail: formSupplierEmail,
      supplierIban: formSupplierIban,
      productName: formProductName,
      productHebrewName: formProductHebrewName,
      containerType: formContainerType,
      palletCount: formPalletCount,
      totalUnits: formTotalUnits,
      unitsPerCarton: formUnitsPerCarton,
      cartonsPerPallet: formCartonsPerPallet,
      buyerUnitPrice: formBuyerUnitPrice,
      factoryUnitPrice: formFactoryUnitPrice,
      currency: formCurrency,
      incoterms: formIncoterms,
      portOfOrigin: formPortOfOrigin,
      portOfDestination: formPortOfDestination,
      kosherStandard: formKosherStandard,
    });

    setIsSubmitting(false);

    if (res.ok && res.dealId) {
      setIsModalOpen(false);
      // Navigate to the newly generated Pro-Forma page
      router.push(`/proforma/${res.dealId}`);
    } else {
      alert(`Error saving pro-forma: ${res.error || "Unknown error"}`);
    }
  };

  // Advance Stage Submit
  const handleAdvanceSubmit = async () => {
    if (!advanceModalDeal) return;
    setIsAdvancing(true);

    const res = await advanceDealStage(advanceModalDeal.id, advanceStageTarget, {
      depositTransferred: advanceStageTarget === "manufacturing",
      containerLoaded: advanceStageTarget === "shipping_customs_warehouse",
      vesselName: advVesselName,
      billOfLading: advBlNumber,
      customsDeclarationNumber: advCustomsDec,
    });

    setIsAdvancing(false);
    if (res.ok) {
      setDeals((prev) =>
        prev.map((d) => (d.id === advanceModalDeal.id ? { ...d, currentStage: advanceStageTarget } : d))
      );
      setAdvanceModalDeal(null);
    } else {
      alert(`Error advancing stage: ${res.error}`);
    }
  };

  // Open Tripartite Modal
  const openNotifyModal = (deal: DealRecord) => {
    setNotifyModalDeal(deal);
    setNotifySuccessMsg(null);
    setNotifyDirectWhatsappUrl(null);

    // Pick contextual default event
    let defaultEvt: TripartiteEventType = "po_signed_advance_due";
    if (deal.currentStage === "manufacturing") defaultEvt = "advance_verified_production_released";
    else if (deal.currentStage === "shipping_customs_warehouse") defaultEvt = "container_loaded_vessel_departed";
    else if (deal.currentStage === "customs_warehouse") defaultEvt = "vessel_approaching_customs_dispatch";
    else if (deal.currentStage === "completed") defaultEvt = "grn_dock_accepted_deal_closed";

    setNotifyEventType(defaultEvt);
    void loadPreview(deal.id, defaultEvt);
  };

  const loadPreview = async (dealId: string, eventType: TripartiteEventType) => {
    setIsLoadingPreview(true);
    try {
      const res = await getDealNotificationPreview(dealId, eventType);
      if (res.ok && res.formatted) {
        setNotifyPreview(res.formatted);
        setNotifyDirectWhatsappUrl(res.formatted.whatsappUrl);
      }
    } catch (err) {
      console.error("Preview load failed:", err);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleSelectEventType = (evt: TripartiteEventType) => {
    setNotifyEventType(evt);
    setNotifySuccessMsg(null);
    if (notifyModalDeal) {
      void loadPreview(notifyModalDeal.id, evt);
    }
  };

  const handleDispatchNotify = async () => {
    if (!notifyModalDeal) return;
    setIsDispatchingNotify(true);
    setNotifySuccessMsg(null);

    try {
      const res = await dispatchDealNotification(notifyModalDeal.id, notifyEventType, notifyChannel);
      if (res.ok) {
        setNotifySuccessMsg(res.message || "Notification successfully dispatched and logged in deal record!");
        if (res.whatsappUrl) {
          setNotifyDirectWhatsappUrl(res.whatsappUrl);
        }
      } else {
        alert(`Dispatch failed: ${res.error || "Unknown error"}`);
      }
    } catch (err: any) {
      alert(`Dispatch error: ${err.message}`);
    } finally {
      setIsDispatchingNotify(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER & TOP ACTIONS */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">📑</span>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              B2B Commercial Deals & Pro-Forma Desk
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Escrow 30/70 Enabled
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Turn approved tasting samples into binding B2B sales contracts, issue Pro-Forma Invoices, manage 30/70 escrow milestones, and generate Priority ERP manifests.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <TourGuide
            tourId="deals_desk_tour"
            steps={DEAL_DESK_TOUR_STEPS}
            lang="en"
            autoStart={false}
          />
          <Link
            href="/admin/finance"
            className="px-3.5 py-2 rounded-xl text-xs font-medium bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition"
          >
            💰 View Treasury P&L
          </Link>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg shadow-orange-500/20 transition flex items-center gap-2"
          >
            <span>+</span>
            <span>Issue Commercial Pro-Forma</span>
          </button>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div id="tour-deal-kpis" className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4">
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Active Deals</p>
          <p className="text-2xl font-bold text-white mt-1">{metrics.totalCount}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">PO contracts generated</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4">
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Total GMV</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">€{metrics.totalGmv.toLocaleString()}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">≈ ₪{(metrics.totalGmv * 4.05).toLocaleString()}</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4">
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">30% Deposit Pending</p>
          <p className="text-2xl font-bold text-amber-400 mt-1">{metrics.pendingWire} Deals</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Awaiting wire to start production</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4">
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Factory Production</p>
          <p className="text-2xl font-bold text-purple-400 mt-1">{metrics.activeProduction} Batches</p>
          <p className="text-[11px] text-slate-500 mt-0.5">EU kosher bottling runs</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 col-span-2 lg:col-span-1">
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Broker Commission Pool</p>
          <p className="text-2xl font-bold text-orange-400 mt-1">€{metrics.totalBrokerPool.toLocaleString()}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">FoodXchange deal spread</p>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/50 p-2.5 rounded-2xl border border-slate-800/80">
        {/* Stage Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
          {Object.entries(STAGE_CONFIG).map(([key, cfg]) => {
            const active = selectedStage === key;
            return (
              <button
                key={key}
                onClick={() => setSelectedStage(key)}
                className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition ${
                  active
                    ? "bg-orange-500 text-white shadow-xs"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/80"
                }`}
              >
                {cfg.label}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="w-full sm:w-64">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search PO, Buyer, Supplier..."
            className="w-full px-3 py-1.5 text-xs bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-hidden focus:border-orange-500"
          />
        </div>
      </div>

      {/* DEALS LIST / TABLE */}
      {filteredDeals.length === 0 ? (
        <div className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-12 text-center">
          <span className="text-4xl block mb-2">📑</span>
          <h3 className="text-base font-semibold text-white">No commercial deals match the current filter</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-4">
            Convert an approved tasting sample from the Tasting Samples Desk or click below to generate your first binding B2B Pro-Forma Invoice.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-xl transition"
          >
            + Issue Commercial Pro-Forma
          </button>
        </div>
      ) : (
        <div id="tour-deals-list" className="space-y-3.5">
          {filteredDeals.map((deal) => {
            const stageCfg = STAGE_CONFIG[deal.currentStage] || STAGE_CONFIG.order_po_issued;
            const ilsVal = Math.round(deal.grossContractValue * 4.05);

            return (
              <div
                key={deal.id}
                className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 hover:border-slate-700/80 transition shadow-sm"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left Column: PO, Buyer, Supplier, Product */}
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-orange-400 bg-orange-500/10 border border-orange-500/30 px-2 py-0.5 rounded-lg">
                        {deal.poNumber}
                      </span>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${stageCfg.badge}`}>
                        {stageCfg.label}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">
                        Date: {deal.poDate}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                      <span className="font-semibold text-white">
                        🛒 {deal.buyerCompany}
                      </span>
                      <span className="text-slate-500">→</span>
                      <span className="text-slate-300">
                        🏭 {deal.supplierName} ({deal.supplierCountry})
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                      <span className="text-amber-300 font-medium">
                        📦 {deal.productName}
                      </span>
                      <span>·</span>
                      <span>{deal.totalUnits.toLocaleString()} units ({deal.palletCount} pallets)</span>
                      <span>·</span>
                      <span className="font-mono text-slate-300">{deal.containerType.replace("_", " ").toUpperCase()}</span>
                      <span>·</span>
                      <span>{deal.incoterms}</span>
                    </div>

                    {/* Kosher & SI 1145 badges */}
                    <div className="flex items-center gap-2 pt-1 text-[11px]">
                      <span className="bg-emerald-950/60 text-emerald-300 border border-emerald-800/50 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <span>✡️</span> {deal.kosherStandard}
                      </span>
                      <span className="bg-blue-950/60 text-blue-300 border border-blue-800/50 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <span>🏷️</span> SI 1145 Lab & Label Verified
                      </span>
                    </div>
                  </div>

                  {/* Middle Column: Financial Milestones (30 / 70 Escrow) */}
                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 min-w-[240px] text-xs space-y-1.5">
                    <div className="flex justify-between items-center text-slate-400">
                      <span>Total CIF Value:</span>
                      <span className="font-bold text-white font-mono text-sm">
                        €{deal.grossContractValue.toLocaleString()}
                        <span className="text-[10px] text-slate-400 ml-1">(₪{ilsVal.toLocaleString()})</span>
                      </span>
                    </div>
                    <div className="h-px bg-slate-800 my-1" />
                    <div className="flex justify-between items-center text-slate-400">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                        30% Advance Deposit:
                      </span>
                      <span className="font-mono font-semibold text-amber-300">
                        €{deal.advanceDeposit30.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-400">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
                        70% Against B/L:
                      </span>
                      <span className="font-mono font-semibold text-cyan-300">
                        €{deal.balanceAgainstBl70.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-slate-500 pt-0.5">
                      <span>Broker Spread:</span>
                      <span className="font-mono text-orange-400">€{deal.agentPool.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Right Column: Action Buttons */}
                  <div className="flex flex-row lg:flex-col gap-2 shrink-0">
                    <Link
                      href={`/proforma/${deal.id}`}
                      target="_blank"
                      className="px-3.5 py-1.5 text-xs font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition text-center flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <span>📄</span>
                      <span>View & Print Pro-Forma</span>
                    </Link>

                    <button
                      onClick={() => handleCopyLink(deal.id)}
                      className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition flex items-center justify-center gap-1.5"
                    >
                      <span>🔗</span>
                      <span>{copiedId === deal.id ? "Copied Link!" : "Copy Sign Link"}</span>
                    </button>

                    <button
                      id="tour-tripartite-btn"
                      onClick={() => openNotifyModal(deal)}
                      className="px-3.5 py-1.5 text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 rounded-xl transition flex items-center justify-center gap-1.5 shadow-xs"
                      title="Preview and dispatch automated WhatsApp & Email tripartite alerts to Buyer, Factory, or Customs"
                    >
                      <span>🔔</span>
                      <span>Dispatch Alerts</span>
                    </button>

                    <button
                      id="tour-asn-btn"
                      onClick={() => handleDownloadErpCsv(deal)}
                      className="px-3 py-1.5 text-[11px] font-medium bg-slate-800/80 hover:bg-slate-700 text-cyan-300 rounded-xl border border-slate-700/80 transition flex items-center justify-center gap-1.5"
                      title="Download Priority ERP Inbound ASN manifest CSV"
                    >
                      <span>📥</span>
                      <span>Priority ERP ASN</span>
                    </button>

                    <button
                      onClick={() => {
                        setAdvanceModalDeal(deal);
                        setAdvanceStageTarget(
                          deal.currentStage === "order_po_issued"
                            ? "manufacturing"
                            : deal.currentStage === "manufacturing"
                            ? "shipping_customs_warehouse"
                            : deal.currentStage === "shipping_customs_warehouse"
                            ? "customs_warehouse"
                            : "completed"
                        );
                      }}
                      className="px-3 py-1.5 text-[11px] font-medium bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-slate-800 transition text-center"
                    >
                      ⚙️ Advance Stage
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE NEW PRO-FORMA MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-slate-900/95 backdrop-blur-md px-6 py-4 border-b border-slate-800 flex items-center justify-between z-10">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">📑</span>
                <div>
                  <h2 className="text-lg font-bold text-white">Issue Official B2B Pro-Forma Invoice</h2>
                  <p className="text-xs text-slate-400">Generate a binding commercial contract with 30/70 escrow payment terms</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-6 text-xs">
              {/* SECTION 1: BUYER DETAILS */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-orange-400 flex items-center gap-1.5">
                  <span>🛒</span> 1. Buyer & Consignee Details (Israel)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Buyer Company Name</label>
                    <input
                      type="text"
                      value={formBuyerCompany}
                      onChange={(e) => setFormBuyerCompany(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Buyer VAT / Tax ID (ח.פ.)</label>
                    <input
                      type="text"
                      value={formBuyerVat}
                      onChange={(e) => setFormBuyerVat(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-orange-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Contact Officer Name</label>
                    <input
                      type="text"
                      value={formBuyerContact}
                      onChange={(e) => setFormBuyerContact(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Official Email for PO</label>
                    <input
                      type="email"
                      value={formBuyerEmail}
                      onChange={(e) => setFormBuyerEmail(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">WhatsApp / Phone</label>
                    <input
                      type="text"
                      value={formBuyerPhone}
                      onChange={(e) => setFormBuyerPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-orange-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Port of Discharge</label>
                    <input
                      type="text"
                      value={formPortOfDestination}
                      onChange={(e) => setFormPortOfDestination(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-orange-500"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: SUPPLIER DETAILS */}
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-orange-400 flex items-center gap-1.5">
                  <span>🏭</span> 2. European Factory Details (Seller)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Supplier Factory Name</label>
                    <input
                      type="text"
                      value={formSupplierName}
                      onChange={(e) => setFormSupplierName(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Factory Location & Origin</label>
                    <input
                      type="text"
                      value={formSupplierCountry}
                      onChange={(e) => setFormSupplierCountry(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Port of Loading (Origin)</label>
                    <input
                      type="text"
                      value={formPortOfOrigin}
                      onChange={(e) => setFormPortOfOrigin(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Factory Bank IBAN</label>
                    <input
                      type="text"
                      value={formSupplierIban}
                      onChange={(e) => setFormSupplierIban(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-orange-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: PRODUCT SPECIFICATIONS & PACKAGING */}
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-orange-400 flex items-center gap-1.5">
                  <span>📦</span> 3. Product Specification & Container Logistics
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Product Description (EN)</label>
                    <input
                      type="text"
                      value={formProductName}
                      onChange={(e) => setFormProductName(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Product Description in Hebrew (MoH SI 1145)</label>
                    <input
                      type="text"
                      value={formProductHebrewName}
                      onChange={(e) => setFormProductHebrewName(e.target.value)}
                      required
                      dir="rtl"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-orange-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2">
                  <div>
                    <label className="block text-slate-400 mb-1">Container Type</label>
                    <select
                      value={formContainerType}
                      onChange={(e) => setFormContainerType(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-orange-500"
                    >
                      <option value="40ft_hc">40ft High Cube (68 CBM)</option>
                      <option value="20ft_dry">20ft Dry (28 CBM)</option>
                      <option value="40ft_reefer">40ft Reefer (+4°C / -18°C)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Total Pallets (EPAL)</label>
                    <input
                      type="number"
                      value={formPalletCount}
                      onChange={(e) => setFormPalletCount(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-orange-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Units per Carton</label>
                    <input
                      type="number"
                      value={formUnitsPerCarton}
                      onChange={(e) => setFormUnitsPerCarton(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-orange-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Cartons / Pallet</label>
                    <input
                      type="number"
                      value={formCartonsPerPallet}
                      onChange={(e) => setFormCartonsPerPallet(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-orange-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Total Consumer Units</label>
                    <input
                      type="number"
                      value={formTotalUnits}
                      onChange={(e) => setFormTotalUnits(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-orange-500 font-mono font-bold text-orange-400"
                    />
                  </div>
                </div>

                {/* Container Load Meter */}
                <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800/80 space-y-2">
                  <div className="flex justify-between items-center text-[11px] text-slate-400">
                    <span>
                      📐 Volume Load: <strong className="text-white">{modalCalculations.estCbm} CBM</strong> of {modalCalculations.maxCbm} CBM max
                    </span>
                    <span className="font-mono text-cyan-400 font-semibold">{modalCalculations.cbmPct}% Capacity</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${modalCalculations.cbmPct > 95 ? "bg-amber-500" : "bg-cyan-500"}`}
                      style={{ width: `${modalCalculations.cbmPct}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1">
                    <span>
                      ⚖️ Payload Weight: <strong className="text-white">{modalCalculations.estKg.toLocaleString()} kg</strong> of {modalCalculations.maxKg.toLocaleString()} kg max
                    </span>
                    <span className="font-mono text-emerald-400 font-semibold">{modalCalculations.kgPct}% Capacity</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-300"
                      style={{ width: `${modalCalculations.kgPct}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 4: COMMERCIAL PRICING & 30/70 ESCROW */}
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-orange-400 flex items-center gap-1.5">
                  <span>💰</span> 4. Commercial Pricing & 30/70 Escrow Milestones
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Factory Ex-Works Price (€)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formFactoryUnitPrice}
                      onChange={(e) => setFormFactoryUnitPrice(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-orange-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Agreed Buyer CIF Price (€)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formBuyerUnitPrice}
                      onChange={(e) => setFormBuyerUnitPrice(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-orange-500 font-mono font-bold text-emerald-400"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Incoterms</label>
                    <input
                      type="text"
                      value={formIncoterms}
                      onChange={(e) => setFormIncoterms(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Kosher Standard</label>
                    <input
                      type="text"
                      value={formKosherStandard}
                      onChange={(e) => setFormKosherStandard(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-orange-500"
                    />
                  </div>
                </div>

                {/* ESCROW BREAKDOWN SUMMARY BANNER */}
                <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-orange-500/30 rounded-2xl p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-[11px] text-slate-400">Total Contract Value (CIF)</p>
                    <p className="text-lg font-bold text-white font-mono">€{modalCalculations.grossVal.toLocaleString()}</p>
                    <p className="text-[10px] text-slate-500">≈ ₪{modalCalculations.ilsGross.toLocaleString()} (Excl. VAT)</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-amber-400 font-semibold">30% Advance Deposit</p>
                    <p className="text-lg font-bold text-amber-300 font-mono">€{modalCalculations.adv30.toLocaleString()}</p>
                    <p className="text-[10px] text-slate-400">Releases factory production</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-cyan-400 font-semibold">70% Against Clean B/L</p>
                    <p className="text-lg font-bold text-cyan-300 font-mono">€{modalCalculations.bal70.toLocaleString()}</p>
                    <p className="text-[10px] text-slate-400">Paid upon cargo vessel departure</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-orange-400 font-semibold">Brokerage Fee Margin</p>
                    <p className="text-lg font-bold text-orange-300 font-mono">€{modalCalculations.agentPool.toLocaleString()}</p>
                    <p className="text-[10px] text-slate-400">FoodXchange escrow retained</p>
                  </div>
                </div>
              </div>

              {/* MODAL ACTIONS */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold rounded-xl shadow-lg shadow-orange-500/20 transition disabled:opacity-50"
                >
                  {isSubmitting ? "Generating Pro-Forma..." : "Issue & Seal Commercial Pro-Forma ⚡"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADVANCE STAGE MODAL */}
      {advanceModalDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm">
                Advance Stage: {advanceModalDeal.poNumber}
              </h3>
              <button onClick={() => setAdvanceModalDeal(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Target Milestone</label>
                <select
                  value={advanceStageTarget}
                  onChange={(e) => setAdvanceStageTarget(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                >
                  <option value="manufacturing">Factory Production (30% Wire Confirmed)</option>
                  <option value="shipping_customs_warehouse">Vessel Loaded / En Route (B/L Issued)</option>
                  <option value="customs_warehouse">Ashdod/Haifa Port Customs (SI 1145 Clearance)</option>
                  <option value="completed">Delivered to Buyer DC (Deal Closed)</option>
                </select>
              </div>

              {advanceStageTarget === "shipping_customs_warehouse" && (
                <>
                  <div>
                    <label className="block text-slate-400 mb-1">Vessel Name</label>
                    <input
                      type="text"
                      value={advVesselName}
                      onChange={(e) => setAdvVesselName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Bill of Lading (B/L) #</label>
                    <input
                      type="text"
                      value={advBlNumber}
                      onChange={(e) => setAdvBlNumber(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                    />
                  </div>
                </>
              )}

              {advanceStageTarget === "customs_warehouse" && (
                <div>
                  <label className="block text-slate-400 mb-1">Customs Declaration # (רשימון מכס)</label>
                  <input
                    type="text"
                    value={advCustomsDec}
                    onChange={(e) => setAdvCustomsDec(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setAdvanceModalDeal(null)}
                className="px-3.5 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleAdvanceSubmit}
                disabled={isAdvancing}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl text-xs transition disabled:opacity-50"
              >
                {isAdvancing ? "Updating..." : "Confirm Stage Progression"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TRIPARTITE NOTIFICATION MODAL */}
      {notifyModalDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-6 space-y-5 shadow-2xl my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">🔔</span>
                  <h3 className="font-bold text-white text-base">
                    Tripartite Dispatch Hub: {notifyModalDeal.poNumber}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Live Escrow & Milestone Sync
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Automated multichannel dispatch to Israeli Retail Buyer, European Factory, and Port Customs Broker.
                </p>
              </div>
              <button
                onClick={() => setNotifyModalDeal(null)}
                className="text-slate-400 hover:text-white text-lg p-1"
              >
                ✕
              </button>
            </div>

            {/* Select Milestone Event */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                1. Select Lifecycle Milestone Event
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                {NOTIFY_EVENTS.map((evt) => {
                  const isSelected = notifyEventType === evt.id;
                  return (
                    <button
                      key={evt.id}
                      type="button"
                      onClick={() => handleSelectEventType(evt.id)}
                      className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 ${
                        isSelected
                          ? "bg-orange-500/10 border-orange-500 text-white shadow-xs"
                          : "bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/60"
                      }`}
                    >
                      <span className="text-base">{evt.icon}</span>
                      <div className="space-y-0.5">
                        <p className={`font-semibold ${isSelected ? "text-orange-400" : "text-white"}`}>
                          {evt.label}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {evt.recipient}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Delivery Channel Radio */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/70 p-3 rounded-2xl border border-slate-800">
              <span className="text-xs font-medium text-slate-300">
                2. Notification Delivery Channels:
              </span>
              <div className="flex items-center gap-2 text-xs">
                {(
                  [
                    { id: "both", label: "💬 WhatsApp + 📧 Email", desc: "Dual Delivery" },
                    { id: "whatsapp", label: "💬 WhatsApp Only", desc: "Direct Instant" },
                    { id: "email", label: "📧 Email Only", desc: "Formal PDF" },
                  ] as const
                ).map((ch) => {
                  const active = notifyChannel === ch.id;
                  return (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => setNotifyChannel(ch.id)}
                      className={`px-3 py-1.5 rounded-xl font-medium transition ${
                        active
                          ? "bg-emerald-500 text-white font-semibold shadow-xs"
                          : "bg-slate-900 text-slate-400 hover:text-white"
                      }`}
                    >
                      {ch.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live Message Preview Box */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  3. Live Multichannel Preview
                </span>
                {notifyPreview && (
                  <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800/40 px-2 py-0.5 rounded-md">
                    Target: {notifyPreview.recipientRole.toUpperCase()} · {notifyPreview.recipientContact}
                  </span>
                )}
              </div>

              {isLoadingPreview ? (
                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-400">
                  <span className="inline-block animate-spin mr-2">⚙️</span>
                  Generating dynamic WhatsApp & Email copy from deal parameters...
                </div>
              ) : notifyPreview ? (
                <div className="space-y-3">
                  {/* Email Subject Header */}
                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-2.5 text-xs flex items-center gap-2">
                    <span className="text-slate-400 font-semibold shrink-0">Subject:</span>
                    <span className="text-slate-200 font-medium truncate">{notifyPreview.subject}</span>
                  </div>

                  {/* WhatsApp Bubble Preview */}
                  <div className="bg-[#0b141a] border border-[#202c33] rounded-2xl p-4 shadow-inner">
                    <div className="flex items-center justify-between border-b border-[#202c33] pb-2 mb-3 text-[11px] text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="font-semibold text-emerald-400">WhatsApp Dispatch Preview</span>
                        <span className="text-slate-500">({notifyPreview.recipientName})</span>
                      </div>
                      <span className="text-slate-500 font-mono text-[10px]">End-to-End Encrypted</span>
                    </div>

                    <div
                      dir={notifyPreview.recipientRole === "buyer" || notifyPreview.recipientRole === "customs" ? "rtl" : "ltr"}
                      className="bg-[#1f2c34] text-[#e9edef] rounded-2xl p-3.5 text-xs font-sans leading-relaxed whitespace-pre-wrap max-w-xl mx-auto shadow-md"
                    >
                      {notifyPreview.whatsappText}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-6 text-center text-xs text-slate-500">
                  No preview generated yet.
                </div>
              )}
            </div>

            {/* Success Banner */}
            {notifySuccessMsg && (
              <div className="bg-emerald-950/70 border border-emerald-500/50 rounded-2xl p-3.5 text-xs text-emerald-300 flex items-center gap-2">
                <span className="text-lg">✅</span>
                <span className="font-medium">{notifySuccessMsg}</span>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
              <div className="flex items-center gap-2">
                {notifyDirectWhatsappUrl && (
                  <a
                    href={notifyDirectWhatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 text-xs font-semibold bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#25D366] border border-[#25D366]/40 rounded-xl transition flex items-center gap-1.5"
                  >
                    <span>💬</span>
                    <span>Open in WhatsApp Direct</span>
                  </a>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setNotifyModalDeal(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs transition"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleDispatchNotify}
                  disabled={isDispatchingNotify || isLoadingPreview}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold rounded-xl text-xs shadow-lg shadow-emerald-500/20 transition flex items-center gap-2 disabled:opacity-50"
                >
                  <span>🚀</span>
                  <span>{isDispatchingNotify ? "Dispatching..." : "Dispatch Automated Alert"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
