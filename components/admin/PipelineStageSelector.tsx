"use client";

import { useState, useRef, useEffect } from "react";
import {
  PIPELINE_STAGES,
  EXCEPTION_STATUSES,
  getAllPipelineStages,
  getAllExceptionStatuses,
  getPipelineStageConfig,
  type PipelineStageId,
  type ExceptionStatus,
} from "@/lib/admin/pipelineStages";
import { updateRequestPipelineStage } from "@/app/admin/requests/actions";

interface PipelineStageSelectorProps {
  requestId: string;
  currentStage?: string | null;
  currentSubstage?: string | null;
  currentException?: string | null;
  size?: "sm" | "md";
  interactive?: boolean;
  onStageChange?: (newStage: string, newException: string | null) => void;
}

export default function PipelineStageSelector({
  requestId,
  currentStage,
  currentSubstage,
  currentException,
  size = "sm",
  interactive = true,
  onStageChange,
}: PipelineStageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localStage, setLocalStage] = useState(currentStage || "stage_1_brief");
  const [localException, setLocalException] = useState<string | null>(currentException || null);
  const [showReasonModal, setShowReasonModal] = useState<ExceptionStatus | null>(null);
  const [reasonText, setReasonText] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync with prop changes
  useEffect(() => {
    setLocalStage(currentStage || "stage_1_brief");
    setLocalException(currentException || null);
  }, [currentStage, currentException]);

  // Handle outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const config = getPipelineStageConfig(localStage, localException);
  const allStages = getAllPipelineStages();
  const allExceptions = getAllExceptionStatuses();

  async function handleSelectStage(stageId: PipelineStageId) {
    if (loading) return;
    setLoading(true);
    setIsOpen(false);

    // Optimistic update
    setLocalStage(stageId);
    setLocalException(null);
    onStageChange?.(stageId, null);

    const res = await updateRequestPipelineStage({
      requestId,
      stage: stageId,
      exceptionStatus: null,
    });

    setLoading(false);
    if (!res.ok) {
      console.error("Failed to update stage:", res.error);
      // Revert if failed
      setLocalStage(currentStage || "stage_1_brief");
      setLocalException(currentException || null);
    }
  }

  function handleExceptionClick(exceptionId: ExceptionStatus) {
    setIsOpen(false);
    setShowReasonModal(exceptionId);
  }

  async function handleConfirmException() {
    if (!showReasonModal || loading) return;
    setLoading(true);

    const exId = showReasonModal;
    const reason = reasonText.trim();

    // Optimistic update
    setLocalException(exId);
    onStageChange?.(localStage, exId);
    setShowReasonModal(null);
    setReasonText("");

    const res = await updateRequestPipelineStage({
      requestId,
      exceptionStatus: exId,
      exceptionReason: reason || undefined,
    });

    setLoading(false);
    if (!res.ok) {
      console.error("Failed to set exception status:", res.error);
      setLocalException(currentException || null);
    }
  }

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Badge Button */}
      <button
        type="button"
        disabled={!interactive || loading}
        onClick={() => setIsOpen(!isOpen)}
        title={config.tooltip}
        className={`group inline-flex items-center gap-1.5 rounded-full border transition-all select-none ${
          config.badgeCls
        } ${
          size === "sm" ? "px-2.5 py-1 text-xs" : "px-3.5 py-1.5 text-sm"
        } ${
          interactive
            ? "cursor-pointer hover:shadow-xs hover:brightness-95 active:scale-98"
            : "cursor-default"
        } ${loading ? "opacity-60 pointer-events-none" : ""}`}
      >
        <span className="shrink-0 text-xs leading-none">{config.icon}</span>
        <span className="font-semibold tracking-tight">{config.name}</span>
        {interactive && (
          <span className="text-[10px] opacity-50 group-hover:opacity-100 transition-opacity">
            ▼
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-84 rounded-2xl bg-white border border-slate-200 shadow-xl z-50 py-2 divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3.5 py-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Set Pipeline Stage (Manual)
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Select current stage to keep radar and team aligned.
            </p>
          </div>

          {/* Active Stages (1-11) */}
          <div className="max-h-64 overflow-y-auto py-1 px-1.5 space-y-0.5">
            {allStages.map((stg) => {
              const isSelected = !localException && localStage === stg.id;
              return (
                <button
                  key={stg.id}
                  type="button"
                  onClick={() => handleSelectStage(stg.id)}
                  className={`w-full text-left px-2.5 py-2 rounded-xl flex items-start gap-2.5 transition text-xs group cursor-pointer ${
                    isSelected
                      ? "bg-slate-900 text-white font-medium"
                      : "hover:bg-slate-50 text-slate-700"
                  }`}
                  title={stg.tooltip}
                >
                  <span className="text-sm shrink-0 leading-tight mt-0.5">{stg.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`font-semibold ${isSelected ? "text-white" : "text-slate-900"}`}>
                        {stg.name}
                      </span>
                      {isSelected && (
                        <span className="text-xs font-bold text-emerald-400">✓</span>
                      )}
                    </div>
                    <p
                      className={`text-[11px] line-clamp-1 mt-0.5 ${
                        isSelected ? "text-slate-300" : "text-slate-500"
                      }`}
                    >
                      {stg.tooltip}
                    </p>
                    <span
                      className={`inline-block text-[9px] font-semibold mt-1 px-1.5 py-0.2 rounded ${
                        isSelected
                          ? "bg-slate-800 text-slate-300"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {stg.responsibleParty}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Exceptions & Terminal States */}
          <div className="p-1.5 bg-slate-50/60">
            <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Terminal / Cancelled States
            </p>
            <div className="space-y-0.5">
              {allExceptions.map((ex) => {
                const isSelected = localException === ex.id;
                return (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => handleExceptionClick(ex.id)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-xl flex items-center justify-between transition text-xs cursor-pointer ${
                      isSelected
                        ? "bg-rose-900 text-white font-medium"
                        : "hover:bg-rose-50/80 text-rose-800"
                    }`}
                    title={ex.tooltip}
                  >
                    <div className="flex items-center gap-2">
                      <span>{ex.icon}</span>
                      <span className="font-medium">{ex.name}</span>
                    </div>
                    {isSelected && <span className="text-xs font-bold text-rose-300">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Reason Modal for Exceptions */}
      {showReasonModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-base mb-1">
              <span>{EXCEPTION_STATUSES[showReasonModal].icon}</span>
              <h3>Mark as {EXCEPTION_STATUSES[showReasonModal].name}</h3>
            </div>
            <p className="text-xs text-slate-600 mb-4">
              {EXCEPTION_STATUSES[showReasonModal].tooltip}
            </p>

            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reason / Internal Notes (Optional)
            </label>
            <textarea
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              placeholder="e.g. Buyer postponed project until Q3; or unresponsive to sample follow-ups..."
              className="w-full text-xs rounded-2xl border border-slate-200 bg-slate-50 p-3 text-slate-800 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 min-h-[90px]"
            />

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowReasonModal(null);
                  setReasonText("");
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmException}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition cursor-pointer"
              >
                Confirm Status
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
