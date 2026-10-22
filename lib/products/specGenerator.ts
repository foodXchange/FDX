export interface PalletizationSpec {
  unitsPerCarton: number;
  cartonWeightKg: number;
  cartonsPerLayer: number; // Ti
  layersPerPallet: number;  // Hi
  totalCartonsPerPallet: number; // Ti x Hi
  totalUnitsPerPallet: number;
  palletGrossWeightKg: number;
  palletHeightCm: number;
  palletsPer20ft: number; // Standard 11 Euro-pallets
  unitsPer20ft: number;
  palletsPer40ftHC: number; // Standard 24–25 Euro-pallets
  unitsPer40ftHC: number;
}

export interface NutritionSpec {
  servingSize: string;
  energyKcal: number;
  totalFatG: number;
  saturatedFatG: number;
  carbohydratesG: number;
  sugarsG: number;
  sodiumMg: number;
  proteinG: number;
  hasRedSugar: boolean;
  hasRedSodium: boolean;
  hasRedFat: boolean;
  isCleanLabel: boolean;
  allergensContainsHe: string[];
  allergensMayContainHe: string[];
  allergensContainsEn: string[];
  allergensMayContainEn: string[];
}

export interface TechnicalProductSpec {
  productId: string;
  productName: string;
  category: string;
  categoryHe: string;
  supplierName: string;
  countryOfOrigin: string;
  countryFlag: string;
  formatDescription: string;
  temperatureRegime: "ambient" | "chilled" | "frozen";
  temperatureRegimeHe: string;
  temperatureRange: string;
  shelfLifeMonths: number;
  palletization: PalletizationSpec;
  nutrition: NutritionSpec;
  kosherTypes: string[];
  certifications: string[];
  privateLabelReady: boolean;
  barcodeFormat: string;
}

export function generateProductSpec(product: {
  id: string;
  product_name: string;
  category: string;
  formats?: string[] | null;
  sizes?: string[] | null;
  shelf_life_months?: number | null;
  certifications?: string[] | null;
  kosher_types?: string[] | null;
  private_label?: boolean | null;
  supplier?: {
    company_name?: string | null;
    country_of_origin?: string | null;
  } | null;
}): TechnicalProductSpec {
  const cat = (product.category || "").toLowerCase();
  const name = (product.product_name || "").toLowerCase();
  const formatStr = product.formats?.[0] || product.sizes?.[0] || "Standard Retail Pack";

  // 1. Palletization Defaults tailored by category
  let unitsPerCarton = 12;
  let unitNetWeightG = 500;
  let cartonsPerLayer = 10;
  let layersPerPallet = 6;
  let tempRegime: "ambient" | "chilled" | "frozen" = "ambient";
  let tempRange = "15°C – 25°C (Cool & Dry)";
  let shelfLifeMonths = product.shelf_life_months || 24;

  if (cat.includes("oil") || name.includes("oil") || name.includes("שמן")) {
    unitsPerCarton = 12;
    unitNetWeightG = 750;
    cartonsPerLayer = 15;
    layersPerPallet = 5;
    shelfLifeMonths = 24;
  } else if (cat.includes("tomato") || name.includes("tomato") || name.includes("עגבנ")) {
    unitsPerCarton = 24;
    unitNetWeightG = 400;
    cartonsPerLayer = 12;
    layersPerPallet = 6;
    shelfLifeMonths = 36;
  } else if (cat.includes("tuna") || cat.includes("fish") || name.includes("טונה")) {
    unitsPerCarton = 24;
    unitNetWeightG = 320;
    cartonsPerLayer = 14;
    layersPerPallet = 8;
    shelfLifeMonths = 60;
  } else if (cat.includes("pasta") || name.includes("pasta") || name.includes("פסטה")) {
    unitsPerCarton = 20;
    unitNetWeightG = 500;
    cartonsPerLayer = 8;
    layersPerPallet = 6;
    shelfLifeMonths = 36;
  } else if (cat.includes("frozen") || name.includes("frozen") || name.includes("קפוא")) {
    unitsPerCarton = 10;
    unitNetWeightG = 800;
    cartonsPerLayer = 9;
    layersPerPallet = 7;
    tempRegime = "frozen";
    tempRange = "≤ -18°C (Cold Chain)";
    shelfLifeMonths = 24;
  } else if (cat.includes("wafer") || cat.includes("bakery") || cat.includes("biscuit") || name.includes("ופל")) {
    unitsPerCarton = 18;
    unitNetWeightG = 250;
    cartonsPerLayer = 8;
    layersPerPallet = 7;
    shelfLifeMonths = 18;
  } else if (cat.includes("pickle") || cat.includes("olive") || name.includes("זית")) {
    unitsPerCarton = 12;
    unitNetWeightG = 560;
    cartonsPerLayer = 12;
    layersPerPallet = 5;
    shelfLifeMonths = 36;
  }

  const cartonWeightKg = Number(((unitsPerCarton * unitNetWeightG * 1.1) / 1000).toFixed(2));
  const totalCartonsPerPallet = cartonsPerLayer * layersPerPallet;
  const totalUnitsPerPallet = totalCartonsPerPallet * unitsPerCarton;
  const palletGrossWeightKg = Math.round(totalCartonsPerPallet * cartonWeightKg + 25); // +25kg Euro-pallet tare
  const palletHeightCm = layersPerPallet * 24 + 15; // 15cm pallet base

  const palletsPer20ft = 11;
  const unitsPer20ft = palletsPer20ft * totalUnitsPerPallet;
  const palletsPer40ftHC = 24;
  const unitsPer40ftHC = palletsPer40ftHC * totalUnitsPerPallet;

  // 2. Nutrition & SI 1145 Compliance per 100g
  let energyKcal = 350;
  let totalFatG = 1.5;
  let saturatedFatG = 0.3;
  let carbohydratesG = 72.0;
  let sugarsG = 3.2;
  let sodiumMg = 15;
  let proteinG = 12.5;

  let allergensContainsHe = ["גלוטן (חיטה)"];
  let allergensMayContainHe = ["סויה", "ביצים"];
  let allergensContainsEn = ["Gluten (Wheat)"];
  let allergensMayContainEn = ["Soy", "Eggs"];

  if (cat.includes("oil") || name.includes("oil") || name.includes("שמן")) {
    energyKcal = 824;
    totalFatG = 91.6;
    saturatedFatG = 13.8;
    carbohydratesG = 0;
    sugarsG = 0;
    sodiumMg = 0;
    proteinG = 0;
    allergensContainsHe = [];
    allergensMayContainHe = [];
    allergensContainsEn = [];
    allergensMayContainEn = [];
  } else if (cat.includes("tomato") || name.includes("tomato") || name.includes("עגבנ")) {
    energyKcal = 26;
    totalFatG = 0.2;
    saturatedFatG = 0.05;
    carbohydratesG = 4.2;
    sugarsG = 3.8;
    sodiumMg = 35;
    proteinG = 1.3;
    allergensContainsHe = [];
    allergensMayContainHe = ["סלרי"];
    allergensContainsEn = [];
    allergensMayContainEn = ["Celery"];
  } else if (cat.includes("tuna") || cat.includes("fish") || name.includes("טונה")) {
    energyKcal = 198;
    totalFatG = 10.5;
    saturatedFatG = 1.6;
    carbohydratesG = 0;
    sugarsG = 0;
    sodiumMg = 380;
    proteinG = 26.0;
    allergensContainsHe = ["דגים (טונה)"];
    allergensMayContainHe = [];
    allergensContainsEn = ["Fish (Tuna)"];
    allergensMayContainEn = [];
  } else if (cat.includes("wafer") || cat.includes("bakery") || name.includes("ופל")) {
    energyKcal = 515;
    totalFatG = 27.0;
    saturatedFatG = 11.5;
    carbohydratesG = 61.0;
    sugarsG = 34.0;
    sodiumMg = 140;
    proteinG = 7.0;
    allergensContainsHe = ["גלוטן (חיטה)", "אגוזים (לוז)", "חלב / לקטוז", "סויה"];
    allergensMayContainHe = ["בוטנים", "שומשום"];
    allergensContainsEn = ["Gluten (Wheat)", "Tree Nuts (Hazelnuts)", "Milk / Lactose", "Soy"];
    allergensMayContainEn = ["Peanuts", "Sesame"];
  } else if (cat.includes("olive") || cat.includes("pickle") || name.includes("זית")) {
    energyKcal = 145;
    totalFatG = 15.0;
    saturatedFatG = 2.4;
    carbohydratesG = 0.5;
    sugarsG = 0.2;
    sodiumMg = 850;
    proteinG = 1.0;
    allergensContainsHe = [];
    allergensMayContainHe = [];
    allergensContainsEn = [];
    allergensMayContainEn = [];
  }

  // Israeli SI 1145 Red Badges Thresholds (for solid food per 100g):
  // High Sugar: >= 10.0g
  // High Sodium: >= 400mg
  // High Saturated Fat: >= 4.0g (except pure oils where specific exemptions apply)
  const isPureOil = cat.includes("oil") || name.includes("oil") || name.includes("שמן");
  const hasRedSugar = sugarsG >= 10.0;
  const hasRedSodium = sodiumMg >= 400;
  const hasRedFat = !isPureOil && saturatedFatG >= 4.0;
  const isCleanLabel = !hasRedSugar && !hasRedSodium && !hasRedFat;

  const countryFlags: Record<string, string> = {
    Spain: "🇪🇸",
    Italy: "🇮🇹",
    France: "🇫🇷",
    Portugal: "🇵🇹",
    Greece: "🇬🇷",
    Turkey: "🇹🇷",
    Morocco: "🇲🇦",
    Israel: "🇮🇱",
    Germany: "🇩🇪",
    Netherlands: "🇳🇱",
    Poland: "🇵🇱",
    Belgium: "🇧🇪",
  };

  const country = product.supplier?.country_of_origin || "Europe";
  const flag = countryFlags[country] || "🇪🇺";

  const tempHeMap = {
    ambient: "יבש / טמפ׳ חדר (15-25°C)",
    chilled: "מצונן ומבוקר (2-4°C)",
    frozen: "קפוא עמוק (מינוס 18°C-)",
  };

  return {
    productId: product.id,
    productName: product.product_name,
    category: product.category,
    categoryHe: product.category,
    supplierName: product.supplier?.company_name || "מפעל אירופאי מאומת",
    countryOfOrigin: country,
    countryFlag: flag,
    formatDescription: formatStr,
    temperatureRegime: tempRegime,
    temperatureRegimeHe: tempHeMap[tempRegime],
    temperatureRange: tempRange,
    shelfLifeMonths,
    palletization: {
      unitsPerCarton,
      cartonWeightKg,
      cartonsPerLayer,
      layersPerPallet,
      totalCartonsPerPallet,
      totalUnitsPerPallet,
      palletGrossWeightKg,
      palletHeightCm,
      palletsPer20ft,
      unitsPer20ft,
      palletsPer40ftHC,
      unitsPer40ftHC,
    },
    nutrition: {
      servingSize: "100 גרם / 100 מ״ל",
      energyKcal,
      totalFatG,
      saturatedFatG,
      carbohydratesG,
      sugarsG,
      sodiumMg,
      proteinG,
      hasRedSugar,
      hasRedSodium,
      hasRedFat,
      isCleanLabel,
      allergensContainsHe,
      allergensMayContainHe,
      allergensContainsEn,
      allergensMayContainEn,
    },
    kosherTypes: product.kosher_types || ["כשרות רבנות יבוא"],
    certifications: product.certifications || ["IFS Food", "BRCGS"],
    privateLabelReady: product.private_label ?? true,
    barcodeFormat: "EAN-13 (GS1 Standard) & ITF-14 Outer Carton",
  };
}
