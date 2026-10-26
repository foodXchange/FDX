/**
 * Supermarket Retail Category Margin & Consumer Shelf Price Simulator Engine
 * Calculates the full B2B Landed Cost Waterfall in ILS:
 * Factory CIF (EUR) -> Currency Conversion -> Port Handling -> Rabbinical Kashrut ->
 * SI 1145 Labeling -> Inland DC Trucking -> Net Wholesale Cost -> Target Shelf Price (inc. VAT) ->
 * Supermarket Gross Margin % vs. National Benchmark Brands -> Category Review Deck Data.
 */

export interface RetailBenchmarkPreset {
  id: string;
  categoryNameEn: string;
  categoryNameHe: string;
  productNameEn: string;
  productNameHe: string;
  nationalBrandName: string;
  nationalBrandShelfPriceIls: number;
  nationalBrandWholesaleCostIls: number;
  privateLabelTargetShelfPriceIls: number;
  factoryCifEur: number;
  containerUnits: number;
  containerType: string;
  palletCount: number;
  defaultExchangeRate: number; // EUR to ILS
  portTerminalHandlingIls: number;
  customsBrokerageIls: number;
  kashrutSupervisionFeeIls: number;
  si1145LabelingCostIls: number;
  inlandTruckingToDcIls: number;
}

export interface RetailMarginResult {
  // Input Echo
  factoryCifEur: number;
  exchangeRate: number;
  baseCifIls: number;
  
  // Cost Breakdown per Unit
  portTerminalHandlingIls: number;
  customsBrokerageIls: number;
  kashrutFeeIls: number;
  labelingCostIls: number;
  inlandTruckingIls: number;
  totalLogisticsComplianceIls: number;
  
  // Landed Cost & Supermarket Economics
  totalLandedCostIls: number; // Landed at DC (עלות נחיתה במרלו״ג)
  targetShelfPriceIls: number; // Shelf price inc. 18% VAT (מחיר לצרכן כולל מע״מ)
  netRevenueExVatIls: number; // Shelf price / 1.18
  supermarketGrossProfitIls: number; // Net revenue - Landed cost
  supermarketGrossMarginPct: number; // (Gross profit / Net revenue) * 100
  
  // Benchmark Comparison (e.g. Osem / Barilla / Yad Mordechai)
  benchmarkBrandName: string;
  benchmarkShelfPriceIls: number;
  benchmarkWholesaleCostIls: number;
  benchmarkNetRevenueIls: number;
  benchmarkGrossProfitIls: number;
  benchmarkGrossMarginPct: number;
  
  // Comparison Deltas
  marginExpansionPct: number; // Private label margin - Benchmark margin
  consumerPriceSavingPct: number; // % savings for the consumer vs benchmark
  profitDeltaPerUnitIls: number; // Extra profit per unit sold
  containerVolumeUnits: number;
  totalContainerLandedCostIls: number;
  totalContainerGrossProfitIls: number;
  extraContainerProfitVsBenchmarkIls: number; // Extra profit per 40ft HQ FCL
}

export const RETAIL_BENCHMARK_PRESETS: Record<string, RetailBenchmarkPreset> = {
  olive_oil_evoo: {
    id: "olive_oil_evoo",
    categoryNameEn: "Oils & Fats",
    categoryNameHe: "שמנים ורטבים",
    productNameEn: "Spanish Extra Virgin Olive Oil 1L (Acidity < 0.3%)",
    productNameHe: "שמן זית כתית מעולה 1 ליטר (חומציות מרבית 0.3%)",
    nationalBrandName: "יד מרדכי / שטראוס (Yad Mordechai 750ml)",
    nationalBrandShelfPriceIls: 29.90,
    nationalBrandWholesaleCostIls: 22.80,
    privateLabelTargetShelfPriceIls: 18.90,
    factoryCifEur: 1.512,
    containerUnits: 24000,
    containerType: "1 x 40ft High Cube FCL",
    palletCount: 24,
    defaultExchangeRate: 4.05,
    portTerminalHandlingIls: 0.28,
    customsBrokerageIls: 0.12,
    kashrutSupervisionFeeIls: 0.18,
    si1145LabelingCostIls: 0.22,
    inlandTruckingToDcIls: 0.25,
  },
  bronze_pasta_500g: {
    id: "bronze_pasta_500g",
    categoryNameEn: "Dry Pasta & Semolina",
    categoryNameHe: "פסטה יבשה ודגנים",
    productNameEn: "Italian Bronze-Die Durum Wheat Pasta 500g (Penne)",
    productNameHe: "פסטה איטלקית במשיכת ברונזה 500 גרם (פנה ריגטה)",
    nationalBrandName: "ברילה / אסם (Barilla Collezione 500g)",
    nationalBrandShelfPriceIls: 8.90,
    nationalBrandWholesaleCostIls: 6.70,
    privateLabelTargetShelfPriceIls: 4.90,
    factoryCifEur: 0.504,
    containerUnits: 48000,
    containerType: "1 x 40ft High Cube FCL",
    palletCount: 24,
    defaultExchangeRate: 4.05,
    portTerminalHandlingIls: 0.14,
    customsBrokerageIls: 0.06,
    kashrutSupervisionFeeIls: 0.08,
    si1145LabelingCostIls: 0.12,
    inlandTruckingToDcIls: 0.12,
  },
  tomato_passata_700g: {
    id: "tomato_passata_700g",
    categoryNameEn: "Canned Tomatoes & Sauces",
    categoryNameHe: "עגבניות משומרות ורטבים",
    productNameEn: "Rustic Italian Tomato Passata 700g Glass Bottle",
    productNameHe: "מחית עגבניות כפרית איטלקית (פאסאטה) 700 גרם",
    nationalBrandName: "מוטי איטליה (Mutti Passata 700g)",
    nationalBrandShelfPriceIls: 11.90,
    nationalBrandWholesaleCostIls: 8.90,
    privateLabelTargetShelfPriceIls: 6.90,
    factoryCifEur: 0.800,
    containerUnits: 36000,
    containerType: "1 x 40ft High Cube FCL",
    palletCount: 24,
    defaultExchangeRate: 4.05,
    portTerminalHandlingIls: 0.19,
    customsBrokerageIls: 0.08,
    kashrutSupervisionFeeIls: 0.11,
    si1145LabelingCostIls: 0.14,
    inlandTruckingToDcIls: 0.16,
  },
  spanish_olives_350g: {
    id: "spanish_olives_350g",
    categoryNameEn: "Canned Vegetables & Pickles",
    categoryNameHe: "שימורי ירקות וזיתים",
    productNameEn: "Spanish Pitted Manzanilla Olives 350g Can",
    productNameHe: "זיתי מנזנילה מגולענים מובחרים 350 גרם",
    nationalBrandName: "בית השיטה / קבוצת יבנה (Beit Hashita 350g)",
    nationalBrandShelfPriceIls: 7.90,
    nationalBrandWholesaleCostIls: 5.80,
    privateLabelTargetShelfPriceIls: 4.50,
    factoryCifEur: 0.650,
    containerUnits: 30000,
    containerType: "1 x 20ft FCL",
    palletCount: 12,
    defaultExchangeRate: 4.05,
    portTerminalHandlingIls: 0.16,
    customsBrokerageIls: 0.07,
    kashrutSupervisionFeeIls: 0.09,
    si1145LabelingCostIls: 0.12,
    inlandTruckingToDcIls: 0.15,
  },
};

/**
 * Calculates complete B2B to B2C retail margin waterfall
 */
export function calculateRetailMargin(
  preset: RetailBenchmarkPreset,
  overrides?: Partial<{
    factoryCifEur: number;
    exchangeRate: number;
    targetShelfPriceIls: number;
    benchmarkShelfPriceIls: number;
    benchmarkWholesaleCostIls: number;
  }>
): RetailMarginResult {
  const factoryCifEur = overrides?.factoryCifEur ?? preset.factoryCifEur;
  const exchangeRate = overrides?.exchangeRate ?? preset.defaultExchangeRate;
  const targetShelfPriceIls = overrides?.targetShelfPriceIls ?? preset.privateLabelTargetShelfPriceIls;
  const benchmarkShelfPriceIls = overrides?.benchmarkShelfPriceIls ?? preset.nationalBrandShelfPriceIls;
  const benchmarkWholesaleCostIls = overrides?.benchmarkWholesaleCostIls ?? preset.nationalBrandWholesaleCostIls;

  // 1. Base CIF in ILS
  const baseCifIls = Number((factoryCifEur * exchangeRate).toFixed(3));

  // 2. Logistics & Local Regulatory Costs
  const portTerminalHandlingIls = preset.portTerminalHandlingIls;
  const customsBrokerageIls = preset.customsBrokerageIls;
  const kashrutFeeIls = preset.kashrutSupervisionFeeIls;
  const labelingCostIls = preset.si1145LabelingCostIls;
  const inlandTruckingIls = preset.inlandTruckingToDcIls;

  const totalLogisticsComplianceIls = Number(
    (portTerminalHandlingIls + customsBrokerageIls + kashrutFeeIls + labelingCostIls + inlandTruckingIls).toFixed(3)
  );

  // 3. Total Landed Cost at Supermarket Central DC
  const totalLandedCostIls = Number((baseCifIls + totalLogisticsComplianceIls).toFixed(3));

  // 4. Retail Private Label Economics (Net revenue excl. 18% VAT)
  const netRevenueExVatIls = Number((targetShelfPriceIls / 1.18).toFixed(3));
  const supermarketGrossProfitIls = Number((netRevenueExVatIls - totalLandedCostIls).toFixed(3));
  const supermarketGrossMarginPct = Number(((supermarketGrossProfitIls / netRevenueExVatIls) * 100).toFixed(1));

  // 5. Benchmark Brand Economics
  const benchmarkNetRevenueIls = Number((benchmarkShelfPriceIls / 1.18).toFixed(3));
  const benchmarkGrossProfitIls = Number((benchmarkNetRevenueIls - benchmarkWholesaleCostIls).toFixed(3));
  const benchmarkGrossMarginPct = Number(((benchmarkGrossProfitIls / benchmarkNetRevenueIls) * 100).toFixed(1));

  // 6. Comparative Gains & Delatas
  const marginExpansionPct = Number((supermarketGrossMarginPct - benchmarkGrossMarginPct).toFixed(1));
  const consumerPriceSavingPct = Number(
    (((benchmarkShelfPriceIls - targetShelfPriceIls) / benchmarkShelfPriceIls) * 100).toFixed(1)
  );
  const profitDeltaPerUnitIls = Number((supermarketGrossProfitIls - benchmarkGrossProfitIls).toFixed(3));

  // Container Gross Totals
  const containerVolumeUnits = preset.containerUnits;
  const totalContainerLandedCostIls = Math.round(totalLandedCostIls * containerVolumeUnits);
  const totalContainerGrossProfitIls = Math.round(supermarketGrossProfitIls * containerVolumeUnits);
  const extraContainerProfitVsBenchmarkIls = Math.round(profitDeltaPerUnitIls * containerVolumeUnits);

  return {
    factoryCifEur,
    exchangeRate,
    baseCifIls,
    portTerminalHandlingIls,
    customsBrokerageIls,
    kashrutFeeIls,
    labelingCostIls,
    inlandTruckingIls,
    totalLogisticsComplianceIls,
    totalLandedCostIls,
    targetShelfPriceIls,
    netRevenueExVatIls,
    supermarketGrossProfitIls,
    supermarketGrossMarginPct,
    benchmarkBrandName: preset.nationalBrandName,
    benchmarkShelfPriceIls,
    benchmarkWholesaleCostIls,
    benchmarkNetRevenueIls,
    benchmarkGrossProfitIls,
    benchmarkGrossMarginPct,
    marginExpansionPct,
    consumerPriceSavingPct,
    profitDeltaPerUnitIls,
    containerVolumeUnits,
    totalContainerLandedCostIls,
    totalContainerGrossProfitIls,
    extraContainerProfitVsBenchmarkIls,
  };
}
