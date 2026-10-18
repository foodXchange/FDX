"use client";

import { useState } from "react";
import type { CatalogueProduct } from "@/app/admin/catalogue/actions";

export interface TearSheetData {
  product_name: string;
  brand_name?: string | null;
  tagline?: string | null;
  category?: string | null;
  subcategory?: string | null;
  format?: string | null;
  size?: string | null;
  country_of_origin?: string | null;
  supplier_name?: string | null;
  certifications?: string[] | null;
  private_label_available?: boolean | null;
  catalogue_image_url?: string | null;
  internal_notes?: string | null;
  shelf_life?: string | null;
  moq?: string | null;
  packaging_specs?: string | null;
  storage_temp?: string | null;
  buyer_company?: string | null;
}

interface ProductTearSheetModalProps {
  data: TearSheetData | CatalogueProduct | null;
  onClose: () => void;
}

export default function ProductTearSheetModal({
  data,
  onClose,
}: ProductTearSheetModalProps) {
  const [copied, setCopied] = useState(false);

  if (!data) return null;

  const productName = data.product_name;
  const brandName = data.brand_name || productName;
  const origin = data.country_of_origin || "International";
  const category = data.category || "FMCG Food & Beverage";
  const certs = data.certifications && data.certifications.length > 0
    ? data.certifications
    : ["ISO 22000 / HACCP", "Kosher Pareve Available on Request"];
  const privateLabel = Boolean(data.private_label_available);
  const imageUrl = data.catalogue_image_url;

  const textSummary = `[FDX SOURCING SPEC SHEET]
Product: ${brandName} - ${productName}
Category: ${category}${data.subcategory ? ` / ${data.subcategory}` : ""}
Origin: ${origin}
Format & Pack Size: ${data.format || data.size || "Standard retail pack"}
Certifications: ${certs.join(", ")}
Private Label: ${privateLabel ? "Available (OEM/ODM)" : "Brand Only"}
Target Retail: Supermarkets, Gourmet Chains, Foodservice
FDX Sourcing Desk: https://fdx.trading`;

  function handleCopy() {
    navigator.clipboard.writeText(textSummary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Action Bar (hidden on print) */}
        <div className="px-6 py-3.5 border-b border-gray-200 bg-gray-50 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-orange-100 text-orange-800">
              Buyer Tear Sheet
            </span>
            <span className="text-xs text-gray-500 font-medium">
              1-Page Israeli Retail Specification
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 transition-colors shadow-xs"
            >
              {copied ? "✓ Copied!" : "📋 Copy Summary"}
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors shadow-xs flex items-center gap-1.5"
            >
              <span>🖨️ Print / Save PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 flex items-center justify-center transition-colors ml-1"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Printable Tear Sheet Content */}
        <div className="p-8 overflow-y-auto space-y-6 text-gray-800 font-sans print:p-0 print:overflow-visible">
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-orange-500 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black text-gray-900 tracking-tight">FDX<span className="text-orange-500">.</span>TRADING</span>
                <span className="text-xs text-gray-400">|</span>
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-widest">
                  Verified Sourcing Specification
                </span>
              </div>
              <h1 className="text-2xl font-black text-gray-950 mt-2 tracking-tight">
                {brandName}
              </h1>
              {data.brand_name && data.brand_name !== productName && (
                <p className="text-sm font-semibold text-gray-600 mt-0.5">{productName}</p>
              )}
              {data.tagline && (
                <p className="text-xs text-orange-600 italic mt-1 font-medium">{data.tagline}</p>
              )}
            </div>

            <div className="text-right">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-gray-100 text-gray-700 border border-gray-200">
                Origin: {origin}
              </span>
              <p className="text-[11px] text-gray-400 mt-1">Ref: {new Date().toISOString().slice(0, 10)}</p>
            </div>
          </div>

          {/* Main Grid: Visual & Key Specs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {/* Image Box */}
            <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 flex flex-col items-center justify-center aspect-square md:aspect-auto md:h-64">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={productName}
                  className="max-h-full max-w-full object-contain rounded-lg"
                />
              ) : (
                <div className="text-center text-gray-400">
                  <span className="text-5xl block mb-2">📦</span>
                  <span className="text-xs font-medium">Standard Pack Spec</span>
                </div>
              )}
              {privateLabel && (
                <div className="mt-2 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    OEM / Private Label Available
                  </span>
                </div>
              )}
            </div>

            {/* Specifications Matrix */}
            <div className="md:col-span-2 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-gray-50 border border-gray-200/80 rounded-lg">
                  <span className="text-gray-500 block mb-0.5 font-medium">Category</span>
                  <span className="font-bold text-gray-900">{category}</span>
                  {data.subcategory && (
                    <span className="text-gray-500 block text-[11px]">{data.subcategory}</span>
                  )}
                </div>

                <div className="p-3 bg-gray-50 border border-gray-200/80 rounded-lg">
                  <span className="text-gray-500 block mb-0.5 font-medium">Format & Unit Size</span>
                  <span className="font-bold text-gray-900">
                    {data.format || data.size || "Standard retail specs upon request"}
                  </span>
                </div>

                <div className="p-3 bg-gray-50 border border-gray-200/80 rounded-lg">
                  <span className="text-gray-500 block mb-0.5 font-medium">Target Retail Chains</span>
                  <span className="font-bold text-gray-900">
                    Shufersal, Rami Levy, Victory, Yohananof, Tiv Taam
                  </span>
                </div>

                <div className="p-3 bg-gray-50 border border-gray-200/80 rounded-lg">
                  <span className="text-gray-500 block mb-0.5 font-medium">Private Label Support</span>
                  <span className="font-bold text-gray-900">
                    {privateLabel ? "Yes (Custom recipes & branding)" : "Branded Distribution Only"}
                  </span>
                </div>
              </div>

              {/* Certifications & Kosher Compliance */}
              <div className="p-3.5 bg-orange-50/50 border border-orange-200/80 rounded-lg space-y-1.5">
                <span className="text-xs font-bold text-orange-950 uppercase tracking-wider block">
                  Certifications & Kosher Compliance
                </span>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {certs.map((c, i) => (
                    <span
                      key={i}
                      className="text-xs font-medium px-2 py-0.5 bg-white border border-orange-200 rounded-md text-orange-900 shadow-2xs"
                    >
                      ✓ {c}
                    </span>
                  ))}
                </div>
              </div>

              {/* Commercial & Logistics Summary */}
              <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-lg text-xs space-y-2">
                <span className="text-xs font-bold text-gray-900 uppercase tracking-wider block">
                  Logistics & Sourcing Terms
                </span>
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div>
                    <span className="text-gray-500 block">Lead Time:</span>
                    <span className="font-semibold text-gray-800">3 - 5 Weeks</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Incoterms:</span>
                    <span className="font-semibold text-gray-800">FOB / CIF Ashdod / Haifa</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Samples:</span>
                    <span className="font-semibold text-gray-800">Available on demand</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Internal / Product Description Notes */}
          {data.internal_notes && (
            <div className="p-3.5 bg-blue-50/50 border border-blue-200/70 rounded-lg text-xs text-blue-950">
              <span className="font-bold block mb-1">Commercial Notes:</span>
              <p className="leading-relaxed">{data.internal_notes}</p>
            </div>
          )}

          {/* Footer for Buyer Sheet */}
          <div className="border-t border-gray-200 pt-4 flex items-center justify-between text-[11px] text-gray-500">
            <div>
              <p className="font-semibold text-gray-700">FoodXchange International B2B Food Trading Platform</p>
              <p>Direct Factory Connections • Strict Compliance & QA • Private Label Specialists</p>
            </div>
            <div className="text-right font-medium">
              <p className="text-orange-600 font-bold">sourcing@fdx.trading</p>
              <p>Tel Aviv • Milan • Madrid</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
