"use client";

import { useState } from "react";
import Link from "next/link";
import { type PipelineRow } from "./PipelineTable";
import { updateMatchStage } from "./actions";

interface DealActionModalProps {
  deal: PipelineRow | null;
  mode: "send" | "respond" | "details" | "reject" | null;
  onClose: () => void;
  onSuccess: (dealId: string, nextStatus: string) => void;
}

export default function DealActionModal({
  deal,
  mode,
  onClose,
  onSuccess,
}: DealActionModalProps) {
  if (!deal || !mode) return null;

  const [saving, setSaving] = useState(false);
  const [sentVia, setSentVia] = useState<string>("whatsapp");
  const [responseNote, setResponseNote] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [copied, setCopied] = useState(false);

  const defaultOutreach =
    deal.whatsapp_message ||
    `Hello ${deal.company_name},\n\nWe have a verified buyer (${deal.buyer_company || "international retail buyer"}) actively seeking ${deal.product_name}. Your profile scored a ${deal.match_score}% match.\n\nPlease confirm availability and share your current catalog and FOB/CIF pricing.\n\nBest regards,\nFoodXchange Sourcing Desk`;

  async function handleConfirmSend() {
    if (!deal) return;
    setSaving(true);
    const res = await updateMatchStage(deal.id, "sent", { sent_via: sentVia });
    setSaving(false);
    if (res.ok) {
      onSuccess(deal.id, "sent");
      onClose();
    }
  }

  async function handleConfirmRespond() {
    if (!deal) return;
    setSaving(true);
    const res = await updateMatchStage(deal.id, "responded", {
      response_note: responseNote.trim() || undefined,
    });
    setSaving(false);
    if (res.ok) {
      onSuccess(deal.id, "responded");
      onClose();
    }
  }

  async function handleConfirmReject() {
    if (!deal) return;
    setSaving(true);
    const res = await updateMatchStage(deal.id, "rejected", {
      response_note: rejectReason.trim() || undefined,
    });
    setSaving(false);
    if (res.ok) {
      onSuccess(deal.id, "rejected");
      onClose();
    }
  }

  function copyOutreach() {
    navigator.clipboard.writeText(defaultOutreach);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800">
                Score: {deal.match_score}%
              </span>
              <span className="text-xs text-gray-500 font-medium">Deal #{deal.id.slice(0, 8)}</span>
            </div>
            <h3 className="text-base font-bold text-gray-900 mt-1">
              {mode === "send" && "🚀 Dispatch Supplier Outreach"}
              {mode === "respond" && "💬 Log Supplier Response"}
              {mode === "reject" && "✕ Reject Deal Match"}
              {mode === "details" && "📋 Deal & Match Details"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-sm">
          {/* Deal summary mini card */}
          <div className="p-3.5 bg-gray-50 border border-gray-200/80 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Product:</span>
              <span className="font-semibold text-gray-900">{deal.product_name}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Buyer:</span>
              <span className="font-medium text-gray-800">
                {deal.buyer_company || "Direct Buyer Request"}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Supplier:</span>
              <span className="font-medium text-gray-800">
                {deal.company_name} {deal.country ? `(${deal.country})` : ""}
              </span>
            </div>
          </div>

          {/* Mode: Send Outreach */}
          {mode === "send" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Outreach Channel:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSentVia("whatsapp")}
                    className={`px-3 py-2 text-xs font-semibold rounded-lg border flex items-center justify-center gap-1.5 transition-all ${
                      sentVia === "whatsapp"
                        ? "border-emerald-500 bg-emerald-50 text-emerald-800 shadow-xs"
                        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <span>📱 WhatsApp</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSentVia("email")}
                    className={`px-3 py-2 text-xs font-semibold rounded-lg border flex items-center justify-center gap-1.5 transition-all ${
                      sentVia === "email"
                        ? "border-blue-500 bg-blue-50 text-blue-800 shadow-xs"
                        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <span>✉️ Email / Direct</span>
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-gray-700">Message Preview:</label>
                  <button
                    type="button"
                    onClick={copyOutreach}
                    className="text-[11px] text-orange-600 hover:text-orange-700 font-semibold flex items-center gap-1"
                  >
                    {copied ? "✓ Copied!" : "📋 Copy Message"}
                  </button>
                </div>
                <textarea
                  readOnly
                  rows={6}
                  value={defaultOutreach}
                  className="w-full text-xs font-sans p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 leading-relaxed outline-none"
                />
              </div>

              {sentVia === "whatsapp" && (
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(defaultOutreach)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="block text-center text-xs font-semibold py-2 px-3 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs"
                >
                  Open WhatsApp Web with Pre-Filled Pitch →
                </a>
              )}
            </div>
          )}

          {/* Mode: Log Response */}
          {mode === "respond" && (
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-gray-700">
                Supplier Response / Meeting Notes:
              </label>
              <textarea
                rows={4}
                value={responseNote}
                onChange={(e) => setResponseNote(e.target.value)}
                placeholder="e.g. Supplier confirmed ability to provide 20,000 units. Price offered: $2.10/unit FOB. Sent sample request on 18 Oct."
                className="w-full text-xs p-3 border border-gray-200 rounded-xl text-gray-800 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
              />
              <p className="text-[11px] text-gray-500">
                Logging a response advances this match to <strong>Responded</strong> and sends a
                dashboard notification.
              </p>
            </div>
          )}

          {/* Mode: Reject */}
          {mode === "reject" && (
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-gray-700">
                Reason for Rejection (Optional):
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Supplier does not meet kosher requirements / price point too high / no export capacity."
                className="w-full text-xs p-3 border border-gray-200 rounded-xl text-gray-800 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
              />
              <p className="text-[11px] text-rose-600 font-medium">
                Rejecting moves this match out of active stages into Rejected.
              </p>
            </div>
          )}

          {/* Mode: Details */}
          {mode === "details" && (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-500 block mb-1">Status</span>
                  <span className="font-semibold text-gray-800 uppercase text-[11px]">
                    {deal.status}
                  </span>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-500 block mb-1">Sent Via</span>
                  <span className="font-semibold text-gray-800">
                    {deal.sent_via || "Not sent yet"}
                  </span>
                </div>
              </div>

              {deal.response_note && (
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg">
                  <span className="text-emerald-800 font-semibold block mb-1">Latest Response Note</span>
                  <p className="text-gray-700">{deal.response_note}</p>
                </div>
              )}

              <div className="pt-2 flex items-center justify-between border-t border-gray-100">
                <Link
                  href={`/admin/requests/${deal.request_id}`}
                  className="text-orange-600 hover:text-orange-700 font-semibold text-xs underline"
                >
                  View Sourcing Request →
                </Link>
                <Link
                  href={`/admin/suppliers/${deal.supplier_id}`}
                  className="text-orange-600 hover:text-orange-700 font-semibold text-xs underline"
                >
                  View Supplier Profile →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-xs font-semibold rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors shadow-xs"
          >
            {mode === "details" ? "Close" : "Cancel"}
          </button>

          {mode === "send" && (
            <button
              type="button"
              onClick={handleConfirmSend}
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors shadow-xs"
            >
              {saving ? "Saving…" : "Mark as Sent →"}
            </button>
          )}

          {mode === "respond" && (
            <button
              type="button"
              onClick={handleConfirmRespond}
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs"
            >
              {saving ? "Saving…" : "Save Response →"}
            </button>
          )}

          {mode === "reject" && (
            <button
              type="button"
              onClick={handleConfirmReject}
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors shadow-xs"
            >
              {saving ? "Rejecting…" : "Confirm Rejection"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
