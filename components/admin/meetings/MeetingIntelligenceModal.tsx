"use client";

import { useState } from "react";
import type { MeetingAiSummary } from "@/lib/ai/meetingSummarizer";

interface Props {
  deal: {
    id: string;
    company_name: string;
    product_name: string;
    buyer_company?: string | null;
    match_score?: number;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function MeetingIntelligenceModal({
  deal,
  isOpen,
  onClose,
  onSuccess,
}: Props) {
  if (!isOpen || !deal) return null;

  return (
    <MeetingIntelligenceModalInner
      deal={deal}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}

function MeetingIntelligenceModalInner({
  deal,
  onClose,
  onSuccess,
}: {
  deal: NonNullable<Props["deal"]>;
  onClose: () => void;
  onSuccess?: () => void;
}) {

  const [activeTab, setActiveTab] = useState<"schedule" | "summarize">("schedule");

  // Schedule state
  const defaultTitle = `Commercial Sourcing Call: ${deal.product_name} (${deal.buyer_company || "Retail Buyer"} x ${deal.company_name})`;
  const [meetingTitle, setMeetingTitle] = useState(defaultTitle);
  const [startTime, setStartTime] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(11, 0, 0, 0);
    return d.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
  });
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [meetUrl, setMeetUrl] = useState(
    `https://meet.google.com/fdx-${deal.id.slice(0, 3)}-${deal.id.slice(3, 7)}-${deal.id.slice(7, 10)}`
  );
  const [attendeeEmail, setAttendeeEmail] = useState("");
  const [agendaNotes, setAgendaNotes] = useState(
    "1. Review target product specifications and packaging format.\n2. Confirm CIF Haifa/Ashdod benchmark price.\n3. Agree on DHL express sample dispatch and tasting panel."
  );
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleSuccess, setScheduleSuccess] = useState<string | null>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  // Summarize state
  const [transcriptOrNotes, setTranscriptOrNotes] = useState("");
  const [advanceStage, setAdvanceStage] = useState(true);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [aiSummary, setAiSummary] = useState<MeetingAiSummary | null>(null);
  const [summarizeError, setSummarizeError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Quick sample notes generator for 1-click testing
  function loadSampleCallNotes() {
    setTranscriptOrNotes(
      `Call with ${deal.company_name} export manager (Marco) and ${deal.buyer_company || "Supermarket category manager"}.\n\n` +
      `- Factory confirmed capacity for 2 x 40ft HQ containers per month.\n` +
      `- Indicative CIF Haifa price is EUR 0.88 per unit (for 500g pack), MOQ is 1 FCL (24,000 units).\n` +
      `- Payment terms agreed: 30% advance on PO confirmation, 70% against Bill of Lading copy.\n` +
      `- Kosher certification: Factory already holds Chief Rabbinate of Israel kosher certificate, Rabbi visit scheduled for next month.\n` +
      `- Quality: Factory holds BRCGS Grade A and IFS Food Higher Level.\n` +
      `- Samples: Factory will courier 4 tasting sample jars via DHL Express by Thursday to Rishon LeZion office.\n` +
      `- Next steps: FoodXchange to send sample delivery protocol. Buyer will test in lab next Monday.`
    );
  }

  // Dual-timezone calculation
  const parsedStartDate = new Date(startTime);
  const israelTimeStr = !isNaN(parsedStartDate.getTime())
    ? parsedStartDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" })
    : "--:--";
  const europeTimeStr = !isNaN(parsedStartDate.getTime())
    ? parsedStartDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" })
    : "--:--";

  async function handleScheduleMeeting(e: React.FormEvent) {
    e.preventDefault();
    setIsScheduling(true);
    setScheduleError(null);
    setScheduleSuccess(null);

    try {
      const res = await fetch("/api/admin/meetings/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: deal.id,
          meetingTitle,
          startTime: new Date(startTime).toISOString(),
          durationMinutes,
          meetUrl,
          attendees: attendeeEmail.trim() ? [attendeeEmail.trim()] : [],
          agendaNotes,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setScheduleError(data?.error || "Failed to schedule meeting.");
        setIsScheduling(false);
        return;
      }

      setScheduleSuccess(`Meeting scheduled! Google Meet link posted to deal messages.`);
      setIsScheduling(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setScheduleError(err?.message || "Network exception.");
      setIsScheduling(false);
    }
  }

  async function handleRunSummarizer() {
    if (!transcriptOrNotes.trim()) {
      setSummarizeError("Please paste call transcript or meeting notes first.");
      return;
    }

    setIsSummarizing(true);
    setSummarizeError(null);

    try {
      const res = await fetch("/api/admin/meetings/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: deal.id,
          transcriptOrNotes,
          advanceStage,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setSummarizeError(data?.error || "Failed to analyze meeting.");
        setIsSummarizing(false);
        return;
      }

      setAiSummary(data.summary);
      setSavedSuccess(true);
      setIsSummarizing(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setSummarizeError(err?.message || "Network exception.");
      setIsSummarizing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Meeting Intelligence &amp; Google Meet Hub
              </span>
            </div>
            <h3 className="text-lg font-black tracking-tight">
              {deal.company_name} · {deal.product_name}
            </h3>
            <p className="text-xs text-slate-300">
              Buyer: <span className="text-white font-semibold">{deal.buyer_company || "Retail Partner"}</span> · Match Score: <span className="text-orange-400 font-bold">{deal.match_score}%</span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg text-lg leading-none cursor-pointer transition"
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3">
          <button
            type="button"
            onClick={() => setActiveTab("schedule")}
            className={`pb-3 px-4 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-2 ${
              activeTab === "schedule"
                ? "border-orange-500 text-orange-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>🎥 1. Schedule Google Meet</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("summarize")}
            className={`pb-3 px-4 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-2 ${
              activeTab === "summarize"
                ? "border-orange-500 text-orange-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>🤖 2. AI Meeting Summarizer &amp; Deal Extractor</span>
          </button>
        </div>

        {/* Tab 1: Schedule Google Meet */}
        {activeTab === "schedule" && (
          <form onSubmit={handleScheduleMeeting} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
            {scheduleSuccess && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium">
                ✓ {scheduleSuccess}
              </div>
            )}
            {scheduleError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 font-medium">
                ✕ {scheduleError}
              </div>
            )}

            <div>
              <label className="block text-slate-700 font-bold uppercase tracking-wider mb-1">
                Meeting Title:
              </label>
              <input
                type="text"
                required
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
              />
            </div>

            {/* Dual-Timezone Display */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-bold uppercase tracking-wider mb-1">
                  Date &amp; Time (Local):
                </label>
                <input
                  type="datetime-local"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold uppercase tracking-wider mb-1">
                  Timezone Alignment:
                </label>
                <div className="bg-slate-100 border border-slate-200 rounded-xl p-2 flex items-center justify-between text-slate-700">
                  <div>
                    <span className="font-bold">🇮🇱 Tel Aviv:</span> {israelTimeStr}
                  </div>
                  <span className="text-slate-400">·</span>
                  <div>
                    <span className="font-bold">🇪🇺 Europe (Rome/Madrid):</span> {europeTimeStr}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold uppercase tracking-wider mb-1">
                Google Meet Video Room URL:
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  required
                  value={meetUrl}
                  onChange={(e) => setMeetUrl(e.target.value)}
                  className="w-full font-mono bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900"
                />
                <button
                  type="button"
                  onClick={() => setMeetUrl("https://meet.google.com/new")}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl text-slate-700 font-semibold shrink-0 cursor-pointer"
                >
                  New Room
                </button>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold uppercase tracking-wider mb-1">
                Attendee Email (Buyer or Factory Contact):
              </label>
              <input
                type="email"
                placeholder="buyer@shufersal.co.il or factory@supplier.com"
                value={attendeeEmail}
                onChange={(e) => setAttendeeEmail(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold uppercase tracking-wider mb-1">
                Agenda &amp; Discussion Topics:
              </label>
              <textarea
                rows={3}
                value={agendaNotes}
                onChange={(e) => setAgendaNotes(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 leading-relaxed"
              />
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              <a
                href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(meetingTitle)}&location=${encodeURIComponent(meetUrl)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-bold underline"
              >
                <span>📅 Open in Google Calendar</span>
                <span>↗</span>
              </a>

              <button
                type="submit"
                disabled={isScheduling}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-md shadow-emerald-600/20 transition cursor-pointer disabled:opacity-50"
              >
                {isScheduling ? "Scheduling..." : "Confirm & Save Video Call"}
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: AI Meeting Summarizer */}
        {activeTab === "summarize" && (
          <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs text-slate-800">
            {summarizeError && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 font-medium">
                ✕ {summarizeError}
              </div>
            )}
            {savedSuccess && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium flex items-center gap-2">
                <span>✓</span>
                <span>Meeting summary saved to deal messages and synced to pipeline!</span>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-700 font-bold uppercase tracking-wider">
                  Call Notes or Google Meet Audio Transcript:
                </label>
                <button
                  type="button"
                  onClick={loadSampleCallNotes}
                  className="text-orange-600 hover:text-orange-700 font-semibold underline text-[11px] cursor-pointer"
                >
                  ⚡ Insert Sample Factory Notes
                </button>
              </div>
              <textarea
                rows={6}
                placeholder="Paste transcript or notes from your call with the factory..."
                value={transcriptOrNotes}
                onChange={(e) => setTranscriptOrNotes(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900 font-mono text-[11px] leading-relaxed focus:bg-white"
              />
            </div>

            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-3">
              <label className="flex items-center gap-2 font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={advanceStage}
                  onChange={(e) => setAdvanceStage(e.target.checked)}
                  className="rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                />
                <span>Automatically advance match stage based on meeting outcome</span>
              </label>

              <button
                type="button"
                onClick={handleRunSummarizer}
                disabled={isSummarizing || !transcriptOrNotes.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-xl shadow-md shadow-orange-500/20 transition cursor-pointer disabled:opacity-50"
              >
                {isSummarizing ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Analyzing Call...</span>
                  </>
                ) : (
                  <>
                    <span>⚡</span>
                    <span>Extract AI Summary</span>
                  </>
                )}
              </button>
            </div>

            {/* AI Output Display */}
            {aiSummary && (
              <div className="space-y-3 pt-3 border-t border-slate-200 animate-in fade-in duration-200">
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-4 rounded-2xl shadow-md">
                  <div className="text-[10px] font-bold text-orange-400 uppercase tracking-wider mb-1">
                    Executive Summary
                  </div>
                  <h4 className="text-sm font-bold text-white mb-1.5">{aiSummary.meeting_title}</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">{aiSummary.executive_summary}</p>
                </div>

                {/* Commercial Terms Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                    <div className="text-[10px] text-slate-500 uppercase font-bold">Target Price</div>
                    <div className="font-extrabold text-slate-900 mt-0.5">
                      {aiSummary.commercial_terms.target_unit_price
                        ? `${aiSummary.commercial_terms.currency} ${aiSummary.commercial_terms.target_unit_price}`
                        : "TBD"}
                    </div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                    <div className="text-[10px] text-slate-500 uppercase font-bold">Incoterm</div>
                    <div className="font-extrabold text-slate-900 mt-0.5">
                      {aiSummary.commercial_terms.incoterms || "CIF Haifa"}
                    </div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                    <div className="text-[10px] text-slate-500 uppercase font-bold">Target Volume</div>
                    <div className="font-semibold text-slate-900 mt-0.5 truncate">
                      {aiSummary.commercial_terms.target_volume || "1 FCL"}
                    </div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                    <div className="text-[10px] text-slate-500 uppercase font-bold">Payment</div>
                    <div className="font-semibold text-slate-900 mt-0.5 truncate">
                      {aiSummary.commercial_terms.payment_terms || "30% / 70%"}
                    </div>
                  </div>
                </div>

                {/* Action Items List */}
                {aiSummary.action_items.length > 0 && (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
                    <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Action Items &amp; Next Milestones:
                    </div>
                    <div className="space-y-1.5">
                      {aiSummary.action_items.map((act, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs">
                          <span className="font-bold text-orange-600 shrink-0">[{act.owner}]:</span>
                          <span className="text-slate-800">{act.task}</span>
                          {act.due_date && <span className="text-slate-500 italic shrink-0">({act.due_date})</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
