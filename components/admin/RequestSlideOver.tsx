"use client";

import { useState, useTransition, useEffect } from "react";
import type { RequestRow } from "@/app/admin/requests/page";
import { updateRequestStatus } from "@/app/admin/requests/actions";
import ProductImage from "@/components/ProductImage";
import PostGenerator from "@/components/admin/PostGenerator";
import ScriptGenerator from "@/components/admin/ScriptGenerator";
import PipPanel from "@/components/admin/PipPanel";

type SavedMatch = {
  id: string;
  supplier_id: string;
  match_score: number;
  product_name: string | null;
  company_name: string | null;
  country: string | null;
  match_summary: string | null;
  whatsapp_message: string | null;
  match_breakdown: {
    kosher_types?: string[];
    certifications?: string[];
    reasons?: string[];
  } | null;
  status: string;
  image_url?: string | null;
  image_source?: string | null;
  category?: string | null;
};

interface Props {
  request: RequestRow | null;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => void;
  onMatchComplete: (id: string, count: number) => void;
}

const STATUS_OPTIONS = ["new", "reviewed", "matched", "closed"] as const;
const WHATSAPP = "972525222291";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function ScoreDisplay({ score }: { score: number }) {
  const cls =
    score >= 70
      ? "text-green-600"
      : score >= 50
      ? "text-orange-500"
      : "text-red-400";
  return <span className={`text-2xl font-bold tabular-nums ${cls}`}>{score}</span>;
}

export default function RequestSlideOver({
  request,
  onClose,
  onStatusChange,
  onMatchComplete,
}: Props) {
  const [matchLoading, setMatchLoading] = useState(false);
  const [matches, setMatches] = useState<SavedMatch[] | null>(null);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [pipReady, setPipReady] = useState(true);
  const [, startTransition] = useTransition();

  // Sourcing board publish state
  const [isPublished, setIsPublished] = useState(request?.is_published ?? false);
  const [aiEditing, setAiEditing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showEdit, setShowEdit] = useState(
    Boolean(request?.published_product_name)
  );
  const [editedName, setEditedName] = useState(
    request?.published_product_name ?? ""
  );
  const [editedMessage, setEditedMessage] = useState(
    request?.published_message ?? ""
  );
  const [publishError, setPublishError] = useState<string | null>(null);

  // Load saved matches + pip-ready status whenever the request changes
  useEffect(() => {
    if (!request?.id) {
      setMatches(null);
      setPipReady(true);
      return;
    }
    setMatches(null);
    setMatchError(null);
    const id = request.id;
    Promise.all([
      fetch(`/api/admin/requests/${id}/match`)
        .then((r) => r.json() as Promise<{ ok?: boolean; matches?: SavedMatch[] }>)
        .catch(() => ({ matches: [] as SavedMatch[] })),
      fetch(`/api/admin/requests/${id}/pip-ready`)
        .then((r) => r.json() as Promise<{ ready?: boolean }>)
        .catch(() => ({ ready: true })),
    ]).then(([matchData, pipData]) => {
      setMatches(matchData.matches ?? []);
      setPipReady(pipData.ready ?? true);
    });
  }, [request?.id]);

  // Sync publish state when request changes
  useEffect(() => {
    if (!request) return;
    setIsPublished(request.is_published ?? false);
    setEditedName(request.published_product_name ?? "");
    setEditedMessage(request.published_message ?? "");
    setShowEdit(Boolean(request.published_product_name));
    setPublishError(null);
  }, [request?.id]);

  async function handleAiEdit() {
    if (!request) return;
    setAiEditing(true);
    setPublishError(null);
    try {
      const res = await fetch(`/api/admin/requests/${request.id}/ai-edit`, {
        method: "POST",
      });
      const d = await res.json() as { ok?: boolean; product_name?: string; public_message?: string; error?: string };
      if (!d.ok) {
        setPublishError(d.error ?? "AI edit failed");
        return;
      }
      setEditedName(d.product_name ?? "");
      setEditedMessage(d.public_message ?? "");
      setShowEdit(true);
    } catch {
      setPublishError("Network error");
    } finally {
      setAiEditing(false);
    }
  }

  async function handlePublish() {
    if (!request) return;
    setPublishing(true);
    setPublishError(null);
    try {
      const res = await fetch(`/api/admin/requests/${request.id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_name: editedName, public_message: editedMessage }),
      });
      const d = await res.json() as { ok?: boolean; error?: string };
      if (!d.ok) {
        setPublishError(d.error ?? "Failed to publish");
        return;
      }
      setIsPublished(true);
    } catch {
      setPublishError("Network error");
    } finally {
      setPublishing(false);
    }
  }

  async function handleUnpublish() {
    if (!request) return;
    setPublishing(true);
    setPublishError(null);
    try {
      const res = await fetch(`/api/admin/requests/${request.id}/publish`, {
        method: "DELETE",
      });
      const d = await res.json() as { ok?: boolean; error?: string };
      if (!d.ok) {
        setPublishError(d.error ?? "Failed to unpublish");
        return;
      }
      setIsPublished(false);
    } catch {
      setPublishError("Network error");
    } finally {
      setPublishing(false);
    }
  }

  if (!request) return null;

  const ai = request.ai_analysis as {
    product_name?: string | null;
    category?: string | null;
    packaging_format?: string | null;
    approximate_size?: string | null;
    certifications_visible?: string[];
    confidence?: number;
  } | null;

  const hasKosher = request.certifications?.some((c) =>
    c.toLowerCase().includes("kosher")
  );

  const waText = encodeURIComponent(
    `Hi, following up on your sourcing request` +
      (request.product_name ? ` for ${request.product_name}` : "") +
      `. Can we discuss further?`
  );

  async function handleRunMatch() {
    setMatchLoading(true);
    setMatchError(null);
    try {
      const res = await fetch(`/api/admin/requests/${request!.id}/match`, {
        method: "POST",
      });
      const d = (await res.json()) as {
        ok: boolean;
        matches?: number;
        error?: string;
      };
      if (!d.ok) {
        setMatchError(d.error ?? "Matching failed");
        return;
      }
      // Reload from DB
      const res2 = await fetch(`/api/admin/requests/${request!.id}/match`);
      const d2 = (await res2.json()) as { matches?: SavedMatch[] };
      const newMatches = d2.matches ?? [];
      setMatches(newMatches);
      onMatchComplete(request!.id, newMatches.length);
    } catch {
      setMatchError("Network error");
    } finally {
      setMatchLoading(false);
    }
  }

  async function handleApprove(matchId: string) {
    await fetch(`/api/admin/sourcing-matches/${matchId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "approved" }),
    });
    setMatches((prev) =>
      prev?.map((m) => (m.id === matchId ? { ...m, status: "approved" } : m)) ?? null
    );
  }

  async function handleReject(matchId: string) {
    await fetch(`/api/admin/sourcing-matches/${matchId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "rejected" }),
    });
    setMatches((prev) => prev?.filter((m) => m.id !== matchId) ?? null);
  }

  function handleStatusChange(newStatus: string) {
    startTransition(async () => {
      const result = await updateRequestStatus(request!.id, newStatus);
      if (result.ok) onStatusChange(request!.id, newStatus);
    });
  }

  function buildMultiMatchMsg(): string {
    if (!request || !matches || matches.length === 0) return "";
    const top3 = matches.filter((m) => m.status !== "rejected").slice(0, 3);
    if (top3.length === 0) return "";
    const div = "──────────────────";
    const header = [
      "🔍 *Sourcing matches — FoodXchange*",
      "",
      `Buyer: ${request.company ?? "Unknown"}`,
      `Product: ${request.product_name ?? "—"}`,
    ].join("\n");
    const cards = top3
      .map((m, i) =>
        [
          div,
          `*Match #${i + 1} — ${m.match_score}/100*`,
          `Supplier: *${m.company_name ?? "—"}* (${m.country ?? "—"})`,
          `Product: ${m.product_name ?? "—"}`,
          m.match_summary ?? null,
        ]
          .filter(Boolean)
          .join("\n")
      )
      .join("\n");
    return [header, cards, div, "fdx.trading"].join("\n");
  }

  const sHdr =
    "text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3";
  const approvedMatches = matches?.filter((m) => m.status === "approved") ?? [];
  const pendingMatches = matches?.filter((m) => m.status !== "rejected") ?? [];

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-120 max-w-full bg-white shadow-2xl z-50 flex flex-col">

        {/* Header */}
        <div className="shrink-0 px-5 py-4 border-b border-slate-100">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-base font-bold text-gray-900 leading-tight">
                {request.product_name ?? "Sourcing request"}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {request.company && (
                  <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                    {request.company}
                  </span>
                )}
                {request.category && (
                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                    {request.category}
                  </span>
                )}
                {hasKosher && (
                  <span className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full">
                    ✡ Kosher
                  </span>
                )}
                <span className="text-xs text-gray-400">
                  {timeAgo(request.created_at)}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl leading-none transition shrink-0"
            >
              ×
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">

          {/* ── SOURCING BOARD PANEL ── */}
          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[11px] uppercase tracking-widest font-semibold text-slate-500">
                Sourcing Board
              </h3>
              {isPublished ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-2.5 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                  Published
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-200 px-2.5 py-0.5 rounded-full">
                  Not on board
                </span>
              )}
            </div>

            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={handleAiEdit}
                disabled={aiEditing}
                className="text-xs px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium disabled:opacity-50 transition flex items-center gap-1.5"
              >
                {aiEditing ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Editing…
                  </>
                ) : (
                  "✦ AI Edit"
                )}
              </button>
              {isPublished && (
                <button
                  type="button"
                  onClick={handleUnpublish}
                  disabled={publishing}
                  className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 font-medium disabled:opacity-50 transition"
                >
                  Unpublish
                </button>
              )}
            </div>

            {publishError && (
              <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">
                {publishError}
              </p>
            )}

            {showEdit && (
              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-slate-400 mb-1">
                    Product name
                  </label>
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    maxLength={60}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-orange-400 transition bg-white"
                    placeholder="Clean product name…"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-slate-400 mb-1">
                    Public description
                  </label>
                  <textarea
                    value={editedMessage}
                    onChange={(e) => setEditedMessage(e.target.value)}
                    rows={3}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-orange-400 transition bg-white resize-none"
                    placeholder="2-3 sentences for manufacturers…"
                  />
                </div>
                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={publishing || !editedName.trim() || !editedMessage.trim()}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold py-2.5 rounded-lg disabled:opacity-50 transition flex items-center justify-center gap-2"
                >
                  {publishing ? (
                    <>
                      <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Publishing…
                    </>
                  ) : isPublished ? (
                    "Update on Board →"
                  ) : (
                    "Publish to Board →"
                  )}
                </button>
              </div>
            )}
          </section>

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

          {/* ── MATCHES SECTION ── */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className={sHdr}>
                Matches{" "}
                {matches !== null && matches.length > 0 && (
                  <span className="text-orange-500 normal-case font-semibold">
                    ({matches.length})
                  </span>
                )}
              </h3>
              <div className="flex gap-2">
                {pendingMatches.length >= 3 && (
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(buildMultiMatchMsg())}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-3 py-1.5 rounded-lg border border-green-200 text-green-700 hover:bg-green-50 transition flex items-center gap-1"
                  >
                    Send top 3 ↗
                  </a>
                )}
                <button
                  type="button"
                  onClick={handleRunMatch}
                  disabled={matchLoading || !pipReady}
                  title={!pipReady ? "Review and confirm the PIP before finding suppliers" : undefined}
                  className="text-xs px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-1.5"
                >
                  {matchLoading ? (
                    <>
                      <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Matching…
                    </>
                  ) : matches?.length ? (
                    "Re-run matching"
                  ) : (
                    "Find suppliers"
                  )}
                </button>
              </div>
            </div>

            {matchError && (
              <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-2">
                {matchError}
              </p>
            )}

            {/* Loading state */}
            {matches === null && (
              <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
                <span className="inline-block w-4 h-4 border-2 border-gray-300 border-t-orange-400 rounded-full animate-spin" />
                Loading matches…
              </div>
            )}

            {/* No matches state */}
            {matches !== null && matches.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <p className="text-2xl mb-2">🔍</p>
                <p className="text-sm font-medium text-gray-600">
                  No matches found yet
                </p>
                <p className="text-xs mt-1">
                  Click &ldquo;Find suppliers&rdquo; to run matching
                </p>
              </div>
            )}

            {/* Match cards */}
            {matches !== null && matches.length > 0 && (
              <div className="space-y-3">
                {matches.map((m, idx) => {
                  const kosherTypes = (m.match_breakdown?.kosher_types ?? []) as string[];
                  const certs = (m.match_breakdown?.certifications ?? []) as string[];
                  const isApproved = m.status === "approved";

                  return (
                    <div
                      key={m.id}
                      className={`rounded-xl border p-4 transition ${
                        isApproved
                          ? "border-green-200 bg-green-50/30"
                          : "border-gray-200 bg-white"
                      }`}
                    >
                      {/* Card header: rank + company + score */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                          <ProductImage
                            imageUrl={m.image_url ?? null}
                            categoryName={m.category ?? null}
                            productName={m.product_name ?? m.company_name ?? "Product"}
                            size={40}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-xs text-gray-400 font-mono">
                                #{idx + 1}
                              </span>
                              {isApproved && (
                                <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">
                                  ✓ Approved
                                </span>
                              )}
                            </div>
                            {m.supplier_id ? (
                              <a
                                href={`/admin/suppliers/${m.supplier_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-semibold text-gray-900 text-sm hover:text-[#F47920] hover:underline transition-colors inline-flex items-center gap-1"
                              >
                                {m.company_name ?? "—"}
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                                  <polyline points="15 3 21 3 21 9"/>
                                  <line x1="10" y1="14" x2="21" y2="3"/>
                                </svg>
                              </a>
                            ) : (
                              <p className="font-semibold text-gray-900 text-sm">
                                {m.company_name ?? "—"}
                              </p>
                            )}
                            {m.country && (
                              <p className="text-xs text-gray-400">{m.country}</p>
                            )}
                            {m.product_name && (
                              <p className="text-xs text-gray-600 mt-1">
                                {m.product_name}
                              </p>
                            )}
                          </div>
                        </div>
                        <ScoreDisplay score={m.match_score} />
                      </div>

                      {/* Match summary */}
                      {m.match_summary && (
                        <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                          {m.match_summary}
                        </p>
                      )}

                      {/* Kosher + cert chips */}
                      {(kosherTypes.length > 0 || certs.length > 0) && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {kosherTypes.map((k) => (
                            <span
                              key={k}
                              className="text-xs bg-orange-50 text-orange-700 border border-orange-200 rounded-full px-2 py-0.5"
                            >
                              ✡ {k.replace("Chief Rabbinate", "CR").replace("Badatz Beit Yosef", "BY")}
                            </span>
                          ))}
                          {certs.slice(0, 3).map((c) => (
                            <span
                              key={c}
                              className="text-xs bg-slate-50 text-slate-600 border border-slate-200 rounded-full px-2 py-0.5"
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        {!isApproved && (
                          <button
                            type="button"
                            onClick={() => handleApprove(m.id)}
                            className="text-xs px-2.5 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 font-medium transition"
                          >
                            ✓ Approve
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleReject(m.id)}
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 font-medium transition"
                        >
                          ✗ Reject
                        </button>
                        {m.whatsapp_message && (
                          <a
                            href={`https://wa.me/?text=${encodeURIComponent(m.whatsapp_message)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs px-2.5 py-1.5 rounded-lg border border-green-200 text-green-700 hover:bg-green-50 transition"
                          >
                            WhatsApp ↗
                          </a>
                        )}
                        <a
                          href={`/admin/proposals/new?request=${request.id}&supplier=${m.supplier_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
                        >
                          Proposal ↗
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Generate post */}
          <section>
            <PostGenerator
              requestId={request.id}
              productName={request.product_name}
            />
          </section>

          {/* Generate video script */}
          <section>
            <ScriptGenerator
              defaultTopic={`Sourcing ${request.product_name ?? "product"} for Israeli ${request.target_market ?? "retail"}${
                (request.certifications ?? []).some((c) =>
                  c.toLowerCase().includes("kosher")
                )
                  ? " — kosher certified"
                  : " — kosher options available"
              }`}
            />
          </section>

          {/* Contact */}
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
                    <td className="py-2 pr-4 text-gray-400 text-xs w-20 shrink-0">
                      {label}
                    </td>
                    <td className="py-2 text-xs text-gray-800">
                      {label === "Email" && val ? (
                        <a
                          href={`mailto:${val}`}
                          className="text-orange-600 hover:underline"
                        >
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

          {/* Images */}
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

          {/* Request details */}
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
                    <span className="text-xs text-gray-400 w-20 shrink-0">
                      {label}
                    </span>
                    <span className="text-xs bg-orange-50 text-orange-700 border border-orange-200 rounded-full px-3 py-0.5">
                      {val}
                    </span>
                  </div>
                ) : null
              )}
              {request.private_label !== null && (
                <div className="flex gap-2 items-center">
                  <span className="text-xs text-gray-400 w-20 shrink-0">
                    Private label
                  </span>
                  <span className="text-xs bg-orange-50 text-orange-700 border border-orange-200 rounded-full px-3 py-0.5">
                    {request.private_label ? "Yes" : "No"}
                  </span>
                </div>
              )}
              {(request.certifications?.length ?? 0) > 0 && (
                <div className="flex gap-2 items-start">
                  <span className="text-xs text-gray-400 w-20 shrink-0 pt-0.5">
                    Certs
                  </span>
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

          {/* AI Analysis */}
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
                      <span className="text-xs text-orange-500 w-20 shrink-0">
                        {label}
                      </span>
                      <span className="text-xs text-orange-800">
                        {val as string}
                      </span>
                    </div>
                  ) : null
                )}
                {(ai.certifications_visible?.length ?? 0) > 0 && (
                  <div className="flex gap-2 items-start">
                    <span className="text-xs text-orange-500 w-20 shrink-0 pt-0.5">
                      Certs seen
                    </span>
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
                    <span className="text-xs text-orange-500 w-20 shrink-0">
                      Confidence
                    </span>
                    <div className="flex-1 bg-orange-200 rounded-full h-1.5">
                      <div
                        className="bg-orange-500 h-1.5 rounded-full"
                        style={{
                          width: `${Math.round(ai.confidence * 100)}%`,
                        }}
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

          {/* PIP v1 */}
          <PipPanel
            requestId={request.id}
            initialPip={request.intent_json ?? null}
          />

          {/* Approved matches summary */}
          {approvedMatches.length > 0 && (
            <section>
              <h3 className={sHdr}>Approved ({approvedMatches.length})</h3>
              <div className="space-y-1">
                {approvedMatches.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="font-medium text-gray-700">
                      {m.company_name}
                    </span>
                    <span className="text-green-600 font-semibold">
                      {m.match_score}%
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
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
