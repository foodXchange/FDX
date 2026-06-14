"use client";

import { useState } from "react";
import type { SupplierMatch } from "./types";
import MatchPipelineBadge from "./MatchPipelineBadge";
import MatchScoreBar from "./MatchScoreBar";
import MatchDetailsPanel from "./MatchDetailsPanel";
import { cleanRequestName } from "@/lib/matching/cleanRequestName";

export default function MatchCard({ match, viewerRole }: { match: SupplierMatch; viewerRole: "supplier" | "buyer" }) {
  const [open, setOpen] = useState(false);
  const request = match.sourcing_requests;

  let title: string;
  let subtitle: string | null;
  let chips: { label: string; className: string }[];

  if (viewerRole === "buyer") {
    title = match.company_name || "Supplier";
    subtitle = [match.country, match.product_name].filter(Boolean).join(" · ") || null;
    chips = Array.from(
      new Set([...(match.match_breakdown?.certifications ?? []), ...(match.match_breakdown?.kosher_types ?? [])])
    ).map((label) => ({ label, className: "bg-white/5 text-slate-300" }));
  } else {
    const rawName = request?.product_name ?? "";
    const cleanedName = rawName ? cleanRequestName(rawName) : "";
    title = cleanedName || rawName || request?.message?.slice(0, 60) || "Sourcing request";
    subtitle = request?.company ?? null;
    const certs = request?.certifications ?? [];
    const hasKosher = certs.some((c) => c.toLowerCase().includes("kosher"));
    chips = [
      ...(request?.category ? [{ label: request.category, className: "bg-orange-500/10 text-orange-300" }] : []),
      ...(hasKosher ? [{ label: "✡ Kosher required", className: "bg-blue-500/10 text-blue-300" }] : []),
      ...(request?.volume ? [{ label: `Volume: ${request.volume}`, className: "bg-white/5 text-slate-300" }] : []),
    ];
  }

  return (
    <>
      <div className="dark-card p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h3 className="font-semibold text-white">{title}</h3>
            {subtitle && <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          <MatchPipelineBadge match={match} />
        </div>

        {chips.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {chips.map((c) => (
              <span key={c.label} className={`text-xs px-2.5 py-1 rounded-full ${c.className}`}>
                {c.label}
              </span>
            ))}
          </div>
        )}

        <div className="mt-4">
          <MatchScoreBar score={match.match_score ?? 0} />
        </div>

        {match.supplier_message && <p className="mt-3 text-sm text-slate-300 line-clamp-2">{match.supplier_message}</p>}

        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            {new Date(match.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          </p>
          <button onClick={() => setOpen(true)} className="text-sm font-medium text-orange-400 hover:text-orange-300">
            View details →
          </button>
        </div>
      </div>

      {open && <MatchDetailsPanel match={match} viewerRole={viewerRole} onClose={() => setOpen(false)} />}
    </>
  );
}
