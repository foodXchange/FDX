"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import WorkflowVideoPlayer from "@/components/video/WorkflowVideoPlayer";

interface RoleCard {
  id: string;
  badge: string;
  badgeColor: string;
  icon: string;
  titleEn: string;
  titleHe: string;
  descEn: string;
  descHe: string;
  videoTrackId: string;
  links: {
    labelEn: string;
    labelHe: string;
    href: string;
    primary?: boolean;
  }[];
}

const ROLE_CARDS: RoleCard[] = [
  {
    id: "buyer",
    badge: "Retail & Foodservice",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
    icon: "🛒",
    titleEn: "Retail Buyer & Importer",
    titleHe: "קניין רשת שיווק ויבואן",
    descEn:
      "Searches 5,100+ verified factories, orders 48h DHL tasting boxes, scores samples on 5 sensory dimensions, simulates landed cost + SI 1145 red badges, and signs digital POs.",
    descHe:
      "מסנן 5,100+ מפעלים מאומתים, מזמין קופסאות טעימה ב-DHL, מדרג דוגמאות ב-5 ממדים, מחשב עלות שער מחסן ות״י 1145, וחותם על הזמנת רכש (PO).",
    videoTrackId: "sourcing-samples",
    links: [
      { labelEn: "Buyer Onboarding Fast-Pass", labelHe: "אשף הצטרפות קניינים", href: "/en/buyer/onboarding", primary: true },
      { labelEn: "Buyer My Portal (/en/portal)", labelHe: "פורטל קניין אישי", href: "/en/portal" },
      { labelEn: "Live Buyer Deal Desk", labelHe: "זירת עסקה לקניין", href: "/buyer-portal/demo" },
      { labelEn: "Buyer Step-by-Step Guide", labelHe: "מדריך מלא לקניין", href: "/en/guides/buyers" },
    ],
  },
  {
    id: "supplier",
    badge: "Global Manufacturers",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
    icon: "🏭",
    titleEn: "Supplier & Factory",
    titleHe: "יצרן ומפעל מזון בינלאומי",
    descEn:
      "Onboards factory & BRC/IFS/Kosher certificates, manages product catalog, responds to supermarket RFQs with FOB/CIF quotes, confirms 30% T/T deposit, and uploads EUR.1/COA/BL.",
    descHe:
      "רישום מפעל ותעודות BRC/IFS וכשרות, ניהול קטלוג מוצרים, מענה למכרזי רשתות שיווק (FOB/CIF), אישור מקדמת 30% והעלאת מסמכי יצוא.",
    videoTrackId: "supplier-factory-onboarding",
    links: [
      { labelEn: "Supplier Onboarding Wizard", labelHe: "אשף הצטרפות מפעלים", href: "/en/supplier/onboarding", primary: true },
      { labelEn: "Supplier Portal (/en/supplier-portal)", labelHe: "פורטל ספקים", href: "/en/supplier-portal" },
      { labelEn: "Factory Production Deal Desk", labelHe: "פורטל ייצור ושחרור מפעל", href: "/factory-portal/demo" },
      { labelEn: "Supplier Export Guide", labelHe: "מדריך ליצרן", href: "/en/guides/suppliers" },
    ],
  },
  {
    id: "agent",
    badge: "Deal Desk & Sales",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
    icon: "🕵️‍♂️",
    titleEn: "Sourcing Agent & Account Director",
    titleHe: "סוכן סחר ומנהל תיקי לקוחות",
    descEn:
      "Tracks all active sourcing projects across the 9-stage pipeline, resolves Buyer/Factory bottlenecks, builds Retail Margin Pitches & Assortment Decks, and tracks deal commissions.",
    descHe:
      "מנהל את כל הפרויקטים לאורך 9 שלבי העסקה, מזהה צווארי בקבוק בין הקניין למפעל, מפיק מצגות רווחיות קמעונאית ועוקב אחר עמלות.",
    videoTrackId: "agent-customs-command",
    links: [
      { labelEn: "Agent Command Radar", labelHe: "רדאר שליטה לסוכנים", href: "/admin/agents", primary: true },
      { labelEn: "Assortment Deck Studio", labelHe: "סטודיו מצגות לקניינים", href: "/admin/decks" },
      { labelEn: "Retail Margin Simulator", labelHe: "סימולטור מרווח קמעונאי", href: "/admin/calculator" },
      { labelEn: "Sourcing Requests Pipeline", labelHe: "צנרת בקשות רכש", href: "/admin/requests" },
    ],
  },
  {
    id: "customs",
    badge: "Port & Regulatory",
    badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
    icon: "⚓",
    titleEn: "Customs Broker, Forwarder & Lab",
    titleHe: "עמיל מכס, משלח בינלאומי ומעבדה",
    descEn:
      "Verifies HS tariff codes, EUR.1 duty exemption, and SI 1145 Hebrew labels; transmits Shaar Olami EDI XML declarations; tracks container vessels to Haifa/Ashdod; issues Gate Pass.",
    descHe:
      "אימות פרט מכס (HS Code), פטור ממכס EUR.1 ותוויות ת״י 1145; שידור הצהרת יבוא לשער עולמי; מעקב אוניות מכולה והנפקת Gate Pass.",
    videoTrackId: "track-vessel-logistics",
    links: [
      { labelEn: "Customs Broker Shaar Olami Portal", labelHe: "פורטל עמיל מכס ושער עולמי", href: "/customs-portal/demo", primary: true },
      { labelEn: "Maritime Vessel Radar", labelHe: "רדאר אוניות ומכולות", href: "/admin/maritime" },
      { labelEn: "MoH & SI 1145 Compliance Lab", labelHe: "מעבדת ת״י 1145 ומשרד הבריאות", href: "/admin/compliance" },
      { labelEn: "Trade Partners Directory", labelHe: "רשת עמילי מכס ומשלחים", href: "/admin/partners" },
    ],
  },
  {
    id: "admin",
    badge: "Master Control",
    badgeColor: "bg-slate-200 text-slate-900 border-slate-300",
    icon: "⚡",
    titleEn: "Managing Director & DevOps Admin",
    titleHe: "אדמין ראשי, גזברות ו-DevOps",
    descEn:
      "Controls the Autonomous AI Web Scraper, inspects failed scrape root-causes, monitors Supabase/Firecrawl/Netlify OPEX & API Vault, manages Treasury escrow, and impersonates any user.",
    descHe:
      "שליטה בסורק המפעלים החכם, ניתוח ושחזור כשלי סריקה, ניטור עלויות ענן וכספת API, ניהול גזברות ועמלות, ותצוגת התחזות לכל משתמש.",
    videoTrackId: "admin-devops-scraper",
    links: [
      { labelEn: "AI Web Scraper & Inspector", labelHe: "סורק מפעלים חכם", href: "/admin/scraper", primary: true },
      { labelEn: "DevOps & API Key Vault", labelHe: "מרכז DevOps וכספת מפתחות", href: "/admin/infrastructure" },
      { labelEn: "Finance, Treasury & Cloud OPEX", labelHe: "גזברות ועלויות ענן", href: "/admin/finance" },
      { labelEn: "Knowledge Base & SOPs (54)", labelHe: "מרכז ידע ונהלים (54)", href: "/admin/docs" },
    ],
  },
];

export default function RoleAcademyModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"roles" | "videos">("roles");
  const [selectedVideoId, setSelectedVideoId] = useState<string>("sourcing-samples");
  const [lang, setLang] = useState<"en" | "he">("en");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("fdx_admin_locale");
      if (saved === "he" || saved === "en") setLang(saved);
    } catch {}
    const onLocale = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail === "he" || detail === "en") setLang(detail);
    };
    window.addEventListener("fdx-locale-change", onLocale);
    return () => window.removeEventListener("fdx-locale-change", onLocale);
  }, []);

  const isHe = lang === "he";

  const openVideoForRole = (trackId: string) => {
    setSelectedVideoId(trackId);
    setActiveTab("videos");
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold shadow-xs transition cursor-pointer"
        title={
          isHe
            ? "אקדמיית וידאו ומעבר מהיר בין כל סוגי המשתמשים (קניין, ספק, סוכן, עמיל מכס, אדמין)"
            : "Open Role Video Academy & User Portal Hub (Admin, Agent, Buyer, Supplier, Customs)"
        }
      >
        <span>🎬</span>
        <span className="hidden sm:inline">
          {isHe ? "הדרכות ופורטלים לפי תפקיד" : "Role Academy & Portals"}
        </span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            dir={isHe ? "rtl" : "ltr"}
            className="bg-white border border-slate-200 rounded-3xl max-w-6xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
          >
            {/* Modal Top Header */}
            <div className="px-6 py-4 bg-slate-950 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-400 flex items-center justify-center text-lg shadow-xs">
                  🎬
                </span>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-white">
                    {isHe
                      ? "מרכז הדרכות וידאו, Onboarding ופורטלים לכל סוגי המשתמשים"
                      : "FoodXchange Role Academy, Video Walkthroughs & Portal Switcher"}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {isHe
                      ? "בחר תפקיד כדי לצפות בסרטון ההדרכה או להיכנס ישירות לפורטל ולמסך ה-Onboarding שלו"
                      : "Watch interactive workflow videos or jump directly into Buyer, Supplier, Agent, Customs Broker, and Admin portals"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Tab Switcher */}
                <div className="inline-flex rounded-xl bg-slate-900 p-1 border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setActiveTab("roles")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      activeTab === "roles"
                        ? "bg-orange-500 text-white"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    🧭 {isHe ? "5 תפקידי מערכת ופורטלים" : "All 5 User Roles & Portals"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("videos")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      activeTab === "videos"
                        ? "bg-orange-500 text-white"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    ▶ {isHe ? "6 סרטוני הדרכה אינטראקטיביים" : "6 Interactive Video Walkthroughs"}
                  </button>
                </div>

                {/* Language Toggle */}
                <button
                  type="button"
                  onClick={() => setLang(isHe ? "en" : "he")}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 cursor-pointer"
                >
                  {isHe ? "🇺🇸 EN" : "🇮🇱 עב"}
                </button>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-sm font-bold cursor-pointer"
                  title="Close"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 bg-slate-50 flex-1">
              {activeTab === "roles" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {ROLE_CARDS.map((role) => (
                    <div
                      key={role.id}
                      className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs flex flex-col justify-between hover:border-orange-300 transition"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className="text-2xl">{role.icon}</span>
                          <span
                            className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${role.badgeColor}`}
                          >
                            {role.badge}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900 mb-1.5">
                          {isHe ? role.titleHe : role.titleEn}
                        </h3>
                        <p className="text-xs text-slate-600 leading-relaxed mb-4">
                          {isHe ? role.descHe : role.descEn}
                        </p>
                      </div>

                      <div className="space-y-2 pt-3 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => openVideoForRole(role.videoTrackId)}
                          className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
                        >
                          <span>▶</span>
                          <span>
                            {isHe
                              ? "צפה בסרטון ההדרכה לתפקיד זה"
                              : "Watch Interactive Role Video"}
                          </span>
                        </button>

                        <div className="grid grid-cols-1 gap-1.5">
                          {role.links.map((lnk, i) => (
                            <Link
                              key={i}
                              href={lnk.href}
                              onClick={() => setIsOpen(false)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition ${
                                lnk.primary
                                  ? "bg-orange-50 text-orange-800 border border-orange-200 hover:bg-orange-100"
                                  : "bg-slate-50 text-slate-700 border border-slate-200/80 hover:bg-slate-100"
                              }`}
                            >
                              <span>{isHe ? lnk.labelHe : lnk.labelEn}</span>
                              <span className="text-[10px] opacity-60">↗</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <WorkflowVideoPlayer
                    key={`${selectedVideoId}-${lang}`}
                    lang={lang}
                    initialVideoId={selectedVideoId}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
