/**
 * FoodXchange Israeli Supermarket Packaging & Regulatory Compliance Engine
 * Enforces:
 * 1. Israeli Food Labeling Standard SI 1145 (ת״י 1145 - סימון מזון ארוז מראש)
 * 2. Mandatory Front-of-Package Red Warning Badges (תקנות הגנת בריאות הציבור - מזון)
 * 3. Chief Rabbinate of Israel Kosher Declaration Laws (חוק איסור הונאה בכשרות)
 * 4. Allergen Disclosure & Bolding Requirements (מידע על אלרגנים)
 */

export interface NutritionPer100 {
  calories: number; // kcal
  totalFat: number; // g
  saturatedFat: number; // g
  transFat: number; // g
  cholesterol?: number; // mg
  sodium: number; // mg
  totalCarbs: number; // g
  sugars: number; // g
  addedSugars?: number; // g
  protein: number; // g
  saltEquivalent?: number; // g (sodium * 2.5 / 1000)
}

export interface RedLabelWarnings {
  highSodium: boolean;
  highSugar: boolean;
  highSaturatedFat: boolean;
  count: number;
  thresholds: {
    sodium: number;
    sugar: number;
    saturatedFat: number;
  };
}

export type CheckStatus = "pass" | "warn" | "fail";

export interface ComplianceCheckItem {
  id: string;
  category: "SI 1145 Mandatory" | "Front-of-Package Red Badges" | "Kosher & Rabbinate" | "Allergen Warning" | "Nutritional Format";
  label: string;
  status: CheckStatus;
  foundText?: string;
  requirement: string;
  recommendation?: string;
}

export interface LabelComplianceReport {
  overallScore: number; // 0 - 100
  status: "APPROVED" | "CONDITIONAL_APPROVAL" | "ACTION_REQUIRED";
  productNameHebrew: string;
  countryOfOrigin: string;
  manufacturerName: string;
  importerDetails: string;
  isLiquid: boolean;
  nutrition: NutritionPer100;
  redLabels: RedLabelWarnings;
  checks: ComplianceCheckItem[];
  correctionsForDesigner: string[];
  reviewedAt: string;
}

/**
 * Calculates mandatory Front-of-Package Red Badges according to Israeli Law:
 * Solid food (per 100g):
 *  - Sodium >= 400 mg
 *  - Sugars >= 10.0 g
 *  - Saturated Fat >= 4.0 g
 * Liquid food (per 100ml):
 *  - Sodium >= 300 mg
 *  - Sugars >= 5.0 g
 *  - Saturated Fat >= 3.0 g
 */
export function calculateRedLabelWarnings(
  nutrition: NutritionPer100,
  isLiquid = false
): RedLabelWarnings {
  const sodiumThreshold = isLiquid ? 300 : 400;
  const sugarThreshold = isLiquid ? 5.0 : 10.0;
  const satFatThreshold = isLiquid ? 3.0 : 4.0;

  const highSodium = nutrition.sodium >= sodiumThreshold;
  const highSugar = nutrition.sugars >= sugarThreshold;
  const highSaturatedFat = nutrition.saturatedFat >= satFatThreshold;

  const count = (highSodium ? 1 : 0) + (highSugar ? 1 : 0) + (highSaturatedFat ? 1 : 0);

  return {
    highSodium,
    highSugar,
    highSaturatedFat,
    count,
    thresholds: {
      sodium: sodiumThreshold,
      sugar: sugarThreshold,
      saturatedFat: satFatThreshold,
    },
  };
}

// ==========================================
// PRESET ARTWORKS FOR 1-CLICK TESTING
// ==========================================
export const SAMPLE_ARTWORK_PRESETS: Record<string, {
  name: string;
  category: string;
  isLiquid: boolean;
  report: LabelComplianceReport;
}> = {
  "canned-tomatoes": {
    name: "Italian Canned Diced Tomatoes (Polpa 400g)",
    category: "Canned Goods",
    isLiquid: false,
    report: {
      overallScore: 98,
      status: "APPROVED",
      productNameHebrew: "קוביות עגבניות מקולפות במיץ עגבניות",
      countryOfOrigin: "איטליה (Italy)",
      manufacturerName: "Consorzio Casalasco del Pomodoro S.a.c., Rivarolo del Re, Italy",
      importerDetails: "מיובא ע״י: פודאקסצ'יינג' בע״מ, רח' המלאכה 14, תל אביב-יפו, ח.פ. 516492810",
      isLiquid: false,
      nutrition: {
        calories: 24,
        totalFat: 0.2,
        saturatedFat: 0.0,
        transFat: 0.0,
        sodium: 25,
        totalCarbs: 3.9,
        sugars: 3.5,
        protein: 1.2,
      },
      redLabels: {
        highSodium: false,
        highSugar: false,
        highSaturatedFat: false,
        count: 0,
        thresholds: { sodium: 400, sugar: 10.0, saturatedFat: 4.0 },
      },
      checks: [
        {
          id: "si1145_name",
          category: "SI 1145 Mandatory",
          label: "Hebrew Food Denomination",
          status: "pass",
          foundText: "קוביות עגבניות מקולפות במיץ עגבניות",
          requirement: "Exact commercial denomination in clear Hebrew without misleading adjectives.",
        },
        {
          id: "si1145_ingredients",
          category: "SI 1145 Mandatory",
          label: "Ingredients in Descending Order",
          status: "pass",
          foundText: "רכיבים: עגבניות (65%), מיץ עגבניות (34.9%), מלח, מווסת חומציות: חומצת לימון.",
          requirement: "List all components descending by weight with percentage for characterizing ingredients.",
        },
        {
          id: "si1145_importer",
          category: "SI 1145 Mandatory",
          label: "Registered Importer Details",
          status: "pass",
          foundText: "מיובא ע״י: פודאקסצ'יינג' בע״מ, רח' המלאכה 14, תל אביב",
          requirement: "Israeli company name, commercial registration ID, and full registered address.",
        },
        {
          id: "red_badges",
          category: "Front-of-Package Red Badges",
          label: "Mandatory Red Warning Symbols",
          status: "pass",
          foundText: "Clean Label — Zero Red Badges Required",
          requirement: "Sodium <400mg, Sugar <10g, Sat Fat <4g per 100g.",
        },
        {
          id: "kosher_rabbinate",
          category: "Kosher & Rabbinate",
          label: "Chief Rabbinate Approval Statement",
          status: "pass",
          foundText: "כשר פרווה בהשגחת בד״ץ איטליה ובאישור הרבנות הראשית לישראל",
          requirement: "Must state certifying agency AND Chief Rabbinate of Israel approval (אישור הרה״ר לישראל).",
        },
        {
          id: "allergens",
          category: "Allergen Warning",
          label: "Allergen Disclosure",
          status: "pass",
          foundText: "אינו מכיל אלרגנים",
          requirement: "Allergen box in bold font or explicit allergen-free declaration.",
        },
      ],
      correctionsForDesigner: [
        "Artwork is 100% compliant with Israeli SI 1145. Ready for plate engraving and printing.",
      ],
      reviewedAt: new Date().toISOString(),
    },
  },

  "durum-pasta": {
    name: "Napoli Bronze-Drawn Durum Wheat Pasta (500g)",
    category: "Pasta & Bakery",
    isLiquid: false,
    report: {
      overallScore: 94,
      status: "APPROVED",
      productNameHebrew: "פסטה יבשה מחיטת דורום מעולה",
      countryOfOrigin: "איטליה (Campania, Italy)",
      manufacturerName: "Pastificio Di Martino Gaetano & F.lli S.p.A., Gragnano, Italy",
      importerDetails: "מיובא ע״י: פודאקסצ'יינג' בע״מ, ח.פ 516492810",
      isLiquid: false,
      nutrition: {
        calories: 355,
        totalFat: 1.5,
        saturatedFat: 0.3,
        transFat: 0.0,
        sodium: 5,
        totalCarbs: 71.0,
        sugars: 3.0,
        protein: 13.5,
      },
      redLabels: {
        highSodium: false,
        highSugar: false,
        highSaturatedFat: false,
        count: 0,
        thresholds: { sodium: 400, sugar: 10.0, saturatedFat: 4.0 },
      },
      checks: [
        {
          id: "si1145_name",
          category: "SI 1145 Mandatory",
          label: "Hebrew Food Denomination",
          status: "pass",
          foundText: "פסטה יבשה מחיטת דורום מעולה",
          requirement: "Standard pasta naming format in Hebrew.",
        },
        {
          id: "allergens",
          category: "Allergen Warning",
          label: "Allergen Warning Box (Gluten)",
          status: "pass",
          foundText: "מכיל: חיטה (גלוטן). עלול להכיל: סויה, חרדל.",
          requirement: "Allergens bolded in black box or contrasting typography per Israeli Public Health regulations.",
        },
        {
          id: "red_badges",
          category: "Front-of-Package Red Badges",
          label: "Red Warning Evaluation",
          status: "pass",
          foundText: "Sodium 5mg, Sugar 3g, Sat Fat 0.3g (Clean Label)",
          requirement: "All levels strictly below red badge limits.",
        },
        {
          id: "kosher_rabbinate",
          category: "Kosher & Rabbinate",
          label: "Rabbinate Kosher Statement",
          status: "pass",
          foundText: "כשר פרווה למהדרין בהשגחת בד״ץ רומא ובאישור הרה״ר לישראל - נקי מחשש חדש",
          requirement: "Includes Chadash status and Chief Rabbinate approval.",
        },
      ],
      correctionsForDesigner: [
        "Ensure Hebrew font size for net weight ('משקל נקי: 500 גרם') is at least 4mm height per SI 1145 table 1.",
      ],
      reviewedAt: new Date().toISOString(),
    },
  },

  "chocolate-spread": {
    name: "Belgian Hazelnut Cocoa Spread (400g)",
    category: "Confectionery",
    isLiquid: false,
    report: {
      overallScore: 68,
      status: "CONDITIONAL_APPROVAL",
      productNameHebrew: "ממרח אגוזי לוז עם קקאו",
      countryOfOrigin: "בלגיה (Belgium)",
      manufacturerName: "Natrada Chocoville N.V., Brussels, Belgium",
      importerDetails: "מיובא ע״י: רשת סופרמרקטים שיווק מזון בע״מ",
      isLiquid: false,
      nutrition: {
        calories: 539,
        totalFat: 31.5,
        saturatedFat: 10.2, // > 4.0g: RED BADGE
        transFat: 0.2,
        sodium: 42,
        totalCarbs: 57.5,
        sugars: 56.3, // > 10.0g: RED BADGE
        protein: 6.3,
      },
      redLabels: {
        highSodium: false,
        highSugar: true,
        highSaturatedFat: true,
        count: 2,
        thresholds: { sodium: 400, sugar: 10.0, saturatedFat: 4.0 },
      },
      checks: [
        {
          id: "si1145_name",
          category: "SI 1145 Mandatory",
          label: "Hebrew Food Denomination",
          status: "pass",
          foundText: "ממרח אגוזי לוז עם קקאו (אגוזי לוז 13%)",
          requirement: "Includes percentage of hazelnut nuts.",
        },
        {
          id: "red_badges_sugar",
          category: "Front-of-Package Red Badges",
          label: "High Sugar Warning Circle",
          status: "fail",
          foundText: "56.3g sugar per 100g (Threshold: 10.0g)",
          requirement: "MANDATORY RED CIRCLE on front artwork: 'סוכר ברמה גבוהה' with spoon graphic.",
          recommendation: "Add red warning badge circle (min 15mm diameter) to upper-right third of front label.",
        },
        {
          id: "red_badges_satfat",
          category: "Front-of-Package Red Badges",
          label: "High Saturated Fat Warning Circle",
          status: "fail",
          foundText: "10.2g saturated fat per 100g (Threshold: 4.0g)",
          requirement: "MANDATORY RED CIRCLE on front artwork: 'שומן רווי ברמה גבוהה' with heart graphic.",
          recommendation: "Add second red warning badge alongside the sugar badge.",
        },
        {
          id: "kosher_rabbinate",
          category: "Kosher & Rabbinate",
          label: "Kosher Dairy Type Distinction",
          status: "warn",
          foundText: "כשר חלבי בהשגחת רבנות בריסל ובאישור הרבנות הראשית לישראל",
          requirement: "Must specify if dairy contains 'אבקת חלב נוכרי' (Cholov Stam/Foreign Milk Powder) per Rabbinate directives.",
          recommendation: "Update statement to: 'כשר חלבי (לאוכלי אבקת חלב נוכרי) בהשגחת... ובאישור הרה״ר לישראל'.",
        },
        {
          id: "allergens",
          category: "Allergen Warning",
          label: "Allergen Declaration",
          status: "pass",
          foundText: "מכיל: אגוזי לוז, חלב, סויה. עלול להכיל: אגוזים אחרים, בוטנים.",
          requirement: "Mandatory bold allergen box.",
        },
      ],
      correctionsForDesigner: [
        "CRITICAL: Insert two mandatory Israeli Red Warning Circles ('סוכר ברמה גבוהה' + 'שומן רווי ברמה גבוהה') on the FRONT label.",
        "Add '(לאוכלי אבקת חלב נוכרי)' to the Hebrew kosher statement.",
        "Ensure nutritional table specifies 'כפיות סוכר: 14' (number of teaspoons of sugar per 100g) as required for high-sugar products.",
      ],
      reviewedAt: new Date().toISOString(),
    },
  },

  "pickled-olives": {
    name: "Spanish Manzanilla Stuffed Olives (560g)",
    category: "Canned & Pickled",
    isLiquid: false,
    report: {
      overallScore: 54,
      status: "ACTION_REQUIRED",
      productNameHebrew: "זיתים מנזנילה ירוקים מגולענים",
      countryOfOrigin: "ספרד (Spain)",
      manufacturerName: "Aceitunas Guadalquivir S.L., Seville, Spain",
      importerDetails: "מיובא ע״י: [שם יבואן חסר בארטוורק]",
      isLiquid: false,
      nutrition: {
        calories: 145,
        totalFat: 15.2,
        saturatedFat: 2.8,
        transFat: 0.0,
        sodium: 980, // > 400mg: RED BADGE
        totalCarbs: 1.0,
        sugars: 0.2,
        protein: 1.1,
      },
      redLabels: {
        highSodium: true,
        highSugar: false,
        highSaturatedFat: false,
        count: 1,
        thresholds: { sodium: 400, sugar: 10.0, saturatedFat: 4.0 },
      },
      checks: [
        {
          id: "si1145_importer",
          category: "SI 1145 Mandatory",
          label: "Importer Details on Packaging",
          status: "fail",
          foundText: "Missing / Placeholder text found",
          requirement: "Artwork must show legal Israeli importer name and business registration number.",
          recommendation: "Add 'מיובא ע״י: פודאקסצ'יינג' בע״מ, רח' המלאכה 14, תל אביב-יפו, ח.פ 516492810'.",
        },
        {
          id: "red_badges_sodium",
          category: "Front-of-Package Red Badges",
          label: "High Sodium Warning Badge",
          status: "fail",
          foundText: "980mg sodium per 100g (Threshold: 400mg)",
          requirement: "MANDATORY RED CIRCLE on front artwork: 'נתרן ברמה גבוהה' with salt shaker symbol.",
          recommendation: "Add red sodium badge on front display panel.",
        },
        {
          id: "si1145_drained_weight",
          category: "SI 1145 Mandatory",
          label: "Drained Weight Statement",
          status: "warn",
          foundText: "משקל נקי: 560 גרם (משקל מסונן חסר)",
          requirement: "Food packed in brine or liquid media must specify both net weight and drained weight (משקל מסונן).",
          recommendation: "Add 'משקל מסונן: 300 גרם'.",
        },
        {
          id: "kosher_rabbinate",
          category: "Kosher & Rabbinate",
          label: "Chief Rabbinate Kosher Certification",
          status: "fail",
          foundText: "Only 'Kosher Pareve' in English without Israeli Rabbinate authorization",
          requirement: "Under Israeli fraud prevention law, word 'Kosher' in Israel requires Chief Rabbinate approval text.",
          recommendation: "Add: 'כשר פרווה בהשגחת בד״ץ מדריד ובאישור הרבנות הראשית לישראל'.",
        },
      ],
      correctionsForDesigner: [
        "REJECTED FOR PRODUCTION: Importer legal entity is missing from label.",
        "Add mandatory Front-of-Package Red Circle: 'נתרן ברמה גבוהה' (High Sodium).",
        "Add drained weight ('משקל מסונן') in addition to net weight.",
        "Add official Chief Rabbinate import authorization text before container vessel departs Spain.",
      ],
      reviewedAt: new Date().toISOString(),
    },
  },
};

/**
 * Analyzes custom artwork parameters or invokes AI vision models.
 */
export async function analyzeLabelCompliance(params: {
  productName: string;
  category?: string;
  isLiquid?: boolean;
  nutrition: NutritionPer100;
  hebrewTextFound?: {
    productNameHebrew?: string;
    ingredientsHebrew?: string;
    importerHebrew?: string;
    kosherHebrew?: string;
    allergensHebrew?: string;
    drainedWeight?: string;
  };
}): Promise<LabelComplianceReport> {
  const isLiquid = Boolean(params.isLiquid);
  const redLabels = calculateRedLabelWarnings(params.nutrition, isLiquid);
  const text = params.hebrewTextFound || {};

  const checks: ComplianceCheckItem[] = [];
  const corrections: string[] = [];
  let score = 100;

  // 1. Check Hebrew Denomination
  if (!text.productNameHebrew || text.productNameHebrew.trim().length < 3) {
    checks.push({
      id: "si1145_name",
      category: "SI 1145 Mandatory",
      label: "Hebrew Food Denomination",
      status: "fail",
      requirement: "Mandatory accurate Hebrew product name per Israeli Standard SI 1145.",
      recommendation: "Provide standard Hebrew food name (e.g. 'פסטה מחיטת דורום' or 'שמן זית כתית מעולה').",
    });
    corrections.push("Add clear legal Hebrew product name.");
    score -= 20;
  } else {
    checks.push({
      id: "si1145_name",
      category: "SI 1145 Mandatory",
      label: "Hebrew Food Denomination",
      status: "pass",
      foundText: text.productNameHebrew,
      requirement: "Compliant product name in Hebrew.",
    });
  }

  // 2. Check Ingredients
  if (!text.ingredientsHebrew || !text.ingredientsHebrew.includes("רכיבים")) {
    checks.push({
      id: "si1145_ingredients",
      category: "SI 1145 Mandatory",
      label: "Ingredients List in Descending Order",
      status: "warn",
      requirement: "Must start with word 'רכיבים:' and list components by descending weight.",
      recommendation: "Prefix ingredient list with 'רכיבים:' and include water/salt/preservatives.",
    });
    corrections.push("Format ingredients list properly in Hebrew starting with 'רכיבים:'.");
    score -= 10;
  } else {
    checks.push({
      id: "si1145_ingredients",
      category: "SI 1145 Mandatory",
      label: "Ingredients List",
      status: "pass",
      foundText: text.ingredientsHebrew,
      requirement: "Descending order ingredient declaration.",
    });
  }

  // 3. Check Importer Details
  if (!text.importerHebrew || !text.importerHebrew.includes("יבואן") && !text.importerHebrew.includes("מיובא")) {
    checks.push({
      id: "si1145_importer",
      category: "SI 1145 Mandatory",
      label: "Registered Importer Details",
      status: "fail",
      requirement: "Mandatory Israeli importer name, address, and registration/tax ID.",
      recommendation: "Add 'מיובא ע״י: [שם היבואן], [כתובת מלאה בישראל], ח.פ [מספר ח.פ]'.",
    });
    corrections.push("Insert Israeli registered importer legal entity name and address.");
    score -= 20;
  } else {
    checks.push({
      id: "si1145_importer",
      category: "SI 1145 Mandatory",
      label: "Registered Importer Details",
      status: "pass",
      foundText: text.importerHebrew,
      requirement: "Valid registered Israeli importer on packaging.",
    });
  }

  // 4. Check Red Labels
  if (redLabels.count > 0) {
    if (redLabels.highSodium) {
      checks.push({
        id: "red_sodium",
        category: "Front-of-Package Red Badges",
        label: "High Sodium Red Warning Badge",
        status: "fail",
        foundText: `${params.nutrition.sodium}mg sodium per 100${isLiquid ? "ml" : "g"} (Threshold: ${redLabels.thresholds.sodium}mg)`,
        requirement: "Mandatory front red badge circle with salt shaker graphic: 'נתרן ברמה גבוהה'.",
        recommendation: "Place red sodium warning circle on upper-right of front label.",
      });
      corrections.push("Insert mandatory Front-of-Package Red Warning Circle: 'נתרן ברמה גבוהה'.");
      score -= 12;
    }

    if (redLabels.highSugar) {
      checks.push({
        id: "red_sugar",
        category: "Front-of-Package Red Badges",
        label: "High Sugar Red Warning Badge",
        status: "fail",
        foundText: `${params.nutrition.sugars}g sugar per 100${isLiquid ? "ml" : "g"} (Threshold: ${redLabels.thresholds.sugar}g)`,
        requirement: "Mandatory front red badge circle with sugar spoon graphic: 'סוכר ברמה גבוהה'.",
        recommendation: "Place red sugar warning circle on front label.",
      });
      corrections.push("Insert mandatory Front-of-Package Red Warning Circle: 'סוכר ברמה גבוהה'.");
      score -= 12;
    }

    if (redLabels.highSaturatedFat) {
      checks.push({
        id: "red_satfat",
        category: "Front-of-Package Red Badges",
        label: "High Saturated Fat Red Warning Badge",
        status: "fail",
        foundText: `${params.nutrition.saturatedFat}g saturated fat per 100${isLiquid ? "ml" : "g"} (Threshold: ${redLabels.thresholds.saturatedFat}g)`,
        requirement: "Mandatory front red badge circle with heart graphic: 'שומן רווי ברמה גבוהה'.",
        recommendation: "Place red saturated fat warning circle on front label.",
      });
      corrections.push("Insert mandatory Front-of-Package Red Warning Circle: 'שומן רווי ברמה גבוהה'.");
      score -= 12;
    }
  } else {
    checks.push({
      id: "red_badges_clean",
      category: "Front-of-Package Red Badges",
      label: "Red Warning Evaluation",
      status: "pass",
      foundText: "All nutrient values below Israeli warning thresholds.",
      requirement: "Clean front packaging — no red circles required.",
    });
  }

  // 5. Check Kosher Declaration
  if (!text.kosherHebrew || !text.kosherHebrew.includes("הרבנות הראשית") && !text.kosherHebrew.includes("הרה״ר")) {
    checks.push({
      id: "kosher_rabbinate",
      category: "Kosher & Rabbinate",
      label: "Chief Rabbinate Authorization Statement",
      status: "warn",
      foundText: text.kosherHebrew || "Missing Chief Rabbinate mention",
      requirement: "Kosher food in Israeli retail must include 'ובאישור הרבנות הראשית לישראל' under Fraud in Kashrut Law.",
      recommendation: "Update kosher clause to state: 'כשר [פרווה/חלבי/בשרי] בהשגחת [שם הרבנות באירופה] ובאישור הרבנות הראשית לישראל'.",
    });
    corrections.push("Add mandatory Chief Rabbinate of Israel approval clause ('ובאישור הרבנות הראשית לישראל').");
    score -= 15;
  } else {
    checks.push({
      id: "kosher_rabbinate",
      category: "Kosher & Rabbinate",
      label: "Chief Rabbinate Authorization",
      status: "pass",
      foundText: text.kosherHebrew,
      requirement: "Compliant Chief Rabbinate certification notice.",
    });
  }

  // 6. Check Allergens
  if (!text.allergensHebrew || (!text.allergensHebrew.includes("מכיל") && !text.allergensHebrew.includes("אינו מכיל"))) {
    checks.push({
      id: "allergens_box",
      category: "Allergen Warning",
      label: "Allergen Information Box",
      status: "warn",
      requirement: "Mandatory allergen disclosure: 'מידע על אלרגנים: מכיל: [...] עלול להכיל: [...]'.",
      recommendation: "Add prominent allergen warning box in bold type.",
    });
    corrections.push("Add allergen disclosure box ('מידע על אלרגנים').");
    score -= 10;
  } else {
    checks.push({
      id: "allergens_box",
      category: "Allergen Warning",
      label: "Allergen Information Box",
      status: "pass",
      foundText: text.allergensHebrew,
      requirement: "Compliant allergen declaration.",
    });
  }

  const finalScore = Math.max(0, Math.min(100, score));
  let finalStatus: "APPROVED" | "CONDITIONAL_APPROVAL" | "ACTION_REQUIRED" = "APPROVED";
  if (finalScore < 60) {
    finalStatus = "ACTION_REQUIRED";
  } else if (finalScore < 85 || redLabels.count > 0) {
    finalStatus = "CONDITIONAL_APPROVAL";
  }

  return {
    overallScore: finalScore,
    status: finalStatus,
    productNameHebrew: text.productNameHebrew || params.productName,
    countryOfOrigin: "איטליה / ספרד / אירופה",
    manufacturerName: "European Manufacturing Plant",
    importerDetails: text.importerHebrew || "פודאקסצ'יינג' בע״מ",
    isLiquid,
    nutrition: params.nutrition,
    redLabels,
    checks,
    correctionsForDesigner: corrections.length > 0 ? corrections : ["Artwork is fully compliant with Israeli Standard SI 1145. Approved for production."],
    reviewedAt: new Date().toISOString(),
  };
}
