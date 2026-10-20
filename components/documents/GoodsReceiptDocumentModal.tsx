"use client";

import React from "react";

export interface GoodsReceiptDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  grnNumber: string;
  grnDate?: string;
  poNumber: string;
  poDate?: string;
  buyerCompany: string;
  buyerAddress?: string;
  receivingOfficer?: string;
  receivingDockBay?: string;
  truckLicensePlate?: string;
  supplierName: string;
  supplierCountry?: string;
  productName: string;
  orderVolume?: string;
  containerNumber?: string;
  billOfLading?: string;
  vesselName?: string;
  shippingLine?: string;
  customsDeclarationNumber?: string;
  warehousePalletCount?: number;
  tempLoggerReading?: string;
  sealNumber?: string;
  inspectionNotes?: string;
}

export default function GoodsReceiptDocumentModal({
  isOpen,
  onClose,
  grnNumber,
  grnDate,
  poNumber,
  poDate,
  buyerCompany,
  buyerAddress,
  receivingOfficer = "Avi Mizrahi (Logistics Receiving Manager)",
  receivingDockBay = "Bay 04 - Sorek Logistics Hub",
  truckLicensePlate = "IL-98-410-29",
  supplierName,
  supplierCountry = "European Certified Food Factory",
  productName,
  orderVolume = "24,000 Units (1 x 40ft HQ FCL)",
  containerNumber = "MSKU-9481029",
  billOfLading = "MSCUVAL881920",
  vesselName = "MSC LEANNE / Voyage 2604E",
  shippingLine = "MSC (Mediterranean Shipping Company)",
  customsDeclarationNumber = "IL-2604-881920",
  warehousePalletCount = 24,
  tempLoggerReading = "+18.2°C (Compliant - No temperature deviations)",
  sealNumber = "IL-98402 (Verified intact prior to discharge)",
  inspectionNotes = "Container received in pristine condition. All 24 Euro-pallets intact, stretch wrap undamaged. Hebrew private label verified compliant with Israeli Public Health regulations.",
}: GoodsReceiptDocumentModalProps) {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const currentDate = grnDate || new Date().toISOString().slice(0, 10);
  const currentTime = new Date().toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Modal Action Bar (Hidden in Print) */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between print:hidden shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xl">📋</span>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Goods Receipt Note (GRN) · Warehouse Acceptance Certificate</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  OFFICIAL RECEIPT
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">
                {grnNumber} · PO: {poNumber} · Container: {containerNumber}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="text-xs font-bold px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span>🖨️</span>
              <span>Print / Save as PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer text-sm"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-6 sm:p-10 overflow-y-auto text-slate-900 font-sans space-y-6 printable-receipt-doc">
          {/* Header & Letterhead */}
          <div className="border-b-2 border-slate-900 pb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black tracking-tight text-slate-900">
                  FOOD<span className="text-rose-600">X</span>CHANGE
                </span>
                <span className="text-[10px] uppercase font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-300">
                  B2B Trade Clearing Authority
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                International Food Sourcing & Settlement Desk · Tel Aviv – Valencia – Genoa
              </p>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                License #IL-FDX-7749102 · ISO 22000 & BRCGS Audited Cargo
              </p>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-xs uppercase font-mono font-bold tracking-wider text-rose-600 block">
                Official Document
              </span>
              <h1 className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
                GOODS RECEIPT NOTE (GRN)
              </h1>
              <div className="text-xs font-mono font-bold text-slate-700 mt-1">
                GRN Ref: <span className="text-slate-900">{grnNumber}</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Date: {currentDate} · Time: {currentTime} IST
              </div>
            </div>
          </div>

          {/* Parties & Order Coordinates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Receiving Importer & Logistics Destination
              </span>
              <div className="font-bold text-slate-900 text-sm">{buyerCompany}</div>
              <div className="text-slate-600 mt-0.5">
                {buyerAddress || `${buyerCompany} Central Logistics Hub, Sorek Industrial Park, Israel`}
              </div>
              <div className="text-slate-600 mt-1 flex items-center gap-3">
                <span>Receiving Bay: <strong>{receivingDockBay}</strong></span>
                <span>Officer: <strong>{receivingOfficer}</strong></span>
              </div>
            </div>

            <div className="border-t md:border-t-0 md:border-l border-slate-200 pt-3 md:pt-0 md:pl-6">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                European Producer & Commercial PO Reference
              </span>
              <div className="font-bold text-slate-900 text-sm">{supplierName}</div>
              <div className="text-slate-600 mt-0.5">Country of Origin: {supplierCountry}</div>
              <div className="text-slate-600 mt-1 flex items-center gap-3">
                <span>PO Number: <strong className="font-mono">{poNumber}</strong></span>
                <span>PO Date: <strong className="font-mono">{poDate || currentDate}</strong></span>
              </div>
            </div>
          </div>

          {/* Transport, Vessel & Customs Clearance Data */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl border border-slate-200 bg-white">
              <span className="text-[10px] font-semibold text-slate-500 uppercase block">Ocean B/L #</span>
              <span className="font-mono font-bold text-slate-900 mt-0.5 block truncate">{billOfLading}</span>
              <span className="text-[10px] text-slate-500">{shippingLine}</span>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 bg-white">
              <span className="text-[10px] font-semibold text-slate-500 uppercase block">Container #</span>
              <span className="font-mono font-bold text-emerald-700 mt-0.5 block truncate">{containerNumber}</span>
              <span className="text-[10px] text-slate-500">40ft High Cube Reefer (FCL)</span>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 bg-white">
              <span className="text-[10px] font-semibold text-slate-500 uppercase block">Carrier Vessel</span>
              <span className="font-semibold text-slate-900 mt-0.5 block truncate">{vesselName}</span>
              <span className="text-[10px] text-slate-500">Ashdod Port Pier 21</span>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 bg-white">
              <span className="text-[10px] font-semibold text-slate-500 uppercase block">Customs Entry (רשימון)</span>
              <span className="font-mono font-bold text-indigo-700 mt-0.5 block truncate">{customsDeclarationNumber}</span>
              <span className="text-[10px] text-emerald-600 font-semibold">Green Channel Cleared</span>
            </div>
          </div>

          {/* Cargo Tally & Pallet Count Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <div className="bg-slate-900 text-white px-4 py-2.5 text-xs font-bold flex items-center justify-between">
              <span>CARGO MANIFEST & WAREHOUSE DOCK TALLY</span>
              <span className="text-[11px] font-mono text-emerald-400">100% INVENTORY MATCH</span>
            </div>
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-600 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">Item Description</th>
                  <th className="p-3">Packaging Format</th>
                  <th className="p-3 text-right">Manifested Qty</th>
                  <th className="p-3 text-right">Received Qty</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                <tr>
                  <td className="p-3 font-mono font-bold">01</td>
                  <td className="p-3">
                    <span className="font-bold text-slate-900 block">{productName}</span>
                    <span className="text-[11px] text-slate-500">
                      Standard Euro-Palletized cargo · Barcoded retail outer cartons
                    </span>
                  </td>
                  <td className="p-3">
                    <span>{warehousePalletCount} Euro Pallets</span>
                    <span className="block text-[10px] text-slate-500">1,000 Units / Pallet</span>
                  </td>
                  <td className="p-3 text-right font-mono font-semibold">{orderVolume}</td>
                  <td className="p-3 text-right font-mono font-bold text-emerald-700">{orderVolume}</td>
                  <td className="p-3 text-center">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      ACCEPTED ✓
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Quality, Cold-Chain & Statutory Declarations */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
              Dock Quality & Statutory Regulatory Verification
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                <span className="text-[10px] font-semibold text-slate-500 uppercase block">High-Security Seal</span>
                <span className="font-mono font-bold text-slate-800 text-[11px] mt-0.5 block">{sealNumber}</span>
                <span className="text-[10px] text-emerald-600 font-semibold">Seal Verified Untampered</span>
              </div>

              <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                <span className="text-[10px] font-semibold text-slate-500 uppercase block">Temperature Logger</span>
                <span className="font-mono font-bold text-slate-800 text-[11px] mt-0.5 block">{tempLoggerReading}</span>
                <span className="text-[10px] text-emerald-600 font-semibold">Cold Chain Intact</span>
              </div>

              <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                <span className="text-[10px] font-semibold text-slate-500 uppercase block">Inland Hauler Vehicle</span>
                <span className="font-mono font-bold text-slate-800 text-[11px] mt-0.5 block">Plate: {truckLicensePlate}</span>
                <span className="text-[10px] text-slate-500">Ashdod Port → Warehouse Hub</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-600 leading-relaxed italic border-t border-slate-200 pt-2">
              &quot;{inspectionNotes}&quot;
            </p>
          </div>

          {/* Statutory Signatures & Stamping Desk */}
          <div className="border-t-2 border-slate-200 pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center text-xs">
              {/* 1. Warehouse Receiving Officer */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">
                  Warehouse Receiving Officer
                </span>
                <div className="h-14 flex items-center justify-center">
                  <span className="font-serif italic text-lg font-bold text-blue-900 border-b border-blue-900 px-4">
                    {receivingOfficer.split(" ")[0]} M.
                  </span>
                </div>
                <div className="font-bold text-slate-900">{receivingOfficer}</div>
                <div className="text-[10px] text-slate-500">Signatory for {buyerCompany}</div>
              </div>

              {/* 2. Inland Trucking Hauler Driver */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">
                  Inland Freight Hauler (Driver)
                </span>
                <div className="h-14 flex items-center justify-center">
                  <span className="font-serif italic text-lg font-bold text-slate-700 border-b border-slate-700 px-4">
                    Driver Sign-off
                  </span>
                </div>
                <div className="font-bold text-slate-900">Delivery Driver ({truckLicensePlate})</div>
                <div className="text-[10px] text-slate-500">Container Transport Release</div>
              </div>

              {/* 3. FoodXchange B2B Trade Authority Seal */}
              <div className="p-4 rounded-2xl border border-emerald-300 bg-emerald-50/40 space-y-2 relative">
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-800 block">
                  FoodXchange Clearing Authority
                </span>
                <div className="h-14 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full border-2 border-emerald-600 border-dashed flex items-center justify-center text-[10px] font-bold text-emerald-700 rotate-[-12deg] uppercase text-center leading-tight">
                    TRADE<br />SETTLED<br />2026
                  </div>
                </div>
                <div className="font-bold text-emerald-950 font-mono text-[11px]">
                  VERIFIED & SETTLED
                </div>
                <div className="text-[10px] text-emerald-700">Digital NCNDA 758 / Incoterms 2020</div>
              </div>
            </div>
          </div>

          {/* Legal Footer */}
          <div className="text-[10px] text-slate-400 text-center border-t border-slate-100 pt-3 font-mono">
            This Goods Receipt Note (GRN) confirms full physical handover and acceptance of goods into buyer ERP inventory under CIF Ashdod Port contract terms.
          </div>
        </div>
      </div>
    </div>
  );
}
