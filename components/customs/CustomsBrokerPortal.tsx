"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import ExportDocumentHandoverModal from "@/components/documents/ExportDocumentHandoverModal";
import ErpAsnExportModal from "@/components/documents/ErpAsnExportModal";
import TradeTooltip from "@/components/ui/TradeTooltip";
import TourGuide, { TourStep } from "@/components/tour/TourGuide";
import type { CommercialOrderLifecycle } from "@/app/admin/requests/actions";
import { submitCustomsBrokerClearance } from "@/app/customs/actions";

export interface CustomsBrokerPortalProps {
  requestId: string;
  lang?: "he" | "en";
  buyerCompany: string;
  buyerContact?: string;
  buyerPhone?: string;
  buyerEmail?: string;
  buyerWarehouseAddress?: string;
  supplierName: string;
  supplierCountry: string;
  productName: string;
  orderVolume?: string;
  containerCount?: number;
  workflow?: CommercialOrderLifecycle | null;
  poNumber?: string;
  poDate?: string;
  customsSignoff?: {
    customsDeclarationNumber?: string;
    releaseChannel?: string;
    gatePassNumber?: string;
    clearingAgentName?: string;
    clearingAgency?: string;
    notes?: string;
    clearedAt?: string;
    status?: string;
  } | null;
}

export default function CustomsBrokerPortal({
  requestId,
  lang = "he",
  buyerCompany,
  buyerContact,
  buyerPhone,
  buyerEmail,
  buyerWarehouseAddress,
  supplierName,
  supplierCountry,
  productName,
  orderVolume = "24,000 Units (1 x 40ft HQ FCL)",
  containerCount = 1,
  workflow,
  poNumber,
  poDate,
  customsSignoff,
}: CustomsBrokerPortalProps) {
  const isHe = lang === "he";

  // Modals state
  const [showDocModal, setShowDocModal] = useState(false);
  const [showAsnModal, setShowAsnModal] = useState(false);
  const [showXmlModal, setShowXmlModal] = useState(false);
  const [activeDocTab, setActiveDocTab] = useState<string>("bl");
  const [selectedDocDetail, setSelectedDocDetail] = useState<any | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Shaar Olami EDI XML Simulation state
  const [xmlSimulationPhase, setXmlSimulationPhase] = useState<
    "idle" | "connecting" | "validating" | "evaluating" | "cleared"
  >("idle");

  // Form inputs for customs broker
  const isAlreadyCleared =
    workflow?.customs_status === "customs_cleared" ||
    customsSignoff?.status === "cleared";

  const [clearingAgency, setClearingAgency] = useState<string>(
    customsSignoff?.clearingAgency ||
      (isHe
        ? "ד.ס.ו שילוח ועמילות מכס (DSV Israel)"
        : "DSV Air & Sea / Customs Brokerage Israel")
  );
  const [clearingAgentName, setClearingAgentName] = useState<string>(
    customsSignoff?.clearingAgentName ||
      (isHe
        ? "אלון ברקוביץ' (מורשה מכס #4912)"
        : "Alon Berkovich (Licensed Broker #4912)")
  );
  const [customsDeclarationNumber, setCustomsDeclarationNumber] = useState<string>(
    customsSignoff?.customsDeclarationNumber ||
      workflow?.customs_declaration_number ||
      `IL-2604-${requestId.slice(0, 6).toUpperCase()}`
  );
  const [releaseChannel, setReleaseChannel] = useState<
    "green" | "document_inspection" | "physical_check"
  >(
    (customsSignoff?.releaseChannel as
      | "green"
      | "document_inspection"
      | "physical_check") || "green"
  );
  const [gatePassNumber, setGatePassNumber] = useState<string>(
    customsSignoff?.gatePassNumber ||
      `DO-ASH-${requestId.slice(0, 5).toUpperCase()}-21`
  );
  const [notes, setNotes] = useState<string>(
    customsSignoff?.notes ||
      (isHe
        ? "הצהרת יבוא נבדקה ואושרה במסלול ירוק. המכולה שוחררה להובלה יבשתית ישירה למחסן הלקוח."
        : "Customs declaration verified and approved under Green Channel. Container released for direct inland haulage to retailer warehouse.")
  );

  const [isPending, startTransition] = useTransition();
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [actionErrorMsg, setActionErrorMsg] = useState<string | null>(null);

  const activeContainer = workflow?.container_number || "MSKU-9481029";
  const activeBl = workflow?.bill_of_lading || "MSCUVAL881920";
  const activeVessel = workflow?.vessel_name || "MSC LEANNE / Voyage 2604E";
  const activeLine =
    workflow?.shipping_line || "MSC (Mediterranean Shipping Company)";
  const activePo =
    poNumber || workflow?.po_number || `FDX-PO-${requestId.slice(0, 6).toUpperCase()}`;

  const copyToClipboard = (text: string, key: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  // Download complete 6-document text/json package dossier
  const handleDownloadCompleteDossier = () => {
    const textContent = `======================================================================
ISRAEL CUSTOMS & TAX AUTHORITY - GLOBAL GATEWAY (שער עולמי)
OFFICIAL 6-DOCUMENT CLEARANCE DOSSIER & TRANSMITTAL PROTOCOL
======================================================================
Generated: ${new Date().toISOString()}
FoodXchange Institutional Sourcing Desk | Direct Retail Gateway
Port of Discharge: Ashdod Port (ILASH) - Pier 21 (Bonded Container Terminal)

CARGO & MARITIME TELEMETRY:
- PO Number:              ${activePo}
- Ocean Bill of Lading:   ${activeBl} (Clean 3/3 On-Board)
- Ocean Container ID:     ${activeContainer} (40ft High-Cube FCL)
- Seal Number:            ML-EU-884920
- Vessel / Voyage:        ${activeVessel}
- Shipping Line:          ${activeLine}
- Importer of Record:     ${buyerCompany}
- Exporter / Producer:    ${supplierName} (${supplierCountry})
- Product Description:    ${productName}
- Quantity & Units:       ${orderVolume} (24 Euro Pallets EPAL)
- Gross Weight / Net:     21,600 KG Gross / 19,800 KG Net
- Israeli HS Tariff:      1509.2000 (Extra Virgin Olive Oil / Food Grade)
- Treaty Exemption:       Protocol 4 Israel-EU FTA (Code: EU01) -> 0% CUSTOMS DUTY
- Duty Savings vs MFN:    ~₪34,200 ILS

----------------------------------------------------------------------
THE 6 MANDATORY CUSTOMS DOCUMENTS ATTACHED:
----------------------------------------------------------------------
[1] CLEAN OCEAN BILL OF LADING (3/3 ORIGINAL)
    Reference:    ${activeBl}
    Issuer:       ${activeLine}
    Status:       Surrendered / Negotiable Clean On-Board
    Hash (SHA256): 9f8a3c8e7b1a2f6d5c4e3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e

[2] FINAL COMMERCIAL EXPORT INVOICE (CIF ASHDOD)
    Reference:    INV-EU-${requestId.slice(0, 5).toUpperCase()}
    Issuer:       ${supplierName}
    Terms:        CIF Ashdod Port (Incoterms 2020)
    Total Value:  €36,288.00 EUR
    Escrow Ref:   FDX-ESCROW-3070-VERIFIED

[3] CERTIFIED CONTAINER PACKING LIST (SSCC PALLET BARCODES)
    Reference:    PKL-${requestId.slice(0, 5).toUpperCase()}
    Issuer:       ${supplierName} Logistics Facility
    Pallet Specs: 24 Euro Pallets (120x80cm, Heat Treated ISPM-15)
    SSCC Range:   (00)372900148000000018 to (00)372900148000000247
    Gross / Net:  21,600 kg / 19,800 kg

[4] EUR.1 MOVEMENT CERTIFICATE (ISRAEL-EU FTA DUTY EXEMPTION)
    Reference:    EUR1-ES-${requestId.slice(0, 6).toUpperCase()}
    Issuer:       European State Customs Authority (Agencia Tributaria / Dogane)
    Preferential: European Union Origin Approved
    Duty Rate:    0.0% (Zero Customs Duty Exemption under Protocol 4)

[5] MINISTRY OF HEALTH CERTIFICATE OF ANALYSIS (MOH FCS COA)
    Reference:    MOH-FCS-${requestId.slice(0, 5).toUpperCase()}
    Issuer:       Official Accredited European Food Safety Laboratory (ISO 17025)
    Assay Tests:  Acidity 0.24% (<0.80%), Peroxide 5.1 meq O2/kg (<20.0)
    Microbiology: Salmonella: Negative, Listeria: Negative, Heavy Metals: Passed
    Conformity:   Complies with Israeli Public Health (Food) Regulations & SI 1145

[6] CHIEF RABBINATE KOSHER CERTIFICATE (מחלקת היבוא ברבנות הראשית)
    Reference:    RAB-IL-2026-${requestId.slice(0, 4).toUpperCase()}
    Issuer:       Authorized European Rabbinate & Chief Rabbinate of Israel
    Kashrut Rank: Kosher Parve for All Year Round (Mehadrin / Regular)
    Shelf Status: Approved for Legal Retail Distribution in Israel

----------------------------------------------------------------------
GATE-PASS & INLAND TRUCKING AUTHORIZATION:
- Declaration Ref:        ${customsDeclarationNumber}
- Clearance Channel:      GREEN (מסלול ירוק - התרה ישירה)
- Gate Pass Number:       ${gatePassNumber}
- Destination Warehouse:  ${buyerWarehouseAddress || "Retail DC Logistic Park"}
======================================================================
DOCUMENT PACKAGE DIGITAL VERIFICATION: VALID AND SIGNED
======================================================================`;

    const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Customs_Dossier_6Docs_${requestId.slice(0, 8).toUpperCase()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Generate Shaar Olami EDI XML string
  const generateShaarOlamiXml = () => {
    return `<?xml version="1.0" encoding="UTF-8"?>
<ShaarOlamiCustomsDeclaration xmlns="http://customs.taxes.gov.il/declaration/v2">
  <Header>
    <DeclarationType>IMPORT_CUSTOMS_CLEARANCE</DeclarationType>
    <OfficeCode>ILASH</OfficeCode> <!-- Ashdod Port Pier 21 -->
    <ImporterId>515984102</ImporterId>
    <ImporterName>${buyerCompany.replace(/[<>&]/g, "")}</ImporterName>
    <DeclarantLicense>4912</DeclarantLicense>
    <BrokerName>${clearingAgentName.replace(/[<>&]/g, "")}</BrokerName>
    <BrokerAgency>${clearingAgency.replace(/[<>&]/g, "")}</BrokerAgency>
    <Timestamp>${new Date().toISOString()}</Timestamp>
    <DeclarationId>${customsDeclarationNumber}</DeclarationId>
  </Header>
  <Consignment>
    <BillOfLadingNumber>${activeBl}</BillOfLadingNumber>
    <ContainerNumber>${activeContainer}</ContainerNumber>
    <ContainerType>40HQ</ContainerType>
    <VesselName>${activeVessel.replace(/[<>&]/g, "")}</VesselName>
    <ShippingLine>${activeLine.replace(/[<>&]/g, "")}</ShippingLine>
    <PortOfDischarge>ILASH</PortOfDischarge>
    <BerthTerminal>Pier 21 Bonded Terminal</BerthTerminal>
    <GrossWeightKg>21600.00</GrossWeightKg>
    <NetWeightKg>19800.00</NetWeightKg>
    <PackageCount>24</PackageCount>
    <PackageType>PALLET_EPAL_ISPM15</PackageType>
    <SealNumber>ML-EU-884920</SealNumber>
  </Consignment>
  <GoodsItems>
    <GoodsItem itemNumber="1">
      <TariffClassification>1509200000</TariffClassification>
      <CommercialDescription>${productName.replace(/[<>&]/g, "")}</CommercialDescription>
      <InvoiceNumber>INV-EU-${requestId.slice(0, 5).toUpperCase()}</InvoiceNumber>
      <InvoiceAmount currency="EUR">36288.00</InvoiceAmount>
      <Incoterm>CIF</Incoterm>
      <CountryOfOrigin>ES</CountryOfOrigin>
      <PreferenceAgreementCode>EU01</PreferenceAgreementCode> <!-- Protocol 4 Israel-EU FTA -->
      <DutyRatePct>0.00</DutyRatePct>
      <PurchaseTaxRatePct>0.00</PurchaseTaxRatePct>
      <Certificates>
        <Certificate type="EUR1" number="EUR1-ES-${requestId.slice(0, 6).toUpperCase()}" status="VERIFIED"/>
        <Certificate type="MOH_COA" number="MOH-FCS-${requestId.slice(0, 5).toUpperCase()}" status="PASSED"/>
        <Certificate type="RABBINATE_KOSHER" number="RAB-IL-2026-${requestId.slice(0, 4).toUpperCase()}" status="AUTHORIZED"/>
      </Certificates>
    </GoodsItem>
  </GoodsItems>
  <DeliveryOrder>
    <GatePassNumber>${gatePassNumber}</GatePassNumber>
    <DestinationWarehouse>${(buyerWarehouseAddress || "Retail DC").replace(/[<>&]/g, "")}</DestinationWarehouse>
    <AssignedCarrier>Direct Inland Container Hauler Ashdod</AssignedCarrier>
  </DeliveryOrder>
  <RiskEngineResult>
    <Channel>GREEN</Channel> <!-- מסלול ירוק אוטומטי ללא עיכוב רציף -->
    <Status>APPROVED_FOR_RELEASE</Status>
    <ClearanceTimestamp>${new Date().toISOString()}</ClearanceTimestamp>
  </RiskEngineResult>
</ShaarOlamiCustomsDeclaration>`;
  };

  const handleDownloadXml = () => {
    const xml = generateShaarOlamiXml();
    const blob = new Blob([xml], { type: "application/xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `shaar_olami_declaration_${customsDeclarationNumber}.xml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Simulate transmission to Shaar Olami EDI
  const handleSimulateTransmission = () => {
    setXmlSimulationPhase("connecting");
    setTimeout(() => {
      setXmlSimulationPhase("validating");
      setTimeout(() => {
        setXmlSimulationPhase("evaluating");
        setTimeout(() => {
          setXmlSimulationPhase("cleared");
          setReleaseChannel("green");
          const decNum = `IL-2604-${requestId.slice(0, 6).toUpperCase()}-GRN`;
          setCustomsDeclarationNumber(decNum);
        }, 1200);
      }, 1000);
    }, 900);
  };

  const handleClearanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActionErrorMsg(null);
    setActionSuccessMsg(null);

    startTransition(async () => {
      const res = await submitCustomsBrokerClearance({
        requestId,
        customsDeclarationNumber,
        releaseChannel,
        gatePassNumber,
        clearingAgentName,
        clearingAgency,
        notes,
      });

      if (res.ok) {
        setActionSuccessMsg(res.message);
      } else {
        setActionErrorMsg(res.error);
      }
    });
  };

  // WhatsApp Port Dispatcher Link
  const whatsappCoordinationText = isHe
    ? `שלום, מתאמים משיכת מכולה מנמל אשדוד (רציף 21):
מכולה: ${activeContainer} | שטר מטען: ${activeBl}
רשימון שער עולמי: ${customsDeclarationNumber} (מסלול ירוק ✓)
יבואן: ${buyerCompany}
יעד פריקה: ${buyerWarehouseAddress || "מרלוג מרכזי"}
פקודת מסירה תקינה. נא לתאם מוביל יבשתי.`
    : `Hello, coordinating container gate-out from Ashdod Port (Pier 21):
Container: ${activeContainer} | Ocean B/L: ${activeBl}
Shaar Olami Customs Dec: ${customsDeclarationNumber} (Green Channel ✓)
Importer: ${buyerCompany}
Destination DC: ${buyerWarehouseAddress || "Retail DC Logistic Park"}
Delivery Order authorized. Please assign inland container hauler.`;

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
    whatsappCoordinationText
  )}`;

  // 6 Essential customs documents definition
  const customsDocuments = [
    {
      id: "bl",
      title: isHe
        ? "שטר מטען ימי מקורי (Clean Ocean B/L 3/3)"
        : "Original Clean On-Board Ocean Bill of Lading (3/3)",
      titleEn: "Clean Ocean Bill of Lading (3/3)",
      docRef: activeBl,
      issuer: activeLine,
      status: isHe ? "מאומת ותקין לשחרור" : "Verified & Clean On-Board",
      badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      icon: "🚢",
      description: isHe
        ? "שטר מטען ימי נקי שהונפק ע״י חברת הספנות לנמל אשדוד לפקודת היבואן (Consignee) להתרת פקודת מסירה."
        : "Full negotiable clean on-board maritime freight title issued to the importer of record for port release.",
      specs: [
        { label: isHe ? "מוביל ימי" : "Carrier", value: activeLine },
        { label: isHe ? "אונייה" : "Vessel", value: activeVessel },
        { label: isHe ? "מספר מכולה" : "Container ID", value: activeContainer },
        { label: isHe ? "נמל פריקה" : "Discharge Port", value: "Ashdod Port (ILASH) Pier 21" },
      ],
    },
    {
      id: "invoice",
      title: isHe
        ? "חשבונית מסחרית מקורית (Commercial Invoice CIF)"
        : "Original Commercial Export Invoice (CIF Ashdod)",
      titleEn: "Commercial Invoice CIF Ashdod",
      docRef: `INV-EU-${requestId.slice(0, 5).toUpperCase()}`,
      issuer: supplierName,
      status: isHe ? "מאושרת ומגובה בהסכם" : "Countersigned & Escrow Secured",
      badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      icon: "💶",
      description: isHe
        ? "חשבונית ספק ביורו בתנאי מכר CIF Ashdod Port, כוללת פירוט יחידות, מחירי יחידה וערך מטען לצורכי מכס."
        : "Commercial factory invoice in EUR under CIF Ashdod Port incoterms, detailing tariff value and escrow reference.",
      specs: [
        { label: isHe ? "ערך CIF כולל" : "Total CIF Value", value: "€36,288.00 EUR" },
        { label: isHe ? "תנאי סחר" : "Incoterms", value: "CIF Ashdod Port (2020)" },
        { label: isHe ? "תנאי תשלום" : "Escrow Terms", value: "30% Deposit / 70% Released" },
        { label: isHe ? "פרט מכס" : "HS Code", value: "1509.2000" },
      ],
    },
    {
      id: "packing",
      title: isHe
        ? "רשימת אריזה מפורטת (Certified Packing List)"
        : "Detailed Container Packing List (SSCC Barcodes)",
      titleEn: "Certified Packing List",
      docRef: `PKL-${requestId.slice(0, 5).toUpperCase()}`,
      issuer: `${supplierName} QA Logistics`,
      status: isHe ? "מאושרת וכוללת חותמת" : "Verified (24 Euro Pallets)",
      badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      icon: "📦",
      description: isHe
        ? "פירוט מדויק של 24 משטחי EPAL תקניים (HT ISPM-15), 24,000 יחידות, ומשקלי ברוטו/נטו ממוספרים ב-SSCC."
        : "Detailed specification of 24 standard Euro Pallets (EPAL ISPM-15), 24,000 units with GS1-128 SSCC serials.",
      specs: [
        { label: isHe ? "משטחים" : "Pallet Count", value: "24 Euro Pallets (120x80cm)" },
        { label: isHe ? "סה״כ יחידות" : "Total Units", value: "24,000 bottles (1,000/plt)" },
        { label: isHe ? "משקל ברוטו" : "Gross Weight", value: "21,600 kg" },
        { label: isHe ? "מעקב משטחים" : "SSCC Tracking", value: "GS1-128 Serialized range" },
      ],
    },
    {
      id: "eur1",
      title: isHe
        ? "תעודת מקור אירופית EUR.1 (פטור ממכס 0%)"
        : "EUR.1 Movement Certificate (0% Customs Duty FTA)",
      titleEn: "EUR.1 Movement Certificate",
      docRef: `EUR1-ES-${requestId.slice(0, 6).toUpperCase()}`,
      issuer: "European State Customs Authority",
      status: isHe ? "תקפה לפטור מלא ממכס 0%" : "0% Tariff Exemption Approved",
      badgeColor: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
      icon: "🇪🇺",
      description: isHe
        ? "תעודת מקור רשמית המקנה פטור מלא ממכס ומס קנייה (0% שיעור מכס) בהתאם לפרוטוקול 4 להסכם ישראל-איחוד אירופי."
        : "Official treaty certificate granting zero customs duty (0% tariff) under Protocol 4 to the Israel-EU Association Agreement.",
      specs: [
        { label: isHe ? "הסכם סחר" : "Trade Agreement", value: "Israel-EU FTA (Protocol 4)" },
        { label: isHe ? "קוד הסכם שער עולמי" : "Shaar Olami Code", value: "EU01 (פטור מלא)" },
        { label: isHe ? "שיעור מכס רגיל" : "Standard MFN Duty", value: "12% + NIS/kg (~₪34,200)" },
        { label: isHe ? "שיעור מכס לאחר פטור" : "Preferential Duty", value: "0.0% (חיסכון מלא)" },
      ],
    },
    {
      id: "health",
      title: isHe
        ? "אישור שירות המזון ותעודת אנליזה (MOH FCS COA)"
        : "Ministry of Health Certificate of Analysis (COA)",
      titleEn: "MOH Food Safety Certificate",
      docRef: `MOH-FCS-${requestId.slice(0, 5).toUpperCase()}`,
      issuer: isHe ? "שירות המזון הארצי - משרד הבריאות / מעבדה מוסמכת" : "Accredited EU Food Safety Lab (ISO 17025)",
      status: isHe ? "בדיקות מעבדה תקינות" : "Health Ministry Clearance Passed",
      badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
      icon: "🔬",
      description: isHe
        ? "תעודת אנליזה ממעבדה מוסמכת ISO 17025: חומציות 0.24%, ערכי פרוקסיד 5.1, היעדר סלמונלה ומתכות כבדות."
        : "Complete laboratory assay: Free Acidity 0.24% (<0.80%), Peroxides 5.1 meq O2/kg, compliant with Israeli SI 1145.",
      specs: [
        { label: isHe ? "חומציות חופשית" : "Free Fatty Acidity", value: "0.24% (תקן עד 0.8%)" },
        { label: isHe ? "מספר פרוקסיד" : "Peroxide Value", value: "5.1 meq O2/kg (עד 20)" },
        { label: isHe ? "מתכות כבדות ומיקרו" : "Assay Results", value: "Negative / Passed ✓" },
        { label: isHe ? "תאימות ת״י 1145" : "SI 1145 Conformity", value: "Certified Compliant" },
      ],
    },
    {
      id: "kosher",
      title: isHe
        ? "אישור כשרות הרבנות הראשית לישראל (מחלקת היבוא)"
        : "Chief Rabbinate of Israel Kosher Certificate",
      titleEn: "Chief Rabbinate Kosher Certificate",
      docRef: `RAB-IL-2026-${requestId.slice(0, 4).toUpperCase()}`,
      issuer: isHe ? "הרבנות הראשית לישראל / בד״ץ אירופאי מוכר" : "Authorized European Rabbinate & Chief Rabbinate of Israel",
      status: isHe ? "מאושרת לשיווק קמעונאי" : "Valid for Retail Shelf Sale",
      badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
      icon: "✡️",
      description: isHe
        ? "אישור כשרות רשמי ממחלקת היבוא ברבנות הראשית לישראל לשיווק חוקי ומלא ברשתות השיווק ובמרכולים בישראל."
        : "Official kashrut endorsement from the Import Department of the Chief Rabbinate for legal supermarket shelf distribution.",
      specs: [
        { label: isHe ? "סוג הכשרות" : "Kashrut Level", value: "Kosher Parve (פרווה לכל השנה)" },
        { label: isHe ? "רבנות מנפיקה" : "Supervising Body", value: "Chief Rabbinate Import Dept." },
        { label: isHe ? "תוקף לשיווק" : "Distribution Scope", value: "All Supermarket Chains IL" },
        { label: isHe ? "תווית עברית" : "Hebrew Label Badge", value: "Approved & Embossed" },
      ],
    },
  ];

  // Tour Guide steps definition
  const CUSTOMS_PORTAL_TOUR_STEPS: TourStep[] = [
    {
      targetSelector: "#customs-telemetry-header",
      titleHe: "טלמטריה ימית ומספרי זיהוי למכס",
      titleEn: "Maritime Telemetry & Identification",
      descHe:
        "פרטי המכולה (MSKU-9481029), שטר המטען (B/L MSCUVAL881920), ואוניית המשא העוגנת ברציף 21 בנמל אשדוד מוכנים לשידור לרשויות.",
      descEn:
        "Container number, Clean Bill of Lading, and vessel berthed at Pier 21 Ashdod Port ready for customs transmission.",
      icon: "🚢",
    },
    {
      targetSelector: "#customs-dossier-grid",
      titleHe: "חבילת 6 מסמכי המקור לשער עולמי",
      titleEn: "6-Document Official Clearance Package",
      descHe:
        "שטר מטען נקי 3/3, חשבונית CIF, רשימת אריזה עם ברקודי משטחים SSCC, תעודת מקור EUR.1, אישור שירות המזון הארצי, ותעודת כשרות הרבנות הראשית.",
      descEn:
        "Original clean 3/3 B/L, CIF invoice, SSCC packing list, EUR.1 origin certificate, Health Ministry COA, and Chief Rabbinate Kosher certificate.",
      icon: "📁",
    },
    {
      targetSelector: "#eur1-duty-saving-card",
      titleHe: "פטור מלא ממכס (0%) בהסכם ישראל-אירופה",
      titleEn: "0% Customs Duty Treaty Exemption",
      descHe:
        "תעודת מקור EUR.1 מאושרת מעניקה פטור מלא ממכס ומס קנייה, וחוסכת ליבואן מעל ₪34,000 בהשוואה למכס יבוא כללי.",
      descEn:
        "Certified EUR.1 Movement Certificate grants zero tariff duty under the Israel-EU agreement, saving over ₪34,000 vs. standard MFN rates.",
      icon: "🇪🇺",
    },
    {
      targetSelector: "#shaar-olami-transmission-desk",
      titleHe: "שידור ישיר לשער עולמי (EDI XML) ושחרור ירוק",
      titleEn: "Direct Shaar Olami EDI XML Transmission & Green Lane",
      descHe:
        "בלחיצה אחת: שידור הצהרת היבוא המקוונת למכס במסלול ירוק והפקת פקודת מסירה יבשתית (Gate-Pass) למחסן הלקוח.",
      descEn:
        "1-Click direct EDI XML transmission to Israel Customs for instant Green Lane release and gate-pass generation.",
      icon: "⚡",
    },
    {
      targetSelector: "#ashdod-port-whatsapp-btn",
      titleHe: "תיאום משיכה יבשתית ישירה ב-WhatsApp",
      titleEn: "Instant Ashdod Port Inland WhatsApp Dispatch",
      descHe:
        "קישור ישיר לתיאום מוביל יבשתי ממסוף המכולות באשדוד ישירות למרלוג הקמעונאי.",
      descEn:
        "Direct WhatsApp coordination to dispatch inland haulers from Ashdod terminal directly to retailer distribution center.",
      icon: "💬",
    },
  ];

  return (
    <div
      dir={isHe ? "rtl" : "ltr"}
      className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-20 selection:bg-blue-600 selection:text-white"
    >
      {/* ── TOP GOVERNMENT & CUSTOMS CLEARING BAR ── */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 backdrop-blur-md bg-opacity-95 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-xl shrink-0">
              🇮🇱
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-white tracking-wide">
                  {isHe
                    ? "שער עולמי · תיק שחרור מכס מכולה"
                    : "Global Gateway (Shaar Olami) · Container Customs Clearance"}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {isHe ? "נמל אשדוד (רציף 21)" : "Ashdod Port (Pier 21)"}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isHe
                  ? "פורטל ייעודי לעמיל מכס מורשה · FoodXchange Institutional Sourcing Desk"
                  : "Authorized Customs Broker Portal · FoodXchange Institutional Sourcing Desk"}
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2.5">
            {/* Tour Guide Button */}
            <TourGuide
              tourId="customs_broker_portal"
              steps={CUSTOMS_PORTAL_TOUR_STEPS}
              lang={lang}
            />

            {/* Language Switcher Link */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-0.5 flex items-center text-xs">
              <Link
                href={`/he/customs/${requestId}`}
                className={`px-2.5 py-1 rounded-lg transition font-medium ${
                  isHe
                    ? "bg-blue-600 text-white font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                עברית
              </Link>
              <Link
                href={`/en/customs/${requestId}`}
                className={`px-2.5 py-1 rounded-lg transition font-medium ${
                  !isHe
                    ? "bg-blue-600 text-white font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                English
              </Link>
            </div>

            {/* Live AIS Maritime Radar Link */}
            <Link
              href={`/radar/${requestId}`}
              className="text-xs font-bold px-3 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              title={isHe ? "רדאר ימי חי AIS לנמל אשדוד" : "Live AIS Maritime Radar"}
            >
              <span>🛰️</span>
              <span>{isHe ? "רדאר ימי חי" : "AIS Vessel Radar"}</span>
            </Link>

            {/* XML Generator Modal Button */}
            <button
              type="button"
              onClick={() => setShowXmlModal(true)}
              className="text-xs font-bold px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              title={isHe ? "שידור וצפייה ב-XML שער עולמי" : "Shaar Olami EDI XML View"}
            >
              <span>⚡</span>
              <span>{isHe ? "שער עולמי XML" : "Shaar Olami XML"}</span>
            </button>

            {/* Document Handover Modal Button */}
            <button
              type="button"
              onClick={() => setShowDocModal(true)}
              className="text-xs font-bold px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span>📑</span>
              <span>{isHe ? "תיק מסמכים מלא" : "Full 6-Doc Package"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT CONTAINER ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Success / Error Banners */}
        {actionSuccessMsg && (
          <div className="p-4 rounded-2xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 text-sm flex items-start gap-3 shadow-lg">
            <span className="text-2xl shrink-0">🎉</span>
            <div className="space-y-1">
              <strong className="block text-emerald-300 font-bold">
                {isHe ? "פעולת השחרור הושלמה בהצלחה!" : "Customs Clearance Signoff Registered!"}
              </strong>
              <p className="text-xs leading-relaxed text-emerald-200/90">{actionSuccessMsg}</p>
            </div>
          </div>
        )}

        {actionErrorMsg && (
          <div className="p-4 rounded-2xl bg-rose-950/70 border border-rose-500/40 text-rose-200 text-sm flex items-start gap-3 shadow-lg">
            <span className="text-2xl shrink-0">⚠️</span>
            <div className="space-y-1">
              <strong className="block text-rose-300 font-bold">
                {isHe ? "שגיאה ברישום השחרור" : "Clearance Registration Error"}
              </strong>
              <p className="text-xs leading-relaxed text-rose-200/90">{actionErrorMsg}</p>
            </div>
          </div>
        )}

        {/* ── CARGO & VESSEL TELEMETRY OVERVIEW CARD ── */}
        <section
          id="customs-telemetry-header"
          className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-800/80">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                  {isHe ? `הזמנת רכש מסחרית: ${activePo}` : `Purchase Order: ${activePo}`}
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-300">
                  {poDate || new Date().toISOString().slice(0, 10)}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-white mt-1">
                {productName} · {orderVolume}
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                {isHe ? "יבואן רשמי (Importer of Record): " : "Importer of Record: "}
                <strong className="text-slate-200">{buyerCompany}</strong> ·{" "}
                {isHe ? "יצואן/יצרן: " : "Exporter / Factory: "}
                <strong className="text-slate-200">{supplierName}</strong> ({supplierCountry})
              </p>
            </div>

            {/* Importer Quick Contact & Dispatch Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-xs text-slate-300 flex items-center gap-4 shrink-0">
                <div>
                  <span className="text-[10px] text-slate-500 block">
                    {isHe ? "איש קשר ביבואן" : "Buyer Logistics Contact"}
                  </span>
                  <span className="font-bold text-slate-200">
                    {buyerContact || (isHe ? "אגף סחר וייבוא קמעונאי" : "Import & Retail Logistics")}
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    {buyerPhone || "+972-54-9218840"}
                  </span>
                </div>
                <div className={`border-slate-800 ${isHe ? "border-r pr-4" : "border-l pl-4"}`}>
                  <span className="text-[10px] text-slate-500 block">
                    {isHe ? "יעד פריקה סופי" : "Destination Warehouse"}
                  </span>
                  <span className="font-semibold text-sky-400 max-w-[200px] truncate block">
                    {buyerWarehouseAddress || (isHe ? "מרלוג מרכזי, פארק תעשיות שורק" : "Retail DC Soreq Park")}
                  </span>
                </div>
              </div>

              {/* Direct WhatsApp Hauler Link */}
              <a
                id="ashdod-port-whatsapp-btn"
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl transition flex items-center justify-center gap-2 text-xs font-bold shadow-lg hover:shadow-emerald-900/30 cursor-pointer"
                title={isHe ? "תיאום הובלה יבשתית מנמל אשדוד ב-WhatsApp" : "WhatsApp Port Hauler Dispatch"}
              >
                <span className="text-base">💬</span>
                <span>{isHe ? "תיאום מוביל ב-WhatsApp" : "WhatsApp Hauler Dispatch"}</span>
              </a>
            </div>
          </div>

          {/* Logistics Telemetry Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-6 text-xs">
            {/* 1. Container Number */}
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
              <span className="text-[10px] text-slate-500 font-semibold uppercase">
                {isHe ? "מספר מכולה" : "Container ID"}
              </span>
              <div className="font-mono font-bold text-sm text-emerald-400 my-1 truncate">
                {activeContainer}
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(activeContainer, "cont")}
                className={`text-[10px] text-slate-400 hover:text-white transition cursor-pointer ${
                  isHe ? "text-right" : "text-left"
                }`}
              >
                {copiedKey === "cont"
                  ? isHe
                    ? "✓ הועתק"
                    : "✓ Copied"
                  : isHe
                  ? "העתק מספר מכולה"
                  : "Copy Container #"}
              </button>
            </div>

            {/* 2. Bill of Lading */}
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
              <TradeTooltip
                term={isHe ? "שטר מטען ימי (B/L)" : "Bill of Lading (B/L)"}
                explanation={
                  isHe
                    ? "Clean Ocean Bill of Lading 3/3 - שטר המטען המקורי המקנה בעלות משפטית על המטען הנדרש להוצאת פקודת מסירה בנמל אשדוד."
                    : "Clean Ocean Bill of Lading 3/3 - Original maritime title required for delivery order issuance at Ashdod Port."
                }
                category="customs"
                dir={isHe ? "rtl" : "ltr"}
                className="text-[10px] text-slate-400 font-semibold uppercase"
              />
              <div className="font-mono font-bold text-sm text-sky-400 my-1 truncate">
                {activeBl}
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(activeBl, "bl")}
                className={`text-[10px] text-slate-400 hover:text-white transition cursor-pointer ${
                  isHe ? "text-right" : "text-left"
                }`}
              >
                {copiedKey === "bl"
                  ? isHe
                    ? "✓ הועתק"
                    : "✓ Copied"
                  : isHe
                  ? "העתק מספר B/L"
                  : "Copy B/L #"}
              </button>
            </div>

            {/* 3. Ocean Vessel */}
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
              <span className="text-[10px] text-slate-500 font-semibold uppercase">
                {isHe ? "אונייה וקו ספנות" : "Vessel & Carrier"}
              </span>
              <div className="font-semibold text-slate-200 my-1 truncate">
                {activeVessel}
              </div>
              <span className="text-[10px] text-slate-500 truncate">{activeLine}</span>
            </div>

            {/* 4. Port of Discharge */}
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
              <span className="text-[10px] text-slate-500 font-semibold uppercase">
                {isHe ? "נמל פריקה ורציף" : "Discharge Port"}
              </span>
              <div className="font-semibold text-slate-200 my-1 truncate">
                {workflow?.port_of_destination ||
                  (isHe ? "נמל אשדוד (ILASH)" : "Ashdod Port (ILASH)")}
              </div>
              <span className="text-[10px] text-amber-400 font-mono font-semibold">
                Pier 21 / Bonded Yard
              </span>
            </div>

            {/* 5. Israeli Customs Classification (HS Code) */}
            <div
              id="eur1-duty-saving-card"
              className="p-3 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex flex-col justify-between"
            >
              <span className="text-[10px] text-indigo-300 font-semibold uppercase">
                {isHe ? "פרט מכס (HS Code)" : "HS Tariff Classification"}
              </span>
              <div className="font-mono font-bold text-indigo-200 my-1">1509.2000</div>
              <span className="text-[10px] text-emerald-400 font-semibold">
                {isHe ? "0% מכס (EUR.1 תקף)" : "0% Tariff (EUR.1 FTA)"}
              </span>
            </div>

            {/* 6. Estimated Berth (ETA) */}
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
              <span className="text-[10px] text-slate-500 font-semibold uppercase">
                {isHe ? "מועד עגינה וסטטוס" : "Berth ETA & Status"}
              </span>
              <div className="font-bold text-amber-300 my-1 font-mono truncate">
                {workflow?.eta_port || (isHe ? "בעגינה / רציף 21" : "Berthed / Pier 21")}
              </div>
              <span className="text-[10px] text-slate-500">
                {isHe ? "נמל אשדוד - מסוף מכולות" : "Ashdod Container Terminal"}
              </span>
            </div>
          </div>
        </section>

        {/* ── THE 6-DOCUMENT CUSTOMS CLEARANCE SUITE ── */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>📁</span>
                <span>
                  {isHe
                    ? "תיק מסמכי שחרור מקוריים (6-Document Customs Package)"
                    : "Official 6-Document Customs Clearance Dossier"}
                </span>
                <TradeTooltip
                  term={isHe ? "חבילת 6 מסמכים" : "6-Document Package"}
                  explanation={
                    isHe
                      ? "תיק המסמכים המלא הנדרש ע״י אגף המכס ושירות המזון: שטר מטען Clean B/L, חשבונית ספק, רשימת אריזה, EUR.1 (0% מכס), תעודת כשרות הרבנות, ותעודת בריאות מעבדה COA."
                      : "Complete regulatory packet required by Israel Customs & Food Authority: Clean B/L, Commercial Invoice, Packing List, EUR.1 Certificate, Kosher Certificate, and MOH Lab COA."
                  }
                  category="customs"
                  dir={isHe ? "rtl" : "ltr"}
                />
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {isHe
                  ? "כל המסמכים המקוריים נבדקו, חתומים דיגיטלית ומאושרים להגשה למערכת ״שער עולמי״ של רשות המסים."
                  : "All original documents audited, cryptographically signed, and ready for transmission to Israel Tax Authority Shaar Olami EDI."}
              </p>
            </div>

            <div className="flex items-center flex-wrap gap-2 shrink-0">
              {/* Priority ERP ASN Modal */}
              <button
                type="button"
                onClick={() => setShowAsnModal(true)}
                className="text-xs font-bold px-3.5 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>📦</span>
                <span>{isHe ? "מנשר מרלוג (Priority ASN)" : "Priority ASN Manifest"}</span>
              </button>

              {/* Download Complete Dossier Button */}
              <button
                type="button"
                onClick={handleDownloadCompleteDossier}
                className="text-xs font-bold px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition flex items-center gap-2 cursor-pointer shadow-xs"
                title={isHe ? "הורד חבילת מסמכים שלמה" : "Download Full Document Dossier"}
              >
                <span>📥</span>
                <span>
                  {isHe ? "הורד חבילת 6 מסמכים (Dossier TXT)" : "Download 6-Doc Dossier"}
                </span>
              </button>

              {/* Printable Handover Sheet */}
              <button
                type="button"
                onClick={() => setShowDocModal(true)}
                className="text-xs font-bold px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <span>🖨️</span>
                <span>{isHe ? "הדפס תיק מסמכים" : "Print Transmittal Sheet"}</span>
              </button>
            </div>
          </div>

          {/* 6-Document Cards Grid */}
          <div id="customs-dossier-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customsDocuments.map((doc) => (
              <div
                key={doc.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition space-y-3 group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-2xl">{doc.icon}</span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${doc.badgeColor}`}
                    >
                      {doc.status}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white mt-3 leading-snug">
                    {doc.title}
                  </h3>
                  <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                    {doc.docRef} · {doc.issuer}
                  </div>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    {doc.description}
                  </p>

                  {/* Micro Specs List */}
                  <div className="mt-3 pt-3 border-t border-slate-800/60 grid grid-cols-2 gap-2 text-[11px]">
                    {doc.specs.map((s, idx) => (
                      <div key={idx} className="bg-slate-950/60 p-1.5 rounded-lg border border-slate-800/60">
                        <span className="text-slate-500 block text-[9px] uppercase">{s.label}</span>
                        <span className="font-semibold text-slate-300 truncate block">{s.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDocDetail(doc);
                    }}
                    className="text-xs font-semibold text-sky-400 hover:text-sky-300 transition flex items-center gap-1 cursor-pointer"
                  >
                    <span>👁️</span>
                    <span>{isHe ? "צפייה בפרטי מסמך" : "Inspect Document"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => copyToClipboard(doc.docRef, doc.id)}
                    className="text-[11px] text-slate-400 hover:text-white transition cursor-pointer"
                  >
                    {copiedKey === doc.id
                      ? isHe
                        ? "✓ הועתק"
                        : "✓ Copied"
                      : isHe
                      ? "העתק סימוכין"
                      : "Copy Ref"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── INTERACTIVE ISRAELI CUSTOMS CLEARANCE FILING DESK ── */}
        <section
          id="shaar-olami-transmission-desk"
          className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6"
        >
          <div className="pb-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">✍️</span>
                <h2 className="text-base font-bold text-white">
                  {isHe
                    ? "הצהרת שחרור מכס ורשימון שער עולמי (Customs Broker Sign-off)"
                    : "Customs Broker Clearance Sign-Off & Shaar Olami EDI Gateway"}
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isHe
                  ? "מילוי רשימון השחרור מאשר את התרת המכולה ומפעיל אוטומטית פקודת מסירה יבשתית למוביל למחסן היבואן."
                  : "Filing declaration authorizes container release, triggers inland delivery order, and syncs Priority ERP."}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowXmlModal(true)}
                className="px-3.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>⚡</span>
                <span>{isHe ? "שידור מקוון (שער עולמי XML)" : "Transmit Shaar Olami XML"}</span>
              </button>

              {isAlreadyCleared && (
                <span className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-xl border border-emerald-500/30">
                  {isHe ? "הצהרת יבוא מאושרת במערכת ✓" : "Customs Declaration Released ✓"}
                </span>
              )}
            </div>
          </div>

          <form onSubmit={handleClearanceSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {/* 1. Clearing Agency */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">
                  {isHe ? "סוכנות עמילות המכס המטפלת" : "Customs Brokerage Agency"}
                </label>
                <select
                  disabled={isAlreadyCleared}
                  value={clearingAgency}
                  onChange={(e) => setClearingAgency(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-slate-100 font-semibold focus:border-blue-500 focus:outline-none"
                >
                  <option value="ד.ס.ו שילוח ועמילות מכס (DSV Israel)">
                    ד.ס.ו שילוח ועמילות מכס (DSV Israel)
                  </option>
                  <option value="פריץ קומפניז שילוח בינלאומי (Fritz)">
                    פריץ קומפניז שילוח בינלאומי (Fritz)
                  </option>
                  <option value="עמית שילוח ועמילות מכס (Amit)">
                    עמית שילוח ועמילות מכס (Amit)
                  </option>
                  <option value="מנטפילד שילוח בינלאומי (Mentfield)">
                    מנטפילד שילוח בינלאומי (Mentfield)
                  </option>
                  <option value="גולד ליין שילוח (Goldline)">
                    גולד ליין שילוח (Goldline)
                  </option>
                  <option value="עמיל מכס מורשה עצמאי">
                    עמיל מכס מורשה עצמאי (Independent Licensed Broker)
                  </option>
                </select>
              </div>

              {/* 2. Clearing Agent Name & License */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">
                  {isHe ? "שם עמיל המכס החתום ומספר רישיון" : "Licensed Broker Name & ID"}
                </label>
                <input
                  type="text"
                  disabled={isAlreadyCleared}
                  required
                  placeholder={
                    isHe
                      ? "לדוגמה: אלון ברקוביץ' (מורשה #4912)"
                      : "e.g. Alon Berkovich (License #4912)"
                  }
                  value={clearingAgentName}
                  onChange={(e) => setClearingAgentName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-slate-100 font-semibold focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* 3. Customs Declaration Number (רשימון שער עולמי) */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">
                  {isHe
                    ? "מספר הצהרת יבוא / רשימון מכס (שער עולמי)"
                    : "Shaar Olami Declaration # (Import Entry)"}
                </label>
                <input
                  type="text"
                  disabled={isAlreadyCleared}
                  required
                  placeholder="e.g. IL-2604-881920"
                  value={customsDeclarationNumber}
                  onChange={(e) => setCustomsDeclarationNumber(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 font-mono font-bold text-emerald-400 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* 4. Release Channel */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">
                  {isHe ? "מסלול שחרור במכס (Shaar Olami Channel)" : "Shaar Olami Risk Channel"}
                </label>
                <select
                  disabled={isAlreadyCleared}
                  value={releaseChannel}
                  onChange={(e) =>
                    setReleaseChannel(
                      e.target.value as "green" | "document_inspection" | "physical_check"
                    )
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-slate-100 font-semibold focus:border-blue-500 focus:outline-none"
                >
                  <option value="green">
                    {isHe
                      ? "🟢 מסלול ירוק - התרת שחרור אוטומטית (Green Channel)"
                      : "🟢 Green Channel - Automatic Immediate Clearance"}
                  </option>
                  <option value="document_inspection">
                    {isHe
                      ? "🟡 בדיקת מסמכים (Documentary Inspection)"
                      : "🟡 Yellow Channel - Document Inspection"}
                  </option>
                  <option value="physical_check">
                    {isHe
                      ? "🔴 בדיקה פיזית ברציף (Physical Container Check)"
                      : "🔴 Red Channel - Physical Terminal Inspection"}
                  </option>
                </select>
              </div>

              {/* 5. Gate-Pass / Delivery Order # */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">
                  {isHe
                    ? "מספר פקודת מסירה / שער נמל (Delivery Order / Gate Pass)"
                    : "Delivery Order (D/O) / Port Gate-Pass #"}
                </label>
                <input
                  type="text"
                  disabled={isAlreadyCleared}
                  placeholder="e.g. DO-ASH-88192-21"
                  value={gatePassNumber}
                  onChange={(e) => setGatePassNumber(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 font-mono text-slate-100 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* 6. Notes for Inland Trucking & Warehouse Receiving */}
            <div className="text-xs">
              <label className="block font-semibold text-slate-300 mb-1.5">
                {isHe
                  ? "הערות עמיל מכס והנחיות למוביל יבשתי למחסן היבואן"
                  : "Broker Instructions for Inland Hauler & DC Receiving"}
              </label>
              <textarea
                rows={2}
                disabled={isAlreadyCleared}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={
                  isHe
                    ? "הערות תיאום הובלה, משקל, דרישות שמירת טמפרטורה, שעות פריקה..."
                    : "Haulage instructions, container seal check, warehouse receiving slot..."
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-slate-200 focus:border-blue-500 focus:outline-none leading-relaxed"
              ></textarea>
            </div>

            {/* Submit Action Bar */}
            <div
              id="customs-actions-bar"
              className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="text-xs text-slate-400 flex items-center gap-2">
                <span>🛡️</span>
                <span>
                  {isHe
                    ? "חתימת עמיל המכס מועברת אוטומטית למערכות FoodXchange, מרלוג היבואן וחשבות העסקה."
                    : "Broker sign-off instantly dispatches delivery order to hauler and updates buyer warehouse ERP."}
                </span>
              </div>

              {!isAlreadyCleared ? (
                <button
                  type="submit"
                  disabled={isPending}
                  className="text-xs font-bold px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:shadow-emerald-900/30"
                >
                  {isPending ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      <span>{isHe ? "רושם שחרור במערכת..." : "Filing Sign-Off..."}</span>
                    </>
                  ) : (
                    <>
                      <span>✓</span>
                      <span>
                        {isHe
                          ? "אשר שחרור מכס והפק פקודת מסירה יבשתית (Gate-Out)"
                          : "Approve Clearance & Issue Inland Gate-Pass"}
                      </span>
                    </>
                  )}
                </button>
              ) : (
                <div className="text-xs font-semibold text-emerald-400 flex items-center gap-2">
                  <span>
                    {isHe
                      ? `✅ שוחרר בהצלחה · רשימון #${customsDeclarationNumber}`
                      : `✅ Cleared & Released · Entry #${customsDeclarationNumber}`}
                  </span>
                </div>
              )}
            </div>
          </form>
        </section>
      </main>

      {/* ── SHAAR OLAMI XML TRANSMISSION MODAL & SIMULATOR ── */}
      {showXmlModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-lg">
                  ⚡
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">
                    {isHe
                      ? "שידור מקוון למערכת שער עולמי - רשות המסים (EDI XML)"
                      : "Shaar Olami EDI XML Gateway - Israel Tax Authority"}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Schema: customs.taxes.gov.il/declaration/v2 · Protocol 4 FTA Exemption
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowXmlModal(false)}
                className="text-slate-400 hover:text-white text-lg p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Simulation Phase Banner */}
            <div className="p-4 bg-slate-950/80 border-b border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-semibold text-slate-300 block">
                    {isHe ? "מצב שידור ל-EDI המכס:" : "Customs EDI Transmission Status:"}
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    {xmlSimulationPhase === "idle" && (
                      <span className="text-xs font-bold text-slate-400">
                        {isHe ? "מוכן לשידור (Ready for EDI Dispatch)" : "Ready for EDI Dispatch"}
                      </span>
                    )}
                    {xmlSimulationPhase === "connecting" && (
                      <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5 animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                        {isHe ? "מתחבר לשרתי שער עולמי..." : "Connecting to Shaar Olami Gateway..."}
                      </span>
                    )}
                    {xmlSimulationPhase === "validating" && (
                      <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5 animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping"></span>
                        {isHe
                          ? "מאמת תעודת מקור EUR.1 ואישורי שירות המזון..."
                          : "Validating EUR.1 Origin & Food Safety Certificates..."}
                      </span>
                    )}
                    {xmlSimulationPhase === "evaluating" && (
                      <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5 animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping"></span>
                        {isHe ? "מנוע הערכת סיכונים של המכס מנתח..." : "Running Risk Engine Analysis..."}
                      </span>
                    )}
                    {xmlSimulationPhase === "cleared" && (
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                        <span>✓</span>
                        {isHe
                          ? "אושר במסלול ירוק (Green Channel Approved) - פקודת מסירה הופקה!"
                          : "Green Channel Approved - Delivery Order Authorized!"}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSimulateTransmission}
                    disabled={xmlSimulationPhase !== "idle" && xmlSimulationPhase !== "cleared"}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <span>⚡</span>
                    <span>
                      {xmlSimulationPhase === "cleared"
                        ? isHe
                          ? "שדר שוב (Re-Transmit)"
                          : "Re-Transmit"
                        : isHe
                        ? "בצע שידור מקוון למכס"
                        : "Simulate Live EDI Transmission"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadXml}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                  >
                    <span>📥</span>
                    <span>{isHe ? "הורד קובץ XML" : "Download XML"}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* XML Code Viewer */}
            <div className="p-4 overflow-y-auto flex-1 font-mono text-xs leading-relaxed bg-slate-950 text-emerald-300/90 select-all border-b border-slate-800">
              <pre className="whitespace-pre-wrap">{generateShaarOlamiXml()}</pre>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-900 flex items-center justify-between text-xs text-slate-400">
              <span>
                {isHe
                  ? "הצהרה כוללת פטור מלא ממכס לפי פרוטוקול 4 (הסכם ישראל-איחוד אירופי)"
                  : "Declaration includes 0% duty exemption under Israel-EU Protocol 4"}
              </span>
              <button
                type="button"
                onClick={() => setShowXmlModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold cursor-pointer"
              >
                {isHe ? "סגור חלון" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── INDIVIDUAL DOCUMENT DETAIL INSPECTION MODAL ── */}
      {selectedDocDetail && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto">
            <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{selectedDocDetail.icon}</span>
                <div>
                  <h3 className="font-bold text-white text-sm">
                    {selectedDocDetail.title}
                  </h3>
                  <div className="text-[11px] font-mono text-slate-400">
                    Ref: {selectedDocDetail.docRef} · {selectedDocDetail.issuer}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDocDetail(null)}
                className="text-slate-400 hover:text-white text-lg p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-300 leading-relaxed">
                {selectedDocDetail.description}
              </p>

              {/* Technical Specifications */}
              <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 space-y-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {isHe ? "מפרט טכני ופרטי אימות" : "Technical Specs & Verification"}
                </h4>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  {selectedDocDetail.specs.map((s: any, idx: number) => (
                    <div key={idx} className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-slate-500 block text-[10px] uppercase">{s.label}</span>
                      <span className="font-semibold text-slate-200 mt-0.5 block">{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Digital Hologram / Checksum Stamp */}
              <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2 text-emerald-300">
                  <span>🛡️</span>
                  <span>
                    {isHe
                      ? "מסמך חתום דיגיטלית ומאומת ע״י FoodXchange Trade Desk"
                      : "Digitally signed and cryptographically verified by FoodXchange Trade Desk"}
                  </span>
                </div>
                <span className="font-mono text-[10px] text-emerald-400">SHA-256 ✓</span>
              </div>
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => copyToClipboard(selectedDocDetail.docRef, "modal_doc")}
                className="text-xs text-slate-300 hover:text-white transition flex items-center gap-1 cursor-pointer"
              >
                <span>📋</span>
                <span>
                  {copiedKey === "modal_doc"
                    ? isHe
                      ? "✓ הועתק"
                      : "✓ Copied"
                    : isHe
                    ? "העתק מספר סימוכין"
                    : "Copy Document Ref"}
                </span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDocDetail(null);
                    setShowDocModal(true);
                  }}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs cursor-pointer"
                >
                  {isHe ? "פתח תיק הדפסה" : "Open Print View"}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDocDetail(null)}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-xs cursor-pointer"
                >
                  {isHe ? "סגור" : "Close"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── OFFICIAL 6-DOCUMENT MODAL PREVIEW (Printable) ── */}
      <ExportDocumentHandoverModal
        isOpen={showDocModal}
        onClose={() => setShowDocModal(false)}
        requestId={requestId}
        poNumber={activePo}
        buyerCompany={buyerCompany}
        supplierName={supplierName}
        productName={productName}
        containerNumber={activeContainer}
        billOfLading={activeBl}
        shippingLine={activeLine}
        vesselName={activeVessel}
        etaPort={workflow?.eta_port || undefined}
        isBalanceCleared={true}
      />

      {/* ── ERP INBOUND ASN EXPORT MODAL ── */}
      <ErpAsnExportModal
        isOpen={showAsnModal}
        onClose={() => setShowAsnModal(false)}
        data={{
          poNumber: activePo,
          poDate: poDate || new Date().toISOString().slice(0, 10),
          buyerCompany,
          supplierFactory: supplierName,
          originCountry: supplierCountry,
          productName,
          hebrewName: productName,
          containerNumber: activeContainer,
          billOfLading: activeBl,
          customsDeclarationNumber: customsDeclarationNumber || undefined,
          palletCount: 24,
          totalUnits: 24000,
          unitsPerPallet: 1000,
          netWeightKgPerUnit: 0.4,
          grossWeightKgPerUnit: 0.44,
          storageTemp: "+18.2°C Dry Ambient",
          dockBay: "Bay 04",
          licensePlate: "84-912-33",
        }}
      />
    </div>
  );
}
