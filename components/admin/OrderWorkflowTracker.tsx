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

const STAGES: {
  id: OrderWorkflowStage;
  num: number;
  label: string;
  icon: string;
  desc: string;
}[] = [
  { id: "intake", num: 1, label: "Visual Intake", icon: "📸", desc: "Machine vision packaging intake" },
  { id: "reverse_matched", num: 2, label: "Matched", icon: "⚡", desc: "European factories reverse-matched" },
  { id: "rfq_dispatched", num: 3, label: "Factory RFQ", icon: "📧", desc: "Specifications & RFQ dispatched" },
  { id: "buyer_pitched", num: 4, label: "Buyer Pitch", icon: "🤝", desc: "Offers pitched to retail buyer" },
  { id: "commercial_negotiation", num: 5, label: "Negotiation", icon: "⚖️", desc: "Price, MOQ & Incoterms agreed" },
  { id: "order_po_issued", num: 6, label: "PO & Production", icon: "📝", desc: "Purchase order & factory manufacturing" },
  { id: "shipping_customs_warehouse", num: 7, label: "Arrival", icon: "🚢", desc: "Container shipping to buyer warehouse" },
];

export default function OrderWorkflowTracker({
  requestId,
  buyerCompany,
  productName,
  initialWorkflow,
  matchedSuppliers,
}: Props) {
  const [workflow, setWorkflow] = useState<CommercialOrderLifecycle>(
    initialWorkflow || {
      current_stage: matchedSuppliers.length > 0 ? "reverse_matched" : "intake",
      selected_supplier_name: matchedSuppliers[0]?.company_name || null,
      selected_supplier_id: matchedSuppliers[0]?.id || null,
      agreed_product_name: productName,
      currency: "EUR",
      incoterms: "CIF Ashdod",
      payment_terms: "30% advance, 70% against B/L copy",
      port_of_origin: "Valencia, Spain",
      port_of_destination: "Ashdod, Israel",
      buyer_warehouse_address: `${buyerCompany} Central Logistics Warehouse`,
      customs_status: "pending_documents",
      delivery_status: "at_port",
    }
  );

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"commercial" | "shipping" | "delivery">("commercial");
  const [isPending, startTransition] = useTransition();
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const currentStageIndex = STAGES.findIndex((s) => s.id === workflow.current_stage);
  const currentStageNum = currentStageIndex >= 0 ? currentStageIndex + 1 : 1;

  function handleSave() {
    setSaveError(null);
    setSaveSuccess(false);
    startTransition(async () => {
      const res = await updateRequestOrderWorkflow({
        requestId,
        workflow,
      });

      if (!res.ok) {
        setSaveError(res.error);
        return;
      }

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setIsOpen(false);
      }, 1200);
    });
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-6 mb-6">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
              Commercial Lifecycle
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-500 font-medium">
              Stage {currentStageNum} of 7
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            Request to Warehouse Arrival Workflow
          </h2>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition cursor-pointer shadow-xs"
        >
          <span>⚙️</span>
          <span>Update Commercial & Logistics Stage</span>
        </button>
      </div>

      {/* ── 7-Stage Horizontal Pipeline Stepper ── */}
      <div className="py-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {STAGES.map((s, idx) => {
            const isCompleted = idx < currentStageIndex;
            const isCurrent = idx === currentStageIndex;
            const isUpcoming = idx > currentStageIndex;

            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setWorkflow((prev) => ({ ...prev, current_stage: s.id }));
                  setIsOpen(true);
                }}
                className={`relative flex flex-col p-3 rounded-xl border text-left transition cursor-pointer ${
                  isCurrent
                    ? "bg-orange-50 border-orange-300 ring-2 ring-orange-100"
                    : isCompleted
                    ? "bg-emerald-50/60 border-emerald-200 hover:bg-emerald-50"
                    : "bg-slate-50/70 border-slate-200 opacity-60 hover:opacity-100 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-base">{s.icon}</span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      isCurrent
                        ? "bg-orange-600 text-white"
                        : isCompleted
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {isCompleted ? "✓" : s.num}
                  </span>
                </div>
                <span
                  className={`text-xs font-bold leading-tight truncate ${
                    isCurrent
                      ? "text-orange-950"
                      : isCompleted
                      ? "text-emerald-950"
                      : "text-slate-700"
                  }`}
                >
                  {s.label}
                </span>
                <span className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{s.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Live Status Snapshot ── */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-xs">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Commercial Deal & Supplier
            </span>
            <p className="font-bold text-slate-900">
              {workflow.selected_supplier_name || "Factory match in progress"}
            </p>
            <p className="text-slate-600 mt-0.5">
              {workflow.agreed_unit_price
                ? `${workflow.currency || "EUR"} ${workflow.agreed_unit_price} (${workflow.incoterms || "CIF Ashdod"})`
                : "Pricing negotiation active"}
            </p>
            {workflow.po_number && (
              <span className="inline-block mt-1 font-mono text-[10px] bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded">
                PO: {workflow.po_number}
              </span>
            )}
          </div>

          <div>
            <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Container Shipping & Route
            </span>
            <p className="font-bold text-slate-900">
              {workflow.port_of_origin || "Origin Port"} → {workflow.port_of_destination || "Destination Port"}
            </p>
            <p className="text-slate-600 mt-0.5">
              {workflow.vessel_name
                ? `${workflow.vessel_name} · ${workflow.container_number || "Container assigned"}`
                : "Awaiting container assignment"}
            </p>
            {workflow.bill_of_lading && (
              <span className="inline-block mt-1 font-mono text-[10px] bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded">
                B/L: {workflow.bill_of_lading}
              </span>
            )}
          </div>

          <div>
            <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Customs & Warehouse Delivery
            </span>
            <div className="flex items-center gap-1.5 mb-1">
              <span
                className={`w-2 h-2 rounded-full ${
                  workflow.customs_status === "customs_cleared"
                    ? "bg-emerald-500"
                    : workflow.customs_status === "inspection_hold"
                    ? "bg-red-500"
                    : "bg-amber-500 animate-pulse"
                }`}
              />
              <span className="font-bold text-slate-900 capitalize">
                {workflow.customs_status?.replace(/_/g, " ") || "Pending documents"}
              </span>
            </div>
            <p className="text-slate-600 truncate">
              {workflow.delivery_status === "arrived_at_warehouse"
                ? `✅ Arrived at ${workflow.buyer_warehouse_address || buyerCompany}`
                : `Destination: ${workflow.buyer_warehouse_address || buyerCompany}`}
            </p>
          </div>
        </div>
      </div>

      {/* ── Modal: Manage Commercial Order & Logistics ── */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Manage Commercial Deal, PO & Logistics
                </h3>
                <p className="text-xs text-slate-500">
                  Update stages from RFQ negotiation through container customs clearance to buyer warehouse.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-lg p-1"
              >
                ✕
              </button>
            </div>

            {/* Stage Selector */}
            <div className="px-6 py-3 bg-slate-100/70 border-b border-slate-200 flex items-center gap-2 overflow-x-auto">
              <span className="text-xs font-semibold text-slate-600 shrink-0">Stage:</span>
              <select
                className="text-xs font-semibold bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800"
                value={workflow.current_stage}
                onChange={(e) =>
                  setWorkflow((prev) => ({
                    ...prev,
                    current_stage: e.target.value as OrderWorkflowStage,
                  }))
                }
              >
                {STAGES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.num}. {s.label} ({s.desc})
                  </option>
                ))}
              </select>
            </div>

            {/* Modal Tabs */}
            <div className="px-6 pt-3 border-b border-slate-200 flex gap-4">
              <button
                type="button"
                onClick={() => setActiveTab("commercial")}
                className={`text-xs font-bold pb-2.5 border-b-2 transition ${
                  activeTab === "commercial"
                    ? "border-orange-600 text-orange-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                1. Commercial Deal & PO
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("shipping")}
                className={`text-xs font-bold pb-2.5 border-b-2 transition ${
                  activeTab === "shipping"
                    ? "border-orange-600 text-orange-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                2. Container Shipping
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("delivery")}
                className={`text-xs font-bold pb-2.5 border-b-2 transition ${
                  activeTab === "delivery"
                    ? "border-orange-600 text-orange-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                3. Customs & Warehouse Arrival
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {activeTab === "commercial" && (
                <div className="space-y-4">
                  <div>
                    <label className="block font-semibold text-slate-600 uppercase mb-1">
                      Selected European Factory / Supplier
                    </label>
                    <select
                      className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white text-slate-800"
                      value={workflow.selected_supplier_id || ""}
                      onChange={(e) => {
                        const sup = matchedSuppliers.find((m) => m.id === e.target.value);
                        setWorkflow((prev) => ({
                          ...prev,
                          selected_supplier_id: sup?.id || null,
                          selected_supplier_name: sup?.company_name || null,
                        }));
                      }}
                    >
                      <option value="">-- Choose Factory --</option>
                      {matchedSuppliers.map((sup) => (
                        <option key={sup.id} value={sup.id}>
                          {sup.company_name} ({sup.country || "Europe"}) · {sup.product_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-600 uppercase mb-1">
                        Agreed Unit Price
                      </label>
                      <input
                        className="w-full text-xs border border-slate-200 rounded-lg p-2.5"
                        placeholder="e.g. 0.85"
                        value={workflow.agreed_unit_price || ""}
                        onChange={(e) =>
                          setWorkflow((prev) => ({ ...prev, agreed_unit_price: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 uppercase mb-1">
                        Currency
                      </label>
                      <select
                        className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white"
                        value={workflow.currency || "EUR"}
                        onChange={(e) =>
                          setWorkflow((prev) => ({ ...prev, currency: e.target.value }))
                        }
                      >
                        <option value="EUR">EUR (€)</option>
                        <option value="USD">USD ($)</option>
                        <option value="ILS">ILS (₪)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-600 uppercase mb-1">
                        Incoterms
                      </label>
                      <input
                        className="w-full text-xs border border-slate-200 rounded-lg p-2.5"
                        placeholder="CIF Ashdod / FOB Valencia"
                        value={workflow.incoterms || ""}
                        onChange={(e) =>
                          setWorkflow((prev) => ({ ...prev, incoterms: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 uppercase mb-1">
                        Total Order Volume
                      </label>
                      <input
                        className="w-full text-xs border border-slate-200 rounded-lg p-2.5"
                        placeholder="e.g. 50,000 units / 2 x 40ft HQ"
                        value={workflow.order_volume || ""}
                        onChange={(e) =>
                          setWorkflow((prev) => ({ ...prev, order_volume: e.target.value }))
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-600 uppercase mb-1">
                        Purchase Order (PO) #
                      </label>
                      <input
                        className="w-full text-xs border border-slate-200 rounded-lg p-2.5 font-mono"
                        placeholder="PO-FDX-2026-0042"
                        value={workflow.po_number || ""}
                        onChange={(e) =>
                          setWorkflow((prev) => ({ ...prev, po_number: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 uppercase mb-1">
                        Payment Terms
                      </label>
                      <input
                        className="w-full text-xs border border-slate-200 rounded-lg p-2.5"
                        placeholder="30% Advance, 70% vs B/L"
                        value={workflow.payment_terms || ""}
                        onChange={(e) =>
                          setWorkflow((prev) => ({ ...prev, payment_terms: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "shipping" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-600 uppercase mb-1">
                        Shipping Line / Carrier
                      </label>
                      <input
                        className="w-full text-xs border border-slate-200 rounded-lg p-2.5"
                        placeholder="MSC / Maersk / ZIM"
                        value={workflow.shipping_line || ""}
                        onChange={(e) =>
                          setWorkflow((prev) => ({ ...prev, shipping_line: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 uppercase mb-1">
                        Vessel Name & Voyage
                      </label>
                      <input
                        className="w-full text-xs border border-slate-200 rounded-lg p-2.5"
                        placeholder="MSC ISABELLA V.242W"
                        value={workflow.vessel_name || ""}
                        onChange={(e) =>
                          setWorkflow((prev) => ({ ...prev, vessel_name: e.target.value }))
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-600 uppercase mb-1">
                        Container Number
                      </label>
                      <input
                        className="w-full text-xs border border-slate-200 rounded-lg p-2.5 font-mono"
                        placeholder="MSKU-982137-4"
                        value={workflow.container_number || ""}
                        onChange={(e) =>
                          setWorkflow((prev) => ({ ...prev, container_number: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 uppercase mb-1">
                        Bill of Lading (B/L) #
                      </label>
                      <input
                        className="w-full text-xs border border-slate-200 rounded-lg p-2.5 font-mono"
                        placeholder="MEDU19283749"
                        value={workflow.bill_of_lading || ""}
                        onChange={(e) =>
                          setWorkflow((prev) => ({ ...prev, bill_of_lading: e.target.value }))
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-600 uppercase mb-1">
                        Port of Origin (Loading)
                      </label>
                      <input
                        className="w-full text-xs border border-slate-200 rounded-lg p-2.5"
                        placeholder="Valencia, Spain"
                        value={workflow.port_of_origin || ""}
                        onChange={(e) =>
                          setWorkflow((prev) => ({ ...prev, port_of_origin: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 uppercase mb-1">
                        Port of Destination (Discharge)
                      </label>
                      <input
                        className="w-full text-xs border border-slate-200 rounded-lg p-2.5"
                        placeholder="Ashdod Port, Israel"
                        value={workflow.port_of_destination || ""}
                        onChange={(e) =>
                          setWorkflow((prev) => ({
                            ...prev,
                            port_of_destination: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-600 uppercase mb-1">
                        Estimated Departure (ETD)
                      </label>
                      <input
                        type="date"
                        className="w-full text-xs border border-slate-200 rounded-lg p-2.5"
                        value={workflow.etd || ""}
                        onChange={(e) => setWorkflow((prev) => ({ ...prev, etd: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 uppercase mb-1">
                        Estimated Arrival Port (ETA)
                      </label>
                      <input
                        type="date"
                        className="w-full text-xs border border-slate-200 rounded-lg p-2.5"
                        value={workflow.eta_port || ""}
                        onChange={(e) =>
                          setWorkflow((prev) => ({ ...prev, eta_port: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "delivery" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-600 uppercase mb-1">
                        Customs Clearance Status
                      </label>
                      <select
                        className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white"
                        value={workflow.customs_status || "pending_documents"}
                        onChange={(e) =>
                          setWorkflow((prev) => ({
                            ...prev,
                            customs_status: e.target.value as any,
                          }))
                        }
                      >
                        <option value="pending_documents">Pending Documents</option>
                        <option value="customs_broker_clearing">Customs Broker Clearing</option>
                        <option value="customs_cleared">Customs Cleared ✓</option>
                        <option value="inspection_hold">Customs / Phytosanitary Inspection</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-600 uppercase mb-1">
                        Delivery to Warehouse Status
                      </label>
                      <select
                        className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white"
                        value={workflow.delivery_status || "at_port"}
                        onChange={(e) =>
                          setWorkflow((prev) => ({
                            ...prev,
                            delivery_status: e.target.value as any,
                          }))
                        }
                      >
                        <option value="at_port">Discharged at Port</option>
                        <option value="inland_trucking">Inland Freight / Trucking in Transit</option>
                        <option value="arrived_at_warehouse">Delivered & Arrived at Warehouse 🎉</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 uppercase mb-1">
                      Buyer Warehouse Address
                    </label>
                    <input
                      className="w-full text-xs border border-slate-200 rounded-lg p-2.5"
                      placeholder="e.g. Shufersal Central Logistics Hub, Rishon LeZion, Israel"
                      value={workflow.buyer_warehouse_address || ""}
                      onChange={(e) =>
                        setWorkflow((prev) => ({
                          ...prev,
                          buyer_warehouse_address: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 uppercase mb-1">
                      Logistics Notes & Receiving Confirmation
                    </label>
                    <textarea
                      rows={3}
                      className="w-full text-xs border border-slate-200 rounded-lg p-2.5"
                      placeholder="Inspection report, pallet count, receiving temperature log..."
                      value={workflow.logistics_notes || ""}
                      onChange={(e) =>
                        setWorkflow((prev) => ({ ...prev, logistics_notes: e.target.value }))
                      }
                    />
                  </div>
                </div>
              )}

              {saveError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                  ⚠️ {saveError}
                </div>
              )}

              {saveSuccess && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                  ✓ Lifecycle & Order status updated successfully!
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isPending}
                onClick={handleSave}
                className="inline-flex items-center gap-2 text-xs font-semibold px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl disabled:opacity-50 transition cursor-pointer"
              >
                {isPending ? "Saving changes…" : "Save Commercial & Logistics Status"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
