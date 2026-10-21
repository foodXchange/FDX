"use client";

import { useState } from "react";
import BuyerMatchCard, { type BuyerMatch } from "./BuyerMatchCard";
import BuyerMatchCompareMatrix from "./BuyerMatchCompareMatrix";

interface Props {
  matches: BuyerMatch[];
  buyerCompany: string;
}

export default function BuyerMatchesContainer({ matches, buyerCompany }: Props) {
  // Default to matrix view if 2 or more matches exist, otherwise detailed cards
  const [viewMode, setViewMode] = useState<"matrix" | "cards">(
    matches.length >= 2 ? "matrix" : "cards"
  );

  if (matches.length === 0) {
    return (
      <div className="dark-card p-6 text-sm text-slate-400">
        Waiting for our team to match you with suppliers.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* View Switcher & Counter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-800">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
            Matched Factories ({matches.length})
          </h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
            CIF Haifa / Ashdod Verified
          </span>
        </div>

        {matches.length >= 2 && (
          <div className="inline-flex rounded-xl border border-slate-700 bg-slate-900 p-1 shadow-md self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setViewMode("matrix")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === "matrix"
                  ? "bg-orange-500 text-white shadow-md shadow-orange-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span>📊 Comparison Matrix</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === "cards"
                  ? "bg-orange-500 text-white shadow-md shadow-orange-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span>🗂️ Detailed Cards</span>
            </button>
          </div>
        )}
      </div>

      {/* Render selected view */}
      {viewMode === "matrix" ? (
        <BuyerMatchCompareMatrix matches={matches} buyerCompany={buyerCompany} />
      ) : (
        <div className="space-y-3">
          {matches.map((m) => (
            <BuyerMatchCard key={m.id} match={m} />
          ))}
        </div>
      )}
    </div>
  );
}
