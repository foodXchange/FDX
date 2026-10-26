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
  {
    id: "supplier-factory-onboarding",
    titleHe: "פורטל יצרנים ומפעלים: הצטרפות, הצעות מחיר ושחרור ייצור",
    titleEn: "Global Supplier & Factory Portal: Onboarding to Production",
    duration: "01:20",
    categoryHe: "יצרנים ומפעלים (Suppliers)",
    categoryEn: "Suppliers & Factories",
    posterImage: "/images/factory-quality-inspection.png",
    ctaLabelHe: "פתח אשף הצטרפות מפעלים",
    ctaLabelEn: "Open Supplier Onboarding Wizard",
    ctaHref: "/en/supplier/onboarding",
    chapters: [
      {
        time: "00:00",
        seconds: 0,
        titleHe: "אימות מפעל אוטומטי והעלאת תעודות BRC/IFS וכשרות",
        titleEn: "Automated Factory Verification & BRC/IFS + Kosher Upload",
        descHe: "המפעל מזין כתובת אתר או קטלוג PDF, והמערכת מחלצת מוצרים, קווי ייצור ותעודות איכות אוטומטית.",
        descEn: "Manufacturer enters domain or PDF catalog; AI automatically extracts SKUs, lines, and quality certs.",
        badge: "שלב 1: אימות מפעל",
        badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
      },
      {
        time: "00:22",
        seconds: 22,
        titleHe: "קבלת בקשות הצעת מחיר (RFQ) מרשתות שיווק בישראל",
        titleEn: "Receiving Matched Supermarket RFQs & Sample Dispatch",
        descHe: "קבלת התראה על מכרז מותג פרטי מתאים, שליחת הצעת מחיר FOB/CIF ושיגור קופסת טעימה ב-DHL.",
        descEn: "Instant alert for matched retail tenders, submitting FOB/CIF container pricing, and DHL sample dispatch.",
        badge: "שלב 2: הצעת מחיר",
        badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
      },
      {
        time: "00:46",
        seconds: 46,
        titleHe: "קבלת הזמנת רכש (PO) רשמית ואישור מקדמת 30% T/T",
        titleEn: "Official Purchase Order (PO) & 30% T/T Deposit Release",
        descHe: "לאחר אישור הדוגמה והגרפיקה העברית, המפעל מקבל PO חתום ואישור העברת SWIFT לשחרור קו הייצור.",
        descEn: "Upon sample and Hebrew artwork approval, factory receives signed PO and SWIFT deposit confirmation.",
        badge: "שלב 3: שחרור ייצור",
        badgeColor: "bg-sky-500/20 text-sky-300 border-sky-500/30",
      },
      {
        time: "01:02",
        seconds: 62,
        titleHe: "העלאת מסמכי יצוא (EUR.1, COA, B/L) ויתרת תשלום 70%",
        titleEn: "Export Document Handover (EUR.1, COA, B/L) & 70% Balance",
        descHe: "העלאת שטר מטען ותעודת אנליזה ישירות לפורטל המפעל לשחרור יתרת התשלום ועמילות מכס מהירה.",
        descEn: "Uploading Bill of Lading, EUR.1, and batch COA in the Factory Portal triggers final balance settlement.",
        badge: "שלב 4: מסמכי יצוא",
        badgeColor: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
      },
    ],
  },
  {
    id: "agent-customs-command",
    titleHe: "רדאר סוכנים ועמילי מכס: ניהול עסקאות ושער עולמי",
    titleEn: "Sourcing Agent & Customs Broker Command Radar",
    duration: "01:18",
    categoryHe: "סוכנים ועמילי מכס (Agents)",
    categoryEn: "Agents & Customs",
    posterImage: "/images/container-port-logistics.png",
    ctaLabelHe: "פתח רדאר סוכנים חי",
    ctaLabelEn: "Open Agent Command Radar",
    ctaHref: "/admin/agents",
    chapters: [
      {
        time: "00:00",
        seconds: 0,
        titleHe: "רדאר 9 שלבים: איתור צווארי בקבוק בין קניין, מפעל ומעבדה",
        titleEn: "9-Stage Deal Radar: Pinpointing Buyer & Factory Bottlenecks",
        descHe: "הסוכן רואה בזמן אמת אילו עסקאות ממתינות לאישור טעימה, תיקון גרפיקה ת״י 1145 או תשלום מקדמה.",
        descEn: "Agent monitors all active deals across 9 stages and filters by who holds the current action ball.",
        badge: "רדאר סוכנים",
        badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
      },
      {
        time: "00:22",
        seconds: 22,
        titleHe: "סימולטור מרווח קמעונאי והפקת מצגת Pitch לקניין",
        titleEn: "Retail Margin Pitch Simulator & Assortment Deck Studio",
        descHe: "בניית הצעה השוואתית המוכיחה לקניין הרשת חיסכון של 30% מול היבואן המקומי ושיגור בוואטסאפ/מייל.",
        descEn: "Generating side-by-side landed cost vs local brand margin pitches and dispatching via WhatsApp/Email.",
        badge: "מצגת מכירה",
        badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
      },
      {
        time: "00:46",
        seconds: 46,
        titleHe: "פורטל עמיל מכס ושידור EDI לשער עולמי (Shaar Olami)",
        titleEn: "Customs Broker Portal & Shaar Olami EDI XML Clearance",
        descHe: "עמיל המכס בודק HS Code, הצהרת יצרן ומסמכי EUR.1 ומשדר הצהרת יבוא לשחרור במסלול ירוק.",
        descEn: "Licensed broker validates HS tariff codes, EUR.1 duty exemption, and transmits Shaar Olami XML.",
        badge: "שער עולמי EDI",
        badgeColor: "bg-sky-500/20 text-sky-300 border-sky-500/30",
      },
      {
        time: "01:02",
        seconds: 62,
        titleHe: "הפקת Gate Pass לנמל חיפה/אשדוד ומעקב עמלות סוכן",
        titleEn: "Port Gate Pass Issuance & Agent Commission Ledger",
        descHe: "שחרור המכולה להובלה יבשתית למרלו״ג הקניין וחישוב עמלת הסוכן האוטומטית במרכז הפיננסים.",
        descEn: "Issuing port terminal Gate Pass for inland drayage and logging verified agent commission.",
        badge: "עמלות ושחרור",
        badgeColor: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
      },
    ],
  },
  {
    id: "admin-devops-scraper",
    titleHe: "מרכז שליטה לאדמין: סורק AI, כספת מפתחות ופיננסים",
    titleEn: "Admin Master Control: AI Scraper, Vault & Treasury",
    duration: "01:15",
    categoryHe: "אדמין ו-DevOps",
    categoryEn: "Admin & DevOps",
    posterImage: "/images/buyer-product-review.png",
    ctaLabelHe: "פתח מרכז DevOps וכספת",
    ctaLabelEn: "Open DevOps & API Vault",
    ctaHref: "/admin/infrastructure",
    chapters: [
      {
        time: "00:00",
        seconds: 0,
        titleHe: "סורק מפעלים חכם (Firecrawl + Gemini 3.5 Flash-Lite)",
        titleEn: "Autonomous AI Factory Scraper & Root-Cause Inspector",
        descHe: "קליטת קובצי CSV של תערוכות מזון, סריקת אלפי אתרים, סיווג יצרנים וחילוץ מוצרים עם הגנת מכסות אוטומטית.",
        descEn: "Ingesting trade-show CSVs, crawling thousands of domains, and auto-recovering failed scrapes.",
        badge: "סורק AI",
        badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
      },
      {
        time: "00:22",
        seconds: 22,
        titleHe: "בקרת עלויות ענן חיה: Supabase, Firecrawl ו-Netlify",
        titleEn: "Live Cloud OPEX Telemetry: Supabase, Firecrawl & Netlify",
        descHe: "מעקב חי אחר נפח מסד הנתונים (MB), יתרת קרדיטים, דקות בנייה והתראות חיסכון אוטומטיות.",
        descEn: "Real-time database MB footprint, credit countdowns, and zero-build-minute [skip ci] Git push controls.",
        badge: "בקרת ענן",
        badgeColor: "bg-sky-500/20 text-sky-300 border-sky-500/30",
      },
      {
        time: "00:45",
        seconds: 45,
        titleHe: "מוקד תפוצה משולש (Tripartite Dispatch) והתחזות מהירה",
        titleEn: "Tripartite Dispatch Cockpit & 1-Click Portal Impersonation",
        descHe: "שיגור הודעות מתואמות לקניין, למפעל ולחברת השילוח, וכניסה במצב תצוגה לכל פורטל קניין או ספק.",
        descEn: "Coordinating Buyer, Factory, and Forwarder in one cockpit and previewing any portal in 1 click.",
        badge: "שליטה ובקרה",
        badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
      },
      {
        time: "01:00",
        seconds: 60,
        titleHe: "גזברות, עמלות סחר ואישור אבני דרך לתשלום",
        titleEn: "Treasury Ledger, Trade Margins & Escrow Milestones",
        descHe: "ניהול תזרים עמלות צפוי מול גבייה בפועל across כל העסקאות הפעילות במערכת.",
        descEn: "Tracking projected vs realized trade commissions and payment milestones across all active deals.",
        badge: "גזברות",
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
