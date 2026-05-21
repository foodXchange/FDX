"use client";

import { useState, useTransition } from "react";
import type { RequestRow } from "@/app/admin/requests/page";
import { updateRequestStatus } from "@/app/admin/requests/actions";

type MatchResult = {
  title: string;
  slug: string;
  score: number;
  hero_image: string | null;
  category: string | null;
};

interface RequestSlideOverProps {
  request: RequestRow | null;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => void;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_OPTIONS = ["new", "contacted", "matched", "closed"] as const;

export default function RequestSlideOver({
  request,
  onClose,
  onStatusChange,
}: RequestSlideOverProps) {
  const [matchLoading, setMatchLoading] = useState(false);
  const [matches, setMatches] = useState<MatchResult[] | null>(null);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  if (!request) return null;

  const aiAnalysis = request.ai_analysis as {
    product_name?: string | null;
    category?: string | null;
    packaging_format?: string | null;
    certifications_visible?: string[];
    confidence?: number;
  } | null;

  const waNumber = "972525222291";
  const waText = encodeURIComponent(
    `Hi, I wanted to follow up on your sourcing request${
      request.product_name ? ` for ${request.product_name}` : ""
    }. Can we discuss further?`
  );

  async function handleFindMatches() {
    setMatchLoading(true);
    setMatchError(null);
    setMatches(null);
    try {
      const res = await fetch("/api/admin/sourcing/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: request!.id }),
      });
      const data = await res.json();
      if (data.ok) {
        setMatches(data.matches);
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

  const sectionHdr = "text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3";

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0">
          <div>
            <p className="text-sm font-semibold text-gray-900">{request.name ?? "—"}</p>
            {request.company && (
              <p className="text-xs text-gray-400 mt-0.5">{request.company}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-light leading-none transition"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Status */}
          <section>
            <h3 className={sectionHdr}>Status</h3>
            <div className="flex gap-2 flex-wrap">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleStatusChange(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                    request.status === s
                      ? s === "new"
                        ? "bg-orange-500 text-white"
                        : s === "contacted"
                        ? "bg-blue-500 text-white"
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

          {/* Contact details */}
          <section>
            <h3 className={sectionHdr}>Contact details</h3>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-50">
                <tr>
                  <td className="py-2 pr-4 text-gray-400 w-28 shrink-0">Name</td>
                  <td className="py-2 text-gray-900 font-medium">{request.name ?? "—"}</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 text-gray-400">Email</td>
                  <td className="py-2">
                    {request.email ? (
                      <a href={`mailto:${request.email}`} className="text-orange-600 hover:underline">
                        {request.email}
                      </a>
                    ) : "—"}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 text-gray-400">Company</td>
                  <td className="py-2 text-gray-700">{request.company ?? "—"}</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 text-gray-400">Source</td>
                  <td className="py-2 text-gray-500 text-xs">{request.source ?? "—"}</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 text-gray-400">Date</td>
                  <td className="py-2 text-gray-500 text-xs">{formatDate(request.created_at)}</td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* Request details */}
          <section>
            <h3 className={sectionHdr}>Request</h3>
            <div className="space-y-2">
              {request.product_name && (
                <div className="flex gap-2 items-center">
                  <span className="text-xs text-gray-400 w-28 shrink-0">Product</span>
                  <span className="text-xs bg-orange-50 text-orange-700 border border-orange-200 rounded-full px-3 py-1">{request.product_name}</span>
                </div>
              )}
              {request.category && (
                <div className="flex gap-2 items-center">
                  <span className="text-xs text-gray-400 w-28 shrink-0">Category</span>
                  <span className="text-xs bg-orange-50 text-orange-700 border border-orange-200 rounded-full px-3 py-1">{request.category}</span>
                </div>
              )}
              {request.target_market && (
                <div className="flex gap-2 items-center">
                  <span className="text-xs text-gray-400 w-28 shrink-0">Market</span>
                  <span className="text-xs bg-orange-50 text-orange-700 border border-orange-200 rounded-full px-3 py-1">{request.target_market}</span>
                </div>
              )}
              {request.private_label !== null && (
                <div className="flex gap-2 items-center">
                  <span className="text-xs text-gray-400 w-28 shrink-0">Private label</span>
                  <span className="text-xs bg-orange-50 text-orange-700 border border-orange-200 rounded-full px-3 py-1">
                    {request.private_label ? "Yes" : "No"}
                  </span>
                </div>
              )}
              {(request.certifications?.length ?? 0) > 0 && (
                <div className="flex gap-2 items-start">
                  <span className="text-xs text-gray-400 w-28 shrink-0 pt-1">Certs</span>
                  <div className="flex flex-wrap gap-1.5">
                    {request.certifications!.map((c) => (
                      <span key={c} className="text-xs bg-green-50 text-green-700 border border-green-200 rounded-full px-3 py-1">{c}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {request.message && (
              <div className="mt-3 bg-slate-50 rounded-xl p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {request.message}
              </div>
            )}
          </section>

          {/* Images */}
          {request.images.length > 0 && (
            <section>
              <h3 className={sectionHdr}>Images ({request.images.length})</h3>
              <div className="grid grid-cols-3 gap-2">
                {request.images.map((url, idx) => (
                  <a
                    key={idx}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block aspect-square rounded-xl overflow-hidden bg-slate-100 hover:opacity-90 transition"
                  >
                    <img src={url} alt={`Image ${idx + 1}`} className="w-full h-full object-cover" />
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* AI analysis */}
          {aiAnalysis && (
            <section>
              <h3 className={sectionHdr}>AI analysis</h3>
              <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 space-y-2">
                {aiAnalysis.product_name && (
                  <div className="flex gap-2 items-center">
                    <span className="text-xs text-orange-500 w-24 shrink-0">Product</span>
                    <span className="text-xs font-medium text-orange-800">{aiAnalysis.product_name}</span>
                  </div>
                )}
                {aiAnalysis.category && (
                  <div className="flex gap-2 items-center">
                    <span className="text-xs text-orange-500 w-24 shrink-0">Category</span>
                    <span className="text-xs text-orange-800">{aiAnalysis.category}</span>
                  </div>
                )}
                {aiAnalysis.packaging_format && (
                  <div className="flex gap-2 items-center">
                    <span className="text-xs text-orange-500 w-24 shrink-0">Packaging</span>
                    <span className="text-xs text-orange-800">{aiAnalysis.packaging_format}</span>
                  </div>
                )}
                {(aiAnalysis.certifications_visible?.length ?? 0) > 0 && (
                  <div className="flex gap-2 items-start">
                    <span className="text-xs text-orange-500 w-24 shrink-0 pt-0.5">Certs seen</span>
                    <div className="flex flex-wrap gap-1">
                      {aiAnalysis.certifications_visible!.map((c) => (
                        <span key={c} className="text-xs bg-white border border-orange-200 text-orange-700 rounded-full px-2 py-0.5">{c}</span>
                      ))}
                    </div>
                  </div>
                )}
                {typeof aiAnalysis.confidence === "number" && (
                  <div className="flex gap-2 items-center">
                    <span className="text-xs text-orange-500 w-24 shrink-0">Confidence</span>
                    <div className="flex-1 bg-orange-200 rounded-full h-1.5">
                      <div
                        className="bg-orange-500 h-1.5 rounded-full"
                        style={{ width: `${Math.round(aiAnalysis.confidence * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-orange-700 ml-1">{Math.round(aiAnalysis.confidence * 100)}%</span>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Portfolio matches */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className={sectionHdr}>Portfolio matches</h3>
              <button
                type="button"
                onClick={handleFindMatches}
                disabled={matchLoading}
                className="text-xs px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium disabled:opacity-50 transition"
              >
                {matchLoading ? "Matching…" : "Find matches"}
              </button>
            </div>

            {matchError && (
              <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{matchError}</p>
            )}

            {matches !== null && matches.length === 0 && (
              <p className="text-xs text-gray-400">No matching scenarios found.</p>
            )}

            {matches !== null && matches.length > 0 && (
              <div className="space-y-2">
                {matches.map((m) => (
                  <a
                    key={m.slug}
                    href={`/en/portfolio/${m.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition group"
                  >
                    {m.hero_image && (
                      <img
                        src={m.hero_image}
                        alt={m.title}
                        className="w-10 h-10 rounded-lg object-cover shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate group-hover:text-orange-600">{m.title}</p>
                      {m.category && <p className="text-xs text-gray-400">{m.category}</p>}
                    </div>
                    <span className="text-xs font-semibold text-orange-600 shrink-0">
                      {m.score}pt
                    </span>
                  </a>
                ))}
              </div>
            )}
          </section>

        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-slate-100 p-4 flex gap-3">
          {request.email && (
            <a
              href={`mailto:${request.email}`}
              className="flex-1 text-center bg-orange-500 hover:bg-orange-600 text-white rounded-lg px-4 py-2 text-sm font-semibold transition"
            >
              Email
            </a>
          )}
          <a
            href={`https://wa.me/${waNumber}?text=${waText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center bg-green-500 hover:bg-green-600 text-white rounded-lg px-4 py-2 text-sm font-semibold transition"
          >
            WhatsApp
          </a>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border border-slate-200 rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            Close
          </button>
        </div>

      </div>
    </>
  );
}
