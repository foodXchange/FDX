"use client";

import TradeTooltip from "@/components/ui/TradeTooltip";

export interface JourneyStageItem {
  stageNumber: number;
  id: string;
  titleHebrew: string;
  titleEnglish: string;
  status: "completed" | "current" | "upcoming";
  tooltipExplanation: string;
  tooltipCategory: "finance" | "quality" | "shipping" | "customs";
  metaInfo?: string;
  icon: string;
}

interface Props {
  currentStageNumber: number;
  poNumber: string;
  containerNumber?: string;
  customsDeclaration?: string;
  grnNumber?: string;
  lang?: "he" | "en";
}

export default function BuyerJourneyProgressRibbon({
  currentStageNumber,
  poNumber,
  containerNumber,
  customsDeclaration,
  grnNumber,
  lang = "he",
}: Props) {
  const isRtl = lang === "he";

  const stages: JourneyStageItem[] = [
    {
      stageNumber: 1,
      id: "po_escrow",
      titleHebrew: "הסכם רכש ופיקדון (PO)",
      titleEnglish: "PO & 30% Escrow Wire",
      status: currentStageNumber > 1 ? "completed" : currentStageNumber === 1 ? "current" : "upcoming",
      tooltipExplanation: "חתימה על הסכם רכש מסחרי (PO) והעברת מקדמת 30% לחשבון נאמנות מוגן להפעלת הייצור במפעל.",
      tooltipCategory: "finance",
      metaInfo: `PO #${poNumber.slice(-8)}`,
      icon: "📝",
    },
    {
      stageNumber: 2,
      id: "production_qc",
      titleHebrew: "ייצור ובקרת איכות במפעל",
      titleEnglish: "Factory Production & QC",
      status: currentStageNumber > 2 ? "completed" : currentStageNumber === 2 ? "current" : "upcoming",
      tooltipExplanation: "ייצור במפעל באירופה, בדיקות מעבדה, הדפסת תוויות בעברית (תקן שירות המזון) ובדיקת איכות טרום-שילוח (PSI).",
      tooltipCategory: "quality",
      metaInfo: "24 משטחי יורו תקניים",
      icon: "🏭",
    },
    {
      stageNumber: 3,
      id: "ocean_transit",
      titleHebrew: "הפלגה בים התיכון (AIS)",
      titleEnglish: "Mediterranean Ocean Transit",
      status: currentStageNumber > 3 ? "completed" : currentStageNumber === 3 ? "current" : "upcoming",
      tooltipExplanation: "שילוח ימי מנמל ולנסיה/גנואה עד נמל אשדוד רציף 21. כולל ניטור טלמטריה בזמן אמת של חותם הבריח ובקרת קור.",
      tooltipCategory: "shipping",
      metaInfo: containerNumber || "MSC Mediterranean",
      icon: "🚢",
    },
    {
      stageNumber: 4,
      id: "customs_green_lane",
      titleHebrew: "שחרור מכס אשדוד",
      titleEnglish: "Ashdod Port Green Lane",
      status: currentStageNumber > 4 ? "completed" : currentStageNumber === 4 ? "current" : "upcoming",
      tooltipExplanation: "שחרור מהיר בשער עולמי ע״י עמיל המכס עם פטור 0% מכס (תעודת EUR.1) ואישור שירות המזון והרבנות הראשית.",
      tooltipCategory: "customs",
      metaInfo: customsDeclaration || "שער עולמי - מסלול ירוק",
      icon: "⚓",
    },
    {
      stageNumber: 5,
      id: "warehouse_grn",
      titleHebrew: "קליטה ופריקה במרלוג (GRN)",
      titleEnglish: "Warehouse Dock (GRN)",
      status: currentStageNumber >= 5 ? (grnNumber ? "completed" : "current") : "upcoming",
      tooltipExplanation: "הגעה למחסן היבואן, פריקה ברציף, חתימה על תעודת קבלה רשמית (GRN) וקליטת המשטחים במערכת ה-ERP של הרשת.",
      tooltipCategory: "quality",
      metaInfo: grnNumber ? `GRN #${grnNumber}` : "קליטה במלאי המרלוג",
      icon: "📦",
    },
  ];

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4"
    >
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 uppercase tracking-wider">
              {isRtl ? "מפת מסע היבוא" : "Import Voyage Map"}
            </span>
            <span className="text-xs text-slate-400 font-mono">5-Stage Trade Protocol</span>
          </div>
          <h3 className="text-base font-extrabold text-white mt-0.5">
            {isRtl ? "שלבי שרשרת האספקה הלוגיסטית והרגולטורית" : "Supply Chain & Regulatory Milestone Stepper"}
          </h3>
        </div>

        {/* Progress Percent Pill */}
        <div className="flex items-center gap-3">
          <div className="text-left sm:text-right">
            <span className="text-[11px] text-slate-400 block">
              {isRtl ? "התקדמות מצטברת:" : "Overall Progress:"}
            </span>
            <span className="text-base font-black text-emerald-400 font-mono">
              {Math.min(100, Math.round((currentStageNumber / 5) * 100))}%
            </span>
          </div>
          <div className="w-16 h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500"
              style={{ width: `${Math.min(100, Math.round((currentStageNumber / 5) * 100))}%` }}
            />
          </div>
        </div>
      </div>

      {/* Stepper Ribbon Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
        {stages.map((stage) => {
          const isDone = stage.status === "completed";
          const isCurrent = stage.status === "current";

          return (
            <div
              key={stage.id}
              className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between space-y-2 relative overflow-hidden ${
                isCurrent
                  ? "bg-gradient-to-b from-blue-950/60 to-slate-900 border-blue-500 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500/30"
                  : isDone
                  ? "bg-slate-950/70 border-emerald-500/30"
                  : "bg-slate-950/30 border-slate-800/80 opacity-70"
              }`}
            >
              {/* Top Step Badge & Icon */}
              <div className="flex items-center justify-between">
                <span className="text-lg">{stage.icon}</span>
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-mono ${
                    isDone
                      ? "bg-emerald-500 text-slate-950"
                      : isCurrent
                      ? "bg-blue-500 text-white animate-pulse"
                      : "bg-slate-800 text-slate-500"
                  }`}
                >
                  {isDone ? "✓" : stage.stageNumber}
                </span>
              </div>

              {/* Title with Tooltip */}
              <div>
                <TradeTooltip
                  term={isRtl ? stage.titleHebrew : stage.titleEnglish}
                  explanation={stage.tooltipExplanation}
                  category={stage.tooltipCategory}
                  dir={isRtl ? "rtl" : "ltr"}
                  className="font-bold text-xs text-white leading-tight block"
                />
                {stage.metaInfo && (
                  <span className="text-[10px] text-slate-400 font-mono block mt-1 truncate">
                    {stage.metaInfo}
                  </span>
                )}
              </div>

              {/* Status Footer Tag */}
              <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px]">
                <span
                  className={`font-semibold ${
                    isDone
                      ? "text-emerald-400"
                      : isCurrent
                      ? "text-blue-400 animate-pulse font-bold"
                      : "text-slate-500"
                  }`}
                >
                  {isDone
                    ? isRtl ? "הושלם ✓" : "Completed"
                    : isCurrent
                    ? isRtl ? "בביצוע עכשיו ⏳" : "In Progress"
                    : isRtl ? "שלב עתידי" : "Upcoming"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
