"use client";

import { useState, useTransition } from "react";
import TradeDocumentSuiteModal, { type DocTab } from "@/components/admin/TradeDocumentSuiteModal";
import {
  type CommercialOrderLifecycle,
  type OrderWorkflowStage,
  updateRequestOrderWorkflow,
  releaseFactoryProductionOrder,
} from "@/app/admin/requests/actions";

interface Props {
  requestId: string;
  buyerCompany: string;
  productName: string;
  initialWorkflow?: CommercialOrderLifecycle | null;
  matchedSuppliers: {
    id: string;
    company_name: string;
    product_name: string;
    country: string | null;
  }[];
}

export default function Stage7CommercialOrderHub({
  requestId,
  buyerCompany,
  productName,
  initialWorkflow,
  matchedSuppliers,
}: Props) {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "po" | "financial_clearance" | "manufacturing" | "shipping" | "customs_warehouse"
  >("po");
  const [docModalTab, setDocModalTab] = useState<DocTab | null>(null);
  const [isPending, startTransition] = useTransition();
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const selectedDefaultSupplier = matchedSuppliers[0];

  const [workflow, setWorkflow] = useState<CommercialOrderLifecycle>(
    initialWorkflow || {
      current_stage: "order_po_issued",
      selected_supplier_name: selectedDefaultSupplier?.company_name || "Sovena Group",
      selected_supplier_id: selectedDefaultSupplier?.id || null,
      agreed_product_name: productName,
      agreed_unit_price: "0.82",
      currency: "EUR",
      order_volume: "24,000 Units (1 x 40ft HQ FCL)",
      total_order_value: 19680.0,
      incoterms: "CIF Ashdod Port",
      payment_terms: "30% Advance Deposit on PO signing, 70% against B/L copy & PSI report",
      po_number: `PO-FDX-${requestId.slice(0, 6).toUpperCase()}-01`,
      po_date: new Date().toISOString().slice(0, 10),
      production_status: "in_production",
      production_milestones: {
        deposit_transferred: true,
        raw_materials_procured: true,
        bottling_completed: false,
        psi_inspection_passed: false,
        container_loaded: false,
      },
      shipping_line: "MSC (Mediterranean Shipping Company)",
      vessel_name: "MSC LEANNE",
      container_number: "MSKU-9481029",
      container_type: "40ft High Cube FCL",
      bill_of_lading: "MSCUVAL881920",
      bill_of_lading_url: "",
      port_of_origin: "Valencia Port, Spain",
      port_of_destination: "Ashdod Port, Israel",
      buyer_warehouse_address: `${buyerCompany} Central Logistics Hub, 14 HaMelacha St., Industrial Park, Rishon LeZion, Israel`,
      etd: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      eta_port: new Date(Date.now() + 21 * 86400000).toISOString().slice(0, 10),
      customs_status: "pending_documents",
      customs_declaration_number: `CUSTOMS-IL-${requestId.slice(0, 5).toUpperCase()}`,
      delivery_status: "at_port",
      arrived_at: null,
      warehouse_pallet_count: 26,
      goods_accepted_by: null,
      logistics_notes: "Container requires temperature monitoring loggers upon arrival. Direct inland trucking to central depot.",
    }
  );

  function handleSave(updatedWorkflow?: CommercialOrderLifecycle) {
    const toSave = updatedWorkflow || workflow;
    setSaveError(null);
    setSaveSuccess(false);

    startTransition(async () => {
      const res = await updateRequestOrderWorkflow({
        requestId,
        workflow: toSave,
      });

      if (!res.ok) {
        setSaveError(res.error);
        return;
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    });
  }

  function handleReleaseProduction() {
    setSaveError(null);
    setSaveSuccess(false);

    startTransition(async () => {
      const res = await releaseFactoryProductionOrder({
        requestId,
        matchId: workflow.selected_supplier_id || selectedDefaultSupplier?.id,
        notes: "Verified via Stage 7 1-Click Production Release Desk.",
      });

      if (!res.ok) {
        setSaveError(res.error);
        return;
      }

      setWorkflow((w) => ({
        ...w,
        current_stage: "manufacturing",
        production_status: "in_production",
        production_milestones: {
          ...(w.production_milestones || {}),
          deposit_transferred: true,
          raw_materials_procured: true,
        },
        financial_clearance: {
          ...(w.financial_clearance || {}),
          advance_milestone_30: {
            ...(w.financial_clearance?.advance_milestone_30 || {}),
            status: "released_to_factory",
            factory_wire_amount: res.factoryWireAmount,
            agent_retained_fee: res.agentMarginRetained,
          },
        },
      }));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    });
  }

  function getStatusBadge() {
    switch (workflow.delivery_status) {
      case "arrived_at_warehouse":
        return {
          label: "5. Landed in Destination Warehouse ✓",
          cls: "bg-emerald-100 text-emerald-900 border-emerald-400 font-bold",
        };
      case "inland_trucking":
        return {
          label: "4. Inland Trucking to Warehouse",
          cls: "bg-purple-50 text-purple-700 border-purple-200",
        };
      case "at_port":
        return workflow.customs_status === "customs_cleared"
          ? {
              label: "3. Customs Cleared at Port",
              cls: "bg-indigo-50 text-indigo-700 border-indigo-200",
            }
          : {
              label: "2. Ocean Container in Transit",
              cls: "bg-blue-50 text-blue-700 border-blue-200",
            };
      default:
        return {
          label: "1. Purchase Order Issued & Production",
          cls: "bg-amber-50 text-amber-800 border-amber-200",
        };
    }
  }

  const badge = getStatusBadge();

  // Unit calculations
  const unitPriceNum = Number(workflow.agreed_unit_price) || 0;
  const quantityNum = parseInt(workflow.order_volume?.replace(/\D/g, "") || "24000", 10) || 24000;
  const totalCalculated = workflow.total_order_value || unitPriceNum * quantityNum;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-6 mb-6">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
              Stage 7
            </span>
            <span className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${badge.cls}`}>
              {badge.label}
            </span>
          </div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span>🚢</span>
            <span>Commercial Purchase Order (PO) & Ocean Container Logistics Tracker</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Bilingual PO issuance, manufacturing milestone tracking, ocean vessel & container monitoring, port customs clearance, and warehouse dock acceptance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setDocModalTab("po")}
            className="text-xs font-bold px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition cursor-pointer shadow-xs flex items-center gap-1.5"
          >
            <span>📄</span>
            <span>Preview Official PO</span>
          </button>

          <button
            onClick={() => setIsOpen((v) => !v)}
            className="text-xs font-semibold px-3 py-1.5 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl transition cursor-pointer"
          >
            {isOpen ? "Collapse ▲" : "Manage Order ▼"}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="mt-5 space-y-6">
          {/* Sub-tabs */}
          <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab("po")}
              className={`text-xs font-bold pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === "po"
                  ? "border-rose-600 text-rose-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>📝</span>
              <span>1. Commercial Purchase Order</span>
              <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded-full font-mono">
                {workflow.po_number || "PO"}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("financial_clearance")}
              className={`text-xs font-bold pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === "financial_clearance"
                  ? "border-rose-600 text-rose-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>💳</span>
              <span>2. Financial Clearance & Split</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                workflow.financial_clearance?.advance_milestone_30?.status === "released_to_factory"
                  ? "bg-emerald-100 text-emerald-800"
                  : workflow.financial_clearance?.advance_milestone_30?.status === "cleared_in_escrow"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-amber-100 text-amber-800"
              }`}>
                {workflow.financial_clearance?.advance_milestone_30?.status === "released_to_factory"
                  ? "30% Released ✓"
                  : workflow.financial_clearance?.advance_milestone_30?.status === "cleared_in_escrow"
                  ? "Cleared In Escrow"
                  : "30% Pending"}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("manufacturing")}
              className={`text-xs font-bold pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === "manufacturing"
                  ? "border-rose-600 text-rose-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>🏭</span>
              <span>3. Manufacturing Milestones</span>
              <span className="text-[10px] bg-rose-50 text-rose-800 px-1.5 py-0.2 rounded-full font-bold">
                {Object.values(workflow.production_milestones || {}).filter(Boolean).length}/5
              </span>
            </button>

            <button
              onClick={() => setActiveTab("shipping")}
              className={`text-xs font-bold pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === "shipping"
                  ? "border-rose-600 text-rose-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>🚢</span>
              <span>4. Ocean Container & Vessel</span>
              {workflow.container_number && (
                <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded-full font-mono">
                  {workflow.container_number}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("customs_warehouse")}
              className={`text-xs font-bold pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === "customs_warehouse"
                  ? "border-rose-600 text-rose-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>🛃</span>
              <span>5. Customs & Warehouse Landing</span>
              {workflow.delivery_status === "arrived_at_warehouse" && (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full font-bold">
                  Landed ✓
                </span>
              )}
            </button>
          </div>

          {/* TAB 1: COMMERCIAL PURCHASE ORDER */}
          {activeTab === "po" && (
            <div className="space-y-4 animate-in fade-in duration-150 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">
                    Official PO Number
                  </label>
                  <input
                    type="text"
                    className="w-full border border-slate-200 rounded-lg p-2.5 bg-white font-mono font-bold text-slate-900"
                    value={workflow.po_number ?? ""}
                    onChange={(e) =>
                      setWorkflow((w) => ({ ...w, po_number: e.target.value }))
                    }
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">
                    PO Issue Date
                  </label>
                  <input
                    type="date"
                    className="w-full border border-slate-200 rounded-lg p-2.5 bg-white font-mono"
                    value={workflow.po_date ?? ""}
                    onChange={(e) => setWorkflow((w) => ({ ...w, po_date: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">
                    Selected Supplier Factory
                  </label>
                  <select
                    className="w-full border border-slate-200 rounded-lg p-2.5 bg-white font-semibold"
                    value={workflow.selected_supplier_name || ""}
                    onChange={(e) =>
                      setWorkflow((w) => ({ ...w, selected_supplier_name: e.target.value }))
                    }
                  >
                    {matchedSuppliers.map((s) => (
                      <option key={s.id} value={s.company_name}>
                        {s.company_name} ({s.country || "EU"})
                      </option>
                    ))}
                    {!matchedSuppliers.length && (
                      <option value="Primary Supplier Partner">Primary Supplier Partner</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">
                    Incoterms 2020
                  </label>
                  <select
                    className="w-full border border-slate-200 rounded-lg p-2.5 bg-white font-bold"
                    value={workflow.incoterms || "CIF Ashdod Port"}
                    onChange={(e) =>
                      setWorkflow((w) => ({ ...w, incoterms: e.target.value }))
                    }
                  >
                    <option value="CIF Ashdod Port">CIF Ashdod Port (Cost, Insurance & Freight)</option>
                    <option value="CIF Haifa Port">CIF Haifa Port</option>
                    <option value="FOB Valencia Port">FOB Valencia Port</option>
                    <option value="FOB Barcelona">FOB Barcelona</option>
                    <option value="FOB Genoa">FOB Genoa</option>
                    <option value="EXW Factory">EXW (Ex-Works Factory Floor)</option>
                  </select>
                </div>
              </div>

              {/* Commercial Pricing Matrix */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">
                    Agreed Unit Price
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      className="w-full border border-slate-200 rounded-lg p-2 bg-white font-bold text-slate-900"
                      value={workflow.agreed_unit_price ?? "0.82"}
                      onChange={(e) =>
                        setWorkflow((w) => ({
                          ...w,
                          agreed_unit_price: e.target.value,
                          total_order_value: Number(e.target.value) * quantityNum,
                        }))
                      }
                    />
                    <select
                      className="border border-slate-200 rounded-lg px-2 bg-white font-bold"
                      value={workflow.currency || "EUR"}
                      onChange={(e) =>
                        setWorkflow((w) => ({ ...w, currency: e.target.value }))
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
                    Order Quantity & Packaging
                  </label>
                  <input
                    type="text"
                    className="w-full border border-slate-200 rounded-lg p-2 bg-white font-semibold"
                    value={workflow.order_volume ?? "24,000 Units (1 x 40ft HQ FCL)"}
                    onChange={(e) =>
                      setWorkflow((w) => ({ ...w, order_volume: e.target.value }))
                    }
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">
                    Total Commercial PO Value
                  </label>
                  <div className="border border-emerald-300 bg-emerald-50 rounded-lg p-2 flex items-center justify-between">
                    <span className="text-emerald-950 font-bold text-sm">
                      {workflow.currency || "EUR"} {totalCalculated.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] text-emerald-800 font-semibold bg-emerald-100 px-2 py-0.5 rounded">
                      FCL Contract
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 uppercase mb-1">
                  Agreed Payment Schedule & Terms
                </label>
                <input
                  type="text"
                  className="w-full border border-slate-200 rounded-lg p-2.5 bg-white"
                  value={workflow.payment_terms ?? "30% Advance Deposit upon PO countersigning, 70% against Bill of Lading copy & PSI inspection report"}
                  onChange={(e) =>
                    setWorkflow((w) => ({ ...w, payment_terms: e.target.value }))
                  }
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleSave()}
                  className="text-xs font-semibold px-4 py-2 bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition cursor-pointer"
                >
                  Save Commercial PO Terms
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDocModalTab("po")}
                    className="text-xs font-bold px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>📄 View Formal PO Document</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleSave();
                      setActiveTab("financial_clearance");
                    }}
                    className="text-xs font-semibold px-4 py-2 bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <span>Proceed to Financial Clearance →</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          
          {/* TAB 2: FINANCIAL CLEARANCE & ESCROW DEPOSIT SPLIT */}
          {activeTab === "financial_clearance" && (() => {
            const fc = workflow.financial_clearance || {
              buyer_unit_price: Number(workflow.agreed_unit_price) || 0.87,
              factory_unit_price: 0.82,
              agent_margin_per_unit: 0.05,
              total_units: quantityNum,
              gross_buyer_contract_value: (Number(workflow.agreed_unit_price) || 0.87) * quantityNum,
              factory_contract_cost: 0.82 * quantityNum,
              total_agent_brokerage_pool: 0.05 * quantityNum,
              advance_milestone_30: {
                status: "pending_buyer_wire",
                buyer_wire_amount: ((Number(workflow.agreed_unit_price) || 0.87) * quantityNum) * 0.3,
                agent_commission_amount: (0.05 * quantityNum) * 0.3,
                factory_wire_amount: (0.82 * quantityNum) * 0.3,
                swift_mt103_reference: `SWIFT-IL-${requestId.slice(0, 6).toUpperCase()}-ADV`,
                uetr_reference: `e8f9b201-49b2-4d7a-${requestId.slice(0, 8)}`,
                remitter_bank: "Bank Leumi Le-Israel",
                beneficiary_bank: "CaixaBank Barcelona (IBAN: ES76 2100 0418 4502 0005 1294)",
                wire_date: new Date().toISOString().slice(0, 10),
                notes: "30% Advance deposit required to commence packaging foil printing and bottling run.",
              },
              balance_milestone_70: {
                status: "pending_buyer_wire",
                buyer_wire_amount: ((Number(workflow.agreed_unit_price) || 0.87) * quantityNum) * 0.7,
                agent_commission_amount: (0.05 * quantityNum) * 0.7,
                factory_wire_amount: (0.82 * quantityNum) * 0.7,
                swift_mt103_reference: `SWIFT-IL-${requestId.slice(0, 6).toUpperCase()}-BAL`,
                remitter_bank: "Bank Leumi Le-Israel",
                beneficiary_bank: "CaixaBank Barcelona",
                notes: "70% Balance payable upon presentation of Clean Ocean Bill of Lading (B/L) copy.",
              },
              ncnda_signed: true,
              ncnda_signed_at: new Date().toISOString(),
              escrow_split_verified: true,
            };

            const buyerTotal = fc.gross_buyer_contract_value || totalCalculated;
            const factoryTotal = fc.factory_contract_cost || (buyerTotal * 0.94);
            const agentPool = fc.total_agent_brokerage_pool || (buyerTotal - factoryTotal);

            const advBuyer = fc.advance_milestone_30?.buyer_wire_amount || buyerTotal * 0.3;
            const advAgent = fc.advance_milestone_30?.agent_commission_amount || agentPool * 0.3;
            const advFactory = fc.advance_milestone_30?.factory_wire_amount || factoryTotal * 0.3;

            const balBuyer = fc.balance_milestone_70?.buyer_wire_amount || buyerTotal * 0.7;
            const balAgent = fc.balance_milestone_70?.agent_commission_amount || agentPool * 0.7;
            const balFactory = fc.balance_milestone_70?.factory_wire_amount || factoryTotal * 0.7;

            return (
              <div className="space-y-4 animate-in fade-in duration-150 text-xs">
                {/* Status Callout Banner */}
                <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-xl p-4 shadow-sm border border-slate-800 flex items-center justify-between gap-4 flex-wrap">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-amber-400 uppercase tracking-wider">
                        Financial Clearance & Deposit Split
                      </span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold px-2 py-0.5 rounded-full">
                        ICC NCNDA 758 Protected
                      </span>
                    </div>
                    <p className="text-slate-300 text-xs">
                      Enforce strict milestone financial separation: Buyer funds the 30% advance $\rightarrow$ Agent secures spread $\rightarrow$ Factory receives net production advance.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDocModalTab("wire_advice")}
                      className="text-xs font-bold px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <span>📄</span>
                      <span>Bank Wire Advice (PDF)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDocModalTab("ncnda")}
                      className="text-xs font-bold px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>🛡️</span>
                      <span>ICC NCNDA 758 Agreement</span>
                    </button>
                  </div>
                </div>

                {/* 3-Column Financial Matrix Card */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Gross Buyer Contract */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      1. Buyer Commercial Contract
                    </div>
                    <div className="text-base font-black text-slate-900">
                      {workflow.currency || "EUR"} {buyerTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Price: <strong>{workflow.currency || "EUR"} {Number(fc.buyer_unit_price || 0.87).toFixed(2)}</strong> / unit · {quantityNum.toLocaleString()} units
                    </p>
                    <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-200">
                      Payer: {buyerCompany}
                    </div>
                  </div>

                  {/* Factory Contract Cost */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      2. Factory Production Cost
                    </div>
                    <div className="text-base font-black text-slate-900">
                      {workflow.currency || "EUR"} {factoryTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Baseline: <strong>{workflow.currency || "EUR"} {Number(fc.factory_unit_price || 0.82).toFixed(2)}</strong> / unit · EXW/CIF
                    </p>
                    <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-200">
                      Beneficiary: {workflow.selected_supplier_name || "Factory"}
                    </div>
                  </div>

                  {/* Agent Net Brokerage Spread Pool */}
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                      3. Agent Net Brokerage Pool
                    </div>
                    <div className="text-base font-black text-emerald-950">
                      +{workflow.currency || "EUR"} {agentPool.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <p className="text-[11px] text-emerald-800 font-semibold">
                      Agency Spread: <strong>+{workflow.currency || "EUR"} {Number(fc.agent_margin_per_unit || 0.05).toFixed(2)} / unit</strong> (+6.1%)
                    </p>
                    <div className="text-[10px] text-emerald-700 pt-1 border-t border-emerald-200 font-medium">
                      ✓ Protected under Irrevocable Fee Agreement
                    </div>
                  </div>
                </div>

                {/* 🚀 1-Click Production Release Callout */}
                {fc.advance_milestone_30?.status === "wire_submitted_by_buyer" && (
                  <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-emerald-500/10 border-2 border-orange-400 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-in fade-in">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                        <span className="text-xs font-black uppercase text-orange-950 tracking-wider">
                          Action Required: Buyer 30% Wire Submitted (€{advBuyer.toLocaleString()})
                        </span>
                      </div>
                      <p className="text-xs text-slate-700">
                        Buyer uploaded SWIFT ref: <strong className="font-mono text-slate-900">{fc.advance_milestone_30?.swift_mt103_reference || "Attached Slip"}</strong> · Remitter Bank: <strong>{fc.advance_milestone_30?.remitter_bank || buyerCompany}</strong>.
                      </p>
                      <p className="text-[11px] text-slate-600">
                        Click below to verify wire, lock broker margin (+€{advAgent.toLocaleString()}), and authorize European factory production.
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={isPending}
                      onClick={handleReleaseProduction}
                      className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-md flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
                    >
                      <span>🚀</span>
                      <span>{isPending ? "Processing..." : "Verify Wire & 1-Click Release Factory"}</span>
                    </button>
                  </div>
                )}

                {fc.advance_milestone_30?.status === "released_to_factory" && (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">✓</span>
                      <div>
                        <span className="font-bold text-emerald-950">Factory Production Authorized & Active</span>
                        <div className="text-[11px] text-emerald-800">
                          Factory wire (€{advFactory.toLocaleString()}) remitted · Retained agent margin: +€{advAgent.toLocaleString()} · PO: {workflow.po_number || "Active"}.
                        </div>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-lg border border-emerald-200 text-[10px]">
                      Stage: In Production
                    </span>
                  </div>
                )}

                {/* Milestone 1: 30% Advance Deposit Box */}
                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2.5 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-xs">
                        1
                      </span>
                      <h4 className="font-bold text-slate-900 text-xs">
                        Milestone 1: 30% Production Advance Deposit (Production Trigger)
                      </h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase">Wire Status:</label>
                      <select
                        value={fc.advance_milestone_30?.status || "pending_buyer_wire"}
                        onChange={(e) => {
                          const newStatus = e.target.value as any;
                          setWorkflow((w) => ({
                            ...w,
                            financial_clearance: {
                              ...fc,
                              advance_milestone_30: {
                                ...(fc.advance_milestone_30 || {}),
                                status: newStatus,
                              },
                            },
                          }));
                        }}
                        className="text-xs font-bold border border-slate-200 rounded-lg px-2.5 py-1 bg-white text-slate-800"
                      >
                        <option value="pending_buyer_wire">⏳ Pending Buyer Wire</option>
                        <option value="wire_submitted_by_buyer">📤 Wire Sent by Buyer (Slip Attached)</option>
                        <option value="cleared_in_escrow">🏦 Funds Cleared in Settlement Account</option>
                        <option value="released_to_factory">🚀 30% Production Advance Released to Factory</option>
                      </select>
                    </div>
                  </div>

                  {/* 3-Step Advance Money Split Flow */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-center">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Buyer Inflow (30%)</p>
                      <p className="text-sm font-black text-slate-900 mt-0.5">
                        {workflow.currency || "EUR"} {advBuyer.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-[10px] text-slate-500">From: {buyerCompany}</p>
                    </div>

                    <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 text-center">
                      <p className="text-[10px] uppercase font-bold text-emerald-700">Agent Retention (30%)</p>
                      <p className="text-sm font-black text-emerald-950 mt-0.5">
                        +{workflow.currency || "EUR"} {advAgent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-[10px] text-emerald-800">Advance Broker Fee</p>
                    </div>

                    <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-center">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Net Factory Wire (30%)</p>
                      <p className="text-sm font-black text-slate-900 mt-0.5">
                        {workflow.currency || "EUR"} {advFactory.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-[10px] text-slate-500">To: {workflow.selected_supplier_name || "Factory"}</p>
                    </div>
                  </div>

                  {/* Wire Banking Details Form */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs pt-1">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        SWIFT MT103 / UETR Ref
                      </label>
                      <input
                        type="text"
                        value={fc.advance_milestone_30?.swift_mt103_reference || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setWorkflow((w) => ({
                            ...w,
                            financial_clearance: {
                              ...fc,
                              advance_milestone_30: {
                                ...(fc.advance_milestone_30 || {}),
                                swift_mt103_reference: val,
                              },
                            },
                          }));
                        }}
                        placeholder="SWIFT-IL-9481920"
                        className="w-full border border-slate-200 rounded-lg p-2 font-mono font-bold text-slate-900 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        Remitter Bank (Buyer)
                      </label>
                      <input
                        type="text"
                        value={fc.advance_milestone_30?.remitter_bank || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setWorkflow((w) => ({
                            ...w,
                            financial_clearance: {
                              ...fc,
                              advance_milestone_30: {
                                ...(fc.advance_milestone_30 || {}),
                                remitter_bank: val,
                              },
                            },
                          }));
                        }}
                        placeholder="Bank Leumi Le-Israel"
                        className="w-full border border-slate-200 rounded-lg p-2 text-slate-800 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        Beneficiary IBAN / Bank
                      </label>
                      <input
                        type="text"
                        value={fc.advance_milestone_30?.beneficiary_bank || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setWorkflow((w) => ({
                            ...w,
                            financial_clearance: {
                              ...fc,
                              advance_milestone_30: {
                                ...(fc.advance_milestone_30 || {}),
                                beneficiary_bank: val,
                              },
                            },
                          }));
                        }}
                        placeholder="CaixaBank ES76 2100..."
                        className="w-full border border-slate-200 rounded-lg p-2 font-mono text-slate-800 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        Wire Transfer Date
                      </label>
                      <input
                        type="date"
                        value={fc.advance_milestone_30?.wire_date || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setWorkflow((w) => ({
                            ...w,
                            financial_clearance: {
                              ...fc,
                              advance_milestone_30: {
                                ...(fc.advance_milestone_30 || {}),
                                wire_date: val,
                              },
                            },
                          }));
                        }}
                        className="w-full border border-slate-200 rounded-lg p-2 font-mono text-slate-800 bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Milestone 2: 70% Final Balance Box */}
                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2.5 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs">
                        2
                      </span>
                      <h4 className="font-bold text-slate-900 text-xs">
                        Milestone 2: 70% Final Balance (Released against Clean Ocean B/L Copy & PSI)
                      </h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase">Balance Status:</label>
                      <select
                        value={fc.balance_milestone_70?.status || "pending_buyer_wire"}
                        onChange={(e) => {
                          const newStatus = e.target.value as any;
                          setWorkflow((w) => ({
                            ...w,
                            financial_clearance: {
                              ...fc,
                              balance_milestone_70: {
                                ...(fc.balance_milestone_70 || {}),
                                status: newStatus,
                              },
                            },
                          }));
                        }}
                        className="text-xs font-bold border border-slate-200 rounded-lg px-2.5 py-1 bg-white text-slate-800"
                      >
                        <option value="pending_buyer_wire">⏳ Pending B/L Presentation & Buyer Wire</option>
                        <option value="wire_submitted_by_buyer">📤 Buyer Wire Submitted</option>
                        <option value="cleared_in_escrow">🏦 Cleared in Escrow Account</option>
                        <option value="released_to_factory">🎉 Full Deal Fully Settled (70% Released)</option>
                      </select>
                    </div>
                  </div>

                  {/* 3-Step Balance Money Split Flow */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-center">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Buyer Inflow (70%)</p>
                      <p className="text-sm font-black text-slate-900 mt-0.5">
                        {workflow.currency || "EUR"} {balBuyer.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-[10px] text-slate-500">Upon B/L Endorsement</p>
                    </div>

                    <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 text-center">
                      <p className="text-[10px] uppercase font-bold text-emerald-700">Agent Final Fee (70%)</p>
                      <p className="text-sm font-black text-emerald-950 mt-0.5">
                        +{workflow.currency || "EUR"} {balAgent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-[10px] text-emerald-800">Final Broker Commission</p>
                    </div>

                    <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-center">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Net Factory Balance (70%)</p>
                      <p className="text-sm font-black text-slate-900 mt-0.5">
                        {workflow.currency || "EUR"} {balFactory.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-[10px] text-slate-500">To: {workflow.selected_supplier_name || "Factory"}</p>
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handleSave()}
                    className="text-xs font-semibold px-4 py-2 bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition cursor-pointer"
                  >
                    Save Financial Clearance Settings
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleSave();
                      setActiveTab("manufacturing");
                    }}
                    className="text-xs font-semibold px-4 py-2 bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <span>Proceed to Manufacturing Milestones →</span>
                  </button>
                </div>
              </div>
            );
          })()}

          {/* TAB 2: MANUFACTURING MILESTONES */}
          {activeTab === "manufacturing" && (
            <div className="space-y-4 animate-in fade-in duration-150 text-xs">
              <div className="bg-rose-50/70 border border-rose-200/80 rounded-xl p-3.5 text-rose-950 flex items-start gap-2.5">
                <span className="text-base">🏭</span>
                <div>
                  <h4 className="font-bold text-rose-900">
                    Factory Manufacturing & Production Run Milestones
                  </h4>
                  <p className="text-[11px] text-rose-800 mt-0.5 leading-relaxed">
                    Track factory progress in real-time from wire deposit receipt to bottling, pre-shipment quality inspection (PSI), and thermal container stuffing.
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                {/* Milestone 1 */}
                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer"
                      checked={workflow.production_milestones?.deposit_transferred ?? true}
                      onChange={(e) =>
                        setWorkflow((w) => ({
                          ...w,
                          production_milestones: {
                            ...w.production_milestones,
                            deposit_transferred: e.target.checked,
                          },
                        }))
                      }
                    />
                    <div>
                      <p className="font-bold text-slate-900">1. Advance Deposit (30%) Wire Transferred</p>
                      <p className="text-[11px] text-slate-500">
                        SWIFT confirmation issued. Factory initiated scheduling on commercial bottling lines.
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Completed ✓
                  </span>
                </div>

                {/* Milestone 2 */}
                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer"
                      checked={workflow.production_milestones?.raw_materials_procured ?? true}
                      onChange={(e) =>
                        setWorkflow((w) => ({
                          ...w,
                          production_milestones: {
                            ...w.production_milestones,
                            raw_materials_procured: e.target.checked,
                          },
                        }))
                      }
                    />
                    <div>
                      <p className="font-bold text-slate-900">2. Raw Ingredients & Packaging Foil / Bottles Procured</p>
                      <p className="text-[11px] text-slate-500">
                        Approved private label foil wrappers printed with Hebrew nutritional table and EAN-13 barcode.
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Completed ✓
                  </span>
                </div>

                {/* Milestone 3 */}
                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer"
                      checked={workflow.production_milestones?.bottling_completed ?? false}
                      onChange={(e) =>
                        setWorkflow((w) => ({
                          ...w,
                          production_milestones: {
                            ...w.production_milestones,
                            bottling_completed: e.target.checked,
                          },
                        }))
                      }
                    />
                    <div>
                      <p className="font-bold text-slate-900">3. Commercial Bottling / Packaging Run in Progress</p>
                      <p className="text-[11px] text-slate-500">
                        High-speed line running at 4,000 units/hour. Inkjet lot and expiration date codes applied.
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    Active Run
                  </span>
                </div>

                {/* Milestone 4 */}
                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer"
                      checked={workflow.production_milestones?.psi_inspection_passed ?? false}
                      onChange={(e) =>
                        setWorkflow((w) => ({
                          ...w,
                          production_milestones: {
                            ...w.production_milestones,
                            psi_inspection_passed: e.target.checked,
                          },
                        }))
                      }
                    />
                    <div>
                      <p className="font-bold text-slate-900">4. Pre-Shipment Quality Inspection (PSI) Passed</p>
                      <p className="text-[11px] text-slate-500">
                        Certificate of Analysis (COA) issued. Acidity, peroxide value, and microbiological checks approved.
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    Scheduled
                  </span>
                </div>

                {/* Milestone 5 */}
                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer"
                      checked={workflow.production_milestones?.container_loaded ?? false}
                      onChange={(e) =>
                        setWorkflow((w) => ({
                          ...w,
                          production_milestones: {
                            ...w.production_milestones,
                            container_loaded: e.target.checked,
                          },
                        }))
                      }
                    />
                    <div>
                      <p className="font-bold text-slate-900">5. Palletization & Thermal Container Loading</p>
                      <p className="text-[11px] text-slate-500">
                        EUR-1 wooden pallets stretch-wrapped with corner boards and locked into ocean container.
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    Pending
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleSave()}
                  className="text-xs font-semibold px-4 py-2 bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition cursor-pointer"
                >
                  Save Milestones
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleSave();
                    setActiveTab("shipping");
                  }}
                  className="text-xs font-semibold px-4 py-2 bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span>Proceed to Ocean Freight & Container Tracking →</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: OCEAN CONTAINER & VESSEL */}
          {activeTab === "shipping" && (
            <div className="space-y-4 animate-in fade-in duration-150 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">
                    Shipping Line / Carrier
                  </label>
                  <select
                    className="w-full border border-slate-200 rounded-lg p-2.5 bg-white font-semibold"
                    value={workflow.shipping_line || "MSC"}
                    onChange={(e) =>
                      setWorkflow((w) => ({ ...w, shipping_line: e.target.value }))
                    }
                  >
                    <option value="MSC (Mediterranean Shipping Company)">MSC (Mediterranean Shipping Company)</option>
                    <option value="ZIM Integrated Shipping">ZIM Integrated Shipping</option>
                    <option value="Maersk Line">Maersk Line</option>
                    <option value="Hapag-Lloyd">Hapag-Lloyd</option>
                    <option value="CMA CGM">CMA CGM</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">
                    Container Number (4 letters + 7 digits)
                  </label>
                  <input
                    type="text"
                    className="w-full border border-slate-200 rounded-lg p-2.5 bg-white font-mono font-bold text-slate-900"
                    placeholder="e.g. MSKU-9481029"
                    value={workflow.container_number ?? ""}
                    onChange={(e) =>
                      setWorkflow((w) => ({ ...w, container_number: e.target.value }))
                    }
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">
                    Container Format
                  </label>
                  <select
                    className="w-full border border-slate-200 rounded-lg p-2.5 bg-white font-medium"
                    value={workflow.container_type || "40ft High Cube FCL"}
                    onChange={(e) =>
                      setWorkflow((w) => ({ ...w, container_type: e.target.value }))
                    }
                  >
                    <option value="40ft High Cube FCL">40ft High Cube (HQ) FCL (24-26 Pallets)</option>
                    <option value="20ft Standard FCL">20ft Standard FCL (10-11 Pallets)</option>
                    <option value="40ft Reefer Temperature Controlled">40ft Reefer (Temp Controlled 15°C–18°C)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">
                    Ocean Vessel & Voyage
                  </label>
                  <input
                    type="text"
                    className="w-full border border-slate-200 rounded-lg p-2.5 bg-white font-semibold"
                    placeholder="e.g. MSC LEANNE / Voyage 2604E"
                    value={workflow.vessel_name ?? ""}
                    onChange={(e) =>
                      setWorkflow((w) => ({ ...w, vessel_name: e.target.value }))
                    }
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">
                    Bill of Lading (B/L) #
                  </label>
                  <input
                    type="text"
                    className="w-full border border-slate-200 rounded-lg p-2.5 bg-white font-mono font-bold"
                    placeholder="e.g. MSCUVAL881920"
                    value={workflow.bill_of_lading ?? ""}
                    onChange={(e) =>
                      setWorkflow((w) => ({ ...w, bill_of_lading: e.target.value }))
                    }
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">
                    Bill of Lading Document PDF URL
                  </label>
                  <input
                    type="text"
                    className="w-full border border-slate-200 rounded-lg p-2.5 bg-white"
                    placeholder="https://.../ocean_bill_of_lading.pdf"
                    value={workflow.bill_of_lading_url ?? ""}
                    onChange={(e) =>
                      setWorkflow((w) => ({ ...w, bill_of_lading_url: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">
                    Port of Origin
                  </label>
                  <input
                    type="text"
                    className="w-full border border-slate-200 rounded-lg p-2 bg-white font-medium"
                    value={workflow.port_of_origin ?? "Valencia Port, Spain"}
                    onChange={(e) =>
                      setWorkflow((w) => ({ ...w, port_of_origin: e.target.value }))
                    }
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">
                    Port of Destination
                  </label>
                  <input
                    type="text"
                    className="w-full border border-slate-200 rounded-lg p-2 bg-white font-medium"
                    value={workflow.port_of_destination ?? "Ashdod Port, Israel"}
                    onChange={(e) =>
                      setWorkflow((w) => ({ ...w, port_of_destination: e.target.value }))
                    }
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">
                    Departure Date (ETD)
                  </label>
                  <input
                    type="date"
                    className="w-full border border-slate-200 rounded-lg p-2 bg-white font-mono"
                    value={workflow.etd ?? ""}
                    onChange={(e) => setWorkflow((w) => ({ ...w, etd: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">
                    Arrival Date (ETA)
                  </label>
                  <input
                    type="date"
                    className="w-full border border-slate-200 rounded-lg p-2 bg-white font-mono font-bold text-indigo-700"
                    value={workflow.eta_port ?? ""}
                    onChange={(e) =>
                      setWorkflow((w) => ({ ...w, eta_port: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleSave()}
                  className="text-xs font-semibold px-4 py-2 bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition cursor-pointer"
                >
                  Save Ocean Freight Details
                </button>
                <div className="flex items-center gap-2">
                  {workflow.container_number && (
                    <a
                      href={`https://www.track-trace.com/container?number=${workflow.container_number}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold px-3.5 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-xl transition flex items-center gap-1.5"
                    >
                      <span>🔍 Live Container Tracking</span>
                      <span className="text-[10px]">↗</span>
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      handleSave();
                      setActiveTab("customs_warehouse");
                    }}
                    className="text-xs font-semibold px-4 py-2 bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <span>Proceed to Port Customs & Warehouse Dock Landing →</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CUSTOMS CLEARANCE & WAREHOUSE DOCK ACCEPTANCE */}
          {activeTab === "customs_warehouse" && (
            <div className="space-y-4 animate-in fade-in duration-150 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">
                    Customs Broker File / Declaration #
                  </label>
                  <input
                    type="text"
                    className="w-full border border-slate-200 rounded-lg p-2.5 bg-white font-mono font-bold text-slate-900"
                    value={workflow.customs_declaration_number ?? ""}
                    onChange={(e) =>
                      setWorkflow((w) => ({
                        ...w,
                        customs_declaration_number: e.target.value,
                      }))
                    }
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">
                    Port Customs Release Status
                  </label>
                  <select
                    className="w-full border border-slate-200 rounded-lg p-2.5 bg-white font-bold text-emerald-800"
                    value={workflow.customs_status || "pending_documents"}
                    onChange={(e) =>
                      setWorkflow((w) => ({
                        ...w,
                        customs_status: e.target.value as any,
                      }))
                    }
                  >
                    <option value="pending_documents">Pending B/L & Invoice Documents</option>
                    <option value="customs_broker_clearing">Customs Broker Processing</option>
                    <option value="inspection_hold">Health Ministry Port Inspection Hold</option>
                    <option value="customs_cleared">Customs Cleared & Port Gate Pass Issued ✓</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">
                    Delivery Status to Warehouse
                  </label>
                  <select
                    className="w-full border border-slate-200 rounded-lg p-2.5 bg-white font-bold"
                    value={workflow.delivery_status || "at_port"}
                    onChange={(e) =>
                      setWorkflow((w) => ({
                        ...w,
                        delivery_status: e.target.value as any,
                      }))
                    }
                  >
                    <option value="at_port">Discharged at Port Terminal</option>
                    <option value="inland_trucking">Inland Container Truck in Transit</option>
                    <option value="arrived_at_warehouse">Landed at Buyer Warehouse Dock ✓</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 uppercase mb-1">
                  Buyer Central Warehouse Address
                </label>
                <input
                  type="text"
                  className="w-full border border-slate-200 rounded-lg p-2.5 bg-white"
                  value={workflow.buyer_warehouse_address ?? ""}
                  onChange={(e) =>
                    setWorkflow((w) => ({
                      ...w,
                      buyer_warehouse_address: e.target.value,
                    }))
                  }
                />
              </div>

              {/* Warehouse Goods Receipt Card */}
              <div className="border border-emerald-300 bg-emerald-50/60 rounded-xl p-4 space-y-3">
                <h4 className="font-bold text-emerald-950 text-sm flex items-center justify-between">
                  <span>Warehouse Dock Inspection & Acceptance into Inventory</span>
                  <span className="text-xs font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                    Final Commercial Milestone
                  </span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-emerald-900 uppercase text-[10px] mb-1">
                      Received Pallet Count
                    </label>
                    <input
                      type="number"
                      className="w-full border border-emerald-200 rounded-lg p-2 bg-white font-bold"
                      value={workflow.warehouse_pallet_count ?? 26}
                      onChange={(e) =>
                        setWorkflow((w) => ({
                          ...w,
                          warehouse_pallet_count: Number(e.target.value),
                        }))
                      }
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-emerald-900 uppercase text-[10px] mb-1">
                      Warehouse Receiving Officer
                    </label>
                    <input
                      type="text"
                      className="w-full border border-emerald-200 rounded-lg p-2 bg-white font-medium"
                      placeholder="e.g. Avi Mizrahi (Logistics Hub Manager)"
                      value={workflow.goods_accepted_by ?? ""}
                      onChange={(e) =>
                        setWorkflow((w) => ({
                          ...w,
                          goods_accepted_by: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <p className="text-[11px] text-emerald-800">
                    Signing off marks the sourcing order as 100% completed, goods received into buyer ERP, and container released back to ocean shipping carrier.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const updated: CommercialOrderLifecycle = {
                        ...workflow,
                        delivery_status: "arrived_at_warehouse",
                        customs_status: "customs_cleared",
                        arrived_at: new Date().toISOString(),
                        goods_accepted_by: workflow.goods_accepted_by || `${buyerCompany} Warehouse Logistics`,
                      };
                      setWorkflow(updated);
                      handleSave(updated);
                    }}
                    className="text-xs font-bold px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition cursor-pointer shadow-md shrink-0 ml-4 flex items-center gap-1.5"
                  >
                    <span>🏁 Sign Off Warehouse Acceptance</span>
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  {saveSuccess && (
                    <span className="text-xs text-emerald-600 font-bold">
                      ✓ Logistics details saved successfully!
                    </span>
                  )}
                  {saveError && (
                    <span className="text-xs text-red-600 font-bold">
                      Error: {saveError}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleSave()}
                  disabled={isPending}
                  className="text-xs font-semibold px-4 py-2 bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition cursor-pointer"
                >
                  {isPending ? "Saving..." : "Save All Logistics Parameters"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}


    </div>
  );
}