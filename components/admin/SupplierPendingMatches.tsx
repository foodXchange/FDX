"use client";

import { useState, useTransition } from "react";
import { respondToMatchOnBehalf } from "@/app/admin/suppliers/actions";

interface PendingMatch {
  id: string;
  match_score: number | null;
  status: string | null;
  created_at: string;
  sourcing_requests:
    | {
        id: string;
        product_name: string | null;
        category: string | null;
        company: string | null;
      }[]
    | null;
}

export default function SupplierPendingMatches({
  supplierId,
  matches,
}: {
  supplierId: string;
  matches: PendingMatch[];
}) {
  const [resolved, setResolved] = useState<Record<string, "interested" | "not_interested">>({});
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (matches.length === 0) return null;

  function handleRespond(matchId: string, interested: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await respondToMatchOnBehalf(matchId, supplierId, interested);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setResolved((prev) => ({ ...prev, [matchId]: interested ? "interested" : "not_interested" }));
    });
  }

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-5">
      <h2 className="text-sm font-semibold text-gray-800 mb-3">
        Pending buyer matches — respond on behalf of supplier
      </h2>
      {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
      <div className="space-y-2">
        {matches.map((match) => {
          const request = match.sourcing_requests?.[0] ?? null;
          const status = resolved[match.id];
          return (
            <div
              key={match.id}
              className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 px-4 py-3"
            >
              <div className="text-sm text-gray-700">
                <span className="font-medium text-gray-900">
                  {request?.product_name ?? "Untitled request"}
                </span>
                {request?.category && (
                  <span className="text-gray-400"> · {request.category}</span>
                )}
                {request?.company && (
                  <span className="text-gray-400"> · {request.company}</span>
                )}
                {match.match_score !== null && (
                  <span className="text-gray-400"> · Score {match.match_score}</span>
                )}
              </div>
              {status ? (
                <span className="text-xs font-medium text-gray-500">
                  {status === "interested" ? "Marked interested" : "Marked not interested"}
                </span>
              ) : (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => handleRespond(match.id, true)}
                    className="text-xs font-medium px-3 py-1.5 rounded-full bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-50"
                  >
                    👍 Interested
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => handleRespond(match.id, false)}
                    className="text-xs font-medium px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50"
                  >
                    👎 Not interested
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
