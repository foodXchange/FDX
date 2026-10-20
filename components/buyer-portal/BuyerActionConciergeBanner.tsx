"use client";

import Link from "next/link";

export interface BuyerConciergeAction {
  stageNumber: number;
  badgeLabel: string;
  badgeColor: string;
  title: string;
  description: string;
  buttonText: string;
  buttonIcon?: string;
  buttonActionType: "open_modal" | "switch_tab" | "link";
  targetTab?: string;
  targetLink?: string;
  onButtonClick?: () => void;
}

interface Props {
  action: BuyerConciergeAction;
  lang?: "he" | "en";
}

export default function BuyerActionConciergeBanner({ action, lang = "he" }: Props) {
  const isRtl = lang === "he";

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className="bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900 border-2 border-indigo-500/30 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden group transition-all"
    >
      {/* Ambient background glow */}
      <div className="absolute top-0 right-1/3 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5">
        {/* Left/Right Text Section */}
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              {isRtl ? "הפעולה הנדרשת הבאה שלך" : "Next Required Action"}
            </span>
            <span
              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${action.badgeColor}`}
            >
              {action.badgeLabel}
            </span>
          </div>

          <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-tight leading-snug">
            {action.title}
          </h3>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {action.description}
          </p>
        </div>

        {/* Action Button Section */}
        <div className="shrink-0">
          {action.buttonActionType === "link" && action.targetLink ? (
            <Link
              href={action.targetLink}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-xs sm:text-sm font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] w-full sm:w-auto"
            >
              <span>{action.buttonIcon || "🚀"}</span>
              <span>{action.buttonText}</span>
              <span className={isRtl ? "mr-1" : "ml-1"}>&larr;</span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={action.onButtonClick}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-xs sm:text-sm font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer w-full sm:w-auto"
            >
              <span>{action.buttonIcon || "⚡"}</span>
              <span>{action.buttonText}</span>
              <span className={isRtl ? "mr-1" : "ml-1"}>&larr;</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
