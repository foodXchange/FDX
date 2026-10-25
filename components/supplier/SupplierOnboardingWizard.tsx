"use client";

import React, { useState } from "react";
import Link from "next/link";
import { submitSupplierOnboarding, type SupplierOnboardingPayload } from "@/app/supplier/onboarding/actions";

const COUNTRIES = [
  { code: "IT", name: "Italy", flag: "🇮🇹", port: "Port of Salerno / Genoa / Gioia Tauro" },
  { code: "ES", name: "Spain", flag: "🇪🇸", port: "Port of Valencia / Barcelona" },
  { code: "GR", name: "Greece", flag: "🇬🇷", port: "Port of Piraeus / Thessaloniki" },
  { code: "FR", name: "France", flag: "🇫🇷", port: "Port of Marseille / Le Havre" },
  { code: "PL", name: "Poland", flag: "🇵🇱", port: "Port of Gdynia / Gdansk" },
  { code: "PT", name: "Portugal", flag: "🇵🇹", port: "Port of Sines / Lisbon" },
  { code: "DE", name: "Germany", flag: "🇩🇪", port: "Port of Hamburg / Bremerhaven" },
  { code: "TR", name: "Turkey", flag: "🇹🇷", port: "Port of Mersin / Izmir / Istanbul" },
  { code: "OTHER", name: "Other European Union", flag: "🇪🇺", port: "Nearest International Port" },
];

const GFSI_CERTIFICATIONS = [
  { id: "BRCGS Food (Grade AA/A)", label: "BRCGS Food Safety (Grade AA / A)", icon: "🏆" },
  { id: "IFS Food (Higher Level)", label: "IFS Food (Higher Level Version 8)", icon: "🛡️" },
  { id: "FSSC 22000", label: "FSSC 22000 Food Safety System", icon: "🔬" },
  { id: "ISO 22000", label: "ISO 22000:2018 Management System", icon: "📋" },
  { id: "Organic / BIO (EU 848/2018)", label: "EU Organic / BIO Certification (848/2018)", icon: "🌿" },
  { id: "Non-GMO Project", label: "Non-GMO IP Verified", icon: "🌱" },
  { id: "HACCP & GMP", label: "HACCP & Codex Alimentarius GMP", icon: "✅" },
];

const KOSHER_STANDARDS = [
  { id: "chief_rabbinate", label: "Chief Rabbinate of Israel Recognized (רבנות ראשית לישראל)", badge: "Highest Israeli Acceptance" },
  { id: "ou", label: "Orthodox Union (OU) - Global Gold Standard", badge: "Universal Recognition" },
  { id: "badatz", label: "Badatz (Edah HaChareidis / Mehadrin / Beit Yosef)", badge: "Strict Mehadrin Standard" },
  { id: "ok", label: "OK Kosher Certification", badge: "International Standard" },
  { id: "star_k", label: "Star-K Kosher Certification", badge: "International Standard" },
  { id: "local_eu", label: "European Local Community Rabbinate", badge: "European Community" },
  { id: "open_to_kosher", label: "Not Yet Certified — Willing to Host Kosher Production Run", badge: "Turnkey Kosher Onboarding" },
];

const CATEGORIES = [
  { id: "Dry Pasta & Semolina", label: "Dry Pasta & Bronze-Cut Semolina", icon: "🍝" },
  { id: "Extra Virgin Olive Oil & Oils", label: "Extra Virgin Olive Oil (EVOO) & Seed Oils", icon: "🫒" },
  { id: "Tomato Passata, Pulp & Sauces", label: "Tomato Passata, Polpa & Pasta Sauces", icon: "🍅" },
  { id: "Canned Legumes & Pulses", label: "Canned Legumes, Beans & Chickpeas", icon: "🥫" },
  { id: "Taralli, Crackers & Bakery", label: "Italian Taralli, Grissini & Artisanal Bakery", icon: "🥖" },
  { id: "Plant-Based & Dairy Alternatives", label: "Plant-Based Milks (Oat/Almond) & Spreads", icon: "🥛" },
  { id: "Balsamic Vinegar & Condiments", label: "Aceto Balsamico di Modena & Condiments", icon: "🍇" },
  { id: "Confectionery & Chocolate", label: "Confectionery, Chocolate & Sweet Spreads", icon: "🍫" },
  { id: "Frozen Foods & Ready Meals", label: "Frozen Vegetables, Pizza & Ready Meals", icon: "❄️" },
];

export default function SupplierOnboardingWizard() {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<{ supplierId: string; companyName: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State - Step 1: Company
  const [companyName, setCompanyName] = useState("Pastificio Attilio Mastromauro Granoro S.r.l.");
  const [country, setCountry] = useState("Italy");
  const [cityRegion, setCityRegion] = useState("Corato (Bari), Puglia");
  const [euVatNumber, setEuVatNumber] = useState("IT00259830726");
  const [nearestPort, setNearestPort] = useState("Port of Salerno / Genoa, Italy");
  const [contactName, setContactName] = useState("Marco De Santis");
  const [contactTitle, setContactTitle] = useState("Director of International Export");
  const [contactEmail, setContactEmail] = useState("export@granoro.it");
  const [contactPhone, setContactPhone] = useState("+39 080 872 1611");
  const [website, setWebsite] = useState("https://www.granoro.it");
  const [yearEstablished, setYearEstablished] = useState<number>(1967);
  const [annualCapacity, setAnnualCapacity] = useState("120,000 Metric Tons / Year");

  // Step 2: GFSI & QA
  const [selectedCerts, setSelectedCerts] = useState<string[]>([
    "BRCGS Food (Grade AA/A)",
    "IFS Food (Higher Level)",
    "ISO 22000",
  ]);
  const [certExpiryDate, setCertExpiryDate] = useState("2027-11-30");
  const [hasInHouseLab, setHasInHouseLab] = useState<boolean>(true);
  const [si1145Ready, setSi1145Ready] = useState<boolean>(true);
  const [allergenSegregation, setAllergenSegregation] = useState<"dedicated_lines" | "shared_validated_cleaning" | "none">("dedicated_lines");

  // Step 3: Kosher
  const [kosherStatus, setKosherStatus] = useState<string>("chief_rabbinate");
  const [kosherTypes, setKosherTypes] = useState<string[]>(["Kosher Pareve", "Chief Rabbinate Approved"]);
  const [passoverCapable, setPassoverCapable] = useState<boolean>(true);
  const [rabbinicalAgency, setRabbinicalAgency] = useState("Chief Rabbinate of Israel / OU Kosher");
  const [kosherCertExpiry, setKosherCertExpiry] = useState("2027-12-31");

  // Step 4: OEM & Logistics
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    "Dry Pasta & Semolina",
    "Tomato Passata, Pulp & Sauces",
  ]);
  const [privateLabel, setPrivateLabel] = useState<boolean>(true);
  const [ownBrand, setOwnBrand] = useState<boolean>(true);
  const [foodserviceBulk, setFoodserviceBulk] = useState<boolean>(false);
  const [palletStandards, setPalletStandards] = useState<string[]>([
    "EPAL Euro-Pallet (120x80cm)",
    "Israeli Supermarket Pallet (120x100cm)",
  ]);
  const [moqType, setMoqType] = useState<"fcl_only" | "mixed_container_consolidation" | "lcl_pallet">("mixed_container_consolidation");
  const [leadTimeDays, setLeadTimeDays] = useState<number>(21);
  const [sampleKitPolicy, setSampleKitPolicy] = useState<"free_up_to_6" | "buyer_pays_freight" | "spec_only">("free_up_to_6");
  const [accepts3070Escrow, setAccepts3070Escrow] = useState<boolean>(true);
  const [ibanSwift, setIbanSwift] = useState("IT60X0542811101000000123456");

  // Step 5: Signer
  const [signerName, setSignerName] = useState("Marco De Santis");
  const [signerTitle, setSignerTitle] = useState("Export Managing Director");
  const [agreedTerms, setAgreedTerms] = useState<boolean>(true);

  // Country Selection Helper
  const handleSelectCountry = (c: typeof COUNTRIES[0]) => {
    setCountry(c.name);
    setNearestPort(c.port);
    if (!euVatNumber || euVatNumber.startsWith("IT") || euVatNumber.startsWith("ES")) {
      setEuVatNumber(`${c.code}`);
    }
  };

  // Toggle Helpers
  const toggleCert = (id: string) => {
    setSelectedCerts((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const toggleCategory = (id: string) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const togglePallet = (p: string) => {
    setPalletStandards((prev) =>
      prev.includes(p) ? prev.filter((item) => item !== p) : [...prev, p]
    );
  };

  const toggleKosherType = (kt: string) => {
    setKosherTypes((prev) =>
      prev.includes(kt) ? prev.filter((item) => item !== kt) : [...prev, kt]
    );
  };

  // Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreedTerms) {
      alert("Please confirm the authorization declaration to complete onboarding.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const payload: SupplierOnboardingPayload = {
      companyName,
      country,
      cityRegion,
      euVatNumber,
      nearestPort,
      contactName,
      contactTitle,
      contactEmail,
      contactPhone,
      website,
      yearEstablished,
      annualCapacity,
      certifications: selectedCerts,
      certExpiryDate,
      hasInHouseLab,
      si1145Ready,
      allergenSegregation,
      kosherStatus,
      kosherTypes,
      passoverCapable,
      rabbinicalAgency,
      kosherCertExpiry,
      categories: selectedCategories,
      privateLabel,
      ownBrand,
      foodserviceBulk,
      palletStandards,
      moqType,
      leadTimeDays,
      sampleKitPolicy,
      accepts3070Escrow,
      ibanSwift,
      signerName,
      signerTitle,
    };

    const res = await submitSupplierOnboarding(payload);
    setIsSubmitting(false);

    if (res.ok && res.supplierId) {
      setSubmissionSuccess({ supplierId: res.supplierId, companyName: res.companyName || companyName });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setErrorMsg(res.error || "Failed to submit onboarding form. Please review your fields.");
    }
  };

  // If already submitted successfully, render confirmation screen
  if (submissionSuccess) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6">
        <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-8 sm:p-12 shadow-2xl text-center space-y-6">
          <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-3xl mx-auto flex items-center justify-center text-4xl shadow-inner">
            ✓
          </div>

          <div className="space-y-2">
            <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest bg-emerald-950/60 border border-emerald-800/50 px-3 py-1 rounded-full">
              Factory Successfully Verified & Onboarded
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome to FoodXchange, {submissionSuccess.companyName}!
            </h1>
            <p className="text-sm text-slate-400 max-w-xl mx-auto">
              Your factory profile, GFSI credentials, and private label OEM specifications have been validated and published to the Israeli supermarket sourcing engine.
            </p>
          </div>

          {/* Supplier Credential Card */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 text-left max-w-lg mx-auto space-y-3 text-xs">
            <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
              <span className="text-slate-400">Assigned FDX Supplier ID:</span>
              <span className="font-mono font-bold text-orange-400 text-sm">{submissionSuccess.supplierId}</span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
              <span className="text-slate-400">Export Qualification:</span>
              <span className="text-emerald-400 font-semibold">Tier 1 Direct Factory Importer</span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
              <span className="text-slate-400">Escrow Integration:</span>
              <span className="text-cyan-400 font-semibold">30% Wire Advance + 70% Against B/L</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Israeli Market Visibility:</span>
              <span className="text-white font-medium">Shufersal, Carrefour IL, Rami Levy, Yochananof</span>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <a
              href="https://wa.me/972549988221?text=Hello%20FoodXchange%20Trade%20Desk,%20we%20just%20completed%20our%20European%20factory%20onboarding%20on%20FDX.TRADING."
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-6 py-3 bg-[#25D366] hover:bg-[#20ba59] text-white font-semibold rounded-2xl text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20"
            >
              <span>💬</span>
              <span>Connect with Israeli Trade Desk (WhatsApp)</span>
            </a>

            <Link
              href="/en/rfq"
              className="w-full sm:w-auto px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-2xl text-xs border border-slate-700 transition flex items-center justify-center gap-2"
            >
              <span>🔍</span>
              <span>View Smart RFQ Matchmaker</span>
            </Link>
          </div>

          <p className="text-[11px] text-slate-500">
            A confirmation dossier and Israeli Ministry of Health (MOH) SI 1145 import guidelines have been routed to {contactEmail}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 space-y-8">
      {/* Top Banner & Title */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20">
          <span>🏭</span>
          <span>European Manufacturer Onboarding Portal</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Export Directly to Israeli Supermarket Chains
        </h1>
        <p className="text-sm text-slate-400 max-w-2xl mx-auto">
          Connect your factory with Israel’s leading retail procurement buyers (Shufersal, Carrefour IL, Rami Levy, Yochananof) with 30/70 escrow protection and streamlined Kosher import clearance.
        </p>
      </div>

      {/* Step Progress Indicators */}
      <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl shadow-lg">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
          {[
            { step: 1, label: "1. Company & VAT", icon: "🏢" },
            { step: 2, label: "2. GFSI & Lab QA", icon: "🛡️" },
            { step: 3, label: "3. Kosher Audits", icon: "✡️" },
            { step: 4, label: "4. OEM & Logistics", icon: "📦" },
            { step: 5, label: "5. Review & Seal", icon: "✍️" },
          ].map((item) => {
            const isActive = currentStep === item.step;
            const isCompleted = currentStep > item.step;
            return (
              <button
                key={item.step}
                type="button"
                onClick={() => setCurrentStep(item.step)}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition ${
                  isActive
                    ? "bg-orange-500/15 border-orange-500 text-white shadow-xs font-bold"
                    : isCompleted
                    ? "bg-emerald-950/30 border-emerald-800/40 text-emerald-400"
                    : "bg-slate-950/40 border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                    isCompleted
                      ? "bg-emerald-500 text-white"
                      : isActive
                      ? "bg-orange-500 text-white"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {isCompleted ? "✓" : item.step}
                </div>
                <span className="truncate text-[11px]">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Wizard Form Card */}
      <form onSubmit={handleSubmit} className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-8">
        {/* ================= STEP 1: COMPANY PROFILE ================= */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>🏢</span>
                <span>Step 1: Company Profile & Export Identity</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Enter your European manufacturing entity credentials and verified EU VAT number.
              </p>
            </div>

            {/* Country Selector with Flags */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Country of Origin & Manufacturing
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 text-xs">
                {COUNTRIES.map((c) => {
                  const isSelected = country === c.name;
                  return (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => handleSelectCountry(c)}
                      className={`p-2.5 rounded-xl border flex items-center gap-2 transition text-left ${
                        isSelected
                          ? "bg-orange-500/15 border-orange-500 text-white shadow-xs font-semibold"
                          : "bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/50"
                      }`}
                    >
                      <span className="text-xl">{c.flag}</span>
                      <span className="truncate">{c.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Company Legal Name *</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Pastificio Attilio Mastromauro Granoro Srl"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">EU VAT / VIES Number *</label>
                <input
                  type="text"
                  required
                  value={euVatNumber}
                  onChange={(e) => setEuVatNumber(e.target.value)}
                  placeholder="e.g. IT00259830726"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono placeholder-slate-500 focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Factory Location & Region *</label>
                <input
                  type="text"
                  required
                  value={cityRegion}
                  onChange={(e) => setCityRegion(e.target.value)}
                  placeholder="e.g. Corato (Bari), Puglia, Italy"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nearest Seaport of Export Departure</label>
                <input
                  type="text"
                  value={nearestPort}
                  onChange={(e) => setNearestPort(e.target.value)}
                  placeholder="e.g. Port of Salerno / Genoa"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-hidden focus:border-orange-500"
                />
              </div>
            </div>

            {/* Contact Person Details */}
            <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-2xl space-y-4">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Export Director / Key Account Lead
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Contact Full Name *</label>
                  <input
                    type="text"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="e.g. Marco De Santis"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Job Title *</label>
                  <input
                    type="text"
                    required
                    value={contactTitle}
                    onChange={(e) => setContactTitle(e.target.value)}
                    placeholder="e.g. Head of International Export"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Direct Export Email *</label>
                  <input
                    type="email"
                    required
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="export@granoro.it"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Direct Phone / WhatsApp *</label>
                  <input
                    type="text"
                    required
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+39 080 872 1611"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono focus:outline-hidden focus:border-orange-500"
                  />
                </div>
              </div>
            </div>

            {/* Website & Capacity */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Official Website</label>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://www.factory.it"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Year Established</label>
                <input
                  type="number"
                  value={yearEstablished}
                  onChange={(e) => setYearEstablished(parseInt(e.target.value) || 1980)}
                  placeholder="1967"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Annual Production Capacity</label>
                <input
                  type="text"
                  value={annualCapacity}
                  onChange={(e) => setAnnualCapacity(e.target.value)}
                  placeholder="e.g. 80,000 MT/year"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-orange-500"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl text-xs transition flex items-center gap-2 shadow-sm"
              >
                <span>Continue to GFSI & QA</span>
                <span>&rarr;</span>
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 2: GFSI & LAB QA ================= */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>🛡️</span>
                <span>Step 2: Food Safety & GFSI Standards</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Israeli supermarket retailers mandate GFSI-recognized quality benchmarks and Israel Ministry of Health (MOH) lab dossiers.
              </p>
            </div>

            {/* Certifications Selection Grid */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Select Active Factory Certifications
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {GFSI_CERTIFICATIONS.map((cert) => {
                  const isChecked = selectedCerts.includes(cert.id);
                  return (
                    <button
                      key={cert.id}
                      type="button"
                      onClick={() => toggleCert(cert.id)}
                      className={`p-3 rounded-xl border flex items-center justify-between text-left transition ${
                        isChecked
                          ? "bg-emerald-500/15 border-emerald-500 text-white font-medium"
                          : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/50"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg">{cert.icon}</span>
                        <span>{cert.label}</span>
                      </div>
                      <span className={`text-xs ${isChecked ? "text-emerald-400 font-bold" : "text-slate-600"}`}>
                        {isChecked ? "✓ Active" : "+ Add"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Certificate Expiry / Audit Renewal Date</label>
                <input
                  type="date"
                  value={certExpiryDate}
                  onChange={(e) => setCertExpiryDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Allergen Management on Production Lines</label>
                <select
                  value={allergenSegregation}
                  onChange={(e) => setAllergenSegregation(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-orange-500"
                >
                  <option value="dedicated_lines">Dedicated Allergen-Free Lines (Clean Facility)</option>
                  <option value="shared_validated_cleaning">Shared Lines with Validated CIP / Deep Cleaning</option>
                  <option value="none">Standard Industry Practices (Trace labeling required)</option>
                </select>
              </div>
            </div>

            {/* QA Lab & MOH SI 1145 Readiness Switches */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div
                onClick={() => setHasInHouseLab(!hasInHouseLab)}
                className={`p-4 rounded-2xl border cursor-pointer transition flex items-start gap-3 ${
                  hasInHouseLab ? "bg-cyan-950/30 border-cyan-500/50" : "bg-slate-950/60 border-slate-800"
                }`}
              >
                <input
                  type="checkbox"
                  checked={hasInHouseLab}
                  onChange={() => {}}
                  className="mt-0.5 accent-cyan-500 w-4 h-4 rounded"
                />
                <div>
                  <p className="font-semibold text-white">In-House QA & Microbiology Laboratory</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Factory conducts internal batch microbiology, moisture, brix, and heavy metal screening per production lot.
                  </p>
                </div>
              </div>

              <div
                onClick={() => setSi1145Ready(!si1145Ready)}
                className={`p-4 rounded-2xl border cursor-pointer transition flex items-start gap-3 ${
                  si1145Ready ? "bg-emerald-950/30 border-emerald-500/50" : "bg-slate-950/60 border-slate-800"
                }`}
              >
                <input
                  type="checkbox"
                  checked={si1145Ready}
                  onChange={() => {}}
                  className="mt-0.5 accent-emerald-500 w-4 h-4 rounded"
                />
                <div>
                  <p className="font-semibold text-white">Israel SI 1145 & MOH Registration Ready</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Ready to supply technical spec sheets (*scheda tecnica*) and certified lab COA for Israeli import file opening.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs transition"
              >
                &larr; Back
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl text-xs transition flex items-center gap-2 shadow-sm"
              >
                <span>Continue to Kosher Audits</span>
                <span>&rarr;</span>
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 3: KOSHER AUDITS ================= */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>✡️</span>
                <span>Step 3: Kosher Certification & Rabbinical Audits</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Israeli supermarket retail chains (e.g. Shufersal, Rami Levy) require Kosher approval recognized by the Chief Rabbinate of Israel.
              </p>
            </div>

            {/* Primary Kosher Status Radio Cards */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Select Factory Rabbinical Affiliation
              </label>
              <div className="space-y-2 text-xs">
                {KOSHER_STANDARDS.map((k) => {
                  const isSelected = kosherStatus === k.id;
                  return (
                    <button
                      key={k.id}
                      type="button"
                      onClick={() => setKosherStatus(k.id)}
                      className={`w-full p-3.5 rounded-xl border flex items-center justify-between text-left transition ${
                        isSelected
                          ? "bg-amber-500/15 border-amber-500 text-white font-medium shadow-xs"
                          : "bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                          isSelected ? "border-amber-400 bg-amber-400" : "border-slate-600"
                        }`}>
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-black" />}
                        </span>
                        <span className="text-xs font-semibold">{k.label}</span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                        {k.badge}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Kosher Classification Chips */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Kosher Dietary Classification (Select all that apply)
              </label>
              <div className="flex flex-wrap gap-2 text-xs">
                {[
                  "Kosher Pareve (פרווה)",
                  "Kosher Dairy (חלב ישראל / Chalav Yisrael)",
                  "Kosher Dairy (חלב סתם / Chalav Stam)",
                  "Kosher for Passover (כשר לפסח)",
                  "Chief Rabbinate of Israel Approved",
                  "Badatz Mehadrin (מהדרין)",
                ].map((kt) => {
                  const isChecked = kosherTypes.includes(kt);
                  return (
                    <button
                      key={kt}
                      type="button"
                      onClick={() => toggleKosherType(kt)}
                      className={`px-3 py-1.5 rounded-xl border transition text-xs font-medium ${
                        isChecked
                          ? "bg-amber-500/20 border-amber-500 text-amber-300"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      {isChecked ? "✓ " : "+ "}
                      {kt}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Supervising Rabbinical Agency / Rabbi Name</label>
                <input
                  type="text"
                  value={rabbinicalAgency}
                  onChange={(e) => setRabbinicalAgency(e.target.value)}
                  placeholder="e.g. Chief Rabbinate of Israel / OU Kosher"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Kosher Certificate Expiry Date</label>
                <input
                  type="date"
                  value={kosherCertExpiry}
                  onChange={(e) => setKosherCertExpiry(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-orange-500"
                />
              </div>
            </div>

            {/* Passover toggle card */}
            <div
              onClick={() => setPassoverCapable(!passoverCapable)}
              className={`p-4 rounded-2xl border cursor-pointer transition flex items-center justify-between text-xs ${
                passoverCapable ? "bg-amber-950/30 border-amber-500/50" : "bg-slate-950/60 border-slate-800"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">🍷</span>
                <div>
                  <p className="font-semibold text-white">Kosher for Passover (כשר לפסח) Production Runs</p>
                  <p className="text-[11px] text-slate-400">
                    Factory is able to schedule dedicated Kashering and Passover batch runs with Rabbinical supervision.
                  </p>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full font-bold text-[11px] ${
                passoverCapable ? "bg-amber-500 text-black" : "bg-slate-800 text-slate-400"
              }`}>
                {passoverCapable ? "YES" : "NO"}
              </span>
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs transition"
              >
                &larr; Back
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl text-xs transition flex items-center gap-2 shadow-sm"
              >
                <span>Continue to OEM & Logistics</span>
                <span>&rarr;</span>
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 4: OEM & LOGISTICS ================= */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>📦</span>
                <span>Step 4: OEM / Private Label Capabilities & Logistics</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Configure your product lines, pallet packaging dimensions, and multi-factory consolidation options.
              </p>
            </div>

            {/* Categories Multi-Select */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Select Your Core Manufacturing Categories
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                {CATEGORIES.map((cat) => {
                  const isChecked = selectedCategories.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggleCategory(cat.id)}
                      className={`p-3 rounded-xl border flex items-center gap-2 text-left transition ${
                        isChecked
                          ? "bg-orange-500/20 border-orange-500 text-white font-medium"
                          : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      <span className="text-lg">{cat.icon}</span>
                      <span className="truncate">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Branding Modes */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Branding & Packaging Capabilities
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div
                  onClick={() => setPrivateLabel(!privateLabel)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition flex items-center gap-2.5 ${
                    privateLabel ? "bg-orange-500/15 border-orange-500 text-white" : "bg-slate-950 border-slate-800 text-slate-400"
                  }`}
                >
                  <input type="checkbox" checked={privateLabel} onChange={() => {}} className="accent-orange-500" />
                  <div>
                    <p className="font-semibold text-white">Supermarket Private Label (OEM)</p>
                    <p className="text-[10px] text-slate-400">Print Hebrew private labels for Israeli chains</p>
                  </div>
                </div>

                <div
                  onClick={() => setOwnBrand(!ownBrand)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition flex items-center gap-2.5 ${
                    ownBrand ? "bg-orange-500/15 border-orange-500 text-white" : "bg-slate-950 border-slate-800 text-slate-400"
                  }`}
                >
                  <input type="checkbox" checked={ownBrand} onChange={() => {}} className="accent-orange-500" />
                  <div>
                    <p className="font-semibold text-white">Factory Proprietary Brand</p>
                    <p className="text-[10px] text-slate-400">Export under manufacturer’s own brand</p>
                  </div>
                </div>

                <div
                  onClick={() => setFoodserviceBulk(!foodserviceBulk)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition flex items-center gap-2.5 ${
                    foodserviceBulk ? "bg-orange-500/15 border-orange-500 text-white" : "bg-slate-950 border-slate-800 text-slate-400"
                  }`}
                >
                  <input type="checkbox" checked={foodserviceBulk} onChange={() => {}} className="accent-orange-500" />
                  <div>
                    <p className="font-semibold text-white">Foodservice / Bulk 5kg-25kg</p>
                    <p className="text-[10px] text-slate-400">Supplied to catering, hotels & delis</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Pallet Standards */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Supported Pallet Dimensions (Israeli vs European Standard)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {[
                  { id: "EPAL Euro-Pallet (120x80cm)", desc: "Standard European wooden pallet (fits 24-26 in 40ft HC)" },
                  { id: "Israeli Supermarket Pallet (120x100cm)", desc: "Mandatory for automated Shufersal & Rami Levy high-bay DC racks" },
                ].map((pal) => {
                  const isChecked = palletStandards.includes(pal.id);
                  return (
                    <div
                      key={pal.id}
                      onClick={() => togglePallet(pal.id)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                        isChecked ? "bg-cyan-950/30 border-cyan-500/50" : "bg-slate-950 border-slate-800"
                      }`}
                    >
                      <input type="checkbox" checked={isChecked} onChange={() => {}} className="accent-cyan-500 mt-0.5" />
                      <div>
                        <p className="font-semibold text-white">{pal.id}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{pal.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* MOQ and Lead Time */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Minimum Order Quantity (MOQ)</label>
                <select
                  value={moqType}
                  onChange={(e) => setMoqType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-orange-500"
                >
                  <option value="mixed_container_consolidation">Flexible Multi-SKU Mixed Container (min 4 pallets)</option>
                  <option value="fcl_only">Full Container Load Only (FCL - 24 pallets)</option>
                  <option value="lcl_pallet">Single Pallet / LCL Sample Run</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Production Lead Time (Days)</label>
                <input
                  type="number"
                  value={leadTimeDays}
                  onChange={(e) => setLeadTimeDays(parseInt(e.target.value) || 21)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Tasting Sample Kits for Israeli Buyers</label>
                <select
                  value={sampleKitPolicy}
                  onChange={(e) => setSampleKitPolicy(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-orange-500"
                >
                  <option value="free_up_to_6">Free Evaluation Samples (Up to 6 packs)</option>
                  <option value="buyer_pays_freight">Samples Free, Buyer Covers Air Freight</option>
                  <option value="spec_only">Spec Sheets & Lab Analysis Only</option>
                </select>
              </div>
            </div>

            {/* Escrow 30/70 Wire */}
            <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">FoodXchange 30/70 Escrow Acceptance</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Guaranteed Wire Protection
                </span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                FoodXchange standard trade terms provide European factories with a <strong>30% advance cash wire</strong> before raw material procurement/bottling, and <strong>70% balance cash wire</strong> immediately upon presentation of the Clean Maritime Bill of Lading (B/L).
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-slate-400 mb-1">Factory Bank IBAN / SWIFT (for wire remittance)</label>
                  <input
                    type="text"
                    value={ibanSwift}
                    onChange={(e) => setIbanSwift(e.target.value)}
                    placeholder="e.g. IT60X0542811101000000123456"
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono text-xs focus:outline-hidden focus:border-orange-500"
                  />
                </div>
                <div className="flex items-center gap-2 pt-4">
                  <input
                    type="checkbox"
                    id="escrowTerms"
                    checked={accepts3070Escrow}
                    onChange={(e) => setAccepts3070Escrow(e.target.checked)}
                    className="accent-emerald-500 w-4 h-4 rounded"
                  />
                  <label htmlFor="escrowTerms" className="text-slate-300 font-medium cursor-pointer">
                    Factory accepts 30/70 Escrow Milestone Payment Terms
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs transition"
              >
                &larr; Back
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(5)}
                className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl text-xs transition flex items-center gap-2 shadow-sm"
              >
                <span>Proceed to Review & Sign</span>
                <span>&rarr;</span>
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 5: REVIEW & SEAL ================= */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>✍️</span>
                <span>Step 5: Review Credentials & Digital Verification</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Please verify your entered factory credentials before final digital publication to Israeli supermarket category buyers.
              </p>
            </div>

            {/* Comprehensive Dossier Card */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-4 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <h3 className="font-bold text-white text-base">{companyName}</h3>
                  <p className="text-slate-400 text-xs">{cityRegion}, {country} · VAT: <span className="font-mono text-slate-300">{euVatNumber}</span></p>
                </div>
                <span className="font-mono text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full">
                  Verified Tier 1 Supplier
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-slate-500 text-[10px] uppercase font-bold">Categories</p>
                  <p className="text-white font-medium mt-0.5">{selectedCategories.join(", ")}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-[10px] uppercase font-bold">GFSI Certifications</p>
                  <p className="text-emerald-400 font-medium mt-0.5">{selectedCerts.join(", ")}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-[10px] uppercase font-bold">Kosher Affiliation</p>
                  <p className="text-amber-400 font-medium mt-0.5">{rabbinicalAgency} ({kosherTypes.join(", ")})</p>
                </div>
                <div>
                  <p className="text-slate-500 text-[10px] uppercase font-bold">MOQ & Lead Time</p>
                  <p className="text-white font-medium mt-0.5">{moqType.replace(/_/g, " ")} · {leadTimeDays} days</p>
                </div>
                <div>
                  <p className="text-slate-500 text-[10px] uppercase font-bold">Pallet Dimensions</p>
                  <p className="text-cyan-400 font-medium mt-0.5">{palletStandards.join(" & ")}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-[10px] uppercase font-bold">Payment Terms</p>
                  <p className="text-white font-medium mt-0.5">30% Wire Advance + 70% Clean B/L</p>
                </div>
              </div>
            </div>

            {/* Authorized Signer Form */}
            <div className="bg-slate-950/60 border border-slate-800 p-5 rounded-2xl space-y-4 text-xs">
              <h3 className="font-bold text-white text-xs uppercase tracking-wider">
                Digital Declaration & Authorized Signer
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1">Signer Full Name *</label>
                  <input
                    type="text"
                    required
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Signer Corporate Title *</label>
                  <input
                    type="text"
                    required
                    value={signerTitle}
                    onChange={(e) => setSignerTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="flex items-start gap-2.5 pt-2">
                <input
                  type="checkbox"
                  id="agreeTerms"
                  required
                  checked={agreedTerms}
                  onChange={(e) => setAgreedTerms(e.target.checked)}
                  className="accent-orange-500 mt-1 w-4 h-4 rounded"
                />
                <label htmlFor="agreeTerms" className="text-slate-300 text-xs leading-relaxed cursor-pointer">
                  I hereby declare that I am authorized by <strong>{companyName}</strong> to register our manufacturing facility with FoodXchange, and that all food safety, GFSI certifications, and Kosher parameters submitted are accurate and legally binding.
                </label>
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="bg-rose-950/60 border border-rose-500/50 p-3 rounded-xl text-xs text-rose-300">
                {errorMsg}
              </div>
            )}

            <div className="flex justify-between pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs transition"
              >
                &larr; Back
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !agreedTerms}
                className="px-8 py-3 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-2xl text-xs shadow-lg shadow-orange-500/25 transition disabled:opacity-50 flex items-center gap-2"
              >
                <span>{isSubmitting ? "Verifying Credentials..." : "Complete Factory Onboarding 🚀"}</span>
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
