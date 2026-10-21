"use client";

import { useState } from "react";
import Link from "next/link";
import LabelComplianceModal from "./LabelComplianceModal";
import { SAMPLE_ARTWORK_PRESETS } from "@/lib/compliance/labelComplianceEngine";

export default function LabelComplianceDashboard() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPresetKey, setSelectedPresetKey] = useState("canned-tomatoes");

  function openPreset(key: string) {
    setSelectedPresetKey(key);
    setModalOpen(true);
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-1/4 w-72 h-72 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Israeli Food Standard SI 1145 &amp; Red Warning Badges
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Hebrew Packaging &amp; Regulatory AI Reviewer
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
              Verify private-label packaging artwork before committing to factory plate engraving. Audit mandatory Hebrew denominations, ingredient order, allergen boxes, Chief Rabbinate kosher certificates, and front-of-package red warning circles.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/25 transition cursor-pointer"
            >
              <span>🏷️</span>
              <span>Open Packaging Reviewer</span>
            </button>

            <Link
              href="/admin/pipeline"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            >
              <span>← Back to Deal Pipeline</span>
            </Link>
          </div>
        </div>

        {/* Regulations KPI Summary */}
        <div className="mt-8 pt-6 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center sm:text-left">
          <div>
            <div className="text-xs text-slate-400">Sodium Red Warning</div>
            <div className="text-xl font-black text-red-400 mt-0.5">&ge; 400 mg / 100g</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Sugar Red Warning</div>
            <div className="text-xl font-black text-red-400 mt-0.5">&ge; 10.0 g / 100g</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Sat Fat Red Warning</div>
            <div className="text-xl font-black text-red-400 mt-0.5">&ge; 4.0 g / 100g</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Standard SI 1145</div>
            <div className="text-xl font-black text-emerald-400 mt-0.5">Mandatory Hebrew</div>
          </div>
        </div>
      </div>

      {/* Preset Cards Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Sample European Packaging Scenarios (Click to Audit):
          </h2>
          <span className="text-xs text-slate-500">4 Reference Presets</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(SAMPLE_ARTWORK_PRESETS).map(([key, item]) => {
            const isApproved = item.report.status === "APPROVED";
            const isConditional = item.report.status === "CONDITIONAL_APPROVAL";

            return (
              <div
                key={key}
                onClick={() => openPreset(key)}
                className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-orange-500 hover:shadow-md transition cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      {item.category}
                    </span>
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                        isApproved
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : isConditional
                          ? "bg-amber-50 text-amber-800 border-amber-200"
                          : "bg-red-50 text-red-800 border-red-200"
                      }`}
                    >
                      {item.report.status.replace("_", " ")}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-orange-600 transition">
                    {item.name}
                  </h3>

                  <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Score:</span>
                      <span className="font-bold text-slate-800">{item.report.overallScore}/100</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Red Badges:</span>
                      <span className={`font-bold ${item.report.redLabels.count > 0 ? "text-red-600" : "text-emerald-600"}`}>
                        {item.report.redLabels.count > 0 ? `${item.report.redLabels.count} Badges Required` : "0 (Clean Label)"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-orange-600 font-bold">
                  <span>Open Audit Specs</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Regulatory Explainer Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 shadow-xs">
          <div className="text-2xl">📜</div>
          <h3 className="text-sm font-bold text-slate-900">Standard SI 1145 (ת״י 1145)</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            All pre-packaged foods sold in Israeli supermarkets must include product name, descending ingredient order, Israeli importer registration number, and clear storage instructions in Hebrew.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 shadow-xs">
          <div className="text-2xl">🔴</div>
          <h3 className="text-sm font-bold text-slate-900">Front-of-Package Red Badges</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Foods exceeding 400mg sodium, 10g sugars, or 4g saturated fats per 100g must feature prominent red warning circles on the front display panel, minimum 15mm diameter.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 shadow-xs">
          <div className="text-2xl">✡️</div>
          <h3 className="text-sm font-bold text-slate-900">Chief Rabbinate Approval</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Under Israeli Fraud in Kashrut legislation, packaging cannot use the term &quot;Kosher&quot; without explicit mention of Chief Rabbinate of Israel import division authorization (אישור הרה״ר).
          </p>
        </div>
      </div>

      {/* Embedded Modal */}
      <LabelComplianceModal
        deal={null}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
