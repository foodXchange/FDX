"use client";

import React from "react";
import type { TrackedSampleKit } from "@/app/api/track/lookup/route";

interface TimelineProps {
  kit: TrackedSampleKit;
  lang?: "he" | "en";
}

interface StepDefinition {
  key: string;
  number: number;
  labelHe: string;
  labelEn: string;
  descHe: string;
  descEn: string;
  icon: string;
}

const STEPS: StepDefinition[] = [
  {
    key: "coordinating_factory",
    number: 1,
    labelHe: "ריכוז מול המפעל באירופה",
    labelEn: "Factory Coordination",
    descHe: "איסוף דוגמאות טריות מפס הייצור, בדיקת אצווה ותאריכי תפוגה",
    descEn: "Collection from production lines, batch testing & shelf-life check",
    icon: "🏭",
  },
  {
    key: "dispatched_air",
    number: 2,
    labelHe: "שילוח אווירי אקספרס",
    labelEn: "Air Express Dispatch",
    descHe: "החבילה הועברה לבלדר בינלאומי (DHL / FedEx) בטיסה ישירה לישראל",
    descEn: "Dispatched via international courier direct flight to Israel",
    icon: "✈️",
  },
  {
    key: "customs_tlv",
    number: 3,
    labelHe: "שחרור מכס נתב״ג",
    labelEn: "TLV Airport Customs",
    descHe: "אישורי יבוא, תחנת הסגר ובדיקת עמידה בתקני משרד הבריאות",
    descEn: "Import documentation, quarantine inspection & Ministry of Health check",
    icon: "🛃",
  },
  {
    key: "delivered",
    number: 4,
    labelHe: "נמסר לשולחן הטעימות",
    labelEn: "Delivered to Tasting Table",
    descHe: "החבילה נמסרה למטה הרשת / משרדי הקניין לבדיקה אורגנולפטית",
    descEn: "Delivered to buyer headquarters for organoleptic sensory evaluation",
    icon: "📦",
  },
  {
    key: "feedback_evaluated",
    number: 5,
    labelHe: "הערכת איכות וטעימות",
    labelEn: "Sensory Quality Evaluation",
    descHe: "מילוי משוב טעימה ומעבר להצעת מחיר מסחרית למכולה",
    descEn: "Sensory scorecard completion & transition to commercial quotation",
    icon: "⭐️",
  },
];

function getStageIndex(status: TrackedSampleKit["sample_status"]): number {
  switch (status) {
    case "new":
    case "coordinating_factory":
      return 0;
    case "dispatched_air":
      return 1;
    case "customs_tlv":
      return 2;
    case "delivered":
      return 3;
    case "feedback_approved":
    case "feedback_rejected":
      return 4;
    default:
      return 0;
  }
}

export default function SampleTrackingTimeline({ kit, lang = "he" }: TimelineProps) {
  const isHe = lang === "he";
  const currentStageIdx = getStageIndex(kit.sample_status);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-8">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs uppercase tracking-wider font-semibold text-emerald-400">
              {isHe ? "מעקב משלוח חי באקספרס" : "Live Express Air Tracking"}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
            {kit.tracking_code}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {isHe
              ? `עבור ${kit.company} • ${kit.buyer_name}`
              : `For ${kit.company} • ${kit.buyer_name}`}
          </p>
        </div>

        {/* Courier Badge */}
        {kit.tracking_awb && (
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 font-black text-xl flex items-center justify-center">
              ✈️
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-medium">
                {kit.courier_name || "DHL Express Airway Bill"}
              </span>
              <span className="text-base font-mono font-bold text-white tracking-wider">
                {kit.tracking_awb}
              </span>
            </div>
            <a
              href={`https://www.dhl.com/en/express/tracking.html?AWB=${encodeURIComponent(
                kit.tracking_awb
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-3 py-2 rounded-xl transition inline-flex items-center gap-1 shadow-md shadow-amber-950/20"
            >
              <span>{isHe ? "מעקב DHL" : "Track DHL"}</span>
              <span>↗</span>
            </a>
          </div>
        )}
      </div>

      {/* 5-Step Stepper */}
      <div className="relative">
        {/* Horizontal Connector Line for Desktop */}
        <div className="hidden md:block absolute top-6 left-8 right-8 h-1 bg-slate-800 -z-0">
          <div
            className="h-full bg-gradient-to-r from-orange-500 via-amber-500 to-emerald-500 transition-all duration-700 ease-out"
            style={{
              width: `${(currentStageIdx / (STEPS.length - 1)) * 100}%`,
            }}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 sm:gap-4 relative z-10">
          {STEPS.map((step, idx) => {
            const isCompleted = idx < currentStageIdx;
            const isCurrent = idx === currentStageIdx;
            const isFuture = idx > currentStageIdx;

            return (
              <div
                key={step.key}
                className={`flex md:flex-col items-start md:items-center text-right md:text-center gap-4 md:gap-3 transition ${
                  isCurrent
                    ? "opacity-100"
                    : isCompleted
                    ? "opacity-90"
                    : "opacity-45"
                }`}
              >
                {/* Step Circle */}
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold transition-all shadow-lg shrink-0 ${
                    isCurrent
                      ? "bg-gradient-to-br from-orange-500 to-amber-500 text-white ring-4 ring-orange-500/30 scale-110 shadow-orange-500/30 animate-pulse"
                      : isCompleted
                      ? "bg-emerald-500 text-slate-950 font-black shadow-emerald-500/20"
                      : "bg-slate-800 text-slate-400 border border-slate-700"
                  }`}
                >
                  {isCompleted ? "✓" : step.icon}
                </div>

                {/* Step Text */}
                <div className="space-y-1">
                  <div className="flex items-center md:justify-center gap-1.5">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                      {isHe ? `שלב ${step.number}` : `Stage ${step.number}`}
                    </span>
                    {isCurrent && (
                      <span className="text-[10px] font-bold text-orange-400 bg-orange-400/10 px-1.5 py-0.5 rounded-full">
                        {isHe ? "פעיל עכשיו" : "Active"}
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-white">
                    {isHe ? step.labelHe : step.labelEn}
                  </h4>
                  <p className="text-xs text-slate-400 leading-snug line-clamp-2">
                    {isHe ? step.descHe : step.descEn}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Meta Footer (Address, Delivery ETA, Target Tasting) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-800/80 text-xs text-slate-300">
        <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-slate-500 block font-medium">
            {isHe ? "כתובת למשלוח:" : "Delivery Address:"}
          </span>
          <span className="font-semibold text-white block">
            {kit.delivery_address || (isHe ? "מטה רכש קמעונאי" : "Buyer Headquarters")}
          </span>
        </div>

        <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-slate-500 block font-medium">
            {isHe ? "תאריך יעד לשולחן הטעימות:" : "Target Tasting Session:"}
          </span>
          <span className="font-semibold text-amber-400 block">
            {kit.target_tasting_date || (isHe ? "הקדם האפשרי" : "ASAP")}
          </span>
        </div>

        <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-slate-500 block font-medium">
            {isHe ? "מועד פתיחת בקשה:" : "Requested On:"}
          </span>
          <span className="font-mono text-white block">
            {new Date(kit.created_at).toLocaleDateString(isHe ? "he-IL" : "en-US", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>
    </div>
  );
}
