"use client";

import { useState } from "react";

interface Props {
  token: string;
  product: {
    id: string;
    product_name: string;
    category: string;
    brand_name?: string | null;
  };
}

export default function ProposalRequestButton({ token, product }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [requestSamples, setRequestSamples] = useState(true);
  const [buyerNote, setBuyerNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  async function handleConfirm() {
    setSubmitting(true);
    try {
      await fetch("/api/proposals/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          event_type: "request_click",
          product_id: product.id,
          request_samples: requestSamples,
          buyer_note: buyerNote.trim() || undefined,
        }),
      });
      setConfirmed(true);
      setExpanded(false);
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmed) {
    return (
      <div className="mt-5 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-center space-y-1.5">
        <div className="text-sm font-bold text-emerald-900">
          ✓ Option Selected — Samples &amp; Final Quote Requested
        </div>
        <p className="text-xs text-emerald-700">
          Our sourcing desk has been notified and will coordinate samples &amp;
          commercial terms for <strong>{product.product_name}</strong>.
        </p>
      </div>
    );
  }

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="w-full mt-5 py-3.5 rounded-2xl bg-orange-500 hover:bg-orange-600 active:scale-[0.99] text-white font-bold text-base transition cursor-pointer shadow-xs"
      >
        ✓ Select Option — Request Samples &amp; Quote →
      </button>
    );
  }

  return (
    <div className="mt-5 rounded-2xl border border-orange-200 bg-orange-50/50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-orange-800">
          Confirm Interest in This Option
        </span>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="text-xs text-slate-400 hover:text-slate-600"
        >
          Cancel
        </button>
      </div>

      <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
        <input
          type="checkbox"
          checked={requestSamples}
          onChange={(e) => setRequestSamples(e.target.checked)}
          className="rounded border-slate-300 text-orange-500 focus:ring-orange-500"
        />
        Request physical product samples + final CIF/FOB quote
      </label>

      <input
        type="text"
        value={buyerNote}
        onChange={(e) => setBuyerNote(e.target.value)}
        placeholder="Optional note (e.g., target quantity, packaging size, kosher requirement)..."
        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
      />

      <button
        type="button"
        disabled={submitting}
        onClick={handleConfirm}
        className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm transition cursor-pointer"
      >
        {submitting
          ? "Confirming..."
          : "Confirm Selection & Notify FoodXchange →"}
      </button>
    </div>
  );
}
