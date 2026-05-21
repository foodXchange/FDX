"use client";

import { useState, useTransition } from "react";
import type { RequestRow } from "@/app/admin/requests/page";
import { updateRequestStatus } from "@/app/admin/requests/actions";
import type { SupplierMatch } from "@/lib/matching/matchSuppliers";

interface Props {
  request: RequestRow | null;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => void;
  onMatchComplete: (id: string, count: number) => void;
}

const STATUS_OPTIONS = ["new", "reviewed", "matched", "closed"] as const;
const WHATSAPP = "972525222291";

function ScoreChip({ score }: { score: number }) {
  const cls =
    score >= 20
      ? "bg-green-100 text-green-700"
      : score >= 10
      ? "bg-orange-100 text-orange-700"
      : "bg-gray-100 text-gray-600";
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cls}`}>
      {score}pt
    </span>
  );
}

export default function RequestSlideOver({
  request,
  onClose,
  onStatusChange,
  onMatchComplete,
}: Props) {
  const [matchLoading, setMatchLoading] = useState(false);
  const [matches, setMatches] = useState<SupplierMatch[] | null>(null);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  if (!request) return null;

  const ai = request.ai_analysis as {
    product_name?: string | null;
    category?: string | null;
    packaging_format?: string | null;
    approximate_size?: string | null;
    certifications_visible?: string[];
    confidence?: number;
  } | null;

  const waText = encodeURIComponent(
    `Hi, following up on your sourcing request` +
      (request.product_name ? ` for ${request.product_name}` : "") +
      `. Can we discuss further?`
  );

  async function handleRunMatching() {
    setMatchLoading(true);
    setMatchError(null);
    try {
      const res = await fetch("/api/admin/match-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: request!.id }),
      });
      const data = await res.json();
      if (data.ok) {
        setMatches(data.matches as SupplierMatch[]);
        onMatchComplete(request!.id, (data.matches as SupplierMatch[]).length);
      } else {
        setMatchError(data.error ?? "Matching failed");
      }
    } catch {
      setMatchError("Network error");
    } finally {
      setMatchLoading(false);
    }
  }

  function handleStatusChange(newStatus: string) {
    startTransition(async () => {
      const result = await updateRequestStatus(request!.id, newStatus);
      if (result.ok) onStatusChange(request!.id, newStatus);
    });
  }

  const sHdr = "text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3";

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[480px] max-w-full bg-white shadow-2xl z-50 flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
          <div>
            <p className="text-sm font-semibold text-gray-900">{request.name ?? "Unknown buyer"}</p>
            {request.company && (
              <p className="text-xs text-gray-400 mt-0.5">{request.company}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none transition"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">

          {/* Status */}
          <section>
            <h3 className={sHdr}>Status</h3>
            <div className="flex gap-2 flex-wrap">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleStatusChange(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition capitalize ${
                    request.status === s
                      ? s === "new"
                        ? "bg-blue-500 text-white"
                        : s === "reviewed"
                        ? "bg-yellow-500 text-white"
                        : s === "matched"
                        ? "bg-green-500 text-white"
                        : "bg-gray-500 text-white"
                      : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </section>

          {/* Section 1 — Contact */}
          <section>
            <h3 className={sHdr}>Contact</h3>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-50">
                {[
                  ["Name", request.name ?? "—"],
                  ["Email", request.email],
                  ["Company", request.company ?? "—"],
                  ["Source", request.source ?? "—"],
                ].map(([label, val]) => (
                  <tr key={label}>
                    <td className="py-2 pr-4 text-gray-400 text-xs w-20 shrink-0">{label}</td>
                    <td className="py-2 text-xs text-gray-800">
                      {label === "Email" && val ? (
                        <a href={`mailto:${val}`} className="text-orange-600 hover:underline">
                          {val}
                        </a>
                      ) : (
                        val ?? "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* Section 2 — Images */}
          {request.images.length > 0 && (
            <section>
              <h3 className={sHdr}>Images ({request.images.length})</h3>
              <div className="grid grid-cols-3 gap-2">
                {request.images.map((img, i) => (
                  <a
                    key={i}
                    href={img.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block aspect-square rounded-xl overflow-hidden bg-slate-100 hover:opacity-90 transition"
                  >
                    <img
                      src={img.url}
                      alt={`Image ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* Section 3 — Request details */}
          <section>
            <h3 className={sHdr}>Request</h3>
            <div className="space-y-2">
              {[
                ["Product", request.product_name],
                ["Category", request.category],
                ["Market", request.target_market],
              ].map(([label, val]) =>
                val ? (
                  <div key={label} className="flex gap-2 items-center">
                    <span className="text-xs text-gray-400 w-20 shrink-0">{label}</span>
                    <span className="text-xs bg-orange-50 text-orange-700 border border-orange-200 rounded-full px-3 py-0.5">
                      {val}
                    </span>
                  </div>
                ) : null
              )}
              {request.private_label !== null && (
                <div className="flex gap-2 items-center">
                  <span className="text-xs text-gray-400 w-20 shrink-0">Private label</span>
                  <span className="text-xs bg-orange-50 text-orange-700 border border-orange-200 rounded-full px-3 py-0.5">
                    {request.private_label ? "Yes" : "No"}
                  </span>
                </div>
              )}
              {(request.certifications?.length ?? 0) > 0 && (
                <div className="flex gap-2 items-start">
                  <span className="text-xs text-gray-400 w-20 shrink-0 pt-0.5">Certs</span>
                  <div className="flex flex-wrap gap-1">
                    {request.certifications!.map((c) => (
                      <span
                        key={c}
                        className="text-xs bg-green-50 text-green-700 border border-green-200 rounded-full px-2 py-0.5"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {request.message && (
              <div className="mt-3 bg-slate-50 rounded-xl p-3 text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
                {request.message}
              </div>
            )}
          </section>

          {/* Section 4 — AI Analysis */}
          {ai && (
            <section>
              <h3 className={sHdr}>AI Analysis</h3>
              <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 space-y-2">
                {[
                  ["Product", ai.product_name],
                  ["Category", ai.category],
                  ["Packaging", ai.packaging_format],
                  ["Size", ai.approximate_size],
                ].map(([label, val]) =>
                  val ? (
                    <div key={label} className="flex gap-2 items-center">
                      <span className="text-xs text-orange-500 w-20 shrink-0">{label}</span>
                      <span className="text-xs text-orange-800">{val as string}</span>
                    </div>
                  ) : null
                )}
                {(ai.certifications_visible?.length ?? 0) > 0 && (
                  <div className="flex gap-2 items-start">
                    <span className="text-xs text-orange-500 w-20 shrink-0 pt-0.5">Certs seen</span>
                    <div className="flex flex-wrap gap-1">
                      {ai.certifications_visible!.map((c) => (
                        <span
                          key={c}
                          className="text-xs bg-white border border-orange-200 text-orange-700 rounded-full px-2 py-0.5"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {typeof ai.confidence === "number" && (
                  <div className="flex gap-2 items-center">
                    <span className="text-xs text-orange-500 w-20 shrink-0">Confidence</span>
                    <div className="flex-1 bg-orange-200 rounded-full h-1.5">
                      <div
                        className="bg-orange-500 h-1.5 rounded-full"
                        style={{ width: `${Math.round(ai.confidence * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-orange-700 ml-1 shrink-0">
                      {Math.round(ai.confidence * 100)}%
                    </span>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Section 5 — Matched Suppliers */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className={sHdr}>Matched Suppliers</h3>
              <button
                type="button"
                onClick={handleRunMatching}
                disabled={matchLoading}
                className="text-xs px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium disabled:opacity-50 transition flex items-center gap-1.5"
              >
                {matchLoading ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Matching…
                  </>
                ) : (
                  "Run matching"
                )}
              </button>
            </div>

            {matchError && (
              <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-2">
                {matchError}
              </p>
            )}

            {matches !== null && matches.length === 0 && (
              <p className="text-xs text-gray-400">No matching suppliers found.</p>
            )}

            {matches !== null && matches.length > 0 && (
              <div className="space-y-2">
                {matches.map((m) => (
                  <div
                    key={m.supplier_id}
                    className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-medium text-gray-900 truncate">
                          {m.company_name}
                        </p>
                        {m.country_of_origin && (
                          <span className="text-xs text-gray-400 shrink-0">
                            {m.country_of_origin}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {m.match_reasons.map((r, i) => (
                          <span
                            key={i}
                            className="text-xs bg-white border border-slate-200 text-slate-600 rounded-full px-2 py-0.5"
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    </div>
                    <ScoreChip score={m.score} />
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-slate-100 p-4 flex gap-2">
          {request.email && (
            <a
              href={`mailto:${request.email}`}
              className="flex-1 text-center bg-orange-500 hover:bg-orange-600 text-white rounded-lg px-3 py-2 text-xs font-semibold transition"
            >
              Email
            </a>
          )}
          <a
            href={`https://wa.me/${WHATSAPP}?text=${waText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center bg-green-500 hover:bg-green-600 text-white rounded-lg px-3 py-2 text-xs font-semibold transition"
          >
            WhatsApp
          </a>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            Close
          </button>
        </div>

      </div>
    </>
  );
}
