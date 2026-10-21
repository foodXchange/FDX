"use client";

import { useMemo, useState } from "react";
import type { PipelineRow } from "./PipelineTable";

interface Props {
  deals: PipelineRow[];
  selectedIds: Set<string>;
  isOpen: boolean;
  onClose: () => void;
  onDispatched: (dispatchedIds: string[]) => void;
}

export default function BulkRfqDispatchModal({
  deals,
  selectedIds,
  isOpen,
  onClose,
  onDispatched,
}: Props) {
  if (!isOpen) return null;

  const selectedDeals = useMemo(() => {
    return deals.filter((d) => selectedIds.has(d.id));
  }, [deals, selectedIds]);

  // Group by request_id
  const dealsByRequest = useMemo(() => {
    const map = new Map<string, PipelineRow[]>();
    for (const d of selectedDeals) {
      const list = map.get(d.request_id) ?? [];
      list.push(d);
      map.set(d.request_id, list);
    }
    return map;
  }, [selectedDeals]);

  const defaultDeadline = () => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  };

  const [subject, setSubject] = useState(
    "[RFQ] Sourcing Request: {{product_name}} (CIF Haifa / Ashdod)"
  );
  const [body, setBody] = useState(
    `Hello {{supplier_company}},\n\nFoodXchange has received an active commercial sourcing brief from a verified Israeli buyer ({{buyer_company}}) for {{product_name}}.\n\nBased on your manufacturing capabilities, your facility scored an algorithmic match.\n\nPlease review the brief details below and submit your best FOB or CIF Haifa pricing and earliest production availability.\n\nBest regards,\nFoodXchange International Sourcing Desk`
  );
  const [deadline, setDeadline] = useState(defaultDeadline);
  const [isSending, setIsSending] = useState(false);
  const [progressMsg, setProgressMsg] = useState<string | null>(null);
  const [resultsLog, setResultsLog] = useState<{ name: string; success: boolean; msg: string }[]>([]);

  async function handleDispatchAll() {
    setIsSending(true);
    setProgressMsg("Preparing batch RFQ dispatch...");
    setResultsLog([]);

    const successfullyDispatched: string[] = [];
    const requestEntries = Array.from(dealsByRequest.entries());

    let currentReqIndex = 0;
    for (const [reqId, requestDeals] of requestEntries) {
      currentReqIndex++;
      const reqName = requestDeals[0]?.buyer_product || requestDeals[0]?.product_name || "Sourcing Brief";
      setProgressMsg(`Sending batch ${currentReqIndex} of ${requestEntries.length}: "${reqName}" (${requestDeals.length} factories)...`);

      try {
        const payload = {
          requestId: reqId,
          matchIds: requestDeals.map((d) => d.id),
          subject,
          body,
          deadline,
        };

        const res = await fetch("/api/admin/rfq/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json().catch(() => null);

        if (res.ok && data?.results) {
          for (const item of data.results) {
            if (item.success) {
              successfullyDispatched.push(item.matchId);
              setResultsLog((prev) => [
                ...prev,
                { name: item.company_name || "Supplier", success: true, msg: `Sent via ${item.via || "email"}` },
              ]);
            } else {
              setResultsLog((prev) => [
                ...prev,
                { name: item.company_name || "Supplier", success: false, msg: item.error || "Failed to dispatch" },
              ]);
            }
          }
        } else {
          for (const d of requestDeals) {
            setResultsLog((prev) => [
              ...prev,
              { name: d.company_name, success: false, msg: data?.error || `HTTP ${res.status}` },
            ]);
          }
        }
      } catch (err: any) {
        for (const d of requestDeals) {
          setResultsLog((prev) => [
            ...prev,
            { name: d.company_name, success: false, msg: err?.message || "Network exception" },
          ]);
        }
      }
    }

    setIsSending(false);
    setProgressMsg(`Completed! Dispatched ${successfullyDispatched.length} RFQs successfully.`);

    if (successfullyDispatched.length > 0) {
      onDispatched(successfullyDispatched);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 to-slate-800 text-white">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Bulk RFQ Dispatch Engine
              </span>
            </div>
            <h3 className="text-lg font-black tracking-tight mt-0.5">
              Dispatch RFQs to {selectedDeals.length} Verified Factories
            </h3>
            <p className="text-xs text-slate-300">
              Spans {dealsByRequest.size} buyer brief{dealsByRequest.size !== 1 ? "s" : ""} across verified international food manufacturers.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white transition p-1.5 rounded-lg text-lg leading-none cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-sm text-slate-700">
          {/* Target Factories Summary Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Selected Target Factories ({selectedDeals.length}):
            </label>
            <div className="max-h-28 overflow-y-auto space-y-1.5 pr-2">
              {selectedDeals.map((d) => (
                <div key={d.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-200/60 last:border-b-0">
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-semibold text-slate-900 truncate">{d.company_name}</span>
                    <span className="text-slate-500">({d.country || "Origin"})</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-600 truncate">{d.product_name}</span>
                  </div>
                  <span className="font-bold text-orange-600 shrink-0 ml-2">{d.match_score}% match</span>
                </div>
              ))}
            </div>
          </div>

          {/* Form Inputs */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Email Subject Template:
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full text-xs font-mono bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Variables: <code className="text-slate-600 font-bold">&#123;&#123;product_name&#125;&#125;</code>, <code className="text-slate-600 font-bold">&#123;&#123;buyer_company&#125;&#125;</code>, <code className="text-slate-600 font-bold">&#123;&#123;supplier_company&#125;&#125;</code>
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Outreach Message Body:
              </label>
              <textarea
                rows={5}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full text-xs font-mono bg-white border border-slate-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 leading-relaxed"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Automatically attaches benchmark product packaging image and buyer specifications card.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Supplier Response Deadline:
                </label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800"
                />
              </div>

              <div className="flex items-end">
                <div className="text-[11px] text-slate-500 bg-amber-50 border border-amber-200/60 rounded-xl p-2.5 w-full">
                  ⚡ Automatic tracking tokens are embedded to record supplier quote submissions.
                </div>
              </div>
            </div>
          </div>

          {/* Progress / Status Logs */}
          {progressMsg && (
            <div className="p-3 rounded-xl bg-slate-900 text-white text-xs font-mono flex items-center gap-2">
              {isSending && <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />}
              <span>{progressMsg}</span>
            </div>
          )}

          {resultsLog.length > 0 && (
            <div className="border border-slate-200 rounded-xl max-h-36 overflow-y-auto p-2.5 text-xs space-y-1 bg-slate-50">
              <div className="font-bold text-slate-600 uppercase text-[10px] mb-1">Dispatch Results:</div>
              {resultsLog.map((r, i) => (
                <div key={i} className="flex items-center justify-between py-0.5">
                  <span className="font-medium text-slate-800 truncate">{r.name}</span>
                  <span className={`text-[11px] font-bold ${r.success ? "text-emerald-600" : "text-rose-600"}`}>
                    {r.success ? "✓ " : "✕ "} {r.msg}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={isSending}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition cursor-pointer"
          >
            {resultsLog.length > 0 ? "Close" : "Cancel"}
          </button>

          <button
            type="button"
            onClick={handleDispatchAll}
            disabled={isSending || selectedDeals.length === 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-600/25 transition disabled:opacity-50 cursor-pointer"
          >
            {isSending ? (
              <>
                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Dispatching Batch...</span>
              </>
            ) : (
              <>
                <span>🚀</span>
                <span>Send Batch RFQs ({selectedDeals.length})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
