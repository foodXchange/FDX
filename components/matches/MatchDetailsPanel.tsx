"use client";

import { useEffect, useState } from "react";
import type { SupplierMatch } from "./types";
import MatchPipelineBadge from "./MatchPipelineBadge";
import MatchReplyForm from "./MatchReplyForm";
import MatchMessageThread from "./MatchMessageThread";
import MatchDocumentList from "./MatchDocumentList";
import { getPipelineStatus } from "@/lib/matches/pipelineStatus";
import { cleanRequestName } from "@/lib/matching/cleanRequestName";
import { markMatchViewedByBuyer } from "@/app/en/portal/requests/[id]/actions";

type Tab = "details" | "reply" | "messages" | "documents";

const SUPPLIER_TABS: { id: Tab; label: string }[] = [
  { id: "details", label: "Details" },
  { id: "reply", label: "Reply" },
  { id: "messages", label: "Messages" },
  { id: "documents", label: "Documents" },
];

const BUYER_TABS: { id: Tab; label: string }[] = [
  { id: "details", label: "Details" },
  { id: "messages", label: "Messages" },
  { id: "documents", label: "Documents" },
];

export default function MatchDetailsPanel({
  match,
  viewerRole,
  onClose,
}: {
  match: SupplierMatch;
  viewerRole: "supplier" | "buyer";
  onClose: () => void;
}) {
  const tabs = viewerRole === "buyer" ? BUYER_TABS : SUPPLIER_TABS;
  const [tab, setTab] = useState<Tab>("details");
  const request = match.sourcing_requests;
  const rawName = request?.product_name ?? "";
  const productName = (rawName ? cleanRequestName(rawName) : "") || rawName || "Sourcing request";
  const pipeline = getPipelineStatus(match);
  const messagingDisabled = pipeline === "closed" || pipeline === "declined";

  const headerTitle = viewerRole === "buyer" ? match.company_name || "Supplier" : productName;
  const headerSubtitle = viewerRole === "buyer" ? match.country : request?.company;

  useEffect(() => {
    if (viewerRole === "buyer") {
      void markMatchViewedByBuyer(match.id);
    }
  }, [viewerRole, match.id]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg h-full bg-[#0b1620] border-l border-white/10 flex flex-col">
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-white/10 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-white">{headerTitle}</h2>
            {headerSubtitle && <p className="text-sm text-slate-400 mt-0.5">{headerSubtitle}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <MatchPipelineBadge match={match} />
            <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-xl leading-none">
              ×
            </button>
          </div>
        </div>

        <div className="flex border-b border-white/10 px-6 shrink-0">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
                tab === t.id ? "border-orange-500 text-white" : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0">
          {tab === "details" && <DetailsTab match={match} viewerRole={viewerRole} />}
          {tab === "reply" && (
            <MatchReplyForm
              matchId={match.id}
              existingResponse={match.supplier_response}
              existingMessage={match.supplier_message}
            />
          )}
          {tab === "messages" && (
            <MatchMessageThread matchId={match.id} disabled={messagingDisabled} viewerRole={viewerRole} />
          )}
          {tab === "documents" && (
            <MatchDocumentList matchId={match.id} disabled={messagingDisabled} viewerRole={viewerRole} />
          )}
        </div>
      </div>
    </div>
  );
}

function DetailsTab({ match, viewerRole }: { match: SupplierMatch; viewerRole: "supplier" | "buyer" }) {
  if (viewerRole === "buyer") {
    const chips = Array.from(
      new Set([...(match.match_breakdown?.certifications ?? []), ...(match.match_breakdown?.kosher_types ?? [])])
    );

    return (
      <div className="space-y-5">
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {chips.map((c) => (
              <span key={c} className="text-xs px-2.5 py-1 rounded-full bg-white/5 text-slate-300">
                {c}
              </span>
            ))}
          </div>
        )}

        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Timeline</p>
          <Timeline match={match} />
        </div>

        {match.supplier_message && (
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Supplier&apos;s reply</p>
            <p className="text-sm text-slate-300 whitespace-pre-wrap">{match.supplier_message}</p>
          </div>
        )}
      </div>
    );
  }

  const request = match.sourcing_requests;
  const certs = request?.certifications ?? [];
  const hasKosher = certs.some((c) => c.toLowerCase().includes("kosher"));

  return (
    <div className="space-y-5">
      {(request?.category || hasKosher || request?.volume || request?.urgency) && (
        <div className="flex flex-wrap gap-2">
          {request?.category && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-300">{request.category}</span>
          )}
          {hasKosher && <span className="text-xs px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-300">✡ Kosher required</span>}
          {request?.volume && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-white/5 text-slate-300">Volume: {request.volume}</span>
          )}
          {request?.urgency && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-white/5 text-slate-300">Timeline: {request.urgency}</span>
          )}
        </div>
      )}

      {request?.message && (
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Buyer request</p>
          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{request.message}</p>
        </div>
      )}

      <div>
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Timeline</p>
        <Timeline match={match} />
      </div>

      {match.supplier_message && (
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Your reply</p>
          <p className="text-sm text-slate-300 whitespace-pre-wrap">{match.supplier_message}</p>
        </div>
      )}
    </div>
  );
}

function Timeline({ match }: { match: SupplierMatch }) {
  const steps: { label: string; date: string | null }[] = [
    { label: "Sent", date: match.sent_at ?? match.created_at },
    { label: "Replied", date: match.supplier_responded_at },
    { label: "Closed", date: match.closed_at },
  ];

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-center gap-1">
          <div className="flex flex-col items-center">
            <span className={`text-xs font-medium ${step.date ? "text-slate-200" : "text-slate-500"}`}>{step.label}</span>
            <span className="text-[10px] text-slate-500">
              {step.date ? new Date(step.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "—"}
            </span>
          </div>
          {i < steps.length - 1 && <span className="text-slate-600 mx-1">→</span>}
        </div>
      ))}
    </div>
  );
}
