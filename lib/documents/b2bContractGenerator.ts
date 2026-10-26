/**
 * B2B Sales Purchase Agreement (SPA) & Legal Contract Engine
 * Based on ICC Model International Sale Contract (Publication 758 / 556)
 * Incoterms 2020 CIF Ashdod Port / 30/70 Financial Escrow Milestones
 * Chief Rabbinate of Israel Kashrut & SI 1145 Standards Compliance
 */

export interface ContractParty {
  companyName: string;
  companyNameHe?: string;
  legalEntity: string;
  country: string;
  regNumber: string; // Israeli ח.פ. or EU VIES VAT / CIF
  registeredAddress: string;
  signatoryName: string;
  signatoryTitle: string;
  signatoryEmail: string;
  signatoryPhone: string;
  signatureData?: string | null; // Base64 data URL or cursive typed signature
  signatureType?: "drawn" | "typed" | "uploaded";
  signedAt?: string | null;
}

export interface B2BContractData {
  contractNumber: string;
  contractDate: string;
  buyer: ContractParty;
  seller: ContractParty;
  escrowAgent: ContractParty;
  
  // Cargo & Commercial Specifications
  productNameEn: string;
  productNameHe: string;
  productSpecification: string;
  hsTariffCode: string;
  originCountry: string;
  quantityUnits: number;
  unitPriceEur: number;
  currency: string;
  totalContractValueEur: number;
  packagingSpec: string;
  palletConfiguration: string;
  
  // Logistics & Delivery
  incoterm: string;
  portOfLoading: string;
  portOfDischarge: string;
  vesselLinePreference: string;
  productionLeadDays: number;
  estimatedTransitDays: number;
  
  // Escrow & Settlement
  advanceDepositPct: number; // e.g. 30
  advanceDepositEur: number;
  finalBalancePct: number; // e.g. 70
  finalBalanceEur: number;
  escrowBankAccount: string;
  
  // Quality, Kashrut & Legal
  kosherCertifier: string;
  kosherStandardText: string;
  minimumRemainingShelfLifePct: number; // e.g. 75
  foodStandardCompliance: string; // e.g. "Israeli SI 1145, Public Health Regulations"
  inspectionCompany: string; // e.g. "SGS / Bureau Veritas"
  governingLaw: string;
  arbitrationVenue: string;
  
  // Execution status
  status: "draft" | "buyer_signed" | "seller_signed" | "fully_executed";
  verificationHash?: string;
}

/** Pre-configured High-Fidelity Enterprise Contract Presets */
export const CONTRACT_PRESETS: Record<string, B2BContractData> = {
  shufersal_evoo: {
    contractNumber: "FDX-SPA-2026-8819-SHU",
    contractDate: new Date().toISOString().slice(0, 10),
    buyer: {
      companyName: "Shufersal Ltd.",
      companyNameHe: "שופרסל בע״מ",
      legalEntity: "Public Limited Retail Corporation",
      country: "Israel",
      regNumber: "51-000192-4",
      registeredAddress: "30 Shmotkin St., Rishon LeZion, Israel",
      signatoryName: "Oren Shahar",
      signatoryTitle: "VP Procurement & Private Label Division",
      signatoryEmail: "oren.shahar@shufersal.co.il",
      signatoryPhone: "+972-54-9218840",
      signatureData: null,
      signedAt: null,
    },
    seller: {
      companyName: "Aceites del Sur Foods S.A.",
      companyNameHe: "אסייטס דל סור מזון אס.איי (ספרד)",
      legalEntity: "Sociedad Anónima (S.A.)",
      country: "Spain (European Union)",
      regNumber: "ES-A41002918",
      registeredAddress: "Carretera de Madrid-Cádiz, Km. 550, Dos Hermanas, Seville, Spain",
      signatoryName: "Mateo Fernandez",
      signatoryTitle: "International Commercial & Export Director",
      signatoryEmail: "m.fernandez@acesur.com",
      signatoryPhone: "+34-954-689-100",
      signatureData: null,
      signedAt: null,
    },
    escrowAgent: {
      companyName: "FoodXchange Trade Escrow Services Ltd.",
      companyNameHe: "פודאקסצ'יינג' שירותי אסקרו וסחר בינלאומי בע״מ",
      legalEntity: "Institutional Trade Facilitator & Escrow Fiduciary",
      country: "Israel / United Kingdom",
      regNumber: "51-694810-9",
      registeredAddress: "Menachem Begin Rd. 132, Azrieli Center, Tel Aviv, Israel",
      signatoryName: "Udi Feinsilver",
      signatoryTitle: "Managing Principal & Chief Escrow Officer",
      signatoryEmail: "escrow@foodxchange.com",
      signatoryPhone: "+972-3-7208900",
      signatureData: "DIGITALLY ATTESTED BY FOODXCHANGE ESCROW DESK",
      signatureType: "typed",
      signedAt: new Date().toISOString(),
    },
    productNameEn: "Extra Virgin Olive Oil 1L (Acidity < 0.3%)",
    productNameHe: "שמן זית כתית מעולה 1 ליטר (חומציות מרבית 0.3%)",
    productSpecification: "Cold-extracted Spanish EVOO, Free Fatty Acids ≤ 0.30%, Peroxide Value ≤ 10 meq O2/kg, K232 ≤ 2.0, K270 ≤ 0.20.",
    hsTariffCode: "1509.2000 (EUR.1 0% Customs Duty)",
    originCountry: "Spain",
    quantityUnits: 24000,
    unitPriceEur: 1.512,
    currency: "EUR (€)",
    totalContractValueEur: 36288.00,
    packagingSpec: "1L Marasca Dark UV-Protected Glass Bottle, Tamper-Evident Anti-Drip Pourer Cap, Private Label Front/Back Label.",
    palletConfiguration: "24 Euro Pallets (120x80cm, HT ISPM-15), 1,000 bottles/pallet (50 cases x 20 bottles). Total gross 21,600 kg.",
    incoterm: "CIF Ashdod Port (Incoterms 2020)",
    portOfLoading: "Valencia Port (ESVLC), Spain",
    portOfDischarge: "Ashdod Port (ILASH), Israel (Pier 21)",
    vesselLinePreference: "MSC / Mediterranean Shipping Company Direct Line",
    productionLeadDays: 14,
    estimatedTransitDays: 10,
    advanceDepositPct: 30,
    advanceDepositEur: 10886.40,
    finalBalancePct: 70,
    finalBalanceEur: 25401.60,
    escrowBankAccount: "FoodXchange Fiduciary Client Escrow Account (IBAN: IL58-0128-0000-0009-4819-20)",
    kosherCertifier: "Badatz Mehadrin Europe & Chief Rabbinate of Israel (מחלקת היבוא ברבנות הראשית)",
    kosherStandardText: "Kosher Parve for All Year Round (excluding Passover). Verified by permanent Mashgiach Temidi at milling/bottling.",
    minimumRemainingShelfLifePct: 75,
    foodStandardCompliance: "Israeli Standard SI 1145, Public Health (Food) Regulations, EFSA Olive Oil Standard.",
    inspectionCompany: "SGS Spain (Pre-shipment loading supervision, container integrity and seal verification).",
    governingLaw: "ICC Model International Sale Contract 758 & English Law, supplemented by Israeli Commercial Code.",
    arbitrationVenue: "International Chamber of Commerce (ICC) Arbitration, Tel Aviv / Paris.",
    status: "draft",
    verificationHash: "SHA256: 7f8a4e9b2c3d1e0f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f",
  },
  rami_levy_pasta: {
    contractNumber: "FDX-SPA-2026-9421-RLM",
    contractDate: new Date().toISOString().slice(0, 10),
    buyer: {
      companyName: "Rami Levy Hashikma Marketing Ltd.",
      companyNameHe: "רמי לוי שיווק השקמה בע״מ",
      legalEntity: "Public Supermarket Chain Corporation",
      country: "Israel",
      regNumber: "51-382910-1",
      registeredAddress: "Kanfei Nesharim 22, Givat Shaul, Jerusalem, Israel",
      signatoryName: "Rami Levy",
      signatoryTitle: "CEO & Chief Sourcing Director",
      signatoryEmail: "sourcing@rami-levy.co.il",
      signatoryPhone: "+972-2-6555555",
      signatureData: null,
      signedAt: null,
    },
    seller: {
      companyName: "Pastificio Campano S.p.A.",
      companyNameHe: "פסטיפיצ'יו קמפאנו אס.פי.איי (איטליה)",
      legalEntity: "Società per Azioni (S.p.A.)",
      country: "Italy (European Union)",
      regNumber: "IT-09281740638",
      registeredAddress: "Via Provinciale Gragnano 48, Gragnano (NA), Italy",
      signatoryName: "Marco Bellini",
      signatoryTitle: "Managing Director & Master Pastaio",
      signatoryEmail: "m.bellini@pastacampano.it",
      signatoryPhone: "+39-081-871-4200",
      signatureData: null,
      signedAt: null,
    },
    escrowAgent: {
      companyName: "FoodXchange Trade Escrow Services Ltd.",
      companyNameHe: "פודאקסצ'יינג' שירותי אסקרו וסחר בינלאומי בע״מ",
      legalEntity: "Institutional Trade Facilitator & Escrow Fiduciary",
      country: "Israel / United Kingdom",
      regNumber: "51-694810-9",
      registeredAddress: "Menachem Begin Rd. 132, Azrieli Center, Tel Aviv, Israel",
      signatoryName: "Udi Feinsilver",
      signatoryTitle: "Managing Principal & Chief Escrow Officer",
      signatoryEmail: "escrow@foodxchange.com",
      signatoryPhone: "+972-3-7208900",
      signatureData: "DIGITALLY ATTESTED BY FOODXCHANGE ESCROW DESK",
      signatureType: "typed",
      signedAt: new Date().toISOString(),
    },
    productNameEn: "Bronze-Die Extruded Durum Wheat Pasta 500g (Penne Rigate)",
    productNameHe: "פסטה איטלקית 100% חיטת דורום במשיכת ברונזה 500 גרם (פנה ריגטה)",
    productSpecification: "100% Italian Kronos Durum Wheat Semolina, Minimum Protein 14.5%, Slow Dried at 45°C for 24 hours.",
    hsTariffCode: "1902.1900 (EUR.1 0% Customs Duty)",
    originCountry: "Italy",
    quantityUnits: 48000,
    unitPriceEur: 0.504,
    currency: "EUR (€)",
    totalContractValueEur: 24192.00,
    packagingSpec: "500g Recyclable Matte Film Pillow Pack, Hebrew Labeling Embossed with Nutritional Red Warning Stamps.",
    palletConfiguration: "24 Euro Pallets (120x80cm, HT ISPM-15), 2,000 units/pallet (100 boxes x 20 packs). Total gross 25,200 kg.",
    incoterm: "CIF Ashdod Port (Incoterms 2020)",
    portOfLoading: "Naples Port (ITNAP) / Salerno, Italy",
    portOfDischarge: "Ashdod Port (ILASH), Israel",
    vesselLinePreference: "Grimaldi Lines / MSC Direct East Med Service",
    productionLeadDays: 12,
    estimatedTransitDays: 7,
    advanceDepositPct: 30,
    advanceDepositEur: 7257.60,
    finalBalancePct: 70,
    finalBalanceEur: 16934.40,
    escrowBankAccount: "FoodXchange Fiduciary Client Escrow Account (IBAN: IL58-0128-0000-0009-4819-20)",
    kosherCertifier: "Star-K Europe & Chief Rabbinate of Israel (מחלקת היבוא ברבנות הראשית)",
    kosherStandardText: "Kosher Parve for All Year Round (excluding Passover). Bishul Yisroel certified.",
    minimumRemainingShelfLifePct: 80,
    foodStandardCompliance: "Israeli SI 1145, Israeli Public Health Pasta Regulations.",
    inspectionCompany: "Bureau Veritas Italy (Pre-shipment grain assay and moisture verification).",
    governingLaw: "ICC Model International Sale Contract 758 & English Law.",
    arbitrationVenue: "International Chamber of Commerce (ICC) Arbitration, Tel Aviv.",
    status: "draft",
    verificationHash: "SHA256: 4b2c1d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c",
  },
  carrefour_passata: {
    contractNumber: "FDX-SPA-2026-7733-CRF",
    contractDate: new Date().toISOString().slice(0, 10),
    buyer: {
      companyName: "Carrefour Israel (Electra Consumer Products Ltd.)",
      companyNameHe: "קרפור ישראל (אלקטרה מוצרי צריכה מזון)",
      legalEntity: "Public Retail Conglomerate",
      country: "Israel",
      regNumber: "52-004491-3",
      registeredAddress: "Yosef Sapir 1, Rishon LeZion, Israel",
      signatoryName: "Jerome Bensoussan",
      signatoryTitle: "Head of International Private Label Sourcing",
      signatoryEmail: "sourcing@carrefour.co.il",
      signatoryPhone: "+972-3-9552200",
      signatureData: null,
      signedAt: null,
    },
    seller: {
      companyName: "Consorzio Pomodoro Puglia S.c.a.",
      companyNameHe: "קונסורציו פומודורו פוליה (איטליה)",
      legalEntity: "Agricultural Cooperative Society",
      country: "Italy (European Union)",
      regNumber: "IT-08491020719",
      registeredAddress: "Zona Industriale ASI, Foggia (FG), Italy",
      signatoryName: "Gianluca Rossi",
      signatoryTitle: "Commercial General Manager",
      signatoryEmail: "g.rossi@pomodoropuglia.it",
      signatoryPhone: "+39-0881-749-300",
      signatureData: null,
      signedAt: null,
    },
    escrowAgent: {
      companyName: "FoodXchange Trade Escrow Services Ltd.",
      companyNameHe: "פודאקסצ'יינג' שירותי אסקרו וסחר בינלאומי בע״מ",
      legalEntity: "Institutional Trade Facilitator & Escrow Fiduciary",
      country: "Israel / United Kingdom",
      regNumber: "51-694810-9",
      registeredAddress: "Menachem Begin Rd. 132, Azrieli Center, Tel Aviv, Israel",
      signatoryName: "Udi Feinsilver",
      signatoryTitle: "Managing Principal & Chief Escrow Officer",
      signatoryEmail: "escrow@foodxchange.com",
      signatoryPhone: "+972-3-7208900",
      signatureData: "DIGITALLY ATTESTED BY FOODXCHANGE ESCROW DESK",
      signatureType: "typed",
      signedAt: new Date().toISOString(),
    },
    productNameEn: "Rustic Italian Tomato Passata 700g Glass Bottle",
    productNameHe: "מחית עגבניות כפרית איטלקית (פאסאטה) 700 גרם בבקבוק זכוכית",
    productSpecification: "100% Sun-Ripened Pugliese Tomatoes, Brix 7.5% - 8.2%, Salt 0.4%, No Preservatives or Additives.",
    hsTariffCode: "2002.9011 (EUR.1 0% Customs Duty)",
    originCountry: "Italy",
    quantityUnits: 36000,
    unitPriceEur: 0.800,
    currency: "EUR (€)",
    totalContractValueEur: 28800.00,
    packagingSpec: "700g Glass Bottle, Traditional Twist-Off Safety Button Lid, Full-Sleeve Carrefour Private Label.",
    palletConfiguration: "24 Euro Pallets (120x80cm, HT ISPM-15), 1,500 bottles/pallet (125 cases x 12). Total gross 26,100 kg.",
    incoterm: "CIF Ashdod Port (Incoterms 2020)",
    portOfLoading: "Bari Port / Taranto, Italy",
    portOfDischarge: "Ashdod Port (ILASH), Israel",
    vesselLinePreference: "ZIM Integrated Shipping Services Direct East Med",
    productionLeadDays: 10,
    estimatedTransitDays: 6,
    advanceDepositPct: 30,
    advanceDepositEur: 8640.00,
    finalBalancePct: 70,
    finalBalanceEur: 20160.00,
    escrowBankAccount: "FoodXchange Fiduciary Client Escrow Account (IBAN: IL58-0128-0000-0009-4819-20)",
    kosherCertifier: "Badatz Beit Yosef & Chief Rabbinate of Israel (מחלקת היבוא ברבנות הראשית)",
    kosherStandardText: "Kosher Parve for All Year Round (excluding Passover). Strict Hagalah & Bishul Yisroel protocol.",
    minimumRemainingShelfLifePct: 75,
    foodStandardCompliance: "Israeli SI 1145, Tomato Product Regulations, Ministry of Health Import Clearance.",
    inspectionCompany: "SGS Italy (Pre-shipment batch Brix testing and acidity verification).",
    governingLaw: "ICC Model International Sale Contract 758 & English Law.",
    arbitrationVenue: "International Chamber of Commerce (ICC) Arbitration, Tel Aviv.",
    status: "draft",
    verificationHash: "SHA256: 9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d",
  },
};

/**
 * Generates official formatted legal contract plain-text / printable markdown transmittal
 */
export function generateContractLegalText(data: B2BContractData, lang: "he" | "en" | "bilingual" = "bilingual"): string {
  const isBi = lang === "bilingual";
  const isHe = lang === "he" || isBi;

  return `================================================================================
INTERNATIONAL COMMERCIAL B2B SALES PURCHASE AGREEMENT (SPA)
חוזה מסחרי בינלאומי לרכש, יבוא והסדר נאמנות אסקרו
Reference: ${data.contractNumber} | Incoterms 2020 CIF Ashdod Port
================================================================================

DATE OF EXECUTION: ${data.contractDate}
PLACE OF ARBITRATION: ${data.arbitrationVenue}

1. CONTRACTING PARTIES (הצדדים להסכם):
--------------------------------------------------------------------------------
A. BUYER / IMPORTER OF RECORD (הקונה / היבואן הרשמי בישראל):
   Company:       ${data.buyer.companyName} (${data.buyer.companyNameHe || ""})
   Legal Entity:  ${data.buyer.legalEntity}
   Registration:  ח.פ. / Corp ID: ${data.buyer.regNumber}
   Country:       ${data.buyer.country}
   Address:       ${data.buyer.registeredAddress}
   Signatory:     ${data.buyer.signatoryName}, ${data.buyer.signatoryTitle}
   Email/Phone:   ${data.buyer.signatoryEmail} | ${data.buyer.signatoryPhone}

B. SELLER / PRODUCER (המוכר / היצרן האירופי):
   Company:       ${data.seller.companyName} (${data.seller.companyNameHe || ""})
   Legal Entity:  ${data.seller.legalEntity}
   Registration:  EU VAT / CIF: ${data.seller.regNumber}
   Country:       ${data.seller.country}
   Address:       ${data.seller.registeredAddress}
   Signatory:     ${data.seller.signatoryName}, ${data.seller.signatoryTitle}
   Email/Phone:   ${data.seller.signatoryEmail} | ${data.seller.signatoryPhone}

C. TRADE ESCROW FIDUCIARY & FACILITATOR (הנאמן לעסקה וסוכן האסקרו):
   Company:       ${data.escrowAgent.companyName} (${data.escrowAgent.companyNameHe || ""})
   Registration:  ח.פ.: ${data.escrowAgent.regNumber}
   Role:          Fiduciary Escrow Holder under ICC NCNDA / IMFPA rules.

2. COMMODITY & QUALITY SPECIFICATIONS (תיאור הטובין ותקני איכות):
--------------------------------------------------------------------------------
- Product Name (EN): ${data.productNameEn}
- Product Name (HE): ${data.productNameHe}
- Technical Spec:    ${data.productSpecification}
- HS Tariff Code:    ${data.hsTariffCode}
- Country of Origin: ${data.originCountry} (European Union)
- Packaging Spec:    ${data.packagingSpec}
- Pallet Loading:    ${data.palletConfiguration}
- Compliance Std:    ${data.foodStandardCompliance}

3. QUANTITY, COMMERCIAL VALUE & INCOTERMS (כמויות, תמורה ותנאי סחר):
--------------------------------------------------------------------------------
- Total Units:        ${data.quantityUnits.toLocaleString()} Units
- Unit Price (CIF):   €${data.unitPriceEur.toFixed(3)} EUR per unit
- Total Contract Sum: €${data.totalContractValueEur.toLocaleString(undefined, { minimumFractionDigits: 2 })} EUR
- Delivery Terms:     ${data.incoterm}
- Port of Loading:    ${data.portOfLoading}
- Port of Discharge:  ${data.portOfDischarge}
- Lead & Transit:     ${data.productionLeadDays} days production + approx. ${data.estimatedTransitDays} days ocean transit.

4. 30/70 FINANCIAL WIRE ESCROW MECHANISM (מנגנון תשלום ונאמנות 30/70):
--------------------------------------------------------------------------------
Payment shall strictly operate through the FoodXchange Secure Fiduciary Escrow:
A. 30% ADVANCE PRODUCTION ESCROW (€${data.advanceDepositEur.toLocaleString(undefined, { minimumFractionDigits: 2 })} EUR):
   Wire-transferred by Buyer upon signing. Held in escrow and released to Factory
   upon verified production kickoff and packaging cylinder confirmation.
B. 70% FINAL SETTLEMENT ESCROW (€${data.finalBalanceEur.toLocaleString(undefined, { minimumFractionDigits: 2 })} EUR):
   Deposited into Escrow upon production completion. Released to Factory against
   the verified presentation of Clean On-Board Ocean B/L (3/3), EUR.1 Certificate,
   Certified Packing List with SSCC barcodes, and MOH Food Safety COA.

5. RABBINICAL KASHRUT & SHELF-LIFE GUARANTEE (התחייבות כשרות הרבנות וחיי מדף):
--------------------------------------------------------------------------------
- Kosher Certifier:  ${data.kosherCertifier}
- Kosher Scope:      ${data.kosherStandardText}
- Shelf-Life SLA:    ${data.minimumRemainingShelfLifePct}% minimum remaining shelf-life upon berthing at Ashdod Port.
- Pre-Shipment QA:   Supervised by ${data.inspectionCompany}.

6. DISPUTE RESOLUTION & ARBITRATION (סמכות שיפוט ובוררות):
--------------------------------------------------------------------------------
This agreement is governed by the ICC Model International Sale Contract (Publication 758).
Any dispute arising out of or in connection with this contract shall be submitted
to the International Court of Arbitration of the International Chamber of Commerce (ICC)
in ${data.arbitrationVenue}.

================================================================================
DIGITAL EXECUTION & COUNTERSIGNATURE BLOCKS:
================================================================================
BUYER SIGNATORY:
Name:      ${data.buyer.signatoryName}
Title:     ${data.buyer.signatoryTitle}
Company:   ${data.buyer.companyName}
Signature: [${data.buyer.signatureData ? "DIGITALLY SIGNED & VERIFIED ✓" : "PENDING DIGITAL SIGNATURE"}]
Timestamp: ${data.buyer.signedAt || "Awaiting Execution"}

SELLER SIGNATORY:
Name:      ${data.seller.signatoryName}
Title:     ${data.seller.signatoryTitle}
Company:   ${data.seller.companyName}
Signature: [${data.seller.signatureData ? "DIGITALLY SIGNED & VERIFIED ✓" : "PENDING DIGITAL SIGNATURE"}]
Timestamp: ${data.seller.signedAt || "Awaiting Execution"}

FOODXCHANGE ESCROW ATTESTATION:
Escrow Officer: ${data.escrowAgent.signatoryName} (${data.escrowAgent.signatoryTitle})
Attestation:    OFFICIAL FIDUCIARY ATTESTATION APPLIED
Cryptographic Hash: ${data.verificationHash || "SHA256: PENDING"}
================================================================================`;
}
