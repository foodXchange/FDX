"use client";

import Link from "next/link";

export interface OnboardingChecklistProps {
  productCount: number;
  publishedCount: number;
  profileComplete: boolean;
  hasCertifications?: boolean;
  hasKosher?: boolean;
  hasExportContacts?: boolean;
}

export default function OnboardingChecklist({
  productCount,
  publishedCount,
  profileComplete,
  hasCertifications = false,
  hasKosher = false,
  hasExportContacts = false,
}: OnboardingChecklistProps) {
  const steps = [
    {
      id: "catalog",
      title: "Publish Export Products",
      desc: "List at least 1 active product with packaging format & net weight for buyer discovery.",
      weight: 25,
      done: publishedCount > 0,
      href: "/en/supplier-portal/products",
      actionText: "Manage Products →",
      badge: "Commercial",
      guideHref: "/en/help/building-a-strong-supplier-profile",
      guideLabel: "Catalog Specs Guide",
    },
    {
      id: "profile",
      title: "Company Profile & Export Contact",
      desc: "Factory overview and direct phone/WhatsApp of your export sales department.",
      weight: 25,
      done: profileComplete || hasExportContacts,
      href: "/en/supplier-portal/profile",
      actionText: "Edit Profile →",
      badge: "Account",
      guideHref: "/en/help/registering-as-a-supplier",
      guideLabel: "Profile Setup Guide",
    },
    {
      id: "quality",
      title: "Quality Certifications (GFSI)",
      desc: "BRCGS, IFS Food, ISO 22000, or HACCP — required for Israeli Ministry of Health customs clearance.",
      weight: 25,
      done: hasCertifications,
      href: "/en/supplier-portal/profile",
      actionText: "Add Certificates →",
      badge: "Regulatory",
      guideHref: "/en/import-guide/brc-global-standard-do-israeli-buyers-require-it",
      guideLabel: "GFSI Import Standards",
    },
    {
      id: "kosher",
      title: "Kosher & Dietary Readiness",
      desc: "Declare Kosher status (Chief Rabbinate, OU, OK, Badatz, or Non-Kosher) for Israeli supermarket distribution.",
      weight: 25,
      done: hasKosher,
      href: "/en/supplier-portal/profile",
      actionText: "Declare Kosher Status →",
      badge: "Compliance",
      guideHref: "/en/import-guide/introduction-to-kosher-certification-for-food-exporters",
      guideLabel: "Kosher Compliance Guide",
    },
  ];

  const totalScore = steps.reduce((acc, s) => acc + (s.done ? s.weight : 0), 0);

  // If already 100%, show verified badge
  const isFullyReady = totalScore === 100;

  return (
    <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-7 shadow-xl mb-8 relative overflow-hidden">
      {/* Background glow accent */}
      <div className="absolute top-0 right-1/4 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header & Score Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-orange-400">
              Export Readiness Console
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-xs font-semibold text-slate-300">Target: Israeli Retail Chains</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>🇮🇱 Retail Export Readiness:</span>
            <span className={totalScore >= 75 ? "text-emerald-400" : "text-orange-400"}>
              {totalScore}%
            </span>
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold border ${
              isFullyReady
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                : "bg-orange-500/15 text-orange-300 border-orange-500/30"
            }`}
          >
            {isFullyReady ? "✓ High Priority Sourcing Status" : "Action Required to Qualify"}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-4 mb-2">
        <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              totalScore >= 75
                ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                : "bg-gradient-to-r from-orange-500 to-amber-400"
            }`}
            style={{ width: `${totalScore}%` }}
          />
        </div>
        <p className="text-[11px] text-slate-400 mt-2">
          💡 <span className="text-slate-300 font-semibold">Commercial Impact:</span> Pre-audited factories with 75%+ readiness receive priority placement when Israeli supermarket category managers request quotes.
        </p>
      </div>

      {/* Checklist items grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-5">
        {steps.map((step) => (
          <div
            key={step.id}
            className={`p-4 rounded-2xl border transition relative flex flex-col justify-between ${
              step.done
                ? "bg-emerald-950/20 border-emerald-500/30"
                : "bg-slate-800/50 border-slate-700/60 hover:border-slate-600"
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700">
                  {step.badge}
                </span>
                <span
                  className={`text-xs font-bold flex items-center gap-1 ${
                    step.done ? "text-emerald-400" : "text-slate-500"
                  }`}
                >
                  {step.done ? "✓ Completed (+25%)" : `Pending (+${step.weight}%)`}
                </span>
              </div>

              <h4 className={`text-sm font-bold ${step.done ? "text-slate-200" : "text-white"}`}>
                {step.title}
              </h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">{step.desc}</p>

              <div className="mt-2.5">
                <Link
                  href={step.guideHref}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-orange-400 transition underline decoration-slate-700 hover:decoration-orange-500"
                >
                  <span>📖 {step.guideLabel}</span>
                  <span>&rarr;</span>
                </Link>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                {step.done ? "Requirement verified" : "Action needed"}
              </span>

              {!step.done ? (
                <Link
                  href={step.href}
                  className="inline-flex items-center gap-1 text-xs font-bold text-orange-400 hover:text-orange-300 transition"
                >
                  <span>{step.actionText}</span>
                </Link>
              ) : (
                <Link
                  href={step.href}
                  className="text-xs font-semibold text-slate-400 hover:text-slate-300 transition"
                >
                  Edit details
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
