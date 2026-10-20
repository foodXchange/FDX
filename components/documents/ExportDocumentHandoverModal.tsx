"use client";

import { useState } from "react";

export interface ExportDocumentHandoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  requestId: string;
  poNumber: string;
  buyerCompany: string;
  supplierName: string;
  productName: string;
  containerNumber?: string;
  billOfLading?: string;
  shippingLine?: string;
  vesselName?: string;
  customsDeclaration?: string;
  etd?: string;
  etaPort?: string;
  destinationPort?: string;
  isBalanceCleared?: boolean;
}

export default function ExportDocumentHandoverModal({
  isOpen,
  onClose,
  requestId,
  poNumber,
  buyerCompany,
  supplierName,
  productName,
  containerNumber = "MSKU-9481029",
  billOfLading = "MSCUVAL881920",
  shippingLine = "MSC (Mediterranean Shipping Company)",
  vesselName = "MSC LEANNE",
  customsDeclaration,
  etd = "2026-11-03",
  etaPort = "2026-11-18",
  destinationPort = "Ashdod Port, Israel",
  isBalanceCleared = false,
}: ExportDocumentHandoverModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const customsDecNum = customsDeclaration || `CUSTOMS-IL-${requestId.slice(0, 6).toUpperCase()}`;

  const documents = [
    {
      id: "bl",
      name: "Original Clean On-Board Ocean Bill of Lading (3/3)",
      hebrewName: "שטר מטען ימי מקורי ונקי (3/3)",
      ref: billOfLading,
      issuer: shippingLine,
      status: "Verified & Endorsed ✓",
      type: "Maritime Freight Title",
      icon: "🚢",
      critical: true,
    },
    {
      id: "inv",
      name: "Final Commercial Export Invoice",
      hebrewName: "חשבונית מסחרית סופית ליבוא",
      ref: `INV-${poNumber}`,
      issuer: supplierName,
      status: "Countersigned & Stamped ✓",
      type: "Commercial Valuation",
      icon: "📑",
      critical: true,
    },
    {
      id: "pl",
      name: "Detailed Container Packing List",
      hebrewName: "רשימת אריזה מפורטת לפי משטחים ומכולות",
      ref: `PL-${poNumber}`,
      issuer: `${supplierName} Logistics Facility`,
      status: "Verified (26 Euro Pallets) ✓",
      type: "Physical Cargo Specs",
      icon: "📦",
      critical: true,
    },
    {
      id: "eur1",
      name: "EUR.1 Movement Certificate (Certificate of Origin)",
      hebrewName: "תעודת מקור EUR.1 (פטור ממכס במסגרת הסכם סחר ישראל-אירופה)",
      ref: `EUR1-ES-${requestId.slice(0, 5).toUpperCase()}`,
      issuer: "European Customs Authority",
      status: "Customs Tariff Exemption Approved ✓",
      type: "Treaty Exemption (0% Duty)",
      icon: "🇪🇺",
      critical: true,
    },
    {
      id: "kosher",
      name: "Approved Rabbinical Kosher Certificate for Israel",
      hebrewName: "תעודת כשרות חתומה המאושרת ע\"י הרבנות הראשית לישראל",
      ref: `KSH-2026-${requestId.slice(0, 4).toUpperCase()}`,
      issuer: "Authorized European Rabbinate & Chief Rabbinate of Israel",
      status: "Valid for Retail Distribution ✓",
      type: "Regulatory Compliance",
      icon: "✡️",
      critical: true,
    },
    {
      id: "coa",
      name: "Certificate of Analysis (COA) & Laboratory Assay",
      hebrewName: "תעודת אנליזה מעבדתית (COA) עבור שירות המזון הארצי במשרד הבריאות",
      ref: `LAB-COA-${requestId.slice(0, 6).toUpperCase()}`,
      issuer: "ISO 17025 Accredited Food Testing Lab",
      status: "Health Ministry Compliance Passed ✓",
      type: "Food Safety Clearance",
      icon: "🔬",
      critical: true,
    },
  ];

  const handleCopyTransmittal = () => {
    const text = `=== FOODXCHANGE CUSTOMS DOCUMENT HANDOVER PACKAGE ===
Project Reference: [FDX-REQ-${requestId.slice(0, 8).toUpperCase()}]
PO Number: ${poNumber}
Customs Declaration #: ${customsDecNum}
Importer of Record: ${buyerCompany}
European Exporter: ${supplierName}
Product: ${productName}
Shipping Line: ${shippingLine}
Vessel: ${vesselName}
Ocean B/L #: ${billOfLading}
Container ID: ${containerNumber}
Port of Discharge: ${destinationPort}
Estimated Arrival (ETA): ${etaPort}
70% Settlement Status: ${isBalanceCleared ? "CLEARED & RELEASED" : "PENDING WIRE CLEARING"}

MANDATORY DOCUMENTS IN TRANSMITTAL PACKAGE:
1. Ocean Bill of Lading (3/3 Clean On-Board): ${billOfLading}
2. Commercial Invoice: INV-${poNumber}
3. Packing List: PL-${poNumber}
4. Certificate of Origin (EUR.1): EUR1-ES-${requestId.slice(0, 5).toUpperCase()} (0% Customs Duty)
5. Rabbinical Kosher Certificate: KSH-2026-${requestId.slice(0, 4).toUpperCase()}
6. Certificate of Analysis (COA) for Health Ministry: LAB-COA-${requestId.slice(0, 6).toUpperCase()}

Handover Destination: Customs Broker Clearance Desk (Ashdod Port / Ben Gurion)`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:overflow-visible">
      <div className="bg-white text-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto print:shadow-none print:border-none print:rounded-none print:max-w-none print:my-0">
        
        {/* Floating Top Bar (Hidden on Print) */}
        <div className="bg-slate-900 px-6 py-3.5 flex items-center justify-between text-white print:hidden">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-xs font-mono font-bold tracking-wide uppercase text-slate-200">
              Official Customs Clearance Package · {customsDecNum}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyTransmittal}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
            >
              {copied ? "✓ Copied Summary" : "📋 Copy for Customs Broker"}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="text-xs font-bold px-4 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <span>🖨️</span>
              <span>Print Transmittal Sheet</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg text-lg leading-none cursor-pointer"
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Paper Sheet Content */}
        <div className="p-6 sm:p-10 space-y-6 print:p-6 print:space-y-4 font-sans text-xs sm:text-sm">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b-2 border-slate-900 pb-5">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <span className="text-xl sm:text-2xl font-black tracking-tight text-slate-950">
                  FOODXCHANGE TRADE LTD
                </span>
                <span className="text-[10px] uppercase font-black bg-blue-700 text-white px-2.5 py-0.5 rounded-md">
                  CUSTOMS TRANSMITTAL
                </span>
              </div>
              <p className="text-xs font-bold text-slate-600">
                Official Maritime Cargo & Import Documentation Handover Package
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Ashdod Port · Haifa Port · logistics@foodxchange.com
              </p>
            </div>

            <div className="text-left sm:text-right space-y-0.5">
              <div className="text-[10px] uppercase font-bold text-slate-400">Customs Declaration Reference:</div>
              <div className="font-mono font-black text-base text-slate-950">{customsDecNum}</div>
              <div className="text-xs text-slate-600">
                <strong>Ocean B/L:</strong> <span className="font-mono">{billOfLading}</span>
              </div>
              <div className="text-xs text-slate-600">
                <strong>Container:</strong> <span className="font-mono">{containerNumber}</span>
              </div>
            </div>
          </div>

          {/* Shipment & Customs Clearance Coordinates */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border border-slate-200 rounded-xl p-4 bg-slate-50 text-xs">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400">Importer / Consignee:</span>
              <div className="font-bold text-slate-900 mt-0.5">{buyerCompany}</div>
              <div className="text-slate-500 text-[11px]">Direct Retail Importer of Record</div>
              <div className="text-slate-500 text-[11px] mt-1">Ashdod Port Clearing Depot</div>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400">Maritime Carrier & Vessel:</span>
              <div className="font-bold text-slate-900 mt-0.5">{shippingLine}</div>
              <div className="text-slate-600 text-[11px]">Vessel: <strong>{vesselName}</strong></div>
              <div className="text-emerald-700 font-semibold text-[11px] mt-1">ETA Ashdod: {etaPort}</div>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400">Financial Release Status:</span>
              <div className="mt-0.5">
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                  isBalanceCleared
                    ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                    : "bg-amber-100 text-amber-800 border-amber-300"
                }`}>
                  {isBalanceCleared ? "70% Settled · Docs Released ✓" : "Pending 70% Wire Clearing"}
                </span>
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                Brokerage Spread Secured under ICC NCNDA 758
              </div>
            </div>
          </div>

          {/* 6 Mandatory Documents Schedule */}
          <div className="space-y-2">
            <div className="text-[11px] font-black uppercase text-slate-900 tracking-wider">
              Mandatory Import Documents Package for Israeli Customs
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-800 font-bold">
                    <th className="p-3 border-r border-slate-200">Document Type & Legal Function</th>
                    <th className="p-3 border-r border-slate-200">Official Document Ref #</th>
                    <th className="p-3 border-r border-slate-200">Issuing Body</th>
                    <th className="p-3 text-right">Verification Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50/50">
                      <td className="p-3 border-r border-slate-200">
                        <div className="flex items-center gap-2 font-bold text-slate-900">
                          <span>{doc.icon}</span>
                          <span>{doc.name}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {doc.hebrewName}
                        </div>
                      </td>
                      <td className="p-3 border-r border-slate-200 font-mono font-bold text-slate-900">
                        {doc.ref}
                      </td>
                      <td className="p-3 border-r border-slate-200 text-slate-600">
                        {doc.issuer}
                      </td>
                      <td className="p-3 text-right">
                        <span className="font-semibold text-emerald-800 font-mono text-[11px] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                          {doc.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Instructions for Customs Broker */}
          <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-xs space-y-1.5">
            <div className="font-bold text-blue-950">
              Mandatory Instructions for Licensed Customs Broker (עמיל מכס):
            </div>
            <p className="text-blue-900 text-[11px] leading-relaxed">
              1. <strong>Customs Duty Exemption:</strong> Apply preferential 0% tariff treatment under the Israel-European Union Association Agreement by presenting original <strong>EUR.1 Movement Certificate</strong>.<br />
              2. <strong>Health Ministry Clearance:</strong> Submit the <strong>Certificate of Analysis (COA)</strong> and manufacturer ingredient declaration to the National Food Control Service (שירות המזון הארצי).<br />
              3. <strong>Rabbinate Sign-Off:</strong> Endorse the Kosher Certificate to the Chief Rabbinate Import Department prior to container gate-out from Ashdod port.
            </p>
          </div>

          {/* Transmittal Signatures */}
          <div className="pt-4 border-t-2 border-slate-900 grid grid-cols-2 gap-8 text-xs">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Original Documents Released By:</div>
              <div className="font-bold text-slate-900 mt-1">FoodXchange Trade Ltd - Customs Desk</div>
              <div className="text-slate-500 text-[10px]">Head of International Trade Clearing</div>
              <div className="h-10 border-b border-dashed border-slate-400 mt-2 flex items-end pb-1 text-[10px] font-mono text-emerald-800 font-bold">
                ✓ Handover Authorized & Cleared
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Received By Customs Broker (עמיל מכס):</div>
              <div className="font-bold text-slate-900 mt-1">Licensed Customs Clearing Agent</div>
              <div className="text-slate-500 text-[10px]">Ashdod Port Commercial Terminal</div>
              <div className="h-10 border-b border-dashed border-slate-400 mt-2 flex items-end pb-1 text-[10px] font-mono text-slate-500">
                Sign & Port Entry Stamp
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
