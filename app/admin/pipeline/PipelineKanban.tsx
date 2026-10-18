"use client";

import { useState } from "react";
import Link from "next/link";
import {
  type Stage,
  BOARD_STAGES,
  STAGE_LABELS,
  STAGE_ICONS,
  STAGE_DESCRIPTIONS,
  STAGE_COLUMN_COLORS,
  statusToStage,
  getNextActionLabel,
  getNextStatus,
} from "./stage";
import { type PipelineRow } from "./PipelineTable";

interface PipelineKanbanProps {
  rows: PipelineRow[];
  statuses: Record<string, string>;
  loading: Set<string>;
  onAdvance: (row: PipelineRow) => void;
  onOpenModal: (row: PipelineRow, mode: "send" | "respond" | "details" | "reject") => void;
}

export default function PipelineKanban({
  rows,
  statuses,
  loading,
  onAdvance,
  onOpenModal,
}: PipelineKanbanProps) {
  const [showRejected, setShowRejected] = useState(false);

  const columns: Stage[] = showRejected
    ? [...BOARD_STAGES, "rejected"]
    : BOARD_STAGES;

  // Group rows by current stage
  const groupedRows: Record<Stage, PipelineRow[]> = {
    matched: [],
    proposal: [],
    sent: [],
    responded: [],
    closed: [],
    rejected: [],
  };

  for (const row of rows) {
    const currentStatus = statuses[row.id] ?? row.status;
    const stage = statusToStage(currentStatus);
    groupedRows[stage]?.push(row);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">
          Showing <strong className="text-gray-800">{rows.length}</strong> deals across{" "}
          <strong className="text-gray-800">{columns.length}</strong> pipeline stages
        </span>
        <button
          type="button"
          onClick={() => setShowRejected(!showRejected)}
          className="text-xs font-medium text-gray-500 hover:text-gray-700 underline cursor-pointer"
        >
          {showRejected ? "Hide Rejected Deals" : "Show Rejected Column"}
        </button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-6 pt-1 min-h-[600px] items-start">
        {columns.map((colStage) => {
          const colDeals = groupedRows[colStage] || [];
          const colors = STAGE_COLUMN_COLORS[colStage];

          return (
            <div
              key={colStage}
              className={`flex-shrink-0 w-80 rounded-2xl border ${colors.border} ${colors.bg} p-3.5 flex flex-col max-h-[820px] shadow-xs`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-base">{STAGE_ICONS[colStage]}</span>
                  <h3 className="text-sm font-bold text-gray-900">
                    {STAGE_LABELS[colStage]}
                  </h3>
                </div>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${colors.badge}`}
                >
                  {colDeals.length}
                </span>
              </div>

              <p className="text-[11px] text-gray-500 mb-3 line-clamp-1">
                {STAGE_DESCRIPTIONS[colStage]}
              </p>

              {/* Cards List */}
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                {colDeals.length === 0 ? (
                  <div className="py-10 text-center border-2 border-dashed border-gray-200/80 rounded-xl bg-white/40">
                    <span className="text-xs text-gray-400">No deals in this stage</span>
                  </div>
                ) : (
                  colDeals.map((deal) => {
                    const currentStatus = statuses[deal.id] ?? deal.status;
                    const nextLabel = getNextActionLabel(currentStatus);
                    const isLoading = loading.has(deal.id);

                    return (
                      <div
                        key={deal.id}
                        className="bg-white rounded-xl border border-gray-200/90 p-3.5 shadow-xs hover:shadow-md hover:border-orange-300 transition-all flex flex-col gap-2 group"
                      >
                        {/* Top row: Match Score & Actions */}
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${
                              deal.match_score >= 80
                                ? "bg-emerald-100 text-emerald-800"
                                : deal.match_score >= 60
                                ? "bg-amber-100 text-amber-800"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {deal.match_score}% Match
                          </span>

                          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => onOpenModal(deal, "details")}
                              title="View details"
                              className="text-gray-400 hover:text-gray-700 p-1 rounded hover:bg-gray-100 text-xs"
                            >
                              ℹ
                            </button>
                            {colStage !== "rejected" && colStage !== "closed" && (
                              <button
                                type="button"
                                onClick={() => onOpenModal(deal, "reject")}
                                title="Reject match"
                                className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-50 text-xs"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Product Title */}
                        <div>
                          <h4
                            className="text-xs font-bold text-gray-900 line-clamp-2 leading-tight group-hover:text-orange-600 transition-colors"
                            title={deal.product_name}
                          >
                            {deal.product_name}
                          </h4>
                        </div>

                        {/* Buyer & Supplier Info */}
                        <div className="space-y-1 text-[11px] bg-gray-50/70 p-2 rounded-lg border border-gray-100">
                          <div className="flex items-center justify-between text-gray-600">
                            <span className="text-gray-400">Buyer:</span>
                            <span className="font-semibold truncate max-w-[150px] text-gray-800">
                              {deal.buyer_company || "—"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-gray-600">
                            <span className="text-gray-400">Supplier:</span>
                            <span className="font-medium truncate max-w-[150px] text-gray-700">
                              {deal.company_name} {deal.country ? `(${deal.country})` : ""}
                            </span>
                          </div>
                        </div>

                        {/* Response Note if present */}
                        {deal.response_note && (
                          <div className="text-[11px] bg-emerald-50 text-emerald-800 p-1.5 rounded border border-emerald-100 line-clamp-2">
                            💬 {deal.response_note}
                          </div>
                        )}

                        {/* Action buttons */}
                        <div className="pt-1 flex items-center justify-between gap-1.5 border-t border-gray-100">
                          {colStage === "proposal" ? (
                            <button
                              type="button"
                              onClick={() => onOpenModal(deal, "send")}
                              disabled={isLoading}
                              className="w-full text-center py-1.5 px-2.5 rounded-lg text-xs font-semibold bg-orange-500 hover:bg-orange-600 text-white shadow-xs transition-colors cursor-pointer"
                            >
                              🚀 Dispatch Outreach
                            </button>
                          ) : colStage === "sent" ? (
                            <button
                              type="button"
                              onClick={() => onOpenModal(deal, "respond")}
                              disabled={isLoading}
                              className="w-full text-center py-1.5 px-2.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer"
                            >
                              💬 Log Response
                            </button>
                          ) : nextLabel ? (
                            <button
                              type="button"
                              onClick={() => onAdvance(deal)}
                              disabled={isLoading}
                              className="w-full text-center py-1.5 px-2.5 rounded-lg text-xs font-semibold bg-gray-900 hover:bg-gray-800 text-white shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                            >
                              {isLoading ? "Advancing…" : nextLabel}
                            </button>
                          ) : (
                            <span className="text-[11px] text-gray-400 italic text-center w-full py-1">
                              {colStage === "closed" ? "✓ Deal Completed" : "Archived"}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
