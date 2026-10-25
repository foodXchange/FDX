"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

interface VideoTrack {
  id: string;
  titleHe: string;
  titleEn: string;
  duration: string;
  categoryHe: string;
  categoryEn: string;
  videoUrl?: string; // Optional Loom / YouTube / MP4 embed URL
  posterImage: string;
  chapters: {
    time: string;
    seconds: number;
    titleHe: string;
    titleEn: string;
    descHe: string;
    descEn: string;
    badge: string;
    badgeColor: string;
  }[];
  ctaLabelHe: string;
  ctaLabelEn: string;
  ctaHref: string;
}

interface Props {
  lang?: "he" | "en";
  initialVideoId?: string;
}

function PlayIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  );
}

function RotateCcwIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function CheckCircleIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

const VIDEO_TRACKS: VideoTrack[] = [
  {
    id: "sourcing-samples",
    titleHe: "איתור 5,000+ מפעלים והזמנת דוגמאות טעימה",
    titleEn: "Factory Sourcing & Express Tasting Box Tour",
    duration: "01:14",
    categoryHe: "קניינים ומותג פרטי",
    categoryEn: "Buyers & Private Label",
    posterImage: "/images/buyer-product-review.png",
    ctaLabelHe: "פתח את קטלוג המוצרים והזמן ערכה",
    ctaLabelEn: "Browse Catalog & Order Sample Box",
    ctaHref: "/he/products",
    chapters: [
      {
        time: "00:00",
        seconds: 0,
        titleHe: "סינון 5,000+ מפעלים לפי כשרות ו-BRC/IFS",
        titleEn: "Filtering 5,000+ Factories by Kosher & BRC/IFS",
        descHe: "הקניין מזין פסטה איטלקית או שמן זית, ומסנן לפי כשרות (OU, OK, חתם סופר) ומותג פרטי.",
        descEn: "Buyer inputs category target and filters by certified Kosher pathways and OEM private label MOQ.",
        badge: "שלב 1: איתור",
        badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
      },
      {
        time: "00:20",
        seconds: 20,
        titleHe: "הזמנת ערכת טעימה ישירות למשרדי הרשת",
        titleEn: "Dispatching Courier Tasting Box to Buyer Desk",
        descHe: "שילוח אקספרס בבלדרות DHL בתוך 48 שעות עם אישורי שחרור מהירים ממשרד הבריאות והמכס.",
        descEn: "Fast-track 48h air courier arrival with full customs waivers and food safety clearance.",
        badge: "שלב 2: שילוח",
        badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
      },
      {
        time: "00:45",
        seconds: 45,
        titleHe: "מילוי שאלון הערכה סנסורי בן 5 ממדים",
        titleEn: "Completing the 5-Dimension Sensory Scorecard",
        descHe: "הערכת טעם, מרקם, התאמת אריזה למדף, חיי מדף, וכדאיות מחיר. אפשרות לבקש תיקון מתכון.",
        descEn: "Scoring taste, texture, retail packaging, shelf life, and commercial price fit in the portal.",
        badge: "שלב 3: טעימה",
        badgeColor: "bg-sky-500/20 text-sky-300 border-sky-500/30",
      },
      {
        time: "01:00",
        seconds: 60,
        titleHe: "אישור דוגמה ומעבר להצעת מחיר סופית (CIF Haifa)",
        titleEn: "Sample Approval & Final CIF Haifa Quote Locking",
        descHe: "אישור הדגימה נועל את תנאי המכולה ומייצר הזמנת רכש (PO) ללא עמלת תיווך מהקניין.",
        descEn: "Sample signoff automatically locks container volume and advances deal to commercial PO.",
        badge: "שלב 4: סגירה",
        badgeColor: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
      },
    ],
  },
  {
    id: "label-landed-cost",
    titleHe: "מחשבון עלות שער מחסן ובדיקת סימון אדום (ת״י 1145)",
    titleEn: "Landed Cost Simulator & SI 1145 Red Badges",
    duration: "01:25",
    categoryHe: "רגולציה ופיננסים",
    categoryEn: "Regulatory & Finance",
    posterImage: "/images/israeli-supermarket-aisle-premium-food-retail.png",
    ctaLabelHe: "פתח את מחשבון עלות הנחיתה",
    ctaLabelEn: "Open Landed Cost Calculator",
    ctaHref: "/he/calculator",
    chapters: [
      {
        time: "00:00",
        seconds: 0,
        titleHe: "המרת מחיר CIF נמל חיפה לעלות שער מחסן (מרלו״ג)",
        titleEn: "Converting CIF Port Price into True Warehouse Landed Cost",
        descHe: "חישוב מדויק של פריקה, ביטוח ימי, מסופי נמל (חיפה/אשדוד), ואגרות שחרור משרד הבריאות.",
        descEn: "Simulating port terminal fees, marine insurance, THC, and Israeli health authority release dues.",
        badge: "פיננסים",
        badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
      },
      {
        time: "00:25",
        seconds: 25,
        titleHe: "בדיקת ספים אוטומטית לסימונים אדומים (ת״י 1145)",
        titleEn: "Automatic Nutritional Check for Mandatory Red Badges",
        descHe: "בדיקה אוטומטית האם נתרן >=400mg, סוכרים >=10g, או שומן רווי >=4g ל-100 גרם מוצר.",
        descEn: "Real-time checking against Israeli Protection of Public Health limits for front-of-pack red badges.",
        badge: "ת״י 1145",
        badgeColor: "bg-rose-500/20 text-rose-300 border-rose-500/30",
      },
      {
        time: "00:55",
        seconds: 55,
        titleHe: "הפקת גלופת גרפיקה עברית למעצב המפעל בחו״ל",
        titleEn: "Generating Hebrew Vector Dielines for European Plant Studio",
        descHe: "העברת קובץ תיקונים מדויק עם ניסוח הרכיבים והאלרגנים לפי התקן הישראלי לפני הדפסת אריזות.",
        descEn: "Delivering complete Hebrew ingredient statements and allergen boxes directly to factory plate makers.",
        badge: "גרפיקה",
        badgeColor: "bg-sky-500/20 text-sky-300 border-sky-500/30",
      },
      {
        time: "01:10",
        seconds: 70,
        titleHe: "השוואת מרווח מדף קמעונאי מול מותגי שוק מובילים",
        titleEn: "Retail Gross Margin Benchmarking vs National Brands",
        descHe: "הוכחת שיפור רווחיות גולמית של 25% עד 40% לרשת השיווק במעבר למותג פרטי ישיר.",
        descEn: "Demonstrating 25% to 40% gross margin gains for supermarket chains vs legacy import brands.",
        badge: "רווחיות",
        badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
      },
    ],
  },
  {
    id: "track-vessel-logistics",
    titleHe: "פורטל מעקב מכולות ושטר מטען (/track/[id])",
    titleEn: "Container Tracking Portal & Bill of Lading",
    duration: "01:18",
    categoryHe: "לוגיסטיקה וסחר בינלאומי",
    categoryEn: "Logistics & Deal Desk",
    posterImage: "/images/container-port-logistics.png",
    ctaLabelHe: "כניסה לפורטל מעקב משלוחים חי",
    ctaLabelEn: "Go to Live Tracking Portal",
    ctaHref: "/track",
    chapters: [
      {
        time: "00:00",
        seconds: 0,
        titleHe: "ניהול מרוכז של הפרויקט בקישור ייחודי ומאובטח",
        titleEn: "Centralized Workspace via Unique Encrypted Link",
        descHe: "ריכוז כל המפרטים, גלופות הדפוס, הצעות המחיר ולוחות הזמנים במקום אחד ללא שרשראות מיילים.",
        descEn: "Consolidating technical specs, artwork approvals, quotes, and timelines into a single view.",
        badge: "פורטל מעקב",
        badgeColor: "bg-sky-500/20 text-sky-300 border-sky-500/30",
      },
      {
        time: "00:25",
        seconds: 25,
        titleHe: "אישור מקוון של פריסות אריזה ותעודת כשרות",
        titleEn: "Digital Approval of Dielines & Kosher Import Permit",
        descHe: "הקניין מאשר בלחיצה אחת את העיצוב הסופי ואישור מחלקת היבוא של הרבנות הראשית לישראל.",
        descEn: "One-click buyer approval of final printing plates and Chief Rabbinate documentation.",
        badge: "אישור דיגיטלי",
        badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
      },
      {
        time: "00:50",
        seconds: 50,
        titleHe: "מעקב חי אחר אוניית המכולות מנמלי אירופה לחיפה",
        titleEn: "Live Ocean Container Tracking from European Ports to Haifa",
        descHe: "מעקב בזמן אמת אחר הפלגת מכולת 20/40 רגל מגנואה או ולנסיה, עם שטר מטען (B/L) ו-ETA מדויק.",
        descEn: "Live container vessel position tracking from Genoa/Valencia with bill of lading and precise ETA.",
        badge: "מעקב אונייה",
        badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
      },
      {
        time: "01:05",
        seconds: 65,
        titleHe: "שחרור מכס מהיר ברפורמת היבוא ושינוע למרלו״ג",
        titleEn: "Fast-Track Port Clearance & Delivery to Retail DC",
        descHe: "שחרור מהיר בנמל על בסיס הצהרת יצרן ותעודת אנליזה (COA) והובלה יבשתית למרלו״ג הרשת.",
        descEn: "Mutual recognition import clearance at Haifa/Ashdod and direct trucking into retail distribution center.",
        badge: "אספקה",
        badgeColor: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
      },
    ],
  },
];

export default function WorkflowVideoPlayer({ lang = "he", initialVideoId }: Props) {
  const isHe = lang === "he";
  const [selectedTrackId, setSelectedTrackId] = useState<string>(
    initialVideoId || VIDEO_TRACKS[0].id
  );
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [progressSec, setProgressSec] = useState<number>(0);
  const totalDurationSec = 74; // standard 1:14 demo run

  const activeTrack =
    VIDEO_TRACKS.find((t) => t.id === selectedTrackId) || VIDEO_TRACKS[0];

  // Current active chapter based on playhead
  const currentChapter =
    [...activeTrack.chapters].reverse().find((c) => progressSec >= c.seconds) ||
    activeTrack.chapters[0];

  // Playback timer simulation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setProgressSec((prev) => {
          if (prev >= totalDurationSec) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, totalDurationSec]);

  // Handle track change
  const handleSelectTrack = (id: string) => {
    setSelectedTrackId(id);
    setProgressSec(0);
    setIsPlaying(true);
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className={`w-full bg-slate-950 text-white rounded-3xl border border-slate-800 overflow-hidden shadow-2xl ${isHe ? "rtl" : "ltr"}`} dir={isHe ? "rtl" : "ltr"}>
      {/* ── TRACK SELECTOR TABS ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md">
        {VIDEO_TRACKS.map((track) => {
          const isSelected = track.id === activeTrack.id;
          return (
            <button
              key={track.id}
              onClick={() => handleSelectTrack(track.id)}
              className={`p-4 sm:p-5 text-start transition-all cursor-pointer flex flex-col justify-between border-b-2 md:border-b-0 md:border-r border-slate-800 last:border-r-0 ${
                isSelected
                  ? "bg-slate-800/80 border-b-amber-500 md:border-b-0 md:border-r-amber-500"
                  : "hover:bg-slate-850/60 opacity-80 hover:opacity-100"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                      isSelected
                        ? "bg-amber-500/20 text-amber-300"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {isHe ? track.categoryHe : track.categoryEn}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    ⏱ {track.duration}
                  </span>
                </div>
                <div
                  className={`text-xs sm:text-sm font-bold leading-snug ${
                    isSelected ? "text-white" : "text-slate-300"
                  }`}
                >
                  {isHe ? track.titleHe : track.titleEn}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── VIDEO PLAYER MAIN STAGE ── */}
      <div className="relative aspect-video bg-black overflow-hidden flex flex-col justify-between select-none group">
        {/* Poster / Background Scene */}
        <div className="absolute inset-0 z-0">
          <Image
            src={activeTrack.posterImage}
            alt={isHe ? activeTrack.titleHe : activeTrack.titleEn}
            fill
            className={`object-cover transition-all duration-700 ${
              isPlaying ? "scale-105 opacity-35 blur-[1px]" : "opacity-60"
            }`}
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-slate-950/40" />
        </div>

        {/* Top Video Header Overlay */}
        <div className="relative z-10 p-4 sm:p-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="px-2.5 py-1 rounded-md bg-slate-900/80 backdrop-blur-md border border-slate-700/80 text-[11px] font-bold text-slate-200">
              FoodXchange Sourcing Tour · {activeTrack.duration}
            </span>
          </div>

          <div
            className={`px-3 py-1 rounded-md border text-xs font-bold backdrop-blur-md ${currentChapter.badgeColor}`}
          >
            {currentChapter.badge}
          </div>
        </div>

        {/* Center Play/Pause Trigger & Animated Scene Overlay */}
        <div className="relative z-10 flex flex-col items-center justify-center p-6 text-center my-auto">
          {!isPlaying ? (
            <button
              onClick={() => setIsPlaying(true)}
              className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all cursor-pointer group/btn"
              title="Play Video"
            >
              <PlayIcon className="w-9 h-9 ml-1 group-hover/btn:translate-x-0.5 transition-transform" />
            </button>
          ) : (
            <div className="max-w-xl mx-auto bg-slate-900/90 backdrop-blur-xl border border-slate-700/80 rounded-2xl p-5 shadow-2xl text-start animate-fade-in">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-amber-400 font-mono text-xs font-bold">
                  [{currentChapter.time}]
                </span>
                <span className="text-sm font-bold text-white">
                  {isHe ? currentChapter.titleHe : currentChapter.titleEn}
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed mb-3">
                {isHe ? currentChapter.descHe : currentChapter.descEn}
              </p>
              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-800">
                <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                  <CheckCircleIcon className="w-3.5 h-3.5" />
                  <span>{isHe ? "סעיף מאומת בפלטפורמה" : "Verified Live Workflow"}</span>
                </span>
                <button
                  onClick={() => setIsPlaying(false)}
                  className="hover:text-white transition cursor-pointer"
                >
                  {isHe ? "השהה סרטון ⏸" : "Pause Video ⏸"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── BOTTOM PLAYER CONTROLS & TIMELINE SCRUBBER ── */}
        <div className="relative z-10 p-4 sm:p-5 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent">
          {/* Progress Bar with Chapter Markers */}
          <div className="relative w-full h-2 bg-slate-800 rounded-full mb-3 cursor-pointer overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-300 rounded-full"
              style={{ width: `${(progressSec / totalDurationSec) * 100}%` }}
            />
          </div>

          {/* Chapter Quick Jump Points */}
          <div className="grid grid-cols-4 gap-1.5 mb-3 text-[10px] sm:text-[11px]">
            {activeTrack.chapters.map((ch, idx) => {
              const isChapterActive = progressSec >= ch.seconds;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    setProgressSec(ch.seconds);
                    setIsPlaying(true);
                  }}
                  className={`text-start truncate py-1 px-1.5 rounded transition cursor-pointer ${
                    isChapterActive
                      ? "text-amber-300 font-semibold bg-amber-500/10"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                  title={isHe ? ch.titleHe : ch.titleEn}
                >
                  <span className="font-mono text-slate-500 mr-1">{ch.time}</span>
                  <span>{isHe ? ch.titleHe : ch.titleEn}</span>
                </button>
              );
            })}
          </div>

          {/* Bottom Bar: Play/Pause, Timer & Direct Action CTA */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition cursor-pointer"
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <PauseIcon className="w-4 h-4" /> : <PlayIcon className="w-4 h-4" />}
              </button>

              <button
                onClick={() => {
                  setProgressSec(0);
                  setIsPlaying(true);
                }}
                className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                title="Restart"
              >
                <RotateCcwIcon className="w-4 h-4" />
              </button>

              <div className="font-mono text-xs text-slate-300">
                <span className="text-amber-400 font-bold">{formatSeconds(progressSec)}</span>
                <span className="text-slate-500"> / {activeTrack.duration}</span>
              </div>
            </div>

            <Link
              href={activeTrack.ctaHref}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition shadow-lg shadow-amber-500/20"
            >
              <span>{isHe ? activeTrack.ctaLabelHe : activeTrack.ctaLabelEn}</span>
              <span className="text-[10px]">↗</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
