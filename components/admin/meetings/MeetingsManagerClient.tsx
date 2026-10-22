"use client";

import { useMemo, useState } from "react";
import MeetingIntelligenceModal from "@/components/admin/meetings/MeetingIntelligenceModal";

export interface UnifiedMeeting {
  id: string;
  source: "business_card" | "match_deal" | "instant";
  title: string;
  startTime: string;
  endTime: string;
  meetUrl: string;
  gcalUrl?: string;
  status: "upcoming" | "live_now" | "completed";
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone?: string;
  company?: string;
  audience: "buyer" | "supplier" | "general";
  topic?: string;
  deal?: {
    id: string;
    company_name: string;
    product_name: string;
    buyer_company?: string | null;
    match_score?: number;
  };
}

interface Props {
  initialMeetings: UnifiedMeeting[];
}

export function MeetingsManagerClient({ initialMeetings }: Props) {
  const [meetings, setMeetings] = useState<UnifiedMeeting[]>(initialMeetings);
  const [activeTab, setActiveTab] = useState<"all" | "upcoming" | "today" | "buyers" | "factories" | "past">("upcoming");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDealForAi, setSelectedDealForAi] = useState<{
    id: string;
    company_name: string;
    product_name: string;
    buyer_company?: string | null;
    match_score?: number;
  } | null>(null);

  // New Custom Meeting Modal State
  const [isNewMeetingOpen, setIsNewMeetingOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newAttendee, setNewAttendee] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [newAudience, setNewAudience] = useState<"buyer" | "supplier">("buyer");
  const [newStartTime, setNewStartTime] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(11, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [newDuration, setNewDuration] = useState(15);
  const [creatingMeeting, setCreatingMeeting] = useState(false);

  const now = new Date();

  // Metrics
  const stats = useMemo(() => {
    const todayStr = now.toISOString().slice(0, 10);
    let upcoming = 0;
    let today = 0;
    let buyers = 0;
    let suppliers = 0;

    for (const m of meetings) {
      const start = new Date(m.startTime);
      if (start > now) upcoming++;
      if (m.startTime.startsWith(todayStr)) today++;
      if (m.audience === "buyer") buyers++;
      if (m.audience === "supplier") suppliers++;
    }

    return { total: meetings.length, upcoming, today, buyers, suppliers };
  }, [meetings, now]);

  // Filtered List
  const filteredMeetings = useMemo(() => {
    const todayStr = now.toISOString().slice(0, 10);
    return meetings.filter((m) => {
      const start = new Date(m.startTime);
      const end = new Date(m.endTime);

      if (activeTab === "upcoming") {
        if (end < now) return false;
      } else if (activeTab === "today") {
        if (!m.startTime.startsWith(todayStr)) return false;
      } else if (activeTab === "buyers") {
        if (m.audience !== "buyer") return false;
      } else if (activeTab === "factories") {
        if (m.audience !== "supplier") return false;
      } else if (activeTab === "past") {
        if (end >= now) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchText = `${m.title} ${m.attendeeName} ${m.attendeeEmail} ${m.company || ""} ${m.topic || ""}`.toLowerCase();
        if (!matchText.includes(q)) return false;
      }

      return true;
    });
  }, [meetings, activeTab, searchQuery, now]);

  function getTimeStatus(startStr: string, endStr: string) {
    const start = new Date(startStr);
    const end = new Date(endStr);
    const diffMs = start.getTime() - now.getTime();
    const diffMins = Math.round(diffMs / 60000);
    const diffHours = Math.round(diffMs / 3600000);

    if (now >= start && now <= end) {
      return { label: "🔴 LIVE NOW", bg: "bg-rose-500 text-white animate-pulse", isLive: true };
    }
    if (end < now) {
      return { label: "Completed", bg: "bg-slate-700 text-slate-300", isLive: false };
    }
    if (diffMins < 60) {
      return { label: `In ${diffMins} min${diffMins === 1 ? "" : "s"}`, bg: "bg-amber-500 text-slate-950 font-bold", isLive: false };
    }
    if (diffHours < 24 && start.getDate() === now.getDate()) {
      return { label: `Today in ${diffHours}h`, bg: "bg-orange-500/20 text-orange-400 border border-orange-500/30", isLive: false };
    }
    if (diffHours < 48 && start.getDate() === now.getDate() + 1) {
      return { label: "Tomorrow", bg: "bg-blue-500/20 text-blue-400 border border-blue-500/30", isLive: false };
    }
    return {
      label: start.toLocaleDateString("en-GB", { month: "short", day: "numeric" }),
      bg: "bg-slate-800 text-slate-300 border border-white/10",
      isLive: false,
    };
  }

  async function handleCreateQuickMeeting(e: React.FormEvent) {
    e.preventDefault();
    if (!newAttendee.trim() || !newEmail.trim()) return;

    setCreatingMeeting(true);
    try {
      const res = await fetch("/api/card/meeting-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handle: "udi",
          name: newAttendee.trim(),
          email: newEmail.trim(),
          company: newCompany.trim(),
          phone: newPhone.trim(),
          audience: newAudience,
          topic: newTitle.trim() || "Commercial video alignment",
          startTime: new Date(newStartTime).toISOString(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to schedule");

      const created: UnifiedMeeting = {
        id: `meet_instant_${Date.now()}`,
        source: "instant",
        title: newTitle || `Commercial Call with ${newAttendee}`,
        startTime: data.startTime,
        endTime: data.endTime,
        meetUrl: data.meetUrl,
        gcalUrl: data.gCalUrl,
        status: "upcoming",
        attendeeName: newAttendee,
        attendeeEmail: newEmail,
        attendeePhone: newPhone,
        company: newCompany,
        audience: newAudience,
        topic: newTitle,
      };

      setMeetings((prev) => [created, ...prev]);
      setIsNewMeetingOpen(false);
      setNewTitle("");
      setNewAttendee("");
      setNewEmail("");
      setNewPhone("");
      setNewCompany("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error creating meeting");
    } finally {
      setCreatingMeeting(false);
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-white tracking-tight">
              B2B Meetings &amp; Video Calls Hub
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Live Google Meet Engine
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Manage scheduled 15-min intro calls from your card and factory sourcing alignment sessions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsNewMeetingOpen(true)}
            className="bg-[#F47920] hover:bg-[#d96810] text-white text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-colors shadow-lg shadow-orange-500/20"
          >
            <span>+</span>
            <span>Schedule Video Call</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Live &amp; Upcoming
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{stats.upcoming}</span>
            <span className="text-xs text-emerald-400 font-medium">Ready</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Today&apos;s Calls
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-400">{stats.today}</span>
            <span className="text-xs text-slate-500">Scheduled today</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Buyer Intro Calls
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-400">{stats.buyers}</span>
            <span className="text-xs text-slate-500">Retail &amp; Importers</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Factory Negotiations
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-sky-400">{stats.suppliers}</span>
            <span className="text-xs text-slate-500">European Exporters</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 p-2.5 rounded-2xl">
        {/* Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          {(
            [
              { id: "upcoming", label: "Upcoming" },
              { id: "today", label: "Today" },
              { id: "buyers", label: "Buyers" },
              { id: "factories", label: "Factories" },
              { id: "past", label: "Past Calls" },
              { id: "all", label: "All" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors shrink-0 ${
                activeTab === tab.id
                  ? "bg-[#F47920] text-white shadow-xs"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[240px]">
          <input
            type="text"
            placeholder="Search attendee, company, topic..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#F47920]"
          />
        </div>
      </div>

      {/* Meeting Cards List */}
      <div className="space-y-3.5">
        {filteredMeetings.map((m) => {
          const timing = getTimeStatus(m.startTime, m.endTime);
          const startDate = new Date(m.startTime);
          const isIsraelBuyer = m.audience === "buyer";

          // Pre-filled WhatsApp reminder
          const waPhone = m.attendeePhone?.replace(/[^\d]/g, "") || "";
          const waMsg = encodeURIComponent(
            `Hi ${m.attendeeName}, looking forward to our FoodXchange video call! Here is the direct Google Meet link: ${m.meetUrl}`
          );

          return (
            <div
              key={m.id}
              className={`bg-slate-900 border rounded-2xl p-5 transition-all hover:border-slate-700 ${
                timing.isLive
                  ? "border-rose-500/60 shadow-lg shadow-rose-500/10"
                  : "border-slate-800"
              }`}
            >
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                {/* Left: Timing & Details */}
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${timing.bg}`}>
                      {timing.label}
                    </span>

                    <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[11px] font-medium text-slate-300 border border-slate-700">
                      {isIsraelBuyer ? "🛒 Israeli Buyer" : "🏭 European Factory"}
                    </span>

                    <span className="text-[11px] text-slate-400 font-mono">
                      {startDate.toLocaleTimeString("en-GB", {
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "Asia/Jerusalem",
                      })}{" "}
                      IDT (Israel) &middot;{" "}
                      {startDate.toLocaleTimeString("en-GB", {
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "Europe/Rome",
                      })}{" "}
                      CET
                    </span>

                    <span className="text-[10px] text-slate-500">
                      Source: {m.source === "business_card" ? "e-Business Card" : "Commercial Match"}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight truncate">
                      {m.title}
                    </h3>
                    {m.topic && (
                      <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                        Agenda / Topic: {m.topic}
                      </p>
                    )}
                  </div>

                  {/* Attendee Details Bar */}
                  <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                    <span className="text-slate-200 font-medium">
                      👤 {m.attendeeName}
                      {m.company ? ` (${m.company})` : ""}
                    </span>
                    <span>✉️ {m.attendeeEmail}</span>
                    {m.attendeePhone && <span>📞 {m.attendeePhone}</span>}
                  </div>
                </div>

                {/* Right: Action Buttons */}
                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  {/* Google Meet Button */}
                  <a
                    href={m.meetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors shadow-md shadow-emerald-600/20"
                  >
                    <span>📹</span>
                    <span>Join Google Meet</span>
                  </a>

                  {/* Google Calendar */}
                  {m.gcalUrl && (
                    <a
                      href={m.gcalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs px-3 py-2.5 rounded-xl border border-slate-700 transition-colors"
                      title="Open in Google Calendar"
                    >
                      📅 Calendar
                    </a>
                  )}

                  {/* WhatsApp Ping */}
                  {waPhone && (
                    <a
                      href={`https://wa.me/${waPhone}?text=${waMsg}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-[#1DA851]/15 hover:bg-[#1DA851]/25 text-emerald-400 border border-[#1DA851]/30 text-xs px-3 py-2.5 rounded-xl transition-colors"
                      title="Send WhatsApp reminder"
                    >
                      💬 Ping WhatsApp
                    </a>
                  )}

                  {/* AI Intelligence / Summary */}
                  <button
                    onClick={() => {
                      setSelectedDealForAi(
                        m.deal || {
                          id: m.id,
                          company_name: m.company || m.attendeeName,
                          product_name: m.topic || "Commercial Intro Call",
                          buyer_company: isIsraelBuyer ? m.company || m.attendeeName : "Retail",
                          match_score: 95,
                        }
                      );
                    }}
                    className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs px-3 py-2.5 rounded-xl transition-colors flex items-center gap-1.5"
                    title="Open AI Meeting Summarizer & Action Items"
                  >
                    <span>🧠</span>
                    <span>AI Brief</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredMeetings.length === 0 && (
          <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-2xl">
            <p className="text-2xl mb-2">📅</p>
            <h4 className="text-sm font-bold text-white mb-1">No video calls found</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No meetings currently match the selected tab ({activeTab}). Schedule a new video call or share your digital business card.
            </p>
          </div>
        )}
      </div>

      {/* AI Meeting Intelligence Modal */}
      {selectedDealForAi && (
        <MeetingIntelligenceModal
          deal={selectedDealForAi}
          isOpen={Boolean(selectedDealForAi)}
          onClose={() => setSelectedDealForAi(null)}
          onSuccess={() => setSelectedDealForAi(null)}
        />
      )}

      {/* Instant Schedule Modal */}
      {isNewMeetingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div
            className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base">Schedule New B2B Video Call</h3>
              <button
                onClick={() => setIsNewMeetingOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateQuickMeeting} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Meeting Title / Topic *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Olive Oil Private Label Sourcing Review"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white outline-none focus:border-[#F47920]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Attendee Name *</label>
                  <input
                    type="text"
                    required
                    value={newAttendee}
                    onChange={(e) => setNewAttendee(e.target.value)}
                    placeholder="e.g. Marco Rossi"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white outline-none focus:border-[#F47920]"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Company</label>
                  <input
                    type="text"
                    value={newCompany}
                    onChange={(e) => setNewCompany(e.target.value)}
                    placeholder="e.g. ItalFood Srl"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white outline-none focus:border-[#F47920]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Attendee Email *</label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="marco@italfood.it"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white outline-none focus:border-[#F47920]"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Phone / WhatsApp</label>
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="+39 02 1234567"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white outline-none focus:border-[#F47920]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Role</label>
                  <select
                    value={newAudience}
                    onChange={(e) => setNewAudience(e.target.value as "buyer" | "supplier")}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white outline-none focus:border-[#F47920]"
                  >
                    <option value="buyer">🛒 Israeli Buyer</option>
                    <option value="supplier">🏭 European Manufacturer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Duration</label>
                  <select
                    value={newDuration}
                    onChange={(e) => setNewDuration(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white outline-none focus:border-[#F47920]"
                  >
                    <option value={15}>15 Minutes (Intro)</option>
                    <option value={30}>30 Minutes (Commercial)</option>
                    <option value={45}>45 Minutes (Tasting &amp; Contract)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Date &amp; Time (Israel Time / IDT)</label>
                <input
                  type="datetime-local"
                  required
                  value={newStartTime}
                  onChange={(e) => setNewStartTime(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white outline-none focus:border-[#F47920]"
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewMeetingOpen(false)}
                  className="w-1/3 py-2.5 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingMeeting}
                  className="w-2/3 py-2.5 bg-[#F47920] hover:bg-[#d96810] text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
                >
                  {creatingMeeting ? "Generating Google Meet..." : "Confirm & Create Meet URL"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
