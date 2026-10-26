/**
 * Supermarket Chain ERP & EDI Connector Engine
 * Generates and validates official electronic transaction interchange messages
 * for major Israeli supermarket chains (Shufersal, Rami Levy, Yohananof, Victory, Carrefour Israel):
 * 1. StoreNext EDIFACT (D96A ORDERS, DESADV, INVOIC, PRICAT) - Standard Israeli Supermarket EDI
 * 2. SAP S/4HANA Retail IDoc XML (ORDERS05, DESADV01, INVOIC02)
 * 3. Priority ERP Tab-Delimited & OData REST JSON Interface
 * 4. GS1 Modulo-10 Barcode (EAN-13) & SSCC-18 Pallet Validation
 */

export type SupermarketChainId = "shufersal" | "rami_levy" | "yohananof" | "victory" | "carrefour_il";

export type ErpSystemType = "storenext_edifact" | "sap_s4hana" | "priority_erp" | "comax";

export type EdiDocumentType = "EDI_850_ORDERS" | "EDI_856_DESADV" | "EDI_810_INVOIC" | "PRICAT_ITEM_MASTER";

export interface SupermarketChainProfile {
  id: SupermarketChainId;
  nameHe: string;
  nameEn: string;
  corporateVatId: string;
  storeNextGln: string; // Global Location Number
  defaultErp: ErpSystemType;
  centralDistributionCenter: {
    code: string;
    nameHe: string;
    nameEn: string;
    city: string;
  };
  preferredPaymentTermsDays: number;
}

export interface EdiTransactionInput {
  chainId: SupermarketChainId;
  erpType: ErpSystemType;
  docType: EdiDocumentType;
  poNumber: string;
  poDate: string;
  deliveryDate: string;
  invoiceNumber?: string;
  buyerCompany: string;
  supplierName: string;
  supplierVatId: string;
  supplierGln: string;
  productNameHe: string;
  productNameEn: string;
  sku: string;
  ean13: string;
  totalUnits: number;
  palletCount: number;
  unitsPerCarton: number;
  cartonsPerPallet: number;
  unitWholesalePriceIls: number;
  vatRatePct: number; // 18% standard
  containerNumber: string;
  billOfLading: string;
  mohGreenPassRef?: string;
  batchNumber: string;
  expiryDate: string;
}

export interface EdiValidationIssue {
  field: string;
  severity: "ERROR" | "WARNING";
  messageHe: string;
  messageEn: string;
}

export interface EdiGenerationResult {
  formattedContent: string;
  formatType: "edifact" | "xml" | "csv" | "json";
  fileName: string;
  interchangeControlNumber: string;
  validationIssues: EdiValidationIssue[];
  isValid: boolean;
  totalGrossAmountIls: number;
  vatAmountIls: number;
  totalNetAmountIls: number;
}

// =========================================================================
// ISRAELI SUPERMARKET CHAIN PROFILES
// =========================================================================
export const SUPERMARKET_CHAINS: Record<SupermarketChainId, SupermarketChainProfile> = {
  shufersal: {
    id: "shufersal",
    nameHe: "שופרסל בע״מ",
    nameEn: "Shufersal Ltd.",
    corporateVatId: "52-002708-4",
    storeNextGln: "7290058140001",
    defaultErp: "sap_s4hana",
    centralDistributionCenter: {
      code: "DC-SHOHAM-01",
      nameHe: "מרלו״ג שופרסל שוהם (חומרי גלם וסחר)",
      nameEn: "Shufersal Shoham Central Logistics Hub",
      city: "Shoham",
    },
    preferredPaymentTermsDays: 90,
  },
  rami_levy: {
    id: "rami_levy",
    nameHe: "רמי לוי שיווק השקמה",
    nameEn: "Rami Levy Shivuk Hashikma",
    corporateVatId: "51-382902-1",
    storeNextGln: "7290058220002",
    defaultErp: "priority_erp",
    centralDistributionCenter: {
      code: "DC-MODIIN-88",
      nameHe: "מרכז לוגיסטי רמי לוי מודיעין",
      nameEn: "Rami Levy Modi'in Distribution Center",
      city: "Modi'in",
    },
    preferredPaymentTermsDays: 60,
  },
  yohananof: {
    id: "yohananof",
    nameHe: "רשת יוחננוף",
    nameEn: "Yohananof Supermarkets",
    corporateVatId: "51-248102-7",
    storeNextGln: "7290058330003",
    defaultErp: "priority_erp",
    centralDistributionCenter: {
      code: "DC-QIRYAT-GAT",
      nameHe: "מרלו״ג יוחננוף קרית גת",
      nameEn: "Yohananof Kiryat Gat Logistics DC",
      city: "Kiryat Gat",
    },
    preferredPaymentTermsDays: 60,
  },
  victory: {
    id: "victory",
    nameHe: "ויקטורי רשת סופרמרקטים",
    nameEn: "Victory Supermarket Chain",
    corporateVatId: "51-289401-4",
    storeNextGln: "7290058440004",
    defaultErp: "comax",
    centralDistributionCenter: {
      code: "DC-GAN-RAVEH",
      nameHe: "מרלו״ג ויקטורי גן רווה",
      nameEn: "Victory Gan Raveh Central DC",
      city: "Gan Raveh",
    },
    preferredPaymentTermsDays: 75,
  },
  carrefour_il: {
    id: "carrefour_il",
    nameHe: "קרפור ישראל (אלקטרה מוצרי צריכה)",
    nameEn: "Carrefour Israel (Electra Consumer)",
    corporateVatId: "51-008492-3",
    storeNextGln: "7290058550005",
    defaultErp: "sap_s4hana",
    centralDistributionCenter: {
      code: "DC-CARREFOUR-RISHON",
      nameHe: "מרלו״ג ראשי קרפור ראשון לציון",
      nameEn: "Carrefour Central Warehouse Rishon LeZion",
      city: "Rishon LeZion",
    },
    preferredPaymentTermsDays: 90,
  },
};

// =========================================================================
// GS1 VALIDATION UTILITIES
// =========================================================================

/**
 * Validates GS1 Modulo-10 checksum for standard EAN-13 barcodes
 */
export function validateEan13Checksum(barcode: string): boolean {
  const clean = barcode.replace(/[^0-9]/g, "");
  if (clean.length !== 13) return false;

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const num = parseInt(clean[i], 10);
    sum += i % 2 === 0 ? num * 1 : num * 3;
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === parseInt(clean[12], 10);
}

/**
 * Generates standard GS1-128 SSCC-18 pallet tracking barcode
 */
export function generateSscc18PalletCode(supplierGln: string, palletIndex: number): string {
  const prefix = "0"; // Extension digit for cartons/pallets
  const glnTrimmed = supplierGln.replace(/[^0-9]/g, "").padEnd(7, "0").slice(0, 7);
  const serial = palletIndex.toString().padStart(9, "0");
  const raw17 = `${prefix}${glnTrimmed}${serial}`;

  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const digit = parseInt(raw17[i], 10);
    sum += i % 2 === 0 ? digit * 3 : digit * 1;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return `${raw17}${checkDigit}`;
}

// =========================================================================
// STORENEXT EDIFACT (D96A) GENERATOR
// =========================================================================
export function generateStoreNextEdifact(input: EdiTransactionInput, icn: string): string {
  const chain = SUPERMARKET_CHAINS[input.chainId];
  const dateStr = input.poDate.replace(/-/g, "");
  const timeStr = "1200";
  const netAmount = (input.totalUnits * input.unitWholesalePriceIls).toFixed(2);
  const vatAmount = ((parseFloat(netAmount) * input.vatRatePct) / 100).toFixed(2);
  const grossAmount = (parseFloat(netAmount) + parseFloat(vatAmount)).toFixed(2);

  if (input.docType === "EDI_850_ORDERS") {
    return [
      `UNB+UNOA:2+${input.supplierGln}:14+${chain.storeNextGln}:14+${dateStr}:${timeStr}+${icn}'`,
      `UNH+${icn}+ORDERS:D:96A:UN:EAN008'`,
      `BGM+220+${input.poNumber}+9'`,
      `DTM+137:${dateStr}:102'`,
      `DTM+2:${input.deliveryDate.replace(/-/g, "")}:102'`,
      `NAD+BY+${chain.storeNextGln}::9++${chain.nameHe}+Shoham Hub++${chain.centralDistributionCenter.city}'`,
      `NAD+SU+${input.supplierGln}::9++${input.supplierName}++Ashdod Port Gate'`,
      `LIN+1++${input.ean13}:EN'`,
      `PIA+1+${input.sku}:IN'`,
      `IMD+F++:::${input.productNameHe}'`,
      `QTY+21:${input.totalUnits}:PCE'`,
      `PRI+AAA:${input.unitWholesalePriceIls}::NTP'`,
      `UNS+S'`,
      `CNT+2:1'`,
      `MOA+86:${grossAmount}'`,
      `UNT+16+${icn}'`,
      `UNZ+1+${icn}'`,
    ].join("\n");
  }

  if (input.docType === "EDI_856_DESADV") {
    const sscc1 = generateSscc18PalletCode(input.supplierGln, 1);
    return [
      `UNB+UNOA:2+${input.supplierGln}:14+${chain.storeNextGln}:14+${dateStr}:${timeStr}+${icn}'`,
      `UNH+${icn}+DESADV:D:96A:UN:EAN005'`,
      `BGM+351+ASN-${input.poNumber}+9'`,
      `DTM+137:${dateStr}:102'`,
      `DTM+11:${input.deliveryDate.replace(/-/g, "")}:102'`,
      `RFF+ON:${input.poNumber}'`,
      `RFF+BM:${input.billOfLading}'`,
      `RFF+CN:${input.containerNumber}'`,
      input.mohGreenPassRef ? `RFF+AGR:${input.mohGreenPassRef}'` : "",
      `NAD+BY+${chain.storeNextGln}::9++${chain.nameHe}'`,
      `NAD+DP+${chain.centralDistributionCenter.code}::92++${chain.centralDistributionCenter.nameHe}'`,
      `CPS+1'`,
      `PAC+${input.palletCount}++201::9'`,
      `GIN+BJ+${sscc1}'`,
      `LIN+1++${input.ean13}:EN'`,
      `PIA+1+${input.sku}:IN'`,
      `QTY+12:${input.totalUnits}:PCE'`,
      `PIA+5+${input.batchNumber}:BN'`,
      `DTM+361:${input.expiryDate.replace(/-/g, "")}:102'`,
      `UNT+18+${icn}'`,
      `UNZ+1+${icn}'`,
    ].filter(Boolean).join("\n");
  }

  // EDI_810_INVOIC
  const invNumber = input.invoiceNumber || `INV-${input.poNumber.slice(-5)}`;
  return [
    `UNB+UNOA:2+${input.supplierGln}:14+${chain.storeNextGln}:14+${dateStr}:${timeStr}+${icn}'`,
    `UNH+${icn}+INVOIC:D:96A:UN:EAN008'`,
    `BGM+380+${invNumber}+9'`,
    `DTM+137:${dateStr}:102'`,
    `RFF+ON:${input.poNumber}'`,
    `NAD+BY+${chain.storeNextGln}::9++${chain.nameHe}+VAT:${chain.corporateVatId}'`,
    `NAD+SE+${input.supplierGln}::9++${input.supplierName}+VAT:${input.supplierVatId}'`,
    `LIN+1++${input.ean13}:EN'`,
    `IMD+F++:::${input.productNameHe}'`,
    `QTY+47:${input.totalUnits}:PCE'`,
    `MOA+203:${netAmount}'`,
    `PRI+AAA:${input.unitWholesalePriceIls}'`,
    `TAX+7+VAT+++:::${input.vatRatePct}'`,
    `MOA+124:${vatAmount}'`,
    `UNS+S'`,
    `CNT+2:1'`,
    `MOA+77:${grossAmount}'`,
    `MOA+79:${netAmount}'`,
    `UNT+19+${icn}'`,
    `UNZ+1+${icn}'`,
  ].join("\n");
}

// =========================================================================
// SAP S/4HANA RETAIL IDOC XML GENERATOR
// =========================================================================
export function generateSapIdocXml(input: EdiTransactionInput, icn: string): string {
  const chain = SUPERMARKET_CHAINS[input.chainId];
  const netAmount = (input.totalUnits * input.unitWholesalePriceIls).toFixed(2);
  const vatAmount = ((parseFloat(netAmount) * input.vatRatePct) / 100).toFixed(2);
  const grossAmount = (parseFloat(netAmount) + parseFloat(vatAmount)).toFixed(2);

  if (input.docType === "EDI_850_ORDERS") {
    return `<?xml version="1.0" encoding="UTF-8"?>
<ORDERS05>
  <IDOC BEGIN="1">
    <EDI_DC40 SEGMENT="1">
      <TABNAM>EDI_DC40</TABNAM>
      <DIRECT>1</DIRECT>
      <IDOCTYP>ORDERS05</IDOCTYP>
      <MESTYP>ORDERS</MESTYP>
      <SNDPRT>LS</SNDPRT>
      <SNDPRN>SAP_${input.chainId.toUpperCase()}</SNDPRN>
      <RCVPRT>LI</RCVPRT>
      <RCVPRN>${input.supplierGln}</RCVPRN>
      <DOCNUM>${icn}</DOCNUM>
      <CREDAT>${input.poDate.replace(/-/g, "")}</CREDAT>
      <CRETIM>120000</CRETIM>
    </EDI_DC40>
    <E1EDK01 SEGMENT="1">
      <ACTION>000</ACTION>
      <BELNR>${input.poNumber}</BELNR>
      <CURCY>ILS</CURCY>
      <HNAME>${chain.nameEn}</HNAME>
    </E1EDK01>
    <E1EDK14 SEGMENT="1">
      <QUALF>008</QUALF>
      <ORGID>${chain.centralDistributionCenter.code}</ORGID>
    </E1EDK14>
    <E1EDK03 SEGMENT="1">
      <IDDAT>002</IDDAT>
      <DATUM>${input.deliveryDate.replace(/-/g, "")}</DATUM>
    </E1EDK03>
    <E1EDP01 SEGMENT="1">
      <POSEX>00010</POSEX>
      <MENGE>${input.totalUnits}</MENGE>
      <MENEE>PCE</MENEE>
      <NETWR>${netAmount}</NETWR>
      <E1EDP19 SEGMENT="1">
        <QUALF>003</QUALF>
        <IDTNR>${input.ean13}</IDTNR>
        <KTEXT>${input.productNameHe}</KTEXT>
      </E1EDP19>
      <E1EDP05 SEGMENT="1">
        <ALCKZ>+</ALCKZ>
        <BETRG>${input.unitWholesalePriceIls}</BETRG>
      </E1EDP05>
    </E1EDP01>
    <E1EDS01 SEGMENT="1">
      <SUMID>002</SUMID>
      <SUMME>${grossAmount}</SUMME>
      <SUNIT>ILS</SUNIT>
    </E1EDS01>
  </IDOC>
</ORDERS05>`;
  }

  // DESADV01 / Inbound Delivery IDoc
  const ssccCode = generateSscc18PalletCode(input.supplierGln, 1);
  return `<?xml version="1.0" encoding="UTF-8"?>
<DESADV01>
  <IDOC BEGIN="1">
    <EDI_DC40 SEGMENT="1">
      <TABNAM>EDI_DC40</TABNAM>
      <DIRECT>2</DIRECT>
      <IDOCTYP>DESADV01</IDOCTYP>
      <MESTYP>DESADV</MESTYP>
      <SNDPRN>${input.supplierGln}</SNDPRN>
      <RCVPRN>SAP_${input.chainId.toUpperCase()}</RCVPRN>
      <DOCNUM>${icn}</DOCNUM>
    </EDI_DC40>
    <E1EDK07 SEGMENT="1">
      <VBELN>ASN-${input.poNumber}</VBELN>
      <BSTNK>${input.poNumber}</BSTNK>
      <BOLNR>${input.billOfLading}</BOLNR>
      <TRAID>${input.containerNumber}</TRAID>
      <MOH_CLEARANCE>${input.mohGreenPassRef || "APPROVED_GREEN_PASS"}</MOH_CLEARANCE>
    </E1EDK07>
    <E1EDL20 SEGMENT="1">
      <VSTEL>${chain.centralDistributionCenter.code}</VSTEL>
      <LFDAT>${input.deliveryDate.replace(/-/g, "")}</LFDAT>
      <E1EDL37 SEGMENT="1">
        <EXIDV>${ssccCode}</EXIDV>
        <VHILM>PALLET_EPAL_ISPM15</VHILM>
        <INHALT>${input.totalUnits / input.palletCount} PCE</INHALT>
      </E1EDL37>
      <E1EDL24 SEGMENT="1">
        <POSNR>000010</POSNR>
        <MATNR>${input.sku}</MATNR>
        <ARKTX>${input.productNameHe}</ARKTX>
        <LFIMG>${input.totalUnits}</LFIMG>
        <CHARG>${input.batchNumber}</CHARG>
        <VFDAT>${input.expiryDate.replace(/-/g, "")}</VFDAT>
      </E1EDL24>
    </E1EDL20>
  </IDOC>
</DESADV01>`;
}

// =========================================================================
// PRIORITY ERP INTERFACE GENERATOR (Hebrew Columns & OData Payload)
// =========================================================================
export function generatePriorityErpDirect(input: EdiTransactionInput): string {
  const chain = SUPERMARKET_CHAINS[input.chainId];
  const netAmount = (input.totalUnits * input.unitWholesalePriceIls).toFixed(2);
  const vatAmount = ((parseFloat(netAmount) * input.vatRatePct) / 100).toFixed(2);
  const grossAmount = (parseFloat(netAmount) + parseFloat(vatAmount)).toFixed(2);

  if (input.docType === "EDI_856_DESADV") {
    const headers = [
      "מספר הזמנת רכש (PO)",
      "שם ספק יבוא",
      "ח.פ / עוסק מורשה ספק",
      "מק״ט פריט (SKU)",
      "ברקוד בינלאומי (EAN-13)",
      "תיאור פריט בעברית",
      "כמות יחידות",
      "מחיר יחידה (ש״ח)",
      "סה״כ לתשלום נטו",
      "מע״מ 18%",
      "סה״כ כולל מע״מ",
      "מספר משטחים (Pallets)",
      "מספר אצווה (Batch/Lot)",
      "תאריך פג תוקף",
      "מספר מכולה",
      "שטר מטען ימי (B/L)",
      "אישור משרד הבריאות (MOH)",
      "קוד מרלו״ג יעד",
    ];

    const row = [
      input.poNumber,
      `"${input.supplierName}"`,
      input.supplierVatId,
      input.sku,
      input.ean13,
      `"${input.productNameHe}"`,
      input.totalUnits,
      input.unitWholesalePriceIls.toFixed(2),
      netAmount,
      vatAmount,
      grossAmount,
      input.palletCount,
      input.batchNumber,
      input.expiryDate,
      input.containerNumber,
      input.billOfLading,
      input.mohGreenPassRef || "MOH-GREEN-PASS-APPROVED",
      chain.centralDistributionCenter.code,
    ];

    return [headers.join(","), row.join(",")].join("\n");
  }

  // Priority OData REST JSON format for direct API push
  return JSON.stringify(
    {
      PriorityInterface: "DOCUMENTS_IN",
      CompanyGLN: chain.storeNextGln,
      DocumentType: input.docType,
      OrderNumber: input.poNumber,
      OrderDate: input.poDate,
      RequiredDeliveryDate: input.deliveryDate,
      CustomerVatNumber: chain.corporateVatId,
      VendorVatNumber: input.supplierVatId,
      TargetWarehouse: chain.centralDistributionCenter.code,
      Currency: "ILS",
      TotalNetILS: parseFloat(netAmount),
      VatAmountILS: parseFloat(vatAmount),
      TotalGrossILS: parseFloat(grossAmount),
      MaritimeDetails: {
        ContainerNumber: input.containerNumber,
        BillOfLading: input.billOfLading,
        MohPreClearanceCertificate: input.mohGreenPassRef || "APPROVED_GREEN_PASS",
      },
      OrderItems: [
        {
          LineNumber: 1,
          PartName: input.sku,
          BarCodeEan13: input.ean13,
          DescriptionHe: input.productNameHe,
          Quantity: input.totalUnits,
          PalletCount: input.palletCount,
          UnitPriceILS: input.unitWholesalePriceIls,
          BatchLot: input.batchNumber,
          ExpiryDate: input.expiryDate,
        },
      ],
    },
    null,
    2
  );
}

// =========================================================================
// MAIN EDI GENERATION & VALIDATION ROUTER
// =========================================================================
export function generateSupermarketEdiTransaction(input: EdiTransactionInput): EdiGenerationResult {
  const validationIssues: EdiValidationIssue[] = [];

  // 1. Validate Barcode
  if (!validateEan13Checksum(input.ean13)) {
    validationIssues.push({
      field: "ean13",
      severity: "ERROR",
      messageHe: `ברקוד EAN-13 לא תקין (${input.ean13}) - נכשל בספרת ביקורת Modulo-10 של GS1.`,
      messageEn: `Invalid EAN-13 barcode (${input.ean13}) - Failed GS1 Modulo-10 checksum algorithm.`,
    });
  }

  // 2. Validate Container Number standard
  if (!/^[A-Z]{4}\d{7}$/.test(input.containerNumber.replace(/[\s-]/g, ""))) {
    validationIssues.push({
      field: "containerNumber",
      severity: "WARNING",
      messageHe: `מבנה מספר מכולה (${input.containerNumber}) אינו תואם תקן ISO 6346 (4 אותיות + 7 ספרות).`,
      messageEn: `Container ID (${input.containerNumber}) does not strictly match ISO 6346 (4 letters + 7 digits).`,
    });
  }

  // 3. Validate VAT Rate
  if (input.vatRatePct !== 18) {
    validationIssues.push({
      field: "vatRatePct",
      severity: "WARNING",
      messageHe: `שיעור המע״מ הנבחר (${input.vatRatePct}%) אינו מע״מ חוקי בישראל (18%).`,
      messageEn: `Selected VAT rate (${input.vatRatePct}%) differs from Israeli legal 18% standard.`,
    });
  }

  const icn = `${Date.now().toString().slice(-6)}`;
  const netAmount = input.totalUnits * input.unitWholesalePriceIls;
  const vatAmount = (netAmount * input.vatRatePct) / 100;
  const grossAmount = netAmount + vatAmount;

  let formattedContent = "";
  let formatType: "edifact" | "xml" | "csv" | "json" = "edifact";
  let fileName = "";

  if (input.erpType === "storenext_edifact") {
    formattedContent = generateStoreNextEdifact(input, icn);
    formatType = "edifact";
    fileName = `StoreNext_${input.chainId}_${input.docType}_${input.poNumber}.edi`;
  } else if (input.erpType === "sap_s4hana") {
    formattedContent = generateSapIdocXml(input, icn);
    formatType = "xml";
    fileName = `SAP_IDoc_${input.chainId}_${input.docType}_${input.poNumber}.xml`;
  } else if (input.erpType === "priority_erp") {
    formattedContent = generatePriorityErpDirect(input);
    formatType = input.docType === "EDI_856_DESADV" ? "csv" : "json";
    fileName = `Priority_${input.chainId}_${input.docType}_${input.poNumber}.${formatType}`;
  } else {
    // Comax
    formattedContent = generatePriorityErpDirect(input);
    formatType = "csv";
    fileName = `Comax_${input.chainId}_${input.docType}_${input.poNumber}.csv`;
  }

  const isValid = !validationIssues.some((issue) => issue.severity === "ERROR");

  return {
    formattedContent,
    formatType,
    fileName,
    interchangeControlNumber: icn,
    validationIssues,
    isValid,
    totalGrossAmountIls: Math.round(grossAmount),
    vatAmountIls: Math.round(vatAmount),
    totalNetAmountIls: Math.round(netAmount),
  };
}
