"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cloneOrderAsRepeatRun } from "@/app/track/actions";
import ErpAsnExportModal from "@/components/documents/ErpAsnExportModal";
import type { ErpAsnPayload } from "@/lib/documents/erpAsnGenerator";
import TradeTooltip from "@/components/ui/TradeTooltip";

// Self-contained SVG Icons for zero-dependency reliability
function ShipIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 .6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
      <path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.76" />
      <path d="M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6" />
      <path d="M12 10v4" />
      <path d="M12 2v3" />
    </svg>
  );
}

function PackageIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m16.5 9.4-9-5.19M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.29 7 12 12.01 20.71 7" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}

function BoxesIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z" />
      <path d="m12 13 3-1.8a2 2 0 0 1 2.06 0l3 1.8a2 2 0 0 1 .97 1.71v3.24a2 2 0 0 1-.97 1.71l-3 1.8a2 2 0 0 1-2.06 0l-3-1.8a2 2 0 0 1-.97-1.71v-3.24a2 2 0 0 1 .97-1.71Z" />
      <path d="m7 7.5 3-1.8a2 2 0 0 1 2.06 0l3 1.8a2 2 0 0 1 .97 1.71v3.24a2 2 0 0 1-.97 1.71l-3 1.8a2 2 0 0 1-2.06 0l-3-1.8A2 2 0 0 1 6 12.45V9.21a2 2 0 0 1 .97-1.71Z" />
    </svg>
  );
}

function CheckCircleIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function RefreshIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  );
}

function SearchIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function FileTextIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  );
}

function AnchorIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="3" />
      <line x1="12" y1="22" x2="12" y2="8" />
      <path d="M5 12H2a10 10 0 0 0 20 0h-3" />
    </svg>
  );
}

function TruckIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13" />
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  );
}

function BuildingIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01" />
    </svg>
  );
}

function ShieldCheckIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function SparklesIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
    </svg>
  );
}

function CloseIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export interface BuyerPortfolioItem {
  id: string;
  poNumber: string;
  productName: string;
  hebrewName: string;
  buyerCompany: string;
  supplierFactory: string;
  originCountry: string;
  originFlag: string;
  volume: string;
  palletCount: number;
  unitCount: number;
  category: string;
  kosherCert: string;
  stage: "po_drafting" | "production" | "maritime_transit" | "customs_clearance" | "completed";
  stageLabelHebrew: string;
  progressPercent: number;
  containerNumber?: string;
  billOfLading?: string;
  vesselName?: string;
  etaAshdod?: string;
  temperature?: string;
  customsDeclaration?: string;
  grnNumber?: string;
  totalEur: number;
  createdAt: string;
  canReorder: boolean;
}

interface Props {
  initialItems: BuyerPortfolioItem[];
  availableCompanies: string[];
  selectedCompanyFilter?: string;
}

export default function BuyerPortfolioCockpit({
  initialItems,
  availableCompanies,
  selectedCompanyFilter = "all",
}: Props) {
  const router = useRouter();
  const [selectedCompany, setSelectedCompany] = useState<string>(selectedCompanyFilter);
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");

  // Reorder modal state
  const [reorderItem, setReorderItem] = useState<BuyerPortfolioItem | null>(null);
  const [customVolume, setCustomVolume] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [officerName, setOfficerName] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [reorderSuccessMsg, setReorderSuccessMsg] = useState<{ msg: string; newId: string } | null>(null);
  const [reorderError, setReorderError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // ERP ASN Export state
  const [activeAsnData, setActiveAsnData] = useState<ErpAsnPayload | null>(null);

  const openAsnModal = (item: BuyerPortfolioItem) => {
    setActiveAsnData({
      poNumber: item.poNumber,
      poDate: item.createdAt?.split("T")[0] || new Date().toISOString().split("T")[0],
      buyerCompany: item.buyerCompany,
      supplierFactory: item.supplierFactory,
      originCountry: item.originCountry,
      productName: item.productName,
      hebrewName: item.hebrewName,
      containerNumber: item.containerNumber || "MEDU-7829104",
      billOfLading: item.billOfLading || "MEDUGVA260401",
      customsDeclarationNumber: item.customsDeclaration,
      palletCount: item.palletCount || 24,
      totalUnits: item.unitCount || 24000,
      unitsPerPallet: Math.round((item.unitCount || 24000) / (item.palletCount || 24)),
      netWeightKgPerUnit: 0.4,
      grossWeightKgPerUnit: 0.44,
      storageTemp: item.temperature || "+18.2°C Dry Ambient",
      batchNumber: `LOT-${item.originCountry.slice(0, 2).toUpperCase()}-2604`,
      expiryDate: "31/12/2027",
    });
  };

  // Filter items
  const filteredItems = initialItems.filter((item) => {
    // Company match
    if (selectedCompany !== "all") {
      const normSelected = selectedCompany.toLowerCase();
      const normItem = item.buyerCompany.toLowerCase();
      if (!normItem.includes(normSelected) && !normSelected.includes(normItem)) {
        return false;
      }
    }

    // Stage match
    if (stageFilter !== "all" && item.stage !== stageFilter) {
      return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchText = `${item.productName} ${item.hebrewName} ${item.poNumber} ${item.containerNumber || ""} ${item.billOfLading || ""} ${item.buyerCompany} ${item.supplierFactory} ${item.category}`.toLowerCase();
      if (!matchText.includes(q)) return false;
    }

    return true;
  });

  // Calculate Aggregates
  const totalContainers = filteredItems.length;
  const inTransitCount = filteredItems.filter((i) => i.stage === "maritime_transit").length;
  const inProductionCount = filteredItems.filter((i) => i.stage === "production").length;
  const completedCount = filteredItems.filter((i) => i.stage === "completed").length;
  const totalTonnage = (filteredItems.reduce((acc, curr) => acc + (curr.unitCount * 0.4 || 10000), 0) / 1000).toFixed(1);
  const totalValueEur = filteredItems.reduce((acc, curr) => acc + (curr.totalEur || 44400), 0);

  const openReorderModal = (item: BuyerPortfolioItem) => {
    setReorderItem(item);
    setCustomVolume(item.volume);
    const in45Days = new Date();
    in45Days.setDate(in45Days.getDate() + 45);
    setTargetDate(in45Days.toISOString().split("T")[0]);
    setOfficerName("מנהל רכש קמעונאי");
    setSpecialInstructions("הזמנת שרשרת אספקה חוזרת - מפרט אריזה, תוויות וכשרות זהים להזמנת מקור.");
    setReorderSuccessMsg(null);
    setReorderError(null);
  };

  const handleExecuteReorder = () => {
    if (!reorderItem) return;
    setReorderError(null);

    startTransition(async () => {
      const res = await cloneOrderAsRepeatRun({
        sourceRequestId: reorderItem.id,
        orderVolume: customVolume,
        targetWarehouseDate: targetDate,
        specialInstructions,
        buyerOfficerName: officerName,
      });

      if (res.ok && res.newRequestId) {
        setReorderSuccessMsg({
          msg: res.message || "הזמנה חוזרת נוצרה בהצלחה!",
          newId: res.newRequestId,
        });
      } else {
        setReorderError(res.error || "שגיאה ביצירת ההזמנה החוזרת");
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased" dir="rtl">
      {/* Top Ambient Glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-20 left-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header Breadcrumb & Enterprise Tag */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <BuildingIcon className="w-3.5 h-3.5" />
                FoodXchange Retail Procurement Hub
              </span>
              <span className="text-xs text-slate-500">·</span>
              <span className="text-xs text-slate-400 font-medium">B2B Import Portfolio</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              פורטל ניהול מכולות יבוא ורכש קמעונאי
            </h1>
            <p className="text-sm text-slate-400 max-w-2xl">
              מרכז שליטה אינטגרטיבי למנהלי רכש ברשתות שיווק: מעקב ימי חי, מסמכי רגולציה וכשרות, ושכפול הזמנות חוזרות (Repeat Run) בקליק אחד.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-3">
            <Link
              href="/sourcing"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/20 transition-all"
            >
              <SparklesIcon className="w-4 h-4" />
              איתור יצרן לקטגוריה חדשה
            </Link>
          </div>
        </div>

        {/* Executive KPI Stats Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm relative overflow-hidden group hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">מכולות פעילות בניהול</span>
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <BoxesIcon className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">{totalContainers}</span>
              <TradeTooltip
                term="TEU 40ft HC"
                explanation="מכולת ענק של 40 רגל בגובה מוגדל (High Cube), המכילה 24 משטחי יורו (EPAL) ועד 24,000 יחידות מוצר."
                category="shipping"
                dir="rtl"
                className="text-xs font-medium text-slate-400"
              />
            </div>
            <div className="mt-2 text-xs text-slate-500 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {inTransitCount} בהפלגה בים · {inProductionCount} בייצור
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm relative overflow-hidden group hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">נפח סחורה מצטבר</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <PackageIcon className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">{totalTonnage}</span>
              <TradeTooltip
                term="טון מטרי (MT)"
                explanation="משקל מטען כולל במדד טון מטרי (1,000 ק״ג). משטחי יורו תקניים EPAL המתאימים לפריקה ברציפי המרלוג."
                category="shipping"
                dir="rtl"
                className="text-xs font-medium text-emerald-400"
              />
            </div>
            <div className="mt-2 text-xs text-slate-500">משטחי יורו תקניים (EPAL) ישירות למרלוג</div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm relative overflow-hidden group hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">שווי חוזים בביצוע</span>
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <ShieldCheckIcon className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">€{totalValueEur.toLocaleString()}</span>
              <TradeTooltip
                term="CIF Ashdod"
                explanation="תנאי מכר בינלאומיים (Cost, Insurance & Freight) הכוללים את עלות הסחורה, ביטוח ימי והובלה עד נמל אשדוד."
                category="shipping"
                dir="rtl"
                className="text-xs font-medium text-amber-400"
              />
            </div>
            <div className="mt-2 text-xs text-slate-500">100% הגנת שער והסכמי ביניים בנאמנות</div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm relative overflow-hidden group hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">מסירות מרלוג חתומות</span>
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                <CheckCircleIcon className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">{completedCount}</span>
              <TradeTooltip
                term="תעודות GRN חתומות"
                explanation="Goods Receipt Note - תעודת קבלת טובין רשמית חתומה ע״י מנהל המרלוג המאשרת קליטת מלאי במערכת ה-ERP."
                category="quality"
                dir="rtl"
                className="text-xs font-medium text-purple-400"
              />
            </div>
            <div className="mt-2 text-xs text-slate-500">זמינות להזמנה חוזרת מיידית (1-Click)</div>
          </div>
        </div>

        {/* Corporate Chain Selector & Search Toolbar */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Supermarket Brand Selector Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
              <span className="text-xs font-semibold text-slate-400 whitespace-nowrap ml-2">בחר רשת:</span>
              <button
                onClick={() => setSelectedCompany("all")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  selectedCompany === "all"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                    : "bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                כל הרשתות ({initialItems.length})
              </button>

              {availableCompanies.map((comp) => {
                const count = initialItems.filter((i) =>
                  i.buyerCompany.toLowerCase().includes(comp.toLowerCase())
                ).length;
                return (
                  <button
                    key={comp}
                    onClick={() => setSelectedCompany(comp)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                      selectedCompany === comp
                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                        : "bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                    }`}
                  >
                    <span>{comp}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-900/60 opacity-80">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Quick Stage Filter */}
            <div className="flex items-center gap-2">
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                className="bg-slate-800/80 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">כל השלבים הלוגיסטיים</option>
                <option value="maritime_transit">בהפלגה בים (AIS Mediterranean)</option>
                <option value="production">בייצור במפעל באירופה</option>
                <option value="customs_clearance">בשחרור מכס אשדוד</option>
                <option value="completed">נפרק במרלוג (GRN חתום)</option>
              </select>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative">
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <SearchIcon className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="חיפוש לפי שם מוצר, מספר PO, מספר מכולה (MEDU...), שטר מטען (B/L) או שם מפעל..."
              className="w-full bg-slate-950/70 border border-slate-800/90 rounded-xl pr-10 pl-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Mediterranean Inbound Schedule Banner */}
        <div className="bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-slate-900/60 border border-blue-900/40 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/30">
                <AnchorIcon className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  לוח פריקות נמל אשדוד / חיפה (AIS Live Telemetry)
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    רציף 21 מאושר
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  סנכרון ישיר מול חברות הספנות (MSC / ZIM / Maersk) והמערכת הלאומית שער עולמי למכס.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2 flex items-center gap-2">
                <ShipIcon className="w-4 h-4 text-blue-400" />
                <span className="text-slate-400">אונייה קרובה:</span>
                <span className="font-semibold text-slate-200">MSC PALOMA · בעוד 3 ימים</span>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2 flex items-center gap-2">
                <TruckIcon className="w-4 h-4 text-emerald-400" />
                <span className="text-slate-400">הובלה יבשתית:</span>
                <span className="font-semibold text-emerald-400">ישירות למרלוג</span>
              </div>
            </div>
          </div>
        </div>

        {/* Portfolio Order Cards Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 px-1">
            <span>רשימת מכולות פעילות והזמנות בביצוע ({filteredItems.length})</span>
            <span>מוצג לפי תאריך עדכון אחרון</span>
          </div>

          {filteredItems.length === 0 ? (
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-12 text-center space-y-3">
              <div className="w-12 h-12 text-slate-600 mx-auto">
                <PackageIcon className="w-12 h-12" />
              </div>
              <h4 className="text-base font-bold text-slate-300">לא נמצאו מכולות תואמות לסינון</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                נסה לשנות את מילות החיפוש או לבחור רשת קמעונאית אחרת מהתפריט העליון.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredItems.map((item) => {
                const isCompleted = item.stage === "completed";
                const isMaritime = item.stage === "maritime_transit";

                return (
                  <div
                    key={item.id}
                    className="bg-slate-900/60 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 sm:p-6 transition-all duration-200 space-y-5 group"
                  >
                    {/* Top Row: PO, Brand, Product & Origin Flag */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            {item.poNumber}
                          </span>
                          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700/60 flex items-center gap-1.5">
                            <BuildingIcon className="w-3.5 h-3.5 text-slate-400" />
                            {item.buyerCompany}
                          </span>
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-800/60 text-slate-400">
                            {item.category}
                          </span>
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            {item.kosherCert}
                          </span>
                        </div>

                        <div className="flex items-baseline gap-2">
                          <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">
                            {item.hebrewName}
                          </h3>
                          <span className="text-xs text-slate-400">({item.productName})</span>
                          <span className="text-lg" title={item.originCountry}>
                            {item.originFlag}
                          </span>
                        </div>

                        <div className="text-xs text-slate-400 flex items-center gap-2">
                          <span>יצרן מאושר:</span>
                          <span className="font-semibold text-slate-200">{item.supplierFactory}</span>
                          <span>·</span>
                          <span>נפח:</span>
                          <span className="font-semibold text-slate-200">{item.volume}</span>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className="shrink-0 text-left sm:text-right">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                            isCompleted
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : isMaritime
                              ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isCompleted
                                ? "bg-emerald-400"
                                : isMaritime
                                ? "bg-blue-400 animate-pulse"
                                : "bg-amber-400"
                            }`}
                          />
                          {item.stageLabelHebrew}
                        </span>
                        <div className="text-[11px] text-slate-500 mt-1">
                          שווי חוזה: €{item.totalEur.toLocaleString()} CIF
                        </div>
                      </div>
                    </div>

                    {/* Stage Visual Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className="font-medium">התקדמות לוגיסטית ורגולטורית</span>
                        <span className="font-mono text-slate-300 font-semibold">{item.progressPercent}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isCompleted
                              ? "bg-emerald-500"
                              : isMaritime
                              ? "bg-gradient-to-r from-blue-600 to-cyan-500"
                              : "bg-blue-500"
                          }`}
                          style={{ width: `${item.progressPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Logistics Snapshot Ribbon */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-950/50 border border-slate-800/80 rounded-xl p-3">
                      <div>
                        <span className="text-slate-500 block">מספר מכולה:</span>
                        <span className="font-mono font-semibold text-slate-200">
                          {item.containerNumber || "בהקצאת מפעל"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">שטר מטען (B/L):</span>
                        <span className="font-mono font-semibold text-slate-200">
                          {item.billOfLading || "Clean B/L בהמתנה"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">אונייה ורציף:</span>
                        <span className="font-medium text-slate-200">
                          {item.vesselName || "MSC Mediterranean"} · {item.etaAshdod || "רציף 21"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">בקרת שרשרת קור:</span>
                        <span className="font-semibold text-emerald-400">
                          {item.temperature || "+18.2°C (תקין)"}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Action Toolbar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/60">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Full Tracking Portal */}
                        <Link
                          href={`/track/${item.id}`}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 transition-all"
                        >
                          <ShipIcon className="w-3.5 h-3.5" />
                          מעקב מכולה מלא (5 שלבים)
                          <span className="text-blue-400 mr-0.5">&larr;</span>
                        </Link>

                        {/* Customs Portal */}
                        <Link
                          href={`/customs/${item.id}`}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700/80 text-slate-300 border border-slate-700/50 transition-all"
                        >
                          <FileTextIcon className="w-3.5 h-3.5 text-blue-400" />
                          תיק 6 מסמכי מכס
                        </Link>

                        {/* GRN Certificate if completed */}
                        {item.grnNumber && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircleIcon className="w-3.5 h-3.5" />
                            GRN #{item.grnNumber}
                          </span>
                        )}

                        {/* Inbound ERP ASN Generator */}
                        <button
                          type="button"
                          onClick={() => openAsnModal(item)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 transition-all cursor-pointer"
                        >
                          <PackageIcon className="w-3.5 h-3.5 text-indigo-400" />
                          מנשר מרלוג (Priority / SAP ASN)
                        </button>
                      </div>

                      {/* 1-Click Repeat Order Button */}
                      <div>
                        <button
                          onClick={() => openReorderModal(item)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                        >
                          <RefreshIcon className="w-3.5 h-3.5" />
                          הזמנה חוזרת בקליק אחד (Re-order Run)
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 1-Click Reorder Run Modal */}
      {reorderItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-6 shadow-2xl relative text-slate-100 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                  <RefreshIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">שכפול הזמנה חוזרת (Repeat Run)</h3>
                  <p className="text-xs text-slate-400">
                    מבוסס על הזמנה #{reorderItem.poNumber} · ספק מאושר
                  </p>
                </div>
              </div>
              <button
                onClick={() => setReorderItem(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Success State */}
            {reorderSuccessMsg ? (
              <div className="space-y-4 py-4 text-center">
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
                  <CheckCircleIcon className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-white">ההזמנה החוזרת נוצרה בהצלחה!</h4>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    דסק הסחר של FoodXchange קיבל את ההתראה ונערך להנפקת שטר ה-PO ושרשור המפעל.
                  </p>
                </div>
                <div className="pt-2 flex flex-col gap-2">
                  <Link
                    href={`/track/${reorderSuccessMsg.newId}`}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all"
                  >
                    מעבר לפורטל ההזמנה החדשה &larr;
                  </Link>
                  <button
                    onClick={() => {
                      setReorderItem(null);
                      router.refresh();
                    }}
                    className="w-full px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    סגור חלון
                  </button>
                </div>
              </div>
            ) : (
              /* Reorder Form */
              <div className="space-y-4">
                {/* Product Summary Card */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">מוצר ומפעל:</span>
                    <span className="font-semibold text-slate-200">{reorderItem.supplierFactory}</span>
                  </div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <span>{reorderItem.hebrewName}</span>
                    <span className="text-xs text-slate-400">({reorderItem.productName})</span>
                  </div>
                  <div className="text-xs text-emerald-400 flex items-center gap-1.5 pt-1 border-t border-slate-800/80">
                    <ShieldCheckIcon className="w-3.5 h-3.5" />
                    אישור כשרות, בדיקות מעבדה ותוויות עברית שמורים במערכת
                  </div>
                </div>

                {/* Input: Order Volume */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    היקף מכולה / כמות מבוקשת:
                  </label>
                  <input
                    type="text"
                    value={customVolume}
                    onChange={(e) => setCustomVolume(e.target.value)}
                    placeholder="1 x 40ft HC (24,000 יחידות / 24 משטחים)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Input: Target Merlog Delivery Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    יעד הגעה מבוקש למרלוג (ETA Warehouse):
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={targetDate}
                      onChange={(e) => setTargetDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Input: Officer Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    שם מנהל הרכש המאשר:
                  </label>
                  <input
                    type="text"
                    value={officerName}
                    onChange={(e) => setOfficerName(e.target.value)}
                    placeholder="מנהל קטגוריה ורכש"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Input: Special Instructions */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    הנחיות מיוחדות ללוגיסטיקה או שרשרת קור (אופציונלי):
                  </label>
                  <textarea
                    rows={2}
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    placeholder="למשל: דרישה למשטחי עץ מחוטאים ISPM 15, תוקף מינימום 24 חודשים..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>

                {/* Error Banner */}
                {reorderError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-center gap-2">
                    <CloseIcon className="w-4 h-4 shrink-0" />
                    <span>{reorderError}</span>
                  </div>
                )}

                {/* Modal Action Buttons */}
                <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setReorderItem(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    ביטול
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={handleExecuteReorder}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {isPending ? (
                      <>
                        <span className="animate-spin inline-block">
                          <RefreshIcon className="w-3.5 h-3.5" />
                        </span>
                        יוצר הזמנה חוזרת...
                      </>
                    ) : (
                      <>
                        <RefreshIcon className="w-3.5 h-3.5" />
                        אשר ושלח הזמנה חוזרת
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* ERP Inbound ASN Export Modal */}
      {activeAsnData && (
        <ErpAsnExportModal
          isOpen={Boolean(activeAsnData)}
          onClose={() => setActiveAsnData(null)}
          data={activeAsnData}
        />
      )}
    </div>
  );
}
