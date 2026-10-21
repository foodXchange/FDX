"use client";

import { useState } from "react";

export interface DealStepperProps {
  dealId: string;
  status?: string | null;
  matchScore?: number;
  matchBreakdown?: Record<string, any> | null;
  onStepClick?: (stepNumber: number, stepKey: string) => void;
  compact?: boolean;
}

interface StepDef {
  key: string;
  name: string;
  icon: string;
  description: string;
  actionHint: string;
}

const STEPS: StepDef[] = [
  {
    key: "intake",
    name: "Intake",
    icon: "📥",
    description: "Sourcing inquiry matched against European manufacturer catalog via semantic vector search.",
    actionHint: "Review match parameters and market fit.",
  },
  {
    key: "rfq",
    name: "RFQ",
    icon: "⚡",
    description: "Bulk outreach dispatched to factory export desk requesting target CIF Haifa price and container MOQ.",
    actionHint: "Log supplier response or dispatch follow-up.",
  },
  {
    key: "samples",
    name: "Samples",
    icon: "📦",
    description: "Physical tasting sample dispatched via express courier (DHL/FedEx) for 5-factor sensory evaluation.",
    actionHint: "Track courier AWB and submit sensory scores.",
  },
  {
    key: "meet",
    name: "Meet & AI",
    icon: "🎥",
    description: "Commercial Google Meet video call with dual timezones. AI engine extracts agreed CIF terms and action items.",
    actionHint: "Schedule video call or run AI call summarizer.",
  },
  {
    key: "po",
    name: "PO Draft",
    icon: "📝",
    description: "Bilingual English/Hebrew Purchase Order specifying milestone payments (30% deposit / 70% against B/L).",
    actionHint: "Draft commercial PO and verify deposit.",
  },
  {
    key: "vessel",
    name: "Production",
    icon: "🚢",
    description: "Factory authorizes production batch, signs off on Hebrew plates, and books ocean container freight to Israel.",
    actionHint: "Authorize production release and track vessel ETA.",
  },
];

function getActiveStepIndex(status?: string | null, breakdown?: Record<string, any> | null): number {
  const norm = (status || "").toLowerCase();

  // If breakdown has explicit data:
  if (breakdown?.production_release || norm === "production" || norm === "completed" || norm === "in_transit") {
    return 6;
  }
  if (breakdown?.purchase_order || norm === "po_draft" || norm === "contract" || norm === "signed") {
    return 5;
  }
  if (breakdown?.active_meeting || breakdown?.latest_meeting_summary || norm === "meeting" || norm === "commercial_negotiation") {
    return 4;
  }
  if (breakdown?.sample_dispatch || norm === "samples_pending" || norm === "sample_requested" || norm === "samples") {
    return 3;
  }
  if (norm === "sent" || norm === "responded" || norm === "rfq" || norm === "outreach") {
    return 2;
  }
  return 1; // Default to Intake
}

export default function DealWorkflowStepper({
  dealId,
  status,
  matchScore,
  matchBreakdown,
  onStepClick,
  compact = false,
}: DealStepperProps) {
  const activeStep = getActiveStepIndex(status, matchBreakdown);
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);

  return (
    <div className="relative inline-flex items-center">
      <div className={`flex items-center ${compact ? "gap-1" : "gap-1.5"}`}>
        {STEPS.map((step, idx) => {
          const stepNum = idx + 1;
          const isCompleted = stepNum < activeStep;
          const isCurrent = stepNum === activeStep;
          const isFuture = stepNum > activeStep;

          let pillStyles = "bg-slate-100 text-slate-400 border-slate-200";
          if (isCompleted) {
            pillStyles = "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100";
          } else if (isCurrent) {
            pillStyles = "bg-orange-50 text-orange-700 border-orange-400 ring-2 ring-orange-400/20 font-bold hover:bg-orange-100 animate-pulse";
          } else {
            pillStyles = "bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100";
          }

          return (
            <div key={step.key} className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onStepClick) onStepClick(stepNum, step.key);
                }}
                onMouseEnter={() => setHoveredStep(stepNum)}
                onMouseLeave={() => setHoveredStep(null)}
                className={`flex items-center gap-1 rounded-md border transition-all cursor-pointer select-none ${
                  compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-xs"
                } ${pillStyles}`}
                title={`${stepNum}. ${step.name}`}
              >
                <span className="text-[11px]">{step.icon}</span>
                <span className="font-semibold">{step.name}</span>
                {isCompleted && <span className="text-emerald-600 text-[10px]">✓</span>}
              </button>

              {/* Rich Tooltip on Hover */}
              {hoveredStep === stepNum && (
                <div
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-900 text-white rounded-xl shadow-2xl border border-slate-700 text-xs z-50 pointer-events-none animate-in fade-in zoom-in-95 duration-150"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between gap-1 mb-1.5 pb-1 border-b border-slate-800">
                    <span className="font-bold text-orange-400 flex items-center gap-1">
                      <span>{step.icon}</span>
                      <span>Step {stepNum}: {step.name}</span>
                    </span>
                    <span
                      className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded ${
                        isCompleted
                          ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                          : isCurrent
                          ? "bg-orange-950 text-orange-400 border border-orange-800"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {isCompleted ? "Completed" : isCurrent ? "Active Step" : "Upcoming"}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-snug">
                    {step.description}
                  </p>

                  <div className="mt-2 pt-1.5 border-t border-slate-800/80 text-[10px] text-orange-300 font-medium flex items-center gap-1">
                    <span>👉 Next Action:</span>
                    <span>{step.actionHint}</span>
                  </div>

                  {/* Tooltip Triangle Arrow */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
