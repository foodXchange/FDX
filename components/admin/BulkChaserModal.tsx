"use client";

import React, { useState } from "react";
import {
  detectSupplierLanguage,
  evaluateFollowUpUrgency,
  type ChaserLanguage,
  type ChaserRound,
} from "@/lib/outreach/chaserTemplates";
import { sendBulkSupplierFollowUps } from "@/app/admin/requests/actions";

interface MatchItem {
  id: string;
  company_name: string | null;
  product_name: string | null;
  country: string | null;
  match_score: number;
  sent_at: string | null;
  status: string;
  match_breakdown: Record<string, any> | null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  requestId: string;
  matches: MatchItem[];
  contactMap: Record<string, { email: string | null; phone: string | null }>;
  onComplete?: () => void;
}

export default function BulkChaserModal({
  isOpen,
  onClose,
  requestId,
  matches,
  contactMap,
  onComplete,
}: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(matches.map((m) => m.id))
  );
  const [langStrategy, setLangStrategy] = useState<"auto" | "en">("auto");
  const [roundStrategy, setRoundStrategy] = useState<"auto" | 1 | 2>("auto");

  const [isSending, setIsSending] = useState(false);
  const [progressMsg, setProgressMsg] = useState<string | null>(null);
  const [results, setResults] = useState<
    Array<{
      matchId: string;
      companyName: string | null;
      success: boolean;
      error?: string;
      via?: "gmail" | "resend" | "whatsapp";
      language: ChaserLanguage;
      round: ChaserRound;
    }> | null
  >(null);

  if (!isOpen) return null;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === matches.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(matches.map((m) => m.id)));
    }
  };

  const handleLaunch = async () => {
    const targetIds = matches
      .filter((m) => selectedIds.has(m.id))
      .map((m) => m.id);

    if (targetIds.length === 0) return;

    setIsSending(true);
    setProgressMsg(`Initiating chaser campaign for ${targetIds.length} suppliers…`);
    setResults(null);

    try {
      const res = await sendBulkSupplierFollowUps({
        requestId,
        matchIds: targetIds,
        preferredLanguage: langStrategy,
        preferredRound: roundStrategy,
      });

      setResults(res.results);
      if (onComplete) {
        onComplete();
      }
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setIsSending(false);
      setProgressMsg(null);
    }
  };

  const selectedMatches = matches.filter((m) => selectedIds.has(m.id));

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">⚡</span>
              <h3 className="text-base font-bold text-slate-900">
                Bulk Supplier Follow-Up & Chaser Queue
              </h3>
              <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2.5 py-0.5 rounded-full border border-amber-300">
                {matches.length} Stalled Suppliers
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Automate multilingual follow-up bumps (Email & WhatsApp) for unanswered inquiries past 48h.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center text-sm font-bold transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 space-y-4 overflow-y-auto text-xs">
          {!results ? (
            <>
              {/* Campaign Strategy Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1.5">
                    Multilingual Targeting Strategy
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setLangStrategy("auto")}
                      className={`text-xs px-2.5 py-1.5 rounded-lg border flex-1 text-left transition ${
                        langStrategy === "auto"
                          ? "bg-white border-blue-500 font-bold text-blue-900 shadow-2xs"
                          : "border-slate-200 text-slate-600 hover:bg-white"
                      }`}
                    >
                      <span>🇪🇸 🇮🇹 🇬🇧 Auto by Country</span>
                      <p className="text-[10px] text-slate-400 font-normal">
                        Spanish (ES), Italian (IT), English (EU)
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setLangStrategy("en")}
                      className={`text-xs px-2.5 py-1.5 rounded-lg border flex-1 text-left transition ${
                        langStrategy === "en"
                          ? "bg-white border-blue-500 font-bold text-blue-900 shadow-2xs"
                          : "border-slate-200 text-slate-600 hover:bg-white"
                      }`}
                    >
                      <span>🇬🇧 English Only</span>
                      <p className="text-[10px] text-slate-400 font-normal">
                        All correspondence in English
                      </p>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1.5">
                    Follow-Up Urgency Round
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setRoundStrategy("auto")}
                      className={`text-xs px-2.5 py-1.5 rounded-lg border flex-1 text-left transition ${
                        roundStrategy === "auto"
                          ? "bg-white border-orange-500 font-bold text-orange-900 shadow-2xs"
                          : "border-slate-200 text-slate-600 hover:bg-white"
                      }`}
                    >
                      <span>⚡ Auto-Cadence</span>
                      <p className="text-[10px] text-slate-400 font-normal">
                        Round 1 (&gt;48h) / Round 2 (&gt;96h)
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRoundStrategy(1)}
                      className={`text-xs px-2.5 py-1.5 rounded-lg border flex-1 text-left transition ${
                        roundStrategy === 1
                          ? "bg-white border-orange-500 font-bold text-orange-900 shadow-2xs"
                          : "border-slate-200 text-slate-600 hover:bg-white"
                      }`}
                    >
                      <span>📨 Round 1 Gentle</span>
                      <p className="text-[10px] text-slate-400 font-normal">
                        Friendly check-in & specs
                      </p>
                    </button>
                  </div>
                </div>
              </div>

              {/* Stalled Suppliers Selection Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-100/80 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === matches.length && matches.length > 0}
                      onChange={toggleAll}
                      className="rounded border-slate-300"
                    />
                    <span className="font-bold text-slate-700">
                      Select All ({selectedIds.size}/{matches.length})
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Threaded under original Gmail Subject with [FDX-REQ] Reference Tag
                  </span>
                </div>

                <div className="divide-y divide-slate-100 max-h-[360px] overflow-y-auto">
                  {matches.map((m) => {
                    const assessment = evaluateFollowUpUrgency(m);
                    const lang = detectSupplierLanguage(m.country);
                    const contact = contactMap[m.id] || {};
                    const hasEmail = Boolean(contact.email);
                    const isSelected = selectedIds.has(m.id);

                    return (
                      <div
                        key={m.id}
                        onClick={() => toggleSelect(m.id)}
                        className={`px-4 py-3 flex items-center justify-between gap-3 transition cursor-pointer ${
                          isSelected ? "bg-orange-50/40" : "hover:bg-slate-50 opacity-60"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(m.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded border-slate-300"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-xs">
                                {m.company_name}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                {m.country || "Global"}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500">
                              {m.product_name} · Score {m.match_score}/100
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Language Pill */}
                          <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                            {lang === "es" ? "🇪🇸 ES" : lang === "it" ? "🇮🇹 IT" : "🇬🇧 EN"}
                          </span>

                          {/* Urgency Badge */}
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded border ${assessment.badgeClass}`}
                          >
                            {assessment.daysElapsed}d stalled · R{assessment.recommendedRound}
                          </span>

                          {/* Email Status */}
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                              hasEmail
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-red-50 text-red-600 border border-red-200"
                            }`}
                          >
                            {hasEmail ? "✓ Email Ready" : "⚠️ Need Email"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            /* Results View */
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🎉</span>
                  <div>
                    <h4 className="font-bold text-emerald-950 text-sm">
                      Campaign Completed Successfully
                    </h4>
                    <p className="text-xs text-emerald-800">
                      Processed {results.length} suppliers: {results.filter((r) => r.success).length} sent, {results.filter((r) => !r.success).length} failed.
                    </p>
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-[360px] overflow-y-auto">
                {results.map((r, i) => (
                  <div
                    key={i}
                    className="px-4 py-2.5 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className={r.success ? "text-emerald-600 font-bold" : "text-red-500 font-bold"}>
                        {r.success ? "✓" : "✕"}
                      </span>
                      <span className="font-semibold text-slate-900">
                        {r.companyName || "Supplier"}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        ({r.language.toUpperCase()} · Round {r.round})
                      </span>
                    </div>
                    <div>
                      {r.success ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Sent via {r.via === "gmail" ? "Gmail SMTP" : "Resend"}
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                          {r.error || "Failed"}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-slate-500 hover:text-slate-800 font-semibold px-3 py-1.5 rounded-lg transition"
          >
            {results ? "Close" : "Cancel"}
          </button>

          {!results ? (
            <button
              type="button"
              onClick={handleLaunch}
              disabled={isSending || selectedMatches.length === 0}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-50 px-4 py-2 rounded-xl transition shadow-xs cursor-pointer"
            >
              {isSending ? (
                <span>{progressMsg || "Sending Chaser Bumps…"}</span>
              ) : (
                <span>
                  🚀 Launch Chaser Bumps ({selectedMatches.length} Suppliers)
                </span>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 px-4 py-2 rounded-xl transition cursor-pointer"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
