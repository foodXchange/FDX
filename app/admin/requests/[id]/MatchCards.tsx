"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SavedMatch } from "./page";

interface Props {
  requestId: string;
  initialMatches: SavedMatch[];
  productName: string;
  company: string | null;
}

type MatchStatus = "pending" | "approved" | "rejected" | "sent";

interface LocalMatch extends SavedMatch {
  localStatus: MatchStatus;
}

function scoreBadgeClass(score: number): string {
  if (score >= 70) return "bg-green-100 text-green-700";
  if (score >= 50) return "bg-orange-100 text-orange-700";
  return "bg-red-100 text-red-700";
}

function ScoreChip({ label, pts, max }: { label: string; pts: number; max: number }) {
  const pct = pts / max;
  const cls =
    pct >= 0.7
      ? "bg-green-50 text-green-700 border-green-200"
      : pct >= 0.4
      ? "bg-orange-50 text-orange-700 border-orange-200"
      : "bg-red-50 text-red-600 border-red-200";
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${cls}`}>
      {label} {pts}/{max}
    </span>
  );
}

export default function MatchCards({ requestId, initialMatches, productName, company }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [matches, setMatches] = useState<LocalMatch[]>(
    initialMatches.map((m) => ({ ...m, localStatus: m.status as MatchStatus }))
  );
  const [isRunning, setIsRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);

  async function patchMatch(matchId: string, action: "approve" | "reject" | "send") {
    const newStatus: MatchStatus =
      action === "approve" ? "approved" : action === "reject" ? "rejected" : "sent";

    setMatches((prev) =>
      prev.map((m) => (m.id === matchId ? { ...m, localStatus: newStatus } : m))
    );
    try {
      const res = await fetch(`/api/matching/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const { error } = (await res.json()) as { error?: string };
        throw new Error(error ?? "Request failed");
      }
    } catch {
      // Revert optimistic update on failure
      setMatches((prev) =>
        prev.map((m) =>
          m.id === matchId ? { ...m, localStatus: m.status as MatchStatus } : m
        )
      );
    }
  }

  async function runMatching() {
    setIsRunning(true);
    setRunError(null);
    try {
      const res = await fetch("/api/matching/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request_id: requestId }),
      });
      if (!res.ok) {
        const { error } = (await res.json()) as { error?: string };
        throw new Error(error ?? "Matching failed");
      }
      startTransition(() => router.refresh());
    } catch (err) {
      setRunError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsRunning(false);
    }
  }

  function openWhatsApp(waMsg: string | null) {
    if (!waMsg) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(waMsg)}`, "_blank");
  }

  if (matches.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-10 shadow-sm flex flex-col items-center gap-4">
        <p className="text-gray-500 text-sm">No matches yet for this request.</p>
        {runError && <p className="text-red-500 text-xs">{runError}</p>}
        <button
          onClick={runMatching}
          disabled={isRunning}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
        >
          {isRunning ? (
            <>
              <Spinner />
              Finding suppliers…
            </>
          ) : (
            "Find suppliers"
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">
          {matches.length} match{matches.length !== 1 ? "es" : ""}
        </h2>
        <button
          onClick={runMatching}
          disabled={isRunning || isPending}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 disabled:opacity-50 transition-colors border border-slate-200 rounded-lg px-3 py-1.5"
        >
          {isRunning || isPending ? (
            <>
              <Spinner size="sm" />
              Re-running…
            </>
          ) : (
            "↺ Re-run matching"
          )}
        </button>
      </div>

      {runError && (
        <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {runError}
        </p>
      )}

      {matches.map((match, idx) => {
        const isRejected = match.localStatus === "rejected";
        const isApproved = match.localStatus === "approved";
        const isSent = match.localStatus === "sent";
        const breakdown = match.match_breakdown;
        const kosherTypes = breakdown?.kosher_types ?? [];
        const certs = breakdown?.certifications ?? [];
        const hasV1Breakdown =
          breakdown !== null &&
          breakdown !== undefined &&
          typeof breakdown.category === "number";

        return (
          <div
            key={match.id}
            className={`bg-white border rounded-2xl p-5 shadow-sm transition-opacity ${
              isRejected ? "opacity-40" : "opacity-100"
            } ${isApproved || isSent ? "border-green-300 ring-1 ring-green-200" : "border-gray-200"}`}
          >
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-gray-400">#{idx + 1}</span>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${scoreBadgeClass(
                    match.match_score
                  )}`}
                >
                  {match.match_score}/100
                </span>
                {isApproved && (
                  <span className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                    Approved
                  </span>
                )}
                {isSent && (
                  <span className="text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
                    Sent
                  </span>
                )}
                {isRejected && (
                  <span className="text-xs font-semibold text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full">
                    Rejected
                  </span>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                {match.whatsapp_message && (
                  <button
                    onClick={() => openWhatsApp(match.whatsapp_message)}
                    className="text-xs text-green-700 hover:text-green-900 border border-green-200 hover:border-green-400 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    WhatsApp ↗
                  </button>
                )}
                {match.localStatus !== "approved" && match.localStatus !== "sent" && (
                  <button
                    onClick={() => patchMatch(match.id, "approve")}
                    className="text-xs text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Approve
                  </button>
                )}
                {match.localStatus === "approved" && (
                  <button
                    onClick={() => patchMatch(match.id, "send")}
                    className="text-xs text-white bg-purple-600 hover:bg-purple-700 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Send
                  </button>
                )}
                {match.localStatus !== "rejected" && (
                  <button
                    onClick={() => patchMatch(match.id, "reject")}
                    className="text-xs text-red-600 hover:text-red-800 border border-red-200 hover:border-red-400 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Reject
                  </button>
                )}
              </div>
            </div>

            {/* Product & supplier info */}
            <div className="mt-3">
              <p className="text-sm font-semibold text-gray-900">{match.product_name}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {match.company_name}
                {match.country ? ` · ${match.country}` : ""}
              </p>
            </div>

            {/* v1 score breakdown chips */}
            {hasV1Breakdown && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                <ScoreChip label="Cat" pts={breakdown!.category!} max={40} />
                <ScoreChip label="Fmt" pts={breakdown!.format!} max={20} />
                <ScoreChip label="Cert" pts={breakdown!.compliance!} max={20} />
                <ScoreChip label="Evid" pts={breakdown!.evidence!} max={20} />
              </div>
            )}

            {/* Legacy chips (old TS-engine breakdown) */}
            {!hasV1Breakdown && (kosherTypes.length > 0 || certs.length > 0) && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {kosherTypes.slice(0, 2).map((k) => (
                  <span
                    key={k}
                    className="text-xs bg-orange-50 text-orange-700 border border-orange-200 rounded-full px-2.5 py-0.5"
                  >
                    ✡ {k}
                  </span>
                ))}
                {certs.slice(0, 3).map((c) => (
                  <span
                    key={c}
                    className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2.5 py-0.5"
                  >
                    {c}
                  </span>
                ))}
              </div>
            )}

            {/* Match summary */}
            {match.match_summary && (
              <p className="mt-3 text-xs text-gray-500 leading-relaxed border-t border-gray-100 pt-3">
                {match.match_summary}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Spinner({ size = "md" }: { size?: "sm" | "md" }) {
  const cls = size === "sm" ? "h-3 w-3" : "h-4 w-4";
  return (
    <svg
      className={`${cls} animate-spin text-current`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
