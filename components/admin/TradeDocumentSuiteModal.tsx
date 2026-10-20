"use client";

import { useState } from "react";
import Image from "next/image";
import type {
  SampleDispatchProtocol,
  CommercialOrderLifecycle,
} from "@/app/admin/requests/actions";

export interface TradeDocumentSuiteProps {
  requestId: string;
  productName: string;
  cleanedName: string;
  buyerCompany: string;
  benchmarkBrand?: string | null;
  category?: string | null;
  packagingPreference?: string | null;
  volumePerYear?: string | null;
  certifications: string[];
  imageUrl?: string | null;
  sellerBrief?: string | null;
  initialTab?: "brief" | "customs" | "po" | "wire_advice" | "ncnda";
  sampleProtocol?: SampleDispatchProtocol | null;
  orderWorkflow?: CommercialOrderLifecycle | null;
  selectedSupplier?: {
    companyName: string;
    productName: string;
    country: string | null;
    quotePrice?: number | null;
    currency?: string;
    netWeight?: string | null;
    packagingFormat?: string | null;
  } | null;
  onClose: () => void;
}

export type DocTab = "brief" | "customs" | "po" | "wire_advice" | "ncnda";

export default function TradeDocumentSuiteModal({
  requestId,
  productName,
  cleanedName,
  buyerCompany,
  benchmarkBrand,
  category,
  packagingPreference,
  volumePerYear,
  certifications,
  imageUrl,
  sellerBrief,
  initialTab = "brief",
  sampleProtocol,
  orderWorkflow,
  selectedSupplier,
  onClose,
}: TradeDocumentSuiteProps) {
  const [activeTab, setActiveTab] = useState<DocTab>(initialTab);
  const [copied, setCopied] = useState(false);

  const projectTag = `[FDX-REQ-${requestId.slice(0, 8).toUpperCase()}]`;
  const sampleRef = `FDX-SAMPLE-${requestId.slice(0, 8).toUpperCase()}`;
  const poRef = orderWorkflow?.po_number || `FDX-PO-${requestId.slice(0, 8).toUpperCase()}`;

  // Customs / Consignee Fields
  const consignee = sampleProtocol?.courier_instructions?.consignee || {
    company: `${buyerCompany} (c/o FoodXchange Hub)`,
    contact_person: "Quality Assurance & Sensory Evaluation Dept.",
    phone: "+972-3-555-0199",
    email: "samples@foodxchange.com",
    address_line1: "14 HaMelacha St., Logistics Trade Zone",
    address_city: "Rishon LeZion",
    address_country: "Israel",
    postal_code: "7565214",
  };

  const courierName =
    sampleProtocol?.shipment?.courier_name ||
    sampleProtocol?.courier_instructions?.courier_name ||
    "DHL Express";
  const awbNumber = sampleProtocol?.shipment?.awb_tracking_number || "PENDING-ISSUANCE";

  const supplierName =
    selectedSupplier?.companyName ||
    orderWorkflow?.selected_supplier_name ||
    sampleProtocol?.selected_supplier?.company_name ||
    "European Certified Food Producer";
  const supplierCountry =
    selectedSupplier?.country || "Spain / Italy / European Union";

  const unitPrice =
    selectedSupplier?.quotePrice ??
    (orderWorkflow?.agreed_unit_price ? parseFloat(orderWorkflow.agreed_unit_price) : 0.85);
  const currency = selectedSupplier?.currency || orderWorkflow?.currency || "EUR";
  const orderVolume = orderWorkflow?.order_volume || "24,000 Units (1 x 40ft HQ FCL)";
  const totalValue =
    orderWorkflow?.total_order_value ||
    (typeof unitPrice === "number" ? Math.round(unitPrice * 24000) : 20400);

  function handlePrint() {
    window.print();
  }

  function handleCopyText(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-4 flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:my-0 print:w-full">
        {/* ── Modal Header (Hidden on Print) ── */}
        <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between shrink-0 print:hidden">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
                1-Click Trade Document Generator
              </span>
              <span className="text-slate-400 text-xs">·</span>
              <span className="text-xs text-slate-300 font-mono">{projectTag}</span>
            </div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              Official International Trade Paperwork Suite
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Print-ready export documents with official letterhead, non-circumvention protection, and legal customs declarations.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs transition shadow-xs flex items-center gap-1.5"
            >
              <span>🖨️</span>
              <span>Print / Save as PDF</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center transition-colors text-sm"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ── Document Tab Selector (Hidden on Print) ── */}
        <div className="flex items-center border-b border-slate-200 bg-slate-50 px-6 shrink-0 text-xs font-semibold overflow-x-auto print:hidden">
          <button
            onClick={() => setActiveTab("brief")}
            className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === "brief"
                ? "border-indigo-600 text-indigo-600 font-bold bg-white"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>📋</span>
            <span>1. Anonymized Factory RFQ Brief</span>
          </button>

          <button
            onClick={() => setActiveTab("customs")}
            className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === "customs"
                ? "border-indigo-600 text-indigo-600 font-bold bg-white"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>📦</span>
            <span>2. Courier Customs Proforma Invoice</span>
            <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-bold">
              DHL/FedEx
            </span>
          </button>

          <button
            onClick={() => setActiveTab("po")}
            className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === "po"
                ? "border-indigo-600 text-indigo-600 font-bold bg-white"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>📑</span>
            <span>3. Commercial Purchase Order</span>
          </button>

          <button
            onClick={() => setActiveTab("wire_advice")}
            className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === "wire_advice"
                ? "border-indigo-600 text-indigo-600 font-bold bg-white"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>🏦</span>
            <span>4. Bank Wire Advice (30% Deposit)</span>
          </button>

          <button
            onClick={() => setActiveTab("ncnda")}
            className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === "ncnda"
                ? "border-indigo-600 text-indigo-600 font-bold bg-white"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>🛡️</span>
            <span>5. ICC NCNDA 758 Agreement</span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold">
              IMFPA
            </span>
          </button>
        </div>

        {/* ── Document Body ── */}
        <div className="p-8 overflow-y-auto flex-1 bg-white print:p-0 print:overflow-visible">
          {/* ══════════════════════════════════════════════════════════════════════
              DOCUMENT 1: ANONYMIZED FACTORY RFQ BRIEF
          ══════════════════════════════════════════════════════════════════════ */}
          {activeTab === "brief" && (
            <div className="space-y-6 max-w-3xl mx-auto text-slate-900 font-sans">
              {/* Header Letterhead */}
              <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-black text-xl tracking-tight text-slate-900">
                      FOODXCHANGE TRADE LTD
                    </span>
                    <span className="text-[10px] font-bold bg-slate-900 text-white px-2 py-0.5 rounded">
                      RFQ
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">
                    International Food & Beverage Procurement Desk · Direct Mill & Factory Division
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Tel Aviv · Valencia · Bologna · quotes@foodxchange.com · Ref Tag: {projectTag}
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Official RFQ Ref:</div>
                  <div className="font-mono font-bold text-sm text-slate-900 mt-0.5">{projectTag}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Date: {new Date().toLocaleDateString("en-GB")}
                  </div>
                  <div className="text-[10px] text-emerald-700 font-semibold">Validity: 21 Days</div>
                </div>
              </div>

              {/* Client Profile (Anonymized) */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500">Target Buyer Profile:</span>
                  <div className="font-bold text-slate-900 mt-0.5">
                    Verified Institutional Food Retailer / Wholesale Distributor (Israel)
                  </div>
                </div>
                <div className="text-right text-[11px] text-slate-600">
                  <span>Destination: <strong>CIF Ashdod / Haifa Port</strong></span>
                </div>
              </div>

              {/* Benchmark Product Showcase */}
              <div className="border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-start gap-4">
                {imageUrl && (
                  <div className="w-24 h-24 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden relative shrink-0 flex items-center justify-center">
                    <Image
                      src={imageUrl}
                      alt={cleanedName}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                )}

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-orange-900 px-2 py-0.5 rounded">
                      Target Benchmark Spec
                    </span>
                    {benchmarkBrand && (
                      <span className="text-xs font-semibold text-slate-600">
                        Brand Benchmark: <strong>{benchmarkBrand}</strong>
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-1">{cleanedName}</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    We are actively sourcing a direct equivalent line manufactured to European quality standards.
                    Private Label (Buyer's Brand) printing is required.
                  </p>
                </div>
              </div>

              {/* Technical Specifications Table */}
              <table className="w-full border-collapse text-left text-xs border border-slate-200">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-800 font-bold">
                    <th className="p-2.5 border-r border-slate-200 w-1/3">Specification Parameter</th>
                    <th className="p-2.5">Buyer Target Requirement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="p-2.5 border-r border-slate-200 font-semibold text-slate-700">Category</td>
                    <td className="p-2.5 font-bold text-slate-900">{category || "Food & Beverage"}</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 border-r border-slate-200 font-semibold text-slate-700">Packaging Format & Dispenser</td>
                    <td className="p-2.5 text-slate-900">{packagingPreference || "1L Bottle / Retail Pack"}</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 border-r border-slate-200 font-semibold text-slate-700">Compliance & Certifications</td>
                    <td className="p-2.5 text-slate-900">
                      {certifications.length > 0 ? certifications.join(", ") : "BRCGS, IFS, ISO 22000, Kosher"}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 border-r border-slate-200 font-semibold text-slate-700">Target Annual Volume</td>
                    <td className="p-2.5 font-bold text-slate-900">{volumePerYear || "2 - 5 x 40ft HQ FCL Containers"}</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 border-r border-slate-200 font-semibold text-slate-700">Branding Requirement</td>
                    <td className="p-2.5 text-slate-900">Private Label (OEM artwork provided by buyer)</td>
                  </tr>
                </tbody>
              </table>

              {/* Official RFQ Instructions to Factory */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="font-bold text-slate-900 text-xs">Factory Submission Guidelines:</div>
                <div className="text-slate-700 leading-relaxed">
                  Please reply to our sourcing desk with the following commercial parameters:
                  <ul className="list-disc list-inside mt-1 space-y-1 text-slate-600">
                    <li><strong>Landed Unit Price:</strong> Quoted in EUR or USD on <strong>CIF Ashdod / Haifa Port</strong> basis.</li>
                    <li><strong>Minimum Order Quantity (MOQ):</strong> Units per container / palletization specs.</li>
                    <li><strong>Production Lead Time:</strong> Weeks from deposit to port departure.</li>
                    <li><strong>Kosher Status:</strong> Rabbi / Agency name if currently supervised (or open to Kosher production run).</li>
                    <li><strong>Sensory Samples:</strong> Readiness to dispatch 2–4 sample units via DHL/FedEx upon request.</li>
                  </ul>
                </div>
              </div>

              {/* Submission Notice & Clean Copy */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 print:hidden">
                <span>All supplier responses must include <strong>{projectTag}</strong> in the email subject.</span>
                <button
                  type="button"
                  onClick={() =>
                    handleCopyText(
                      `FoodXchange Trade RFQ: ${cleanedName} ${projectTag}\nBenchmark: ${benchmarkBrand || "Standard"}\nPackaging: ${packagingPreference || "Retail"}\nVolume: ${volumePerYear || "FCL"}\nCompliance: ${certifications.join(", ")}\nPlease send CIF Ashdod pricing, MOQ, and lead time to quotes@foodxchange.com.`
                    )
                  }
                  className="px-3 py-1.5 rounded-lg border border-slate-300 font-semibold hover:bg-slate-50 text-slate-700"
                >
                  {copied ? "✓ Copied Text" : "📋 Copy RFQ Summary"}
                </button>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════════
              DOCUMENT 2: DHL / FEDEX CUSTOMS PROFORMA INVOICE & DISPATCH LETTER
          ══════════════════════════════════════════════════════════════════════ */}
          {activeTab === "customs" && (
            <div className="space-y-6 max-w-3xl mx-auto text-slate-900 font-sans">
              {/* Header */}
              <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
                <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">
                    PROFORMA INVOICE / CUSTOMS DECLARATION
                  </h1>
                  <p className="text-xs font-bold text-orange-600 uppercase tracking-wide mt-0.5">
                    Food Samples for Sensory Evaluation Only · No Commercial Value
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Mandatory Air Waybill Attachment for Customs Clearance
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Doc Reference:</div>
                  <div className="font-mono font-bold text-sm text-slate-900">{sampleRef}</div>
                  <div className="text-[10px] text-slate-500">Date: {new Date().toLocaleDateString("en-GB")}</div>
                  <div className="text-[10px] font-mono text-slate-700 mt-0.5">{courierName}</div>
                </div>
              </div>

              {/* Shipper & Consignee Grid */}
              <div className="grid grid-cols-2 gap-6 border border-slate-200 rounded-xl p-4 bg-slate-50 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500">1. Shipper / Exporter:</span>
                  <div className="font-bold text-slate-900 mt-1">{supplierName}</div>
                  <div className="text-slate-600 mt-0.5">Factory Production & Lab Facility</div>
                  <div className="text-slate-600">{supplierCountry}</div>
                  <div className="text-[10px] text-slate-500 mt-1 font-mono">Air Waybill: {awbNumber}</div>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500">2. Consignee / Delivery Address:</span>
                  <div className="font-bold text-slate-900 mt-1">{consignee.company}</div>
                  <div className="text-slate-600 mt-0.5">Attn: {consignee.contact_person}</div>
                  <div className="text-slate-600">{consignee.address_line1}</div>
                  <div className="text-slate-600">{consignee.address_city}, {consignee.postal_code}, {consignee.address_country}</div>
                  <div className="text-slate-600 mt-0.5">Tel: {consignee.phone} · {consignee.email}</div>
                </div>
              </div>

              {/* Mandatory Customs Declaration Box */}
              <div className="p-4 rounded-xl bg-amber-50 border-2 border-amber-300 text-amber-950 text-xs">
                <div className="font-black text-amber-900 uppercase tracking-wide mb-1">
                  ★ Mandatory Legal Customs Clearance Declaration:
                </div>
                <p className="leading-relaxed font-medium">
                  "WE HEREBY DECLARE THAT THIS SHIPMENT CONTAINS ONLY FOOD SAMPLES FOR SENSORY EVALUATION,
                  LABORATORY TESTING AND QUALITY TASTING. THESE SAMPLES ARE NOT FOR COMMERCIAL SALE, CONSUMPTION
                  OR RESALE. VALUE DECLARED FOR CUSTOMS PURPOSES ONLY: <strong>EUR 10.00</strong>."
                </p>
              </div>

              {/* Sample Items Table */}
              <table className="w-full border-collapse text-left text-xs border border-slate-200">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 font-bold text-slate-800">
                    <th className="p-2.5 border-r border-slate-200">Sample Description</th>
                    <th className="p-2.5 border-r border-slate-200">Packaging Format</th>
                    <th className="p-2.5 border-r border-slate-200 text-center">Quantity</th>
                    <th className="p-2.5 border-r border-slate-200 text-right">Unit Value (€)</th>
                    <th className="p-2.5 text-right">Total Value (€)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="p-2.5 border-r border-slate-200">
                      <div className="font-bold text-slate-900">{cleanedName}</div>
                      <div className="text-[10px] text-slate-500">Food Samples for Tasting</div>
                    </td>
                    <td className="p-2.5 border-r border-slate-200 text-slate-700">
                      {packagingPreference || "Retail Sealed Bottle"}
                    </td>
                    <td className="p-2.5 border-r border-slate-200 text-center font-bold">3 Units</td>
                    <td className="p-2.5 border-r border-slate-200 text-right text-slate-600 font-mono">€3.33</td>
                    <td className="p-2.5 text-right font-bold text-slate-900 font-mono">€10.00</td>
                  </tr>
                  <tr className="bg-slate-50 font-bold">
                    <td colSpan={4} className="p-2.5 text-right border-r border-slate-200">
                      Total Customs Value Declared:
                    </td>
                    <td className="p-2.5 text-right text-emerald-800 font-mono">€10.00 EUR</td>
                  </tr>
                </tbody>
              </table>

              {/* Mandatory Breakage Prevention Instructions */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                <div className="font-bold text-slate-900">Mandatory Packaging & Air Courier Protocol:</div>
                <div className="text-slate-600 leading-relaxed text-[11px]">
                  1. <strong>Leak-proof Protection:</strong> Seal each bottle/pack inside a sealed polyethylene bag to prevent spillage.<br />
                  2. <strong>Impact Cushioning:</strong> Wrap each unit in multi-layer bubble wrap / foam sleeves.<br />
                  3. <strong>Outer Box:</strong> Use rigid 5-ply export corrugated carton. Mark outside: <em>FRAGILE / KEEP UPRIGHT</em>.<br />
                  4. <strong>Documentation:</strong> Affix <strong>3 signed copies</strong> of this Proforma Invoice to the exterior pouch of the parcel.
                </div>
              </div>

              {/* Signature Block */}
              <div className="pt-6 grid grid-cols-2 gap-8 border-t border-slate-200 text-xs">
                <div>
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Shipper / Factory Sign & Stamp:</div>
                  <div className="font-bold text-slate-900 mt-1">{supplierName}</div>
                  <div className="text-slate-500 text-[10px]">Authorized Signature</div>
                  <div className="h-10 border-b border-dashed border-slate-400 mt-2" />
                </div>
                <div>
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Issuing Trade Broker:</div>
                  <div className="font-bold text-slate-900 mt-1">FoodXchange Trade Ltd</div>
                  <div className="text-slate-500 text-[10px]">Logistics Clearance Officer</div>
                  <div className="h-10 border-b border-dashed border-slate-400 mt-2" />
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════════
              DOCUMENT 3: COMMERCIAL EXPORT PURCHASE ORDER (PO)
          ══════════════════════════════════════════════════════════════════════ */}
          {activeTab === "po" && (
            <div className="space-y-6 max-w-3xl mx-auto text-slate-900 font-sans">
              {/* Header Letterhead */}
              <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-black text-xl tracking-tight text-slate-900">
                      FOODXCHANGE TRADE LTD
                    </span>
                    <span className="text-[10px] font-bold bg-emerald-700 text-white px-2 py-0.5 rounded">
                      OFFICIAL PO
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">
                    Commercial Purchase Order · Global Supply & Import Contract
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Tel Aviv · Valencia · Bologna · order-desk@foodxchange.com
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Purchase Order #:</div>
                  <div className="font-mono font-bold text-sm text-slate-900 mt-0.5">{poRef}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Date: {new Date().toLocaleDateString("en-GB")}
                  </div>
                  <div className="text-[10px] text-indigo-700 font-semibold">Incoterms: CIF Ashdod Port</div>
                </div>
              </div>

              {/* Parties Grid */}
              <div className="grid grid-cols-2 gap-6 border border-slate-200 rounded-xl p-4 bg-slate-50 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500">Seller / Manufacturer:</span>
                  <div className="font-bold text-slate-900 mt-1">{supplierName}</div>
                  <div className="text-slate-600">{supplierCountry}</div>
                  <div className="text-slate-600 mt-1">Production Facility & Export Dept.</div>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500">Buyer / Consignee:</span>
                  <div className="font-bold text-slate-900 mt-1">{buyerCompany}</div>
                  <div className="text-slate-600">Port of Destination: CIF Ashdod / Haifa Port</div>
                  <div className="text-slate-600 mt-1">Coordinated via FoodXchange Trade Brokerage</div>
                </div>
              </div>

              {/* Order Items Table */}
              <table className="w-full border-collapse text-left text-xs border border-slate-200">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 font-bold text-slate-800">
                    <th className="p-2.5 border-r border-slate-200">Item Description</th>
                    <th className="p-2.5 border-r border-slate-200">Packaging / Specs</th>
                    <th className="p-2.5 border-r border-slate-200 text-center">Order Volume</th>
                    <th className="p-2.5 border-r border-slate-200 text-right">Unit Price</th>
                    <th className="p-2.5 text-right">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="p-2.5 border-r border-slate-200">
                      <div className="font-bold text-slate-900">{cleanedName}</div>
                      <div className="text-[10px] text-slate-500">
                        Private Label · Compliance: {certifications.join(", ") || "BRC, Kosher"}
                      </div>
                    </td>
                    <td className="p-2.5 border-r border-slate-200 text-slate-700">
                      {packagingPreference || "1L Bottle"}
                    </td>
                    <td className="p-2.5 border-r border-slate-200 text-center font-bold">
                      {orderVolume}
                    </td>
                    <td className="p-2.5 border-r border-slate-200 text-right font-mono font-bold text-slate-900">
                      €{typeof unitPrice === "number" ? unitPrice.toFixed(2) : "0.85"}
                    </td>
                    <td className="p-2.5 text-right font-mono font-black text-slate-900">
                      €{totalValue.toLocaleString()} {currency}
                    </td>
                  </tr>
                  <tr className="bg-slate-50 font-bold">
                    <td colSpan={4} className="p-2.5 text-right border-r border-slate-200">
                      Total Commercial Contract Value (CIF):
                    </td>
                    <td className="p-2.5 text-right text-emerald-800 font-mono text-sm">
                      €{totalValue.toLocaleString()} {currency}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Payment Terms & Shipping Documentation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="font-bold text-slate-900">Commercial Payment Milestones:</div>
                  <div className="text-slate-600 text-[11px] leading-relaxed">
                    • <strong>30% Advance Deposit:</strong> Transferred upon countersigned PO to initiate packaging cylinder printing and bottling production.<br />
                    • <strong>70% Final Balance:</strong> Released against copies of Clean On-Board Ocean Bill of Lading (B/L) and Pre-Shipment Quality Inspection (PSI).
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="font-bold text-slate-900">Mandatory Export Documentation:</div>
                  <div className="text-slate-600 text-[11px] leading-relaxed">
                    1. Original Clean On-Board Ocean Bill of Lading (3/3).<br />
                    2. Commercial Invoice & Packing List.<br />
                    3. Certificate of Origin (EUR.1).<br />
                    4. Kosher Certificate signed by approved Rabbinate.<br />
                    5. Certificate of Analysis (COA) for Health Ministry.
                  </div>
                </div>
              </div>

              {/* Two-Party Signatures */}
              <div className="pt-6 grid grid-cols-2 gap-8 border-t border-slate-200 text-xs">
                <div>
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Issued & Confirmed by Buyer:</div>
                  <div className="font-bold text-slate-900 mt-1">{buyerCompany}</div>
                  <div className="text-slate-500 text-[10px]">Authorized Commercial Officer</div>
                  <div className="h-10 border-b border-dashed border-slate-400 mt-2" />
                </div>
                <div>
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Accepted & Confirmed by Seller:</div>
                  <div className="font-bold text-slate-900 mt-1">{supplierName}</div>
                  <div className="text-slate-500 text-[10px]">Managing Director / Export Sales</div>
                  <div className="h-10 border-b border-dashed border-slate-400 mt-2" />
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════════
              DOCUMENT 4: BANK WIRE TRANSFER ADVICE & SWIFT INSTRUCTION
          ══════════════════════════════════════════════════════════════════════ */}
          {activeTab === "wire_advice" && (
            <div className="space-y-6 max-w-3xl mx-auto text-slate-900 font-sans">
              {/* Header Letterhead */}
              <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-black text-xl tracking-tight text-slate-900">
                      FOODXCHANGE TRADE LTD
                    </span>
                    <span className="text-[10px] font-bold bg-indigo-700 text-white px-2 py-0.5 rounded">
                      SWIFT ADVICE
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">
                    Commercial Settlement & International Treasury Division
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Tel Aviv · Barcelona · Bologna · settlements@foodxchange.com
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Document Ref:</div>
                  <div className="font-mono font-bold text-sm text-slate-900 mt-0.5">
                    WIRE-ADV-{requestId.slice(0, 8).toUpperCase()}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Date: {new Date().toLocaleDateString("en-GB")}
                  </div>
                </div>
              </div>

              {/* Title Banner */}
              <div className="text-center py-2 bg-slate-50 border border-slate-200 rounded-lg">
                <h1 className="text-base font-black tracking-wide uppercase text-slate-900">
                  Commercial Bank Wire Transfer Advice
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Official SWIFT Settlement Instruction for Purchase Order: <strong>{poRef}</strong>
                </p>
              </div>

              {/* Addressed To & Remittance Summary */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Payer / Remitter:</div>
                  <div className="font-bold text-slate-900 text-sm">{buyerCompany}</div>
                  <div className="text-slate-600">Treasury & International Accounts Payable</div>
                  <div className="text-slate-500 text-[11px]">Israel</div>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-1">
                  <div className="text-[10px] uppercase font-bold text-emerald-700">Required Remittance (30% Advance):</div>
                  <div className="font-black text-emerald-950 text-base">
                    {currency} {((totalValue * 0.3)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-[11px] text-emerald-800">
                    Total Contract: {currency} {totalValue.toLocaleString()} · Balance (70%): {currency} {(totalValue * 0.7).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Official Beneficiary Banking Coordinates Table */}
              <div className="border border-slate-300 rounded-xl overflow-hidden shadow-2xs">
                <div className="bg-slate-900 text-white px-4 py-2 text-xs font-bold uppercase tracking-wider">
                  Designated International Beneficiary Banking Coordinates
                </div>
                <table className="w-full text-xs">
                  <tbody className="divide-y divide-slate-200">
                    <tr className="bg-slate-50/60">
                      <td className="px-4 py-2.5 font-bold text-slate-600 w-1/3">Beneficiary Account Name:</td>
                      <td className="px-4 py-2.5 font-mono font-bold text-slate-900">
                        FoodXchange Trade Ltd - Client Settlement Account
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 font-bold text-slate-600">Beneficiary Bank:</td>
                      <td className="px-4 py-2.5 font-semibold text-slate-900">
                        CaixaBank S.A. (Commercial Branch Barcelona)
                      </td>
                    </tr>
                    <tr className="bg-slate-50/60">
                      <td className="px-4 py-2.5 font-bold text-slate-600">IBAN (International Bank Account Number):</td>
                      <td className="px-4 py-2.5 font-mono font-bold text-slate-950 text-sm tracking-wider">
                        ES76 2100 0418 4502 0005 1294
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 font-bold text-slate-600">SWIFT / BIC Code:</td>
                      <td className="px-4 py-2.5 font-mono font-bold text-indigo-700">
                        CAIXESBBXXX
                      </td>
                    </tr>
                    <tr className="bg-slate-50/60">
                      <td className="px-4 py-2.5 font-bold text-slate-600">Bank Physical Address:</td>
                      <td className="px-4 py-2.5 text-slate-700">
                        Avinguda Diagonal 621, 08028 Barcelona, Spain
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 font-bold text-slate-600">Correspondent Bank (EUR Clearing):</td>
                      <td className="px-4 py-2.5 text-slate-700 font-mono">
                        Deutsche Bank AG, Frankfurt (SWIFT: DEUTDEFF)
                      </td>
                    </tr>
                    <tr className="bg-amber-50/60 border-t-2 border-amber-300">
                      <td className="px-4 py-2.5 font-bold text-amber-900">Mandatory Remittance Memo (Field 70):</td>
                      <td className="px-4 py-2.5 font-mono font-bold text-amber-950">
                        ADV-30-{requestId.slice(0, 8).toUpperCase()} / PO-{poRef}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Terms of Release */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                <div className="font-bold text-slate-900 uppercase text-[10px] tracking-wider">
                  Payment Protocol & Production Commencement Terms:
                </div>
                <div className="text-slate-600 leading-relaxed space-y-1 text-[11px]">
                  <p>
                    1. <strong>Production Allocation:</strong> Factory production run, raw ingredient allocation, and approved packaging printing will commence within 48 business hours of receipt of the SWIFT MT103 confirmation slip.
                  </p>
                  <p>
                    2. <strong>70% Final Balance:</strong> Remitted prior to release of original Bills of Lading upon presentation of the Clean On-Board Ocean Bill of Lading copy and satisfactory Pre-Shipment Inspection (PSI) Certificate.
                  </p>
                  <p>
                    3. <strong>Bank Charges:</strong> All remitting bank charges outside the European Union shall be borne by the Remitter (OUR condition).
                  </p>
                </div>
              </div>

              {/* Sign-off */}
              <div className="pt-6 grid grid-cols-2 gap-8 border-t border-slate-200 text-xs">
                <div>
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Authorized Treasury Officer:</div>
                  <div className="font-bold text-slate-900 mt-1">FoodXchange Trade Settlement Desk</div>
                  <div className="text-slate-500 text-[10px]">Commercial Accounts Department</div>
                  <div className="h-10 border-b border-dashed border-slate-400 mt-2" />
                </div>
                <div>
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Remittance Acknowledgment (Buyer):</div>
                  <div className="font-bold text-slate-900 mt-1">{buyerCompany}</div>
                  <div className="text-slate-500 text-[10px]">Chief Financial Officer / Accounts Payable</div>
                  <div className="h-10 border-b border-dashed border-slate-400 mt-2" />
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════════
              DOCUMENT 5: ICC NCNDA 758 TRIPARTITE COMMISSION & WORKING AGREEMENT
          ══════════════════════════════════════════════════════════════════════ */}
          {activeTab === "ncnda" && (
            <div className="space-y-6 max-w-3xl mx-auto text-slate-900 font-sans">
              {/* Header Letterhead */}
              <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-black text-xl tracking-tight text-slate-900">
                      INTERNATIONAL CHAMBER OF COMMERCE (ICC)
                    </span>
                    <span className="text-[10px] font-bold bg-amber-600 text-white px-2 py-0.5 rounded">
                      ICC 758
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">
                    Standard Non-Circumvention, Non-Disclosure & Working Agreement (NCNDA)
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Incorporating Irrevocable Master Fee Protection Agreement (IMFPA)
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Agreement Ref:</div>
                  <div className="font-mono font-bold text-sm text-slate-900 mt-0.5">
                    NCNDA-FDX-{requestId.slice(0, 8).toUpperCase()}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Valid for: 24 Calendar Months
                  </div>
                </div>
              </div>

              {/* Title Banner */}
              <div className="text-center py-2 bg-slate-50 border border-slate-200 rounded-lg">
                <h1 className="text-sm font-black tracking-wide uppercase text-slate-900">
                  Tripartite Non-Circumvention & Fee Protection Agreement
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Subject to ICC Publication No. 758 · Regarding Sourcing Project: <strong>{cleanedName}</strong>
                </p>
              </div>

              {/* The Three Contracting Parties */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="text-[10px] uppercase font-bold text-indigo-700">Party A (The Facilitator / Agent):</div>
                  <div className="font-bold text-slate-900">FoodXchange Trade Ltd</div>
                  <div className="text-slate-500 text-[11px]">International Trade Desk & Sourcing Broker</div>
                  <div className="text-slate-400 text-[10px]">Ref: {projectTag}</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="text-[10px] uppercase font-bold text-slate-700">Party B (The Buyer):</div>
                  <div className="font-bold text-slate-900">{buyerCompany}</div>
                  <div className="text-slate-500 text-[11px]">Authorized Food Importer & Distributor</div>
                  <div className="text-slate-400 text-[10px]">Territory: Israel / Middle East</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="text-[10px] uppercase font-bold text-slate-700">Party C (The Supplier):</div>
                  <div className="font-bold text-slate-900">{supplierName}</div>
                  <div className="text-slate-500 text-[11px]">Primary Certified Manufacturer</div>
                  <div className="text-slate-400 text-[10px]">{supplierCountry}</div>
                </div>
              </div>

              {/* Legal Articles */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 text-xs leading-relaxed text-slate-700">
                <div>
                  <h4 className="font-bold text-slate-900 text-xs mb-1">
                    Article 1: Non-Circumvention & Exclusivity of Introduction
                  </h4>
                  <p className="text-[11px] leading-relaxed">
                    The undersigned Buyer (Party B) and Supplier (Party C) mutually and severally covenant and agree that neither party shall, directly or indirectly, attempt to circumvent, avoid, or bypass Party A (FoodXchange Trade Ltd) in any commercial transaction, negotiation, supply agreement, or correspondence involving the product line <strong>{cleanedName}</strong> and any related catalog SKUs introduced by Party A.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 text-xs mb-1">
                    Article 2: Term of Protection (24 Calendar Months)
                  </h4>
                  <p className="text-[11px] leading-relaxed">
                    This Agreement shall remain in full force and legally binding effect for a period of <strong>twenty-four (24) calendar months</strong> from the date of initial execution, and shall automatically extend to apply to all subsequent re-orders, contract roll-overs, renewals, container volume expansions, or subsidiary agreements deriving from this business relationship.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 text-xs mb-1">
                    Article 3: Irrevocable Master Fee Protection Agreement (IMFPA)
                  </h4>
                  <p className="text-[11px] leading-relaxed">
                    The Buyer and Supplier hereby irrevocably instruct their respective banks and corporate treasuries that the Facilitator's agreed agency spread (+EUR 0.05 / unit or 5% of commercial invoice value) is fully protected and shall be settled upon clearance of each contractual payment milestone (30% advance deposit and 70% shipping balance). Neither party shall delay, withhold, or dispute the commission due upon satisfactory fulfillment of the agreed delivery terms.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 text-xs mb-1">
                    Article 4: Governing Law & Jurisdiction
                  </h4>
                  <p className="text-[11px] leading-relaxed">
                    This Agreement shall be governed by and interpreted under the rules and international trade customs of the <strong>International Chamber of Commerce (ICC, Paris)</strong>. Any unresolved dispute shall be settled under ICC Commercial Arbitration Rules.
                  </p>
                </div>
              </div>

              {/* Tripartite Signatures */}
              <div className="pt-6 grid grid-cols-3 gap-6 border-t border-slate-200 text-xs">
                <div>
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Party A (Facilitator):</div>
                  <div className="font-bold text-slate-900 mt-1">FoodXchange Trade Ltd</div>
                  <div className="text-slate-500 text-[10px]">Managing Director / Broker</div>
                  <div className="h-10 border-b border-dashed border-slate-400 mt-2" />
                </div>
                <div>
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Party B (Buyer):</div>
                  <div className="font-bold text-slate-900 mt-1">{buyerCompany}</div>
                  <div className="text-slate-500 text-[10px]">Authorized Purchasing Director</div>
                  <div className="h-10 border-b border-dashed border-slate-400 mt-2" />
                </div>
                <div>
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Party C (Supplier):</div>
                  <div className="font-bold text-slate-900 mt-1">{supplierName}</div>
                  <div className="text-slate-500 text-[10px]">Managing Director / Export Sales</div>
                  <div className="h-10 border-b border-dashed border-slate-400 mt-2" />
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
