"use client";

import { useState } from "react";
import Image from "next/image";
import type { BuyerMatch } from "./BuyerMatchCard";
import { countryToFlag } from "@/lib/admin/countryFlag";
import SampleRequestModal from "./SampleRequestModal";

interface Props {
  matches: BuyerMatch[];
  buyerCompany?: string;
  onRequestUpdated?: () => void;
}

export default function BuyerMatchCompareMatrix({
  matches,
  buyerCompany = "",
  onRequestUpdated,
}: Props) {
  const [selectedForSample, setSelectedForSample] = useState<BuyerMatch | null>(null);
  const [requestedMatchIds, setRequestedMatchIds] = useState<Set<string>>(new Set());

  // Show top 4 matches in side-by-side columns
  const displayMatches = matches.slice(0, 4);

  function handleSampleSuccess(matchId: string) {
    setRequestedMatchIds((prev) => new Set([...prev, matchId]));
    if (onRequestUpdated) onRequestUpdated();
  }

  if (matches.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto border border-slate-700/80 rounded-3xl bg-slate-900/90 shadow-2xl backdrop-blur-md">
        <table className="w-full text-left text-xs border-collapse min-w-[650px]">
          <thead>
            {/* Top Factory Header Row */}
            <tr className="border-b border-slate-800 bg-slate-950/80">
              <th className="p-4 sm:p-5 w-48 text-slate-400 font-bold uppercase tracking-wider text-[11px] align-top">
                Factory &amp; Match Spec
              </th>
              {displayMatches.map((m) => {
                const flag = countryToFlag(m.country);
                const score = m.match_score ?? 0;
                const isRequested = requestedMatchIds.has(m.id) || !!(m.match_breakdown as Record<string, unknown> | null)?.sample_request;

                return (
                  <th key={m.id} className="p-4 sm:p-5 text-white align-top border-l border-slate-800/80">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-base">{flag}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                            score >= 80
                              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                              : "bg-orange-500/15 text-orange-400 border-orange-500/30"
                          }`}
                        >
                          {score}% Match
                        </span>
                      </div>

                      <div className="font-extrabold text-sm text-white line-clamp-1">
                        {m.company_name}
                      </div>

                      <div className="text-[11px] text-slate-400 font-medium">
                        {m.country || "European Union"}
                      </div>

                      {/* 1-Click Action */}
                      <button
                        type="button"
                        onClick={() => setSelectedForSample(m)}
                        className={`w-full py-2 px-3 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md ${
                          isRequested
                            ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 cursor-default"
                            : "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-orange-500/20"
                        }`}
                      >
                        <span>{isRequested ? "✓" : "🥄"}</span>
                        <span>{isRequested ? "Samples Requested" : "Request Tasting Samples"}</span>
                      </button>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800/80 text-slate-300">
            {/* Product & Format */}
            <tr>
              <td className="p-4 font-bold text-slate-400 bg-slate-950/40">
                Matched Product &amp; Spec
              </td>
              {displayMatches.map((m) => (
                <td key={m.id} className="p-4 border-l border-slate-800/80 align-top">
                  <div className="space-y-1">
                    <div className="font-semibold text-white">
                      {m.product_name || m.product?.product_name || "Custom Food Specification"}
                    </div>
                    {m.product?.formats && m.product.formats.length > 0 && (
                      <div className="text-[11px] text-slate-400">
                        Format: {m.product.formats.join(", ")}
                      </div>
                    )}
                    {m.product?.description && (
                      <div className="text-[11px] text-slate-500 line-clamp-2">
                        {m.product.description}
                      </div>
                    )}
                  </div>
                </td>
              ))}
            </tr>

            {/* GFSI Food Safety Standard */}
            <tr>
              <td className="p-4 font-bold text-slate-400 bg-slate-950/40">
                GFSI Food Safety Audit
              </td>
              {displayMatches.map((m) => {
                const certs = [
                  ...(m.supplier?.certifications ?? []),
                  ...(m.product?.certifications ?? []),
                  ...(m.match_breakdown?.certifications ?? []),
                ].filter(Boolean);
                const gfsiList = Array.from(new Set(certs)).filter((c) =>
                  ["brc", "ifs", "fssc", "iso 22000", "haccp"].some((k) =>
                    c.toLowerCase().includes(k)
                  )
                );

                return (
                  <td key={m.id} className="p-4 border-l border-slate-800/80 align-top">
                    {gfsiList.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {gfsiList.map((g, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-300 border border-blue-500/20 font-bold text-[10px]"
                          >
                            🛡️ {g}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-500 text-[11px]">EU Standard Certified</span>
                    )}
                  </td>
                );
              })}
            </tr>

            {/* Kosher Status */}
            <tr>
              <td className="p-4 font-bold text-slate-400 bg-slate-950/40">
                Kosher Agency Recognition
              </td>
              {displayMatches.map((m) => {
                const kosherTypes = [
                  ...(m.supplier?.kosher_types ?? []),
                  ...(m.product?.kosher_types ?? []),
                  ...(m.match_breakdown?.kosher_types ?? []),
                ].filter(Boolean);
                const uniqueKosher = Array.from(new Set(kosherTypes));

                return (
                  <td key={m.id} className="p-4 border-l border-slate-800/80 align-top">
                    {uniqueKosher.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {uniqueKosher.map((k, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-bold text-[10px]"
                          >
                            ✡ {k}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-[11px]">
                        Kosher Auditable (Chief Rabbinate Pathway)
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>

            {/* MOQ (Container Volume) */}
            <tr>
              <td className="p-4 font-bold text-slate-400 bg-slate-950/40">
                Minimum Order Quantity (MOQ)
              </td>
              {displayMatches.map((m) => {
                const moq =
                  m.supplier?.moq_description ||
                  (m.supplier?.moq_units ? `${m.supplier.moq_units.toLocaleString()} units` : "1 x 20ft FCL (~24,000 units)");

                return (
                  <td key={m.id} className="p-4 border-l border-slate-800/80 font-semibold text-slate-200">
                    📦 {moq}
                  </td>
                );
              })}
            </tr>

            {/* Ocean Transit to Israel */}
            <tr>
              <td className="p-4 font-bold text-slate-400 bg-slate-950/40">
                Ocean Freight Transit (Haifa/Ashdod)
              </td>
              {displayMatches.map((m) => {
                const country = (m.country || "").toLowerCase();
                let transit = "7–10 days (Direct Med Line)";
                if (country.includes("poland") || country.includes("germany") || country.includes("belgium")) {
                  transit = "14–18 days (North Sea / Med Feeder)";
                } else if (country.includes("turkey") || country.includes("greece")) {
                  transit = "3–5 days (Express Short Sea)";
                }

                return (
                  <td key={m.id} className="p-4 border-l border-slate-800/80 font-medium text-slate-300">
                    🚢 {transit}
                  </td>
                );
              })}
            </tr>

            {/* Physical Tasting Samples */}
            <tr>
              <td className="p-4 font-bold text-slate-400 bg-slate-950/40">
                Tasting Sample Lead Time
              </td>
              {displayMatches.map((m) => (
                <td key={m.id} className="p-4 border-l border-slate-800/80 text-emerald-400 font-semibold">
                  ⚡ 3–5 Days via DHL Express
                </td>
              ))}
            </tr>

            {/* Private Label Packaging Customization */}
            <tr>
              <td className="p-4 font-bold text-slate-400 bg-slate-950/40">
                Private Label Support
              </td>
              {displayMatches.map((m) => {
                const hasPrivateLabel = m.product?.private_label ?? m.supplier?.private_label ?? true;

                return (
                  <td key={m.id} className="p-4 border-l border-slate-800/80 font-medium text-slate-200">
                    {hasPrivateLabel ? "✓ Custom Buyer Brand & Hebrew Plate" : "Factory Brand Available"}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Sample Request Modal */}
      {selectedForSample && (
        <SampleRequestModal
          matchId={selectedForSample.id}
          factoryName={selectedForSample.company_name || "Factory Partner"}
          productName={(selectedForSample.product_name || selectedForSample.product?.product_name) ?? "Food Product"}
          defaultCompany={buyerCompany}
          isOpen={true}
          onClose={() => setSelectedForSample(null)}
          onSuccess={() => handleSampleSuccess(selectedForSample.id)}
        />
      )}
    </div>
  );
}
