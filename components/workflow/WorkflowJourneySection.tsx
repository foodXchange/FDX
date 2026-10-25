"use client";

import { useState } from "react";
import Link from "next/link";

interface Props {
  lang?: "he" | "en";
}

function SearchIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function PackageIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );
}

function ShieldCheckIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function FileTextIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function ShipIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.5l2-1.5 2 1.5 2-1.5 2 1.5 2-1.5 2 1.5 2-1.5 2 1.5 2-1.5 2 1.5M4 19a2 2 0 002 2h12a2 2 0 002-2l-1-7H5l-1 7z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 12V5a2 2 0 012-2h6a2 2 0 012 2v7" />
    </svg>
  );
}

function PlayIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function CloseIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
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

export default function WorkflowJourneySection({ lang = "he" }: Props) {
  const isHe = lang === "he";
  const [activeStep, setActiveStep] = useState<number>(1);
  const [videoModalOpen, setVideoModalOpen] = useState(false);

  const stages = isHe
    ? [
        {
          id: 1,
          stepNum: "01",
          title: "איתור מפעל והתאמת מפרט",
          badge: "שלב ראשון",
          desc: "סריקת 5,000+ יצרנים באירופה לפי כשרות, BRC/IFS ונפחי יצור",
          icon: SearchIcon,
          tag: "AI Vector Match",
          cardTitle: "אפיון דרישה וסינון 5,000+ מפעלי מזון באירופה",
          cardDetails: [
            "הזנת מפרט או תמונת מוצר מדף מבוקש (פסטה, שמן זית, שימורי טונה, ירקות קפואים).",
            "סינון מיידי לפי מפעלים המחזיקים בהסמכות בינלאומיות (IFS, BRC, FSSC 22000).",
            "בדיקת נתיב כשרות מוקדמת: תעודה מוכרת קיימת (OU, OK, כף-K) או מסלול הכשרה מהיר.",
            "בחינת יכולות מותג פרטי (OEM / Private Label) ומינימום הזמנה (MOQ).",
          ],
          statNum: "5,048+",
          statLabel: "מפעלים מאומתים במאגר",
          actionLabel: "חיפוש בקטלוג המפעלים",
          actionHref: "/he/products",
        },
        {
          id: 2,
          stepNum: "02",
          title: "ערכת טעימה לשולחן הקניין",
          badge: "שלב שני",
          desc: "שילוח דוגמאות אקספרס DHL בתוך 48 שעות ישירות למשרד",
          icon: PackageIcon,
          tag: "Express Courier Hub",
          cardTitle: "הזמנת ערכת טעימות פיזית ומבחן סנסורי מקיף",
          cardDetails: [
            "דוגמאות מוצר נאספות ישירות מרצפת הייצור של המפעל באירופה.",
            "שילוח אווירי אקספרס (DHL/FedEx) עם אישורי שחרור מהירים ממשרד הבריאות והמכס.",
            "שאלון הערכה בן 5 ממדים בפורטל: טעם, מרקם, התאמת אריזה, חיי מדף וכדאיות מסחרית.",
            "אפשרות לבקש התאמת מתכון (הפחתת סוכר/מלח) וקבלת סבב דוגמאות מתוקן.",
          ],
          statNum: "48h",
          statLabel: "זמן הגעה לשולחן הטעימות",
          actionLabel: "הזמן ערכת טעימות לדסק",
          actionHref: "/he/products",
        },
        {
          id: 3,
          stepNum: "03",
          title: "רגולציה, סימונים וכשרות",
          badge: "שלב שלישי",
          desc: "התאמת ת״י 1145, בדיקת סימונים אדומים ואישור הרבנות",
          icon: ShieldCheckIcon,
          tag: "SI 1145 Compliance",
          cardTitle: "בדיקת תקינה ישראלית, תרגום עברי ואישור כשרות יבוא",
          cardDetails: [
            "חישוב אוטומטי של ספים לסימונים אדומים: נתרן >=400mg, סוכרים >=10g, שומן רווי >=4g ל-100g.",
            "ניסוח הצהרת רכיבים ואלרגנים בעברית לפי תקן ת״י 1145 (סימון מזון ארוז מראש).",
            "העברת גלופת גרפיקה וקובץ תיקונים מדויק למעצב המפעל בחו״ל (Dieline Overlay).",
            "הכנת תיק מסמכים רשמי לאישור מחלקת היבוא של הרבנות הראשית לישראל.",
          ],
          statNum: "100%",
          statLabel: "עמידה בתקנות הגנת הצרכן",
          actionLabel: "פתח את ה-Label Checker",
          actionHref: "/admin/compliance/label-checker",
        },
        {
          id: 4,
          stepNum: "04",
          title: "הזמנת רכש ובנקאות מוגנת",
          badge: "שלב רביעי",
          desc: "הסכם הזמנה (PO) במחירי CIF ישירים ותנאי תשלום 30/70",
          icon: FileTextIcon,
          tag: "Secured Deal Desk",
          cardTitle: "חתימה על הזמנת רכש מוגנת ללא פערי תיווך",
          cardDetails: [
            "תמחור שקוף ומדויק ב-CIF נמל חיפה או נמל אשדוד (ביורו או דולר).",
            "תנאי תשלום בינלאומיים מאובטחים: 30% מקדמה עם אישור הגרפיקה, 70% כנגד שטר מטען (B/L).",
            "הפקת הזמנת רכש (Purchase Order) דו-לשונית מסודרת לחתימת שני הצדדים.",
            "אפס עמלת תיווך הנגבית מהקניין או מרשת השיווק — חיבור ישיר במחירי מפעל.",
          ],
          statNum: "30 / 70",
          statLabel: "אבני דרך לתשלום בנקאי",
          actionLabel: "מחשבון עלות שער מחסן",
          actionHref: "/he/calculator",
        },
        {
          id: 5,
          stepNum: "05",
          title: "הפלגת מכולה ושחרור בנמל",
          badge: "שלב חמישי",
          desc: "מעקב אונייה חי, שחרור מהיר בנמל ואספקה למרלו״ג הרשת",
          icon: ShipIcon,
          tag: "Vessel Port Tracking",
          cardTitle: "ניהול שרשרת אספקה, מעקב מכולה ואספקה למרלו״ג",
          cardDetails: [
            "מעקב חי אחר הפלגת המכולה מנמלי אירופה (גנואה, ולנסיה, המבורג, פיראוס).",
            "עדכוני זמן הגעה משוער (ETA) לנמל חיפה או אשדוד ישירות בפורטל.",
            "שחרור מהיר ברפורמת 'מה שטוב לאירופה' על בסיס הצהרת יצרן ותעודת אנליזה (COA).",
            "תיאום פריקה והובלה יבשתית ישירות למרכז הלוגיסטי (מרלו״ג) של הרשת בישראל.",
          ],
          statNum: "FCL 20/40'",
          statLabel: "שינוע מכולות שלם ומבוקר",
          actionLabel: "כניסה לפורטל מעקב משלוחים",
          actionHref: "/track",
        },
      ]
    : [
        {
          id: 1,
          stepNum: "01",
          title: "Factory Discovery & Sourcing",
          badge: "Step 1",
          desc: "Screen 5,000+ European producers by Kosher, BRC/IFS, and capacity",
          icon: SearchIcon,
          tag: "AI Vector Match",
          cardTitle: "Identify & Verify 5,000+ European Food Plants",
          cardDetails: [
            "Input target specifications or photo benchmark of competitor shelf items.",
            "Instant filtering across audited European manufacturers (IFS, BRC, FSSC 22000).",
            "Pre-verified Kosher pathways: existing certifications (OU, OK, Badatz) or rapid batch setup.",
            "Assess Private Label OEM capabilities and minimum container volumes (MOQ).",
          ],
          statNum: "5,048+",
          statLabel: "Verified Factories in Network",
          actionLabel: "Browse Factory Catalog",
          actionHref: "/en/products",
        },
        {
          id: 2,
          stepNum: "02",
          title: "Express Tasting Sample Hub",
          badge: "Step 2",
          desc: "48-hour door-to-door courier delivery direct to the buyer's evaluation table",
          icon: PackageIcon,
          tag: "Express Courier Hub",
          cardTitle: "Physical Tasting Box Dispatch & 5-Dimension Sensory Scorecard",
          cardDetails: [
            "Samples sourced directly from European factory production lines.",
            "Fast-track air courier (DHL/FedEx) with zero customs delays.",
            "5-Dimension sensory scorecard: taste, texture, packaging, shelf life, and price fit.",
            "Request recipe refinements (e.g., lower sodium, palm-oil free) for revision samples.",
          ],
          statNum: "48h",
          statLabel: "Average Door Delivery Horizon",
          actionLabel: "Order Tasting Sample Box",
          actionHref: "/en/products",
        },
        {
          id: 3,
          stepNum: "03",
          title: "SI 1145 Labels & Kosher Oversight",
          badge: "Step 3",
          desc: "Standard SI 1145 compliance, Front Red Badges, and Chief Rabbinate approval",
          icon: ShieldCheckIcon,
          tag: "SI 1145 Compliance",
          cardTitle: "Automated Israeli Regulatory Audit & Kosher Production Scheduling",
          cardDetails: [
            "Automated threshold checks: Sodium >=400mg, Total Sugar >=10g, Sat Fat >=4g per 100g.",
            "Hebrew nutritional clause & allergen box drafted to Israeli Standard SI 1145.",
            "Ready-to-use vector dielines delivered to the factory's printing agency.",
            "Chief Rabbinate of Israel import packet assembly and rabbinical inspection coordination.",
          ],
          statNum: "100%",
          statLabel: "Regulatory Compliance Guarantee",
          actionLabel: "Open Label Checker",
          actionHref: "/admin/compliance/label-checker",
        },
        {
          id: 4,
          stepNum: "04",
          title: "B2B Purchase Order & Banking Terms",
          badge: "Step 4",
          desc: "Direct factory pricing on agreed CIF Haifa terms with 30/70 secure milestones",
          icon: FileTextIcon,
          tag: "Secured Deal Desk",
          cardTitle: "Sign Transparent Commercial PO with Zero Middlemen Cut",
          cardDetails: [
            "Transparent container quotes in EUR or USD on CIF Port of Haifa or Ashdod terms.",
            "Standard international milestone security: 30% advance on PO confirmation / 70% against B/L copy.",
            "Formal bilingual Hebrew/English Purchase Order generated for countersignature.",
            "0% buyer broker fee: direct factory pricing without distributor inflation.",
          ],
          statNum: "30 / 70",
          statLabel: "Standard Banking Milestones",
          actionLabel: "Landed Cost Simulator",
          actionHref: "/en/calculator",
        },
        {
          id: 5,
          stepNum: "05",
          title: "Ocean Freight & Port Clearance",
          badge: "Step 5",
          desc: "Live vessel tracking from European ports to Haifa/Ashdod arrival & warehouse release",
          icon: ShipIcon,
          tag: "Vessel Port Tracking",
          cardTitle: "End-to-End Supply Chain, Live Container Tracking & Warehouse Release",
          cardDetails: [
            "Live ocean vessel tracking from European hubs (Genoa, Valencia, Hamburg, Piraeus).",
            "Continuous arrival ETA updates at Haifa or Ashdod port in your collaboration portal.",
            "Fast-track customs release under European Mutual Recognition Reform.",
            "Inland container trucking delivery straight to your regional logistics distribution center.",
          ],
          statNum: "FCL 20/40'",
          statLabel: "Full Container Load Logistics",
          actionLabel: "Enter Tracking Portal",
          actionHref: "/track",
        },
      ];

  const currentStage = stages.find((s) => s.id === activeStep) || stages[0];

  return (
    <section className={`py-20 px-6 bg-slate-950 text-white relative overflow-hidden ${isHe ? "rtl" : "ltr"}`} dir={isHe ? "rtl" : "ltr"}>
      {/* Background Glow Accents */}
      <div className="absolute top-1/4 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider mb-4">
            <span>{isHe ? "מסלול הסחר המלא" : "The Complete Trade Lifecycle"}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          </div>

          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-4 leading-tight">
            {isHe
              ? "מחזון המוצר ועד למדף הרשת בישראל"
              : "From European Factory to Israeli Supermarket Shelf"}
          </h2>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            {isHe
              ? "תהליך מובנה ומאובטח בן 5 שלבים המחבר קנייני רשתות ויבואנים בישראל ישירות למפעלי מזון מובילים באירופה — ללא פערי תיווך, עם עמידה מוחלטת בתקנות כשרות ות״י 1145."
              : "A transparent 5-stage institutional sourcing journey connecting retail buyers directly with vetted European producers — zero broker markups, guaranteed kosher compliance, and verified SI 1145 labeling."}
          </p>
        </div>

        {/* ── 5-STAGE INTERACTIVE WORKFLOW STEPPER ── */}
        <div className="mb-12">
          {/* Progress bar line (desktop) */}
          <div className="hidden lg:grid grid-cols-5 gap-3 relative mb-6">
            <div className="absolute top-6 left-12 right-12 h-0.5 bg-slate-800 -z-0" />
            
            {stages.map((st) => {
              const Icon = st.icon;
              const isActive = activeStep === st.id;
              const isPast = activeStep > st.id;

              return (
                <button
                  key={st.id}
                  onClick={() => setActiveStep(st.id)}
                  className="flex flex-col items-center text-center group cursor-pointer relative z-10"
                >
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm transition-all duration-300 mb-3 shadow-lg ${
                      isActive
                        ? "bg-amber-500 text-slate-950 scale-110 ring-4 ring-amber-500/20 shadow-amber-500/30"
                        : isPast
                        ? "bg-slate-800 text-amber-400 border border-amber-500/40"
                        : "bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700 hover:text-slate-200"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  <span
                    className={`text-[11px] font-bold uppercase tracking-wider mb-1 transition-colors ${
                      isActive ? "text-amber-400" : "text-slate-500"
                    }`}
                  >
                    {st.badge}
                  </span>
                  <span
                    className={`text-xs font-semibold max-w-[150px] leading-snug transition-colors ${
                      isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200"
                    }`}
                  >
                    {st.title}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Mobile Pills Stepper */}
          <div className="lg:hidden flex gap-2 overflow-x-auto pb-4 scrollbar-none mb-6">
            {stages.map((st) => {
              const isActive = activeStep === st.id;
              return (
                <button
                  key={st.id}
                  onClick={() => setActiveStep(st.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 border transition-all cursor-pointer ${
                    isActive
                      ? "bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20"
                      : "bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  {st.stepNum}. {st.title}
                </button>
              );
            })}
          </div>

          {/* ── EXPANDED STAGE DETAIL CARD ── */}
          <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 p-6 sm:p-10 shadow-2xl relative overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Left Column: Stage Info */}
              <div className="lg:col-span-7">
                <div className="flex items-center gap-2.5 mb-3">
                  <span className="px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-300 text-xs font-bold uppercase tracking-wider">
                    {currentStage.badge} · {currentStage.tag}
                  </span>
                  <span className="text-xs text-slate-400">
                    {isHe ? "מתוך 5 שלבים מנוהלים" : "Stage 5 of 5 Managed Phases"}
                  </span>
                </div>

                <h3 className="text-2xl sm:text-3xl font-extrabold text-white mb-4">
                  {currentStage.cardTitle}
                </h3>

                <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6">
                  {currentStage.desc}
                </p>

                <div className="space-y-3 mb-8">
                  {currentStage.cardDetails.map((detail, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-300">
                      <CheckCircleIcon className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{detail}</span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href={currentStage.actionHref}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs sm:text-sm hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20"
                  >
                    <span>{currentStage.actionLabel}</span>
                    <span className="text-[11px]">↗</span>
                  </Link>

                  <button
                    onClick={() => setVideoModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-medium text-xs sm:text-sm transition-colors cursor-pointer"
                  >
                    <PlayIcon className="w-4 h-4 text-amber-400" />
                    <span>{isHe ? "צפה בהדגמה (60 שניות)" : "Watch 60s Demo"}</span>
                  </button>
                </div>
              </div>

              {/* Right Column: Visual Milestone Mockup Box */}
              <div className="lg:col-span-5">
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 relative overflow-hidden shadow-inner">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      {isHe ? "מחוון ביצוע רשמי" : "Operational Deliverable"}
                    </div>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  </div>

                  <div className="text-center py-6">
                    <div className="text-4xl sm:text-5xl font-black text-amber-400 tracking-tight mb-2">
                      {currentStage.statNum}
                    </div>
                    <div className="text-xs sm:text-sm text-slate-400 font-medium">
                      {currentStage.statLabel}
                    </div>
                  </div>

                  {/* Micro Simulation Pill Card */}
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <span>{isHe ? "סטטוס שלב במערכת:" : "System Phase Status:"}</span>
                    </div>
                    <span className="font-bold text-emerald-400">
                      {isHe ? "פעיל ומנוהל בזמן אמת" : "Live & Synchronized"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── VIDEO SHOWCASE CARD (CINEMA SECTION) ── */}
        <div className="rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-800/80 to-slate-900 p-8 sm:p-10 shadow-2xl relative overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            {/* Left description */}
            <div className="md:col-span-7">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-4">
                <span>{isHe ? "סיור מודרך" : "Video Walkthrough"}</span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-black text-white mb-3">
                {isHe
                  ? "צפו כיצד עסקת יבוא מכולה מתבצעת ב-60 שניות"
                  : "See How a Full Container Import Deal Executes in 60 Seconds"}
              </h3>

              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-6">
                {isHe
                  ? "מסינון המפעל באירופה, דרך הזמנת ערכת הדוגמאות, בדיקת סימונים אדומים (ת״י 1145) ועד למעקב אונייה חי ישירות למרלו״ג הרשת."
                  : "From screening Italian/Spanish factories to express tasting kits, SI 1145 red badge checks, and live container port arrival in Haifa."}
              </p>

              <button
                onClick={() => setVideoModalOpen(true)}
                className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-extrabold text-sm hover:brightness-110 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
              >
                <PlayIcon className="w-4 h-4" />
                <span>{isHe ? "צפה בסרטון ההדגמה עכשיו" : "Watch the 60-Second Walkthrough"}</span>
              </button>
            </div>

            {/* Right Video Thumbnail / Play Trigger */}
            <div className="md:col-span-5">
              <div
                onClick={() => setVideoModalOpen(true)}
                className="relative aspect-video rounded-2xl overflow-hidden border border-slate-700/80 bg-slate-950 group cursor-pointer shadow-xl flex items-center justify-center hover:border-amber-500/60 transition-all"
              >
                {/* Background visual mockup */}
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-950 opacity-80" />
                
                {/* Play Button Icon */}
                <div className="relative w-16 h-16 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                  <PlayIcon className="w-7 h-7 ml-0.5" />
                </div>

                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[11px] text-slate-300 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/60">
                  <span>{isHe ? "סיור בפלטפורמה" : "FoodXchange Walkthrough"}</span>
                  <span className="font-mono text-amber-400">01:14</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── VIDEO PLAYER MODAL ── */}
      {videoModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6">
          <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                <span className="text-xs font-bold text-slate-300 ml-2">
                  {isHe ? "סיור וידאו מודרך — FoodXchange B2B Sourcing" : "FoodXchange Guided Tour Video"}
                </span>
              </div>
              <button
                onClick={() => setVideoModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Video Player Box */}
            <div className="relative aspect-video bg-black flex flex-col items-center justify-center p-8 text-center">
              {/* Ready for embed iframe or direct HTML5 video */}
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mx-auto mb-4 flex items-center justify-center">
                  <PlayIcon className="w-8 h-8 ml-0.5" />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">
                  {isHe ? "סרטון הדרכה והדגמת פלטפורמה" : "FoodXchange Live Demo Tour"}
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed mb-6">
                  {isHe
                    ? "סרטון ההדגמה של FoodXchange מציג את תהליך איתור 5,000+ המפעלים, משלוח ערכות הטעימה ישירות לשולחן הקניין, ובדיקת התקינה של ת״י 1145."
                    : "The 60-second walkthrough demonstrates factory discovery across 5,000+ plants, express tasting kits dispatched to your desk, and automated SI 1145 compliance."}
                </p>
                <div className="flex items-center justify-center gap-3">
                  <Link
                    href={isHe ? "/he/products" : "/en/products"}
                    onClick={() => setVideoModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition"
                  >
                    {isHe ? "התחל סיור בקטלוג המוצרים" : "Explore Live Catalog"}
                  </Link>
                  <button
                    onClick={() => setVideoModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-medium text-xs hover:text-white transition"
                  >
                    {isHe ? "סגור חלון" : "Close"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
