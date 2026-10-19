"use client";

import { useState, useTransition } from "react";
import {
  type PackagingArtworkWorkflow,
  updatePackagingArtworkWorkflow,
} from "@/app/admin/requests/actions";

interface Props {
  requestId: string;
  buyerCompany: string;
  productName: string;
  initialArtwork?: PackagingArtworkWorkflow | null;
  onAdvanceToOrder?: () => void;
}

export default function PackagingArtworkStaging({
  requestId,
  buyerCompany,
  productName,
  initialArtwork,
  onAdvanceToOrder,
}: Props) {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "dieline" | "advisory" | "marketing" | "factory_proof" | "release"
  >("dieline");
  const [isPending, startTransition] = useTransition();
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [artwork, setArtwork] = useState<PackagingArtworkWorkflow>(
    initialArtwork || {
      status: "dieline_staging",
      packaging_specs: {
        packaging_type: "PET Bottle",
        dieline_template_url: "",
        dieline_dimensions_mm: "Width: 260mm x Height: 180mm (+3mm bleed)",
        artwork_pdf_url: "",
        artwork_version: 1,
        barcode_ean13: "7290001849201",
        inkjet_zone_position: "Top shoulder of bottle, 15mm below neck, 35mm x 12mm clear unvarnished zone",
        cylinder_unwind_direction: "3",
        color_profile: "CMYK + 2 Pantone",
      },
      approval_gates: {
        food_advisory: {
          status: "pending",
          advisory_company_name: "FoodReg Advisory Ltd. (Subcontractor)",
          reviewed_by: "Dr. R. Levin (Food Regulatory Counsel)",
          reviewed_at: null,
          hebrew_nutrition_table_verified: true,
          allergen_bolding_verified: true,
          legal_origin_marking_verified: true,
          front_warning_labels_verified: true,
          notes: "Hebrew nutritional facts verified per Israel Standard 1145. Allergen font meets mandatory minimum height.",
        },
        buyer_marketing: {
          status: "pending",
          approver_name: `${buyerCompany} Brand Director`,
          reviewed_at: null,
          brand_compliance_verified: true,
          finish_and_coating: "Matte",
          notes: "Logo alignment and primary brand pantone color approved for retail shelf layout.",
        },
        supplier_technical: {
          status: "pending",
          factory_print_engineer_name: "Carlos Gomez (Pre-press Production Manager)",
          reviewed_at: null,
          roll_unwinding_confirmed: true,
          inkjet_code_gap_confirmed: true,
          die_cut_tolerances_confirmed: true,
          notes: "Cylinder circumference 340mm confirmed. Unwind direction #3 confirmed for high-speed labeling machine.",
        },
      },
      print_master_release: {
        is_released_to_factory: false,
        released_at: null,
        released_by: null,
        signed_proof_pdf_url: "",
      },
    }
  );

  function handleSave(updatedArtwork?: PackagingArtworkWorkflow) {
    const toSave = updatedArtwork || artwork;
    setSaveError(null);
    setSaveSuccess(false);

    startTransition(async () => {
      const res = await updatePackagingArtworkWorkflow(requestId, toSave);
      if (!res.ok) {
        setSaveError(res.error);
        return;
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    });
  }

  function getStatusBadge() {
    switch (artwork.status) {
      case "dieline_staging":
        return {
          label: "1. Dieline & Layout Staging",
          cls: "bg-amber-50 text-amber-800 border-amber-200",
        };
      case "food_advisory_review":
        return {
          label: "2. Food Advisory Review",
          cls: "bg-blue-50 text-blue-700 border-blue-200",
        };
      case "buyer_marketing_review":
        return {
          label: "3. Marketing & Brand Review",
          cls: "bg-indigo-50 text-indigo-700 border-indigo-200",
        };
      case "supplier_technical_proof":
        return {
          label: "4. Factory Technical Proof",
          cls: "bg-purple-50 text-purple-700 border-purple-200",
        };
      case "artwork_approved":
        return {
          label: "5. Artwork Approved ✓",
          cls: "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold",
        };
      case "print_master_released":
        return {
          label: "6. Print Master Released to Factory 🚀",
          cls: "bg-emerald-100 text-emerald-900 border-emerald-400 font-bold",
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
            <span className="text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
              Stage 6
            </span>
            <span className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${badge.cls}`}>
              {badge.label}
            </span>
          </div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span>🎨</span>
            <span>Packaging Graphics, Hebrew Labeling & Private Label Staging</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Dieline vector layout, 3-way sign-off (Food Advisory $\rightarrow$ Buyer Marketing $\rightarrow$ Factory Print Manager), and high-resolution print master release.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {artwork.print_master_release.is_released_to_factory ? (
            <span className="text-xs font-bold px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-xl border border-emerald-300 flex items-center gap-1.5">
              <span>🚀</span>
              <span>Print Master Released</span>
            </span>
          ) : (
            <button
              onClick={() => {
                const updated: PackagingArtworkWorkflow = {
                  ...artwork,
                  status: "print_master_released",
                  approval_gates: {
                    food_advisory: { ...artwork.approval_gates.food_advisory, status: "approved" },
                    buyer_marketing: { ...artwork.approval_gates.buyer_marketing, status: "approved" },
                    supplier_technical: { ...artwork.approval_gates.supplier_technical, status: "approved" },
                  },
                  print_master_release: {
                    is_released_to_factory: true,
                    released_at: new Date().toISOString(),
                    released_by: `${buyerCompany} Director`,
                    signed_proof_pdf_url: artwork.packaging_specs.artwork_pdf_url || "https://.../signed_master.pdf",
                  },
                };
                setArtwork(updated);
                handleSave(updated);
                if (onAdvanceToOrder) onAdvanceToOrder();
              }}
              className="text-xs font-bold px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition cursor-pointer shadow-xs"
            >
              ✓ Fast-Track Print Release
            </button>
          )}

          <button
            onClick={() => setIsOpen((v) => !v)}
            className="text-xs font-semibold px-3 py-1.5 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl transition cursor-pointer"
          >
            {isOpen ? "Collapse ▲" : "Manage Artwork ▼"}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="mt-5 space-y-6">
          {/* Sub-tabs */}
          <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab("dieline")}
              className={`text-xs font-bold pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === "dieline"
                  ? "border-purple-600 text-purple-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>📐</span>
              <span>1. Dieline & Layout Staging</span>
              <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded-full font-mono">
                v{artwork.packaging_specs.artwork_version}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("advisory")}
              className={`text-xs font-bold pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === "advisory"
                  ? "border-purple-600 text-purple-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>🥗</span>
              <span>2. Food Advisory Check (Gate 1)</span>
              {artwork.approval_gates.food_advisory.status === "approved" && (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full font-bold">
                  ✓
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("marketing")}
              className={`text-xs font-bold pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === "marketing"
                  ? "border-purple-600 text-purple-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>👔</span>
              <span>3. Buyer Marketing / CEO (Gate 2)</span>
              {artwork.approval_gates.buyer_marketing.status === "approved" && (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full font-bold">
                  ✓
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("factory_proof")}
              className={`text-xs font-bold pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === "factory_proof"
                  ? "border-purple-600 text-purple-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>🏭</span>
              <span>4. Factory Print Proof (Gate 3)</span>
              {artwork.approval_gates.supplier_technical.status === "approved" && (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full font-bold">
                  ✓
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("release")}
              className={`text-xs font-bold pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === "release"
                  ? "border-purple-600 text-purple-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>🚀</span>
              <span>5. Print Release & Issue PO</span>
              {artwork.print_master_release.is_released_to_factory && (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full font-bold">
                  Released
                </span>
              )}
            </button>
          </div>

          {/* TAB 1: DIELINE & VECTOR LAYOUT STAGING */}
          {activeTab === "dieline" && (
            <div className="space-y-4 animate-in fade-in duration-150 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">
                    Packaging Format
                  </label>
                  <select
                    className="w-full border border-slate-200 rounded-lg p-2.5 bg-white font-semibold"
                    value={artwork.packaging_specs.packaging_type}
                    onChange={(e) =>
                      setArtwork((a) => ({
                        ...a,
                        packaging_specs: {
                          ...a.packaging_specs,
                          packaging_type: e.target.value as any,
                        },
                      }))
                    }
                  >
                    <option value="PET Bottle">PET Bottle (Olive Oil / Beverages)</option>
                    <option value="Glass Jar">Glass Jar (Sauces / Pickles / Spreads)</option>
                    <option value="Tin Can">Tin Can (Tomatoes / Fish / Vegetables)</option>
                    <option value="Flexible Foil / Pouch">Flexible Foil / Pouch (Dry Snacks / Pasta)</option>
                    <option value="Tetra Pak">Tetra Pak (Aseptic Liquids)</option>
                    <option value="Corrugated Box">Outer Shipping Carton</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">
                    Dieline Template & Cut Dimensions
                  </label>
                  <input
                    type="text"
                    className="w-full border border-slate-200 rounded-lg p-2.5 bg-white font-mono"
                    value={artwork.packaging_specs.dieline_dimensions_mm ?? ""}
                    onChange={(e) =>
                      setArtwork((a) => ({
                        ...a,
                        packaging_specs: {
                          ...a.packaging_specs,
                          dieline_dimensions_mm: e.target.value,
                        },
                      }))
                    }
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">
                    Artwork Version & Color Profile
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      className="w-20 border border-slate-200 rounded-lg p-2.5 bg-white font-bold"
                      value={artwork.packaging_specs.artwork_version}
                      onChange={(e) =>
                        setArtwork((a) => ({
                          ...a,
                          packaging_specs: {
                            ...a.packaging_specs,
                            artwork_version: Number(e.target.value),
                          },
                        }))
                      }
                    />
                    <select
                      className="w-full border border-slate-200 rounded-lg p-2.5 bg-white font-medium"
                      value={artwork.packaging_specs.color_profile ?? "CMYK + 2 Pantone"}
                      onChange={(e) =>
                        setArtwork((a) => ({
                          ...a,
                          packaging_specs: {
                            ...a.packaging_specs,
                            color_profile: e.target.value as any,
                          },
                        }))
                      }
                    >
                      <option value="CMYK + 2 Pantone">CMYK + 2 Pantone Spot Colors</option>
                      <option value="CMYK">CMYK 4-Color Process</option>
                      <option value="Pantone Spot Colors">100% Pantone Direct Match</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50 space-y-3">
                  <h4 className="font-bold text-slate-800 uppercase text-[11px] flex items-center justify-between">
                    <span>Staged Artwork Master Vector PDF</span>
                    <span className="text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 font-bold">
                      Ready for Review
                    </span>
                  </h4>
                  <div>
                    <label className="block text-slate-500 text-[10px] uppercase font-semibold mb-1">
                      Artwork File Cloud URL
                    </label>
                    <input
                      className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white"
                      placeholder="https://.../Shufersal_EVOO_1L_PrintReady_v3.pdf"
                      value={artwork.packaging_specs.artwork_pdf_url ?? ""}
                      onChange={(e) =>
                        setArtwork((a) => ({
                          ...a,
                          packaging_specs: {
                            ...a.packaging_specs,
                            artwork_pdf_url: e.target.value,
                          },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 text-[10px] uppercase font-semibold mb-1">
                      Registered EAN-13 Retail Barcode
                    </label>
                    <input
                      className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white font-mono font-bold text-slate-900"
                      value={artwork.packaging_specs.barcode_ean13 ?? ""}
                      onChange={(e) =>
                        setArtwork((a) => ({
                          ...a,
                          packaging_specs: {
                            ...a.packaging_specs,
                            barcode_ean13: e.target.value,
                          },
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50 space-y-3">
                  <h4 className="font-bold text-slate-800 uppercase text-[11px]">
                    Technical Print & Ink-Jet Placement
                  </h4>
                  <div>
                    <label className="block text-slate-500 text-[10px] uppercase font-semibold mb-1">
                      Batch & Expiry Ink-Jet Printing Zone (Clear Gap)
                    </label>
                    <input
                      className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white"
                      value={artwork.packaging_specs.inkjet_zone_position ?? ""}
                      onChange={(e) =>
                        setArtwork((a) => ({
                          ...a,
                          packaging_specs: {
                            ...a.packaging_specs,
                            inkjet_zone_position: e.target.value,
                          },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 text-[10px] uppercase font-semibold mb-1">
                      Roll Unwinding Direction (High-Speed Label Applicator)
                    </label>
                    <select
                      className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white font-bold"
                      value={artwork.packaging_specs.cylinder_unwind_direction ?? "3"}
                      onChange={(e) =>
                        setArtwork((a) => ({
                          ...a,
                          packaging_specs: {
                            ...a.packaging_specs,
                            cylinder_unwind_direction: e.target.value as any,
                          },
                        }))
                      }
                    >
                      <option value="1">Direction #1 (Top edge leading off roll)</option>
                      <option value="2">Direction #2 (Bottom edge leading off roll)</option>
                      <option value="3">Direction #3 (Right edge leading off roll - Standard)</option>
                      <option value="4">Direction #4 (Left edge leading off roll)</option>
                      <option value="sheet_fed">Sheet-Fed (Carton sleeves)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleSave()}
                  className="text-xs font-semibold px-4 py-2 bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition cursor-pointer"
                >
                  Save Staging Parameters
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleSave();
                    setActiveTab("advisory");
                  }}
                  className="text-xs font-semibold px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span>Proceed to Gate 1: Food Advisory Regulatory Check →</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: FOOD ADVISORY REGULATORY CHECK (GATE 1) */}
          {activeTab === "advisory" && (
            <div className="space-y-4 animate-in fade-in duration-150 text-xs">
              <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3.5 text-blue-950 flex items-start gap-2.5">
                <span className="text-base">🥗</span>
                <div>
                  <h4 className="font-bold text-blue-900">
                    Gate 1: Food Regulatory Advisory Subcontractor Verification
                  </h4>
                  <p className="text-[11px] text-blue-800 mt-0.5 leading-relaxed">
                    Packaging labels in food retail face strict statutory requirements. The Food Advisory consultant verifies legal wording, allergen font size, and Israel Standard 1145 compliance before printing.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">
                    Advisory Subcontractor Firm
                  </label>
                  <input
                    type="text"
                    className="w-full border border-slate-200 rounded-lg p-2.5 bg-white font-semibold"
                    value={artwork.approval_gates.food_advisory.advisory_company_name}
                    onChange={(e) =>
                      setArtwork((a) => ({
                        ...a,
                        approval_gates: {
                          ...a.approval_gates,
                          food_advisory: {
                            ...a.approval_gates.food_advisory,
                            advisory_company_name: e.target.value,
                          },
                        },
                      }))
                    }
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">
                    Regulatory Officer Name
                  </label>
                  <input
                    type="text"
                    className="w-full border border-slate-200 rounded-lg p-2.5 bg-white"
                    value={artwork.approval_gates.food_advisory.reviewed_by ?? ""}
                    onChange={(e) =>
                      setArtwork((a) => ({
                        ...a,
                        approval_gates: {
                          ...a.approval_gates,
                          food_advisory: {
                            ...a.approval_gates.food_advisory,
                            reviewed_by: e.target.value,
                          },
                        },
                      }))
                    }
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">
                    Advisory Gate Status
                  </label>
                  <select
                    className="w-full border border-slate-200 rounded-lg p-2.5 bg-white font-bold"
                    value={artwork.approval_gates.food_advisory.status}
                    onChange={(e) =>
                      setArtwork((a) => ({
                        ...a,
                        approval_gates: {
                          ...a.approval_gates,
                          food_advisory: {
                            ...a.approval_gates.food_advisory,
                            status: e.target.value as any,
                            reviewed_at: new Date().toISOString(),
                          },
                        },
                      }))
                    }
                  >
                    <option value="pending">Review in Progress</option>
                    <option value="approved">Approved & Regulatory Compliant ✓</option>
                    <option value="changes_requested">Changes / Corrections Required</option>
                  </select>
                </div>
              </div>

              {/* 4 Mandatory Checks */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-2.5">
                <h4 className="font-bold text-slate-800 uppercase text-[11px] mb-2">
                  Mandatory Legal Verification Checklist
                </h4>

                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                    checked={artwork.approval_gates.food_advisory.hebrew_nutrition_table_verified}
                    onChange={(e) =>
                      setArtwork((a) => ({
                        ...a,
                        approval_gates: {
                          ...a.approval_gates,
                          food_advisory: {
                            ...a.approval_gates.food_advisory,
                            hebrew_nutrition_table_verified: e.target.checked,
                          },
                        },
                      }))
                    }
                  />
                  <span>Hebrew nutritional facts panel calculated with statutory rounding per 100g/ml (IS 1145)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                    checked={artwork.approval_gates.food_advisory.allergen_bolding_verified}
                    onChange={(e) =>
                      setArtwork((a) => ({
                        ...a,
                        approval_gates: {
                          ...a.approval_gates,
                          food_advisory: {
                            ...a.approval_gates.food_advisory,
                            allergen_bolding_verified: e.target.checked,
                          },
                        },
                      }))
                    }
                  />
                  <span>Mandatory allergen declaration bolded with correct minimum font height requirement</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                    checked={artwork.approval_gates.food_advisory.legal_origin_marking_verified}
                    onChange={(e) =>
                      setArtwork((a) => ({
                        ...a,
                        approval_gates: {
                          ...a.approval_gates,
                          food_advisory: {
                            ...a.approval_gates.food_advisory,
                            legal_origin_marking_verified: e.target.checked,
                          },
                        },
                      }))
                    }
                  />
                  <span>Manufacturer & Importer address text verified (&ldquo;Manufactured in Spain for {buyerCompany}&rdquo;)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                    checked={artwork.approval_gates.food_advisory.front_warning_labels_verified}
                    onChange={(e) =>
                      setArtwork((a) => ({
                        ...a,
                        approval_gates: {
                          ...a.approval_gates,
                          food_advisory: {
                            ...a.approval_gates.food_advisory,
                            front_warning_labels_verified: e.target.checked,
                          },
                        },
                      }))
                    }
                  />
                  <span>Front-of-pack red warning symbols (Red circles for saturated fat / sodium / sugar) verified</span>
                </label>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 uppercase mb-1">
                  Food Advisory Consultant Directives & Notes
                </label>
                <textarea
                  rows={2}
                  className="w-full border border-slate-200 rounded-lg p-2.5 bg-white leading-relaxed"
                  value={artwork.approval_gates.food_advisory.notes ?? ""}
                  onChange={(e) =>
                    setArtwork((a) => ({
                      ...a,
                      approval_gates: {
                        ...a.approval_gates,
                        food_advisory: {
                          ...a.approval_gates.food_advisory,
                          notes: e.target.value,
                        },
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
                  Save Advisory Review
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleSave();
                    setActiveTab("marketing");
                  }}
                  className="text-xs font-semibold px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span>Proceed to Gate 2: Buyer Marketing Sign-Off →</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: BUYER MARKETING & CEO (GATE 2) */}
          {activeTab === "marketing" && (
            <div className="space-y-4 animate-in fade-in duration-150 text-xs">
              <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-xl p-3.5 text-indigo-950 flex items-start gap-2.5">
                <span className="text-base">👔</span>
                <div>
                  <h4 className="font-bold text-indigo-900">
                    Gate 2: Buyer Marketing, Brand Director & CEO Sign-Off
                  </h4>
                  <p className="text-[11px] text-indigo-800 mt-0.5 leading-relaxed">
                    Verify visual brand aesthetics, logo contrast, shelf presence, and premium finish (Matte, Glossy, Gold/Silver Hot Foil Stamp) before authoring the factory print run.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">
                    Approver Name & Title
                  </label>
                  <input
                    type="text"
                    className="w-full border border-slate-200 rounded-lg p-2.5 bg-white font-semibold"
                    value={artwork.approval_gates.buyer_marketing.approver_name}
                    onChange={(e) =>
                      setArtwork((a) => ({
                        ...a,
                        approval_gates: {
                          ...a.approval_gates,
                          buyer_marketing: {
                            ...a.approval_gates.buyer_marketing,
                            approver_name: e.target.value,
                          },
                        },
                      }))
                    }
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">
                    Packaging Finish & Coating
                  </label>
                  <select
                    className="w-full border border-slate-200 rounded-lg p-2.5 bg-white font-bold"
                    value={artwork.approval_gates.buyer_marketing.finish_and_coating}
                    onChange={(e) =>
                      setArtwork((a) => ({
                        ...a,
                        approval_gates: {
                          ...a.approval_gates,
                          buyer_marketing: {
                            ...a.approval_gates.buyer_marketing,
                            finish_and_coating: e.target.value as any,
                          },
                        },
                      }))
                    }
                  >
                    <option value="Matte">Matte Finish (Anti-Glare Premium)</option>
                    <option value="Glossy">Glossy UV Varnish</option>
                    <option value="Soft-touch">Soft-Touch Velvety Foil</option>
                    <option value="Metallic Foil Stamp">Metallic Gold / Silver Foil Stamp</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">
                    Marketing Gate Status
                  </label>
                  <select
                    className="w-full border border-slate-200 rounded-lg p-2.5 bg-white font-bold"
                    value={artwork.approval_gates.buyer_marketing.status}
                    onChange={(e) =>
                      setArtwork((a) => ({
                        ...a,
                        approval_gates: {
                          ...a.approval_gates,
                          buyer_marketing: {
                            ...a.approval_gates.buyer_marketing,
                            status: e.target.value as any,
                            reviewed_at: new Date().toISOString(),
                          },
                        },
                      }))
                    }
                  >
                    <option value="pending">Review Pending</option>
                    <option value="approved">Brand Approved by CEO / Marketing ✓</option>
                    <option value="changes_requested">Design Tweaks Requested</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 uppercase mb-1">
                  Brand Director & Aesthetic Comments
                </label>
                <textarea
                  rows={2}
                  className="w-full border border-slate-200 rounded-lg p-2.5 bg-white leading-relaxed"
                  value={artwork.approval_gates.buyer_marketing.notes ?? ""}
                  onChange={(e) =>
                    setArtwork((a) => ({
                      ...a,
                      approval_gates: {
                        ...a.approval_gates,
                        buyer_marketing: {
                          ...a.approval_gates.buyer_marketing,
                          notes: e.target.value,
                        },
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
                  Save Marketing Sign-Off
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleSave();
                    setActiveTab("factory_proof");
                  }}
                  className="text-xs font-semibold px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span>Proceed to Gate 3: Factory Technical Proof →</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: SUPPLIER TECHNICAL PRINT PROOF (GATE 3) */}
          {activeTab === "factory_proof" && (
            <div className="space-y-4 animate-in fade-in duration-150 text-xs">
              <div className="bg-purple-50/70 border border-purple-200/80 rounded-xl p-3.5 text-purple-950 flex items-start gap-2.5">
                <span className="text-base">🏭</span>
                <div>
                  <h4 className="font-bold text-purple-900">
                    Gate 3: Factory Pre-Press & Technical Print Proof
                  </h4>
                  <p className="text-[11px] text-purple-800 mt-0.5 leading-relaxed">
                    The factory print engineer verifies that roll unwinding direction matches their rotary label applicator, the inkjet date-code window has no varnish blocking ink adhesion, and die-cut margins are within ±0.5mm.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">
                    Factory Print Engineer Name
                  </label>
                  <input
                    type="text"
                    className="w-full border border-slate-200 rounded-lg p-2.5 bg-white font-semibold"
                    value={artwork.approval_gates.supplier_technical.factory_print_engineer_name ?? ""}
                    onChange={(e) =>
                      setArtwork((a) => ({
                        ...a,
                        approval_gates: {
                          ...a.approval_gates,
                          supplier_technical: {
                            ...a.approval_gates.supplier_technical,
                            factory_print_engineer_name: e.target.value,
                          },
                        },
                      }))
                    }
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">
                    Factory Technical Proof Status
                  </label>
                  <select
                    className="w-full border border-slate-200 rounded-lg p-2.5 bg-white font-bold"
                    value={artwork.approval_gates.supplier_technical.status}
                    onChange={(e) =>
                      setArtwork((a) => ({
                        ...a,
                        approval_gates: {
                          ...a.approval_gates,
                          supplier_technical: {
                            ...a.approval_gates.supplier_technical,
                            status: e.target.value as any,
                            reviewed_at: new Date().toISOString(),
                          },
                        },
                      }))
                    }
                  >
                    <option value="pending">Proof Pending Factory Sign-off</option>
                    <option value="approved">Technical Print Proof Confirmed ✓</option>
                    <option value="changes_requested">Die / Cylinder Revision Needed</option>
                  </select>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-2.5">
                <h4 className="font-bold text-slate-800 uppercase text-[11px] mb-2">
                  Technical Pre-Press Verification Checks
                </h4>

                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                    checked={artwork.approval_gates.supplier_technical.roll_unwinding_confirmed}
                    onChange={(e) =>
                      setArtwork((a) => ({
                        ...a,
                        approval_gates: {
                          ...a.approval_gates,
                          supplier_technical: {
                            ...a.approval_gates.supplier_technical,
                            roll_unwinding_confirmed: e.target.checked,
                          },
                        },
                      }))
                    }
                  />
                  <span>Roll unwinding direction ({artwork.packaging_specs.cylinder_unwind_direction}) verified for labeling machine</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                    checked={artwork.approval_gates.supplier_technical.inkjet_code_gap_confirmed}
                    onChange={(e) =>
                      setArtwork((a) => ({
                        ...a,
                        approval_gates: {
                          ...a.approval_gates,
                          supplier_technical: {
                            ...a.approval_gates.supplier_technical,
                            inkjet_code_gap_confirmed: e.target.checked,
                          },
                        },
                      }))
                    }
                  />
                  <span>Inkjet code zone has clean unvarnished surface to prevent smudging</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                    checked={artwork.approval_gates.supplier_technical.die_cut_tolerances_confirmed}
                    onChange={(e) =>
                      setArtwork((a) => ({
                        ...a,
                        approval_gates: {
                          ...a.approval_gates,
                          supplier_technical: {
                            ...a.approval_gates.supplier_technical,
                            die_cut_tolerances_confirmed: e.target.checked,
                          },
                        },
                      }))
                    }
                  />
                  <span>Die-cut margins and bleed borders confirmed within tolerance limits</span>
                </label>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 uppercase mb-1">
                  Factory Technical Directives
                </label>
                <textarea
                  rows={2}
                  className="w-full border border-slate-200 rounded-lg p-2.5 bg-white leading-relaxed"
                  value={artwork.approval_gates.supplier_technical.notes ?? ""}
                  onChange={(e) =>
                    setArtwork((a) => ({
                      ...a,
                      approval_gates: {
                        ...a.approval_gates,
                        supplier_technical: {
                          ...a.approval_gates.supplier_technical,
                          notes: e.target.value,
                        },
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
                  Save Technical Proof
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleSave();
                    setActiveTab("release");
                  }}
                  className="text-xs font-semibold px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span>Proceed to Final Print Release & Issue PO →</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: PRINT RELEASE & ISSUE PO */}
          {activeTab === "release" && (
            <div className="space-y-4 animate-in fade-in duration-150 text-xs">
              <div className="border border-purple-200 bg-purple-50/60 rounded-xl p-4">
                <h4 className="font-bold text-purple-950 text-sm mb-3">
                  3-Way Approval Gate Verification Status
                </h4>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between bg-white/80 p-2.5 rounded-lg border border-purple-100">
                    <span className="font-medium text-slate-800">
                      1. Food Advisory Subcontractor ({artwork.approval_gates.food_advisory.advisory_company_name})
                    </span>
                    <span className="text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded text-[11px]">
                      {artwork.approval_gates.food_advisory.status === "approved" ? "Approved ✓" : "Review In Progress"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between bg-white/80 p-2.5 rounded-lg border border-purple-100">
                    <span className="font-medium text-slate-800">
                      2. Buyer Marketing & CEO ({artwork.approval_gates.buyer_marketing.approver_name})
                    </span>
                    <span className="text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded text-[11px]">
                      {artwork.approval_gates.buyer_marketing.status === "approved" ? "Approved ✓" : "Review In Progress"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between bg-white/80 p-2.5 rounded-lg border border-purple-100">
                    <span className="font-medium text-slate-800">
                      3. Supplier Pre-Press Print Engineer ({artwork.approval_gates.supplier_technical.factory_print_engineer_name || "Factory"})
                    </span>
                    <span className="text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded text-[11px]">
                      {artwork.approval_gates.supplier_technical.status === "approved" ? "Approved ✓" : "Review In Progress"}
                    </span>
                  </div>
                </div>
              </div>

              {artwork.print_master_release.is_released_to_factory ? (
                <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 text-emerald-950 text-center space-y-2">
                  <span className="text-2xl">🎉</span>
                  <h3 className="text-sm font-bold text-emerald-900">
                    High-Resolution Print Master Released to Factory!
                  </h3>
                  <p className="text-xs text-emerald-800 max-w-lg mx-auto">
                    The artwork is locked and transmitted to the supplier. The buyer can now formally issue the commercial Purchase Order (PO) to start mass manufacturing.
                  </p>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (onAdvanceToOrder) onAdvanceToOrder();
                      }}
                      className="text-xs font-bold px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition cursor-pointer shadow-md inline-flex items-center gap-2"
                    >
                      <span>📝 Issue Official Commercial Purchase Order (Stage 7) →</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                  <div>
                    {saveSuccess && (
                      <span className="text-xs text-emerald-600 font-bold">
                        ✓ Staging saved successfully!
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
                    disabled={isPending}
                    onClick={() => {
                      const updated: PackagingArtworkWorkflow = {
                        ...artwork,
                        status: "print_master_released",
                        approval_gates: {
                          food_advisory: { ...artwork.approval_gates.food_advisory, status: "approved" },
                          buyer_marketing: { ...artwork.approval_gates.buyer_marketing, status: "approved" },
                          supplier_technical: { ...artwork.approval_gates.supplier_technical, status: "approved" },
                        },
                        print_master_release: {
                          is_released_to_factory: true,
                          released_at: new Date().toISOString(),
                          released_by: `${buyerCompany} Director`,
                          signed_proof_pdf_url: artwork.packaging_specs.artwork_pdf_url || "https://.../signed_master.pdf",
                        },
                      };
                      setArtwork(updated);
                      handleSave(updated);
                      if (onAdvanceToOrder) onAdvanceToOrder();
                    }}
                    className="text-xs font-bold px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition cursor-pointer shadow-md flex items-center gap-2"
                  >
                    <span>🚀 Lock Artwork & Release Print Master to Factory</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
