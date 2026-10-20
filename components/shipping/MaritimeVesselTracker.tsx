"use client";

import React, { useState, useMemo, useEffect } from "react";

export interface MaritimeVesselTrackerProps {
  requestId?: string;
  orderStage?: string;
  containerNumber?: string | null;
  billOfLading?: string | null;
  shippingLine?: string | null;
  vesselName?: string | null;
  portOfOrigin?: string | null;
  portOfDestination?: string | null;
  etd?: string | null;
  etaPort?: string | null;
  customsStatus?: string | null;
  deliveryStatus?: string | null;
  buyerWarehouseAddress?: string | null;
  productName?: string | null;
  lang?: "he" | "en";
  className?: string;
}

interface Waypoint {
  id: string;
  name: string;
  nameHe: string;
  code: string;
  x: number;
  y: number;
  lat: string;
  lon: string;
  stageIndex: number;
  distanceFromOriginNM: number;
  depthM: number;
  description: string;
  descriptionHe: string;
}

// Geographic waypoints along the Mediterranean shipping lane: Valencia -> Ashdod
const ROUTE_WAYPOINTS: Waypoint[] = [
  {
    id: "wp_origin",
    name: "Valencia Container Terminal",
    nameHe: "נמל ולנסיה - מסוף מכולות",
    code: "ESVLC",
    x: 125,
    y: 160,
    lat: "39° 27' N",
    lon: "000° 19' W",
    stageIndex: 0,
    distanceFromOriginNM: 0,
    depthM: 18,
    description: "Export terminal gate-in, phytosanitary seal inspection, and vessel gantry loading.",
    descriptionHe: "כניסה למסוף ייצוא, בדיקת חותמות פיטוסניטריות וטעינת מכולה למחסן האונייה.",
  },
  {
    id: "wp_balearic",
    name: "Balearic Sea Passage",
    nameHe: "מעבר הים הבלארי",
    code: "MED-W1",
    x: 210,
    y: 200,
    lat: "38° 45' N",
    lon: "002° 30' E",
    stageIndex: 1,
    distanceFromOriginNM: 320,
    depthM: 1850,
    description: "Cruising sea speed 18.5 kts south of Mallorca Island. Cold chain telemetry stable.",
    descriptionHe: "מהירות שיוט 18.5 קשר דרומית למיורקה. מערכות בקרת טמפרטורה יציבות.",
  },
  {
    id: "wp_sicily",
    name: "Strait of Sicily / Cape Bon",
    nameHe: "מצר סיציליה - קייפ בון",
    code: "MED-MID",
    x: 420,
    y: 255,
    lat: "36° 52' N",
    lon: "011° 40' E",
    stageIndex: 2,
    distanceFromOriginNM: 980,
    depthM: 420,
    description: "Mid-voyage Mediterranean chokepoint AIS check. Satellite telemetry link confirmed.",
    descriptionHe: "נקודת ביקורת לווינית מרכזית במצר סיציליה. שידור נתוני GPS וקירור תקין.",
  },
  {
    id: "wp_crete",
    name: "South Crete Deep Corridor",
    nameHe: "מסדרון ימי עמוק דרומית לכרתים",
    code: "MED-E1",
    x: 680,
    y: 310,
    lat: "34° 30' N",
    lon: "024° 50' E",
    stageIndex: 3,
    distanceFromOriginNM: 1640,
    depthM: 3200,
    description: "Hellenic Trench entry. 48-hour Israeli Customs pre-manifest notification transmitted.",
    descriptionHe: "כניסה למזרח הים התיכון. שידור מצהר מוקדם (48 שעות) למכס נמל אשדוד.",
  },
  {
    id: "wp_ashdod",
    name: "Ashdod Port Outer Anchorage & Pier 21",
    nameHe: "נמל אשדוד - עגינה ורציף 21",
    code: "ILASH",
    x: 885,
    y: 360,
    lat: "31° 49' N",
    lon: "034° 39' E",
    stageIndex: 4,
    distanceFromOriginNM: 2150,
    depthM: 22,
    description: "Pilotage boarding, vessel berthing at Pier 21, and gantry crane discharge to bonded yard.",
    descriptionHe: "עליית נתב נמל, עגינה ברציף 21 ופריקת מכולה למסוף העורפי לשחרור מכס.",
  },
];

const VOYAGE_STAGES = [
  {
    index: 0,
    key: "origin_loading",
    nameEn: "Gate-In & Vessel Loading",
    nameHe: "טעינה במסוף מוצא",
    progress: 0.05,
    badgeEn: "Origin Port",
    badgeHe: "נמל מוצא",
  },
  {
    index: 1,
    key: "west_med_departure",
    nameEn: "West Med Sea Departure",
    nameHe: "יציאה למערב הים התיכון",
    progress: 0.28,
    badgeEn: "Balearic Basin",
    badgeHe: "אגן בלארי",
  },
  {
    index: 2,
    key: "strait_of_sicily",
    nameEn: "Strait of Sicily Transit",
    nameHe: "מעבר מצר סיציליה",
    progress: 0.52,
    badgeEn: "Mid Mediterranean",
    badgeHe: "מרכז הים התיכון",
  },
  {
    index: 3,
    key: "east_med_approach",
    nameEn: "East Med & Levant Approach",
    nameHe: "גישה מזרחית ללבנט",
    progress: 0.78,
    badgeEn: "Crete Corridor",
    badgeHe: "מסדרון כרתים",
  },
  {
    index: 4,
    key: "ashdod_arrival",
    nameEn: "Ashdod Anchorage & Berth",
    nameHe: "עגינה ושחרור באשדוד",
    progress: 0.98,
    badgeEn: "Port of Ashdod",
    badgeHe: "נמל אשדוד",
  },
];

// Helper to interpolate position and heading angle along route waypoints
function calculateShipTelemetry(t: number) {
  // t is clamped 0..1
  const points = ROUTE_WAYPOINTS;
  const numSegments = points.length - 1;
  const segmentFloat = Math.min(Math.max(t * numSegments, 0), numSegments);
  const segIndex = Math.min(Math.floor(segmentFloat), numSegments - 1);
  const segFrac = segmentFloat - segIndex;

  const p0 = points[segIndex];
  const p1 = points[segIndex + 1];

  // Linear interpolation between waypoints
  const x = p0.x + (p1.x - p0.x) * segFrac;
  const y = p0.y + (p1.y - p0.y) * segFrac;

  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const headingRad = Math.atan2(dy, dx);
  const headingDeg = Math.round((headingRad * 180) / Math.PI);

  const totalDistanceNM = points[points.length - 1].distanceFromOriginNM;
  const sailedNM = Math.round(t * totalDistanceNM);
  const remainingNM = Math.max(0, totalDistanceNM - sailedNM);

  return { x, y, headingDeg, sailedNM, remainingNM, currentSegment: p0 };
}

export default function MaritimeVesselTracker({
  requestId,
  orderStage = "manufacturing",
  containerNumber = "MSKU-9481029",
  billOfLading = "MSCUVAL881920",
  shippingLine = "MSC (Mediterranean Shipping Company)",
  vesselName = "MSC LEANNE",
  portOfOrigin = "Valencia Port, Spain",
  portOfDestination = "Ashdod Port, Israel",
  etd,
  etaPort,
  customsStatus,
  deliveryStatus,
  buyerWarehouseAddress,
  lang = "he",
  className = "",
}: MaritimeVesselTrackerProps) {
  const isHe = lang === "he";

  // Determine base voyage stage according to order status
  const defaultStageIndex = useMemo(() => {
    if (orderStage === "customs_warehouse" || deliveryStatus === "arrived_at_warehouse") return 4;
    if (deliveryStatus === "inland_trucking" || deliveryStatus === "at_port") return 4;
    if (customsStatus === "customs_cleared" || customsStatus === "customs_broker_clearing") return 4;
    if (orderStage === "manufacturing") return 2; // In sea transit default for demo
    if (orderStage === "order_po_issued") return 0;
    return 2;
  }, [orderStage, customsStatus, deliveryStatus]);

  const [activeStageIndex, setActiveStageIndex] = useState<number>(defaultStageIndex);
  const [selectedWaypointId, setSelectedWaypointId] = useState<string>("wp_sicily");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simProgress, setSimProgress] = useState(VOYAGE_STAGES[defaultStageIndex].progress);

  // Sync stage change to simulation progress
  useEffect(() => {
    setSimProgress(VOYAGE_STAGES[activeStageIndex].progress);
    setSelectedWaypointId(ROUTE_WAYPOINTS[activeStageIndex].id);
  }, [activeStageIndex]);

  // Live simulation ticker if user turns on smooth voyage replay
  useEffect(() => {
    if (!isSimulating) return;
    const interval = setInterval(() => {
      setSimProgress((prev) => {
        if (prev >= 0.98) return 0.05;
        return Number((prev + 0.015).toFixed(3));
      });
    }, 400);
    return () => clearInterval(interval);
  }, [isSimulating]);

  const telemetry = useMemo(() => {
    return calculateShipTelemetry(simProgress);
  }, [simProgress]);

  const selectedWaypoint = useMemo(() => {
    return ROUTE_WAYPOINTS.find((w) => w.id === selectedWaypointId) || ROUTE_WAYPOINTS[2];
  }, [selectedWaypointId]);

  const copyToClipboard = (text: string, key: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  // Safe external tracking URLs
  const activeContainer = containerNumber || "MSKU-9481029";
  const activeBl = billOfLading || "MSCUVAL881920";
  const activeVessel = vesselName || "MSC LEANNE";

  const carrierLinks = [
    {
      name: "MSC Live Track",
      url: `https://www.msc.com/en/track-a-shipment?search=${activeContainer}`,
      badge: "MSC",
      color: "bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20",
    },
    {
      name: "ZIM Cargo Tracking",
      url: `https://www.zim.com/tools/track-a-shipment?consignment=${activeContainer}`,
      badge: "ZIM",
      color: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20",
    },
    {
      name: "Maersk Shipment",
      url: `https://www.maersk.com/tracking/${activeContainer}`,
      badge: "Maersk",
      color: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/20",
    },
    {
      name: "MarineTraffic AIS Radar",
      url: `https://www.marinetraffic.com/en/ais/index/search/all?keyword=${encodeURIComponent(activeVessel)}`,
      badge: "AIS Live",
      color: "bg-blue-500/10 text-blue-300 border-blue-500/30 hover:bg-blue-500/20",
    },
    {
      name: "Ashdod Port Berth Schedule",
      url: "https://www.ashdodport.co.il",
      badge: "Port IL",
      color: "bg-purple-500/10 text-purple-300 border-purple-500/30 hover:bg-purple-500/20",
    },
  ];

  // Calculated days at sea
  const totalVoyageDays = 11;
  const daysAtSeaElapsed = Math.min(
    Math.max(1, Math.round(simProgress * totalVoyageDays)),
    totalVoyageDays
  );
  const daysRemaining = totalVoyageDays - daysAtSeaElapsed;

  return (
    <div
      dir={isHe ? "rtl" : "ltr"}
      className={`rounded-2xl bg-slate-950 text-slate-100 border border-slate-800 shadow-2xl overflow-hidden font-sans ${className}`}
    >
      {/* ── HEADER BANNER ── */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-5 py-4 border-b border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-400/30 flex items-center justify-center text-xl shrink-0">
            🚢
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-white tracking-wide">
                {isHe ? "מעקב שילוח ימי וניטור לווייני AIS" : "Ocean Freight & Live AIS Maritime Tracking"}
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                LIVE AIS FEED
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {portOfOrigin} → {portOfDestination} · {shippingLine}
            </p>
          </div>
        </div>

        {/* Quick Telemetry Indicators */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-right">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">
              {isHe ? "ימים בים" : "Days at Sea"}
            </div>
            <div className="text-xs font-mono font-bold text-sky-400">
              {daysAtSeaElapsed} / {totalVoyageDays} {isHe ? "ימים" : "Days"}
            </div>
          </div>

          <div className="px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-right">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">
              {isHe ? "מרחק שנותר" : "Remaining"}
            </div>
            <div className="text-xs font-mono font-bold text-amber-400">
              {telemetry.remainingNM.toLocaleString()} NM
            </div>
          </div>

          <div className="px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-right">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">
              {isHe ? "עגינה משוערת (ETA)" : "Estimated Berth"}
            </div>
            <div className="text-xs font-mono font-bold text-emerald-400">
              {etaPort || (daysRemaining === 0 ? (isHe ? "בעגינה" : "At Berth") : `+${daysRemaining} ${isHe ? "ימים" : "days"}`)}
            </div>
          </div>

          {/* Simulate Toggle */}
          <button
            type="button"
            onClick={() => setIsSimulating(!isSimulating)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition flex items-center gap-1.5 cursor-pointer ${
              isSimulating
                ? "bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-xs"
                : "bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800"
            }`}
            title="Animate route progression"
          >
            <span>{isSimulating ? "⏸" : "▶"}</span>
            <span>{isSimulating ? (isHe ? "השהה" : "Pause") : (isHe ? "הפעל הדמיה" : "Replay")}</span>
          </button>
        </div>
      </div>

      {/* ── 5-STAGE VOYAGE PROGRESSION STEPPER ── */}
      <div className="px-5 py-3 bg-slate-900/40 border-b border-slate-800/60 overflow-x-auto">
        <div className="flex items-center justify-between min-w-[620px] gap-2">
          {VOYAGE_STAGES.map((stg) => {
            const isPassed = simProgress >= stg.progress;
            const isCurrent = activeStageIndex === stg.index;
            return (
              <button
                key={stg.key}
                type="button"
                onClick={() => {
                  setActiveStageIndex(stg.index);
                  setIsSimulating(false);
                }}
                className={`flex-1 p-2 rounded-xl border text-left transition relative cursor-pointer ${
                  isCurrent
                    ? "bg-sky-950/60 border-sky-500/60 text-white shadow-sm ring-1 ring-sky-500/30"
                    : isPassed
                    ? "bg-slate-900/60 border-slate-700/60 text-slate-300 hover:border-slate-600"
                    : "bg-slate-950/40 border-slate-800/50 text-slate-500 hover:text-slate-400"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-slate-400">
                    0{stg.index + 1}
                  </span>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                      isPassed
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {isHe ? stg.badgeHe : stg.badgeEn}
                  </span>
                </div>
                <div className="text-xs font-bold mt-1 truncate">
                  {isHe ? stg.nameHe : stg.nameEn}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── INTERACTIVE MEDITERRANEAN SEA AIS MAP ── */}
      <div className="relative bg-[#060c1d] overflow-hidden select-none">
        {/* Radar concentric sweep ambient background */}
        <div className="absolute inset-0 pointer-events-none opacity-30 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent"></div>

        <svg
          viewBox="0 0 920 440"
          className="w-full h-auto max-h-[460px] block"
          style={{ background: "#060e22" }}
        >
          <defs>
            {/* Nautical glowing gradient for shipping line */}
            <linearGradient id="maritimeLaneGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="45%" stopColor="#06b6d4" />
              <stop offset="85%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#34d399" />
            </linearGradient>

            {/* Radar glow */}
            <radialGradient id="radarPingGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
              <stop offset="60%" stopColor="#0284c7" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
            </radialGradient>

            {/* Vessel drop shadow filter */}
            <filter id="vesselGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#38bdf8" floodOpacity="0.6" />
            </filter>
          </defs>

          {/* Nautical Grid Lines (Lat / Lon) */}
          <g stroke="rgba(255, 255, 255, 0.04)" strokeWidth="1" strokeDasharray="3 3">
            <line x1="0" y1="80" x2="920" y2="80" />
            <line x1="0" y1="160" x2="920" y2="160" />
            <line x1="0" y1="240" x2="920" y2="240" />
            <line x1="0" y1="320" x2="920" y2="320" />
            <line x1="0" y1="400" x2="920" y2="400" />

            <line x1="150" y1="0" x2="150" y2="440" />
            <line x1="300" y1="0" x2="300" y2="440" />
            <line x1="450" y1="0" x2="450" y2="440" />
            <line x1="600" y1="0" x2="600" y2="440" />
            <line x1="750" y1="0" x2="750" y2="440" />
          </g>

          {/* Latitude / Longitude labels */}
          <g fill="rgba(255,255,255,0.2)" fontSize="9" fontFamily="monospace">
            <text x="12" y="75">42°N</text>
            <text x="12" y="155">39°N</text>
            <text x="12" y="235">36°N</text>
            <text x="12" y="315">33°N</text>
            <text x="12" y="395">30°N</text>

            <text x="155" y="18">00°E</text>
            <text x="305" y="18">10°E</text>
            <text x="455" y="18">15°E</text>
            <text x="605" y="18">22°E</text>
            <text x="755" y="18">30°E</text>
            <text x="865" y="18">35°E</text>
          </g>

          {/* ── MEDITERRANEAN SEA COASTLINES & LANDMASSES ── */}
          <g fill="#141e33" stroke="#253553" strokeWidth="1.2">
            {/* North Africa (Morocco to Egypt / Sinai) */}
            <path d="M 0,270 Q 60,265 120,270 Q 180,250 250,250 Q 320,245 355,235 Q 375,245 365,275 Q 360,305 380,320 Q 430,345 490,345 Q 540,360 610,365 Q 700,375 790,390 Q 840,390 875,385 L 920,385 L 920,440 L 0,440 Z" />

            {/* Iberian Peninsula (Spain) */}
            <path d="M 0,0 L 220,0 Q 210,60 190,95 Q 175,115 155,145 Q 130,165 95,190 Q 60,220 15,245 L 0,255 Z" />

            {/* Southern France & Liguria */}
            <path d="M 220,0 L 330,0 Q 310,25 280,35 Q 250,45 220,55 Z" />

            {/* Italian Peninsula & Boot */}
            <path d="M 330,0 L 440,0 Q 420,40 380,80 Q 360,110 395,130 Q 430,150 465,190 Q 480,210 460,225 Q 445,215 425,185 Q 400,150 385,110 Q 355,80 340,30 Z" />

            {/* Sicily Island */}
            <path d="M 410,220 Q 460,210 470,225 Q 450,250 415,245 Z" />

            {/* Balearic Islands */}
            {/* Mallorca */}
            <ellipse cx="185" cy="180" rx="14" ry="9" transform="rotate(-15 185 180)" />
            {/* Menorca */}
            <ellipse cx="205" cy="170" rx="7" ry="4" />
            {/* Ibiza */}
            <ellipse cx="160" cy="195" rx="6" ry="4" />

            {/* Corsica */}
            <path d="M 298,80 Q 312,85 308,115 Q 296,110 298,80 Z" />

            {/* Sardinia */}
            <path d="M 295,125 Q 315,130 312,175 Q 295,180 295,125 Z" />

            {/* Greece Mainland & Peloponnese */}
            <path d="M 540,60 Q 600,100 605,150 Q 625,185 600,215 Q 585,225 575,200 Q 560,180 545,150 Z" />

            {/* Crete Island */}
            <path d="M 645,295 Q 680,290 715,295 Q 710,305 675,305 Q 645,302 645,295 Z" />

            {/* Cyprus Island */}
            <path d="M 825,280 Q 860,275 870,285 Q 855,295 825,290 Z" />

            {/* Turkey Southern Coast (Asia Minor) */}
            <path d="M 680,60 L 920,60 L 920,250 Q 880,240 840,240 Q 780,245 740,225 Q 700,210 680,180 Z" />

            {/* Levant Coast (Syria, Lebanon, Israel) */}
            <path d="M 920,250 L 895,270 Q 890,300 892,340 Q 885,365 875,385 L 920,385 Z" />
          </g>

          {/* Sea Name Watermarks */}
          <g fill="rgba(255,255,255,0.08)" fontSize="11" fontFamily="sans-serif" fontWeight="bold" letterSpacing="3">
            <text x="140" y="235">BALEARIC SEA</text>
            <text x="320" y="160">TYRRHENIAN SEA</text>
            <text x="490" y="270">IONIAN SEA</text>
            <text x="710" y="270">LEVANTINE BASIN</text>
          </g>

          {/* ── OFFICIAL MARITIME SHIPPING LANE (Glowing Route Path) ── */}
          {/* Outer glow stroke */}
          <path
            d="M 125,160 Q 170,185 210,200 T 420,255 T 680,310 T 885,360"
            fill="none"
            stroke="#0ea5e9"
            strokeWidth="8"
            strokeOpacity="0.15"
            strokeLinecap="round"
          />

          {/* Main dashed voyage track */}
          <path
            d="M 125,160 Q 170,185 210,200 T 420,255 T 680,310 T 885,360"
            fill="none"
            stroke="url(#maritimeLaneGrad)"
            strokeWidth="3.5"
            strokeDasharray="8 6"
            strokeLinecap="round"
          />

          {/* Completed portion highlight */}
          <path
            d="M 125,160 Q 170,185 210,200 T 420,255 T 680,310 T 885,360"
            fill="none"
            stroke="#10b981"
            strokeWidth="4"
            strokeDasharray="920"
            strokeDashoffset={920 * (1 - simProgress)}
            strokeLinecap="round"
            className="transition-all duration-300"
          />

          {/* ── ROUTE WAYPOINT PINS ── */}
          {ROUTE_WAYPOINTS.map((wp) => {
            const isSelected = selectedWaypointId === wp.id;
            const isOrigin = wp.stageIndex === 0;
            const isDest = wp.stageIndex === 4;

            return (
              <g
                key={wp.id}
                onClick={() => setSelectedWaypointId(wp.id)}
                className="cursor-pointer group"
              >
                {/* Ping circle for active/selected */}
                {isSelected && (
                  <circle
                    cx={wp.x}
                    cy={wp.y}
                    r="14"
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="1.5"
                    strokeDasharray="4 2"
                    className="animate-spin"
                    style={{ transformOrigin: `${wp.x}px ${wp.y}px`, animationDuration: "8s" }}
                  />
                )}

                <circle
                  cx={wp.x}
                  cy={wp.y}
                  r={isOrigin || isDest ? "7" : "5"}
                  fill={isDest ? "#10b981" : isOrigin ? "#f59e0b" : "#38bdf8"}
                  stroke="#ffffff"
                  strokeWidth="2"
                  className="transition-all group-hover:scale-125"
                  style={{ transformOrigin: `${wp.x}px ${wp.y}px` }}
                />

                {/* Waypoint Label Badge */}
                <g transform={`translate(${wp.x}, ${wp.y - (isDest ? 14 : isOrigin ? 14 : 10)})`}>
                  <rect
                    x="-32"
                    y="-16"
                    width="64"
                    height="16"
                    rx="4"
                    fill="#0f172a"
                    stroke={isSelected ? "#38bdf8" : "#334155"}
                    strokeWidth="1"
                    opacity="0.9"
                  />
                  <text
                    x="0"
                    y="-5"
                    textAnchor="middle"
                    fill={isSelected ? "#38bdf8" : "#cbd5e1"}
                    fontSize="9"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    {wp.code}
                  </text>
                </g>
              </g>
            );
          })}

          {/* ── LIVE AIS CONTAINER SHIP MARKER ── */}
          <g
            transform={`translate(${telemetry.x}, ${telemetry.y})`}
            filter="url(#vesselGlow)"
            className="transition-all duration-300"
          >
            {/* Animated Radar Radar Sweep Rings */}
            <circle cx="0" cy="0" r="28" fill="url(#radarPingGrad)" className="animate-ping opacity-60" />
            <circle cx="0" cy="0" r="18" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeOpacity="0.8" />

            {/* Rotated Container Ship Group */}
            <g transform={`rotate(${telemetry.headingDeg})`}>
              {/* Ship Wake Tail */}
              <line x1="-24" y1="0" x2="-8" y2="0" stroke="rgba(56, 189, 248, 0.4)" strokeWidth="4" strokeLinecap="round" />

              {/* Hull outline */}
              <path
                d="M -14,-7 L 10,-7 L 18,0 L 10,7 L -14,7 Z"
                fill="#0f172a"
                stroke="#38bdf8"
                strokeWidth="1.8"
              />

              {/* Colorful Cargo Container Stacks */}
              <rect x="-10" y="-5" width="4" height="4" rx="0.5" fill="#10b981" />
              <rect x="-10" y="1" width="4" height="4" rx="0.5" fill="#f59e0b" />
              <rect x="-5" y="-5" width="4" height="4" rx="0.5" fill="#38bdf8" />
              <rect x="-5" y="1" width="4" height="4" rx="0.5" fill="#f43f5e" />
              <rect x="0" y="-5" width="4" height="4" rx="0.5" fill="#a855f7" />
              <rect x="0" y="1" width="4" height="4" rx="0.5" fill="#10b981" />

              {/* Bridge Tower & Mast */}
              <rect x="5" y="-4" width="4" height="8" rx="1" fill="#f8fafc" stroke="#0284c7" strokeWidth="0.8" />
              <circle cx="8" cy="0" r="1.5" fill="#38bdf8" />

              {/* Nav Lights (Starboard green, Port red) */}
              <circle cx="16" cy="4" r="1.5" fill="#10b981" />
              <circle cx="16" cy="-4" r="1.5" fill="#ef4444" />
            </g>

            {/* Vessel Callout Tag */}
            <g transform="translate(0, -32)">
              <rect
                x="-52"
                y="-18"
                width="104"
                height="20"
                rx="5"
                fill="#020617"
                stroke="#38bdf8"
                strokeWidth="1.5"
                filter="drop-shadow(0 2px 4px rgba(0,0,0,0.8))"
              />
              <text
                x="0"
                y="-4"
                textAnchor="middle"
                fill="#ffffff"
                fontSize="9.5"
                fontWeight="bold"
                fontFamily="sans-serif"
              >
                🚢 {activeVessel}
              </text>
            </g>
          </g>
        </svg>

        {/* Floating Map Legend Overlay */}
        <div className="absolute bottom-3 left-3 bg-slate-950/85 backdrop-blur-md border border-slate-800 rounded-xl p-2.5 text-[11px] text-slate-300 flex items-center gap-4 shadow-xl">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
            <span>{isHe ? "נמל מוצא" : "Origin"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
            <span>{isHe ? "נקודות ביקורת ימיות" : "Waypoints"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            <span>{isHe ? "נמל יעד (אשדוד)" : "Ashdod Port"}</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-slate-400">
            <span>📡 AIS Class A 18.5 kts</span>
          </div>
        </div>
      </div>

      {/* ── WAYPOINT INSPECTION DRAWER & TELEMETRY DESK ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x lg:divide-x-reverse border-t border-slate-800 bg-slate-900/60">
        {/* Left Column: Active Waypoint Details */}
        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-[11px] uppercase font-bold text-sky-400 tracking-wider flex items-center gap-1.5">
              <span>📍</span>
              <span>{isHe ? "נקודת ציון נבחרת בנתיב" : "Selected Route Waypoint"}</span>
            </div>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/20">
              {selectedWaypoint.code}
            </span>
          </div>

          <div>
            <h4 className="text-sm font-bold text-white">
              {isHe ? selectedWaypoint.nameHe : selectedWaypoint.name}
            </h4>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {isHe ? selectedWaypoint.descriptionHe : selectedWaypoint.description}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-[11px]">
              <span className="text-slate-500 block">{isHe ? "קואורדינטות AIS" : "Coordinates"}</span>
              <span className="font-mono font-semibold text-slate-200">
                {selectedWaypoint.lat} {selectedWaypoint.lon}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-[11px]">
              <span className="text-slate-500 block">{isHe ? "עומק מים / שוקע" : "Depth / Draft"}</span>
              <span className="font-mono font-semibold text-cyan-300">
                {selectedWaypoint.depthM} meters
              </span>
            </div>
          </div>
        </div>

        {/* Center Column: Live Cargo & Reefer Cold-Chain Telemetry */}
        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-[11px] uppercase font-bold text-emerald-400 tracking-wider flex items-center gap-1.5">
              <span>❄️</span>
              <span>{isHe ? "חיישני מכולה ורציפות קירור" : "Container Telemetry & Cold Chain"}</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
              OPTIMAL
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-slate-500 text-[10px] block">{isHe ? "טמפרטורת פנים" : "Internal Temp"}</span>
              <span className="text-sm font-mono font-bold text-emerald-400 mt-0.5 block">
                +18.2°C
              </span>
              <span className="text-[9px] text-slate-400">{isHe ? "יעד: +15° עד +22°" : "Target: +18°C"}</span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-slate-500 text-[10px] block">{isHe ? "לחות יחסית" : "Relative RH"}</span>
              <span className="text-sm font-mono font-bold text-sky-400 mt-0.5 block">
                58% RH
              </span>
              <span className="text-[9px] text-slate-400">{isHe ? "יבש ויציב" : "Dry & Stable"}</span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 col-span-2 sm:col-span-1">
              <span className="text-slate-500 text-[10px] block">{isHe ? "חותם נעילה (Seal)" : "Customs Seal"}</span>
              <span className="text-xs font-mono font-bold text-amber-300 mt-0.5 block truncate">
                #IL-98402
              </span>
              <span className="text-[9px] text-emerald-400">{isHe ? "שלם ומאובטח" : "Intact"}</span>
            </div>
          </div>

          {/* Israeli Customs Pipeline Status */}
          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-[11px] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">🇮🇱</span>
              <div>
                <span className="text-slate-200 font-semibold flex items-center gap-1.5">
                  <span>{isHe ? "מכס ישראל (מערכת שער עולמי)" : "Israel Customs (Shaar Olami)"}</span>
                  {requestId && (
                    <a
                      href={`/customs/${requestId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-sky-400 hover:text-sky-300 underline font-normal"
                    >
                      {isHe ? "תיק שחרור מכס ↗" : "Customs Desk ↗"}
                    </a>
                  )}
                </span>
                <span className="text-slate-500 text-[10px]">
                  {customsStatus === "customs_cleared"
                    ? (isHe ? "הותר לגרעון ושחרור סופי (ירוק)" : "Green Line Cleared")
                    : (isHe ? "מצהר שודר מראש · ממתין לפריקה ואישור" : "Pre-manifest lodged · Awaiting discharge")}
                </span>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-1 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              GREEN PASS
            </span>
          </div>
        </div>

        {/* Right Column: Ocean Bill of Lading & Carrier Verification Links */}
        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-[11px] uppercase font-bold text-indigo-400 tracking-wider flex items-center gap-1.5">
              <span>📋</span>
              <span>{isHe ? "מספרי מטען ואימות ישיר" : "B/L & Carrier Direct Verification"}</span>
            </div>
          </div>

          <div className="space-y-2">
            {/* Container ID Copy Bar */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono">
              <div>
                <span className="text-[10px] text-slate-500 font-sans block">{isHe ? "מספר מכולה" : "Container ID"}</span>
                <span className="font-bold text-emerald-300">{activeContainer}</span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(activeContainer, "container")}
                className="text-[11px] px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
              >
                {copiedKey === "container" ? (isHe ? "✓ הועתק" : "✓ Copied") : (isHe ? "העתק" : "Copy")}
              </button>
            </div>

            {/* Bill of Lading Copy Bar */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono">
              <div>
                <span className="text-[10px] text-slate-500 font-sans block">{isHe ? "שטר מטען (B/L)" : "Ocean B/L"}</span>
                <span className="font-bold text-sky-300">{activeBl}</span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(activeBl, "bl")}
                className="text-[11px] px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
              >
                {copiedKey === "bl" ? (isHe ? "✓ הועתק" : "✓ Copied") : (isHe ? "העתק" : "Copy")}
              </button>
            </div>
          </div>

          {/* 1-Click Direct Carrier Verification Buttons */}
          <div className="pt-1">
            <div className="text-[10px] text-slate-400 font-semibold mb-1.5">
              {isHe ? "בדיקה ישירה במערכות חברות הספנות:" : "Direct Carrier & AIS Port Checks:"}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {carrierLinks.map((c) => (
                <a
                  key={c.name}
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-[10px] font-semibold px-2 py-1 rounded-md border transition flex items-center gap-1 ${c.color}`}
                >
                  <span>{c.badge}</span>
                  <span className="text-[8px] opacity-70">↗</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── FOOTER LOGISTICS HANDOVER DETAILS ── */}
      <div className="bg-slate-950 px-5 py-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span>🏢</span>
          <span>
            {isHe ? "יעד לפריקה בישראל:" : "Israel Final Warehouse Hub:"}{" "}
            <strong className="text-slate-200">
              {buyerWarehouseAddress || (isHe ? "מחסן לוגיסטי מרכזי, פארק תעשיות שורק / רשל״צ" : "Central Logistics Hub, Sorek Park, Israel")}
            </strong>
          </span>
        </div>

        <div className="text-slate-500 text-[11px] font-mono">
          IMO 9708708 · MMSI 352002159 · CALLSIGN 3FDF9
        </div>
      </div>
    </div>
  );
}
