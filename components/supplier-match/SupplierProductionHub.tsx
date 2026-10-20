"use client";

import { useState, useTransition } from "react";
import CommercialPoDocumentModal from "@/components/documents/CommercialPoDocumentModal";

export type ProductionLanguage = "en" | "es" | "it" | "fr" | "de";

interface Props {
  matchId: string;
  requestId: string;
  companyName: string;
  matchedProductName: string;
  poNumber: string;
  orderVolume: string;
  totalOrderValue: number;
  factoryCost: number;
  currency?: string;
  incoterms?: string;
  buyerCompany?: string;
  buyerAddress?: string;
  unitPrice?: number;
  initialMilestones?: {
    deposit_transferred?: boolean;
    raw_materials_procured?: boolean;
    bottling_completed?: boolean;
    psi_inspection_passed?: boolean;
    container_loaded?: boolean;
  };
  initialShipping?: {
    shipping_line?: string | null;
    container_number?: string | null;
    bill_of_lading?: string | null;
    etd?: string | null;
    eta_port?: string | null;
  };
  initialLanguage?: ProductionLanguage;
}

const I18N = {
  en: {
    badge: "Official Commercial Order Awarded",
    title: "Production & Shipping Milestone Desk",
    subtitle: "Manage manufacturing progress and ocean freight documents directly with FoodXchange Desk.",
    poRef: "Commercial PO Ref:",
    orderVolume: "Volume Awarded:",
    factoryValue: "Factory Contract Value:",
    advanceStatus: "30% Advance Deposit:",
    advanceCleared: "Verified & Transferred to Factory ✓",
    advancePending: "Awaiting Final Settlement Clearing",
    viewPoBtn: "📄 View Official Commercial PO (PDF)",
    milestonesTitle: "Industrial Manufacturing & Dispatch Milestones",
    m1Title: "1. 30% Advance Deposit & Raw Materials",
    m1Desc: "Advance deposit released to factory to procure packaging glass/cans and raw ingredients.",
    m2Title: "2. Bottling & Private Label Packaging",
    m2Desc: "Run packaging line with approved buyer artwork and lot identification codes.",
    m2LotLabel: "Batch Lot Number / Expiry Date:",
    m2Btn: "Confirm Bottling & Labeling Complete ✓",
    m3Title: "3. Pre-Shipment Inspection (PSI) & Lab Analysis",
    m3Desc: "Quality testing, sensory verification, and Kosher certification sign-off.",
    m3Btn: "Confirm Quality & PSI Passed ✓",
    m4Title: "4. Ocean Container Stuffing & Bill of Lading (B/L)",
    m4Desc: "Stuff 40ft High Cube container and issue Clean On-Board Ocean Bill of Lading.",
    containerNumLabel: "Container Number (e.g. MSKU-9481029):",
    blLabel: "Ocean Bill of Lading # (e.g. MSCUVAL881920):",
    carrierLabel: "Ocean Shipping Line:",
    etdLabel: "Estimated Departure (ETD):",
    m4Btn: "Submit Container & Ocean B/L Details ✓",
    completedBadge: "Completed ✓",
    pendingBadge: "In Progress",
    saving: "Saving...",
    savedSuccess: "Milestone successfully recorded! Syncing live with Buyer Portal.",
  },
  es: {
    badge: "Pedido Comercial Oficial Confirmado",
    title: "Panel de Hitos de Fabricación y Despacho Marítimo",
    subtitle: "Gestione el progreso de producción y documentos de flete marítimo directamente con FoodXchange.",
    poRef: "Ref. Orden de Compra (PO):",
    orderVolume: "Volumen Adjudicado:",
    factoryValue: "Valor de Contrato Fábrica:",
    advanceStatus: "Anticipo 30% Producción:",
    advanceCleared: "Verificado y Transferido a Fábrica ✓",
    advancePending: "En Proceso de Liquidación",
    viewPoBtn: "📄 Ver Orden de Compra Oficial (PDF)",
    milestonesTitle: "Hitos de Fabricación y Carga en Contenedor",
    m1Title: "1. Anticipo 30% y Materias Primas",
    m1Desc: "Anticipo liberado a fábrica para cilindros de impresión y materias primas.",
    m2Title: "2. Embotellado y Etiquetado Marca Privada",
    m2Desc: "Ejecución de línea de envasado con diseño aprobado y número de lote.",
    m2LotLabel: "Número de Lote / Caducidad:",
    m2Btn: "Confirmar Embotellado Completado ✓",
    m3Title: "3. Inspección Pre-Embarque (PSI) y Análisis Lab",
    m3Desc: "Control de calidad, análisis sensorial y certificación Kosher.",
    m3Btn: "Confirmar Inspección de Calidad Superada ✓",
    m4Title: "4. Consolidación de Contenedor y Conocimiento de Embarque (B/L)",
    m4Desc: "Llenado de contenedor 40ft HQ y emisión de B/L marítimo original.",
    containerNumLabel: "Número de Contenedor:",
    blLabel: "Número de Bill of Lading (B/L):",
    carrierLabel: "Naviera Marítima:",
    etdLabel: "Fecha Estimada de Salida (ETD):",
    m4Btn: "Guardar Datos de Carga y B/L ✓",
    completedBadge: "Completado ✓",
    pendingBadge: "En Curso",
    saving: "Guardando...",
    savedSuccess: "¡Hito actualizado con éxito! Sincronizado en vivo con el comprador.",
  },
  it: {
    badge: "Ordine Commerciale Ufficiale Assegnato",
    title: "Cruscotto Produzione e Spedizione Marittima",
    subtitle: "Gestisci l'avanzamento della produzione e i documenti di carico marittimo con il Desk FoodXchange.",
    poRef: "Rif. Ordine di Acquisto (PO):",
    orderVolume: "Volume Ordinato:",
    factoryValue: "Valore Contratto Fabbrica:",
    advanceStatus: "Anticipo 30% Produzione:",
    advanceCleared: "Verificato e Bonificato alla Fabbrica ✓",
    advancePending: "In Corso di Liquidazione",
    viewPoBtn: "📄 Visualizza Ordine Ufficiale PO (PDF)",
    milestonesTitle: "Tappe di Imbottigliamento e Imbarco",
    m1Title: "1. Anticipo 30% e Approvvigionamento",
    m1Desc: "Anticipo bonificato per avviare la linea e preparare le materie prime.",
    m2Title: "2. Imbottigliamento e Packaging Private Label",
    m2Desc: "Confezionamento con grafica approvata e attribuzione del lotto.",
    m2LotLabel: "Numero di Lotto / Data Scadenza:",
    m2Btn: "Conferma Imbottigliamento Completato ✓",
    m3Title: "3. Ispezione Pre-Imbarco (PSI) e Analisi Laboratorio",
    m3Desc: "Verifica organolettica, certificato di conformità e Kosher.",
    m3Btn: "Conferma Qualità e Ispezione Superata ✓",
    m4Title: "4. Carico Container e Polizza di Carico (B/L)",
    m4Desc: "Riempimento container 40ft HQ ed emissione della polizza marittima B/L.",
    containerNumLabel: "Numero Container:",
    blLabel: "Numero Bill of Lading (B/L):",
    carrierLabel: "Compagnia di Navigazione:",
    etdLabel: "Data Stimata di Partenza (ETD):",
    m4Btn: "Invia Dettagli Container e B/L ✓",
    completedBadge: "Completato ✓",
    pendingBadge: "In Corso",
    saving: "Salvataggio...",
    savedSuccess: "Tappa salvata con successo! Aggiornata in tempo reale per il cliente.",
  },
  fr: {
    badge: "Commande Commerciale Officielle Attribuée",
    title: "Suivi de Production et Expédition Maritime",
    subtitle: "Pilotez la mise en production et les documents maritimes avec le desk FoodXchange.",
    poRef: "Réf. Bon de Commande (PO):",
    orderVolume: "Volume Commandé:",
    factoryValue: "Valeur Contrat Usine:",
    advanceStatus: "Acompte de 30%:",
    advanceCleared: "Vérifié et Transféré à l'Usine ✓",
    advancePending: "En Cours de Règlement",
    viewPoBtn: "📄 Voir Bon de Commande Officiel (PDF)",
    milestonesTitle: "Étapes de Fabrication et Expédition",
    m1Title: "1. Acompte de 30% & Matières Premières",
    m1Desc: "Acompte débloqué pour sécuriser les emballages et matières premières.",
    m2Title: "2. Mise en Bouteille & Étiquetage Marque Propre",
    m2Desc: "Lancement du conditionnement avec maquette validée et lot de production.",
    m2LotLabel: "Numéro de Lot / DLUO:",
    m2Btn: "Confirmer Mise en Bouteille Achevée ✓",
    m3Title: "3. Inspection Avant Embarquement (PSI) & Certificats",
    m3Desc: "Tests organoleptiques, analyses laboratoire et certification Casher.",
    m3Btn: "Confirmer Contrôle Qualité Réussi ✓",
    m4Title: "4. Empotage Conteneur & Connaissement (B/L)",
    m4Desc: "Chargement conteneur 40ft HQ et émission du Bill of Lading maritime.",
    containerNumLabel: "Numéro de Conteneur:",
    blLabel: "Numéro de Connaissement (B/L):",
    carrierLabel: "Compagnie Maritime:",
    etdLabel: "Date de Départ Prévue (ETD):",
    m4Btn: "Valider Détails Conteneur & B/L ✓",
    completedBadge: "Terminé ✓",
    pendingBadge: "En Cours",
    saving: "Enregistrement...",
    savedSuccess: "Étape validée avec succès ! Synchronisée avec le client.",
  },
  de: {
    badge: "Offizieller Handelsauftrag Erteilt",
    title: "Produktions- und Seefracht-Fortschritt",
    subtitle: "Verwalten Sie Abfüllung und Exportdokumente direkt mit FoodXchange.",
    poRef: "Handelsauftrag-Nr. (PO):",
    orderVolume: "Auftragsvolumen:",
    factoryValue: "Vertragswert Werk:",
    advanceStatus: "30% Anzahlung:",
    advanceCleared: "Bestätigt & an Werk überwiesen ✓",
    advancePending: "In Zahlungsabwicklung",
    viewPoBtn: "📄 Offiziellen Auftrag anzeigen (PDF)",
    milestonesTitle: "Produktions- & Verlademeilensteine",
    m1Title: "1. 30% Anzahlung & Rohstoffe",
    m1Desc: "Anzahlung freigegeben für Druckzylinder und Rohstoffdisposition.",
    m2Title: "2. Abfüllung & Handelsmarken-Etikettierung",
    m2Desc: "Produktionslauf mit genehmigtem Artwork und Chargennummer.",
    m2LotLabel: "Chargennummer / MHD:",
    m2Btn: "Abfüllung als Abgeschlossen Bestätigen ✓",
    m3Title: "3. Vorversandprüfung (PSI) & Laboranalysen",
    m3Desc: "Qualitätsprüfung, sensorische Freigabe und Koscher-Zertifikat.",
    m3Btn: "Qualitätsprüfung Bestanden Bestätigen ✓",
    m4Title: "4. Containerbeladung & Konnossement (B/L)",
    m4Desc: "Beladung des 40ft HQ Containers und Ausstellung des Seefrachtbriefs.",
    containerNumLabel: "Containernummer:",
    blLabel: "Bill of Lading (B/L) Nr.:",
    carrierLabel: "Reederei:",
    etdLabel: "Voraussichtliche Abfahrt (ETD):",
    m4Btn: "Container- & B/L-Daten Senden ✓",
    completedBadge: "Abgeschlossen ✓",
    pendingBadge: "In Bearbeitung",
    saving: "Wird gespeichert...",
    savedSuccess: "Meilenstein erfolgreich gespeichert!",
  },
};

export default function SupplierProductionHub({
  matchId,
  requestId,
  companyName,
  matchedProductName,
  poNumber,
  orderVolume,
  totalOrderValue,
  factoryCost,
  currency = "EUR",
  incoterms = "CIF Ashdod Port",
  buyerCompany = "Supermarket Retail Group",
  buyerAddress = "Central Logistics Hub, Israel",
  unitPrice = 1.75,
  initialMilestones,
  initialShipping,
  initialLanguage = "en",
}: Props) {
  const [lang, setLang] = useState<ProductionLanguage>(initialLanguage);
  const [isPending, startTransition] = useTransition();
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [showPoModal, setShowPoModal] = useState(false);

  const t = I18N[lang];

  // Local state for milestones
  const [milestones, setMilestones] = useState({
    deposit_transferred: Boolean(initialMilestones?.deposit_transferred),
    raw_materials_procured: Boolean(initialMilestones?.raw_materials_procured),
    bottling_completed: Boolean(initialMilestones?.bottling_completed),
    psi_inspection_passed: Boolean(initialMilestones?.psi_inspection_passed),
    container_loaded: Boolean(initialMilestones?.container_loaded),
  });

  // Shipping form fields
  const [lotNumber, setLotNumber] = useState("");
  const [shippingLine, setShippingLine] = useState(initialShipping?.shipping_line || "MSC");
  const [containerNumber, setContainerNumber] = useState(initialShipping?.container_number || "");
  const [billOfLading, setBillOfLading] = useState(initialShipping?.bill_of_lading || "");
  const [etd, setEtd] = useState(initialShipping?.etd || "");

  const handleUpdateMilestone = (key: string, val: boolean) => {
    setActionMsg(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/supplier-match/${matchId}/milestones`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            milestoneKey: key,
            milestoneValue: val,
            batchLotNumber: lotNumber,
            shippingLine,
            containerNumber,
            billOfLading,
            etd,
          }),
        });

        const data = await res.json();
        if (data.ok) {
          setMilestones((prev) => ({
            ...prev,
            [key]: val,
          }));
          setActionMsg(t.savedSuccess);
          setTimeout(() => setActionMsg(null), 4000);
        } else {
          setActionMsg(`Error: ${data.error || "Failed to update milestone"}`);
        }
      } catch (err) {
        setActionMsg("Network error updating milestone");
      }
    });
  };

  const handleSaveShipping = (e: React.FormEvent) => {
    e.preventDefault();
    handleUpdateMilestone("container_loaded", true);
  };

  const completedCount = Object.values(milestones).filter(Boolean).length;
  const progressPercent = Math.min(100, Math.round((completedCount / 4) * 100));

  return (
    <div className="space-y-6 text-slate-900">
      {/* ── Order Confirmed Hero Header ── */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 text-white rounded-2xl p-6 sm:p-7 shadow-lg border border-emerald-900/40 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-widest text-emerald-400">
              {t.badge}
            </span>
          </div>

          {/* Language Switcher */}
          <div className="flex items-center gap-1 bg-white/10 p-1 rounded-xl text-xs">
            {(["en", "es", "it", "fr", "de"] as ProductionLanguage[]).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                className={`px-2.5 py-1 rounded-lg uppercase font-bold text-[11px] transition ${
                  lang === l
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-1">
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">{t.title}</h2>
            <p className="text-xs text-slate-300 max-w-xl leading-relaxed">{t.subtitle}</p>
          </div>

          <button
            type="button"
            onClick={() => setShowPoModal(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition shadow-md flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <span>📄</span>
            <span>{t.viewPoBtn}</span>
          </button>
        </div>

        {/* PO & Financial Coordinates Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-white/10 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold">{t.poRef}</span>
            <div className="font-mono font-bold text-white mt-0.5">{poNumber}</div>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold">{t.orderVolume}</span>
            <div className="font-bold text-white mt-0.5">{orderVolume}</div>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold">{t.factoryValue}</span>
            <div className="font-mono font-bold text-emerald-400 mt-0.5">
              €{factoryCost.toLocaleString()} {currency}
            </div>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold">{t.advanceStatus}</span>
            <div className="text-emerald-400 font-bold mt-0.5 flex items-center gap-1">
              <span>{milestones.deposit_transferred ? "✓" : "⏳"}</span>
              <span className="text-[11px]">
                {milestones.deposit_transferred ? t.advanceCleared : t.advancePending}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold text-xs animate-in fade-in">
          {actionMsg}
        </div>
      )}

      {/* Progress Bar Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-2">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-slate-700">{t.milestonesTitle}</span>
          <span className="text-emerald-700 font-mono">{progressPercent}%</span>
        </div>
        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
          <div
            className="h-full bg-emerald-600 transition-all duration-500 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* ── 4-Stage Interactive Production Milestones ── */}
      <div className="space-y-4">
        {/* MILESTONE 1: 30% Advance Deposit */}
        <div
          className={`p-5 rounded-2xl border transition ${
            milestones.deposit_transferred
              ? "bg-white border-emerald-300 shadow-2xs"
              : "bg-slate-50 border-slate-200"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span
                className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                  milestones.deposit_transferred
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {milestones.deposit_transferred ? "✓" : "1"}
              </span>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">{t.m1Title}</h4>
                <p className="text-xs text-slate-500 mt-0.5">{t.m1Desc}</p>
                <div className="text-[11px] font-mono text-emerald-800 font-semibold mt-1">
                  30% Factory Advance Wire: €{Math.round(factoryCost * 0.3).toLocaleString()} {currency}
                </div>
              </div>
            </div>

            <span
              className={`text-xs font-bold px-3 py-1 rounded-full border ${
                milestones.deposit_transferred
                  ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                  : "bg-slate-100 text-slate-600 border-slate-300"
              }`}
            >
              {milestones.deposit_transferred ? t.completedBadge : t.pendingBadge}
            </span>
          </div>
        </div>

        {/* MILESTONE 2: Bottling & Private Label */}
        <div
          className={`p-5 rounded-2xl border transition ${
            milestones.bottling_completed
              ? "bg-white border-emerald-300 shadow-2xs"
              : "bg-white border-slate-200"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <span
                className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                  milestones.bottling_completed
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {milestones.bottling_completed ? "✓" : "2"}
              </span>
              <div className="space-y-3 flex-1">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{t.m2Title}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{t.m2Desc}</p>
                </div>

                {!milestones.bottling_completed ? (
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5 max-w-md">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        {t.m2LotLabel}
                      </label>
                      <input
                        type="text"
                        value={lotNumber}
                        onChange={(e) => setLotNumber(e.target.value)}
                        placeholder="e.g. LOT-2026-IT49 / EXP 11-2028"
                        className="w-full p-2 rounded-lg border border-slate-200 text-xs bg-white font-mono"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleUpdateMilestone("bottling_completed", true)}
                      className="w-full py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs transition shadow-xs cursor-pointer"
                    >
                      {isPending ? t.saving : t.m2Btn}
                    </button>
                  </div>
                ) : (
                  <div className="text-xs font-mono text-emerald-800 font-semibold">
                    ✓ Bottling verified and completed on packaging lines.
                  </div>
                )}
              </div>
            </div>

            <span
              className={`text-xs font-bold px-3 py-1 rounded-full border shrink-0 ${
                milestones.bottling_completed
                  ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                  : "bg-slate-100 text-slate-600 border-slate-300"
              }`}
            >
              {milestones.bottling_completed ? t.completedBadge : t.pendingBadge}
            </span>
          </div>
        </div>

        {/* MILESTONE 3: Pre-Shipment Inspection (PSI) */}
        <div
          className={`p-5 rounded-2xl border transition ${
            milestones.psi_inspection_passed
              ? "bg-white border-emerald-300 shadow-2xs"
              : "bg-white border-slate-200"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <span
                className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                  milestones.psi_inspection_passed
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {milestones.psi_inspection_passed ? "✓" : "3"}
              </span>
              <div className="space-y-3 flex-1">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{t.m3Title}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{t.m3Desc}</p>
                </div>

                {!milestones.psi_inspection_passed ? (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleUpdateMilestone("psi_inspection_passed", true)}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-xs cursor-pointer"
                  >
                    {isPending ? t.saving : t.m3Btn}
                  </button>
                ) : (
                  <div className="text-xs font-mono text-emerald-800 font-semibold">
                    ✓ Pre-Shipment Inspection and Lab COA passed and logged.
                  </div>
                )}
              </div>
            </div>

            <span
              className={`text-xs font-bold px-3 py-1 rounded-full border shrink-0 ${
                milestones.psi_inspection_passed
                  ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                  : "bg-slate-100 text-slate-600 border-slate-300"
              }`}
            >
              {milestones.psi_inspection_passed ? t.completedBadge : t.pendingBadge}
            </span>
          </div>
        </div>

        {/* MILESTONE 4: Container Loading & Ocean B/L */}
        <div
          className={`p-5 rounded-2xl border transition ${
            milestones.container_loaded
              ? "bg-white border-emerald-300 shadow-2xs"
              : "bg-white border-slate-200"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <span
                className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                  milestones.container_loaded
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {milestones.container_loaded ? "✓" : "4"}
              </span>
              <div className="space-y-3 flex-1">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{t.m4Title}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{t.m4Desc}</p>
                </div>

                <form onSubmit={handleSaveShipping} className="space-y-3 max-w-xl">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        {t.containerNumLabel}
                      </label>
                      <input
                        type="text"
                        value={containerNumber}
                        onChange={(e) => setContainerNumber(e.target.value)}
                        placeholder="MSKU-9481029"
                        className="w-full p-2 rounded-lg border border-slate-200 text-xs bg-slate-50 font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        {t.blLabel}
                      </label>
                      <input
                        type="text"
                        value={billOfLading}
                        onChange={(e) => setBillOfLading(e.target.value)}
                        placeholder="MSCUVAL881920"
                        className="w-full p-2 rounded-lg border border-slate-200 text-xs bg-slate-50 font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        {t.carrierLabel}
                      </label>
                      <input
                        type="text"
                        value={shippingLine}
                        onChange={(e) => setShippingLine(e.target.value)}
                        placeholder="MSC / Maersk / ZIM"
                        className="w-full p-2 rounded-lg border border-slate-200 text-xs bg-slate-50"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        {t.etdLabel}
                      </label>
                      <input
                        type="date"
                        value={etd}
                        onChange={(e) => setEtd(e.target.value)}
                        className="w-full p-2 rounded-lg border border-slate-200 text-xs bg-slate-50 font-mono"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isPending}
                    className="px-6 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition shadow-xs cursor-pointer"
                  >
                    {isPending ? t.saving : t.m4Btn}
                  </button>
                </form>
              </div>
            </div>

            <span
              className={`text-xs font-bold px-3 py-1 rounded-full border shrink-0 ${
                milestones.container_loaded
                  ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                  : "bg-slate-100 text-slate-600 border-slate-300"
              }`}
            >
              {milestones.container_loaded ? t.completedBadge : t.pendingBadge}
            </span>
          </div>
        </div>
      </div>

      {/* ── Official Commercial PO Modal ── */}
      <CommercialPoDocumentModal
        isOpen={showPoModal}
        onClose={() => setShowPoModal(false)}
        poNumber={poNumber}
        buyerCompany={buyerCompany}
        buyerAddress={buyerAddress}
        supplierName={companyName}
        productName={matchedProductName}
        orderVolume={orderVolume}
        unitPrice={unitPrice}
        currency={currency}
        totalOrderValue={totalOrderValue}
        incoterms={incoterms}
      />
    </div>
  );
}
