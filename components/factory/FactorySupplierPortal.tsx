"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  updateFactoryProductionMilestone,
  submitFactoryLoadingProof,
  type FactoryProofPhoto,
} from "@/app/factory/actions";
import type { CommercialOrderLifecycle } from "@/app/admin/requests/actions";

interface Props {
  requestId: string;
  poNumber: string;
  poDate: string;
  productName: string;
  factoryName: string;
  factoryCountry: string;
  factoryContractEur: number;
  orderVolume: string;
  palletCount: number;
  workflow: CommercialOrderLifecycle | null;
  factoryLoadingProof?: {
    containerNumber: string;
    sealNumber: string;
    tempLoggerReading: string;
    exportOfficerName: string;
    submittedAt: string;
    photos: FactoryProofPhoto[];
  } | null;
}

export default function FactorySupplierPortal({
  requestId,
  poNumber,
  poDate,
  productName,
  factoryName,
  factoryCountry,
  factoryContractEur,
  orderVolume,
  palletCount,
  workflow,
  factoryLoadingProof,
}: Props) {
  const [lang, setLang] = useState<"en" | "it" | "es">("en");
  const [isPending, startTransition] = useTransition();

  // Milestones State
  const milestones = workflow?.production_milestones ?? {};
  const [rawMaterials, setRawMaterials] = useState(Boolean(milestones.raw_materials_procured));
  const [bottlingDone, setBottlingDone] = useState(Boolean(milestones.bottling_completed));
  const [psiPassed, setPsiPassed] = useState(Boolean(milestones.psi_inspection_passed));
  const [containerLoaded, setContainerLoaded] = useState(Boolean(milestones.container_loaded));
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Loading Proof Form State
  const [containerNum, setContainerNum] = useState(factoryLoadingProof?.containerNumber || workflow?.container_number || "MEDU-7829104");
  const [sealNum, setSealNum] = useState(factoryLoadingProof?.sealNumber || "IL-98402-SEAL");
  const [tempLogger, setTempLogger] = useState(factoryLoadingProof?.tempLoggerReading || "+18.2°C Certified");
  const [departurePort, setDeparturePort] = useState(workflow?.port_of_origin || (factoryCountry === "Italy" ? "Port of Genoa" : "Port of Valencia"));
  const [officerName, setOfficerName] = useState(factoryLoadingProof?.exportOfficerName || "Director of Export Operations");
  const [proofSubmitted, setProofSubmitted] = useState(Boolean(factoryLoadingProof));
  const [proofMsg, setProofMsg] = useState<string | null>(null);

  // Sample default photos if none
  const [photos, setPhotos] = useState<FactoryProofPhoto[]>(
    factoryLoadingProof?.photos || [
      {
        category: "pallet_label",
        url: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80",
        caption: "EPAL Wooden Pallets strapped with Hebrew Private Label (Kosher Certified)",
        timestamp: new Date().toISOString(),
      },
      {
        category: "bolt_seal",
        url: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=600&q=80",
        caption: "High-Security ISO 17712 Bolt Seal #IL-98402 Verified Intact",
        timestamp: new Date().toISOString(),
      },
    ]
  );

  const t = {
    en: {
      portalTitle: "European Manufacturer Export & Dispatch Portal",
      commercialPo: "Commercial Purchase Order",
      contractValue: "Factory Contract Value",
      terms: "Terms: CIF Ashdod Port · 30% Advance Swift / 70% against Ocean B/L copy",
      depositStatus: "30% Production Advance: Remitted & Cleared ✓",
      milestonesTitle: "Manufacturing & Quality Control Checkpoints",
      milestone1: "Raw Materials Procured & Laboratory Batch Tested",
      milestone2: "Canning / Bottling Run Completed (Labeling Verified)",
      milestone3: "Pre-Shipment Inspection (PSI) Passed & Certified",
      milestone4: "Euro-Pallets Stretched (24 EPAL x 1,000 units)",
      milestone5: "Container Loaded & High-Security Bolt Seal Applied",
      uploadTitle: "Submit Final Container Loading Proof & Seal Verification",
      uploadDesc: "Attach photos of loaded container, shrink-wrapped pallets, and bolt seal to release Clean Ocean Bill of Lading.",
      containerNumber: "Container Number (e.g. MEDU...):",
      sealNumber: "Bolt Seal Serial # (ISO 17712):",
      tempReading: "Cold-Chain Temp Logger Reading:",
      departurePort: "Port of Departure:",
      officer: "Authorizing Export Quality Officer:",
      submitButton: "Confirm & Submit Loading Verification",
      submittedBadge: "Container Dispatch Confirmed ✓",
    },
    it: {
      portalTitle: "Portale Produttore Europeo - Gestione Ordini & Spedizioni",
      commercialPo: "Ordine di Acquisto Commerciale (PO)",
      contractValue: "Valore Contratto Fabbrica",
      terms: "Condizioni: CIF Porto di Ashdod · 30% Anticipo Swift / 70% contro copia B/L",
      depositStatus: "30% Anticipo Produzione: Confermato & Erogato ✓",
      milestonesTitle: "Fasi di Produzione e Controllo Qualità (QC)",
      milestone1: "Materia Prima Approvata & Analisi di Laboratorio",
      milestone2: "Inscatolamento / Imbottigliamento Completato",
      milestone3: "Controllo Qualità Pre-Imbarco (PSI) Superato",
      milestone4: "Pallettizzazione Completata (24 EPAL x 1.000 unità)",
      milestone5: "Container Caricato & Sigillo di Alta Sicurezza Applicato",
      uploadTitle: "Verifica Carico Container & Sigillo di Chiusura",
      uploadDesc: "Allega foto dei pallet caricati e del sigillo per il rilascio della Polizza di Carico (B/L).",
      containerNumber: "Numero Container (es. MEDU...):",
      sealNumber: "Numero Sigillo Bullone (ISO 17712):",
      tempReading: "Temperatura Registratore Datalogger:",
      departurePort: "Porto di Partenza:",
      officer: "Responsabile Qualità & Spedizioni:",
      submitButton: "Conferma e Invia Verifica di Carico",
      submittedBadge: "Spedizione Container Verificata ✓",
    },
    es: {
      portalTitle: "Portal de Fabricante Europeo - Gestión de Producción y Embarque",
      commercialPo: "Orden de Compra Comercial (PO)",
      contractValue: "Valor de Contrato Fábrica",
      terms: "Términos: CIF Puerto de Ashdod · 30% Anticipo Swift / 70% contra copia B/L",
      depositStatus: "30% Anticipo de Producción: Confirmado y Transferido ✓",
      milestonesTitle: "Hitos de Fabricación y Control de Calidad (QC)",
      milestone1: "Materia Prima Aprobada y Ensayos de Laboratorio",
      milestone2: "Envasado / Embotellado Completado",
      milestone3: "Inspección Previa al Embarque (PSI) Aprobada",
      milestone4: "Paletización Completada (24 EPAL x 1.000 unidades)",
      milestone5: "Contenedor Cargado y Precinto de Alta Seguridad Aplicado",
      uploadTitle: "Verificación de Carga de Contenedor y Precinto",
      uploadDesc: "Adjunte fotos de los palets y del precinto para liberar el Conocimiento de Embarque (B/L).",
      containerNumber: "Número de Contenedor (ej. MEDU...):",
      sealNumber: "Número de Precinto de Seguridad:",
      tempReading: "Lectura del Registrador de Temperatura:",
      departurePort: "Puerto de Salida:",
      officer: "Responsable de Calidad y Exportación:",
      submitButton: "Confirmar y Enviar Verificación de Carga",
      submittedBadge: "Embarque de Contenedor Verificado ✓",
    },
  }[lang];

  const handleMilestoneToggle = (
    key: "raw_materials_procured" | "bottling_completed" | "psi_inspection_passed" | "container_loaded",
    currentVal: boolean,
    setter: (val: boolean) => void
  ) => {
    const nextVal = !currentVal;
    setter(nextVal);
    setStatusMsg(null);

    startTransition(async () => {
      const res = await updateFactoryProductionMilestone({
        requestId,
        milestoneKey: key,
        completed: nextVal,
        updatedBy: officerName,
      });

      if (res.ok) {
        setStatusMsg("✓ " + (res.message || "Updated successfully"));
        setTimeout(() => setStatusMsg(null), 3500);
      }
    });
  };

  const handleProofSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setProofMsg(null);

    startTransition(async () => {
      const res = await submitFactoryLoadingProof({
        requestId,
        containerNumber: containerNum,
        sealNumber: sealNum,
        tempLoggerReading: tempLogger,
        departurePort,
        exportOfficerName: officerName,
        photos,
      });

      if (res.ok) {
        setProofSubmitted(true);
        setContainerLoaded(true);
        setProofMsg("✓ " + (res.message || "Container proof confirmed"));
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased" dir="ltr">
      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white text-sm shadow-md shadow-blue-500/20">
              FDX
            </div>
            <div>
              <div className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">
                {t.portalTitle}
              </div>
              <h1 className="text-base font-extrabold text-white">
                {factoryName} · {factoryCountry === "Italy" ? "🇮🇹 Italy" : factoryCountry === "Spain" ? "🇪🇸 Spain" : "🇪🇺 Europe"}
              </h1>
            </div>
          </div>

          {/* Language Switcher */}
          <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700/80 text-xs font-semibold">
            <button
              onClick={() => setLang("en")}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                lang === "en" ? "bg-blue-600 text-white shadow-xs" : "text-slate-400 hover:text-white"
              }`}
            >
              EN 🇬🇧
            </button>
            <button
              onClick={() => setLang("it")}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                lang === "it" ? "bg-blue-600 text-white shadow-xs" : "text-slate-400 hover:text-white"
              }`}
            >
              IT 🇮🇹
            </button>
            <button
              onClick={() => setLang("es")}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                lang === "es" ? "bg-blue-600 text-white shadow-xs" : "text-slate-400 hover:text-white"
              }`}
            >
              ES 🇪🇸
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* PO Commercial Overview Card */}
        <section className="bg-gradient-to-br from-slate-900 to-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {poNumber}
                </span>
                <span className="text-xs text-slate-400 font-mono">Date: {poDate}</span>
              </div>
              <h2 className="text-xl font-bold text-white mt-1.5">
                {productName}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Volume: <strong>{orderVolume}</strong> ({palletCount} Euro-pallets) · Private Label Packaging
              </p>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-xs text-slate-400 block">{t.contractValue}:</span>
              <span className="text-2xl font-black text-emerald-400 font-mono">
                €{factoryContractEur.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[11px] text-slate-500 block">Currency: EUR (€)</span>
            </div>
          </div>

          {/* Payment Terms & Escrow Badge */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-base shrink-0">
                ✓
              </div>
              <div>
                <span className="font-bold text-emerald-300 block">{t.depositStatus}</span>
                <span className="text-slate-400 text-[11px]">Production release authorized by FoodXchange Escrow Desk.</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/50 border border-slate-800 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-base shrink-0">
                📄
              </div>
              <div>
                <span className="font-bold text-slate-200 block">70% Final Balance Payment</span>
                <span className="text-slate-400 text-[11px]">Wire released upon uploading container seal photos & Clean Ocean B/L copy.</span>
              </div>
            </div>
          </div>
        </section>

        {/* Manufacturing Milestone Checkpoints */}
        <section className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-7 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>🏭</span>
                <span>{t.milestonesTitle}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Toggle milestone checkpoints as manufacturing progresses in your facility.
              </p>
            </div>
            {statusMsg && (
              <span className="text-xs font-semibold text-emerald-400 animate-in fade-in">
                {statusMsg}
              </span>
            )}
          </div>

          <div className="space-y-3">
            {/* Step 1: Raw Materials */}
            <div
              onClick={() => handleMilestoneToggle("raw_materials_procured", rawMaterials, setRawMaterials)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                rawMaterials
                  ? "bg-emerald-950/20 border-emerald-500/40 text-emerald-200"
                  : "bg-slate-950/50 border-slate-800 text-slate-300 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                    rawMaterials ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {rawMaterials ? "✓" : "1"}
                </div>
                <span className="text-sm font-semibold">{t.milestone1}</span>
              </div>
              <span className="text-xs font-mono font-bold">
                {rawMaterials ? "COMPLETED" : "MARK DONE"}
              </span>
            </div>

            {/* Step 2: Bottling */}
            <div
              onClick={() => handleMilestoneToggle("bottling_completed", bottlingDone, setBottlingDone)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                bottlingDone
                  ? "bg-emerald-950/20 border-emerald-500/40 text-emerald-200"
                  : "bg-slate-950/50 border-slate-800 text-slate-300 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                    bottlingDone ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {bottlingDone ? "✓" : "2"}
                </div>
                <span className="text-sm font-semibold">{t.milestone2}</span>
              </div>
              <span className="text-xs font-mono font-bold">
                {bottlingDone ? "COMPLETED" : "MARK DONE"}
              </span>
            </div>

            {/* Step 3: PSI Passed */}
            <div
              onClick={() => handleMilestoneToggle("psi_inspection_passed", psiPassed, setPsiPassed)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                psiPassed
                  ? "bg-emerald-950/20 border-emerald-500/40 text-emerald-200"
                  : "bg-slate-950/50 border-slate-800 text-slate-300 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                    psiPassed ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {psiPassed ? "✓" : "3"}
                </div>
                <span className="text-sm font-semibold">{t.milestone3}</span>
              </div>
              <span className="text-xs font-mono font-bold">
                {psiPassed ? "COMPLETED" : "MARK DONE"}
              </span>
            </div>

            {/* Step 4: Container Loaded */}
            <div
              onClick={() => handleMilestoneToggle("container_loaded", containerLoaded, setContainerLoaded)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                containerLoaded
                  ? "bg-emerald-950/20 border-emerald-500/40 text-emerald-200"
                  : "bg-slate-950/50 border-slate-800 text-slate-300 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                    containerLoaded ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {containerLoaded ? "✓" : "4"}
                </div>
                <span className="text-sm font-semibold">{t.milestone5}</span>
              </div>
              <span className="text-xs font-mono font-bold">
                {containerLoaded ? "COMPLETED" : "MARK DONE"}
              </span>
            </div>
          </div>
        </section>

        {/* Container Loading Proof & Seal Verification Form */}
        <section className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-7 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>📸</span>
                <span>{t.uploadTitle}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 max-w-xl">
                {t.uploadDesc}
              </p>
            </div>
            {proofSubmitted && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {t.submittedBadge}
              </span>
            )}
          </div>

          <form onSubmit={handleProofSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">{t.containerNumber}</label>
                <input
                  type="text"
                  value={containerNum}
                  onChange={(e) => setContainerNum(e.target.value)}
                  placeholder="MEDU-7829104"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">{t.sealNumber}</label>
                <input
                  type="text"
                  value={sealNum}
                  onChange={(e) => setSealNum(e.target.value)}
                  placeholder="IL-98402-SEAL"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-emerald-400 font-bold focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">{t.tempReading}</label>
                <input
                  type="text"
                  value={tempLogger}
                  onChange={(e) => setTempLogger(e.target.value)}
                  placeholder="+18.2°C Certified"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">{t.departurePort}</label>
                <input
                  type="text"
                  value={departurePort}
                  onChange={(e) => setDeparturePort(e.target.value)}
                  placeholder="Port of Valencia / Genoa"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">{t.officer}</label>
              <input
                type="text"
                value={officerName}
                onChange={(e) => setOfficerName(e.target.value)}
                placeholder="Export Operations Manager"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            {/* Photos Preview Gallery */}
            <div className="space-y-2 pt-2">
              <label className="text-xs font-semibold text-slate-300 block">
                Verification Proof Photos (Pallet Labels & Bolt Seal):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {photos.map((p, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-3"
                  >
                    <div className="w-12 h-12 rounded-xl bg-slate-800 overflow-hidden shrink-0 relative flex items-center justify-center text-xs">
                      📸
                    </div>
                    <div className="text-xs min-w-0">
                      <span className="font-bold text-slate-200 block truncate">{p.caption}</span>
                      <span className="text-[10px] text-slate-500 font-mono truncate block">Verified Proof Attached</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {proofMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
                {proofMsg}
              </div>
            )}

            <div className="pt-3 flex justify-end">
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {isPending ? "Submitting..." : t.submitButton}
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
