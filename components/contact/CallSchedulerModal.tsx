"use client";

import { useMemo, useState } from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  cardHandle: string;
  lang: "en" | "he";
}

interface AvailableDay {
  dateStr: string; // YYYY-MM-DD
  displayLabel: string;
  dateObj: Date;
}

export function CallSchedulerModal({ isOpen, onClose, cardHandle, lang }: Props) {
  const isRtl = lang === "he";

  // Generate next 10 business days (Sun-Thu in Israel)
  const availableDays = useMemo<AvailableDay[]>(() => {
    const days: AvailableDay[] = [];
    const now = new Date();
    let current = new Date(now);
    current.setDate(current.getDate() + 1); // Start tomorrow

    while (days.length < 8) {
      const dayOfWeek = current.getDay(); // 0 is Sunday, 5 is Friday, 6 is Saturday
      if (dayOfWeek !== 5 && dayOfWeek !== 6) {
        // Business day in Israel
        const y = current.getFullYear();
        const m = String(current.getMonth() + 1).padStart(2, "0");
        const d = String(current.getDate()).padStart(2, "0");
        const dateStr = `${y}-${m}-${d}`;

        const displayLabel = current.toLocaleDateString(isRtl ? "he-IL" : "en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        });

        days.push({
          dateStr,
          displayLabel,
          dateObj: new Date(current),
        });
      }
      current.setDate(current.getDate() + 1);
    }
    return days;
  }, [isRtl]);

  const [selectedDay, setSelectedDay] = useState<string>(availableDays[0]?.dateStr || "");
  const timeSlots = [
    "10:00",
    "10:30",
    "11:00",
    "11:30",
    "13:30",
    "14:00",
    "14:30",
    "15:00",
    "15:30",
    "16:00",
    "16:30",
  ];

  const [selectedSlot, setSelectedSlot] = useState<string>("11:00");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [audience, setAudience] = useState<"buyer" | "supplier">("buyer");
  const [topic, setTopic] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scheduled, setScheduled] = useState<{
    meetUrl: string;
    gCalUrl: string;
    icsContent: string;
    startTime: string;
  } | null>(null);

  if (!isOpen) return null;

  async function handleBook(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError(isRtl ? "נא להזין שם מלא" : "Please enter your name.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError(isRtl ? "נא להזין כתובת אימייל תקינה" : "Please enter a valid email address.");
      return;
    }

    // Construct ISO time
    const startIso = `${selectedDay}T${selectedSlot}:00+03:00`; // IDT Israel time zone (+03:00)

    setSubmitting(true);
    try {
      const res = await fetch("/api/card/meeting-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handle: cardHandle,
          name: name.trim(),
          email: email.trim(),
          company: company.trim(),
          phone: phone.trim(),
          audience,
          topic: topic.trim(),
          startTime: startIso,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to schedule meeting");
      }

      setScheduled(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to book meeting");
    } finally {
      setSubmitting(false);
    }
  }

  function handleDownloadIcs() {
    if (!scheduled?.icsContent) return;
    const blob = new Blob([scheduled.icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "FoodXchange-Intro-Call.ics");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div
        className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-5 sm:p-6 text-white max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-base">
              📅
            </span>
            <div>
              <h3 className="font-bold text-base text-white">
                {isRtl ? "קביעת שיחת היכרות (15 דקות)" : "Book a 15-Min Intro Call"}
              </h3>
              <p className="text-xs text-slate-400">
                {isRtl
                  ? "וידאו ב-Google Meet עם אודי סטריק"
                  : "Direct Google Meet video call with Udi Stryk"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors text-sm"
          >
            ✕
          </button>
        </div>

        {scheduled ? (
          <div className="text-center py-4 space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto text-2xl font-bold">
              ✓
            </div>
            <div>
              <h4 className="text-lg font-bold text-white mb-1">
                {isRtl ? "הפגישה נקבעה בהצלחה!" : "Meeting Scheduled!"}
              </h4>
              <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
                {isRtl
                  ? `הזמנה נשלחה לאימייל שלך (${email}). קישור ה-Google Meet מוכן:`
                  : `A calendar invitation has been sent to ${email}. Your Google Meet room is ready:`}
              </p>
            </div>

            {/* Meet Link Highlight Box */}
            <div className="p-3.5 rounded-xl bg-slate-800 border border-white/10 text-start space-y-1.5">
              <p className="text-xs text-slate-400 font-medium">
                {isRtl ? "קישור לשיחת וידאו ב-Google Meet:" : "Google Meet Video Room:"}
              </p>
              <a
                href={scheduled.meetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono text-blue-400 hover:text-blue-300 underline break-all block"
              >
                {scheduled.meetUrl}
              </a>
            </div>

            {/* Calendar CTAs */}
            <div className="pt-2 space-y-2.5">
              <a
                href={scheduled.gCalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-[#0284c7] hover:bg-[#0369a1] text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 text-xs transition-colors shadow-md shadow-sky-600/20"
              >
                <span>📅</span>
                <span>{isRtl ? "הוסף ליומן Google Calendar" : "Add to Google Calendar"}</span>
              </a>
              <button
                onClick={handleDownloadIcs}
                className="w-full bg-white/10 hover:bg-white/15 text-white font-medium py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-2"
              >
                <span>📥</span>
                <span>
                  {isRtl ? "הורד קובץ יומן (Apple / Outlook .ics)" : "Download .ics Calendar Invite"}
                </span>
              </button>
              <button
                onClick={onClose}
                className="w-full py-2 text-slate-400 hover:text-white text-xs transition-colors"
              >
                {isRtl ? "סיום וסגירה" : "Done"}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleBook} className="space-y-4 text-sm">
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
                {error}
              </div>
            )}

            {/* 1. Day Picker */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {isRtl ? "1. בחר תאריך (ימים א׳–ה׳):" : "1. Select Date (Sunday–Thursday):"}
              </label>
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {availableDays.map((day) => (
                  <button
                    key={day.dateStr}
                    type="button"
                    onClick={() => setSelectedDay(day.dateStr)}
                    className={`px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-colors shrink-0 ${
                      selectedDay === day.dateStr
                        ? "bg-[#F47920] text-white shadow-md shadow-orange-500/25"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-white/5"
                    }`}
                  >
                    {day.displayLabel}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Slot Picker */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {isRtl ? "2. שעה משוערת (שעון ישראל):" : "2. Time Slot (Israel Time / IDT):"}
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                {timeSlots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setSelectedSlot(slot)}
                    className={`py-1.5 rounded-lg text-xs font-mono font-medium transition-colors ${
                      selectedSlot === slot
                        ? "bg-sky-500 text-white font-bold"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-white/5"
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>

            {/* Role Switcher */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {isRtl ? "תפקידך:" : "I am a:"}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAudience("buyer")}
                  className={`py-2 rounded-xl text-xs font-medium transition-colors border ${
                    audience === "buyer"
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      : "bg-slate-800 text-slate-400 border-white/5"
                  }`}
                >
                  {isRtl ? "🛒 קניין / רשת שיווק" : "🛒 Food Buyer / Retailer"}
                </button>
                <button
                  type="button"
                  onClick={() => setAudience("supplier")}
                  className={`py-2 rounded-xl text-xs font-medium transition-colors border ${
                    audience === "supplier"
                      ? "bg-blue-500/20 text-blue-300 border-blue-500/40"
                      : "bg-slate-800 text-slate-400 border-white/5"
                  }`}
                >
                  {isRtl ? "🏭 יצרן / ספק מזון" : "🏭 Manufacturer / Exporter"}
                </button>
              </div>
            </div>

            {/* Name & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {isRtl ? "שם מלא *" : "Your Name *"}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={isRtl ? "ישראל ישראלי" : "John Smith"}
                  className="w-full bg-slate-800/80 border border-white/15 focus:border-[#F47920] rounded-xl px-3.5 py-2 text-white text-xs outline-none placeholder-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {isRtl ? "כתובת אימייל *" : "Work Email *"}
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={isRtl ? "name@company.com" : "john@company.com"}
                  className="w-full bg-slate-800/80 border border-white/15 focus:border-[#F47920] rounded-xl px-3.5 py-2 text-white text-xs outline-none placeholder-slate-500"
                />
              </div>
            </div>

            {/* Company & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {isRtl ? "חברה / מותג" : "Company / Brand"}
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder={isRtl ? "שם החברה" : "Company name"}
                  className="w-full bg-slate-800/80 border border-white/15 focus:border-[#F47920] rounded-xl px-3.5 py-2 text-white text-xs outline-none placeholder-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {isRtl ? "נייד / וואטסאפ (לתזכורת)" : "Phone / WhatsApp (Optional)"}
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+972-50-..."
                  className="w-full bg-slate-800/80 border border-white/15 focus:border-[#F47920] rounded-xl px-3.5 py-2 text-white text-xs outline-none placeholder-slate-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {isRtl ? "נושא השיחה (אופציונלי):" : "Call Topic / Items of Interest:"}
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={
                  isRtl
                    ? "למשל: סורסינג לשמן זית, יבוא מאיטליה, בדיקת כשרות..."
                    : "e.g. Olive oil sourcing, private label pasta, kosher path..."
                }
                className="w-full bg-slate-800/80 border border-white/15 focus:border-[#F47920] rounded-xl px-3.5 py-2 text-white text-xs outline-none placeholder-slate-500"
              />
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="w-1/3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium transition-colors"
              >
                {isRtl ? "ביטול" : "Cancel"}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="w-2/3 py-2.5 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-sky-600/20"
              >
                {submitting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{isRtl ? "קובע..." : "Booking..."}</span>
                  </>
                ) : (
                  <>
                    <span>📅</span>
                    <span>{isRtl ? "קבע שיחה ביומן" : "Confirm 15-Min Call"}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
