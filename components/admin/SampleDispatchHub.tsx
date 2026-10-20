"use client";

import { useState, useTransition } from "react";
import {
  type SampleDispatchProtocol,
  updateSampleDispatchProtocol,
} from "@/app/admin/requests/actions";
import TradeDocumentSuiteButton from "@/components/admin/TradeDocumentSuiteButton";

export interface SampleSupplierOption {
  matchId: string;
  supplierId: string;
  companyName: string;
  productName: string;
  country: string | null;
  quote?: {
    unit_price?: number | null;
    currency?: string | null;
    net_weight?: string | null;
    packaging_format?: string | null;
    moq?: string | null;
    payment_terms?: string | null;
    incoterm?: string | null;
    kosher_type?: string | null;
  } | null;
}

interface Props {
  requestId: string;
  buyerCompany: string;
  productName: string;
  initialProtocol?: SampleDispatchProtocol | null;
  suppliers: SampleSupplierOption[];
  onAdvanceToQA?: () => void;
}

const DEFAULT_CONSIGNEE = (buyerCompany: string) => ({
  company: `${buyerCompany} (c/o FDX Sourcing Hub)`,
  contact_person: "Food Quality & Sourcing Dept.",
  phone: "+972-3-555-0199",
  email: "samples@fdx.trading",
  address_line1: "14 HaMelacha St., Industrial Logistics Park",
  address_city: "Rishon LeZion",
  address_country: "Israel",
  postal_code: "7565214",
});

const DEFAULT_BREAKAGE_MANDATE = `MANDATORY BREAKAGE & LEAKAGE PREVENTION PROTOCOL:
1. Double-walled corrugated export shipping carton (minimum 5-ply).
2. Individual shock-absorbent air bubble sleeves / honeycomb wrap for each bottle/container.
3. Rigid corrugated internal partition dividers separating all bottles/jars.
4. Watertight heavy-gauge sealed poly liner inside the carton to contain any potential transit leakage.
5. High-visibility 'FRAGILE - FOOD LIQUIDS / GLASS' warning labels on all 6 carton sides.`;

const DEFAULT_CUSTOMS_TEXT = (prodName: string) =>
  `NON-COMMERCIAL VALUE DECLARATION FOR CUSTOMS ONLY:
Food evaluation samples for laboratory testing and organoleptic sensory analysis only.
Total declared value: EUR 5.00 (Nominal value for customs clearance).
Goods have no commercial value and are not for resale or commercial distribution.
Product: ${prodName}.`;

export default function SampleDispatchHub({
  requestId,
  buyerCompany,
  productName,
  initialProtocol,
  suppliers,
  onAdvanceToQA,
}: Props) {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "alignment" | "instructions" | "tracking" | "sensory"
  >("alignment");
  const [copyNotice, setCopyNotice] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const selectedDefaultSupplier = suppliers[0];

  const [protocol, setProtocol] = useState<SampleDispatchProtocol>(
    initialProtocol || {
      status: "pre_alignment",
      selected_supplier: selectedDefaultSupplier
        ? {
            match_id: selectedDefaultSupplier.matchId,
            supplier_id: selectedDefaultSupplier.supplierId,
            company_name: selectedDefaultSupplier.companyName,
            product_name: selectedDefaultSupplier.productName,
          }
        : undefined,
      commercial_pre_alignment: {
        unit_price: selectedDefaultSupplier?.quote?.unit_price ?? 0.82,
        currency: selectedDefaultSupplier?.quote?.currency ?? "EUR",
        pack_weight: selectedDefaultSupplier?.quote?.net_weight ?? "1L",
        payment_terms: "30% Advance, 70% against B/L copy",
        moq: selectedDefaultSupplier?.quote?.moq ?? "1 x 40ft HQ FCL",
        kosher_type: selectedDefaultSupplier?.quote?.kosher_type ?? "Kosher (Chief Rabbinate)",
        organic: false,
        gluten_free: false,
        is_aligned: false,
      },
      courier_instructions: {
        courier_name: "DHL Express",
        courier_account_number: "DHL-964201884",
        bill_recipient: "buyer_account",
        declared_value_eur: 5.0,
        customs_declaration_text: DEFAULT_CUSTOMS_TEXT(productName),
        awb_description: `Food Evaluation Samples - ${productName} (Lab testing only, no commercial value)`,
        hs_code_suggestion: "1509.20.00 (Olive Oil) / 2002.90.00",
        consignee: DEFAULT_CONSIGNEE(buyerCompany),
        breakage_packaging_mandate: DEFAULT_BREAKAGE_MANDATE,
        issued_at: null,
      },
      shipment: {
        courier_name: "DHL Express",
        awb_tracking_number: "",
        awb_tracking_url: "",
        proforma_invoice_url: "",
        dispatched_date: null,
        estimated_arrival_date: null,
        delivered_date: null,
      },
      sensory_evaluation: {
        evaluator_name: `${buyerCompany} Quality Panel`,
        evaluated_at: null,
        taste_score: 4,
        texture_score: 4,
        aroma_score: 4,
        packaging_score: 5,
        overall_verdict: "pending",
        notes: "",
        approved_for_qa: false,
      },
    }
  );

  function handleSave(updatedProtocol?: SampleDispatchProtocol) {
    const toSave = updatedProtocol || protocol;
    setSaveError(null);
    setSaveSuccess(false);

    startTransition(async () => {
      const res = await updateSampleDispatchProtocol(requestId, toSave);
      if (!res.ok) {
        setSaveError(res.error);
        return;
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    });
  }

  function handleSupplierChange(matchId: string) {
    const s = suppliers.find((x) => x.matchId === matchId);
    if (!s) return;

    setProtocol((prev) => {
      const updated: SampleDispatchProtocol = {
        ...prev,
        selected_supplier: {
          match_id: s.matchId,
          supplier_id: s.supplierId,
          company_name: s.companyName,
          product_name: s.productName,
        },
        commercial_pre_alignment: {
          ...prev.commercial_pre_alignment,
          unit_price: s.quote?.unit_price ?? prev.commercial_pre_alignment.unit_price,
          currency: s.quote?.currency ?? prev.commercial_pre_alignment.currency,
          pack_weight: s.quote?.net_weight ?? prev.commercial_pre_alignment.pack_weight,
          moq: s.quote?.moq ?? prev.commercial_pre_alignment.moq,
          kosher_type: s.quote?.kosher_type ?? prev.commercial_pre_alignment.kosher_type,
        },
      };
      handleSave(updated);
      return updated;
    });
  }

  function generateFullInstructionsText(): string {
    const c = protocol.courier_instructions;
    const cons = c.consignee;
    const supp = protocol.selected_supplier;

    return `========================================================================
FOODXCHANGE (FDX) - OFFICIAL COURIER SAMPLE DISPATCH INSTRUCTIONS
Project Ref: [FDX-REQ-${requestId.slice(0, 8).toUpperCase()}]
Supplier: ${supp?.company_name || "Factory Partner"}
Product: ${productName}
========================================================================

Dear Export Team,

Please prepare and dispatch evaluation samples according to the following mandatory import & customs protocol:

1. COURIER CARRIER & BILLING:
------------------------------------------------------------------------
- Courier Service: ${c.courier_name}
- Account Number: ${c.courier_account_number || "Contact FDX for Account #"}
- Billing: ${
      c.bill_recipient === "buyer_account"
        ? "Bill to Receiver / Buyer Account"
        : c.bill_recipient === "factory_prepaid"
        ? "Prepaid by Factory (reimbursed on PO)"
        : "Bill to Broker Account"
    }

2. CONSIGNEE & DELIVERY ADDRESS:
------------------------------------------------------------------------
Company:        ${cons.company}
Attention:      ${cons.contact_person}
Address:        ${cons.address_line1}
City / Country: ${cons.address_city}, ${cons.address_country} (Postal: ${cons.postal_code})
Phone / Mobile: ${cons.phone}
Contact Email:  ${cons.email}

3. AIR WAYBILL (AWB) & PROFORMA INVOICE DECLARATION:
------------------------------------------------------------------------
- AWB Goods Description:
  "${c.awb_description}"
- Total Declared Customs Value:
  EUR ${c.declared_value_eur.toFixed(2)} (or equivalent USD)
- Customs Value Statement (Must appear on Proforma Invoice):
  "${c.customs_declaration_text}"
- Suggested HS Code:
  ${c.hs_code_suggestion || "Standard food sample HS code"}

4. CRITICAL BREAKAGE & PACKAGING MANDATE:
------------------------------------------------------------------------
${c.breakage_packaging_mandate}

5. DISPATCH CONFIRMATION:
------------------------------------------------------------------------
Once the courier picks up the package, please immediately send the Air Waybill (AWB) tracking number to samples@fdx.trading so we can track arrival with customs.

Thank you for your cooperation!
FDX Commercial Sourcing Team
========================================================================`;
  }

  function copyInstructionsToClipboard() {
    navigator.clipboard.writeText(generateFullInstructionsText());
    setCopyNotice(true);
    setTimeout(() => setCopyNotice(false), 3000);
  }

  function openEmailClient() {
    const subject = encodeURIComponent(
      `[FDX-REQ-${requestId.slice(0, 8).toUpperCase()}] Sample Dispatch Instructions & AWB Guidelines - ${productName}`
    );
    const body = encodeURIComponent(generateFullInstructionsText());
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
  }

  function getStatusBadge() {
    switch (protocol.status) {
      case "pre_alignment":
        return {
          label: "1. Pre-Commercial Alignment",
          cls: "bg-amber-50 text-amber-800 border-amber-200",
        };
      case "instructions_issued":
        return {
          label: "2. Courier Instructions Issued",
          cls: "bg-blue-50 text-blue-700 border-blue-200",
        };
      case "in_transit":
        return {
          label: "3. AWB In Transit",
          cls: "bg-indigo-50 text-indigo-700 border-indigo-200",
        };
      case "delivered":
        return {
          label: "4. Samples Arrived (Tasting Pending)",
          cls: "bg-purple-50 text-purple-700 border-purple-200",
        };
      case "tasting_passed":
        return {
          label: "5. Sample Approved & Ready for QA ✓",
          cls: "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold",
        };
      case "tasting_rejected":
        return {
          label: "Sample Rejected / Reformulation",
          cls: "bg-red-50 text-red-700 border-red-200",
        };
    }
  }

  const badge = getStatusBadge();

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-6 mb-6">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
              Stage 4
            </span>
            <span className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${badge.cls}`}>
              {badge.label}
            </span>
          </div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span>📦</span>
            <span>Sample Dispatch & Courier Protocol Hub</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Pre-sample commercial alignment, DHL/FedEx courier guidelines, customs declarations, and sensory evaluation scorecard.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={copyInstructionsToClipboard}
            className="text-xs font-semibold px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            title="Copy full export courier guidelines"
          >
            <span>📋</span>
            <span>{copyNotice ? "Copied!" : "Copy Instructions"}</span>
          </button>
          <button
            onClick={() => setIsOpen((v) => !v)}
            className="text-xs font-semibold px-3 py-1.5 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl transition cursor-pointer"
          >
            {isOpen ? "Collapse ▲" : "Manage Samples ▼"}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="mt-5 space-y-6">
          {/* Supplier Selector Bar */}
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700 uppercase">Target Factory:</span>
              <select
                className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={protocol.selected_supplier?.match_id || ""}
                onChange={(e) => handleSupplierChange(e.target.value)}
              >
                {suppliers.map((s) => (
                  <option key={s.matchId} value={s.matchId}>
                    {s.companyName} ({s.country || "EU"}) — {s.productName}
                    {s.quote?.unit_price ? ` [Quote: €${s.quote.unit_price}]` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-slate-500">Pipeline Stage:</span>
              <select
                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800"
                value={protocol.status}
                onChange={(e) => {
                  const newStatus = e.target.value as SampleDispatchProtocol["status"];
                  const updated = { ...protocol, status: newStatus };
                  setProtocol(updated);
                  handleSave(updated);
                }}
              >
                <option value="pre_alignment">1. Pre-Commercial Alignment</option>
                <option value="instructions_issued">2. Instructions Issued to Factory</option>
                <option value="in_transit">3. AWB In Transit</option>
                <option value="delivered">4. Arrived at Buyer Lab</option>
                <option value="tasting_passed">5. Sample Passed & Ready for QA ✓</option>
                <option value="tasting_rejected">Sample Rejected</option>
              </select>
            </div>
          </div>

          {/* Sub-tabs */}
          <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab("alignment")}
              className={`text-xs font-bold pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === "alignment"
                  ? "border-indigo-600 text-indigo-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>⚖️</span>
              <span>1. Commercial Pre-Check</span>
              {protocol.commercial_pre_alignment.is_aligned && (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full">
                  ✓
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("instructions")}
              className={`text-xs font-bold pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === "instructions"
                  ? "border-indigo-600 text-indigo-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>✈️</span>
              <span>2. Courier & AWB Generator</span>
              {protocol.courier_instructions.issued_at && (
                <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded-full">
                  Issued
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("tracking")}
              className={`text-xs font-bold pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === "tracking"
                  ? "border-indigo-600 text-indigo-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>📍</span>
              <span>3. AWB Live Tracking</span>
              {protocol.shipment.awb_tracking_number && (
                <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded-full font-mono">
                  {protocol.shipment.awb_tracking_number.slice(-4)}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("sensory")}
              className={`text-xs font-bold pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === "sensory"
                  ? "border-indigo-600 text-indigo-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>👅</span>
              <span>4. Sensory Tasting Scorecard</span>
              {protocol.sensory_evaluation.overall_verdict === "passed" && (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full font-bold">
                  Passed ✓
                </span>
              )}
            </button>
          </div>

          {/* TAB 1: COMMERCIAL PRE-ALIGNMENT */}
          {activeTab === "alignment" && (
            <div className="space-y-4 animate-in fade-in duration-150 text-xs">
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3.5 text-amber-950 flex items-start gap-2.5">
                <span className="text-base">💡</span>
                <div>
                  <h4 className="font-bold text-amber-900">Pre-Sample Golden Rule</h4>
                  <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                    Never dispatch international food courier samples until initial price, payment terms, and baseline requirements (Kosher, Organic, Gluten-free) are pre-agreed. Sending samples before commercial terms are aligned wastes courier fees and months of correspondence.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">
                    Pre-Agreed Target Price
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      className="w-full border border-slate-200 rounded-lg p-2.5 font-bold text-slate-900 bg-white"
                      value={protocol.commercial_pre_alignment.unit_price ?? ""}
                      onChange={(e) =>
                        setProtocol((p) => ({
                          ...p,
                          commercial_pre_alignment: {
                            ...p.commercial_pre_alignment,
                            unit_price: e.target.value === "" ? null : Number(e.target.value),
                          },
                        }))
                      }
                    />
                    <select
                      className="border border-slate-200 rounded-lg px-2 bg-white font-semibold"
                      value={protocol.commercial_pre_alignment.currency || "EUR"}
                      onChange={(e) =>
                        setProtocol((p) => ({
                          ...p,
                          commercial_pre_alignment: {
                            ...p.commercial_pre_alignment,
                            currency: e.target.value,
                          },
                        }))
                      }
                    >
                      <option value="EUR">EUR (€)</option>
                      <option value="USD">USD ($)</option>
                      <option value="ILS">ILS (₪)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">
                    Pack Size / Net Weight
                  </label>
                  <input
                    type="text"
                    className="w-full border border-slate-200 rounded-lg p-2.5 bg-white"
                    placeholder="e.g. 1L / 400g / 500ml"
                    value={protocol.commercial_pre_alignment.pack_weight ?? ""}
                    onChange={(e) =>
                      setProtocol((p) => ({
                        ...p,
                        commercial_pre_alignment: {
                          ...p.commercial_pre_alignment,
                          pack_weight: e.target.value,
                        },
                      }))
                    }
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">
                    Minimum Order Quantity (MOQ)
                  </label>
                  <input
                    type="text"
                    className="w-full border border-slate-200 rounded-lg p-2.5 bg-white"
                    placeholder="e.g. 1 x 40ft HQ FCL / 25,000 units"
                    value={protocol.commercial_pre_alignment.moq ?? ""}
                    onChange={(e) =>
                      setProtocol((p) => ({
                        ...p,
                        commercial_pre_alignment: {
                          ...p.commercial_pre_alignment,
                          moq: e.target.value,
                        },
                      }))
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">
                    Agreed Payment Terms
                  </label>
                  <input
                    type="text"
                    className="w-full border border-slate-200 rounded-lg p-2.5 bg-white"
                    placeholder="e.g. 30% advance, 70% against B/L copy"
                    value={protocol.commercial_pre_alignment.payment_terms ?? ""}
                    onChange={(e) =>
                      setProtocol((p) => ({
                        ...p,
                        commercial_pre_alignment: {
                          ...p.commercial_pre_alignment,
                          payment_terms: e.target.value,
                        },
                      }))
                    }
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">
                    Kosher Standard Feasibility
                  </label>
                  <input
                    type="text"
                    className="w-full border border-slate-200 rounded-lg p-2.5 bg-white"
                    placeholder="e.g. Kosher (Chief Rabbinate) / Badatz"
                    value={protocol.commercial_pre_alignment.kosher_type ?? ""}
                    onChange={(e) =>
                      setProtocol((p) => ({
                        ...p,
                        commercial_pre_alignment: {
                          ...p.commercial_pre_alignment,
                          kosher_type: e.target.value,
                        },
                      }))
                    }
                  />
                </div>
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    checked={protocol.commercial_pre_alignment.organic ?? false}
                    onChange={(e) =>
                      setProtocol((p) => ({
                        ...p,
                        commercial_pre_alignment: {
                          ...p.commercial_pre_alignment,
                          organic: e.target.checked,
                        },
                      }))
                    }
                  />
                  <span>Organic Certification Required</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    checked={protocol.commercial_pre_alignment.gluten_free ?? false}
                    onChange={(e) =>
                      setProtocol((p) => ({
                        ...p,
                        commercial_pre_alignment: {
                          ...p.commercial_pre_alignment,
                          gluten_free: e.target.checked,
                        },
                      }))
                    }
                  />
                  <span>Gluten-Free Standard</span>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <p className="text-[11px] text-slate-400">
                  {protocol.commercial_pre_alignment.is_aligned
                    ? `Aligned by ${protocol.commercial_pre_alignment.aligned_by || "Buyer"} on ${protocol.commercial_pre_alignment.aligned_at?.slice(0, 10)}`
                    : "Terms not marked as confirmed yet."}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const updated: SampleDispatchProtocol = {
                      ...protocol,
                      status: "instructions_issued",
                      commercial_pre_alignment: {
                        ...protocol.commercial_pre_alignment,
                        is_aligned: true,
                        aligned_at: new Date().toISOString(),
                        aligned_by: buyerCompany,
                      },
                    };
                    setProtocol(updated);
                    handleSave(updated);
                    setActiveTab("instructions");
                  }}
                  className="text-xs font-semibold px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span>✓ Confirm Alignment & Issue Courier Instructions →</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: COURIER & AWB INSTRUCTIONS */}
          {activeTab === "instructions" && (
            <div className="space-y-4 animate-in fade-in duration-150 text-xs">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-slate-600">
                  Export guidelines generated for <strong>{protocol.selected_supplier?.company_name}</strong> to avoid customs impoundment and bottle breakage.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={copyInstructionsToClipboard}
                    className="text-xs font-bold px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg transition border border-indigo-200 cursor-pointer flex items-center gap-1"
                  >
                    <span>📋</span>
                    <span>{copyNotice ? "Copied to Clipboard!" : "Copy Full Instructions"}</span>
                  </button>
                  <button
                    onClick={openEmailClient}
                    className="text-xs font-bold px-3 py-1.5 bg-slate-900 text-white hover:bg-slate-800 rounded-lg transition cursor-pointer flex items-center gap-1"
                  >
                    <span>✉️</span>
                    <span>Email to Factory</span>
                  </button>
                  <TradeDocumentSuiteButton
                    requestId={requestId}
                    productName={productName}
                    cleanedName={productName}
                    buyerCompany={buyerCompany}
                    defaultTab="customs"
                    label="📄 Export Customs Proforma PDF"
                    variant="primary"
                    sampleProtocol={protocol}
                    selectedSupplier={
                      protocol.selected_supplier
                        ? {
                            companyName: protocol.selected_supplier.company_name || "",
                            productName: protocol.selected_supplier.product_name || productName,
                            country: "European Union",
                          }
                        : null
                    }
                    certifications={[]}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">
                    Courier Carrier
                  </label>
                  <select
                    className="w-full border border-slate-200 rounded-lg p-2.5 bg-white font-semibold"
                    value={protocol.courier_instructions.courier_name}
                    onChange={(e) =>
                      setProtocol((p) => ({
                        ...p,
                        courier_instructions: {
                          ...p.courier_instructions,
                          courier_name: e.target.value as any,
                        },
                      }))
                    }
                  >
                    <option value="DHL Express">DHL Express</option>
                    <option value="FedEx">FedEx International Priority</option>
                    <option value="UPS">UPS Worldwide Saver</option>
                    <option value="TNT">TNT Express</option>
                    <option value="Aramex">Aramex</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">
                    Courier Account #
                  </label>
                  <input
                    type="text"
                    className="w-full border border-slate-200 rounded-lg p-2.5 bg-white font-mono"
                    placeholder="e.g. DHL-964201884"
                    value={protocol.courier_instructions.courier_account_number ?? ""}
                    onChange={(e) =>
                      setProtocol((p) => ({
                        ...p,
                        courier_instructions: {
                          ...p.courier_instructions,
                          courier_account_number: e.target.value,
                        },
                      }))
                    }
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">
                    Billing Responsibility
                  </label>
                  <select
                    className="w-full border border-slate-200 rounded-lg p-2.5 bg-white"
                    value={protocol.courier_instructions.bill_recipient}
                    onChange={(e) =>
                      setProtocol((p) => ({
                        ...p,
                        courier_instructions: {
                          ...p.courier_instructions,
                          bill_recipient: e.target.value as any,
                        },
                      }))
                    }
                  >
                    <option value="buyer_account">Receiver / Buyer Account (Bill Consignee)</option>
                    <option value="factory_prepaid">Factory Prepaid (Reimbursed on PO)</option>
                    <option value="broker_account">FDX Broker Facilitation Account</option>
                  </select>
                </div>
              </div>

              {/* Customs & Consignee Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2">
                  <h4 className="font-bold text-slate-800 uppercase text-[11px] flex items-center justify-between">
                    <span>Proforma Customs Value & HS Code</span>
                    <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Nominal €5.00
                    </span>
                  </h4>
                  <div>
                    <label className="block font-semibold text-slate-500 text-[10px] uppercase mb-0.5">
                      Air Waybill (AWB) Description
                    </label>
                    <input
                      className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white"
                      value={protocol.courier_instructions.awb_description}
                      onChange={(e) =>
                        setProtocol((p) => ({
                          ...p,
                          courier_instructions: {
                            ...p.courier_instructions,
                            awb_description: e.target.value,
                          },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 text-[10px] uppercase mb-0.5">
                      Mandatory Proforma Non-Commercial Disclaimer
                    </label>
                    <textarea
                      rows={3}
                      className="w-full text-[11px] font-mono border border-slate-200 rounded-lg p-2 bg-white leading-relaxed"
                      value={protocol.courier_instructions.customs_declaration_text}
                      onChange={(e) =>
                        setProtocol((p) => ({
                          ...p,
                          courier_instructions: {
                            ...p.courier_instructions,
                            customs_declaration_text: e.target.value,
                          },
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2">
                  <h4 className="font-bold text-slate-800 uppercase text-[11px]">
                    Delivery Consignee Details
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-500 text-[10px] uppercase">Company</label>
                      <input
                        className="w-full text-xs border border-slate-200 rounded p-1.5 bg-white"
                        value={protocol.courier_instructions.consignee.company}
                        onChange={(e) =>
                          setProtocol((p) => ({
                            ...p,
                            courier_instructions: {
                              ...p.courier_instructions,
                              consignee: {
                                ...p.courier_instructions.consignee,
                                company: e.target.value,
                              },
                            },
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 text-[10px] uppercase">Attention</label>
                      <input
                        className="w-full text-xs border border-slate-200 rounded p-1.5 bg-white"
                        value={protocol.courier_instructions.consignee.contact_person}
                        onChange={(e) =>
                          setProtocol((p) => ({
                            ...p,
                            courier_instructions: {
                              ...p.courier_instructions,
                              consignee: {
                                ...p.courier_instructions.consignee,
                                contact_person: e.target.value,
                              },
                            },
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-500 text-[10px] uppercase">Address</label>
                      <input
                        className="w-full text-xs border border-slate-200 rounded p-1.5 bg-white"
                        value={protocol.courier_instructions.consignee.address_line1}
                        onChange={(e) =>
                          setProtocol((p) => ({
                            ...p,
                            courier_instructions: {
                              ...p.courier_instructions,
                              consignee: {
                                ...p.courier_instructions.consignee,
                                address_line1: e.target.value,
                              },
                            },
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 text-[10px] uppercase">City, Country</label>
                      <input
                        className="w-full text-xs border border-slate-200 rounded p-1.5 bg-white"
                        value={`${protocol.courier_instructions.consignee.address_city}, ${protocol.courier_instructions.consignee.address_country}`}
                        onChange={(e) => {
                          const parts = e.target.value.split(",");
                          setProtocol((p) => ({
                            ...p,
                            courier_instructions: {
                              ...p.courier_instructions,
                              consignee: {
                                ...p.courier_instructions.consignee,
                                address_city: parts[0]?.trim() || "",
                                address_country: parts[1]?.trim() || "",
                              },
                            },
                          }));
                        }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-500 text-[10px] uppercase">Phone / SMS</label>
                      <input
                        className="w-full text-xs border border-slate-200 rounded p-1.5 bg-white font-mono"
                        value={protocol.courier_instructions.consignee.phone}
                        onChange={(e) =>
                          setProtocol((p) => ({
                            ...p,
                            courier_instructions: {
                              ...p.courier_instructions,
                              consignee: {
                                ...p.courier_instructions.consignee,
                                phone: e.target.value,
                              },
                            },
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 text-[10px] uppercase">Email</label>
                      <input
                        className="w-full text-xs border border-slate-200 rounded p-1.5 bg-white"
                        value={protocol.courier_instructions.consignee.email}
                        onChange={(e) =>
                          setProtocol((p) => ({
                            ...p,
                            courier_instructions: {
                              ...p.courier_instructions,
                              consignee: {
                                ...p.courier_instructions.consignee,
                                email: e.target.value,
                              },
                            },
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Breakage Prevention Mandate */}
              <div>
                <label className="block font-semibold text-slate-600 uppercase mb-1">
                  Liquid & Glass Breakage Prevention Mandate
                </label>
                <textarea
                  rows={4}
                  className="w-full text-xs font-mono border border-slate-200 rounded-lg p-2.5 bg-white leading-relaxed"
                  value={protocol.courier_instructions.breakage_packaging_mandate}
                  onChange={(e) =>
                    setProtocol((p) => ({
                      ...p,
                      courier_instructions: {
                        ...p.courier_instructions,
                        breakage_packaging_mandate: e.target.value,
                      },
                    }))
                  }
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleSave()}
                  className="text-xs font-semibold px-4 py-2 bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition cursor-pointer"
                >
                  Save Courier Parameters
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const updated: SampleDispatchProtocol = {
                      ...protocol,
                      status: "in_transit",
                      courier_instructions: {
                        ...protocol.courier_instructions,
                        issued_at: new Date().toISOString(),
                      },
                    };
                    setProtocol(updated);
                    handleSave(updated);
                    setActiveTab("tracking");
                  }}
                  className="text-xs font-semibold px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span>Mark Dispatched & Enter AWB # →</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: AWB LIVE TRACKING */}
          {activeTab === "tracking" && (
            <div className="space-y-4 animate-in fade-in duration-150 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">
                    Courier Carrier
                  </label>
                  <input
                    className="w-full border border-slate-200 rounded-lg p-2.5 bg-white font-semibold"
                    value={protocol.shipment.courier_name ?? "DHL Express"}
                    onChange={(e) =>
                      setProtocol((p) => ({
                        ...p,
                        shipment: { ...p.shipment, courier_name: e.target.value },
                      }))
                    }
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">
                    Air Waybill (AWB) Tracking Number
                  </label>
                  <input
                    className="w-full border border-slate-200 rounded-lg p-2.5 bg-white font-mono font-bold text-slate-900"
                    placeholder="e.g. 2498104812"
                    value={protocol.shipment.awb_tracking_number ?? ""}
                    onChange={(e) =>
                      setProtocol((p) => ({
                        ...p,
                        shipment: { ...p.shipment, awb_tracking_number: e.target.value },
                      }))
                    }
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">
                    Estimated Arrival Date
                  </label>
                  <input
                    type="date"
                    className="w-full border border-slate-200 rounded-lg p-2.5 bg-white"
                    value={protocol.shipment.estimated_arrival_date ?? ""}
                    onChange={(e) =>
                      setProtocol((p) => ({
                        ...p,
                        shipment: { ...p.shipment, estimated_arrival_date: e.target.value },
                      }))
                    }
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {protocol.shipment.awb_tracking_number && (
                  <a
                    href={
                      protocol.shipment.courier_name?.toLowerCase().includes("fedex")
                        ? `https://www.fedex.com/fedextrack/?trknbr=${protocol.shipment.awb_tracking_number}`
                        : protocol.shipment.courier_name?.toLowerCase().includes("ups")
                        ? `https://www.ups.com/track?tracknum=${protocol.shipment.awb_tracking_number}`
                        : `https://www.dhl.com/en/express/tracking.html?AWB=${protocol.shipment.awb_tracking_number}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold px-3.5 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition flex items-center gap-1.5"
                  >
                    <span>🔍 Open Live {protocol.shipment.courier_name || "DHL"} Tracking</span>
                    <span className="text-[10px]">↗</span>
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => {
                    const updated: SampleDispatchProtocol = {
                      ...protocol,
                      status: "delivered",
                      shipment: {
                        ...protocol.shipment,
                        delivered_date: new Date().toISOString().slice(0, 10),
                      },
                    };
                    setProtocol(updated);
                    handleSave(updated);
                    setActiveTab("sensory");
                  }}
                  className="text-xs font-semibold px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition flex items-center gap-1.5 cursor-pointer shadow-xs ml-auto"
                >
                  <span>✓ Mark Package Received (Proceed to Tasting)</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: SENSORY TASTING & EVALUATION SCORECARD */}
          {activeTab === "sensory" && (
            <div className="space-y-4 animate-in fade-in duration-150 text-xs">
              <div className="bg-purple-50/70 border border-purple-200/80 rounded-xl p-3.5 text-purple-950 flex items-start gap-2.5">
                <span className="text-base">👅</span>
                <div>
                  <h4 className="font-bold text-purple-900">
                    Buyer Tasting & Sensory Panel Evaluation
                  </h4>
                  <p className="text-[11px] text-purple-800 mt-0.5 leading-relaxed">
                    Evaluate the physical product against benchmark expectations: flavor balance, texture/viscosity, aroma, and packaging seal durability. Approving the sample signals readiness to invest in regulatory clearance and private label packaging design.
                  </p>
                </div>
              </div>

              {/* 4 Score Bars */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                  <span className="text-slate-500 font-bold uppercase text-[10px]">Flavor & Taste</span>
                  <div className="text-lg font-bold text-slate-800 my-1">
                    {"★".repeat(protocol.sensory_evaluation.taste_score)}
                    {"☆".repeat(5 - protocol.sensory_evaluation.taste_score)}
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    className="w-full accent-indigo-600"
                    value={protocol.sensory_evaluation.taste_score}
                    onChange={(e) =>
                      setProtocol((p) => ({
                        ...p,
                        sensory_evaluation: {
                          ...p.sensory_evaluation,
                          taste_score: Number(e.target.value),
                        },
                      }))
                    }
                  />
                  <span className="text-[10px] text-slate-400 font-medium">
                    {protocol.sensory_evaluation.taste_score}/5 Points
                  </span>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                  <span className="text-slate-500 font-bold uppercase text-[10px]">Texture & Viscosity</span>
                  <div className="text-lg font-bold text-slate-800 my-1">
                    {"★".repeat(protocol.sensory_evaluation.texture_score)}
                    {"☆".repeat(5 - protocol.sensory_evaluation.texture_score)}
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    className="w-full accent-indigo-600"
                    value={protocol.sensory_evaluation.texture_score}
                    onChange={(e) =>
                      setProtocol((p) => ({
                        ...p,
                        sensory_evaluation: {
                          ...p.sensory_evaluation,
                          texture_score: Number(e.target.value),
                        },
                      }))
                    }
                  />
                  <span className="text-[10px] text-slate-400 font-medium">
                    {protocol.sensory_evaluation.texture_score}/5 Points
                  </span>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                  <span className="text-slate-500 font-bold uppercase text-[10px]">Aroma & Smell</span>
                  <div className="text-lg font-bold text-slate-800 my-1">
                    {"★".repeat(protocol.sensory_evaluation.aroma_score)}
                    {"☆".repeat(5 - protocol.sensory_evaluation.aroma_score)}
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    className="w-full accent-indigo-600"
                    value={protocol.sensory_evaluation.aroma_score}
                    onChange={(e) =>
                      setProtocol((p) => ({
                        ...p,
                        sensory_evaluation: {
                          ...p.sensory_evaluation,
                          aroma_score: Number(e.target.value),
                        },
                      }))
                    }
                  />
                  <span className="text-[10px] text-slate-400 font-medium">
                    {protocol.sensory_evaluation.aroma_score}/5 Points
                  </span>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                  <span className="text-slate-500 font-bold uppercase text-[10px]">Packaging Durability</span>
                  <div className="text-lg font-bold text-slate-800 my-1">
                    {"★".repeat(protocol.sensory_evaluation.packaging_score)}
                    {"☆".repeat(5 - protocol.sensory_evaluation.packaging_score)}
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    className="w-full accent-indigo-600"
                    value={protocol.sensory_evaluation.packaging_score}
                    onChange={(e) =>
                      setProtocol((p) => ({
                        ...p,
                        sensory_evaluation: {
                          ...p.sensory_evaluation,
                          packaging_score: Number(e.target.value),
                        },
                      }))
                    }
                  />
                  <span className="text-[10px] text-slate-400 font-medium">
                    {protocol.sensory_evaluation.packaging_score}/5 Points
                  </span>
                </div>
              </div>

              {/* Panel Notes & Overall Verdict */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">
                    Sensory Panel & Lab Notes
                  </label>
                  <textarea
                    rows={3}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white leading-relaxed"
                    placeholder="Taste profile note: Clean olive fruitiness, slight peppery finish matches benchmark brand. Viscosity is optimal for retail pouring spout..."
                    value={protocol.sensory_evaluation.notes ?? ""}
                    onChange={(e) =>
                      setProtocol((p) => ({
                        ...p,
                        sensory_evaluation: {
                          ...p.sensory_evaluation,
                          notes: e.target.value,
                        },
                      }))
                    }
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">
                    Official Decision & Verdict
                  </label>
                  <select
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white font-bold"
                    value={protocol.sensory_evaluation.overall_verdict}
                    onChange={(e) => {
                      const verdict = e.target.value as any;
                      setProtocol((p) => ({
                        ...p,
                        sensory_evaluation: {
                          ...p.sensory_evaluation,
                          overall_verdict: verdict,
                          approved_for_qa: verdict === "passed",
                        },
                        status: verdict === "passed" ? "tasting_passed" : "tasting_rejected",
                      }));
                    }}
                  >
                    <option value="pending">In Evaluation / Tasting Pending</option>
                    <option value="passed">⭐ Approved - Qualifies for Market Entry & QA</option>
                    <option value="reformulation_needed">🔄 Reformulation / Second Sample Needed</option>
                    <option value="rejected">❌ Rejected - Does not match quality benchmark</option>
                  </select>

                  <div className="mt-3">
                    <label className="block font-semibold text-slate-600 uppercase mb-1">
                      Evaluator / Panel Sign-off
                    </label>
                    <input
                      type="text"
                      className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white"
                      value={protocol.sensory_evaluation.evaluator_name ?? ""}
                      onChange={(e) =>
                        setProtocol((p) => ({
                          ...p,
                          sensory_evaluation: {
                            ...p.sensory_evaluation,
                            evaluator_name: e.target.value,
                          },
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Action row */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  {saveSuccess && (
                    <span className="text-xs text-emerald-600 font-bold">
                      ✓ Protocol changes saved!
                    </span>
                  )}
                  {saveError && (
                    <span className="text-xs text-red-600 font-bold">
                      Error: {saveError}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSave()}
                    disabled={isPending}
                    className="text-xs font-semibold px-4 py-2 bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition cursor-pointer"
                  >
                    {isPending ? "Saving..." : "Save Scorecard"}
                  </button>

                  {protocol.sensory_evaluation.overall_verdict === "passed" && (
                    <button
                      type="button"
                      onClick={() => {
                        handleSave();
                        if (onAdvanceToQA) onAdvanceToQA();
                      }}
                      className="text-xs font-bold px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <span>🚀 Advance to Stage 5: QA & Kosher Gate →</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
