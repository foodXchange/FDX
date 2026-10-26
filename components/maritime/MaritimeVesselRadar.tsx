"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import TourGuide, { TourStep } from "@/components/tour/TourGuide";
import {
  type AisVesselRecord,
  LIVE_VESSELS_DATABASE,
  ASHDOD_PORT_TELEMETRY,
} from "@/lib/maritime/vesselTracker";

interface Props {
  initialVesselId?: string;
  lang?: "he" | "en";
}

export default function MaritimeVesselRadar({
  initialVesselId = "msc_leanne",
  lang = "en",
}: Props) {
  const [currentLang, setCurrentLang] = useState<"he" | "en">(lang);
  const isHe = currentLang === "he";

  // Sync with localStorage or URL query params on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const urlLang = sp.get("lang") || sp.get("locale");
      if (urlLang === "he" || urlLang === "en") {
        setCurrentLang(urlLang);
        return;
      }
      const saved = localStorage.getItem("fdx_admin_locale");
      if (saved === "he" || saved === "en") {
        setCurrentLang(saved);
      }
    }
  }, []);

  // Listen to global admin_locale_change events
  useEffect(() => {
    const handleGlobal = (e: Event) => {
      const ce = e as CustomEvent<"he" | "en">;
      if (ce.detail === "he" || ce.detail === "en") {
        setCurrentLang(ce.detail);
      }
    };
    window.addEventListener("admin_locale_change", handleGlobal);
    return () => window.removeEventListener("admin_locale_change", handleGlobal);
  }, []);

  const handleToggleLang = (newLoc: "he" | "en") => {
    setCurrentLang(newLoc);
    try {
      localStorage.setItem("fdx_admin_locale", newLoc);
      document.cookie = `fdx_admin_locale=${newLoc}; path=/; max-age=31536000`;
      window.dispatchEvent(new CustomEvent("admin_locale_change", { detail: newLoc }));
    } catch {}
  };

  // Selected vessel
  const [selectedVesselId, setSelectedVesselId] = useState<string>(initialVesselId);
  const [vessel, setVessel] = useState<AisVesselRecord>(
    LIVE_VESSELS_DATABASE[initialVesselId] || LIVE_VESSELS_DATABASE.msc_leanne
  );

  // 12NM Boundary crossing simulation state
  const [isSimulating12Nm, setIsSimulating12Nm] = useState(false);
  const [triggerLog, setTriggerLog] = useState<string[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Real-time radar ping animation counter
  const [radarSweepAngle, setRadarSweepAngle] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setRadarSweepAngle((prev) => (prev + 3) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Handle vessel change
  const handleSelectVessel = (id: string) => {
    setSelectedVesselId(id);
    const v = LIVE_VESSELS_DATABASE[id];
    if (v) {
      setVessel({ ...v });
      setTriggerLog([]);
      setIsSimulating12Nm(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  // Simulate 12NM Territorial Waters Trigger
  const handleSimulate12NmTrigger = () => {
    setIsSimulating12Nm(true);
    const nowTime = new Date().toLocaleTimeString(isHe ? "he-IL" : "en-US", { hour12: false });

    // Step 1: Vessel moves inside 12NM boundary
    setVessel((prev) => ({
      ...prev,
      currentMilestone: "within_12nm_territorial",
      territorialBoundaryCrossed: true,
      nauticalMilesRemaining: 9.8,
      speedKnots: 14.5,
      currentCoordinates: {
        lat: 31.865,
        lng: 34.542,
        formatted: "31°51'54\"N 34°32'31\"E (Within 12NM)",
      },
    }));

    setTriggerLog([
      `[${nowTime}] 🛰️ AIS Event: ${vessel.vesselName} crossed Israeli 12NM Territorial Waters Boundary (Geofence Ring Activated).`,
    ]);

    // Step 2: Auto-dispatch to customs broker
    setTimeout(() => {
      setTriggerLog((prev) => [
        ...prev,
        `[${nowTime}] ⚡ Auto-Trigger: Electronic notification sent to Customs Broker (${vessel.associatedCargo.clearingAgent}).`,
        `[${nowTime}] 📄 Shaar Olami EDI Manifest #${vessel.associatedCargo.customsDeclarationNumber} authorized for pre-clearance.`,
      ]);

      // Step 3: Inland trucking dispatch notice
      setTimeout(() => {
        setVessel((prev) => ({
          ...prev,
          customsTriggerStatus: "alert_dispatched",
        }));
        setTriggerLog((prev) => [
          ...prev,
          `[${nowTime}] 🚛 Port Coordination: Gate-pass issued for Container ${vessel.associatedCargo.containerNumber} at Pier 21. Hauler queued for direct delivery to ${vessel.associatedCargo.buyerCompany}.`,
        ]);
      }, 1200);
    }, 1000);
  };

  // WhatsApp 12NM coordination text
  const whatsapp12NmMessage = isHe
    ? `שלום, עדכון טלמטריה ימית AIS: האונייה ${vessel.vesselName} חצתה את גבול 12 מייל ימי מנמל אשדוד (רציף 21).
מכולה: ${vessel.associatedCargo.containerNumber}
שטר מטען: ${vessel.associatedCargo.billOfLading}
רשימון שער עולמי: ${vessel.associatedCargo.customsDeclarationNumber}
יבואן: ${vessel.associatedCargo.buyerCompany}
נא להפעיל שחרור מסלול ירוק ותיאום משיכה יבשתית.`
    : `Maritime AIS Alert: Vessel ${vessel.vesselName} crossed Israeli 12NM boundary to Ashdod Port (Pier 21).
Container: ${vessel.associatedCargo.containerNumber}
Ocean B/L: ${vessel.associatedCargo.billOfLading}
Customs Declaration: ${vessel.associatedCargo.customsDeclarationNumber}
Importer: ${vessel.associatedCargo.buyerCompany}
Please activate Green Lane release and inland container hauler dispatch.`;

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsapp12NmMessage)}`;

  // Tour Steps
  const MARITIME_TOUR_STEPS: TourStep[] = [
    {
      targetSelector: "#maritime-fleet-selector",
      titleHe: "1. בחירת אוניית משא ומטען פעיל",
      titleEn: "1. Vessel Fleet & Active Cargo Selector",
      descHe: "בחר בין אוניות מכולה פעילות המפליגות מנמלי ספרד ואיטליה לנמל אשדוד עם מטעני המותג הפרטי של הרשתות.",
      descEn: "Select active container vessels sailing from Spain & Italy to Ashdod Port with retailer cargo.",
      icon: "🚢",
    },
    {
      targetSelector: "#maritime-chart-view",
      titleHe: "2. מפת ניווט ימית אינטראקטיבית בים התיכון",
      titleEn: "2. Interactive Mediterranean Navigation Chart",
      descHe: "מעקב GPS חי אחר נתיב השיט מנמל המוצא, חציית מיצר סיציליה, ורחבת העגינה ברציף 21 באשדוד.",
      descEn: "Live GPS tracking from port of origin through the Mediterranean corridor directly to Ashdod Pier 21.",
      icon: "🗺️",
    },
    {
      targetSelector: "#maritime-instruments-bar",
      titleHe: "3. מכשירי טלמטריה ימית: מהירות, קשרים ומרחק",
      titleEn: "3. Nautical Instruments: Knots, Distance & ETA",
      descHe: "נתוני ניווט מדויקים: מהירות בקשרים (Knots), מרחק במיילים ימיים (NM), גובה גלים ומצב רוח.",
      descEn: "Real-time navigation instruments: speed in knots, remaining nautical miles, wave height, and wind.",
      icon: "🧭",
    },
    {
      targetSelector: "#maritime-12nm-trigger",
      titleHe: "4. הדק אוטומטי במעבר 12 מייל ימי (12NM Boundary)",
      titleEn: "4. Automated 12-Nautical-Mile Customs Trigger",
      descHe: "ברגע שהאונייה נכנסת למים הטריטוריאליים של ישראל, מופעלת התראה אוטומטית לעמיל המכס להתרת שער עולמי ירוק.",
      descEn: "When crossing Israeli territorial waters (12NM), triggers automated WhatsApp/Email alerts to clear customs before docking.",
      icon: "⚡",
    },
    {
      targetSelector: "#ashdod-anchorage-status",
      titleHe: "5. סטטוס רחבת העגינה ועומסים בנמל אשדוד",
      titleEn: "5. Ashdod Port Roadstead & Anchorage Telemetry",
      descHe: "זמן המתנה ממוצע לנתב, מצב מנופי הרציף, וזמינות פריקה מיידית למכולה של היבואן.",
      descEn: "Pilot boat wait times, gantry crane availability, and dock readiness for immediate container release.",
      icon: "⚓",
    },
  ];

  return (
    <div
      dir={isHe ? "rtl" : "ltr"}
      className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-24 selection:bg-cyan-500 selection:text-white"
    >
      {/* ── TOP MARITIME CONTROL BAR ── */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 backdrop-blur-md bg-opacity-95 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center text-xl shrink-0">
              🧭
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-white tracking-wide">
                  {isHe
                    ? "רדאר ימי חי AIS · מעקב אוניות מכולה ונמל אשדוד"
                    : "Live Maritime AIS Vessel Radar & Ashdod Port Anchorage"}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
                  <span>LIVE AIS STREAM</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Mediterranean Corridor · Automated 12NM Territorial Waters Pre-Clearance Geofence
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2.5">
            {/* Tour Guide */}
            <TourGuide
              tourId="maritime_vessel_radar"
              steps={MARITIME_TOUR_STEPS}
              lang={lang}
            />

            {/* Language Switcher */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-0.5 flex items-center text-xs">
              <button
                type="button"
                onClick={() => handleToggleLang("en")}
                className={`px-2.5 py-1 rounded-lg transition font-medium cursor-pointer ${
                  !isHe ? "bg-cyan-600 text-white font-bold" : "text-slate-400 hover:text-white"
                }`}
              >
                🇺🇸 English
              </button>
              <button
                type="button"
                onClick={() => handleToggleLang("he")}
                className={`px-2.5 py-1 rounded-lg transition font-medium cursor-pointer ${
                  isHe ? "bg-cyan-600 text-white font-bold" : "text-slate-400 hover:text-white"
                }`}
              >
                🇮🇱 עברית
              </button>
            </div>

            {/* WhatsApp Port Coordination */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              title={isHe ? "תיאום משיכה ב-WhatsApp" : "WhatsApp Port Hauler Coordination"}
            >
              <span>💬</span>
              <span>{isHe ? "תיאום משיכה בוואטסאפ" : "WhatsApp Hauler"}</span>
            </a>

            {/* Link to Customs Portal */}
            <Link
              href={`/customs/${vessel.associatedCargo.requestId}`}
              className="text-xs font-bold px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span>🇮🇱</span>
              <span>{isHe ? "תיק שחרור שער עולמי" : "Shaar Olami Portal"}</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT CONTAINER ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* ── FLEET SELECTOR BAR ── */}
        <section
          id="maritime-fleet-selector"
          className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {isHe ? "בחר אוניית מכולה פעילה:" : "Select Active Container Vessel:"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 flex-1 max-w-4xl">
            {Object.values(LIVE_VESSELS_DATABASE).map((ship) => (
              <button
                key={ship.id}
                type="button"
                onClick={() => handleSelectVessel(ship.id)}
                className={`p-3 rounded-2xl border text-right transition cursor-pointer flex flex-col justify-between ${
                  selectedVesselId === ship.id
                    ? "bg-cyan-950/40 border-cyan-500/50 shadow-md ring-1 ring-cyan-500/30"
                    : "bg-slate-950 border-slate-800/80 hover:border-slate-700 text-slate-400"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-white flex items-center gap-1.5">
                    <span>{ship.flag.split(" ")[1]}</span>
                    <span>{ship.vesselName}</span>
                  </span>
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                      ship.currentMilestone === "berthed_pier21"
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                        : ship.currentMilestone === "approaching_12nm"
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse"
                        : "bg-blue-500/20 text-blue-300 border-blue-500/30"
                    }`}
                  >
                    {ship.currentMilestone === "berthed_pier21"
                      ? isHe
                        ? "בעגינה ברציף"
                        : "Berthed"
                      : ship.currentMilestone === "approaching_12nm"
                      ? isHe
                        ? "מתקרב ל-12 מייל"
                        : "Approaching 12NM"
                      : isHe
                      ? "בהפלגה בים"
                      : "In Transit"}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1 truncate">
                  {ship.departurePort.name.split(" ")[0]} ➔ {ship.destinationPort.name}
                </div>
                <div className="text-[10px] font-mono text-cyan-400 mt-1">
                  {ship.nauticalMilesRemaining} NM · {ship.speedKnots} kts
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* ── INTERACTIVE MEDITERRANEAN NAUTICAL CHART & RADAR VIEW ── */}
        <section
          id="maritime-chart-view"
          className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative"
        >
          {/* Radar Header Telemetry */}
          <div className="p-5 border-b border-slate-800 bg-slate-950/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <span>🚢</span>
                  <span>{vessel.vesselName}</span>
                  <span className="text-xs font-mono font-normal text-slate-400">
                    IMO: {vessel.imo} · MMSI: {vessel.mmsi}
                  </span>
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {vessel.shippingLine} · {isHe ? "מסע" : "Voyage"} {vessel.voyageNumber} ·{" "}
                {vessel.departurePort.name} ({vessel.departurePort.code}) ➔ {vessel.destinationPort.name} ({vessel.destinationPort.berth})
              </p>
            </div>

            {/* Status Badge */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block uppercase">
                  {isHe ? "מועד הגעה משוער (ETA)" : "Estimated Arrival (ETA)"}
                </span>
                <span className="text-sm font-bold font-mono text-amber-300">
                  {vessel.destinationPort.eta.slice(0, 16).replace("T", " ")} UTC
                </span>
              </div>
            </div>
          </div>

          {/* SVG Map Canvas */}
          <div className="relative w-full h-[420px] bg-[#071321] overflow-hidden select-none">
            {/* Nautical Grid Lines */}
            <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="nautical-grid" width="60" height="60" patternUnits="userSpaceOnUse">
                  <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#38bdf8" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#nautical-grid)" />
            </svg>

            {/* Stylized Mediterranean Sea Contours (Simplified Nautical Vector) */}
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 1000 420"
              preserveAspectRatio="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* European Coastlines (Spain, France, Italy, Greece) */}
              <path
                d="M 50,40 Q 150,50 250,70 Q 350,110 420,90 Q 520,70 600,120 Q 700,100 800,130 L 800,0 L 50,0 Z"
                fill="#0f1f33"
                stroke="#1e3a5f"
                strokeWidth="1.5"
              />
              {/* North African Coastlines (Morocco, Algeria, Tunisia, Libya, Egypt) */}
              <path
                d="M 50,380 Q 200,360 380,370 Q 500,390 650,375 Q 820,385 950,390 L 950,420 L 50,420 Z"
                fill="#0f1f33"
                stroke="#1e3a5f"
                strokeWidth="1.5"
              />
              {/* Levantine Basin Coast (Israel, Lebanon) */}
              <path
                d="M 940,150 Q 945,260 935,370 L 1000,370 L 1000,150 Z"
                fill="#0f1f33"
                stroke="#1e3a5f"
                strokeWidth="1.5"
              />

              {/* 12NM Territorial Waters Geofence Zone Around Ashdod */}
              <circle
                cx="930"
                cy="260"
                r="65"
                fill="rgba(56, 189, 248, 0.08)"
                stroke="#38bdf8"
                strokeWidth="1.5"
                strokeDasharray="4 3"
                className="animate-pulse"
              />
              <text x="880" y="215" fill="#38bdf8" fontSize="10" fontFamily="monospace" fontWeight="bold">
                12NM ISRAELI GEOFENCE
              </text>

              {/* Shipping Route Path (Valencia/Naples -> Ashdod) */}
              <path
                d="M 120,130 Q 320,180 500,220 Q 720,240 930,260"
                fill="none"
                stroke="#0284c7"
                strokeWidth="2.5"
                strokeDasharray="6 4"
                opacity="0.7"
              />

              {/* Port Nodes */}
              {/* Valencia */}
              <circle cx="120" cy="130" r="5" fill="#f97316" />
              <text x="100" y="150" fill="#f97316" fontSize="11" fontWeight="bold">Valencia (ESVLC)</text>

              {/* Genoa / Naples */}
              <circle cx="420" cy="110" r="4" fill="#38bdf8" />
              <text x="390" y="130" fill="#cbd5e1" fontSize="10">Genoa/Naples</text>

              {/* Crete Passage */}
              <circle cx="680" cy="235" r="3" fill="#64748b" />
              <text x="660" y="255" fill="#64748b" fontSize="9">South Crete Waypoint</text>

              {/* Ashdod Port (Destination) */}
              <circle cx="930" cy="260" r="6" fill="#10b981" />
              <text x="875" y="285" fill="#34d399" fontSize="12" fontWeight="bold">
                ★ Ashdod Port (ILASH Pier 21)
              </text>

              {/* Live Vessel Dynamic Position Icon on Route */}
              {/* If berthed: at 930,260. If 12nm: at 910,258. If mid-med: at 620,230 */}
              <g
                transform={`translate(${
                  vessel.currentMilestone === "berthed_pier21"
                    ? 930
                    : vessel.currentMilestone === "within_12nm_territorial"
                    ? 910
                    : vessel.currentMilestone === "approaching_12nm"
                    ? 880
                    : 620
                }, ${
                  vessel.currentMilestone === "berthed_pier21"
                    ? 260
                    : vessel.currentMilestone === "within_12nm_territorial"
                    ? 258
                    : vessel.currentMilestone === "approaching_12nm"
                    ? 254
                    : 230
                })`}
              >
                {/* Radar Ripple Ping */}
                <circle cx="0" cy="0" r="16" fill="none" stroke="#22d3ee" strokeWidth="1.5" opacity="0.6">
                  <animate attributeName="r" values="8;24" dur="1.8s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.8;0" dur="1.8s" repeatCount="indefinite" />
                </circle>

                {/* Ship Icon (Arrow) */}
                <circle cx="0" cy="0" r="9" fill="#0284c7" stroke="#ffffff" strokeWidth="2" />
                <path d="M 0,-6 L 4,5 L 0,3 L -4,5 Z" fill="#ffffff" transform={`rotate(${vessel.headingDegrees})`} />
              </g>
            </svg>

            {/* Floating Live Telemetry Badge over Map */}
            <div className="absolute top-4 left-4 bg-slate-950/85 backdrop-blur-md border border-slate-800 rounded-2xl p-3 text-xs space-y-1 z-10 shadow-lg">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span className="font-bold text-white">{vessel.vesselName}</span>
                <span className="font-mono text-cyan-300">({vessel.speedKnots} kts)</span>
              </div>
              <div className="text-[11px] font-mono text-slate-400">
                Lat/Long: {vessel.currentCoordinates.formatted}
              </div>
              <div className="text-[11px] text-slate-300 font-semibold">
                {isHe ? "מרחק לנמל אשדוד:" : "Distance to Ashdod:"}{" "}
                <strong className="text-amber-400 font-mono">{vessel.nauticalMilesRemaining} NM</strong>
              </div>
            </div>

            {/* Radar Sweep Scanning Beam Graphic */}
            <div
              className="absolute pointer-events-none rounded-full"
              style={{
                top: "260px",
                left: "930px",
                width: "280px",
                height: "280px",
                marginTop: "-140px",
                marginLeft: "-140px",
                background: `conic-gradient(from ${radarSweepAngle}deg at 50% 50%, rgba(34, 211, 238, 0.25) 0deg, rgba(34, 211, 238, 0.05) 45deg, transparent 90deg)`,
                borderRadius: "50%",
              }}
            />
          </div>

          {/* ── NAUTICAL INSTRUMENTS BAR ── */}
          <div
            id="maritime-instruments-bar"
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 p-4 bg-slate-950 border-t border-slate-800 text-xs"
          >
            {/* 1. Speed */}
            <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">
                {isHe ? "מהירות בקשרים" : "Speed (Knots)"}
              </span>
              <div className="text-lg font-bold font-mono text-cyan-400 my-0.5">
                {vessel.speedKnots} kts
              </div>
              <span className="text-[10px] text-slate-400">{vessel.speedKmh} km/h</span>
            </div>

            {/* 2. Heading */}
            <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">
                {isHe ? "כיוון שיט (Heading)" : "Heading"}
              </span>
              <div className="text-lg font-bold font-mono text-slate-200 my-0.5">
                {vessel.headingDegrees}°
              </div>
              <span className="text-[10px] text-slate-400">East-Southeast</span>
            </div>

            {/* 3. Distance Remaining */}
            <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">
                {isHe ? "מרחק נותר (NM)" : "Remaining Distance"}
              </span>
              <div className="text-lg font-bold font-mono text-amber-300 my-0.5">
                {vessel.nauticalMilesRemaining} NM
              </div>
              <span className="text-[10px] text-slate-400">
                {Math.round(vessel.nauticalMilesRemaining * 1.852)} km
              </span>
            </div>

            {/* 4. Progress */}
            <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">
                {isHe ? "התקדמות במסלול" : "Route Progress"}
              </span>
              <div className="text-lg font-bold font-mono text-emerald-400 my-0.5">
                {vessel.progressPercent}%
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
                <div
                  className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${vessel.progressPercent}%` }}
                />
              </div>
            </div>

            {/* 5. Sea State */}
            <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">
                {isHe ? "מצב הים והגלים" : "Sea Condition"}
              </span>
              <div className="text-sm font-bold text-slate-200 my-0.5">
                🌊 {vessel.seaCondition.waveHeightMeters}m Swell
              </div>
              <span className="text-[10px] text-slate-400">
                Wind {vessel.seaCondition.windSpeedKnots} kts ({vessel.seaCondition.windDirection})
              </span>
            </div>

            {/* 6. Cargo on-board */}
            <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">
                {isHe ? "מכולה מסחרית" : "Container On-Board"}
              </span>
              <div className="font-mono font-bold text-sm text-sky-400 truncate my-0.5">
                {vessel.associatedCargo.containerNumber}
              </div>
              <span className="text-[10px] text-slate-400 truncate">
                {vessel.associatedCargo.buyerCompany}
              </span>
            </div>
          </div>
        </section>

        {/* ── 12-NAUTICAL-MILE GEOFENCE TRIGGER & REAL-TIME DISPATCH DESK ── */}
        <section
          id="maritime-12nm-trigger"
          className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-lg">
                  ⚡
                </div>
                <h3 className="text-base font-bold text-white">
                  {isHe
                    ? "הדק אוטומטי במעבר 12 מייל ימי (12NM Israeli Territorial Waters Trigger)"
                    : "Automated 12-Nautical-Mile Customs Pre-Clearance Trigger"}
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {isHe
                  ? "חציית קו 12 מייל ימי מנמל אשדוד מפעילה שיגור אוטומטי של הודעות וואטסאפ ואימייל לעמיל המכס להתרת רשימון ירוק מראש."
                  : "Crossing the 12NM territorial boundary triggers instant automated WhatsApp & EDI dispatches to pre-clear customs."}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSimulate12NmTrigger}
                disabled={vessel.territorialBoundaryCrossed && triggerLog.length > 0}
                className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-lg hover:shadow-cyan-900/30"
              >
                <span>⚡</span>
                <span>
                  {vessel.territorialBoundaryCrossed
                    ? isHe
                      ? "קו 12 מייל נחצה ✓"
                      : "12NM Crossed ✓"
                    : isHe
                    ? "הפעל סימולציית מעבר 12 מייל ימי"
                    : "Simulate 12NM Boundary Crossing"}
                </span>
              </button>
            </div>
          </div>

          {/* Trigger Dispatch Event Logs */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <span>📡</span>
              <span>{isHe ? "יומן אירועים ושיגור אוטומטי בזמן אמת:" : "Live Dispatch & AIS Telemetry Log:"}</span>
            </h4>

            <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 font-mono text-xs space-y-2 min-h-[110px] text-slate-300">
              {triggerLog.length === 0 ? (
                <div className="text-slate-500 italic py-2">
                  {isHe
                    ? "האונייה נמצאת כעת 14.2 מייל ימי מהנמל. לחץ על הכפתור למעלה כדי לדמות את חציית קו 12 מייל ימי."
                    : "Vessel currently 14.2 NM out. Click the button above to simulate 12NM boundary crossing."}
                </div>
              ) : (
                triggerLog.map((log, index) => (
                  <div key={index} className="leading-relaxed flex items-start gap-2">
                    <span className="text-cyan-400 shrink-0">➔</span>
                    <span className="text-slate-200">{log}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Cargo & Ashdod Clearing Coordinates */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-xs">
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
              <span className="text-slate-500 block text-[10px] uppercase">{isHe ? "יבואן רוכש" : "Retail Importer"}</span>
              <span className="font-bold text-white text-sm block">{vessel.associatedCargo.buyerCompany}</span>
              <span className="text-slate-400 block text-[11px]">{vessel.associatedCargo.productName}</span>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
              <span className="text-slate-500 block text-[10px] uppercase">{isHe ? "עמיל מכס מורשה" : "Clearing Broker"}</span>
              <span className="font-bold text-cyan-300 text-sm block">{vessel.associatedCargo.clearingAgent}</span>
              <span className="text-slate-400 block text-[11px]">
                {isHe ? "רשימון שער עולמי:" : "Customs Declaration:"} {vessel.associatedCargo.customsDeclarationNumber}
              </span>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
              <span className="text-slate-500 block text-[10px] uppercase">{isHe ? "רציף פריקה ימי" : "Discharge Terminal"}</span>
              <span className="font-bold text-emerald-400 text-sm block">{vessel.destinationPort.berth}</span>
              <span className="text-slate-400 block text-[11px]">{vessel.destinationPort.terminal}</span>
            </div>
          </div>
        </section>

        {/* ── PORT OF ASHDOD ANCHORAGE & ROADSTEAD CONGESTION TELEMETRY ── */}
        <section
          id="ashdod-anchorage-status"
          className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>⚓</span>
                <span>{isHe ? "טלמטריה רציף ועומסים - נמל אשדוד (ILASH)" : "Ashdod Port Queue & Anchorage Telemetry"}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Ashdod Roadstead Anchorage · Terminal 1 Container Basin · Pier 21 Dedicated Berth
              </p>
            </div>

            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-xl border border-emerald-500/30">
              {isHe ? "תנועת אוניות שוטפת · מסלול ירוק פעיל" : "Fluid Vessel Traffic · Green Lane Active"}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <span className="text-slate-500 block text-[10px] uppercase">
                {isHe ? "אוניות בעגינה ברחבת ההמתנה" : "Vessels at Anchorage"}
              </span>
              <div className="text-2xl font-bold font-mono text-white mt-1">
                {ASHDOD_PORT_TELEMETRY.vesselsAtAnchorage}
              </div>
              <span className="text-[11px] text-emerald-400">
                {isHe ? "עומס נמוך (Low Congestion)" : "Low Congestion"}
              </span>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <span className="text-slate-500 block text-[10px] uppercase">
                {isHe ? "זמן המתנה ממוצע לנתב" : "Avg Pilot Wait Time"}
              </span>
              <div className="text-2xl font-bold font-mono text-cyan-300 mt-1">
                {ASHDOD_PORT_TELEMETRY.averageAnchorageWaitHours}h
              </div>
              <span className="text-[11px] text-slate-400">
                {isHe ? "סירת נתב בפעילות רציפה" : "Pilot boat active"}
              </span>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <span className="text-slate-500 block text-[10px] uppercase">
                {isHe ? "מנופי גשר מכולות פעילים" : "Active Gantry Cranes"}
              </span>
              <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                {ASHDOD_PORT_TELEMETRY.activeContainerGantries}
              </div>
              <span className="text-[11px] text-slate-400">
                {isHe ? "רציף 21 ערוך לקליטה" : "Pier 21 Ready"}
              </span>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <span className="text-slate-500 block text-[10px] uppercase">
                {isHe ? "עומק מים מרבי ברציף" : "Berth Water Depth"}
              </span>
              <div className="text-2xl font-bold font-mono text-slate-200 mt-1">
                {ASHDOD_PORT_TELEMETRY.waterDepthMeters}m
              </div>
              <span className="text-[11px] text-slate-400">
                {isHe ? "מתאים לאוניות FCL 40HQ" : "Accommodates Post-Panamax"}
              </span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
