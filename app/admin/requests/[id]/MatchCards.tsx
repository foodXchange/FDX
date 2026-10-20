"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SavedMatch } from "./page";
import MatchPipelineBadge from "@/components/matches/MatchPipelineBadge";
import { getPipelineStatus } from "@/lib/matches/pipelineStatus";
import { sleep, waLink } from "@/lib/outreach/waLink";
import RfqComposerModal, { type RfqRequestVars, type RfqTemplateRow } from "@/components/admin/RfqComposerModal";
import { recordSupplierQuote, type SupplierQuotePayload } from "@/app/admin/requests/actions";
import SupplierChaserModal from "@/components/admin/SupplierChaserModal";
import BulkChaserModal from "@/components/admin/BulkChaserModal";
import { evaluateFollowUpUrgency } from "@/lib/outreach/chaserTemplates";

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
  const [bulkChaserOpen, setBulkChaserOpen] = useState(false);
  const [chaserMatch, setChaserMatch] = useState<LocalMatch | null>(null);

  // New Workflow States: 65%+ Filtering, Bulk Follow-up, and Quote Capture
  const [filterTab, setFilterTab] = useState<"all" | "top_tier" | "quoted" | "pending_followup">("all");
  const [followUpPending, setFollowUpPending] = useState(false);
  const [followUpNotice, setFollowUpNotice] = useState<string | null>(null);
  const [quoteMatch, setQuoteMatch] = useState<LocalMatch | null>(null);
  const [quoteForm, setQuoteForm] = useState<SupplierQuotePayload>({
    unit_price: 0.82,
    currency: "EUR",
    net_weight: "1L",
    packaging_format: "PET Bottle",
    moq: "1 x 40ft HQ FCL",
    lead_time_weeks: 3,
    incoterm: "CIF Ashdod",
    kosher_type: "Kosher (Chief Rabbinate)",
    certifications: ["BRC", "ISO 22000"],
    cooperation_status: "cooperating",
    supplier_notes: "",
  });

  const topTierMatches = matches.filter((m) => m.match_score >= 65);
  const quotedMatches = matches.filter(
    (m) => Boolean((m.match_breakdown as Record<string, any>)?.quote?.unit_price) || m.localStatus === "responded"
  );
  const pendingFollowUpMatches = matches.filter(
    (m) =>
      m.localStatus === "sent" &&
      m.sent_at &&
      Date.now() - new Date(m.sent_at).getTime() > 2 * 86400000
  );

  const filteredMatches = matches.filter((m) => {
    if (filterTab === "top_tier") return m.match_score >= 65;
    if (filterTab === "quoted")
      return Boolean((m.match_breakdown as Record<string, any>)?.quote?.unit_price) || m.localStatus === "responded";
    if (filterTab === "pending_followup")
      return m.localStatus === "sent" && m.sent_at && Date.now() - new Date(m.sent_at).getTime() > 2 * 86400000;
    return true;
  });

  function selectAllTopTier() {
    const ids = topTierMatches.map((m) => m.id);
    setSelectedIds(new Set(ids));
  }

  async function handleSendBulkFollowUp() {
    const targetIds = pendingFollowUpMatches.map((m) => m.id);
    if (targetIds.length === 0) return;

    setFollowUpPending(true);
    setFollowUpNotice(null);
    try {
      const res = await fetch("/api/admin/matches/bulk-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchIds: targetIds,
          channel: "email",
          isFollowUp: true,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setFollowUpNotice(`Sent follow-up reminders to ${targetIds.length} suppliers!`);
        startTransition(() => router.refresh());
        setTimeout(() => setFollowUpNotice(null), 4000);
      } else {
        setRunError(data.error || "Failed to send follow-up");
      }
    } catch (err: any) {
      setRunError(err.message || "Follow-up error");
    } finally {
      setFollowUpPending(false);
    }
  }

  function openCardQuoteModal(m: LocalMatch) {
    const existing = (m.match_breakdown as Record<string, any>)?.quote;
    setQuoteMatch(m);
    setQuoteForm({
      unit_price: existing?.unit_price ?? 0.82,
      currency: existing?.currency ?? "EUR",
      net_weight: existing?.net_weight ?? "1L",
      packaging_format: existing?.packaging_format ?? "Standard Packaging",
      moq: existing?.moq ?? "1 x 40ft HQ FCL",
      lead_time_weeks: existing?.lead_time_weeks ?? 3,
      incoterm: existing?.incoterm ?? "CIF Ashdod",
      kosher_type: existing?.kosher_type ?? "Kosher (Chief Rabbinate)",
      certifications: existing?.certifications ?? ["BRC", "ISO 22000"],
      cooperation_status: existing?.cooperation_status ?? "cooperating",
      supplier_notes: existing?.supplier_notes ?? "",
    });
  }

  function handleSaveQuoteModal(e: React.FormEvent) {
    e.preventDefault();
    if (!quoteMatch) return;

    startTransition(async () => {
      const res = await recordSupplierQuote(quoteMatch.id, quoteForm);
      if (res.ok) {
        setMatches((prev) =>
          prev.map((m) =>
            m.id === quoteMatch.id
              ? {
                  ...m,
                  localStatus: "responded",
                  match_breakdown: {
                    ...(m.match_breakdown ?? {}),
                    quote: {
                      ...quoteForm,
                      quoted_at: new Date().toISOString(),
                    },
                  },
                }
              : m
          )
        );
        setQuoteMatch(null);
        router.refresh();
      }
    });
  }

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
      {/* ── Top Match Controls & Workflow Filters ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Sourcing Matches ({matches.length})
            </h2>
            <p className="text-xs text-slate-500">
              Ranked from 100% to lowest. Focus outreach on 65%+ top-tier factories.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={selectAllTopTier}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 px-3 py-1.5 rounded-lg transition shadow-xs"
            >
              <span>⚡</span>
              <span>Select All 65%+ ({topTierMatches.length})</span>
            </button>

            {pendingFollowUpMatches.length > 0 && (
              <button
                onClick={handleSendBulkFollowUp}
                disabled={followUpPending}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-3 py-1.5 rounded-lg transition shadow-xs"
              >
                <span>📬</span>
                <span>
                  {followUpPending
                    ? "Sending follow-ups…"
                    : `Follow Up Unresponsive (${pendingFollowUpMatches.length})`}
                </span>
              </button>
            )}

            <button
              onClick={runMatching}
              disabled={isRunning || isPending}
              className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg px-2.5 py-1.5 transition"
            >
              {isRunning || isPending ? <Spinner size="sm" /> : "↺ Re-run"}
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setFilterTab("all")}
            className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition ${
              filterTab === "all"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All Matches ({matches.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("top_tier")}
            className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition ${
              filterTab === "top_tier"
                ? "bg-orange-600 text-white font-bold"
                : "bg-orange-50 text-orange-800 hover:bg-orange-100 border border-orange-200"
            }`}
          >
            ⭐️ Top-Tier: 65% - 100% ({topTierMatches.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("quoted")}
            className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition ${
              filterTab === "quoted"
                ? "bg-emerald-600 text-white font-bold"
                : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200"
            }`}
          >
            Quoted & Responded ({quotedMatches.length})
          </button>
          {pendingFollowUpMatches.length > 0 && (
            <button
              type="button"
              onClick={() => setFilterTab("pending_followup")}
              className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition ${
                filterTab === "pending_followup"
                  ? "bg-amber-600 text-white font-bold"
                  : "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-300"
              }`}
            >
              ⏰ Follow-up Due ({pendingFollowUpMatches.length})
            </button>
          )}
          {pendingFollowUpMatches.length > 0 && (
            <button
              type="button"
              onClick={() => setBulkChaserOpen(true)}
              className="text-xs font-bold px-3 py-1 rounded-lg bg-orange-600 hover:bg-orange-700 text-white transition flex items-center gap-1 shadow-xs cursor-pointer sm:ml-auto"
            >
              <span>⚡ Chase All Stalled ({pendingFollowUpMatches.length})</span>
            </button>
          )}
        </div>
      </div>

      {followUpNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold">
          ✓ {followUpNotice}
        </div>
      )}

      {selectedIds.size > 0 && (
        <div className="sticky top-2 z-20 flex items-center justify-between gap-3 bg-slate-900 text-white rounded-2xl px-5 py-3.5 shadow-xl border border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-orange-600 text-white flex items-center justify-center text-xs font-bold">
              {selectedIds.size}
            </span>
            <p className="text-xs font-bold">
              {selectedIds.size} supplier{selectedIds.size !== 1 ? "s" : ""} selected for outreach
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setRfqOpen(true)}
              className="text-xs font-bold bg-orange-600 text-white hover:bg-orange-700 px-3.5 py-1.5 rounded-xl transition shadow-xs cursor-pointer"
            >
              Send Bulk RFQ Email →
            </button>
            <button
              onClick={exportSelected}
              className="text-xs font-medium text-slate-300 hover:text-white border border-slate-700 px-2.5 py-1.5 rounded-lg transition"
            >
              Export
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs font-medium text-slate-400 hover:text-white px-2 py-1.5"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {filteredMatches.map((match, idx) => {
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
        const matchQuote = (breakdown as Record<string, any>)?.quote;

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

              {/* Action buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Quote Button */}
                {matchQuote?.unit_price ? (
                  <button
                    onClick={() => openCardQuoteModal(match)}
                    className="text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="Click to edit recorded supplier quote"
                  >
                    <span>💶</span>
                    <span>{matchQuote.currency ?? "€"}{Number(matchQuote.unit_price).toFixed(2)}</span>
                    <span className="text-[10px] text-emerald-600 bg-white px-1.5 py-0.5 rounded border border-emerald-200">
                      {matchQuote.net_weight || "quote"}
                    </span>
                    <span className="text-emerald-500 font-normal ml-0.5">Edit</span>
                  </button>
                ) : (
                  <button
                    onClick={() => openCardQuoteModal(match)}
                    className="text-xs font-medium text-slate-700 hover:text-slate-900 border border-slate-200 hover:border-slate-400 hover:bg-slate-50 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="Record supplier response quote and cooperation terms"
                  >
                    <span>+ Record Quote</span>
                  </button>
                )}

                {/* sent / rfq_sent: Chaser button */}
                {(s === "sent" || s === "rfq_sent") && (
                  <button
                    type="button"
                    onClick={() => setChaserMatch(match)}
                    className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-colors flex items-center gap-1.5 cursor-pointer ${
                      evaluateFollowUpUrgency(match).isDue
                        ? "bg-amber-500 text-white hover:bg-amber-600 border-amber-600 shadow-2xs"
                        : "bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100"
                    }`}
                    title="Send follow-up bump / chaser email or WhatsApp"
                  >
                    <span>⚡</span>
                    <span>
                      {evaluateFollowUpUrgency(match).isDue
                        ? `Follow-Up Due (${evaluateFollowUpUrgency(match).daysElapsed}d)`
                        : "Follow-Up"}
                    </span>
                  </button>
                )}

                {/* new / pending: approve + reject */}
                {(s === "pending" || s === "new") && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => patchMatch(match.id, "approve")}
                      className="text-xs text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => patchMatch(match.id, "reject")}
                      className="text-xs text-red-600 hover:text-red-800 border border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
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
                        className="text-xs font-medium text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                      >
                        🎉 Mark as won
                      </button>
                    )}
                    <button
                      onClick={() => patchMatch(match.id, "close")}
                      className="text-xs text-gray-600 border border-gray-200 hover:border-gray-400 hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
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

            {/* Recorded Factory Quote Snippet */}
            {matchQuote?.unit_price && (
              <div className="mt-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3.5 text-xs text-emerald-950 shadow-2xs">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-900 text-sm">
                      Factory Quote: {matchQuote.currency ?? "€"}{Number(matchQuote.unit_price).toFixed(2)}
                    </span>
                    <span className="text-emerald-700 font-medium">
                      / {matchQuote.packaging_format || matchQuote.net_weight || "unit"}
                    </span>
                    {matchQuote.incoterm && (
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                        {matchQuote.incoterm}
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    matchQuote.cooperation_status === "declined"
                      ? "bg-red-100 text-red-800"
                      : matchQuote.cooperation_status === "counter_offer"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-emerald-100 text-emerald-800"
                  }`}>
                    {matchQuote.cooperation_status === "declined"
                      ? "Declined"
                      : matchQuote.cooperation_status === "counter_offer"
                      ? "Counter-Offer"
                      : "Ready to Cooperate"}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2.5 text-[11px] text-emerald-900/90 font-medium bg-white/70 rounded-lg p-2 border border-emerald-100">
                  <div><span className="text-emerald-600 font-normal">Pack:</span> {matchQuote.net_weight || "—"}</div>
                  <div><span className="text-emerald-600 font-normal">MOQ:</span> {matchQuote.moq || "—"}</div>
                  <div><span className="text-emerald-600 font-normal">Lead Time:</span> {matchQuote.lead_time_weeks ? `${matchQuote.lead_time_weeks} wks` : "—"}</div>
                  <div><span className="text-emerald-600 font-normal">Kosher:</span> {matchQuote.kosher_type || "—"}</div>
                </div>
                {matchQuote.supplier_notes && (
                  <p className="mt-2 text-[11px] text-emerald-900/80 italic border-t border-emerald-200/50 pt-2">
                    &ldquo;{matchQuote.supplier_notes}&rdquo;
                  </p>
                )}
              </div>
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

            {/* ── Sent state: timestamp + follow-up history + mark responded ── */}
            {(s === "sent" || s === "rfq_sent") && (
              <div className="mt-4 border-t border-gray-100 pt-3 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-xs text-gray-400">
                    Sent {fmtDate(match.sent_at)}
                    {match.sent_via && (
                      <span className="ml-1 text-gray-400">
                        {SENT_VIA_ICON[match.sent_via] ?? ""} via {match.sent_via}
                      </span>
                    )}
                  </p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <a
                      href={`/supplier-match/${match.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 px-2.5 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer"
                    >
                      <span>🌐</span>
                      <span>Portal ↗</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => openCardQuoteModal(match)}
                      className="text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer"
                    >
                      <span>📝</span>
                      <span>Record Quote</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setChaserMatch(match)}
                      className="text-xs font-semibold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 px-2.5 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer"
                    >
                      <span>📨</span>
                      <span>Send Bump</span>
                    </button>
                    {!isResponding && (
                      <button
                        type="button"
                        onClick={() =>
                          setRespondingIds((st) => new Set([...st, match.id]))
                        }
                        className="text-xs font-medium text-green-700 border border-green-200 hover:bg-green-50 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                      >
                        Mark Responded
                      </button>
                    )}
                  </div>
                </div>

                {/* Follow-up audit history pills */}
                {Array.isArray((match.match_breakdown as any)?.follow_ups) &&
                  (match.match_breakdown as any)!.follow_ups.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 bg-slate-50 border border-slate-100 rounded-lg p-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">
                        Chasers Sent ({(match.match_breakdown as any)!.follow_ups.length}):
                      </span>
                      {(match.match_breakdown as any)!.follow_ups.map((fu: any, fuIdx: number) => (
                        <span
                          key={fuIdx}
                          className="text-[10px] bg-white border border-slate-200 text-slate-700 px-2 py-0.5 rounded shadow-2xs font-medium"
                        >
                          {fu.channel === "email" ? "📧" : "💬"} R{fu.round} ({fu.language?.toUpperCase()}) · {new Date(fu.date).toLocaleDateString("en-GB")}
                        </span>
                      ))}
                    </div>
                  )}

                {isResponding && (
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
                          setRespondingIds((st) => {
                            const next = new Set(st);
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
                          setRespondingIds((st) => {
                            const next = new Set(st);
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

            {/* ── Responded state: show quote and note ── */}
            {s === "responded" && (
              <div className="mt-4 border-t border-gray-100 pt-3 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                    <span>✅ Factory Quoted</span>
                    {match.responded_at && (
                      <span className="text-[11px] font-normal text-slate-400">
                        ({fmtDate(match.responded_at)})
                      </span>
                    )}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openCardQuoteModal(match)}
                      className="text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer"
                    >
                      <span>📝</span>
                      <span>Edit Quote</span>
                    </button>
                    <a
                      href={`/supplier-match/${match.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 px-2.5 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer"
                    >
                      <span>🌐</span>
                      <span>Portal ↗</span>
                    </a>
                  </div>
                </div>

                {Boolean((match.match_breakdown as any)?.quote?.unit_price) && (
                  <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-950 text-sm">
                        {(match.match_breakdown as any)!.quote.currency}{" "}
                        {Number((match.match_breakdown as any)!.quote.unit_price).toFixed(2)}
                      </span>
                      <span className="text-[11px] font-semibold text-emerald-800 bg-white border border-emerald-200 px-2 py-0.5 rounded">
                        {(match.match_breakdown as any)!.quote.incoterm || "CIF Ashdod"}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-slate-600 text-[11px] pt-1">
                      {(match.match_breakdown as any)!.quote.moq && (
                        <span>MOQ: <strong>{(match.match_breakdown as any)!.quote.moq}</strong></span>
                      )}
                      {(match.match_breakdown as any)!.quote.lead_time_weeks && (
                        <span>Lead Time: <strong>{(match.match_breakdown as any)!.quote.lead_time_weeks}w</strong></span>
                      )}
                      {(match.match_breakdown as any)!.quote.packaging_format && (
                        <span>Pack: <strong>{(match.match_breakdown as any)!.quote.packaging_format}</strong></span>
                      )}
                    </div>
                  </div>
                )}

                {match.response_note && (
                  <p className="text-xs text-gray-700 leading-relaxed bg-slate-50 border border-slate-200 rounded-lg p-3">
                    {match.response_note}
                  </p>
                )}
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

      {/* Supplier Quote Recording Modal */}
      {quoteMatch && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveQuoteModal}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Record Factory Quote: {quoteMatch.company_name}
                </h3>
                <p className="text-xs text-slate-500">
                  Product: {quoteMatch.product_name} · Match Score {quoteMatch.match_score}/100
                </p>
              </div>
              <button
                type="button"
                onClick={() => setQuoteMatch(null)}
                className="w-7 h-7 rounded-full hover:bg-slate-200 text-slate-500 flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">
                    Offered Unit Price (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="0.85"
                    value={quoteForm.unit_price ?? ""}
                    onChange={(e) =>
                      setQuoteForm((q) => ({
                        ...q,
                        unit_price: e.target.value === "" ? null : Number(e.target.value),
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">
                    Currency
                  </label>
                  <select
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white font-medium"
                    value={quoteForm.currency ?? "EUR"}
                    onChange={(e) => setQuoteForm((q) => ({ ...q, currency: e.target.value }))}
                  >
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                    <option value="ILS">ILS (₪)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">
                    Pack Net Weight (e.g. 1L, 400g, 500ml)
                  </label>
                  <input
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="1L / 400g"
                    value={quoteForm.net_weight ?? ""}
                    onChange={(e) => setQuoteForm((q) => ({ ...q, net_weight: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">
                    Packaging Format
                  </label>
                  <input
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="PET Bottle / Glass Jar / Tin Can"
                    value={quoteForm.packaging_format ?? ""}
                    onChange={(e) =>
                      setQuoteForm((q) => ({ ...q, packaging_format: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">
                    Minimum Order Quantity (MOQ)
                  </label>
                  <input
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="1 x 40ft HQ FCL / 25,000 units"
                    value={quoteForm.moq ?? ""}
                    onChange={(e) => setQuoteForm((q) => ({ ...q, moq: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">
                    Incoterm
                  </label>
                  <input
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="CIF Ashdod / FOB Valencia"
                    value={quoteForm.incoterm ?? ""}
                    onChange={(e) => setQuoteForm((q) => ({ ...q, incoterm: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">
                    Lead Time (weeks)
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="3"
                    value={quoteForm.lead_time_weeks ?? ""}
                    onChange={(e) =>
                      setQuoteForm((q) => ({
                        ...q,
                        lead_time_weeks: e.target.value === "" ? null : Number(e.target.value),
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">
                    Kosher Standard
                  </label>
                  <input
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Kosher (Chief Rabbinate) / Badatz"
                    value={quoteForm.kosher_type ?? ""}
                    onChange={(e) => setQuoteForm((q) => ({ ...q, kosher_type: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 uppercase mb-1">
                  Cooperation Intention
                </label>
                <select
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white font-semibold"
                  value={quoteForm.cooperation_status}
                  onChange={(e) =>
                    setQuoteForm((q) => ({
                      ...q,
                      cooperation_status: e.target.value as any,
                    }))
                  }
                >
                  <option value="cooperating">Ready to Cooperate & Supply ✓</option>
                  <option value="counter_offer">Counter-Offer / Modified Specs</option>
                  <option value="declined">Declined / Cannot Supply</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 uppercase mb-1">
                  Supplier Notes & Technical Details
                </label>
                <textarea
                  rows={2}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Shelf life, payment terms (30/70), palletization specs..."
                  value={quoteForm.supplier_notes ?? ""}
                  onChange={(e) =>
                    setQuoteForm((q) => ({ ...q, supplier_notes: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setQuoteMatch(null)}
                className="text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="text-xs font-semibold px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition flex items-center gap-2 cursor-pointer shadow-xs"
              >
                {isPending && <Spinner size="sm" />}
                {isPending ? "Saving Quote…" : "Save Quote to Decision Board"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Supplier Follow-Up Chaser Modal */}
      {chaserMatch && (
        <SupplierChaserModal
          isOpen={Boolean(chaserMatch)}
          onClose={() => setChaserMatch(null)}
          requestId={requestId}
          match={chaserMatch}
          contact={contactMap[chaserMatch.supplier_id] ?? { email: null, phone: null }}
          specsSummary={
            [
              rfqRequestVars.volume ? `Qty: ${rfqRequestVars.volume}` : "",
              rfqRequestVars.certifications ? `Certs: ${rfqRequestVars.certifications}` : "",
              rfqRequestVars.request_description || "",
            ]
              .filter(Boolean)
              .join(" · ") || "Standard export specifications, Kosher preferred"
          }
          onSuccess={() => {
            startTransition(() => router.refresh());
          }}
        />
      )}

      {/* Bulk Chaser Modal for All Stalled Suppliers */}
      {bulkChaserOpen && (
        <BulkChaserModal
          isOpen={bulkChaserOpen}
          onClose={() => setBulkChaserOpen(false)}
          requestId={requestId}
          matches={pendingFollowUpMatches}
          contactMap={contactMap}
          onComplete={() => {
            startTransition(() => router.refresh());
          }}
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
