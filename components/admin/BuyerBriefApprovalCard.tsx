"use client";

import { useState, useTransition } from "react";
import {
  type BuyerBriefApproval,
  updateBuyerBriefApproval,
} from "@/app/admin/requests/actions";

interface Props {
  requestId: string;
  buyerCompany: string;
  initialApproval?: BuyerBriefApproval | null;
}

export default function BuyerBriefApprovalCard({
  requestId,
  buyerCompany,
  initialApproval,
}: Props) {
  const [approval, setApproval] = useState<BuyerBriefApproval>(
    initialApproval || {
      status: "draft",
      approved_by: null,
      approved_at: null,
      notes: null,
    }
  );

  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState(approval.notes || "");
  const [approvedBy, setApprovedBy] = useState(
    approval.approved_by || `${buyerCompany} Procurement Lead`
  );
  const [isPending, startTransition] = useTransition();

  const isApproved = approval.status === "approved";
  const isSubmitted = approval.status === "submitted_to_buyer";

  function handleUpdate(newStatus: "draft" | "submitted_to_buyer" | "approved") {
    startTransition(async () => {
      const payload: BuyerBriefApproval = {
        status: newStatus,
        approved_by: newStatus === "approved" ? approvedBy : null,
        approved_at: newStatus === "approved" ? new Date().toISOString() : null,
        notes: notes || null,
      };

      const res = await updateBuyerBriefApproval(requestId, payload);
      if (res.ok) {
        setApproval(payload);
        setIsOpen(false);
      }
    });
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs mb-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 ${
              isApproved
                ? "bg-emerald-100 text-emerald-700"
                : isSubmitted
                ? "bg-amber-100 text-amber-700"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {isApproved ? "✓" : isSubmitted ? "⏳" : "📝"}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900">
                Buyer Brief Sign-Off
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  isApproved
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                    : isSubmitted
                    ? "bg-amber-100 text-amber-800 border border-amber-300"
                    : "bg-slate-100 text-slate-600 border border-slate-200"
                }`}
              >
                {isApproved
                  ? "Approved by Buyer"
                  : isSubmitted
                  ? "Awaiting Buyer Sign-Off"
                  : "Draft Brief"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {isApproved
                ? `Approved by ${approval.approved_by || buyerCompany} on ${
                    approval.approved_at
                      ? new Date(approval.approved_at).toLocaleDateString("en-GB")
                      : "recently"
                  }`
                : isSubmitted
                ? `Shared with ${buyerCompany} procurement team for validation`
                : "Ensure buyer reviews and approves specifications before factory dispatch"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {!isApproved ? (
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleUpdate("approved")}
              className="text-xs font-semibold px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition cursor-pointer shadow-xs"
            >
              {isPending ? "Updating…" : "✓ Confirm Buyer Approval"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition"
            >
              Edit Approval Details
            </button>
          )}
        </div>
      </div>

      {/* Expanded Modal/Details */}
      {isOpen && (
        <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
                Approved By (Buyer Contact)
              </label>
              <input
                className="w-full text-xs border border-slate-200 rounded-lg p-2"
                value={approvedBy}
                onChange={(e) => setApprovedBy(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
                Approval Notes / Revisions
              </label>
              <input
                className="w-full text-xs border border-slate-200 rounded-lg p-2"
                placeholder="Confirmed target €0.85 CIF, requires Kosher Rabbinate"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleUpdate("draft")}
              className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1"
            >
              Reset to Draft
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleUpdate("approved")}
              className="text-xs font-semibold px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
              Save Sign-Off
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
