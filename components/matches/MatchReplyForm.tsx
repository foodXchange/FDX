"use client";

import { useState, useTransition } from "react";
import { replyToMatch, type SupplierResponse } from "@/app/en/supplier-portal/matches/actions";

const OPTIONS: { value: SupplierResponse; label: string }[] = [
  { value: "accepted", label: "✓ Accept" },
  { value: "countered", label: "↔ Counter-offer" },
  { value: "declined", label: "✗ Decline" },
];

const RESPONSE_LABELS: Record<SupplierResponse, string> = {
  accepted: "You accepted this match.",
  countered: "You sent a counter-offer.",
  declined: "You declined this match.",
};

export default function MatchReplyForm({
  matchId,
  existingResponse,
  existingMessage,
}: {
  matchId: string;
  existingResponse: SupplierResponse | null;
  existingMessage: string | null;
}) {
  const [response, setResponse] = useState<SupplierResponse | "">("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (existingResponse || done) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-green-400">
          {done ? "Reply sent. Admin will follow up." : RESPONSE_LABELS[existingResponse as SupplierResponse]}
        </p>
        {existingMessage && <p className="text-sm text-slate-300 whitespace-pre-wrap">{existingMessage}</p>}
      </div>
    );
  }

  function handleSubmit() {
    if (!response) {
      setError("Choose a response");
      return;
    }
    if (response !== "accepted" && !message.trim()) {
      setError(response === "countered" ? "Add your counter-offer details" : "Add a reason for declining");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await replyToMatch(matchId, response, message);
      if (!result.ok) {
        setError(result.error ?? "Something went wrong");
        return;
      }
      setDone(true);
    });
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {OPTIONS.map((opt) => (
          <label key={opt.value} className="flex items-center gap-2 text-sm text-slate-200 cursor-pointer">
            <input
              type="radio"
              name="response"
              value={opt.value}
              checked={response === opt.value}
              onChange={() => setResponse(opt.value)}
              className="accent-orange-500"
            />
            {opt.label}
          </label>
        ))}
      </div>

      {response && (
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={
            response === "countered"
              ? "Describe your counter-offer (price, MOQ, lead time...)"
              : response === "declined"
              ? "Let the buyer know why"
              : "Add a note (optional)"
          }
          rows={response === "accepted" ? 2 : 3}
          className="dark-input resize-none w-full"
        />
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={pending}
        className="bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white px-4 py-2 rounded-md text-sm font-semibold transition"
      >
        {pending ? "Sending…" : "Send reply"}
      </button>
    </div>
  );
}
