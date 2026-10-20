/**
 * ERP Inbound ASN (Advanced Shipping Notice) Generator
 * Formats multi-pallet container delivery manifests for Israeli supermarket ERP systems:
 * 1. Priority ERP (קליטת תעודת משלוח מספק / ASN ייבוא)
 * 2. SAP S/4HANA (Handling Unit / Inbound Delivery IDoc CSV)
 * 3. JSON REST Webhook payload for automated ERP integration
 */

export interface ErpAsnPayload {
  poNumber: string;
  poDate: string;
  buyerCompany: string;
  supplierFactory: string;
  originCountry: string;
  productName: string;
  hebrewName: string;
  skuCode?: string;
  eanBarcode?: string;
  containerNumber: string;
  billOfLading: string;
  customsDeclarationNumber?: string;
  palletCount: number;
  totalUnits: number;
  unitsPerPallet: number;
  netWeightKgPerUnit: number;
  grossWeightKgPerUnit: number;
  storageTemp?: string;
  batchNumber?: string;
  expiryDate?: string;
  dockBay?: string;
  licensePlate?: string;
}

/** Generates Priority ERP Inbound Receiving Manifest (UTF-8 with BOM for Hebrew Excel compatibility) */
export function generatePriorityErpCsv(data: ErpAsnPayload): string {
  const sku = data.skuCode || `FDX-${data.poNumber.slice(-4)}`;
  const barcode = data.eanBarcode || "7290001234567";
  const batch = data.batchNumber || `LOT-${data.poNumber.slice(-6)}-A`;
  const expiry = data.expiryDate || "31/12/2027";
  const storage = data.storageTemp || "+18.2C Dry Ambient";
  const dec = data.customsDeclarationNumber || `IL-2604-${data.poNumber.slice(-4)}`;

  // Header line in Priority ERP standard format
  const headers = [
    "מספר הזמנת רכש (PO)",
    "קוד פריט (SKU)",
    "ברקוד בינלאומי (EAN-13)",
    "תיאור פריט בעברית",
    "שם יצרן מקור",
    "ארץ מקור",
    "מספר משטח (SSCC / Pallet)",
    "מספר אצווה (Batch / Lot)",
    "תאריך פג תוקף (BBD)",
    "כמות יחידות במשטח",
    "משקל נטו משטח (ק״ג)",
    "משקל ברוטו משטח (ק״ג)",
    "טמפרטורת אחסון",
    "מספר מכולה",
    "שטר מטען ימי (B/L)",
    "מספר רשימון מכס",
  ];

  const rows: string[] = [headers.join(",")];

  const netPalletKg = Math.round(data.unitsPerPallet * data.netWeightKgPerUnit);
  const grossPalletKg = Math.round(data.unitsPerPallet * data.grossWeightKgPerUnit + 25); // +25kg EPAL wooden pallet

  for (let i = 1; i <= data.palletCount; i++) {
    const palletSscc = `03729${data.containerNumber.replace(/[^0-9]/g, "").padEnd(7, "0").slice(0, 7)}${i.toString().padStart(4, "0")}`;
    const row = [
      `"${data.poNumber}"`,
      `"${sku}"`,
      `"${barcode}"`,
      `"${data.hebrewName}"`,
      `"${data.supplierFactory}"`,
      `"${data.originCountry}"`,
      `"${palletSscc}"`,
      `"${batch}"`,
      `"${expiry}"`,
      data.unitsPerPallet,
      netPalletKg,
      grossPalletKg,
      `"${storage}"`,
      `"${data.containerNumber}"`,
      `"${data.billOfLading}"`,
      `"${dec}"`,
    ];
    rows.push(row.join(","));
  }

  // Prepend UTF-8 BOM (\uFEFF) so Excel in Hebrew Windows displays characters perfectly
  return "\uFEFF" + rows.join("\r\n");
}

/** Generates SAP S/4HANA Inbound Delivery IDoc (CSV format) */
export function generateSapIdocCsv(data: ErpAsnPayload): string {
  const matnr = data.skuCode || `FDX_${data.poNumber.slice(-4)}`;
  const ean = data.eanBarcode || "7290001234567";
  const charg = data.batchNumber || `LOT_${data.poNumber.slice(-6)}`;
  const vfdat = data.expiryDate ? data.expiryDate.split("/").reverse().join("") : "20271231";
  const dec = data.customsDeclarationNumber || `IL_2604_${data.poNumber.slice(-4)}`;

  const headers = [
    "EBELN",       // Purchasing Document Number
    "EBELP",       // Item Number of Purchasing Document
    "MATNR",       // Material Number
    "EAN11",       // International Article Number (EAN/UPC)
    "MAKTX",       // Material Description
    "EXIDV",       // External Handling Unit Identification (Pallet SSCC)
    "CHARG",       // Batch Number
    "VFDAT",       // Shelf Life Expiration Date (YYYYMMDD)
    "MENGE",       // Quantity
    "MEINS",       // Base Unit of Measure
    "BRGEW",       // Gross Weight
    "NTGEW",       // Net Weight
    "GEWEI",       // Weight Unit
    "TRAID",       // Container Number
    "BOLNR",       // Bill of Lading
    "CUSTOMS_REF", // Customs Clearance Number
  ];

  const rows: string[] = [headers.join(",")];
  const netPalletKg = Math.round(data.unitsPerPallet * data.netWeightKgPerUnit);
  const grossPalletKg = Math.round(data.unitsPerPallet * data.grossWeightKgPerUnit + 25);

  for (let i = 1; i <= data.palletCount; i++) {
    const palletSscc = `03729${data.containerNumber.replace(/[^0-9]/g, "").padEnd(7, "0").slice(0, 7)}${i.toString().padStart(4, "0")}`;
    const itemNum = (i * 10).toString().padStart(5, "0");
    const row = [
      `"${data.poNumber}"`,
      `"${itemNum}"`,
      `"${matnr}"`,
      `"${ean}"`,
      `"${data.productName}"`,
      `"${palletSscc}"`,
      `"${charg}"`,
      `"${vfdat}"`,
      data.unitsPerPallet,
      `"PCE"`,
      grossPalletKg,
      netPalletKg,
      `"KGM"`,
      `"${data.containerNumber}"`,
      `"${data.billOfLading}"`,
      `"${dec}"`,
    ];
    rows.push(row.join(","));
  }

  return rows.join("\r\n");
}

/** Generates clean JSON payload for Supermarket EDI/REST Webhooks */
export function generateAsnJson(data: ErpAsnPayload): Record<string, unknown> {
  const sku = data.skuCode || `FDX-${data.poNumber.slice(-4)}`;
  const barcode = data.eanBarcode || "7290001234567";
  const batch = data.batchNumber || `LOT-${data.poNumber.slice(-6)}-A`;
  const expiry = data.expiryDate || "2027-12-31";
  const dec = data.customsDeclarationNumber || `IL-2604-${data.poNumber.slice(-4)}`;

  const pallets = [];
  for (let i = 1; i <= data.palletCount; i++) {
    const palletSscc = `03729${data.containerNumber.replace(/[^0-9]/g, "").padEnd(7, "0").slice(0, 7)}${i.toString().padStart(4, "0")}`;
    pallets.push({
      palletIndex: i,
      palletSscc,
      palletStandard: "Euro-Pallet (EPAL 120x80cm)",
      unitsCount: data.unitsPerPallet,
      batchNumber: batch,
      expiryDate: expiry,
      netWeightKg: Math.round(data.unitsPerPallet * data.netWeightKgPerUnit),
      grossWeightKg: Math.round(data.unitsPerPallet * data.grossWeightKgPerUnit + 25),
    });
  }

  return {
    asnVersion: "1.0",
    generatedAt: new Date().toISOString(),
    commercialPo: data.poNumber,
    orderDate: data.poDate,
    buyer: {
      companyName: data.buyerCompany,
      erpSystem: "Priority / SAP S/4HANA",
    },
    supplier: {
      factoryName: data.supplierFactory,
      countryOfOrigin: data.originCountry,
    },
    product: {
      nameEnglish: data.productName,
      nameHebrew: data.hebrewName,
      sku,
      gtinEan13: barcode,
      totalPallets: data.palletCount,
      totalUnits: data.totalUnits,
      unitsPerPallet: data.unitsPerPallet,
    },
    logistics: {
      containerNumber: data.containerNumber,
      billOfLading: data.billOfLading,
      customsDeclaration: dec,
      temperatureRequirement: data.storageTemp || "+18.2°C Ambient",
      assignedDockBay: data.dockBay || "Bay 04",
      truckPlate: data.licensePlate || "84-912-33",
    },
    pallets,
  };
}
