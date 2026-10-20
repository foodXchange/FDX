"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { InboundAiParseResult } from "@/lib/email/inboundAiParser";

interface Props {
  requestId: string;
  productName: string;
  buyerCompany: string;
  suppliers: {
    matchId: string;
    supplierId: string;
    companyName: string;
    productName: string;
    country: string | null;
  }[];
}

export default function InboundCorrespondenceHub({
  requestId,
  productName,
  buyerCompany,
  suppliers,
}: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Manual paste / simulation state
  const [selectedMatchId, setSelectedMatchId] = useState<string>(suppliers[0]?.matchId || "");
  const [fromEmail, setFromEmail] = useState("export@sovena.com");
  const [subject, setSubject] = useState(`Re: [FDX-REQ-${requestId.slice(0, 8).toUpperCase()}] Sourcing Inquiry: ${productName}`);
  const [bodyText, setBodyText] = useState(
    `Dear FoodXchange team,

Thank you for your inquiry for ${productName}.
We are pleased to offer our Extra Virgin Olive Oil 1L PET bottle at €0.82 / unit CIF Ashdod Port.
Our MOQ is 1 x 40ft HQ container (approx 24,000 bottles).
Lead time is 3 weeks after deposit.
Kosher certification is confirmed under Chief Rabbinate of Israel supervision.
We are dispatching sample bottles today via DHL Express, AWB tracking #2498104812.

Best regards,
Carlos Martinez
Export Sales Director`
  );

  const [parseResult, setParseResult] = useState<InboundAiParseResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [appliedNotice, setAppliedNotice] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const projectTag = `[FDX-REQ-${requestId.slice(0, 8).toUpperCase()}]`;

  // 1. Sync Live Gmail Replies
  async function handleGmailSync() {
    setSyncStatus("Connecting to Gmail IMAP & scanning inbox for replies...");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/admin/notifications/sync-gmail", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to sync Gmail");
      }
      setSyncStatus(`Sync complete! Scanned ${data.scannedCount || 0} messages in ${Math.round((data.durationMs || 0) / 100) / 10}s. Found ${data.syncedCount || 0} matching supplier replies.`);
      startTransition(() => router.refresh());
      setTimeout(() => setSyncStatus(null), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || "Gmail sync failed");
      setTimeout(() => setErrorMsg(null), 6000);
    }
  }

  // 2. Analyze Raw Text with Gemini 3.8 Flash
  async function handleAnalyze() {
    setIsAnalyzing(true);
    setErrorMsg(null);
    setParseResult(null);

    try {
      const res = await fetch("/api/admin/correspondence/inbound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          matchId: selectedMatchId || null,
          fromEmail,
          subject,
          bodyText,
          autoApply: false, // preview first
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to analyze text");
      }

      setParseResult(data.parsed);
    } catch (err: any) {
      setErrorMsg(err.message || "AI Analysis failed");
    } finally {
      setIsAnalyzing(false);
    }
  }

  // 3. Apply Analyzed Data into Stages
  async function handleApplyToStages() {
    if (!parseResult) return;
    setIsAnalyzing(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/admin/correspondence/inbound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          matchId: selectedMatchId || null,
          fromEmail,
          subject,
          bodyText,
          autoApply: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to apply to request");
      }

      const updated = data.updatedStages?.join(", ") || "Project Stages";
      setAppliedNotice(`Success! Updated ${updated} with zero manual entry.`);
      setModalOpen(false);
      startTransition(() => router.refresh());
      setTimeout(() => setAppliedNotice(null), 6000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to apply changes");
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <div className="bg-slate-900 text-white border border-slate-800 rounded-2xl shadow-xl p-6 mb-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 bg-cyan-950/80 px-2.5 py-0.5 rounded-md border border-cyan-800">
              ⚡ AI Automation Hub
            </span>
            <span className="font-mono text-xs font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
              {projectTag}
            </span>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-700/80 px-2 py-0.5 rounded-full flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Zero-Touch Poller: Active (10m interval)</span>
            </span>
          </div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>🤖</span>
            <span>Inbound AI Correspondence & Automated Pipeline Parser</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Solves correspondence scale across 50+ projects. Gemini 3.8 Flash auto-parses supplier emails, price quotes, DHL tracking numbers, and spec sheets directly into Stages 3, 4, 5, and 7.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleGmailSync}
            className="text-xs font-bold px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition cursor-pointer shadow-xs flex items-center gap-1.5"
          >
            <span>🔄</span>
            <span>Sync Gmail Inbox</span>
          </button>

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="text-xs font-bold px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl transition cursor-pointer shadow-xs flex items-center gap-1.5"
          >
            <span>📋</span>
            <span>Paste Supplier Reply</span>
          </button>
        </div>
      </div>

      {/* Status Messages */}
      {syncStatus && (
        <div className="mt-4 p-3 rounded-xl bg-blue-950/60 border border-blue-800 text-blue-200 text-xs flex items-center gap-2 animate-in fade-in">
          <span>ℹ️</span>
          <span>{syncStatus}</span>
        </div>
      )}

      {appliedNotice && (
        <div className="mt-4 p-3 rounded-xl bg-emerald-950/80 border border-emerald-700 text-emerald-200 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <span>✓</span>
          <span>{appliedNotice}</span>
        </div>
      )}

      {errorMsg && (
        <div className="mt-4 p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <span>⚠️</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Feature Pillars Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 text-xs">
        <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-3">
          <div className="flex items-center gap-2 font-bold text-cyan-300 mb-1">
            <span>💶</span>
            <span>Quotes $\rightarrow$ Stage 3</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Unit prices, pack net weights, and MOQ auto-populate the Product Comparison Matrix.
          </p>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-3">
          <div className="flex items-center gap-2 font-bold text-cyan-300 mb-1">
            <span>✈️</span>
            <span>AWB $\rightarrow$ Stage 4</span>
          </div>
          <p className="text-[11px] text-slate-400">
            DHL, FedEx & UPS tracking numbers auto-populate the Live Sample Tracker.
          </p>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-3">
          <div className="flex items-center gap-2 font-bold text-cyan-300 mb-1">
            <span>🛡️</span>
            <span>Certs $\rightarrow$ Stage 5</span>
          </div>
          <p className="text-[11px] text-slate-400">
            BRC, IFS, ISO, and Kosher confirmations auto-route to the QA Regulatory Dossier.
          </p>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-3">
          <div className="flex items-center gap-2 font-bold text-cyan-300 mb-1">
            <span>🚢</span>
            <span>B/L $\rightarrow$ Stage 7</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Ocean container numbers and Bill of Lading codes auto-populate logistics milestones.
          </p>
        </div>
      </div>

      {/* ── Modal: Paste & Parse Supplier Reply ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 text-white text-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-cyan-400 flex items-center gap-2">
                  <span>🤖</span>
                  <span>AI Correspondence Ingestion & Auto-Parser</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Paste incoming supplier email or WhatsApp message (in any European language). Gemini 3.8 Flash will extract commercial terms.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                    Matching Factory Supplier
                  </label>
                  <select
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white font-semibold"
                    value={selectedMatchId}
                    onChange={(e) => setSelectedMatchId(e.target.value)}
                  >
                    {suppliers.map((s) => (
                      <option key={s.matchId} value={s.matchId}>
                        {s.companyName} ({s.country || "EU"}) — {s.productName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                    Sender Email Address
                  </label>
                  <input
                    type="text"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white font-mono"
                    value={fromEmail}
                    onChange={(e) => setFromEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                  Email Subject Line (with Tracking Tag)
                </label>
                <input
                  type="text"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white font-mono"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                  Raw Inbound Message / Email Body
                </label>
                <textarea
                  rows={6}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-200 font-mono text-[11px] leading-relaxed"
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="text-xs font-bold px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-md"
                >
                  <span>{isAnalyzing ? "Analyzing with Gemini Flash..." : "⚡ Analyze Message"}</span>
                </button>
              </div>

              {/* Analyzed Results Card */}
              {parseResult && (
                <div className="bg-slate-950 border border-cyan-800/80 rounded-xl p-4 mt-4 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-xs">Detected Intent:</span>
                      <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                        {parseResult.intent.replace(/_/g, " ")}
                      </span>
                    </div>
                    <span className="text-slate-400 text-[11px]">
                      Confidence: {(parseResult.confidence * 100).toFixed(0)}%
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                      Executive English Summary:
                    </span>
                    <p className="text-slate-200 font-medium leading-relaxed bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                      {parseResult.english_summary}
                    </p>
                  </div>

                  {/* Extracted Fields Matrix */}
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    {parseResult.quote_data?.unit_price && (
                      <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                        <span className="text-slate-400 block text-[10px]">Extracted Unit Price:</span>
                        <span className="font-bold text-emerald-400">
                          {parseResult.quote_data.currency || "€"}{parseResult.quote_data.unit_price} / {parseResult.quote_data.net_weight || "unit"} ({parseResult.quote_data.incoterm || "CIF"})
                        </span>
                      </div>
                    )}

                    {parseResult.quote_data?.moq && (
                      <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                        <span className="text-slate-400 block text-[10px]">Extracted MOQ:</span>
                        <span className="font-bold text-white">{parseResult.quote_data.moq}</span>
                      </div>
                    )}

                    {parseResult.sample_data?.awb_tracking_number && (
                      <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                        <span className="text-slate-400 block text-[10px]">Courier & AWB Tracking #:</span>
                        <span className="font-mono font-bold text-purple-300">
                          {parseResult.sample_data.courier_name || "DHL"} · {parseResult.sample_data.awb_tracking_number}
                        </span>
                      </div>
                    )}

                    {parseResult.quote_data?.kosher_type && (
                      <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                        <span className="text-slate-400 block text-[10px]">Kosher Confirmation:</span>
                        <span className="font-bold text-amber-300">{parseResult.quote_data.kosher_type}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                    <span className="text-slate-400 text-[11px]">
                      Recommended Pipeline Target: <strong className="text-cyan-300">{parseResult.recommended_stage}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={handleApplyToStages}
                      className="text-xs font-bold px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition cursor-pointer shadow-md flex items-center gap-1.5"
                    >
                      <span>✓ Auto-Apply to Project Pipeline</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
