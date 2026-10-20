"use client";

import { useState } from "react";

export interface CommercialPoDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  poNumber: string;
  poDate?: string;
  buyerCompany: string;
  buyerSignatory?: string;
  buyerAddress?: string;
  supplierName: string;
  supplierCountry?: string;
  productName: string;
  orderVolume: string;
  unitPrice: number | string;
  currency?: string;
  totalOrderValue: number;
  incoterms?: string;
  advanceDepositPercent?: number;
  balancePercent?: number;
  paymentTerms?: string;
  certifications?: string[];
  packagingPreference?: string;
  targetWarehouse?: string;
}

export default function CommercialPoDocumentModal({
  isOpen,
  onClose,
  poNumber,
  poDate = new Date().toISOString().slice(0, 10),
  buyerCompany,
  buyerSignatory = "Authorized Procurement Officer",
  buyerAddress = "Central Logistics Hub, 14 HaMelacha St., Rishon LeZion, Israel",
  supplierName,
  supplierCountry = "European Union (Spain / Italy)",
  productName,
  orderVolume,
  unitPrice,
  currency = "EUR",
  totalOrderValue,
  incoterms = "CIF Ashdod Port (Incoterms 2020)",
  advanceDepositPercent = 30,
  balancePercent = 70,
  paymentTerms,
  certifications = ["BRCGS Food Safety", "IFS", "ISO 22000", "Kosher Certified"],
  packagingPreference = "Retail Sealed Pack / Standard Export Master Carton",
  targetWarehouse = "Central Distribution Hub, Ashdod / Rishon LeZion",
}: CommercialPoDocumentModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const numPrice = typeof unitPrice === "number" ? unitPrice : parseFloat(unitPrice) || 0;
  const advanceAmount = Math.round(totalOrderValue * (advanceDepositPercent / 100));
  const balanceAmount = totalOrderValue - advanceAmount;

  const formattedTotal = totalOrderValue.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const formattedAdvance = advanceAmount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const formattedBalance = balanceAmount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const handlePrint = () => {
    window.print();
  };

  const handleCopySummary = () => {
    const text = `=== B2B COMMERCIAL PURCHASE ORDER ===
PO Number: ${poNumber}
Date: ${poDate}
Buyer: ${buyerCompany}
Seller/Producer: ${supplierName} (${supplierCountry})
Product: ${productName}
Quantity: ${orderVolume}
Incoterms: ${incoterms}
Unit Price: €${numPrice.toFixed(2)} ${currency}
Total Commercial Value: €${formattedTotal} ${currency}
30% Advance Deposit: €${formattedAdvance} ${currency}
70% Final Balance: €${formattedBalance} ${currency}
Delivery Target: ${targetWarehouse}
Issuing Broker Desk: FoodXchange Trade Ltd (ICC NCNDA 758 protected)`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:overflow-visible">
      {/* Document Sheet Container */}
      <div className="bg-white text-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto print:shadow-none print:border-none print:rounded-none print:max-w-none print:my-0">
        
        {/* Top Floating Action Bar (Hidden during Print) */}
        <div className="bg-slate-900 px-6 py-3.5 flex items-center justify-between text-white print:hidden">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono font-bold tracking-wide uppercase text-slate-200">
              Official B2B Export Document Suite · {poNumber}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopySummary}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            >
              {copied ? "✓ Copied Summary" : "📋 Copy Details"}
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="text-xs font-bold px-4 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white transition flex items-center gap-1.5 shadow-xs"
            >
              <span>🖨️</span>
              <span>Print / Save as PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg text-lg leading-none"
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Printable Paper Content */}
        <div className="p-6 sm:p-10 space-y-6 print:p-6 print:space-y-5 font-sans leading-relaxed text-xs sm:text-sm">
          
          {/* Header & Tripartite Letterhead */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b-2 border-slate-900 pb-5">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <span className="text-xl sm:text-2xl font-black tracking-tight text-slate-950 font-sans">
                  FOODXCHANGE TRADE LTD
                </span>
                <span className="text-[10px] uppercase font-black bg-emerald-700 text-white px-2.5 py-0.5 rounded-md tracking-wider">
                  COMMERCIAL PO
                </span>
              </div>
              <p className="text-xs font-bold text-slate-600">
                International Agri-Food Brokerage & Direct Import Clearing Desk
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                London · Bologna · Valencia · Tel Aviv · orders@foodxchange.com
              </p>
            </div>

            <div className="text-left sm:text-right space-y-0.5">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Purchase Order & Proforma Ref
              </div>
              <div className="font-mono font-black text-base text-slate-950">
                {poNumber}
              </div>
              <div className="text-xs text-slate-600">
                <strong>Date:</strong> {poDate}
              </div>
              <div className="text-xs font-bold text-orange-700">
                {incoterms}
              </div>
            </div>
          </div>

          {/* Parties Grid (Buyer, Seller, Clearing Desk) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border border-slate-200 rounded-xl p-4 bg-slate-50/70 print:bg-white text-xs">
            {/* Buyer / Consignee */}
            <div className="space-y-1">
              <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                1. Buyer / Importer of Record (Consignee)
              </div>
              <div className="text-sm font-bold text-slate-900">{buyerCompany}</div>
              <div className="text-slate-600">Attn: {buyerSignatory}</div>
              <div className="text-slate-600">{buyerAddress}</div>
              <div className="text-[11px] text-slate-500 pt-0.5">
                Port of Discharge: <strong>Ashdod / Haifa Port, Israel</strong>
              </div>
            </div>

            {/* Seller / Manufacturer */}
            <div className="space-y-1">
              <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                2. Seller / European Manufacturer
              </div>
              <div className="text-sm font-bold text-slate-900">{supplierName}</div>
              <div className="text-slate-600">Export Division & Industrial Production Facility</div>
              <div className="text-slate-600">{supplierCountry}</div>
              <div className="text-[11px] text-slate-500 pt-0.5">
                Facilitated via: <strong>FoodXchange Sourcing Clearing Desk</strong>
              </div>
            </div>
          </div>

          {/* Order Specification Schedule */}
          <div className="space-y-2">
            <div className="text-[11px] font-black uppercase text-slate-900 tracking-wider">
              Commercial Order Items & Pricing Schedule
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-800 font-bold">
                    <th className="p-3 border-r border-slate-200">Item Description & Specifications</th>
                    <th className="p-3 border-r border-slate-200">Packaging / Volume</th>
                    <th className="p-3 border-r border-slate-200 text-center">Quantity (Units)</th>
                    <th className="p-3 border-r border-slate-200 text-right">Unit Price ({currency})</th>
                    <th className="p-3 text-right">Total ({currency})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="p-3 border-r border-slate-200">
                      <div className="font-bold text-slate-950 text-sm">{productName}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Private Label Retail Pack · Grade A Quality Standards
                      </div>
                      <div className="text-[10px] text-slate-600 mt-1">
                        <strong>Compliance:</strong> {certifications.join(", ")}
                      </div>
                    </td>
                    <td className="p-3 border-r border-slate-200 text-slate-700">
                      <div>{packagingPreference}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Standard Euro Palletization</div>
                    </td>
                    <td className="p-3 border-r border-slate-200 text-center font-bold font-mono text-slate-900 text-sm">
                      {orderVolume}
                    </td>
                    <td className="p-3 border-r border-slate-200 text-right font-mono font-bold text-slate-900 text-sm">
                      €{numPrice.toFixed(2)}
                    </td>
                    <td className="p-3 text-right font-mono font-black text-slate-950 text-sm">
                      €{formattedTotal}
                    </td>
                  </tr>

                  {/* Summary Rows */}
                  <tr className="bg-slate-50/70 font-semibold text-slate-700">
                    <td colSpan={4} className="p-2.5 text-right border-r border-slate-200">
                      Subtotal Net (CIF Ashdod):
                    </td>
                    <td className="p-2.5 text-right font-mono text-slate-900">
                      €{formattedTotal} {currency}
                    </td>
                  </tr>
                  <tr className="bg-slate-100 font-bold text-slate-900">
                    <td colSpan={4} className="p-3 text-right border-r border-slate-200 text-sm">
                      Total Commercial Purchase Contract Value ({incoterms.split(" ")[0]}):
                    </td>
                    <td className="p-3 text-right text-emerald-800 font-mono font-black text-base">
                      €{formattedTotal} {currency}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment Terms & Milestone Wire Schedule */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Payment Schedule Card */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 print:bg-white space-y-2 text-xs">
              <div className="font-bold text-slate-900 text-xs flex items-center justify-between">
                <span>Payment Terms & Wire Schedule</span>
                <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded">
                  30% / 70% Milestone
                </span>
              </div>
              <div className="space-y-1.5 text-slate-700">
                <div className="p-2 bg-white rounded-lg border border-slate-200 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-slate-900">1. Production Advance (30%):</span>
                    <p className="text-[10px] text-slate-500">Transferred on PO countersigning to initiate bottling.</p>
                  </div>
                  <span className="font-mono font-black text-amber-900 text-xs">
                    €{formattedAdvance} {currency}
                  </span>
                </div>

                <div className="p-2 bg-white rounded-lg border border-slate-200 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-slate-900">2. Final Balance (70%):</span>
                    <p className="text-[10px] text-slate-500">Released against Clean Ocean B/L Copy & PSI lab report.</p>
                  </div>
                  <span className="font-mono font-black text-slate-900 text-xs">
                    €{formattedBalance} {currency}
                  </span>
                </div>
              </div>
            </div>

            {/* Escrow Settlement Coordinates */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 print:bg-white space-y-1.5 text-xs">
              <div className="font-bold text-slate-900 text-xs">
                Official Settlement Banking Coordinates
              </div>
              <div className="text-[11px] text-slate-600 leading-relaxed font-mono">
                <div><strong>Beneficiary:</strong> FoodXchange Trade Ltd - Client Settlement Account</div>
                <div><strong>Bank Name:</strong> Barclays International / Bank Leumi Fiduciary Desk</div>
                <div><strong>IBAN:</strong> GB82 BARC 2004 0192 8491 00</div>
                <div><strong>SWIFT / BIC:</strong> BARCGB22</div>
                <div><strong>Payment Reference:</strong> <span className="font-bold text-orange-600">{poNumber}</span></div>
              </div>
              <p className="text-[10px] text-slate-500 italic pt-1">
                * Wire receipts (SWIFT MT103) must be uploaded to the portal to immediately release the manufacturing line.
              </p>
            </div>
          </div>

          {/* Mandatory Shipping Documentation & Non-Circumvention Clause */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 print:bg-white space-y-1.5 text-[11px] text-slate-600">
            <div className="font-bold text-slate-900 text-xs">
              Mandatory Export Documents & Non-Circumvention Protection:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
              <div>
                <strong>Export Documents Required:</strong>
                <ul className="list-disc list-inside mt-0.5 space-y-0.5 text-slate-600">
                  <li>3/3 Original Clean On-Board Ocean Bills of Lading (B/L)</li>
                  <li>Commercial Invoice & Detailed Packing List</li>
                  <li>Certificate of Origin (EUR.1 Movement Certificate)</li>
                  <li>Official Rabbinical Kosher Certificate for Israel Import</li>
                </ul>
              </div>
              <div>
                <strong>Legal Non-Circumvention Protection:</strong>
                <p className="mt-0.5 text-slate-500 leading-normal">
                  This transaction is governed under ICC NCNDA 758 rules. The buyer and seller agree not to bypass, avoid, or circumvent FoodXchange Trade Ltd directly or indirectly for repeat transactions for 24 months.
                </p>
              </div>
            </div>
          </div>

          {/* Formal Signatures & Stamps Block */}
          <div className="pt-4 border-t-2 border-slate-900 grid grid-cols-3 gap-6 text-xs">
            {/* Buyer Signature */}
            <div className="space-y-1">
              <div className="text-[10px] uppercase font-bold text-slate-400">Accepted & Authorized By Buyer:</div>
              <div className="font-bold text-slate-900">{buyerCompany}</div>
              <div className="text-[10px] text-slate-500">{buyerSignatory}</div>
              <div className="h-10 border-b border-dashed border-slate-400 mt-2 flex items-end pb-1 text-[10px] font-mono text-emerald-800 font-bold">
                ✓ Digitally Signed & Sealed
              </div>
            </div>

            {/* Seller Signature */}
            <div className="space-y-1">
              <div className="text-[10px] uppercase font-bold text-slate-400">Confirmed By European Factory:</div>
              <div className="font-bold text-slate-900">{supplierName}</div>
              <div className="text-[10px] text-slate-500">Commercial Export Director</div>
              <div className="h-10 border-b border-dashed border-slate-400 mt-2 flex items-end pb-1 text-[10px] font-mono text-slate-600">
                Production Release Seal
              </div>
            </div>

            {/* Broker FDX Signature */}
            <div className="space-y-1">
              <div className="text-[10px] uppercase font-bold text-slate-400">Issued & Cleared By Sourcing Desk:</div>
              <div className="font-bold text-slate-900">FoodXchange Trade Ltd</div>
              <div className="text-[10px] text-slate-500">Global Trade Intermediary Desk</div>
              <div className="h-10 border-b border-dashed border-slate-400 mt-2 flex items-end pb-1 text-[10px] font-mono text-emerald-800 font-bold">
                ✓ Verified Broker Escrow
              </div>
            </div>
          </div>

          {/* Bottom Micro Print Notice */}
          <div className="text-center pt-2 text-[10px] text-slate-400 border-t border-slate-100 print:pt-4">
            FoodXchange International Commercial PO Ref: {poNumber} · Generated via FoodXchange B2B Trade Engine · Page 1 of 1
          </div>
        </div>
      </div>
    </div>
  );
}
