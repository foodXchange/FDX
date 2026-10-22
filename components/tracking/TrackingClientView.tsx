"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type {
  TrackedSampleKit,
  TrackedCommercialRequest,
  TrackingLookupResponse,
} from "@/app/api/track/lookup/route";
import SampleTrackingTimeline from "./SampleTrackingTimeline";
import SensoryScorecardSection from "./SensoryScorecardSection";

interface TrackingClientViewProps {
  initialQuery?: string;
  lang?: "he" | "en";
}

const COUNTRY_FLAGS: Record<string, string> = {
  Italy: "🇮🇹",
  Spain: "🇪🇸",
  Greece: "🇬🇷",
  Poland: "🇵🇱",
  Netherlands: "🇳🇱",
  France: "🇫🇷",
  Germany: "🇩🇪",
  Turkey: "🇹🇷",
  Israel: "🇮🇱",
};

export default function TrackingClientView({
  initialQuery = "",
  lang = "he",
}: TrackingClientViewProps) {
  const isHe = lang === "he";
  const router = useRouter();
  const searchParams = useSearchParams();

  const [queryInput, setQueryInput] = useState<string>(initialQuery);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<TrackedSampleKit | TrackedCommercialRequest | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const performLookup = async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/track/lookup?q=${encodeURIComponent(trimmed)}`);
      const data: TrackingLookupResponse = await res.json();

      if (data.found) {
        setResult(data.data);
      } else {
        setResult(null);
        setErrorMessage(
          isHe
            ? data.message || "לא נמצא משלוח או בקשת רכש תואמת לקוד זה. אנא בדקו את המספר ונסו שוב."
            : data.message || "No shipment found matching this reference. Please check and retry."
        );
      }
    } catch (err) {
      console.error("Lookup error:", err);
      setErrorMessage(
        isHe
          ? "שגיאת תקשורת בבדיקת המשלוח. אנא נסו שוב."
          : "Network error performing tracking lookup."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const urlQuery = searchParams.get("code") || searchParams.get("q") || searchParams.get("query") || initialQuery;
    if (urlQuery) {
      setQueryInput(urlQuery);
      performLookup(urlQuery);
    }
  }, [searchParams, initialQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryInput.trim()) return;

    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set("code", queryInput.trim());
    router.replace(currentUrl.pathname + currentUrl.search);
    performLookup(queryInput);
  };

  const handleDemoClick = () => {
    setQueryInput("FDX-SMP-DEMO88");
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set("code", "FDX-SMP-DEMO88");
    router.replace(currentUrl.pathname + currentUrl.search);
    performLookup("FDX-SMP-DEMO88");
  };

  const generateWhatsAppInquiry = (kit: TrackedSampleKit) => {
    const text = isHe
      ? `שלום אודי, רציתי לברר לגבי סטטוס ערכת הדוגמאות שלי:
📦 מספר מעקב: ${kit.tracking_code}
🏢 רשת / חברה: ${kit.company}
${kit.tracking_awb ? `✈️ שטר מטען: ${kit.tracking_awb}` : ""}
אשמח לדעת מתי צפויה המסירה לשולחן הטעימות.`
      : `Hi Udi, following up on our Tasting Sample Kit:
📦 Tracking Code: ${kit.tracking_code}
🏢 Retailer: ${kit.company}
${kit.tracking_awb ? `✈️ AWB: ${kit.tracking_awb}` : ""}
Looking forward to the expected delivery update.`;
    return encodeURIComponent(text);
  };

  return (
    <div dir={isHe ? "rtl" : "ltr"} className="min-h-screen bg-slate-950 text-slate-100">
      {/* Hero Header */}
      <div className="relative border-b border-slate-800 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 pt-10 pb-12 sm:pt-16 sm:pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold">
            <span>🚚</span>
            <span>{isHe ? "פורטל מעקב לוגיסטי ואיתור דוגמאות" : "Live B2B Logistics & Sample Portal"}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            {isHe ? "מעקב שילוח דוגמאות ומכולות בזמן אמת" : "Live Sample & Order Tracking"}
          </h1>

          <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            {isHe
              ? "הזינו את מספר המעקב של ערכת הטעימות (FDX-SMP-XXXXX), מספר שטר מטען DHL או מספר טלפון, וקבלו ציר זמן חי של הדוגמאות מאירופה לשולחן הטעימות ברשת."
              : "Enter your Tasting Kit Reference (FDX-SMP-XXXXX), DHL AWB, or contact phone to track European samples direct to your tasting table."}
          </p>

          {/* Search Box */}
          <div className="pt-4 max-w-2xl mx-auto">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <input
                type="text"
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                placeholder={
                  isHe
                    ? "הזן מספר מעקב (למשל: FDX-SMP-DEMO88 / שטר מטען / טלפון)..."
                    : "Enter tracking code (e.g. FDX-SMP-DEMO88 / DHL AWB / phone)..."
                }
                className="w-full bg-slate-900/95 border-2 border-slate-700 focus:border-orange-500 rounded-2xl py-4 pr-12 pl-32 text-sm sm:text-base text-white placeholder-slate-500 outline-none transition shadow-2xl"
              />

              <span className="absolute right-4 text-slate-400 text-lg">🔍</span>

              <button
                type="submit"
                disabled={isLoading}
                className="absolute left-2 top-2 bottom-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 text-white font-bold text-xs sm:text-sm px-5 rounded-xl transition flex items-center gap-1.5 shadow-md shadow-orange-950/30"
              >
                {isLoading ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>{isHe ? "אתר משלוח" : "Track"}</span>
                )}
              </button>
            </form>

            {/* Quick Demo Shortcut Pill */}
            <div className="flex items-center justify-center gap-2 pt-3 text-xs text-slate-400">
              <span>{isHe ? "רוצים לראות איך זה נראה?" : "Want to see how it works?"}</span>
              <button
                type="button"
                onClick={handleDemoClick}
                className="text-amber-400 hover:text-amber-300 font-mono font-bold underline transition"
              >
                {isHe ? "נסו דוגמה חיה: FDX-SMP-DEMO88 ←" : "Try live demo: FDX-SMP-DEMO88 ←"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto px-4 py-10 space-y-10">
        {/* Error / Not Found Message */}
        {errorMessage && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center space-y-2 animate-in fade-in duration-200">
            <span className="text-3xl block">⚠️</span>
            <h3 className="text-base font-bold text-red-400">{errorMessage}</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              {isHe
                ? "וודאו שהקשתם את מספר המעקב במדויק. אם קיבלתם הודעה ב-WhatsApp, מספר המעקב מופיע בראש ההודעה."
                : "Double check your reference number. If you received a WhatsApp confirmation, your tracking code is in the message header."}
            </p>
          </div>
        )}

        {/* Loading Spinner */}
        {isLoading && (
          <div className="py-20 text-center space-y-4">
            <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-slate-400">
              {isHe ? "מאתר נתוני משלוח מול שרתי הלוגיסטיקה..." : "Querying live logistics feeds..."}
            </p>
          </div>
        )}

        {/* SAMPLE KIT RESULT VIEW */}
        {result && result.type === "sample_kit" && (
          <div className="space-y-10 animate-in fade-in duration-300">
            {/* 1. Visual Progress Timeline */}
            <SampleTrackingTimeline kit={result} lang={lang} />

            {/* 2. Products in Box Grid */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📦</span>
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-white">
                      {isHe ? "מוצרים הכלולים בערכת הטעימות" : "Items in Tasting Sample Box"}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {isHe
                        ? `${result.items.length} דוגמאות נאספו ממפעלי יצרן מובילים באירופה`
                        : `${result.items.length} European factory sample formats`}
                    </p>
                  </div>
                </div>

                <span className="text-xs font-mono font-bold text-amber-400 bg-amber-400/10 px-3 py-1 rounded-xl">
                  {result.items.length} {isHe ? "מוצרים" : "Items"}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.items.map((item, idx) => {
                  const flag = item.country_of_origin
                    ? COUNTRY_FLAGS[item.country_of_origin] || "🇪🇺"
                    : "🇪🇺";

                  return (
                    <div
                      key={item.id || idx}
                      className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex gap-4 items-center hover:border-slate-700 transition"
                    >
                      {/* Thumbnail */}
                      <div className="w-16 h-16 rounded-xl bg-slate-900 border border-slate-800 shrink-0 overflow-hidden relative flex items-center justify-center">
                        {item.sample_image_url ? (
                          <Image
                            src={item.sample_image_url}
                            alt={item.product_name}
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        ) : (
                          <span className="text-2xl">🥫</span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">{flag}</span>
                          <span className="text-[11px] text-slate-400 truncate">
                            {item.supplier_name || "European Certified Producer"}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white truncate" title={item.product_name}>
                          {item.product_name}
                        </h4>
                        <p className="text-xs text-amber-400/90 font-mono truncate">
                          {item.sample_format || (isHe ? "דוגמת יחידת מדף" : "Retail Unit Sample")}
                        </p>
                      </div>

                      {/* Action to view spec */}
                      <div className="shrink-0">
                        <Link
                          href={isHe ? `/he/products` : `/en/products`}
                          className="text-xs text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 px-3 py-2 rounded-xl transition inline-flex items-center gap-1"
                        >
                          <span>{isHe ? "מפרט" : "Spec"}</span>
                          <span>←</span>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. Sensory Scorecard Section */}
            <SensoryScorecardSection
              kit={result}
              lang={lang}
              onFeedbackSubmitted={() => performLookup(result.tracking_code)}
            />

            {/* 4. Direct WhatsApp Deal Desk Concierge */}
            <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-900/40 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="space-y-2 text-center sm:text-right">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold">
                  <span>💬</span>
                  <span>{isHe ? "קשר ישיר עם מנהל התיק" : "Dedicated Deal Desk Manager"}</span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white">
                  {isHe
                    ? "רוצים לוודא מועדי טיסה או לתאם טעימה בהנהלה?"
                    : "Need expedited flight coordination or custom tasting specs?"}
                </h3>
                <p className="text-xs text-slate-400 max-w-lg">
                  {isHe
                    ? "צוות הדסק הלוגיסטי של FoodXchange זמין עבורכם לסנכרון שטר מטען, תעודות כשרות ודרישות מעבדה מיוחדות."
                    : "The FoodXchange operations team is on standby to coordinate direct flight manifests and lab certificates."}
                </p>
              </div>

              <a
                href={`https://wa.me/972525222291?text=${generateWhatsAppInquiry(result)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm py-3.5 px-6 rounded-2xl transition shadow-xl shadow-emerald-950/40 shrink-0 inline-flex items-center gap-2"
              >
                <span>💬</span>
                <span>{isHe ? "פנייה ישירה בווטסאפ לאודי" : "Chat with Udi on WhatsApp"}</span>
              </a>
            </div>
          </div>
        )}

        {/* COMMERCIAL REQUEST RESULT VIEW */}
        {result && result.type === "commercial_request" && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6 text-center animate-in fade-in duration-300">
            <div className="w-16 h-16 rounded-2xl bg-orange-500/20 text-orange-400 text-3xl flex items-center justify-center mx-auto">
              🚢
            </div>

            <div className="space-y-2">
              <span className="text-xs font-mono uppercase tracking-wider text-orange-400">
                {isHe ? "פרויקט רכש ומכולות יבוא" : "Commercial Container Sourcing Project"}
              </span>
              <h3 className="text-2xl font-black text-white">{result.product_name}</h3>
              <p className="text-sm text-slate-400 max-w-md mx-auto">
                {isHe
                  ? `הפרויקט מנוהל עבור ${result.company}. סטטוס נוכחי: ${result.status}`
                  : `Project managed for ${result.company}. Current status: ${result.status}`}
              </p>
            </div>

            <div className="pt-2">
              <Link
                href={result.portal_url}
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs sm:text-sm py-3.5 px-8 rounded-xl transition inline-flex items-center gap-2 shadow-lg shadow-orange-950/30"
              >
                <span>{isHe ? "כניסה לפורטל הרכש והמכולות המלא" : "Open Commercial Project Portal"}</span>
                <span>←</span>
              </Link>
            </div>
          </div>
        )}

        {/* NO RESULT / DEFAULT LANDING VIEW: FAQ & Logistics Guide */}
        {!result && !isLoading && !errorMessage && (
          <div className="space-y-8 pt-4">
            <div className="text-center space-y-2">
              <h3 className="text-xl sm:text-2xl font-bold text-white">
                {isHe ? "כיצד פועל שילוח הדוגמאות המהיר ב-FoodXchange?" : "How Sample Dispatch Works"}
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
                {isHe
                  ? "אנו מגשרים בין מפעלי המזון המובילים באירופה לבין שולחן הטעימות של רשתות השיווק בישראל במסלול אקספרס מבוקר."
                  : "We streamline factory-fresh sample dispatch from European production lines directly to Israeli retail tasting tables."}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-400 text-xl flex items-center justify-center font-bold">
                  ✈️
                </div>
                <h4 className="text-base font-bold text-white">
                  {isHe ? "48-72 שעות באוויר" : "48-72h Air Transit"}
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {isHe
                    ? "איסוף דוגמאות ישירות ממפעלי איטליה, ספרד וגרמניה, וטיסה ישירה במטוס בלדרות לנתב״ג ללא עיכובים מיותרים."
                    : "Direct factory pickup across Italy, Spain, and Germany via air couriers straight to TLV airport."}
                </p>
              </div>

              <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 text-xl flex items-center justify-center font-bold">
                  🛃
                </div>
                <h4 className="text-base font-bold text-white">
                  {isHe ? "בקרת מכס והסגר" : "Quarantine & Customs"}
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {isHe
                    ? "שחרור מסודר במסלול דוגמאות מסחריות מול משרד הבריאות והרבנות הראשית, בליווי תעודות אנליזה רשמיות."
                    : "Seamless customs clearance for commercial tasting samples compliant with Israeli import protocols."}
                </p>
              </div>

              <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 text-xl flex items-center justify-center font-bold">
                  ⭐️
                </div>
                <h4 className="text-base font-bold text-white">
                  {isHe ? "משוב טעימות דיגיטלי" : "Digital Tasting Feedback"}
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {isHe
                    ? "מיד עם המסירה, הקניין מדרג את המוצר ב-4 ממדים ומקבל הצעת מחיר מסחרית למכולה מול תנאי המפעל."
                    : "Immediate 4-dimension organoleptic evaluation transitioning directly into commercial container terms."}
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
