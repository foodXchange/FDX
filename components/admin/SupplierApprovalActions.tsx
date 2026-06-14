"use client";

import { useState } from "react";
import { approveSupplier, rejectSupplier } from "@/app/admin/suppliers/actions";

export default function SupplierApprovalActions({ id }: { id: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<"approved" | "rejected" | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");

  async function handleApprove() {
    if (!window.confirm("Approve this supplier? They'll receive a welcome email with a portal link.")) return;
    setLoading(true);
    setError(null);
    const res = await approveSupplier(id);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setDone("approved");
  }

  async function handleReject() {
    if (!window.confirm("Reject this supplier? They'll receive an email notification.")) return;
    setLoading(true);
    setError(null);
    const res = await rejectSupplier(id, reason);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setDone("rejected");
  }

  if (done === "approved") {
    return <span className="text-sm text-green-600 font-medium">✓ Approved</span>;
  }
  if (done === "rejected") {
    return <span className="text-sm text-red-600 font-medium">✓ Rejected</span>;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleApprove}
          disabled={loading}
          className="text-sm text-green-600 hover:text-green-700 font-medium disabled:opacity-50"
        >
          {loading ? "Working…" : "Approve"}
        </button>
        <button
          type="button"
          onClick={() => setShowReject((v) => !v)}
          disabled={loading}
          className="text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
        >
          Reject
        </button>
        {error && <span className="text-xs text-red-500">{error}</span>}
      </div>
      {showReject && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (optional)"
            className="text-sm border border-gray-300 rounded-lg px-2 py-1 w-64"
          />
          <button
            type="button"
            onClick={handleReject}
            disabled={loading}
            className="text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
          >
            {loading ? "Working…" : "Confirm reject"}
          </button>
        </div>
      )}
    </div>
  );
}
