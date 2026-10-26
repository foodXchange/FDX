/**
 * Live Maritime AIS Vessel Radar & Port of Ashdod Anchorage Telemetry Engine
 * Tracks Mediterranean container vessels sailing from European loading ports
 * (Valencia, Genoa, Naples, Piraeus) to Ashdod Port (ILASH Pier 21).
 * Features automated 12-Nautical-Mile (12NM) Israeli Territorial Waters customs trigger.
 */

export interface AisVesselRecord {
  id: string;
  vesselName: string;
  imo: string;
  mmsi: string;
  callSign: string;
  flag: string;
  shippingLine: string;
  voyageNumber: string;
  
  departurePort: {
    code: string;
    name: string;
    country: string;
    departedAt: string;
  };
  
  destinationPort: {
    code: string;
    name: string;
    terminal: string;
    berth: string;
    eta: string;
  };
  
  // Real-time navigation telemetry
  currentCoordinates: {
    lat: number;
    lng: number;
    formatted: string;
  };
  speedKnots: number;
  speedKmh: number;
  headingDegrees: number;
  nauticalMilesRemaining: number;
  totalRouteNauticalMiles: number;
  progressPercent: number;
  
  // Sea and weather
  seaCondition: {
    waveHeightMeters: number;
    windSpeedKnots: number;
    windDirection: string;
    waterTempCelsius: number;
    visibilityKm: number;
  };
  
  // Milestones & Customs Trigger
  currentMilestone:
    | "departed_pol"
    | "western_med"
    | "strait_of_sicily"
    | "eastern_med"
    | "approaching_12nm"
    | "within_12nm_territorial"
    | "ashdod_anchorage"
    | "berthed_pier21";
  
  territorialBoundaryCrossed: boolean;
  customsTriggerStatus: "pending" | "alert_dispatched" | "green_lane_cleared";
  
  // Associated Cargo on-board
  associatedCargo: {
    requestId: string;
    poNumber: string;
    buyerCompany: string;
    supplierName: string;
    productName: string;
    orderVolume: string;
    containerNumber: string;
    billOfLading: string;
    customsDeclarationNumber: string;
    clearingAgent: string;
  };
}

export interface AshdodPortQueueTelemetry {
  portCode: string;
  portName: string;
  vesselsAtAnchorage: number;
  averageAnchorageWaitHours: number;
  activeContainerGantries: number;
  pier21Status: "available" | "berthed" | "scheduled";
  pilotBoatStatus: "active" | "standby";
  weatherCondition: string;
  waterDepthMeters: number;
}

export const ASHDOD_PORT_TELEMETRY: AshdodPortQueueTelemetry = {
  portCode: "ILASH",
  portName: "Ashdod Port (נמל אשדוד)",
  vesselsAtAnchorage: 3,
  averageAnchorageWaitHours: 1.8,
  activeContainerGantries: 4,
  pier21Status: "available",
  pilotBoatStatus: "active",
  weatherCondition: "Clear skies, Wind NW 11 kts, Swell 0.7m",
  waterDepthMeters: 16.5,
};

export const LIVE_VESSELS_DATABASE: Record<string, AisVesselRecord> = {
  msc_leanne: {
    id: "msc_leanne",
    vesselName: "MSC LEANNE",
    imo: "9845102",
    mmsi: "352001928",
    callSign: "3FBN4",
    flag: "Panama 🇵🇦",
    shippingLine: "MSC (Mediterranean Shipping Company)",
    voyageNumber: "2604E",
    departurePort: {
      code: "ESVLC",
      name: "Valencia Container Terminal",
      country: "Spain",
      departedAt: "2026-10-18T14:30:00Z",
    },
    destinationPort: {
      code: "ILASH",
      name: "Ashdod Port",
      terminal: "Terminal 1 (Bonded Yard)",
      berth: "Pier 21 (Dedicated Container Crane 04)",
      eta: "2026-10-26T11:45:00Z",
    },
    currentCoordinates: {
      lat: 31.895,
      lng: 34.421,
      formatted: "31°53'42\"N 34°25'15\"E",
    },
    speedKnots: 17.8,
    speedKmh: 33.0,
    headingDegrees: 104,
    nauticalMilesRemaining: 14.2,
    totalRouteNauticalMiles: 1780,
    progressPercent: 99.2,
    seaCondition: {
      waveHeightMeters: 0.8,
      windSpeedKnots: 12,
      windDirection: "WNW",
      waterTempCelsius: 22.4,
      visibilityKm: 16,
    },
    currentMilestone: "approaching_12nm",
    territorialBoundaryCrossed: false,
    customsTriggerStatus: "pending",
    associatedCargo: {
      requestId: "sample-deal-1",
      poNumber: "FDX-PO-881920",
      buyerCompany: "שופרסל בע״מ (Shufersal)",
      supplierName: "Aceites del Sur Foods S.A. (Spain)",
      productName: "שמן זית כתית מעולה 1 ליטר (Extra Virgin Olive Oil 1L)",
      orderVolume: "24,000 בקבוקים (24 משטחי EPAL)",
      containerNumber: "MSKU-9481029",
      billOfLading: "MSCUVAL881920",
      customsDeclarationNumber: "IL-2604-881920",
      clearingAgent: "אלון ברקוביץ' (ד.ס.ו שילוח ועמילות מכס)",
    },
  },

  maersk_mckinney: {
    id: "maersk_mckinney",
    vesselName: "MAERSK MC-KINNEY MOLLER",
    imo: "9619907",
    mmsi: "219018271",
    callSign: "OWIZ2",
    flag: "Denmark 🇩🇰",
    shippingLine: "Maersk Line (A.P. Møller – Mærsk)",
    voyageNumber: "2605E",
    departurePort: {
      code: "ITGOA",
      name: "Genoa Pra' Container Terminal",
      country: "Italy",
      departedAt: "2026-10-19T08:00:00Z",
    },
    destinationPort: {
      code: "ILASH",
      name: "Ashdod Port",
      terminal: "Terminal 1",
      berth: "Pier 21 (Discharging Active)",
      eta: "2026-10-25T18:00:00Z",
    },
    currentCoordinates: {
      lat: 31.831,
      lng: 34.648,
      formatted: "31°49'51\"N 34°38'52\"E (Berthed)",
    },
    speedKnots: 0.0,
    speedKmh: 0.0,
    headingDegrees: 180,
    nauticalMilesRemaining: 0.0,
    totalRouteNauticalMiles: 1540,
    progressPercent: 100.0,
    seaCondition: {
      waveHeightMeters: 0.4,
      windSpeedKnots: 8,
      windDirection: "N",
      waterTempCelsius: 23.1,
      visibilityKm: 20,
    },
    currentMilestone: "berthed_pier21",
    territorialBoundaryCrossed: true,
    customsTriggerStatus: "green_lane_cleared",
    associatedCargo: {
      requestId: "sample-deal-2",
      poNumber: "FDX-PO-942100",
      buyerCompany: "רמי לוי שיווק השקמה (Rami Levy)",
      supplierName: "Pastificio Campano S.p.A. (Italy)",
      productName: "פסטה 100% חיטת דורום במשיכת ברונזה 500 גרם",
      orderVolume: "48,000 חבילות (24 משטחי EPAL)",
      containerNumber: "MRKU-8819201",
      billOfLading: "MAEU88192010",
      customsDeclarationNumber: "IL-2604-942100",
      clearingAgent: "פריץ קומפניז שילוח בינלאומי",
    },
  },

  zim_luanda: {
    id: "zim_luanda",
    vesselName: "ZIM LUANDA",
    imo: "9481234",
    mmsi: "636018912",
    callSign: "A8YF9",
    flag: "Liberia 🇱🇷",
    shippingLine: "ZIM Integrated Shipping Services",
    voyageNumber: "2606E",
    departurePort: {
      code: "ITNAP",
      name: "Naples Port Conateco Terminal",
      country: "Italy",
      departedAt: "2026-10-22T19:00:00Z",
    },
    destinationPort: {
      code: "ILASH",
      name: "Ashdod Port",
      terminal: "Terminal 1",
      berth: "Pier 21 (Scheduled)",
      eta: "2026-10-28T06:00:00Z",
    },
    currentCoordinates: {
      lat: 33.621,
      lng: 26.841,
      formatted: "33°37'15\"N 26°50'27\"E",
    },
    speedKnots: 19.4,
    speedKmh: 35.9,
    headingDegrees: 108,
    nauticalMilesRemaining: 432.0,
    totalRouteNauticalMiles: 1320,
    progressPercent: 67.2,
    seaCondition: {
      waveHeightMeters: 1.4,
      windSpeedKnots: 16,
      windDirection: "W",
      waterTempCelsius: 21.8,
      visibilityKm: 14,
    },
    currentMilestone: "eastern_med",
    territorialBoundaryCrossed: false,
    customsTriggerStatus: "pending",
    associatedCargo: {
      requestId: "sample-deal-3",
      poNumber: "FDX-PO-773300",
      buyerCompany: "קרפור ישראל (Carrefour IL)",
      supplierName: "Consorzio Pomodoro Puglia S.c.a. (Italy)",
      productName: "מחית עגבניות כפרית פאסאטה 700 גרם",
      orderVolume: "36,000 בקבוקים (24 משטחי EPAL)",
      containerNumber: "ZIMU-3381920",
      billOfLading: "ZIMUNAP77330",
      customsDeclarationNumber: "IL-2604-773300",
      clearingAgent: "עמית שילוח ועמילות מכס",
    },
  },
};
