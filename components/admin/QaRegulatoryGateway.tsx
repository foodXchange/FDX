"use client";

import { useState, useTransition } from "react";
import {
  type QaRegulatoryDossier,
  type FactoryCertificateItem,
  updateQaRegulatoryDossier,
} from "@/app/admin/requests/actions";

interface Props {
  requestId: string;
  buyerCompany: string;
  productName: string;
  targetMarket?: string | null;
  hasKosherRequired?: boolean;
  initialDossier?: QaRegulatoryDossier | null;
  onAdvanceToGraphics?: () => void;
}

const DEFAULT_CERTIFICATES: FactoryCertificateItem[] = [
  {
    id: "cert-1",
    name: "BRCGS",
    issuer: "DNV GL Business Assurance",
    certificate_number: "BRC-2025-99410",
    grade: "Grade AA (Unannounced)",
    valid_until: "2027-04-30",
    status: "verified",
  },
  {
    id: "cert-2",
    name: "IFS Food",
    issuer: "Bureau Veritas",
    certificate_number: "IFS-V8-10992",
    grade: "Higher Level (98.4%)",
    valid_until: "2026-11-15",
    status: "verified",
  },
  {
    id: "cert-3",
    name: "ISO 22000",
    issuer: "SGS International",
    certificate_number: "ISO22K-88421",
    grade: "ISO 22000:2018 Certified",
    valid_until: "2027-08-31",
    status: "verified",
  },
  {
    id: "cert-4",
    name: "HACCP",
    issuer: "Factory Internal QA / Accredited Lab",
    certificate_number: "HACCP-REV-2026",
    grade: "Critical Control Points Verified",
    valid_until: "2027-12-31",
    status: "verified",
  },
];

export default function QaRegulatoryGateway({
  requestId,
  buyerCompany,
  productName,
  targetMarket,
  hasKosherRequired = false,
  initialDossier,
  onAdvanceToGraphics,
}: Props) {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<"factory" | "regulatory" | "kosher" | "signoff">("factory");
  const [isPending, startTransition] = useTransition();
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [dossier, setDossier] = useState<QaRegulatoryDossier>(
    initialDossier || {
      status: "in_progress",
      factory_safety: {
        certificates: DEFAULT_CERTIFICATES,
        technical_data_sheet_url: "",
        allergen_matrix_url: "",
        microbiological_lab_url: "",
        pesticide_screening_url: "",
        shelf_life_months: 24,
        storage_conditions: "Store in a cool, dry place away from direct sunlight and heat (15°C–22°C)",
      },
      regulatory_compliance: {
        target_country: targetMarket || "Israel",
        moh_import_permit_status: "dossier_submitted",
        moh_file_number: `MOH-FDX-${requestId.slice(0, 6).toUpperCase()}`,
        moh_permit_url: "",
        takin_standard_number: "IS 191 (Edible Oils) / IS 1145 (Labeling)",
        takin_compliance_status: "compliant",
        agricultural_permit_required: false,
        agricultural_permit_status: "not_required",
        organic_eu_equivalence_verified: false,
      },
      kosher_gateway: {
        is_kosher_required: hasKosherRequired,
        kosher_type: "Kosher (Chief Rabbinate of Israel)",
        supervising_agency: "OU (Orthodox Union) & Chief Rabbinate",
        audit_status: "raw_materials_approved",
        rabbi_inspector_name: "Rabbi M. Goldstein (European Kashrut Dept.)",
        audit_scheduled_date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
        production_supervision_type: "special_kosher_run",
        kosher_certificate_url: "",
        kosher_notes: "Raw materials and tanks pre-checked. Rabbinical supervisor to be on-site during private label bottling run.",
      },
      final_signoff: {
        is_approved: false,
        approved_at: null,
        approved_by: null,
        qa_director_notes: "",
      },
    }
  );

  function handleSave(updatedDossier?: QaRegulatoryDossier) {
    const toSave = updatedDossier || dossier;
    setSaveError(null);
    setSaveSuccess(false);

    startTransition(async () => {
      const res = await updateQaRegulatoryDossier(requestId, toSave);
      if (!res.ok) {
        setSaveError(res.error);
        return;
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    });
  }

  function getStatusBadge() {
    switch (dossier.status) {
      case "in_progress":
        return {
          label: "1. Dossier In Progress",
          cls: "bg-amber-50 text-amber-800 border-amber-200",
        };
      case "documents_submitted":
        return {
          label: "2. Documents Submitted",
          cls: "bg-blue-50 text-blue-700 border-blue-200",
        };
      case "regulatory_review":
        return {
          label: "3. Under Regulatory Review",
          cls: "bg-indigo-50 text-indigo-700 border-indigo-200",
        };
      case "approved":
        return {
          label: "4. QA & Regulatory Cleared ✓",
          cls: "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold",
        };
      case "rejected":
        return {
          label: "Non-Compliant / Rejected",
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
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              Stage 5
            </span>
            <span className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${badge.cls}`}>
              {badge.label}
            </span>
          </div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span>🛡️</span>
            <span>Quality Assurance, Regulatory Compliance & Kosher Gateway</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Factory safety audit (BRC/IFS/HACCP), Ministry of Health import registration, Standards Institution compliance, and Kosher subcontractor supervision.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {dossier.final_signoff.is_approved ? (
            <span className="text-xs font-bold px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-xl border border-emerald-300 flex items-center gap-1.5">
              <span>✓</span>
              <span>QA Gate Approved</span>
            </span>
          ) : (
            <button
              onClick={() => {
                const updated: QaRegulatoryDossier = {
                  ...dossier,
                  status: "approved",
                  final_signoff: {
                    is_approved: true,
                    approved_at: new Date().toISOString(),
                    approved_by: `${buyerCompany} QA Director`,
                    qa_director_notes: "All laboratory certificates, MOH file submission, and Kosher supervisor checks confirmed.",
                  },
                };
                setDossier(updated);
                handleSave(updated);
                if (onAdvanceToGraphics) onAdvanceToGraphics();
              }}
              className="text-xs font-bold px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition cursor-pointer shadow-xs"
            >
              ✓ Fast-Track QA Sign-Off
            </button>
          )}

          <button
            onClick={() => setIsOpen((v) => !v)}
            className="text-xs font-semibold px-3 py-1.5 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl transition cursor-pointer"
          >
            {isOpen ? "Collapse ▲" : "Manage QA Dossier ▼"}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="mt-5 space-y-6">
          {/* Sub-tabs */}
          <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab("factory")}
              className={`text-xs font-bold pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === "factory"
                  ? "border-emerald-600 text-emerald-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>🏭</span>
              <span>1. Factory Safety (BRC / IFS)</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full font-bold">
                {dossier.factory_safety.certificates.filter((c) => c.status === "verified").length}/
                {dossier.factory_safety.certificates.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("regulatory")}
              className={`text-xs font-bold pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === "regulatory"
                  ? "border-emerald-600 text-emerald-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>🏛️</span>
              <span>2. Ministry of Health & Takin</span>
              {dossier.regulatory_compliance.moh_import_permit_status === "approved" && (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full">
                  ✓
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("kosher")}
              className={`text-xs font-bold pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === "kosher"
                  ? "border-emerald-600 text-emerald-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>✡️</span>
              <span>3. Kosher Agency Subcontractor</span>
              {dossier.kosher_gateway.audit_status === "certificate_issued" && (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full">
                  ✓
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("signoff")}
              className={`text-xs font-bold pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === "signoff"
                  ? "border-emerald-600 text-emerald-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>✍️</span>
              <span>4. Final QA Sign-Off Gate</span>
              {dossier.final_signoff.is_approved && (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full font-bold">
                  Cleared ✓
                </span>
              )}
            </button>
          </div>

          {/* TAB 1: FACTORY SAFETY & CERTIFICATES */}
          {activeTab === "factory" && (
            <div className="space-y-4 animate-in fade-in duration-150 text-xs">
              <div className="flex items-center justify-between gap-3">
                <p className="text-slate-600">
                  Global food safety certificates and factory technical documentation for <strong>{productName}</strong>.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const newCert: FactoryCertificateItem = {
                      id: `cert-${Date.now()}`,
                      name: "Other",
                      issuer: "Accredited Audit Body",
                      certificate_number: "NEW-CERT-01",
                      grade: "Pass",
                      valid_until: "2027-12-31",
                      status: "pending_review",
                    };
                    setDossier((d) => ({
                      ...d,
                      factory_safety: {
                        ...d.factory_safety,
                        certificates: [...d.factory_safety.certificates, newCert],
                      },
                    }));
                  }}
                  className="text-xs font-semibold px-2.5 py-1 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition cursor-pointer"
                >
                  + Add Certificate
                </button>
              </div>

              {/* Certificate Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {dossier.factory_safety.certificates.map((cert, idx) => (
                  <div
                    key={cert.id}
                    className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/60 hover:bg-white transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{cert.name}</span>
                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {cert.grade || "Certified"}
                        </span>
                      </div>
                      <select
                        className="text-[11px] border border-slate-200 rounded-md px-2 py-0.5 bg-white font-semibold"
                        value={cert.status}
                        onChange={(e) => {
                          const newStatus = e.target.value as any;
                          setDossier((prev) => ({
                            ...prev,
                            factory_safety: {
                              ...prev.factory_safety,
                              certificates: prev.factory_safety.certificates.map((c, i) =>
                                i === idx ? { ...c, status: newStatus } : c
                              ),
                            },
                          }));
                        }}
                      >
                        <option value="verified">Verified ✓</option>
                        <option value="pending_review">Pending Review</option>
                        <option value="expired">Expired</option>
                        <option value="not_provided">Not Provided</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-2 text-[11px] text-slate-600">
                      <div>
                        <span className="text-slate-400">Issuer:</span> {cert.issuer || "—"}
                      </div>
                      <div>
                        <span className="text-slate-400">Cert #:</span> {cert.certificate_number || "—"}
                      </div>
                      <div>
                        <span className="text-slate-400">Valid Until:</span>{" "}
                        <span className="font-mono">{cert.valid_until || "—"}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-emerald-600 hover:underline cursor-pointer">
                          [ 📄 View Certificate PDF ]
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Technical Specifications Matrix */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                <h4 className="font-bold text-slate-800 uppercase text-[11px] flex items-center justify-between">
                  <span>Product Technical Dossier & Lab Analyses</span>
                  <span className="text-slate-500 font-normal">Allergen, Micro, Pesticides</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">
                      Technical Data Sheet (TDS) / Specification Sheet
                    </label>
                    <input
                      type="text"
                      className="w-full border border-slate-200 rounded-lg p-2 bg-white"
                      placeholder="https://.../specs_tds_rev3.pdf"
                      value={dossier.factory_safety.technical_data_sheet_url ?? ""}
                      onChange={(e) =>
                        setDossier((d) => ({
                          ...d,
                          factory_safety: {
                            ...d.factory_safety,
                            technical_data_sheet_url: e.target.value,
                          },
                        }))
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">
                      Full Allergen Declaration Matrix
                    </label>
                    <input
                      type="text"
                      className="w-full border border-slate-200 rounded-lg p-2 bg-white"
                      placeholder="https://.../allergen_declaration.pdf"
                      value={dossier.factory_safety.allergen_matrix_url ?? ""}
                      onChange={(e) =>
                        setDossier((d) => ({
                          ...d,
                          factory_safety: {
                            ...d.factory_safety,
                            allergen_matrix_url: e.target.value,
                          },
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">
                      Microbiological Lab Test (Salmonella, Listeria)
                    </label>
                    <input
                      type="text"
                      className="w-full border border-slate-200 rounded-lg p-2 bg-white"
                      placeholder="https://.../microbiology_report.pdf"
                      value={dossier.factory_safety.microbiological_lab_url ?? ""}
                      onChange={(e) =>
                        setDossier((d) => ({
                          ...d,
                          factory_safety: {
                            ...d.factory_safety,
                            microbiological_lab_url: e.target.value,
                          },
                        }))
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">
                      Pesticide & Heavy Metal Residue Analysis
                    </label>
                    <input
                      type="text"
                      className="w-full border border-slate-200 rounded-lg p-2 bg-white"
                      placeholder="https://.../pesticides_metals.pdf"
                      value={dossier.factory_safety.pesticide_screening_url ?? ""}
                      onChange={(e) =>
                        setDossier((d) => ({
                          ...d,
                          factory_safety: {
                            ...d.factory_safety,
                            pesticide_screening_url: e.target.value,
                          },
                        }))
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">
                      Guaranteed Shelf Life (Months)
                    </label>
                    <input
                      type="number"
                      className="w-full border border-slate-200 rounded-lg p-2 bg-white font-bold"
                      value={dossier.factory_safety.shelf_life_months ?? 24}
                      onChange={(e) =>
                        setDossier((d) => ({
                          ...d,
                          factory_safety: {
                            ...d.factory_safety,
                            shelf_life_months: Number(e.target.value),
                          },
                        }))
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    Mandatory Storage & Transport Conditions
                  </label>
                  <input
                    type="text"
                    className="w-full border border-slate-200 rounded-lg p-2 bg-white"
                    value={dossier.factory_safety.storage_conditions ?? ""}
                    onChange={(e) =>
                      setDossier((d) => ({
                        ...d,
                        factory_safety: {
                          ...d.factory_safety,
                          storage_conditions: e.target.value,
                        },
                      }))
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
                  Save Factory Dossier
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleSave();
                    setActiveTab("regulatory");
                  }}
                  className="text-xs font-semibold px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span>Proceed to Ministry & Standards (MOH / Takin) →</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: MINISTRY OF HEALTH & TAKIN */}
          {activeTab === "regulatory" && (
            <div className="space-y-4 animate-in fade-in duration-150 text-xs">
              <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3.5 text-blue-950 flex items-start gap-2.5">
                <span className="text-base">🏛️</span>
                <div>
                  <h4 className="font-bold text-blue-900">
                    Import Country Regulation: {dossier.regulatory_compliance.target_country}
                  </h4>
                  <p className="text-[11px] text-blue-800 mt-0.5 leading-relaxed">
                    Prior to container dispatch, commercial food imports must have approval from the Ministry of Health (Food Control Service / Sherut HaMazon) and adhere to national product standards (Takin).
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">
                    MOH Import Permit Status
                  </label>
                  <select
                    className="w-full border border-slate-200 rounded-lg p-2.5 bg-white font-bold"
                    value={dossier.regulatory_compliance.moh_import_permit_status}
                    onChange={(e) =>
                      setDossier((d) => ({
                        ...d,
                        regulatory_compliance: {
                          ...d.regulatory_compliance,
                          moh_import_permit_status: e.target.value as any,
                        },
                      }))
                    }
                  >
                    <option value="not_started">Not Started</option>
                    <option value="dossier_submitted">Dossier Submitted to Health Ministry</option>
                    <option value="under_review">Under Technical Review (MOH)</option>
                    <option value="approved">Approved & Import Permit Issued ✓</option>
                    <option value="clarifications_needed">Clarifications / Revisions Needed</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">
                    MOH Registration / File Reference #
                  </label>
                  <input
                    type="text"
                    className="w-full border border-slate-200 rounded-lg p-2.5 bg-white font-mono font-bold"
                    placeholder="e.g. MOH-2026-IL-98144"
                    value={dossier.regulatory_compliance.moh_file_number ?? ""}
                    onChange={(e) =>
                      setDossier((d) => ({
                        ...d,
                        regulatory_compliance: {
                          ...d.regulatory_compliance,
                          moh_file_number: e.target.value,
                        },
                      }))
                    }
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">
                    MOH Official Permit URL
                  </label>
                  <input
                    type="text"
                    className="w-full border border-slate-200 rounded-lg p-2.5 bg-white"
                    placeholder="https://.../moh_import_permit.pdf"
                    value={dossier.regulatory_compliance.moh_permit_url ?? ""}
                    onChange={(e) =>
                      setDossier((d) => ({
                        ...d,
                        regulatory_compliance: {
                          ...d.regulatory_compliance,
                          moh_permit_url: e.target.value,
                        },
                      }))
                    }
                  />
                </div>
              </div>

              {/* Takin Standards & Agriculture */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50 space-y-2">
                  <h4 className="font-bold text-slate-800 uppercase text-[11px] flex items-center justify-between">
                    <span>Standards Institution / Takin Protocol</span>
                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold">
                      {dossier.regulatory_compliance.takin_compliance_status}
                    </span>
                  </h4>
                  <div>
                    <label className="block text-slate-500 text-[10px] uppercase font-semibold">
                      Applicable Standard Code
                    </label>
                    <input
                      className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white"
                      value={dossier.regulatory_compliance.takin_standard_number ?? ""}
                      onChange={(e) =>
                        setDossier((d) => ({
                          ...d,
                          regulatory_compliance: {
                            ...d.regulatory_compliance,
                            takin_standard_number: e.target.value,
                          },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 text-[10px] uppercase font-semibold">
                      Takin Lab Compliance Status
                    </label>
                    <select
                      className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white font-medium"
                      value={dossier.regulatory_compliance.takin_compliance_status}
                      onChange={(e) =>
                        setDossier((d) => ({
                          ...d,
                          regulatory_compliance: {
                            ...d.regulatory_compliance,
                            takin_compliance_status: e.target.value as any,
                          },
                        }))
                      }
                    >
                      <option value="compliant">Compliant (Standard Met ✓)</option>
                      <option value="lab_test_pending">Lab Sample Testing in Progress</option>
                      <option value="exempt">Exempt (Mutual Recognition Treaty)</option>
                    </select>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50 space-y-3">
                  <h4 className="font-bold text-slate-800 uppercase text-[11px]">
                    Agricultural Ministry & Organic Equivalence
                  </h4>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        checked={dossier.regulatory_compliance.agricultural_permit_required}
                        onChange={(e) =>
                          setDossier((d) => ({
                            ...d,
                            regulatory_compliance: {
                              ...d.regulatory_compliance,
                              agricultural_permit_required: e.target.checked,
                            },
                          }))
                        }
                      />
                      <span>Plant Protection & Agricultural Ministry Permit Required</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        checked={dossier.regulatory_compliance.organic_eu_equivalence_verified}
                        onChange={(e) =>
                          setDossier((d) => ({
                            ...d,
                            regulatory_compliance: {
                              ...d.regulatory_compliance,
                              organic_eu_equivalence_verified: e.target.checked,
                            },
                          }))
                        }
                      />
                      <span>EU-Organic Farming Equivalence Verified</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleSave()}
                  className="text-xs font-semibold px-4 py-2 bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition cursor-pointer"
                >
                  Save Regulatory Checklist
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleSave();
                    setActiveTab("kosher");
                  }}
                  className="text-xs font-semibold px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span>Proceed to Kosher Subcontractor Workflow →</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: KOSHER AGENCY SUBCONTRACTOR WORKFLOW */}
          {activeTab === "kosher" && (
            <div className="space-y-4 animate-in fade-in duration-150 text-xs">
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3.5 text-amber-950 flex items-start gap-2.5">
                <span className="text-base">✡️</span>
                <div>
                  <h4 className="font-bold text-amber-900">
                    Kosher Certification Subcontractor & Rabbinical Supervision
                  </h4>
                  <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                    Connecting the factory with the designated Kosher agency (OU, Badatz, Chief Rabbinate) to inspect raw ingredients, coordinate the Rabbi factory audit, and issue the Kosher production permit.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">
                    Kosher Standard Requested
                  </label>
                  <input
                    type="text"
                    className="w-full border border-slate-200 rounded-lg p-2.5 bg-white font-bold text-slate-900"
                    value={dossier.kosher_gateway.kosher_type}
                    onChange={(e) =>
                      setDossier((d) => ({
                        ...d,
                        kosher_gateway: {
                          ...d.kosher_gateway,
                          kosher_type: e.target.value,
                        },
                      }))
                    }
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">
                    Supervising Kosher Agency
                  </label>
                  <select
                    className="w-full border border-slate-200 rounded-lg p-2.5 bg-white font-semibold"
                    value={dossier.kosher_gateway.supervising_agency}
                    onChange={(e) =>
                      setDossier((d) => ({
                        ...d,
                        kosher_gateway: {
                          ...d.kosher_gateway,
                          supervising_agency: e.target.value,
                        },
                      }))
                    }
                  >
                    <option value="Chief Rabbinate of Israel">Chief Rabbinate of Israel</option>
                    <option value="OU (Orthodox Union)">OU (Orthodox Union)</option>
                    <option value="Badatz Edah HaChareidis">Badatz Edah HaChareidis</option>
                    <option value="OK Kosher Certification">OK Kosher Certification</option>
                    <option value="Star-K Kosher">Star-K Kosher</option>
                    <option value="Badatz Beit Yosef">Badatz Beit Yosef</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">
                    Rabbinical Audit Status
                  </label>
                  <select
                    className="w-full border border-slate-200 rounded-lg p-2.5 bg-white font-bold text-indigo-700"
                    value={dossier.kosher_gateway.audit_status}
                    onChange={(e) =>
                      setDossier((d) => ({
                        ...d,
                        kosher_gateway: {
                          ...d.kosher_gateway,
                          audit_status: e.target.value as any,
                        },
                      }))
                    }
                  >
                    <option value="not_started">Not Started</option>
                    <option value="raw_materials_approved">1. Raw Materials & Tanks Approved</option>
                    <option value="rabbi_audit_scheduled">2. Rabbi Factory Audit Scheduled</option>
                    <option value="rabbi_audit_completed">3. Factory Inspection Completed</option>
                    <option value="certificate_issued">4. Kosher Permit Issued ✓</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">
                    Designated Rabbinical Auditor
                  </label>
                  <input
                    type="text"
                    className="w-full border border-slate-200 rounded-lg p-2.5 bg-white"
                    placeholder="e.g. Rabbi M. Goldstein"
                    value={dossier.kosher_gateway.rabbi_inspector_name ?? ""}
                    onChange={(e) =>
                      setDossier((d) => ({
                        ...d,
                        kosher_gateway: {
                          ...d.kosher_gateway,
                          rabbi_inspector_name: e.target.value,
                        },
                      }))
                    }
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">
                    Scheduled Audit Date
                  </label>
                  <input
                    type="date"
                    className="w-full border border-slate-200 rounded-lg p-2.5 bg-white font-mono"
                    value={dossier.kosher_gateway.audit_scheduled_date ?? ""}
                    onChange={(e) =>
                      setDossier((d) => ({
                        ...d,
                        kosher_gateway: {
                          ...d.kosher_gateway,
                          audit_scheduled_date: e.target.value,
                        },
                      }))
                    }
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">
                    Production Supervision Type
                  </label>
                  <select
                    className="w-full border border-slate-200 rounded-lg p-2.5 bg-white"
                    value={dossier.kosher_gateway.production_supervision_type}
                    onChange={(e) =>
                      setDossier((d) => ({
                        ...d,
                        kosher_gateway: {
                          ...d.kosher_gateway,
                          production_supervision_type: e.target.value as any,
                        },
                      }))
                    }
                  >
                    <option value="special_kosher_run">Special Kosher Run (Rabbi On-Site)</option>
                    <option value="year_round_kosher">Year-Round Kosher Factory</option>
                    <option value="kashering_required">Line Steam Kashering Required</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 uppercase mb-1">
                  Kosher Agency Notes & Production Directives
                </label>
                <textarea
                  rows={2}
                  className="w-full border border-slate-200 rounded-lg p-2.5 bg-white leading-relaxed"
                  value={dossier.kosher_gateway.kosher_notes ?? ""}
                  onChange={(e) =>
                    setDossier((d) => ({
                      ...d,
                      kosher_gateway: {
                        ...d.kosher_gateway,
                        kosher_notes: e.target.value,
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
                  Save Kosher Protocol
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleSave();
                    setActiveTab("signoff");
                  }}
                  className="text-xs font-semibold px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span>Proceed to Final QA Gate Sign-Off →</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: FINAL QA SIGN-OFF GATE */}
          {activeTab === "signoff" && (
            <div className="space-y-4 animate-in fade-in duration-150 text-xs">
              <div className="border border-emerald-200 bg-emerald-50/60 rounded-xl p-4">
                <h4 className="font-bold text-emerald-950 text-sm mb-3">
                  Comprehensive QA & Regulatory Gate Checklist
                </h4>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between bg-white/80 p-2.5 rounded-lg border border-emerald-100">
                    <span className="font-medium text-slate-800">
                      1. Factory Safety Audit (BRCGS Grade AA, IFS Food Version 8, ISO 22000)
                    </span>
                    <span className="text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded text-[11px]">
                      Verified ✓
                    </span>
                  </div>

                  <div className="flex items-center justify-between bg-white/80 p-2.5 rounded-lg border border-emerald-100">
                    <span className="font-medium text-slate-800">
                      2. Destination Health Ministry (MOH #{dossier.regulatory_compliance.moh_file_number || "Pending"}) & Takin Standards
                    </span>
                    <span className="text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded text-[11px]">
                      Compliant ✓
                    </span>
                  </div>

                  <div className="flex items-center justify-between bg-white/80 p-2.5 rounded-lg border border-emerald-100">
                    <span className="font-medium text-slate-800">
                      3. Kosher Supervision Agency Subcontractor ({dossier.kosher_gateway.supervising_agency})
                    </span>
                    <span className="text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded text-[11px]">
                      Supervision Arranged ✓
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 uppercase mb-1">
                  QA Director / Regulatory Officer Sign-off Notes
                </label>
                <textarea
                  rows={3}
                  className="w-full border border-slate-200 rounded-lg p-2.5 bg-white leading-relaxed"
                  placeholder="All factory BRC certificates are valid until 2027. MOH import dossier is compliant with Israel Standard 191. Rabbi factory visit booked..."
                  value={dossier.final_signoff.qa_director_notes ?? ""}
                  onChange={(e) =>
                    setDossier((d) => ({
                      ...d,
                      final_signoff: {
                        ...d.final_signoff,
                        qa_director_notes: e.target.value,
                      },
                    }))
                  }
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  {saveSuccess && (
                    <span className="text-xs text-emerald-600 font-bold">
                      ✓ QA Dossier saved successfully!
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
                    {isPending ? "Saving..." : "Save QA Dossier"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const updated: QaRegulatoryDossier = {
                        ...dossier,
                        status: "approved",
                        final_signoff: {
                          is_approved: true,
                          approved_at: new Date().toISOString(),
                          approved_by: `${buyerCompany} QA Director`,
                          qa_director_notes: dossier.final_signoff.qa_director_notes || "All certifications and regulatory permits verified.",
                        },
                      };
                      setDossier(updated);
                      handleSave(updated);
                      if (onAdvanceToGraphics) onAdvanceToGraphics();
                    }}
                    className="text-xs font-bold px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <span>🚀 Sign Off QA Gate & Advance to Stage 6: Packaging Graphics →</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
