"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  STAGE_COLORS,
  STAGE_LABELS,
  statusToStage,
  getNextActionLabel,
} from "./stage";
import { bulkUpdateMatchStage } from "./actions";
import BulkRfqDispatchModal from "./BulkRfqDispatchModal";
import MeetingIntelligenceModal from "@/components/admin/meetings/MeetingIntelligenceModal";
import LabelComplianceModal from "@/components/admin/compliance/LabelComplianceModal";
import DealWorkflowStepper from "@/components/admin/pipeline/DealWorkflowStepper";

export type PipelineRow = {
  id: string;
  request_id: string;
  supplier_id: string;
  status: string;
  match_score: number;
  product_name: string;
  company_name: string;
  country: string | null;
  approved_at: string | null;
  sent_at: string | null;
  responded_at: string | null;
  closed_at: string | null;
  sent_via: string | null;
  response_note?: string | null;
  whatsapp_message?: string | null;
  match_summary?: string | null;
  buyer_company: string | null;
  buyer_product: string | null;
  buyer_id: string | null;
  match_breakdown?: Record<string, any> | null;
};

function lastUpdated(row: PipelineRow): string {
  const ts =
    row.responded_at ?? row.closed_at ?? row.sent_at ?? row.approved_at;
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + "…" : text;
}

function StatusBadge({ status }: { status: string }) {
  const stage = statusToStage(status);
  return (
    <span
      className={`inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${STAGE_COLORS[stage]}`}
    >
      {STAGE_LABELS[stage]}
    </span>
  );
}

interface PipelineTableProps {
  rows: PipelineRow[];
  statuses: Record<string, string>;
  loading: Set<string>;
  onAdvance: (row: PipelineRow) => void;
  onOpenModal: (row: PipelineRow, mode: "send" | "respond" | "details" | "reject") => void;
}

export default function PipelineTable({
  rows,
  statuses,
  loading,
  onAdvance,
  onOpenModal,
}: PipelineTableProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [meetingDeal, setMeetingDeal] = useState<PipelineRow | null>(null);
  const [complianceDeal, setComplianceDeal] = useState<PipelineRow | null>(null);

  const allSelected = rows.length > 0 && selectedIds.size === rows.length;

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(rows.map((r) => r.id)));
    }
  }

  function toggleRow(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleBulkApprove() {
    if (selectedIds.size === 0) return;
    setBulkBusy(true);
    await bulkUpdateMatchStage(Array.from(selectedIds), "approved");
    setSelectedIds(new Set());
    setBulkBusy(false);
  }

  async function handleBulkReject() {
    if (selectedIds.size === 0) return;
    setBulkBusy(true);
    await bulkUpdateMatchStage(Array.from(selectedIds), "rejected");
    setSelectedIds(new Set());
    setBulkBusy(false);
  }

  if (rows.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm font-semibold text-gray-700">No deals match this filter.</p>
        <p className="text-xs text-gray-400 mt-1">Try clearing your search query or stage filters.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Bulk Action Toolbar */}
      {selectedIds.size > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
            <span className="text-xs font-bold text-orange-950">
              {selectedIds.size} deal{selectedIds.size === 1 ? "" : "s"} selected
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setDispatchModalOpen(true)}
              disabled={bulkBusy}
              className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              <span>🚀</span>
              <span>Batch Dispatch RFQs ({selectedIds.size})</span>
            </button>
            <button
              type="button"
              onClick={handleBulkApprove}
              disabled={bulkBusy}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-orange-500 hover:bg-orange-600 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {bulkBusy ? "Processing…" : `Approve Selected (${selectedIds.size}) →`}
            </button>
            <button
              type="button"
              onClick={handleBulkReject}
              disabled={bulkBusy}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-200 text-red-600 bg-white hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50"
            >
              Reject Selected
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-gray-500 hover:text-gray-800 ml-1"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-xs">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left bg-gray-50/80 border-b border-gray-200 text-xs font-semibold text-gray-600">
              <th className="py-2.5 px-3 w-8 text-center">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="rounded border-gray-300 text-orange-600 focus:ring-orange-400"
                />
              </th>
              <th className="py-2.5 pr-4 font-semibold">Buyer Company</th>
              <th className="py-2.5 pr-4 font-semibold">Matched Product</th>
              <th className="py-2.5 pr-4 font-semibold">Supplier</th>
              <th className="py-2.5 pr-4 font-semibold">Origin</th>
              <th className="py-2.5 pr-4 text-center font-semibold">Score</th>
              <th className="py-2.5 pr-4 font-semibold min-w-[260px]">Stage & 6-Step Workflow</th>
              <th className="py-2.5 pr-4 font-semibold">Last Updated</th>
              <th className="py-2.5 pr-4 text-right font-semibold w-40">Pipeline Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {rows.map((row) => {
              const currentStatus = statuses[row.id] ?? row.status;
              const nextLabel = getNextActionLabel(currentStatus);
              const isLoading = loading.has(row.id);
              const isSelected = selectedIds.has(row.id);

              return (
                <tr
                  key={row.id}
                  onClick={() => router.push(`/admin/requests/${row.request_id}`)}
                  className={`cursor-pointer transition-colors group ${
                    isSelected ? "bg-orange-50/40" : "hover:bg-gray-50/70"
                  }`}
                >
                  <td
                    className="py-3 px-3 text-center"
                    onClick={(e) => toggleRow(row.id, e)}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="rounded border-gray-300 text-orange-600 focus:ring-orange-400"
                    />
                  </td>
                  <td className="py-3 pr-4 text-gray-900 text-xs font-medium max-w-[130px] truncate">
                    {row.buyer_id ? (
                      <Link
                        href={`/admin/buyers/${row.buyer_id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="hover:text-orange-600 hover:underline"
                      >
                        {row.buyer_company ?? "Direct Sourcing"}
                      </Link>
                    ) : (
                      row.buyer_company ?? "Direct Sourcing"
                    )}
                  </td>
                  <td
                    className="py-3 pr-4 text-gray-900 font-semibold text-xs max-w-[160px] truncate"
                    title={row.product_name}
                  >
                    {truncate(row.product_name, 45)}
                  </td>
                  <td className="py-3 pr-4 text-gray-700 text-xs max-w-[150px] truncate">
                    <Link
                      href={`/admin/suppliers/${row.supplier_id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="hover:text-orange-600 hover:underline font-medium"
                    >
                      {row.company_name}
                    </Link>
                  </td>
                  <td className="py-3 pr-4 text-gray-500 text-xs">
                    {row.country ?? "—"}
                  </td>
                  <td className="py-3 pr-4 text-center">
                    <span
                      className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${
                        row.match_score >= 80
                          ? "bg-emerald-100 text-emerald-800"
                          : row.match_score >= 60
                          ? "bg-amber-100 text-amber-800"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {row.match_score}%
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex flex-col gap-1.5 min-w-[260px]">
                      <div className="flex items-center justify-between gap-1">
                        <StatusBadge status={currentStatus} />
                        <span className="text-[10px] text-gray-400 font-medium">6-Step Flow</span>
                      </div>
                      <DealWorkflowStepper
                        dealId={row.id}
                        status={currentStatus}
                        matchScore={row.match_score}
                        matchBreakdown={row.match_breakdown}
                        compact={true}
                        onStepClick={(stepNum, stepKey) => {
                          if (stepKey === "meet") {
                            setMeetingDeal(row);
                          } else if (stepKey === "rfq") {
                            setSelectedIds(new Set([row.id]));
                            setDispatchModalOpen(true);
                          } else if (stepKey === "po" || stepKey === "vessel") {
                            setComplianceDeal(row);
                          } else {
                            onOpenModal(row, "details");
                          }
                        }}
                      />
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-gray-400 text-xs whitespace-nowrap">
                    {lastUpdated(row)}
                  </td>
                  <td
                    className="py-3 pr-4 text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      {currentStatus === "approved" ? (
                        <button
                          type="button"
                          onClick={() => onOpenModal(row, "send")}
                          disabled={isLoading}
                          className="text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 px-3 py-1 rounded-lg transition-colors shadow-xs whitespace-nowrap cursor-pointer"
                        >
                          🚀 Send Outreach
                        </button>
                      ) : currentStatus === "sent" ? (
                        <button
                          type="button"
                          onClick={() => onOpenModal(row, "respond")}
                          disabled={isLoading}
                          className="text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1 rounded-lg transition-colors shadow-xs whitespace-nowrap cursor-pointer"
                        >
                          💬 Log Response
                        </button>
                      ) : nextLabel ? (
                        <button
                          type="button"
                          onClick={() => onAdvance(row)}
                          disabled={isLoading}
                          className="text-xs font-semibold text-gray-800 border border-gray-300 hover:border-orange-400 hover:text-orange-600 bg-white hover:bg-orange-50/50 disabled:opacity-40 px-3 py-1 rounded-lg transition-colors whitespace-nowrap cursor-pointer shadow-xs"
                        >
                          {isLoading ? "…" : nextLabel}
                        </button>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => setMeetingDeal(row)}
                        title="Schedule Google Meet or Summarize Call with AI"
                        className="text-xs font-semibold px-2 py-1 rounded-lg border border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors shadow-xs flex items-center gap-1 cursor-pointer"
                      >
                        <span>🎥</span>
                        <span className="hidden xl:inline">Meet / AI</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setComplianceDeal(row)}
                        title="Israeli Packaging & Hebrew Label Compliance (SI 1145)"
                        className="text-xs font-semibold px-2 py-1 rounded-lg border border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors shadow-xs flex items-center gap-1 cursor-pointer"
                      >
                        <span>🏷️</span>
                        <span className="hidden xl:inline">Label</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenModal(row, "details")}
                        title="View match details"
                        className="text-gray-400 hover:text-gray-700 p-1 rounded hover:bg-gray-100 text-xs"
                      >
                        ℹ
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <BulkRfqDispatchModal
        deals={rows}
        selectedIds={selectedIds}
        isOpen={dispatchModalOpen}
        onClose={() => setDispatchModalOpen(false)}
        onDispatched={(dispatchedIds) => {
          setSelectedIds(new Set());
          setDispatchModalOpen(false);
          router.refresh();
        }}
      />

      <MeetingIntelligenceModal
        deal={meetingDeal}
        isOpen={Boolean(meetingDeal)}
        onClose={() => setMeetingDeal(null)}
        onSuccess={() => {
          router.refresh();
        }}
      />

      <LabelComplianceModal
        deal={complianceDeal}
        isOpen={Boolean(complianceDeal)}
        onClose={() => setComplianceDeal(null)}
        onSuccess={() => {
          router.refresh();
        }}
      />
    </div>
  );
}
