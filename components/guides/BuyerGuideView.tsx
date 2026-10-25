"use client";

import { useState } from "react";
import Link from "next/link";
import WorkflowVideoPlayer from "@/components/video/WorkflowVideoPlayer";

interface Props {
  lang: "he" | "en";
}

function SearchIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function PackageIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );
}

function LayersIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  );
}

function ShieldCheckIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
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

function ChevronDownIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function ChevronRightIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

function GlobeIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  );
}

function PrinterIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
    </svg>
  );
}

function SparklesIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  );
}

function TruckIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
    </svg>
  );
}

export default function BuyerGuideView({ lang }: Props) {
  const isHe = lang === "he";
  const [activeStep, setActiveStep] = useState<number>(1);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const steps = isHe
    ? [
        {
          id: 1,
          badge: "שלב 1",
          title: "איתור ואימות מפעלים",
          subtitle: "סינון לפי כשרות, תקנים ונפחי יצור",
          icon: SearchIcon,
        },
        {
          id: 2,
          badge: "שלב 2",
          title: "הזמנת דוגמאות טעימה",
          subtitle: "שילוח בלדרות ישיר למשרדי הקניין",
          icon: PackageIcon,
        },
        {
          id: 3,
          badge: "שלב 3",
          title: "פורטל ניהול הפרויקט",
          subtitle: "מעקב הצעות, מפרטים ולוחות זמנים",
          icon: LayersIcon,
        },
        {
          id: 4,
          badge: "שלב 4",
          title: "רגולציה, כשרות ועלות נחיתה",
          subtitle: "ת״י 1145, סימונים אדומים וחישוב שער מחסן",
          icon: ShieldCheckIcon,
        },
      ]
    : [
        {
          id: 1,
          badge: "Step 1",
          title: "Factory Discovery & Verification",
          subtitle: "Filter by Kosher, BRC/IFS, & capacity",
          icon: SearchIcon,
        },
        {
          id: 2,
          badge: "Step 2",
          title: "Tasting Samples Dispatch",
          subtitle: "Express air-courier delivery to your desk",
          icon: PackageIcon,
        },
        {
          id: 3,
          badge: "Step 3",
          title: "Project Collaboration Portal",
          subtitle: "Track live quotes, specs & milestones",
          icon: LayersIcon,
        },
        {
          id: 4,
          badge: "Step 4",
          title: "Regulations, Kosher & Landed Cost",
          subtitle: "SI 1145, Red Badges, & CIF vs Landed",
          icon: ShieldCheckIcon,
        },
      ];

  const faqs = isHe
    ? [
        {
          q: "האם שירות FoodXchange כרוך בעלות או דמי מנוי עבור הקניין?",
          a: "לא. השימוש בפלטפורמה, איתור המפעלים והזמנת דוגמאות טעימה מותאמות אינם כרוכים בתשלום מצד הקניין או רשת השיווק. המודל העסקי מבוסס על הצלחה מסחרית בלבד ומשולב ישירות בהסכמי היצרנים.",
        },
        {
          q: "איך מוודאים שהמפעל מחזיק בכשרות המוכרת על ידי הרבנות הראשית?",
          a: "צוות הדסק של FoodXchange מבצע בדיקה מקדימה מול מחלקת היבוא של הרבנות הראשית לישראל ומול גופי הכשרות הבינלאומיים (כגון OU, OK, כף-K, בד״ץ וכד׳). במידה והמוצר אינו כשר כיום אך המפעל מתאים, אנו מלווים את תיאום משלחת כשרות ליצור ייעודי.",
        },
        {
          q: "מה קורה במידה ודוגמת הטעימה אינה תואמת את הטעם או המרקם המבוקש?",
          a: "בפורטל המעקב שלכם תמלאו משוב טעימה בן 5 ממדים. ניתן לבקש התאמת מתכון (Formulation adjustment) כגון הפחתת סוכר, שינוי אחוזי תיבול או החלפת שמן, והמפעל ישלח סבב דוגמאות מתוקן.",
        },
        {
          q: "מי אחראי על התאמת האריזה לתקן הישראלי (ת״י 1145 וסימונים אדומים)?",
          a: "FoodXchange מספקת כלי ביקורת רגולטורי מובנה (Label Checker) המחשב אוטומטית האם נדרש סימון אדום (נתרן, סוכר, שומן רווי), מנסח את הצהרת הרכיבים בעברית, ומעביר למעצב המפעל קובץ תיקונים מדויק לפני ירידה לדפוס.",
        },
        {
          q: "מהו זמן האספקה הממוצע מרגע אישור ההזמנה (PO) ועד הגעה לנמל חיפה/אשדוד?",
          a: "במוצרי מדף קיימים עם התאמת תווית: 4 עד 6 שבועות. במוצרי מותג פרטי חדשים הדורשים גלופות דפוס וסבב כשרות: 8 עד 10 שבועות.",
        },
      ]
    : [
        {
          q: "Is there any subscription fee for retail buyers to use FoodXchange?",
          a: "No. Access to the factory catalog, supplier vector matching, and sample courier requests is completely free for verified retail buyers and importers. Our model is built on successful commercial transactions.",
        },
        {
          q: "How do we ensure the factory's kosher status is recognized in Israel?",
          a: "The FDX desk verifies kosher credentials directly with the Chief Rabbinate of Israel import division and recognized international certifying agencies (OU, OK, Star-K, Badatz). For non-certified factories, we coordinate turnkey rabbinical production delegations.",
        },
        {
          q: "What if tasting samples do not match our required flavor or texture?",
          a: "In your project portal, you submit a 5-dimension sensory scorecard. You can request recipe adjustments (e.g., lower sodium, altered seasoning, palm-oil free) and the factory will prepare revised batch samples.",
        },
        {
          q: "Who handles Hebrew labeling compliance and mandatory Red Warning Badges?",
          a: "FoodXchange runs an automated regulatory audit against Israeli Standard SI 1145. We calculate nutritional thresholds, generate Hebrew ingredient clauses, and provide the factory's design studio with numbered packaging adjustments.",
        },
        {
          q: "What is the typical lead time from PO confirmation to port arrival in Haifa/Ashdod?",
          a: "For existing catalog items with Hebrew sticker adaptation: 4 to 6 weeks. For new private-label runs requiring custom printing plates and kosher supervision: 8 to 10 weeks.",
        },
      ];

  return (
    <div className={`min-h-screen bg-slate-950 text-slate-100 ${isHe ? "rtl" : "ltr"}`} dir={isHe ? "rtl" : "ltr"}>
      {/* ── STYLES FOR PRINT ── */}
      <style jsx global>{`
        @media print {
          nav, footer, .no-print, button {
            display: none !important;
          }
          body, main, div {
            background: #ffffff !important;
            color: #000000 !important;
          }
          .print-block {
            page-break-inside: avoid;
            border: 1px solid #cccccc !important;
            box-shadow: none !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
          .print-title {
            color: #0f172a !important;
          }
          .print-subtitle {
            color: #475569 !important;
          }
          .print-badge {
            border: 1px solid #000000 !important;
            color: #000000 !important;
            background: transparent !important;
          }
        }
      `}</style>

      {/* ── TOP HERO HEADER ── */}
      <header className="relative border-b border-white/10 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 pt-28 pb-16 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Top Breadcrumb & Actions */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6 text-sm">
            <div className="flex items-center gap-2 text-slate-400">
              <Link href={isHe ? "/he" : "/"} className="hover:text-amber-400 transition-colors">
                FoodXchange
              </Link>
              <span>/</span>
              <span className="text-amber-400 font-medium">
                {isHe ? "מדריך קניינים למותג פרטי" : "Retail Buyer Sourcing Guide"}
              </span>
            </div>

            <div className="flex items-center gap-3 no-print">
              <Link
                href={isHe ? "/en/guide" : "/he/guide"}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 text-xs font-medium text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
              >
                <GlobeIcon className="w-3.5 h-3.5" />
                <span>{isHe ? "English Guide" : "מדריך בעברית"}</span>
              </Link>

              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition-all shadow-sm cursor-pointer"
                title={isHe ? "הדפס או שמור כקובץ PDF" : "Print or Save as PDF"}
              >
                <PrinterIcon className="w-3.5 h-3.5" />
                <span>{isHe ? "הדפסה / שמירה כ-PDF" : "Print / Save PDF"}</span>
              </button>
            </div>
          </div>

          {/* Hero Content */}
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-4">
              <SparklesIcon className="w-3.5 h-3.5" />
              <span>{isHe ? "המדריך המעשי לרשתות שיווק ויבואנים" : "Operational Playbook for Supermarkets & Importers"}</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-4 leading-tight print-title">
              {isHe
                ? "מדריך הקניין: איתור מפעלים אירופאים וייצור מותג פרטי"
                : "The Retail Buyer Guide: Sourcing European OEM & Private Label"}
            </h1>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed mb-8 print-subtitle">
              {isHe
                ? "כיצד לאתר מעל 5,000 מפעלי מזון מובילים באירופה, להזמין דוגמאות טעימה ישירות לשולחן העבודה שלכם, לעבור רגולציה וכשרות, ולנהל הזמנות מכולה במחירי יצרן ישירים ללא פערי תיווך."
                : "How to discover 5,000+ verified European food factories, order fast-track courier tasting samples, ensure Israeli SI 1145 & kosher compliance, and execute direct container orders with zero broker markup."}
            </p>

            {/* Quick KPI stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-800">
              <div>
                <div className="text-2xl font-bold text-amber-400">5,000+</div>
                <div className="text-xs text-slate-400">{isHe ? "מפעלים אירופאים מאומתים" : "Verified European Factories"}</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-emerald-400">100%</div>
                <div className="text-xs text-slate-400">{isHe ? "דוגמאות טעימה עד המשרד" : "Desk-Delivered Tasting Samples"}</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-sky-400">SI 1145</div>
                <div className="text-xs text-slate-400">{isHe ? "התאמת תווית וסימונים אדומים" : "Automated Label Audit"}</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-indigo-400">0%</div>
                <div className="text-xs text-slate-400">{isHe ? "עמלת תיווך מהקניין" : "Buyer Listing / Broker Fee"}</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── 4-STEP INTERACTIVE WORKFLOW ── */}
      <section className="py-16 px-6 max-w-6xl mx-auto">
        {/* Step Navigation Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-10 no-print">
          {steps.map((s) => {
            const Icon = s.icon;
            const isActive = activeStep === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setActiveStep(s.id)}
                className={`flex items-start gap-3 p-4 rounded-xl border text-start transition-all cursor-pointer ${
                  isActive
                    ? "bg-amber-500/10 border-amber-500/40 ring-1 ring-amber-500/30 text-white shadow-lg"
                    : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                <div
                  className={`p-2.5 rounded-lg shrink-0 ${
                    isActive ? "bg-amber-500 text-slate-950 font-bold" : "bg-slate-800 text-slate-400"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <span
                    className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded mb-1 ${
                      isActive ? "bg-amber-500/20 text-amber-300" : "bg-slate-800 text-slate-500"
                    }`}
                  >
                    {s.badge}
                  </span>
                  <div className={`text-sm font-semibold leading-tight ${isActive ? "text-white" : "text-slate-300"}`}>
                    {s.title}
                  </div>
                  <div className="text-xs text-slate-400 mt-1 line-clamp-1">{s.subtitle}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* ── STEP CONTENT DETAILS ── */}
        <div className="space-y-12">
          {/* STEP 1: DISCOVERY & VERIFICATION */}
          <div
            className={`print-block rounded-2xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 backdrop-blur-sm transition-all ${
              activeStep === 1 ? "ring-1 ring-amber-500/20" : "hidden sm:block opacity-90"
            }`}
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="px-3 py-1 rounded-md bg-amber-500/20 text-amber-400 text-xs font-bold print-badge">
                {isHe ? "שלב 1" : "Step 1"}
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white print-title">
                {isHe ? "איתור ואימות מפעלי ייצור באירופה" : "Factory Discovery & Operational Verification"}
              </h2>
            </div>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6 print-subtitle">
              {isHe
                ? "קטלוג FoodXchange כולל למעלה מ-5,000 יצרני מזון מאיטליה, ספרד, צרפת, גרמניה, פולין ויוון. כל מפעל עובר בדיקת אימות טכנולוגית הממפה תקני איכות בינלאומיים (IFS, BRC, FSSC 22000), יכולות ייצור מותג פרטי (OEM / Private Label), ונפח תפוקה שנתי."
                : "The FoodXchange catalog covers 5,000+ verified food manufacturers across Italy, Spain, France, Germany, Poland, and Greece. Every facility is mapped against international food safety standards (IFS, BRC, FSSC 22000), OEM private label capabilities, and annual container capacity."}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="text-amber-400 font-semibold text-sm mb-1">
                  {isHe ? "🔍 סינון ממוקד כשרות" : "🔍 Kosher Status Filtering"}
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {isHe
                    ? "סינון מיידי לפי מפעלים המחזיקים בהסמכת כשרות מוכרת (OU, OK, Star-K, חוג חתם סופר), או מפעלים עם קווי יצור נקיים המתאימים להכשרה מהירה."
                    : "Instantly filter by existing recognized certifications (OU, OK, Star-K, Badatz) or facilities with isolated lines suitable for fast rabbinical koshering."}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="text-emerald-400 font-semibold text-sm mb-1">
                  {isHe ? "🏷️ מותג פרטי מול מותג יצרן" : "🏷️ Private Label vs Factory Brand"}
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {isHe
                    ? "זיהוי מפעלים המציעים ייצור תחת מותג הרשת שלכם (Private Label), כולל כמויות מינימום (MOQ) גמישות של החל מחצי מכולה."
                    : "Identify factories equipped for custom retail packaging under your own supermarket brand, with flexible MOQs starting from mixed pallets to full containers."}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="text-sky-400 font-semibold text-sm mb-1">
                  {isHe ? "⚡ מנוע התאמה סמנטי (AI)" : "⚡ Semantic AI Matching"}
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {isHe
                    ? "חיפוש חופשי בעברית או באנגלית: הזינו 'פסטה ברונזה מאיטליה' או 'שמן זית כתית מעולה חמיצות 0.3%' וקבלו התאמה מדויקת."
                    : "Free natural-language search: query 'organic bronze-cut pasta' or 'cold-pressed extra virgin olive oil 0.3% acidity' to match factory specs."}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 no-print pt-2">
              <Link
                href={isHe ? "/he/products" : "/en/products"}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-colors"
              >
                <span>{isHe ? "חיפוש בקטלוג המוצרים" : "Browse Product Catalog"}</span>
                <span className="text-[11px]">↗</span>
              </Link>
              <Link
                href={isHe ? "/he/sourcing" : "/en/sourcing"}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-200 font-medium text-xs hover:border-slate-500 hover:text-white transition-colors"
              >
                <span>{isHe ? "הגש דרישת רכש (RFQ)" : "Submit Sourcing RFQ"}</span>
              </Link>
            </div>
          </div>

          {/* STEP 2: SAMPLES HUB */}
          <div
            className={`print-block rounded-2xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 backdrop-blur-sm transition-all ${
              activeStep === 2 ? "ring-1 ring-amber-500/20" : "hidden sm:block opacity-90"
            }`}
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="px-3 py-1 rounded-md bg-amber-500/20 text-amber-400 text-xs font-bold print-badge">
                {isHe ? "שלב 2" : "Step 2"}
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white print-title">
                {isHe ? "דסק דוגמאות טעימה ומבחן סנסורי" : "Tasting Samples Desk & Sensory Evaluation"}
              </h2>
            </div>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6 print-subtitle">
              {isHe
                ? "לא קונים מזון 'על הנייר'. קנייני רשתות מקבלים ערכות טעימה פיזיות ישירות למשרד באמצעות בלדרות אקספרס (DHL/FedEx). דסק הדגימות של FoodXchange דואג לאישורי שחרור מהירים ממשרד הבריאות והמכס ללא עיכובים בירוקרטיים."
                : "You never buy food on paper. Verified retail buyers receive physical tasting kits directly to their testing tables via express couriers (DHL/FedEx). The FDX samples desk handles veterinary and food authority import waivers to ensure zero customs delays."}
            </p>

            {/* 5-Dimension Sensory Scorecard */}
            <div className="p-5 rounded-xl bg-slate-950/70 border border-slate-800 mb-6">
              <div className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
                <span>{isHe ? "שאלון הערכה סנסורי בן 5 ממדים:" : "The 5-Dimension Sensory Evaluation Scorecard:"}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="font-bold text-amber-400 block mb-1">1. {isHe ? "טעם וארומה" : "Taste & Aroma"}</span>
                  <span className="text-slate-400">
                    {isHe ? "עוצמת הטעם, איזון מתיקות/מליחות, והתאמה לחך הישראלי." : "Flavor intensity and local consumer preference fit."}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="font-bold text-amber-400 block mb-1">2. {isHe ? "מרקם ונראות" : "Texture & Mouthfeel"}</span>
                  <span className="text-slate-400">
                    {isHe ? "פריכות, עמידות בבישול/אפייה, וצמיגות המוצר." : "Mouthfeel, crispiness, cooking resilience, viscosity."}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="font-bold text-amber-400 block mb-1">3. {isHe ? "אריזה קמעונאית" : "Retail Packaging"}</span>
                  <span className="text-slate-400">
                    {isHe ? "איכות שקית/צנצנת, נוחות פתיחה, ושטח לתווית עברית." : "Jar/bag integrity, shelf presence, Hebrew label surface."}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="font-bold text-amber-400 block mb-1">4. {isHe ? "חיי מדף ותקינות" : "Shelf Life"}</span>
                  <span className="text-slate-400">
                    {isHe ? "יציבות המוצר, חומרים משמרים ותאריכי תפוגה רלוונטיים." : "Preservatives, thermal stability, sell-by horizon."}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="font-bold text-amber-400 block mb-1">5. {isHe ? "כדאיות מסחרית" : "Commercial Fit"}</span>
                  <span className="text-slate-400">
                    {isHe ? "יחס איכות-מחיר בהשוואה למותגי המדף הקיימים בישראל." : "Price-to-quality ratio vs leading Israeli retail brands."}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              💡 {isHe
                ? "משוב הטעימה שלכם מוזן בלחיצה אחת בפורטל. במידה ואישרתם את הדוגמה — הפרויקט עובר אוטומטית לשלב הצעת מחיר מסחרית וסגירת מכולה."
                : "Your sensory feedback is logged with 1 click in your portal. Approving a sample advances the project directly to commercial quote locking and container scheduling."}
            </p>
          </div>

          {/* STEP 3: COLLABORATION PORTAL */}
          <div
            className={`print-block rounded-2xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 backdrop-blur-sm transition-all ${
              activeStep === 3 ? "ring-1 ring-amber-500/20" : "hidden sm:block opacity-90"
            }`}
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="px-3 py-1 rounded-md bg-amber-500/20 text-amber-400 text-xs font-bold print-badge">
                {isHe ? "שלב 3" : "Step 3"}
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white print-title">
                {isHe ? "פורטל מעקב פרויקט וקבלת הצעות מחיר (/track/[id])" : "Project Collaboration & Live Deal Desk (/track/[id])"}
              </h2>
            </div>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6 print-subtitle">
              {isHe
                ? "כל פרויקט רכש מקבל קישור ייחודי ומאובטח לפורטל מעקב. במקום שרשראות אינסופיות של מיילים וקבצי אקסל, כל הנתונים מרוכזים במקום אחד בזמן אמת."
                : "Every sourcing project is assigned a secure, real-time collaboration workspace. Instead of fragmented email threads and outdated spreadsheets, all commercial specifications are centralized."}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="font-semibold text-sm text-white mb-1 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>{isHe ? "מפרט טכני ואישור גרפיקה (Dieline)" : "Technical Specs & Artwork Proofs"}</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {isHe
                    ? "אישור מקוון של קובצי הגרפיקה, פריסות האריזה (Dieline), ונוסח התווית בעברית לפני ביצוע הדפסה במפעל."
                    : "Review and approve high-res packaging proofs, dielines, and Hebrew nutritional label overlays before production plates are created."}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="font-semibold text-sm text-white mb-1 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  <span>{isHe ? "לוחות זמנים ומעקב אונייה חי" : "Milestone Timeline & Vessel Tracking"}</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {isHe
                    ? "מעקב מדויק אחרי שלבי היצור, מועד יציאת המכולה מנמלי אירופה (גנואה, ולנסיה, המבורג), שטר מטען (B/L), וזמן הגעה משוער (ETA) לנמל חיפה או אשדוד."
                    : "Track factory production release, vessel container booking, Bill of Lading (B/L) issuance, and live vessel ETA at Haifa or Ashdod port."}
                </p>
              </div>
            </div>

            <div className="no-print">
              <Link
                href="/track"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold hover:text-white hover:border-slate-500 transition-colors"
              >
                <TruckIcon className="w-3.5 h-3.5 text-amber-400" />
                <span>{isHe ? "כניסה לפורטל מעקב משלוחים" : "Go to Tracking Portal"}</span>
              </Link>
            </div>
          </div>

          {/* STEP 4: REGULATIONS & LANDED COST */}
          <div
            className={`print-block rounded-2xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 backdrop-blur-sm transition-all ${
              activeStep === 4 ? "ring-1 ring-amber-500/20" : "hidden sm:block opacity-90"
            }`}
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="px-3 py-1 rounded-md bg-amber-500/20 text-amber-400 text-xs font-bold print-badge">
                {isHe ? "שלב 4" : "Step 4"}
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white print-title">
                {isHe ? "רגולציה, ת״י 1145, סימונים אדומים ועלות נחיתה" : "Regulatory SI 1145, Red Badges & Landed Cost"}
              </h2>
            </div>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6 print-subtitle">
              {isHe
                ? "היבוא לישראל עבר מהפכה בעקבות רפורמת 'מה שטוב לאירופה'. עם זאת, תקינה ישראלית ייחודית עדיין מחייבת עמידה בתקן ת״י 1145 (סימון מזון ארוז מראש), סימונים תזונתיים אדומים, ואישור מחלקת היבוא של הרבנות הראשית."
                : "Food import into Israel has simplified under the European Mutual Recognition Reform. However, specific standards remain mandatory: SI 1145 (pre-packaged food labeling), Front-of-Package Red Warning Badges, and Chief Rabbinate import certification."}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="font-semibold text-rose-400 text-sm mb-1">
                  {isHe ? "🔴 סימונים אדומים (תקנות הגנה)" : "🔴 Red Warning Badges"}
                </div>
                <p className="text-xs text-slate-400 leading-relaxed mb-2">
                  {isHe
                    ? "סימון חובה בחזית האריזה מעל הרמות הבאות ל-100 גרם מוצר מוצק:"
                    : "Mandatory front-of-pack red warning labels when exceeding per 100g:"}
                </p>
                <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                  <li>{isHe ? "נתרן: 400 מ״ג ומעלה" : "Sodium: ≥ 400 mg"}</li>
                  <li>{isHe ? "סוכרים: 10 גרם ומעלה" : "Total Sugars: ≥ 10 g"}</li>
                  <li>{isHe ? "שומן רווי: 4 גרם ומעלה" : "Saturated Fat: ≥ 4 g"}</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="font-semibold text-amber-400 text-sm mb-1">
                  {isHe ? "📜 אישור כשרות הרבנות הראשית" : "📜 Kosher Import Authorization"}
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {isHe
                    ? "כל משלוח מחייב אישור יבוא רשמי מטעם מחלקת הכשרות ליבוא ברבנות הראשית. אנו מכינים את תיק המסמכים מראש מול גוף הכשרות בחו״ל למניעת עיכוב במכס."
                    : "Every import shipment requires an official import permit from the Chief Rabbinate. We assemble the documentation packet with the overseas kosher agency beforehand."}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="font-semibold text-emerald-400 text-sm mb-1">
                  {isHe ? "📊 מחשבון עלות שער מחסן (Landed)" : "📊 Landed Cost Simulator"}
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {isHe
                    ? "המחשבון שלנו ממיר מחיר CIF נמל חיפה/אשדוד לעלות מדויקת בשער המרלו״ג, כולל פריקה, מסוף, אגרות נמל, וחישוב מרווח קמעונאי."
                    : "Our simulator converts CIF port quotes into true warehouse landed costs, factoring container demurrage, terminal fees, port dues, and retail gross margins."}
                </p>
              </div>
            </div>

            <div className="no-print">
              <Link
                href={isHe ? "/he/calculator" : "/en/calculator"}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-colors"
              >
                <span>{isHe ? "פתח את מחשבון עלות הנחיתה" : "Open Landed Cost Calculator"}</span>
                <ChevronRightIcon className={`w-3.5 h-3.5 ${isHe ? "rotate-180" : ""}`} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── VIDEO MASTERCLASS & SOFTWARE DEMO ── */}
      <section className="py-16 px-6 border-t border-slate-800 bg-slate-900/60 no-print">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider mb-3 inline-block">
              {isHe ? "סרטוני הדרכה והדגמה" : "Video Masterclass & Live Walkthrough"}
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white mb-3">
              {isHe ? "סרטוני הדגמה: צעד-אחר-צעד במערכת" : "Guided Video Tours: Step-by-Step Software Walkthrough"}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              {isHe
                ? "צפו בסרטוני הדרכה קצרים הממחישים כיצד לאתר 5,000+ מפעלים, להזמין ערכות טעימה לשולחן העבודה, ולחשב עלות שער מחסן."
                : "Watch 60-second guided video walkthroughs covering factory discovery, sample box dispatches, and landed cost simulation."}
            </p>
          </div>

          <WorkflowVideoPlayer lang={lang} />
        </div>
      </section>

      {/* ── FREQUENTLY ASKED QUESTIONS ── */}
      <section className="py-16 px-6 border-t border-slate-800 bg-slate-900/40">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 print-title">
              {isHe ? "שאלות נפוצות של קניינים ויבואנים" : "Frequently Asked Questions by Retail Buyers"}
            </h2>
            <p className="text-sm text-slate-400 print-subtitle">
              {isHe
                ? "כל מה שחשוב לדעת על עבודה מול מפעלי מזון באירופה באמצעות FoodXchange"
                : "Essential answers regarding European factory sourcing through FoodXchange"}
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-slate-800 bg-slate-900/70 overflow-hidden print-block"
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full flex items-center justify-between p-4 text-start hover:bg-slate-800/40 transition-colors cursor-pointer"
                >
                  <span className="text-sm font-semibold text-slate-200">{faq.q}</span>
                  <ChevronDownIcon
                    className={`w-4 h-4 text-slate-400 transition-transform ${openFaq === idx ? "rotate-180" : ""}`}
                  />
                </button>
                {(openFaq === idx || typeof window === "undefined") && (
                  <div className="p-4 pt-0 text-xs text-slate-400 leading-relaxed border-t border-slate-800/50">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BOTTOM CALL TO ACTION ── */}
      <section className="py-16 px-6 border-t border-white/10 bg-gradient-to-t from-slate-950 to-slate-900 text-center no-print">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white mb-4">
            {isHe ? "מוכנים לשדרג את קטגוריית המזון שלכם?" : "Ready to Elevate Your Retail Food Category?"}
          </h2>
          <p className="text-slate-300 text-sm sm:text-base mb-8">
            {isHe
              ? "ספרו לדסק הסורסינג של FoodXchange איזה מוצר אתם מחפשים. נאתר עבורכם את המפעלים המתאימים ביותר ונשלח ערכת דוגמאות לטעימה."
              : "Tell the FDX deal desk what product category you are sourcing. We will match candidate factories and dispatch a curated tasting box to your office."}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href={isHe ? "/he/sourcing" : "/en/sourcing"}
              className="px-6 py-3 rounded-xl bg-amber-500 text-slate-950 font-bold text-sm hover:bg-amber-400 transition-all shadow-lg hover:shadow-amber-500/20"
            >
              {isHe ? "הגשת דרישת רכש (RFQ)" : "Submit Sourcing Request"}
            </Link>
            <Link
              href={isHe ? "/he/contact" : "/en/contact"}
              className="px-6 py-3 rounded-xl border border-slate-700 bg-slate-800 text-white font-medium text-sm hover:border-slate-500 transition-colors"
            >
              {isHe ? "תיאום שיחה עם מנהל דסק" : "Speak with Deal Desk"}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
