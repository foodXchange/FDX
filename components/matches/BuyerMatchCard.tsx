"use client";

import { useState } from "react";
import type { SupplierMatch } from "./types";
import MatchPipelineBadge from "./MatchPipelineBadge";
import MatchScoreBar from "./MatchScoreBar";
import MatchDetailsPanel from "./MatchDetailsPanel";
import RequestInfoModal from "./RequestInfoModal";
import { countryToFlag } from "@/lib/admin/countryFlag";
import { getInitials } from "@/lib/admin/avatarPalette";

export interface BuyerMatchSupplier {
  logo_url: string | null;
  certifications: string[] | null;
}

export interface BuyerMatch extends SupplierMatch {
  supplier_id: string;
  match_summary: string | null;
  buyer_interest: boolean | null;
  buyer_interest_at: string | null;
  supplier: BuyerMatchSupplier | null;
}

const HIGH_SCORE_THRESHOLD = 80;

export default function BuyerMatchCard({ match }: { match: BuyerMatch }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [interested, setInterested] = useState(!!match.buyer_interest);
  const [sendingInterest, setSendingInterest] = useState(false);
  const [interestError, setInterestError] = useState<string | null>(null);

  const score = match.match_score ?? 0;
  const flag = countryToFlag(match.country);
  const companyName = match.company_name || "Supplier";

  const certs = Array.from(
    new Set([
      ...(match.match_breakdown?.certifications ?? []),
      ...(match.match_breakdown?.kosher_types ?? []),
      ...(match.supplier?.certifications ?? []),
    ])
  );

  async function handleInterested() {
    setSendingInterest(true);
    setInterestError(null);
    try {
      const res = await fetch("/api/buyer/interested", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId: match.id }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to send");
      setInterested(true);
    } catch (err) {
      setInterestError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSendingInterest(false);
    }
  }

  return (
    <>
      <div
        className={`dark-card p-4 sm:p-5 ${
          score > HIGH_SCORE_THRESHOLD ? "border-l-4 border-l-orange-500" : ""
        }`}
      >
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            {match.supplier?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={match.supplier.logo_url}
                alt=""
                className="w-10 h-10 rounded-lg object-cover border border-white/10 shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center text-xs font-semibold text-slate-300 shrink-0">
                {getInitials(companyName)}
              </div>
            )}
            <div className="min-w-0">
              <h3 className="font-semibold text-white truncate">
                {flag ? `${flag} ` : ""}
                {companyName}
              </h3>
              {match.product_name && (
                <p className="text-sm text-slate-400 mt-0.5 truncate">{match.product_name}</p>
              )}
            </div>
          </div>
          <MatchPipelineBadge match={match} />
        </div>

        <div className="mt-3">
          <MatchScoreBar score={score} />
        </div>

        {match.match_summary && (
          <p className="mt-3 text-sm text-slate-300 leading-relaxed">{match.match_summary}</p>
        )}

        {certs.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {certs.map((c) => (
              <span key={c} className="text-xs px-2.5 py-1 rounded-full bg-white/5 text-slate-300">
                {c}
              </span>
            ))}
          </div>
        )}

        {interestError && <p className="mt-3 text-xs text-red-400">{interestError}</p>}

        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleInterested}
            disabled={interested || sendingInterest}
            className={`text-sm font-medium px-4 py-2 rounded-lg transition disabled:opacity-70 ${
              interested
                ? "bg-green-500/10 text-green-300 cursor-default"
                : "bg-orange-500 hover:bg-orange-600 text-white"
            }`}
          >
            {interested ? "Interest sent ✓" : sendingInterest ? "Sending…" : "I'm interested in this supplier →"}
          </button>

          <button
            type="button"
            onClick={() => setInfoModalOpen(true)}
            className="text-sm font-medium px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 transition"
          >
            Request more info
          </button>

          <button
            type="button"
            onClick={() => setDetailsOpen(true)}
            className="text-sm font-medium text-orange-400 hover:text-orange-300 ml-auto"
          >
            View details →
          </button>
        </div>
      </div>

      {detailsOpen && (
        <MatchDetailsPanel match={match} viewerRole="buyer" onClose={() => setDetailsOpen(false)} />
      )}
      {infoModalOpen && <RequestInfoModal matchId={match.id} onClose={() => setInfoModalOpen(false)} />}
    </>
  );
}
