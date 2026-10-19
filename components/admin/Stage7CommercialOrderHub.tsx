"use client";

import { useState, useTransition } from "react";
import {
  type CommercialOrderLifecycle,
  type OrderWorkflowStage,
  updateRequestOrderWorkflow,
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
    "po" | "manufacturing" | "shipping" | "customs_warehouse"
  >("po");
  const [showPoModal, setShowPoModal] = useState(false);
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
            onClick={() => setShowPoModal(true)}
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
              onClick={() => setActiveTab("manufacturing")}
              className={`text-xs font-bold pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === "manufacturing"
                  ? "border-rose-600 text-rose-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>🏭</span>
              <span>2. Manufacturing Milestones</span>
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
              <span>3. Ocean Container & Vessel</span>
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
              <span>4. Customs & Warehouse Landing</span>
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
                    onClick={() => setShowPoModal(true)}
                    className="text-xs font-bold px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>📄 View Formal PO Document</span>
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
            </div>
          )}

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

      {/* ── Official Purchase Order Document Modal ── */}
      {showPoModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Controls Bar */}
            <div className="px-6 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50 sticky top-0 z-10 print:hidden">
              <span className="text-xs font-bold text-slate-700">Official Commercial Purchase Order</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="text-xs font-bold px-3 py-1.5 bg-slate-900 text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
                >
                  🖨️ Print / Save as PDF
                </button>
                <button
                  type="button"
                  onClick={() => setShowPoModal(false)}
                  className="text-xs font-bold w-7 h-7 rounded-full hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Official PO Document Body */}
            <div className="p-8 text-slate-900 font-sans space-y-6">
              {/* Document Header */}
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-5">
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-slate-900">
                    FOODXCHANGE COMMERCIAL
                  </h1>
                  <p className="text-xs text-slate-500 uppercase tracking-widest mt-0.5">
                    Official Commercial Purchase Order
                  </p>
                  <p className="text-xs text-slate-600 mt-2">
                    Operated by FDX.TRADING Platform<br />
                    B2B Private Label & Global Food Sourcing
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-mono font-black text-rose-600">
                    {workflow.po_number || "PO-FDX-DRAFT"}
                  </span>
                  <p className="text-xs text-slate-500 mt-1">
                    Date: <span className="font-mono">{workflow.po_date || new Date().toISOString().slice(0, 10)}</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    Incoterm: <span className="font-bold text-slate-800">{workflow.incoterms || "CIF Ashdod"}</span>
                  </p>
                </div>
              </div>

              {/* Parties: Buyer & Supplier */}
              <div className="grid grid-cols-2 gap-8 text-xs">
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                  <span className="font-bold text-slate-500 uppercase text-[10px] block mb-1">
                    BUYER / IMPORTER OF RECORD:
                  </span>
                  <p className="font-bold text-base text-slate-900">{buyerCompany}</p>
                  <p className="text-slate-600 mt-1">
                    Delivery Warehouse:<br />
                    {workflow.buyer_warehouse_address || "Central Retail Logistics Hub, Israel"}
                  </p>
                </div>

                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                  <span className="font-bold text-slate-500 uppercase text-[10px] block mb-1">
                    SUPPLIER / MANUFACTURER:
                  </span>
                  <p className="font-bold text-base text-slate-900">
                    {workflow.selected_supplier_name || "Authorized Factory Partner"}
                  </p>
                  <p className="text-slate-600 mt-1">
                    Port of Loading: {workflow.port_of_origin || "Valencia Port, Spain"}<br />
                    Shipping Line: {workflow.shipping_line || "MSC"}
                  </p>
                </div>
              </div>

              {/* Itemized Line Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-white font-semibold">
                    <tr>
                      <th className="p-3">#</th>
                      <th className="p-3">Item Description</th>
                      <th className="p-3">Packaging / Specs</th>
                      <th className="p-3 text-right">Order Quantity</th>
                      <th className="p-3 text-right">Unit Price</th>
                      <th className="p-3 text-right">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="p-3 font-mono">01</td>
                      <td className="p-3 font-bold text-slate-900">
                        {productName} (Private Label Line)
                      </td>
                      <td className="p-3 text-slate-600">
                        Retail Pack, Food Grade, Kosher Certified
                      </td>
                      <td className="p-3 text-right font-mono font-semibold">
                        {workflow.order_volume || "24,000 Units"}
                      </td>
                      <td className="p-3 text-right font-mono font-semibold">
                        {workflow.currency || "EUR"} {unitPriceNum.toFixed(2)}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">
                        {workflow.currency || "EUR"} {totalCalculated.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                    <tr>
                      <td colSpan={5} className="p-3 text-right uppercase text-slate-600">
                        Total Commercial Contract Value ({workflow.incoterms}):
                      </td>
                      <td className="p-3 text-right text-base text-rose-600 font-mono">
                        {workflow.currency || "EUR"} {totalCalculated.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Commercial Terms & Instructions */}
              <div className="text-xs text-slate-600 space-y-2 border-t border-slate-100 pt-4">
                <p>
                  <strong>Payment Terms:</strong> {workflow.payment_terms || "30% Advance Deposit on signing, 70% against B/L copy & Inspection report."}
                </p>
                <p>
                  <strong>Special Packaging & Labeling Mandate:</strong> Products must strictly follow the approved Stage 6 Private Label master with Hebrew nutritional facts panel per Israel Standard 1145 and registered EAN-13 barcode.
                </p>
              </div>

              {/* Signature Blocks */}
              <div className="grid grid-cols-2 gap-12 pt-8 text-xs border-t border-slate-200">
                <div>
                  <p className="font-bold text-slate-900 uppercase">Authorized Buyer Signature:</p>
                  <div className="h-14 border-b border-slate-300 mt-2 flex items-end pb-1 font-mono text-[11px] text-slate-400">
                    Digitally countersigned by {buyerCompany}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Date: {workflow.po_date}</p>
                </div>

                <div>
                  <p className="font-bold text-slate-900 uppercase">Supplier Acceptance & Seal:</p>
                  <div className="h-14 border-b border-slate-300 mt-2 flex items-end pb-1 font-mono text-[11px] text-slate-400">
                    Accepted by {workflow.selected_supplier_name}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Date: {workflow.po_date}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
