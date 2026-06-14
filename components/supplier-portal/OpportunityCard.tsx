"use client";

import { useState } from "react";
import MatchScoreBar from "@/components/matches/MatchScoreBar";

export interface Opportunity {
  id: string;
  status: string | null;
  matchScore: number | null;
  matchedProductName: string | null;
  matchSummary: string | null;
  requestProductName: string | null;
  requestCategory: string | null;
  requestMessage: string | null;
  requestCertifications: string[] | null;
}

export default function OpportunityCard({ opportunity }: { opportunity: Opportunity }) {
  const [interested, setInterested] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isNew = opportunity.status === "suggested";

  async function handleInterested() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/supplier/interested", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId: opportunity.id }),
      });
      if (!res.ok) throw new Error("Failed to send interest");
      setInterested(true);
    } catch {
      setError("Something went wrong — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className={`dark-card p-5 flex flex-col gap-4 border-l-4 ${
        isNew ? "border-l-orange-500" : "border-l-white/10"
      }`}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span
          className={`text-xs font-semibold px-3 py-1 rounded-full capitalize ${
            isNew ? "bg-orange-500/10 text-orange-300" : "bg-blue-500/10 text-blue-300"
          }`}
        >
          {isNew ? "New match" : "Sent to you"}
        </span>
        {opportunity.matchScore !== null && <MatchScoreBar score={opportunity.matchScore} />}
      </div>

      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
          What they&apos;re looking for
        </p>
        <h3 className="font-semibold text-white">
          {opportunity.requestProductName ?? "Sourcing request"}
        </h3>
        {opportunity.requestCategory && (
          <span className="inline-block mt-1 text-xs px-2.5 py-1 rounded-full bg-white/5 text-slate-300">
            {opportunity.requestCategory}
          </span>
        )}
        {opportunity.requestMessage && (
          <p className="text-sm text-slate-400 mt-2 leading-relaxed">{opportunity.requestMessage}</p>
        )}
        {opportunity.requestCertifications && opportunity.requestCertifications.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {opportunity.requestCertifications.map((cert) => (
              <span key={cert} className="text-xs px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-300">
                {cert}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-white/10 pt-4">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
          Your matched product
        </p>
        <h4 className="font-semibold text-white">{opportunity.matchedProductName ?? "—"}</h4>
        {opportunity.matchSummary && (
          <p className="text-sm text-slate-400 mt-2 leading-relaxed">{opportunity.matchSummary}</p>
        )}
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div>
        {interested ? (
          <button
            type="button"
            disabled
            className="bg-green-500/10 text-green-300 border border-green-500/20 px-5 py-2.5 rounded-md text-sm font-semibold cursor-default"
          >
            Interest sent ✓
          </button>
        ) : (
          <button
            type="button"
            onClick={handleInterested}
            disabled={submitting}
            className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-md text-sm font-semibold transition disabled:opacity-60"
          >
            {submitting ? "Sending…" : "I'm interested →"}
          </button>
        )}
      </div>
    </div>
  );
}
