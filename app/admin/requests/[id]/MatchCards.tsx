"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SavedMatch } from "./page";
import MatchPipelineBadge from "@/components/matches/MatchPipelineBadge";
import { getPipelineStatus } from "@/lib/matches/pipelineStatus";
import { sleep, waLink } from "@/lib/outreach/waLink";
import RfqComposerModal, { type RfqRequestVars, type RfqTemplateRow } from "@/components/admin/RfqComposerModal";

interface Props {
  requestId: string;
  initialMatches: SavedMatch[];
  productName: string;
  company: string | null;
  contactMap: Record<string, { phone: string | null; email: string | null }>;
  rfqTemplates: RfqTemplateRow[];
  rfqRequestVars: RfqRequestVars;
}

type MatchStatus =
  | "pending"
  | "new"
  | "approved"
  | "rejected"
  | "sent"
  | "responded"
  | "rfq_sent"
  | "closed";

interface LocalMatch extends SavedMatch {
  localStatus: MatchStatus;
  localWhatsappMessage: string | null;
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

function StatusBadge({ status }: { status: MatchStatus }) {
  const map: Record<MatchStatus, { label: string; cls: string }> = {
    pending: { label: "New", cls: "bg-gray-100 text-gray-600 border-gray-200" },
    new: { label: "New", cls: "bg-gray-100 text-gray-600 border-gray-200" },
    approved: { label: "Approved", cls: "bg-blue-50 text-blue-700 border-blue-200" },
    rejected: { label: "Rejected", cls: "bg-gray-100 text-gray-500 border-gray-200" },
    sent: { label: "Sent", cls: "bg-orange-50 text-orange-700 border-orange-200" },
    responded: { label: "Responded", cls: "bg-green-50 text-green-700 border-green-200" },
    rfq_sent: { label: "RFQ sent", cls: "bg-purple-50 text-purple-700 border-purple-200" },
    closed: { label: "Closed", cls: "bg-gray-100 text-gray-500 border-gray-200" },
  };
  const { label, cls } = map[status] ?? map.pending;
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${cls}`}>
      {label}
    </span>
  );
}

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const SENT_VIA_ICON: Record<string, string> = { email: "📧", whatsapp: "💬" };

export default function MatchCards({ requestId, initialMatches, productName, company, contactMap, rfqTemplates, rfqRequestVars }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [matches, setMatches] = useState<LocalMatch[]>(
    initialMatches.map((m) => ({
      ...m,
      localStatus: m.status as MatchStatus,
      localWhatsappMessage: m.whatsapp_message,
    }))
  );
  const [isRunning, setIsRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [respondingIds, setRespondingIds] = useState<Set<string>>(new Set());
  const [responseNotes, setResponseNotes] = useState<Record<string, string>>({});
  const [bulkState, setBulkState] = useState<{
    index: number;
    total: number;
    company: string;
    countdown: number;
  } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [rfqOpen, setRfqOpen] = useState(false);

  function toggleSelected(matchId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(matchId)) next.delete(matchId);
      else next.add(matchId);
      return next;
    });
  }

  function exportSelected() {
    const selected = matches.filter((m) => selectedIds.has(m.id));
    const rows = [
      ["Supplier", "Product", "Country", "Email"],
      ...selected.map((m) => [
        m.company_name ?? "",
        m.product_name ?? "",
        m.country ?? "",
        contactMap[m.supplier_id]?.email ?? "",
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `suppliers-${requestId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleRfqDone() {
    setRfqOpen(false);
    setSelectedIds(new Set());
    startTransition(() => router.refresh());
  }

  async function patchMatch(
    matchId: string,
    action: "approve" | "reject" | "send" | "respond" | "close",
    extras?: { sent_via?: string; response_note?: string }
  ) {
    const statusMap: Record<typeof action, MatchStatus> = {
      approve: "approved",
      reject: "rejected",
      send: "sent",
      respond: "responded",
      close: "closed",
    };
    const newStatus = statusMap[action];

    setMatches((prev) =>
      prev.map((m) => (m.id === matchId ? { ...m, localStatus: newStatus } : m))
    );

    try {
      const res = await fetch(`/api/matching/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extras }),
      });
      if (!res.ok) {
        const { error } = (await res.json()) as { error?: string };
        throw new Error(error ?? "Request failed");
      }

      if (action === "approve") {
        const data = (await res.json()) as { ok: boolean; whatsapp_message?: string };
        if (data.whatsapp_message) {
          setMatches((prev) =>
            prev.map((m) =>
              m.id === matchId
                ? { ...m, localWhatsappMessage: data.whatsapp_message! }
                : m
            )
          );
        }
      }
    } catch {
      setMatches((prev) =>
        prev.map((m) =>
          m.id === matchId ? { ...m, localStatus: m.status as MatchStatus } : m
        )
      );
    }
  }

  async function saveMessage(matchId: string, message: string) {
    await fetch(`/api/matching/${matchId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save_message", whatsapp_message: message }),
    }).catch(() => {});
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

  async function runBulkWhatsapp() {
    const eligible = matches.filter((m) => m.localStatus === "approved");
    for (let i = 0; i < eligible.length; i++) {
      const m = eligible[i];
      const contact = contactMap[m.supplier_id];
      window.open(waLink(contact?.phone ?? null, m.localWhatsappMessage ?? ""), "_blank");
      patchMatch(m.id, "send", { sent_via: "whatsapp" });

      if (i < eligible.length - 1) {
        for (let c = 1; c >= 0; c--) {
          setBulkState({
            index: i + 1,
            total: eligible.length,
            company: eligible[i + 1].company_name ?? "next supplier",
            countdown: c,
          });
          await sleep(500);
        }
      }
    }
    setBulkState(null);
  }

  void productName;
  void company;

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
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-sm font-semibold text-gray-700">
          {matches.length} match{matches.length !== 1 ? "es" : ""}
        </h2>
        <div className="flex items-center gap-2">
          {matches.some((m) => m.localStatus === "approved") && (
            <button
              onClick={runBulkWhatsapp}
              disabled={!!bulkState}
              className="inline-flex items-center gap-1.5 text-xs text-white bg-green-600 hover:bg-green-700 disabled:opacity-60 px-3 py-1.5 rounded-lg transition-colors"
            >
              💬 Send WhatsApp to {matches.filter((m) => m.localStatus === "approved").length} approved
            </button>
          )}
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
      </div>

      {selectedIds.size > 0 && (
        <div className="sticky top-2 z-10 flex items-center justify-between gap-3 bg-blue-600 text-white rounded-2xl px-4 py-3 shadow-lg">
          <p className="text-sm font-medium">{selectedIds.size} supplier{selectedIds.size !== 1 ? "s" : ""} selected</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setRfqOpen(true)}
              className="text-xs font-semibold bg-white text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
            >
              Send RFQ →
            </button>
            <button
              onClick={exportSelected}
              className="text-xs font-medium text-white border border-white/40 hover:bg-white/10 px-3 py-1.5 rounded-lg transition-colors"
            >
              Export list
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs font-medium text-white/80 hover:text-white px-3 py-1.5 rounded-lg transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {bulkState && (
        <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          Opening WhatsApp for {bulkState.company} in {bulkState.countdown}s… ({bulkState.index}/{bulkState.total})
        </p>
      )}

      {runError && (
        <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {runError}
        </p>
      )}

      {matches.map((match, idx) => {
        const s = match.localStatus;
        const isRejectedOrClosed = s === "rejected" || s === "closed";
        const isActive = s === "approved" || s === "sent" || s === "responded";
        const breakdown = match.match_breakdown;
        const kosherTypes = breakdown?.kosher_types ?? [];
        const certs = breakdown?.certifications ?? [];
        const kosherStatus = breakdown?.kosher_status as string | undefined;
        const hasV1Breakdown =
          breakdown !== null &&
          breakdown !== undefined &&
          typeof breakdown.category === "number";
        const isResponding = respondingIds.has(match.id);
        const contact = contactMap[match.supplier_id];
        const pipelineFields = { status: s, supplier_response: match.supplier_response, closed_at: match.closed_at };
        const pipeline = getPipelineStatus(pipelineFields);

        return (
          <div
            key={match.id}
            className={`bg-white border rounded-2xl p-5 shadow-sm transition-opacity ${
              isRejectedOrClosed ? "opacity-40" : "opacity-100"
            } ${
              isActive
                ? "border-blue-200 ring-1 ring-blue-100"
                : "border-gray-200"
            }`}
          >
            {/* Header row */}
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="checkbox"
                  checked={selectedIds.has(match.id)}
                  onChange={() => toggleSelected(match.id)}
                  className="rounded border-gray-300 mr-1"
                  aria-label={`Select ${match.company_name ?? "supplier"}`}
                />
                <span className="text-xs font-semibold text-gray-400">#{idx + 1}</span>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${scoreBadgeClass(
                    match.match_score
                  )}`}
                >
                  {match.match_score}/100
                </span>
                <StatusBadge status={s} />
                {match.supplier_response && <MatchPipelineBadge match={pipelineFields} />}
              </div>

              {/* new / pending: approve + reject */}
              {(s === "pending" || s === "new") && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => patchMatch(match.id, "approve")}
                    className="text-xs text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => patchMatch(match.id, "reject")}
                    className="text-xs text-red-600 hover:text-red-800 border border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Reject
                  </button>
                </div>
              )}

              {/* responded: mark as won + close */}
              {s === "responded" && (
                <div className="flex items-center gap-2">
                  {pipeline === "accepted" && (
                    <button
                      onClick={() => {
                        if (window.confirm("This will notify both the buyer and supplier that the deal is closed. Continue?")) {
                          patchMatch(match.id, "close");
                        }
                      }}
                      className="text-xs font-medium text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      🎉 Mark as won
                    </button>
                  )}
                  <button
                    onClick={() => patchMatch(match.id, "close")}
                    className="text-xs text-gray-600 border border-gray-200 hover:border-gray-400 hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>

            {/* Product & supplier info */}
            <div className="mt-3">
              <p className="text-sm font-semibold text-gray-900">{match.product_name}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {match.company_name}
                {match.country ? ` · ${match.country}` : ""}
              </p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <a
                  href={contact?.email ? `mailto:${contact.email}` : undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={contact?.email ?? "No email on file"}
                  className={`text-sm transition-transform ${
                    contact?.email ? "opacity-100 hover:scale-110" : "opacity-25 pointer-events-none"
                  }`}
                >
                  📧
                </a>
                <a
                  href={waLink(contact?.phone ?? null, match.localWhatsappMessage ?? "")}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={contact?.phone ?? "No phone on file — opens WhatsApp without a recipient"}
                  className="text-sm opacity-100 hover:scale-110 transition-transform"
                >
                  💬
                </a>
                <a
                  href={contact?.phone ? `tel:${contact.phone}` : undefined}
                  title={contact?.phone ?? "No phone on file"}
                  className={`text-sm transition-transform ${
                    contact?.phone ? "opacity-100 hover:scale-110" : "opacity-25 pointer-events-none"
                  }`}
                >
                  📞
                </a>
              </div>
            </div>

            {/* v1 score breakdown chips */}
            {hasV1Breakdown && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                <ScoreChip label="Cat" pts={breakdown!.category!} max={40} />
                <ScoreChip label="Fmt" pts={breakdown!.format!} max={20} />
                <ScoreChip label="Cert" pts={breakdown!.compliance!} max={10} />
                <ScoreChip label="Evid" pts={breakdown!.evidence!} max={20} />
                {kosherStatus && (
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${
                    kosherStatus === "certified"
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-gray-50 text-gray-500 border-gray-200"
                  }`}>
                    ✡ {kosherStatus === "certified" ? "Certified" : kosherStatus === "not_listed" ? "Not listed" : "Unknown"}
                  </span>
                )}
              </div>
            )}

            {/* Legacy chips */}
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

            {/* ── Approved state: editable message + send buttons ── */}
            {s === "approved" && (
              <div className="mt-4 border-t border-gray-100 pt-4 space-y-3">
                <p className="text-xs font-medium text-gray-600">Outreach message</p>
                <textarea
                  className="w-full text-xs text-gray-700 border border-gray-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 font-mono leading-relaxed"
                  rows={10}
                  value={match.localWhatsappMessage ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setMatches((prev) =>
                      prev.map((m) =>
                        m.id === match.id ? { ...m, localWhatsappMessage: val } : m
                      )
                    );
                  }}
                  onBlur={() => saveMessage(match.id, match.localWhatsappMessage ?? "")}
                />
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => {
                      window.open(
                        waLink(contact?.phone ?? null, match.localWhatsappMessage ?? ""),
                        "_blank"
                      );
                      patchMatch(match.id, "send", { sent_via: "whatsapp" });
                    }}
                    className="flex-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition-colors text-center"
                  >
                    Send via WhatsApp
                  </button>
                  <button
                    onClick={() => {
                      window.open(
                        `mailto:?subject=Supplier%20Inquiry&body=${encodeURIComponent(
                          match.localWhatsappMessage ?? ""
                        )}`,
                        "_blank"
                      );
                      patchMatch(match.id, "send", { sent_via: "email" });
                    }}
                    className="flex-1 text-xs font-medium text-gray-700 border border-gray-300 hover:border-gray-400 hover:bg-gray-50 px-4 py-2 rounded-lg transition-colors text-center"
                  >
                    Send via Email
                  </button>
                </div>
              </div>
            )}

            {/* ── Sent state: timestamp + mark responded ── */}
            {s === "sent" && (
              <div className="mt-4 border-t border-gray-100 pt-3 space-y-3">
                <p className="text-xs text-gray-400">
                  Sent {fmtDate(match.sent_at)}
                  {match.sent_via && (
                    <span className="ml-1 text-gray-400">
                      {SENT_VIA_ICON[match.sent_via] ?? ""} via {match.sent_via}
                    </span>
                  )}
                </p>
                {!isResponding ? (
                  <button
                    onClick={() =>
                      setRespondingIds((s) => new Set([...s, match.id]))
                    }
                    className="text-xs font-medium text-green-700 border border-green-200 hover:bg-green-50 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Mark as Responded
                  </button>
                ) : (
                  <div className="space-y-2">
                    <textarea
                      className="w-full text-xs border border-gray-200 rounded-lg p-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-green-400"
                      rows={3}
                      placeholder="Note their response…"
                      value={responseNotes[match.id] ?? ""}
                      onChange={(e) =>
                        setResponseNotes((n) => ({ ...n, [match.id]: e.target.value }))
                      }
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          patchMatch(match.id, "respond", {
                            response_note: responseNotes[match.id] ?? "",
                          });
                          setRespondingIds((s) => {
                            const next = new Set(s);
                            next.delete(match.id);
                            return next;
                          });
                        }}
                        className="text-xs text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() =>
                          setRespondingIds((s) => {
                            const next = new Set(s);
                            next.delete(match.id);
                            return next;
                          })
                        }
                        className="text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg transition-colors hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Responded state: show note ── */}
            {s === "responded" && match.response_note && (
              <div className="mt-4 border-t border-gray-100 pt-3">
                <p className="text-xs text-gray-400 mb-1">
                  Response {fmtDate(match.responded_at)}
                </p>
                <p className="text-xs text-gray-700 leading-relaxed bg-green-50 border border-green-100 rounded-lg p-3">
                  {match.response_note}
                </p>
              </div>
            )}

            {/* ── Supplier reply via Matches portal ── */}
            {match.supplier_message && (
              <div className="mt-4 border-t border-gray-100 pt-3">
                <p className="text-xs text-gray-400 mb-1">
                  Supplier {match.supplier_response} {fmtDate(match.supplier_responded_at)}
                </p>
                <p
                  className={`text-xs leading-relaxed rounded-lg p-3 border ${
                    match.supplier_response === "declined"
                      ? "bg-red-50 border-red-100 text-red-700"
                      : match.supplier_response === "countered"
                      ? "bg-yellow-50 border-yellow-100 text-yellow-700"
                      : "bg-green-50 border-green-100 text-green-700"
                  }`}
                >
                  {match.supplier_message}
                </p>
              </div>
            )}
          </div>
        );
      })}

      {rfqOpen && (
        <RfqComposerModal
          requestId={requestId}
          matches={matches
            .filter((m) => selectedIds.has(m.id))
            .map((m) => ({ id: m.id, company_name: m.company_name, product_name: m.product_name }))}
          templates={rfqTemplates}
          requestVars={rfqRequestVars}
          onClose={() => setRfqOpen(false)}
          onDone={handleRfqDone}
        />
      )}
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
