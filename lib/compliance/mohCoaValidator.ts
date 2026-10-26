/**
 * Israeli Ministry of Health (MOH / שירות המזון הארצי) Automated COA Assay Compliance Checker
 * Audits European Laboratory Certificates of Analysis (COA) against mandatory Israeli standards:
 * - SI 1145 (Marking of Prepackaged Food)
 * - SI 191 (Olive Oil Quality & Authenticity)
 * - SI 786 & SI 143 (Grain, Pasta, and Canned Vegetables)
 * - Public Health Regulations (Food Contaminants, Maximum Allowable Residue Limits & Heavy Metals)
 */

export type AssayCategory = "microbiology" | "heavy_metals" | "pesticides" | "chemistry";

export type AssayStatus = "PASS" | "WARN" | "FAIL";

export type OverallVerdict = "GREEN_PASS_APPROVED" | "CONDITIONAL_RETEST_REQUIRED" | "MOH_REJECT_STOP_ORDER";

export interface AssayParameter {
  id: string;
  category: AssayCategory;
  nameEn: string;
  nameHe: string;
  testedValue: number | string;
  unit: string;
  maxLimit?: number;
  minLimit?: number;
  expectedString?: string;
  standardCitation: string;
  status: AssayStatus;
  noteEn?: string;
  noteHe?: string;
}

export interface CoaSamplePreset {
  id: string;
  supplierName: string;
  originCountry: string;
  productNameEn: string;
  productNameHe: string;
  category: "olive_oil" | "pasta" | "tomato_passata" | "olives";
  labName: string;
  labIso17025Accreditation: string;
  batchNumber: string;
  productionDate: string;
  expiryDate: string;
  customsHsCode: string;
  parameters: AssayParameter[];
}

export interface CoaValidationReport {
  presetId: string;
  supplierName: string;
  productNameEn: string;
  productNameHe: string;
  batchNumber: string;
  labName: string;
  labAccreditation: string;
  customsHsCode: string;
  verdict: OverallVerdict;
  complianceScorePct: number; // 0 to 100
  totalAssays: number;
  passedAssays: number;
  warningAssays: number;
  failedAssays: number;
  failedItems: AssayParameter[];
  certificateRefNumber: string;
  digitalSealHash: string;
  timestamp: string;
  regulatoryCitations: string[];
}

// Default Presets
export const COA_SAMPLE_PRESETS: Record<string, CoaSamplePreset> = {
  spanish_evoo_compliant: {
    id: "spanish_evoo_compliant",
    supplierName: "Aceites del Sur-Coosur S.A.",
    originCountry: "Spain (ES)",
    productNameEn: "Spanish Extra Virgin Olive Oil 1L (Acidity < 0.3%)",
    productNameHe: "שמן זית כתית מעולה 1 ליטר (חומציות מרבית 0.3%)",
    category: "olive_oil",
    labName: "Eurofins Food & Agro Testing Sevilla (ISO/IEC 17025 accredited)",
    labIso17025Accreditation: "ENAC / ISO-17025 Cert #442/LE912",
    batchNumber: "LOT-ES2026-EVOO-0884",
    productionDate: "2026-09-15",
    expiryDate: "2028-09-15",
    customsHsCode: "1509.20.0000",
    parameters: [
      // Chemistry
      {
        id: "acidity",
        category: "chemistry",
        nameEn: "Free Fatty Acidity (as Oleic Acid %)",
        nameHe: "חומציות שומן חופשי (במונחי חומצה אולאית %)",
        testedValue: 0.24,
        unit: "%",
        maxLimit: 0.80,
        standardCitation: "ת״י 191 / IOC Trade Standard",
        status: "PASS",
        noteEn: "Optimal premium grade (< 0.30%)",
        noteHe: "איכות פרימיום מעולה (נמוך מ-0.30%)",
      },
      {
        id: "peroxide_value",
        category: "chemistry",
        nameEn: "Peroxide Value",
        nameHe: "ערך פראוקסיד (חמצון ראשוני)",
        testedValue: 6.8,
        unit: "meq O2/kg",
        maxLimit: 20.0,
        standardCitation: "ת״י 191 סעיף 4.2",
        status: "PASS",
        noteEn: "Fresh unoxidized oil (< 10.0 meq)",
        noteHe: "שמן טרי ללא חמצון ראשוני",
      },
      {
        id: "k232",
        category: "chemistry",
        nameEn: "Extinction Coefficient K232",
        nameHe: "בליעה באולטרה סגול K232",
        testedValue: 1.82,
        unit: "abs",
        maxLimit: 2.50,
        standardCitation: "ת״י 191 סעיף 4.3",
        status: "PASS",
      },
      {
        id: "k268",
        category: "chemistry",
        nameEn: "Extinction Coefficient K268",
        nameHe: "בליעה באולטרה סגול K268",
        testedValue: 0.14,
        unit: "abs",
        maxLimit: 0.22,
        standardCitation: "ת״י 191 סעיף 4.3",
        status: "PASS",
      },
      // Microbiology
      {
        id: "salmonella",
        category: "microbiology",
        nameEn: "Salmonella spp.",
        nameHe: "סלמונלה (Salmonella spp.)",
        testedValue: "Not Detected",
        unit: "in 25g",
        expectedString: "Not Detected",
        standardCitation: "תקנות בריאות הציבור (מזון) (בקרת מיקרואורגניזמים)",
        status: "PASS",
        noteEn: "Absence in 25g confirmed",
        noteHe: "שלילי לחלוטין ב-25 גרם",
      },
      {
        id: "listeria",
        category: "microbiology",
        nameEn: "Listeria monocytogenes",
        nameHe: "ליסטריה מונוציטוגנס (Listeria monocytogenes)",
        testedValue: "Not Detected",
        unit: "in 25g",
        expectedString: "Not Detected",
        standardCitation: "תקנות בריאות הציבור (מזון)",
        status: "PASS",
        noteEn: "Absence in 25g confirmed",
        noteHe: "שלילי לחלוטין ב-25 גרם",
      },
      // Heavy Metals
      {
        id: "lead_pb",
        category: "heavy_metals",
        nameEn: "Lead (Pb)",
        nameHe: "עופרת (Pb)",
        testedValue: 0.02,
        unit: "mg/kg",
        maxLimit: 0.10,
        standardCitation: "תקנות בריאות הציבור (מתכות כבדות במזון)",
        status: "PASS",
        noteEn: "Well below MOH limit (0.10 mg/kg)",
        noteHe: "נמוך משמעותית מרף שירות המזון הארצי",
      },
      {
        id: "cadmium_cd",
        category: "heavy_metals",
        nameEn: "Cadmium (Cd)",
        nameHe: "קדמיום (Cd)",
        testedValue: 0.01,
        unit: "mg/kg",
        maxLimit: 0.05,
        standardCitation: "תקנות בריאות הציבור (מתכות כבדות במזון)",
        status: "PASS",
      },
      {
        id: "arsenic_as",
        category: "heavy_metals",
        nameEn: "Arsenic Total (As)",
        nameHe: "ארסן כולל (As)",
        testedValue: 0.02,
        unit: "mg/kg",
        maxLimit: 0.10,
        standardCitation: "תקנות בריאות הציבור",
        status: "PASS",
      },
      // Pesticides
      {
        id: "chlorpyrifos",
        category: "pesticides",
        nameEn: "Chlorpyrifos Residues",
        nameHe: "שאריות חומרי הדברה - כלורפיריפוס",
        testedValue: 0.005,
        unit: "mg/kg",
        maxLimit: 0.01,
        standardCitation: "MOH Food Service Directive 02/2024",
        status: "PASS",
        noteEn: "Below detection threshold",
        noteHe: "נקי משאריות הדברה",
      },
      {
        id: "glyphosate",
        category: "pesticides",
        nameEn: "Glyphosate Residues",
        nameHe: "שאריות גלייפוסט",
        testedValue: 0.01,
        unit: "mg/kg",
        maxLimit: 0.10,
        standardCitation: "תקנות בריאות הציבור (שאריות חומרי הדברה)",
        status: "PASS",
      },
    ],
  },

  italian_pasta_compliant: {
    id: "italian_pasta_compliant",
    supplierName: "Pastificio Campano S.p.A.",
    originCountry: "Italy (IT)",
    productNameEn: "Italian Bronze-Die Durum Wheat Pasta 500g",
    productNameHe: "פסטה איטלקית במשיכת ברונזה מחיטת דורום 500 גרם",
    category: "pasta",
    labName: "Silliker Italia S.r.l. Merieux NutriSciences (ISO 17025 #0143)",
    labIso17025Accreditation: "ACCREDIA / ISO-17025 Lab ID 0143",
    batchNumber: "LOT-IT2026-PST-4920",
    productionDate: "2026-08-20",
    expiryDate: "2029-08-20",
    customsHsCode: "1902.19.0000",
    parameters: [
      {
        id: "moisture",
        category: "chemistry",
        nameEn: "Moisture Content",
        nameHe: "תכולת לחות",
        testedValue: 11.4,
        unit: "%",
        maxLimit: 12.5,
        standardCitation: "ת״י 786 סעיף 3.1",
        status: "PASS",
        noteEn: "Complies with dry pasta shelf-stability",
        noteHe: "תואם דרישות יציבות מדף לפסטה יבשה",
      },
      {
        id: "protein_content",
        category: "chemistry",
        nameEn: "Protein Content (Dry Matter N x 5.7)",
        nameHe: "תכולת חלבון (על בסיס חומר יבש)",
        testedValue: 13.8,
        unit: "%",
        minLimit: 12.0,
        standardCitation: "ת״י 786 / תקן דורום איטלקי",
        status: "PASS",
        noteEn: "High-protein premium durum semolina",
        noteHe: "דורום איכותי בעל אחוז חלבון גבוה",
      },
      {
        id: "ash_content",
        category: "chemistry",
        nameEn: "Ash Content (Dry Basis)",
        nameHe: "תכולת אפר (חומר יבש)",
        testedValue: 0.78,
        unit: "%",
        maxLimit: 0.90,
        standardCitation: "ת״י 786",
        status: "PASS",
      },
      {
        id: "salmonella",
        category: "microbiology",
        nameEn: "Salmonella spp.",
        nameHe: "סלמונלה (Salmonella spp.)",
        testedValue: "Not Detected",
        unit: "in 25g",
        expectedString: "Not Detected",
        standardCitation: "תקנות בריאות הציבור (מזון)",
        status: "PASS",
      },
      {
        id: "lead_pb",
        category: "heavy_metals",
        nameEn: "Lead (Pb)",
        nameHe: "עופרת (Pb)",
        testedValue: 0.04,
        unit: "mg/kg",
        maxLimit: 0.20,
        standardCitation: "תקנות בריאות הציבור (מתכות כבדות במזון)",
        status: "PASS",
      },
      {
        id: "cadmium_cd",
        category: "heavy_metals",
        nameEn: "Cadmium (Cd)",
        nameHe: "קדמיום (Cd)",
        testedValue: 0.03,
        unit: "mg/kg",
        maxLimit: 0.10,
        standardCitation: "תקנות בריאות הציבור (מתכות כבדות במזון)",
        status: "PASS",
      },
      {
        id: "glyphosate",
        category: "pesticides",
        nameEn: "Glyphosate Residues",
        nameHe: "שאריות גלייפוסט",
        testedValue: 0.02,
        unit: "mg/kg",
        maxLimit: 0.10,
        standardCitation: "תקנות בריאות הציבור (שאריות חומרי הדברה)",
        status: "PASS",
      },
    ],
  },

  italian_passata_compliant: {
    id: "italian_passata_compliant",
    supplierName: "Conserve Pugliesi S.r.l.",
    originCountry: "Italy (IT)",
    productNameEn: "Rustic Italian Tomato Passata 700g",
    productNameHe: "מחית עגבניות כפרית איטלקית (פאסאטה) 700 גרם",
    category: "tomato_passata",
    labName: "Chemiservice Lab Bari (ISO 17025 Accredited)",
    labIso17025Accreditation: "ACCREDIA / ISO-17025 Cert #0294",
    batchNumber: "LOT-IT2026-TOM-9112",
    productionDate: "2026-09-01",
    expiryDate: "2028-09-01",
    customsHsCode: "2002.90.0000",
    parameters: [
      {
        id: "brix",
        category: "chemistry",
        nameEn: "Refractometric Brix (°Brix)",
        nameHe: "סוכרים מסיסים ברפרקטומטר (מעלות בריקס)",
        testedValue: 7.8,
        unit: "°Brix",
        minLimit: 7.0,
        standardCitation: "ת״י 143 עגבניות מעובדות",
        status: "PASS",
        noteEn: "Rich, dense authentic Italian passata",
        noteHe: "מרקם עשיר וצמיג",
      },
      {
        id: "ph_value",
        category: "chemistry",
        nameEn: "pH Acidity Level",
        nameHe: "רמת חומציות pH",
        testedValue: 4.25,
        unit: "pH",
        minLimit: 4.10,
        maxLimit: 4.50,
        standardCitation: "ת״י 143",
        status: "PASS",
      },
      {
        id: "lead_pb",
        category: "heavy_metals",
        nameEn: "Lead (Pb)",
        nameHe: "עופרת (Pb)",
        testedValue: 0.02,
        unit: "mg/kg",
        maxLimit: 0.05,
        standardCitation: "תקנות בריאות הציבור (מתכות כבדות במזון)",
        status: "PASS",
      },
      {
        id: "cadmium_cd",
        category: "heavy_metals",
        nameEn: "Cadmium (Cd)",
        nameHe: "קדמיום (Cd)",
        testedValue: 0.01,
        unit: "mg/kg",
        maxLimit: 0.05,
        standardCitation: "תקנות בריאות הציבור (מתכות כבדות במזון)",
        status: "PASS",
      },
      {
        id: "salmonella",
        category: "microbiology",
        nameEn: "Salmonella spp.",
        nameHe: "סלמונלה (Salmonella spp.)",
        testedValue: "Not Detected",
        unit: "in 25g",
        expectedString: "Not Detected",
        standardCitation: "תקנות בריאות הציבור (מזון)",
        status: "PASS",
      },
    ],
  },

  failed_sample_inspection: {
    id: "failed_sample_inspection",
    supplierName: "Oleos Mediterraneos S.L.",
    originCountry: "Spain (ES)",
    productNameEn: "Non-Compliant EVOO Sample (High Acidity & Heavy Metals)",
    productNameHe: "דגימת מעבדה חריגה - שמן זית נכשל (חומציות ועופרת חריגים)",
    category: "olive_oil",
    labName: "Iberico Testing Labs Madrid (ISO 17025)",
    labIso17025Accreditation: "ENAC / ISO-17025 Cert #1092/LE334",
    batchNumber: "LOT-ERR-2026-FAIL-041",
    productionDate: "2026-07-10",
    expiryDate: "2028-07-10",
    customsHsCode: "1509.20.0000",
    parameters: [
      {
        id: "acidity",
        category: "chemistry",
        nameEn: "Free Fatty Acidity (as Oleic Acid %)",
        nameHe: "חומציות שומן חופשי (במונחי חומצה אולאית %)",
        testedValue: 1.25,
        unit: "%",
        maxLimit: 0.80,
        standardCitation: "ת״י 191 / IOC Standard",
        status: "FAIL",
        noteEn: "EXCEEDS MAXIMUM ALLOWABLE LIMIT (0.80% Max) -> Disqualified from EVOO designation",
        noteHe: "חריגה חמורה מעל תקרת התקן הרשמי (0.80% מקסימום) - נפסל מתיוג כתית מעולה",
      },
      {
        id: "peroxide_value",
        category: "chemistry",
        nameEn: "Peroxide Value",
        nameHe: "ערך פראוקסיד (חמצון ראשוני)",
        testedValue: 24.5,
        unit: "meq O2/kg",
        maxLimit: 20.0,
        standardCitation: "ת״י 191 סעיף 4.2",
        status: "FAIL",
        noteEn: "EXCEEDS PEROXIDE LIMIT (20.0 Max) -> Advanced rancidity detected",
        noteHe: "חריגת חמצון מעל 20.0 - שמן מעופש",
      },
      {
        id: "lead_pb",
        category: "heavy_metals",
        nameEn: "Lead (Pb)",
        nameHe: "עופרת (Pb)",
        testedValue: 0.16,
        unit: "mg/kg",
        maxLimit: 0.10,
        standardCitation: "תקנות בריאות הציבור (מתכות כבדות במזון)",
        status: "FAIL",
        noteEn: "CRITICAL HEALTH VIOLATION: Exceeds 0.10 mg/kg MOH ceiling",
        noteHe: "חריגה מסוכנת: עופרת מעל תקרת שירות המזון הארצי של 0.10 מ״ג/ק״ג",
      },
      {
        id: "salmonella",
        category: "microbiology",
        nameEn: "Salmonella spp.",
        nameHe: "סלמונלה (Salmonella spp.)",
        testedValue: "Not Detected",
        unit: "in 25g",
        expectedString: "Not Detected",
        standardCitation: "תקנות בריאות הציבור (מזון)",
        status: "PASS",
      },
    ],
  },
};

/**
 * Validates a COA preset or custom laboratory sample against MOH rules
 */
export function validateCoaSample(preset: CoaSamplePreset, customParameters?: AssayParameter[]): CoaValidationReport {
  const paramsToEvaluate = customParameters ?? preset.parameters;
  
  let passedCount = 0;
  let warnCount = 0;
  let failCount = 0;
  const failedItems: AssayParameter[] = [];

  const evaluatedParams: AssayParameter[] = paramsToEvaluate.map((item) => {
    let itemStatus: AssayStatus = "PASS";
    let noteEn = item.noteEn;
    let noteHe = item.noteHe;

    if (item.expectedString && typeof item.testedValue === "string") {
      if (item.testedValue.trim().toLowerCase() !== item.expectedString.trim().toLowerCase()) {
        itemStatus = "FAIL";
        noteEn = `Positive contamination detected! Expected: ${item.expectedString}`;
        noteHe = `זיהום חיובי התגלה! צפוי: ${item.expectedString}`;
      }
    } else if (typeof item.testedValue === "number") {
      if (item.maxLimit !== undefined && item.testedValue > item.maxLimit) {
        itemStatus = "FAIL";
        noteEn = `Value ${item.testedValue} exceeds MOH ceiling limit of ${item.maxLimit} ${item.unit}`;
        noteHe = `ערך ${item.testedValue} חורג מתקרת משרד הבריאות של ${item.maxLimit} ${item.unit}`;
      } else if (item.minLimit !== undefined && item.testedValue < item.minLimit) {
        itemStatus = "FAIL";
        noteEn = `Value ${item.testedValue} is below mandatory minimum of ${item.minLimit} ${item.unit}`;
        noteHe = `ערך ${item.testedValue} נמוך מהרף המינימלי של ${item.minLimit} ${item.unit}`;
      } else if (item.maxLimit !== undefined && item.testedValue > item.maxLimit * 0.85) {
        itemStatus = "WARN";
        noteEn = `Borderline reading (${item.testedValue} close to ${item.maxLimit} ${item.unit})`;
        noteHe = `ערך גבולי סמוך לתקרה (${item.testedValue} סמוך ל-${item.maxLimit} ${item.unit})`;
      }
    }

    if (itemStatus === "PASS") passedCount++;
    else if (itemStatus === "WARN") {
      warnCount++;
      passedCount++; // Warn still permits green pass with flag
    } else {
      failCount++;
      failedItems.push({ ...item, status: itemStatus, noteEn, noteHe });
    }

    return { ...item, status: itemStatus, noteEn, noteHe };
  });

  const totalAssays = evaluatedParams.length;
  const complianceScorePct = totalAssays > 0 ? Math.round(((totalAssays - failCount) / totalAssays) * 100) : 100;

  let verdict: OverallVerdict = "GREEN_PASS_APPROVED";
  if (failCount > 0) {
    verdict = "MOH_REJECT_STOP_ORDER";
  } else if (warnCount > 0) {
    verdict = "CONDITIONAL_RETEST_REQUIRED";
  }

  // Generate unique certificate reference number
  const certificateRefNumber = `MOH-IL-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}-GP`;

  // Cryptographic simulated SHA-256 digital stamp
  const digitalSealHash = `SHA256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855:${preset.batchNumber}:${Date.now()}`;

  return {
    presetId: preset.id,
    supplierName: preset.supplierName,
    productNameEn: preset.productNameEn,
    productNameHe: preset.productNameHe,
    batchNumber: preset.batchNumber,
    labName: preset.labName,
    labAccreditation: preset.labIso17025Accreditation,
    customsHsCode: preset.customsHsCode,
    verdict,
    complianceScorePct,
    totalAssays,
    passedAssays: passedCount,
    warningAssays: warnCount,
    failedAssays: failCount,
    failedItems,
    certificateRefNumber,
    digitalSealHash,
    timestamp: new Date().toISOString(),
    regulatoryCitations: [
      "צו הגנת הצרכן (סימון טובין) תשל״ג-1983",
      "תקנות בריאות הציבור (מזון) (בקרת שאריות מזהמים ומתכות כבדות)",
      "תקן ישראלי רשמי ת״י 1145 (סימון מזון ארוז מראש)",
      "תקן ישראלי רשמי ת״י 191 (שמן זית)",
      "שירות המזון הארצי - נוהל שחרור מזון רגיש מתחנת הסגר נמל אשדוד",
    ],
  };
}
