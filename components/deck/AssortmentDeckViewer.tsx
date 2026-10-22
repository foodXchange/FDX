"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { CallSchedulerModal } from "@/components/contact/CallSchedulerModal";

export interface FactoryItem {
  company_name: string;
  country: string;
  flag: string;
  region?: string;
  product_name: string;
  format?: string;
  certifications: string[];
  kosher_type: string;
  indicative_price?: string;
  moq?: string;
  lead_time?: string;
  image_url?: string;
  specs: string[];
}

export interface DeckData {
  token: string;
  title: string;
  buyer_name: string;
  buyer_company?: string;
  category: string;
  personal_note?: string;
  factories: FactoryItem[];
  pdfUrl: string;
}

interface Props {
  deck: DeckData;
  initialLang?: "en" | "he";
}

export function AssortmentDeckViewer({ deck, initialLang = "en" }: Props) {
  const [lang, setLang] = useState<"en" | "he">(initialLang);
  const isHe = lang === "he";

  function switchLang(newLang: "en" | "he") {
    setLang(newLang);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (newLang === "he") {
        url.searchParams.set("lang", "he");
      } else {
        url.searchParams.delete("lang");
      }
      window.history.replaceState({}, "", url.toString());
    }
  }

  const [activeFactoryIdx, setActiveFactoryIdx] = useState(0);
  const [viewMode, setViewMode] = useState<"showcase" | "matrix">("showcase");
  const [schedulerOpen, setSchedulerOpen] = useState(false);
  const [sampleModalOpen, setSampleModalOpen] = useState(false);

  // Sample form state
  const [sampleRecipient, setSampleRecipient] = useState(deck.buyer_name);
  const [sampleCompany, setSampleCompany] = useState(deck.buyer_company || "");
  const [sampleAddress, setSampleAddress] = useState("");
  const [samplePhone, setSamplePhone] = useState("");
  const [sampleNotes, setSampleNotes] = useState("");
  const [sampleSubmitting, setSampleSubmitting] = useState(false);
  const [sampleSuccess, setSampleSuccess] = useState(false);

  // Track page view
  useEffect(() => {
    fetch("/api/proposals/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: deck.token,
        event_type: "page_view",
      }),
    }).catch(() => {});
  }, [deck.token]);

  const activeFactory = deck.factories[activeFactoryIdx] || deck.factories[0];

  async function handleSampleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sampleRecipient.trim() || !sampleAddress.trim() || !samplePhone.trim()) return;

    setSampleSubmitting(true);
    try {
      const res = await fetch("/api/card/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handle: "udi",
          name: sampleRecipient.trim(),
          contact: samplePhone.trim(),
          company: sampleCompany.trim(),
          product_name: `[Tasting Samples Request] ${activeFactory?.company_name} - ${activeFactory?.product_name}`,
          volume_per_year: "Sample Kit",
          kosher_type: activeFactory?.kosher_type || "Rabbinate",
          notes: `Delivery Address in Israel: ${sampleAddress.trim()}.\nNotes: ${sampleNotes.trim()}\nDeck Token: ${deck.token}`,
        }),
      });
      if (!res.ok) throw new Error("Sample request submission failed");
      setSampleSuccess(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error submitting sample request");
    } finally {
      setSampleSubmitting(false);
    }
  }

  const waHref = `https://wa.me/972525222291?text=${encodeURIComponent(
    isHe
      ? `שלום אודי, אני מעיין במצגת הספקים מאירופה "${deck.title}". אשמח לשוחח על אפשרות ${activeFactoryIdx + 1} (${activeFactory?.company_name}).`
      : `Hi Udi, reviewing your European Assortment Deck for "${deck.title}". Let's discuss option ${activeFactoryIdx + 1} (${activeFactory?.company_name}).`
  )}`;

  return (
    <div dir={isHe ? "rtl" : "ltr"} className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col ${isHe ? "font-sans" : ""}`}>
      {/* ── Top Bar ── */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-[#F47920] flex items-center justify-center font-black text-sm">
            FDX
          </div>
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold tracking-wider text-orange-400 block">
              {isHe ? "מצגת בחירת מפעלים מאירופה · סודי ומסחרי" : "Confidential Assortment Deck"}
            </span>
            <h1 className="text-sm sm:text-base font-bold text-white truncate">
              {deck.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Bilingual Switcher */}
          <div className="flex rounded-xl border border-white/10 bg-slate-800 p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => switchLang("en")}
              className={`rounded-lg px-2.5 py-1 transition ${
                !isHe ? "bg-orange-500 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => switchLang("he")}
              className={`rounded-lg px-2.5 py-1 transition ${
                isHe ? "bg-orange-500 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              עב
            </button>
          </div>

          <a
            href={isHe ? `${deck.pdfUrl}?lang=he` : deck.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
          >
            <span>📥</span>
            <span>{isHe ? "הורדת מצגת PDF" : "Download PDF"}</span>
          </a>

          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#1DA851] hover:bg-[#189a47] text-white text-xs font-bold transition-colors shadow-md shadow-emerald-600/20"
          >
            <span>💬</span>
            <span className="hidden sm:inline">{isHe ? "שיחה עם אודי בווטסאפ" : "WhatsApp Udi"}</span>
            <span className="sm:hidden">WhatsApp</span>
          </a>
        </div>
      </header>

      {/* ── Main Workspace ── */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-6">
        {/* Recipient Dedication Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800/80 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20 uppercase tracking-wider">
                {deck.category}
              </span>
              <span className="text-xs text-slate-400">
                {isHe ? "הוכן באופן בלעדי עבור:" : "Prepared exclusively for:"}{" "}
                <strong className="text-white">{deck.buyer_company || deck.buyer_name}</strong>
              </span>
            </div>
            {deck.personal_note && (
              <p className="text-xs text-slate-300 italic pt-1 max-w-2xl leading-relaxed">
                &ldquo;{deck.personal_note}&rdquo;
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setViewMode("showcase")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                viewMode === "showcase"
                  ? "bg-[#F47920] text-white shadow-xs"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {isHe ? "סקירת מפעלים" : "Factory Showcase"}
            </button>
            <button
              onClick={() => setViewMode("matrix")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                viewMode === "matrix"
                  ? "bg-[#F47920] text-white shadow-xs"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {isHe ? "טבלת השוואה" : "Comparison Matrix"}
            </button>
          </div>
        </div>

        {viewMode === "showcase" ? (
          <div className="space-y-6">
            {/* Factory Selector Strip */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {deck.factories.map((f, i) => (
                <button
                  key={i}
                  onClick={() => setActiveFactoryIdx(i)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-2xl border text-start transition-all shrink-0 ${
                    activeFactoryIdx === i
                      ? "bg-slate-900 border-[#F47920] text-white shadow-lg shadow-orange-500/10 ring-1 ring-[#F47920]"
                      : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                  }`}
                >
                  <span className="text-lg">{f.flag}</span>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>{f.company_name}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 truncate max-w-[180px]">
                      {f.product_name}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Active Factory Showcase Card */}
            {activeFactory && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  {/* Left Column: Factory Details */}
                  <div className="lg:col-span-7 space-y-6">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">
                          {activeFactory.flag} {activeFactory.country}
                          {activeFactory.region ? ` · ${activeFactory.region}` : ""}
                        </span>
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                        <span className="text-xs text-slate-400">
                          {isHe ? "מפעל אירופאי מאומת ומבוקר" : "Verified European Manufacturer"}
                        </span>
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                        {activeFactory.company_name}
                      </h2>
                      <p className="text-base text-slate-300 font-semibold mt-1">
                        {activeFactory.product_name}
                      </p>
                    </div>

                    {/* Commercial Economics Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3.5">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase block mb-1">
                          {isHe ? "מחיר יעד CIF חיפה/אשדוד" : "Target CIF Haifa"}
                        </span>
                        <span className="text-sm font-bold text-emerald-400">
                          {activeFactory.indicative_price || (isHe ? "הצעת מחיר לפי מכולה" : "Quoted per container")}
                        </span>
                      </div>
                      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3.5">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase block mb-1">
                          {isHe ? "כמות מינימום (MOQ)" : "Minimum Order (MOQ)"}
                        </span>
                        <span className="text-sm font-bold text-white">
                          {activeFactory.moq || (isHe ? "מכולה 20/40 רגל" : "1 x 20ft / 40ft FCL")}
                        </span>
                      </div>
                      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3.5">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase block mb-1">
                          {isHe ? "זמן אספקה וייצור" : "Production Lead Time"}
                        </span>
                        <span className="text-sm font-bold text-white">
                          {activeFactory.lead_time || (isHe ? "3–4 שבועות" : "3 to 4 weeks")}
                        </span>
                      </div>
                      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3.5">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase block mb-1">
                          {isHe ? "תצורת אריזה ומיתוג" : "Packaging Format"}
                        </span>
                        <span className="text-sm font-bold text-white truncate block">
                          {activeFactory.format || (isHe ? "קמעונאי / מותג פרטי" : "Retail / Private Label")}
                        </span>
                      </div>
                    </div>

                    {/* Food Safety & Kosher Compliance */}
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 space-y-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-amber-300 uppercase tracking-wide">
                          {isHe ? "🛡️ תקני איכות ובטיחות מזון:" : "🛡️ Food Safety & Quality Certifications:"}
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {activeFactory.certifications.length > 0 ? (
                            activeFactory.certifications.map((c) => (
                              <span
                                key={c}
                                className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-semibold"
                              >
                                {c}
                              </span>
                            ))
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-semibold">
                              IFS / BRC
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-xs text-amber-200/90 leading-relaxed">
                        <strong className="text-amber-300">
                          {isHe ? "✡ נתיב כשרות מותאם ליבוא לישראל:" : "✡ Kosher Supervision Feasibility:"}
                        </strong>{" "}
                        {activeFactory.kosher_type} &middot;{" "}
                        {isHe
                          ? "נתיב פיקוח רבני מאומת לשחרור מכס בישראל (אישור מחלקת יבוא ברה״ר לישראל)."
                          : "Verified rabbinical inspection path for Israeli import clearance (אישור הרה״ר)."}
                      </div>
                    </div>

                    {/* Technical Specs & Highlights */}
                    {activeFactory.specs.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                          {isHe ? "מפרט טכני ודגשי איכות:" : "Technical Specifications & Quality Notes:"}
                        </span>
                        <ul className="space-y-1.5">
                          {activeFactory.specs.map((s, idx) => (
                            <li key={idx} className="flex items-center gap-2 text-xs text-slate-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#F47920] shrink-0" />
                              <span>{s}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Visual Packshot & Action Center */}
                  <div className="lg:col-span-5 flex flex-col justify-between bg-slate-950/60 border border-slate-800 rounded-2xl p-6 text-center space-y-5">
                    <div className="flex items-center justify-center min-h-[220px]">
                      {activeFactory.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={activeFactory.image_url}
                          alt={activeFactory.product_name}
                          className="max-h-[220px] max-w-full object-contain rounded-xl shadow-lg"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center p-8 bg-slate-900 rounded-2xl border border-slate-800 w-full">
                          <span className="text-5xl mb-2">📦</span>
                          <span className="text-xs font-bold text-white">
                            {activeFactory.product_name}
                          </span>
                          <span className="text-[11px] text-slate-400 mt-0.5">
                            {activeFactory.country} &middot; {isHe ? "מותג פרטי" : "Private Label"}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Buyer Fast-Action Buttons */}
                    <div className="space-y-2.5 pt-2">
                      <button
                        onClick={() => {
                          setSampleSuccess(false);
                          setSampleModalOpen(true);
                        }}
                        className="w-full bg-[#F47920] hover:bg-[#d96810] text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors shadow-lg shadow-orange-500/25"
                      >
                        <span>📦</span>
                        <span>
                          {isHe
                            ? "הזמנת ערכת דוגמאות לטעימה (DHL אקספרס)"
                            : "Request Tasting Sample Kit (DHL Express)"}
                        </span>
                      </button>

                      <button
                        onClick={() => setSchedulerOpen(true)}
                        className="w-full bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors shadow-md shadow-sky-600/20"
                      >
                        <span>📅</span>
                        <span>
                          {isHe
                            ? "תיאום שיחת וידאו עם אודי (15 דקות)"
                            : "Book 15-Min Sourcing Review with Udi"}
                        </span>
                      </button>

                      <a
                        href={isHe ? `${deck.pdfUrl}?lang=he` : deck.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <span>📥</span>
                        <span>
                          {isHe
                            ? "הורדת מצגת PDF מלאה בעברית"
                            : "Download Complete PDF Presentation"}
                        </span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Matrix Comparison View */
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-x-auto">
            <h2 className="text-lg font-bold text-white mb-1">
              {isHe ? "טבלת השוואה מסחרית בין המפעלים" : "Commercial Comparison Matrix"}
            </h2>
            <p className="text-xs text-slate-400 mb-5">
              {isHe
                ? "השוואת נתונים זה לצד זה: מדינת מקור, תקני איכות בינלאומיים, כשרות, ומחירי CIF."
                : "Side-by-side comparison of candidate European plants, certifications, kosher feasibility, and CIF economics."}
            </p>

            <table className="w-full text-xs text-start">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                  <th className="py-3 px-3 text-start">{isHe ? "מפעל / יצרן" : "Factory / Plant"}</th>
                  <th className="py-3 px-3 text-start">{isHe ? "מקור" : "Origin"}</th>
                  <th className="py-3 px-3 text-start">{isHe ? "מוצר / תצורה" : "Product / Format"}</th>
                  <th className="py-3 px-3 text-start">{isHe ? "תקני איכות" : "Certifications"}</th>
                  <th className="py-3 px-3 text-start">{isHe ? "כשרות" : "Kosher Path"}</th>
                  <th className="py-3 px-3 text-start">{isHe ? "מחיר CIF" : "Target CIF Haifa"}</th>
                  <th className="py-3 px-3 text-start">{isHe ? "כמות מינימום" : "MOQ"}</th>
                  <th className="py-3 px-3 text-start">{isHe ? "פעולה" : "Action"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {deck.factories.map((f, i) => (
                  <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 font-bold text-white whitespace-nowrap">
                      {f.company_name}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      {f.flag} {f.country}
                    </td>
                    <td className="py-3 px-3 text-orange-300 font-medium">{f.product_name}</td>
                    <td className="py-3 px-3">
                      <div className="flex flex-wrap gap-1">
                        {f.certifications.map((c) => (
                          <span
                            key={c}
                            className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-semibold"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-amber-300 font-medium">{f.kosher_type}</td>
                    <td className="py-3 px-3 font-bold text-emerald-400">
                      {f.indicative_price || (isHe ? "לפי פנייה" : "Inquire")}
                    </td>
                    <td className="py-3 px-3 text-slate-400">
                      {f.moq || (isHe ? "מכולה 1" : "1 FCL")}
                    </td>
                    <td className="py-3 px-3">
                      <button
                        onClick={() => {
                          setActiveFactoryIdx(i);
                          setViewMode("showcase");
                        }}
                        className="text-xs font-semibold text-[#F47920] hover:underline"
                      >
                        {isHe ? "סקירה מעמיקה ←" : "Deep Dive →"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500 space-y-1">
        <p>
          {isHe
            ? "FoodXchange · תל אביב · מחברים יצרני מזון אירופאיים עם רשתות השיווק בישראל"
            : "FoodXchange · Tel Aviv · Connecting European Manufacturers with Israeli Retail"}
        </p>
        <p>Contact: udi@fdx.trading &middot; +972-52-522-2291</p>
      </footer>

      {/* ── Call Scheduler Modal ── */}
      <CallSchedulerModal
        isOpen={schedulerOpen}
        onClose={() => setSchedulerOpen(false)}
        cardHandle="udi"
        lang={lang}
      />

      {/* ── Sample Request Modal ── */}
      {sampleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div
            className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xl">📦</span>
                <h3 className="font-bold text-sm">
                  {isHe
                    ? "הזמנת דוגמאות לטעימה ומבחן מדף (DHL אקספרס)"
                    : "Order Tasting Samples (DHL Express)"}
                </h3>
              </div>
              <button
                onClick={() => setSampleModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {sampleSuccess ? (
              <div className="text-center py-6 space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto text-xl font-bold">
                  ✓
                </div>
                <h4 className="font-bold text-base">
                  {isHe ? "בקשת הדוגמאות הועברה בהצלחה!" : "Sample Request Dispatched!"}
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {isHe
                    ? `אודי וצוות FoodXchange קיבלו את הבקשה. נתאם את המשלוח האווירי ישירות מול ${activeFactory?.company_name} ונעדכן אתכם במספר מעקב (AWB).`
                    : `Udi and the FoodXchange team have received your dispatch request. We will coordinate airfreight shipping with ${activeFactory?.company_name} and notify you with tracking details.`}
                </p>
                <button
                  onClick={() => setSampleModalOpen(false)}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white font-medium py-2 rounded-xl text-xs transition-colors"
                >
                  {isHe ? "סגור" : "Close"}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSampleSubmit} className="space-y-3 text-xs">
                <p className="text-slate-400 text-[11px]">
                  {isHe
                    ? `הדוגמאות נשלחות ישירות מהמפעל ב-${activeFactory?.company_name} (${activeFactory?.country}) למשרדי הרשת או למטבח הבדיקה בישראל.`
                    : `Samples are shipped directly from ${activeFactory?.company_name} (${activeFactory?.country}) to your office or test kitchen in Israel.`}
                </p>

                <div>
                  <label className="block text-slate-400 mb-1">
                    {isHe ? "שם איש קשר / קניין *" : "Contact / Recipient Name *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={sampleRecipient}
                    onChange={(e) => setSampleRecipient(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-[#F47920]"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">
                    {isHe ? "שם הרשת / החברה" : "Company / Retailer"}
                  </label>
                  <input
                    type="text"
                    value={sampleCompany}
                    onChange={(e) => setSampleCompany(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-[#F47920]"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">
                    {isHe ? "כתובת למשלוח בישראל (רחוב, עיר, מיקוד) *" : "Delivery Address in Israel *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={sampleAddress}
                    onChange={(e) => setSampleAddress(e.target.value)}
                    placeholder={isHe ? "רחוב, מספר, עיר, מיקוד" : "Street, City, Postal Code"}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-[#F47920]"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">
                    {isHe ? "טלפון / ווטסאפ (לתיאום עם השליח) *" : "Phone / WhatsApp (for Courier Delivery) *"}
                  </label>
                  <input
                    type="tel"
                    required
                    value={samplePhone}
                    onChange={(e) => setSamplePhone(e.target.value)}
                    placeholder="+972-50-..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-[#F47920]"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">
                    {isHe ? "דגשים לבדיקת טעימה או אריזה (אופציונלי)" : "Sensory / Packaging Notes (Optional)"}
                  </label>
                  <input
                    type="text"
                    value={sampleNotes}
                    onChange={(e) => setSampleNotes(e.target.value)}
                    placeholder={
                      isHe
                        ? "לדוגמה: לכלול דוגמאות בבקבוק זכוכית 750 מ״ל וגם 1 ליטר פלסטיק"
                        : "e.g. Include both 750ml glass and 1L PET samples"
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-[#F47920]"
                  />
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSampleModalOpen(false)}
                    className="w-1/3 py-2 bg-slate-800 text-slate-400 rounded-xl hover:bg-slate-700"
                  >
                    {isHe ? "ביטול" : "Cancel"}
                  </button>
                  <button
                    type="submit"
                    disabled={sampleSubmitting}
                    className="w-2/3 py-2 bg-[#F47920] hover:bg-[#d96810] text-white font-bold rounded-xl disabled:opacity-50"
                  >
                    {sampleSubmitting
                      ? isHe
                        ? "שולח בקשה..."
                        : "Dispatching..."
                      : isHe
                      ? "אישור והזמנת דוגמאות"
                      : "Confirm Sample Request"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
