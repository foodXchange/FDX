"use client";

import { useState } from "react";
import {
  SUPPLIER_PORTAL_TRANSLATIONS,
  type SupplierPortalLanguage,
} from "@/lib/outreach/supplierPortalI18n";

interface UploadedDoc {
  name: string;
  url: string;
  size?: number;
  type?: string;
}

interface Props {
  matchId: string;
  companyName: string;
  matchedProductName: string;
  defaultEmail: string;
  defaultPhone: string;
  existingResponse: string | null;
  initialLanguage?: SupplierPortalLanguage;
}

const CERT_OPTIONS = [
  "BRCGS Food Safety",
  "IFS Food",
  "ISO 22000 / FSSC",
  "Kosher Certified (Chief Rabbinate / Badatz)",
  "Kosher Capable (Can Arrange Production)",
  "Halal Certified",
  "Organic / Bio (EU / USDA)",
  "Non-GMO Verified",
  "Gluten-Free",
];

const INCOTERMS_OPTIONS = [
  "CIF Ashdod Port (Israel)",
  "CIF Haifa Port (Israel)",
  "FOB Port of Origin",
  "EXW (Ex Works Factory)",
  "CFR Ashdod Port",
  "DDP Tel Aviv / Central Warehouse",
];

export default function SupplierMatchQuoteForm({
  matchId,
  companyName,
  matchedProductName,
  defaultEmail,
  defaultPhone,
  existingResponse,
  initialLanguage = "en",
}: Props) {
  const [lang, setLang] = useState<SupplierPortalLanguage>(initialLanguage);
  const t = SUPPLIER_PORTAL_TRANSLATIONS[lang] || SUPPLIER_PORTAL_TRANSLATIONS.en;

  // 1. Availability
  const [responseType, setResponseType] = useState<"accepted" | "countered" | "declined">("accepted");

  // 2. Commercial Terms
  const [indicativePrice, setIndicativePrice] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [priceUnit, setPriceUnit] = useState("unit");
  const [incoterm, setIncoterm] = useState("CIF Ashdod Port (Israel)");
  const [moq, setMoq] = useState("");
  const [leadTimeWeeks, setLeadTimeWeeks] = useState("3");
  const [paymentTerms, setPaymentTerms] = useState("30% advance, 70% against B/L copy");

  // 3. Packaging & Logistics
  const [netWeight, setNetWeight] = useState("");
  const [packagingFormat, setPackagingFormat] = useState("");
  const [unitsPerCase, setUnitsPerCase] = useState("");
  const [casesPerPallet, setCasesPerPallet] = useState("");
  const [shelfLifeMonths, setShelfLifeMonths] = useState("18");
  const [labelOption, setLabelOption] = useState("Both Private Label & Factory Brand");

  // 4. Certifications
  const [confirmedCerts, setConfirmedCerts] = useState<string[]>([]);

  // 5. Technical Spec & Certificate Uploads
  const [uploadedFiles, setUploadedFiles] = useState<UploadedDoc[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // 6. Courier Samples
  const [samplesAvailable, setSamplesAvailable] = useState("Yes — Tasting samples ready to dispatch immediately");
  const [sampleStatus, setSampleStatus] = useState<"ready" | "dispatched" | "on_alignment" | "digital_only">("ready");
  const [sampleCourier, setSampleCourier] = useState("DHL Express");
  const [sampleAwb, setSampleAwb] = useState("");
  const [sampleDispatchDate, setSampleDispatchDate] = useState("");

  // 7. Contact & Notes
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState(defaultEmail);
  const [contactPhone, setContactPhone] = useState(defaultPhone);
  const [message, setMessage] = useState("");

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleCert(cert: string) {
    setConfirmedCerts((prev) =>
      prev.includes(cert) ? prev.filter((c) => c !== cert) : [...prev, cert]
    );
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadError(null);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch(`/api/supplier-match/${matchId}/upload`, {
          method: "POST",
          body: formData,
        });

        const json = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(json.error || `Failed to upload ${file.name}`);
        }

        setUploadedFiles((prev) => [
          ...prev,
          {
            name: json.name || file.name,
            url: json.url,
            size: json.size || file.size,
            type: json.type || file.type,
          },
        ]);
      }
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Upload error. Please try again.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function removeFile(index: number) {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const numericPrice = parseFloat(indicativePrice.replace(/[^0-9.]/g, "")) || null;
    const numericWeeks = parseInt(leadTimeWeeks, 10) || null;
    const numericUnitsPerCase = parseInt(unitsPerCase, 10) || null;
    const numericCasesPerPallet = parseInt(casesPerPallet, 10) || null;
    const numericShelfLife = parseInt(shelfLifeMonths, 10) || null;

    try {
      const res = await fetch(`/api/supplier-match/${matchId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          responseType,
          indicativePrice,
          unitPrice: numericPrice,
          currency,
          priceUnit,
          incoterm,
          moq,
          leadTime: leadTimeWeeks ? `${leadTimeWeeks} weeks` : "",
          leadTimeWeeks: numericWeeks,
          paymentTerms,
          netWeight,
          packagingFormat,
          unitsPerCase: numericUnitsPerCase,
          casesPerPallet: numericCasesPerPallet,
          shelfLifeMonths: numericShelfLife,
          labelOption,
          confirmedCerts,
          uploadedFiles,
          samplesAvailable,
          sampleStatus,
          sampleCourier: sampleCourier.trim(),
          sampleAwb: sampleAwb.trim(),
          sampleDispatchDate: sampleDispatchDate.trim(),
          contactName: contactName.trim(),
          contactEmail: contactEmail.trim(),
          contactPhone: contactPhone.trim(),
          message: message.trim(),
        }),
      });

      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };

      if (!res.ok || !json.ok) {
        setError(json.error ?? "Could not submit response. Please try again.");
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Network error. Please try again or reply directly to our email.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="bg-emerald-50/90 border border-emerald-200 rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-xs animate-in fade-in duration-200">
        <div className="w-14 h-14 rounded-full bg-emerald-600 text-white flex items-center justify-center text-3xl mx-auto shadow-sm">
          ✓
        </div>
        <div>
          <h2 className="text-xl font-bold text-emerald-950">
            {t.thankYouTitle}
          </h2>
          <p className="text-sm font-semibold text-emerald-700 mt-0.5">
            {companyName} · {matchedProductName}
          </p>
        </div>

        <p className="text-xs sm:text-sm text-emerald-850 max-w-lg mx-auto leading-relaxed">
          {t.thankYouMessage}
        </p>

        {/* Recap card */}
        <div className="bg-white/80 border border-emerald-200 rounded-xl p-4 max-w-md mx-auto text-left text-xs space-y-1.5 text-slate-700">
          <div className="font-bold uppercase tracking-wider text-[10px] text-emerald-800 pb-1 border-b border-emerald-100">
            Submitted Offer Summary:
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Status:</span>
            <span className="font-bold text-slate-900">
              {responseType === "accepted" ? "✅ Can Supply" : responseType === "countered" ? "🔄 Alternative Proposal" : "❌ Cannot Supply"}
            </span>
          </div>
          {indicativePrice && (
            <div className="flex justify-between">
              <span className="text-slate-500">Price & Incoterm:</span>
              <span className="font-bold text-slate-900">
                {currency} {indicativePrice} / {priceUnit} ({incoterm})
              </span>
            </div>
          )}
          {moq && (
            <div className="flex justify-between">
              <span className="text-slate-500">MOQ:</span>
              <span className="font-semibold text-slate-800">{moq}</span>
            </div>
          )}
          {sampleAwb && (
            <div className="flex justify-between">
              <span className="text-slate-500">Courier Tracking:</span>
              <span className="font-mono font-bold text-emerald-850">{sampleCourier} · {sampleAwb}</span>
            </div>
          )}
          {uploadedFiles.length > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-500">Attached Files:</span>
              <span className="font-semibold text-slate-800">{uploadedFiles.length} document(s)</span>
            </div>
          )}
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setSubmitted(false)}
            className="text-xs font-semibold text-emerald-800 underline hover:text-emerald-950 cursor-pointer"
          >
            {t.updateResponseButton}
          </button>
          <span className="hidden sm:inline text-slate-300">·</span>
          <a
            href="https://wa.me/972544990201?text=Hello%2C%20regarding%20inquiry%20Ref%20FoodXchange"
            target="_blank"
            rel="noreferrer"
            className="text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-lg border border-emerald-300 transition"
          >
            💬 {t.contactDeskWhatsapp}
          </a>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ── Language Toggle Bar ── */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 gap-2 flex-wrap">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          🌐 Language / Idioma / Lingua:
        </span>
        <div className="flex items-center gap-1">
          {(
            [
              { code: "en", label: "English", flag: "🇬🇧" },
              { code: "es", label: "Español", flag: "🇪🇸" },
              { code: "it", label: "Italiano", flag: "🇮🇹" },
              { code: "fr", label: "Français", flag: "🇫🇷" },
              { code: "de", label: "Deutsch", flag: "🇩🇪" },
            ] as const
          ).map((item) => (
            <button
              key={item.code}
              type="button"
              onClick={() => setLang(item.code)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                lang === item.code
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <span>{item.flag}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {existingResponse && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-900">
          <strong>ℹ️ {t.previousResponseNote}</strong>
        </div>
      )}

      {/* ── Section 1: Product Availability Decision ── */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2.5">
          {t.sec1Title}
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => setResponseType("accepted")}
            className={`p-4 rounded-xl border text-left transition cursor-pointer ${
              responseType === "accepted"
                ? "border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500/20 shadow-xs"
                : "border-slate-200 hover:border-slate-300 bg-white"
            }`}
          >
            <div className="text-sm font-bold text-slate-900">
              {t.canSupplyTitle}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 leading-snug">
              {t.canSupplyDesc}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setResponseType("countered")}
            className={`p-4 rounded-xl border text-left transition cursor-pointer ${
              responseType === "countered"
                ? "border-amber-500 bg-amber-50/70 ring-2 ring-amber-500/20 shadow-xs"
                : "border-slate-200 hover:border-slate-300 bg-white"
            }`}
          >
            <div className="text-sm font-bold text-slate-900">
              {t.similarOptionTitle}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 leading-snug">
              {t.similarOptionDesc}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setResponseType("declined")}
            className={`p-4 rounded-xl border text-left transition cursor-pointer ${
              responseType === "declined"
                ? "border-red-500 bg-red-50/70 ring-2 ring-red-500/20 shadow-xs"
                : "border-slate-200 hover:border-slate-300 bg-white"
            }`}
          >
            <div className="text-sm font-bold text-slate-900">
              {t.cannotSupplyTitle}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 leading-snug">
              {t.cannotSupplyDesc}
            </div>
          </button>
        </div>
      </div>

      {responseType !== "declined" && (
        <>
          {/* ── Section 2: Commercial Pricing & Terms ── */}
          <div className="pt-2 border-t border-slate-100 space-y-3.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              {t.sec2Title}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {/* Unit Price */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.unitPriceLabel} *
                </label>
                <div className="relative flex rounded-xl border border-slate-200 overflow-hidden focus-within:ring-2 focus-within:ring-orange-500">
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="bg-slate-50 border-r border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none"
                  >
                    <option value="EUR">€ EUR</option>
                    <option value="USD">$ USD</option>
                    <option value="GBP">£ GBP</option>
                    <option value="ILS">₪ ILS</option>
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={indicativePrice}
                    onChange={(e) => setIndicativePrice(e.target.value)}
                    placeholder="1.85"
                    className="w-full px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none"
                  />
                  <select
                    value={priceUnit}
                    onChange={(e) => setPriceUnit(e.target.value)}
                    className="bg-slate-50 border-l border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none"
                  >
                    <option value="unit">/ unit</option>
                    <option value="kg">/ kg</option>
                    <option value="carton">/ case</option>
                    <option value="metric_ton">/ MT</option>
                  </select>
                </div>
              </div>

              {/* Incoterms */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.incotermLabel}
                </label>
                <select
                  value={incoterm}
                  onChange={(e) => setIncoterm(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {INCOTERMS_OPTIONS.map((term) => (
                    <option key={term} value={term}>
                      {term}
                    </option>
                  ))}
                </select>
              </div>

              {/* MOQ */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.moqLabel}
                </label>
                <input
                  type="text"
                  value={moq}
                  onChange={(e) => setMoq(e.target.value)}
                  placeholder={t.moqPlaceholder}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Lead Time */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.leadTimeLabel}
                </label>
                <input
                  type="text"
                  value={leadTimeWeeks}
                  onChange={(e) => setLeadTimeWeeks(e.target.value)}
                  placeholder="3 weeks"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Payment Terms */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.paymentTermsLabel}
                </label>
                <input
                  type="text"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  placeholder="30/70 B/L"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
          </div>

          {/* ── Section 3: Packaging & Logistics Specifications ── */}
          <div className="pt-2 border-t border-slate-100 space-y-3.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              {t.sec3Title}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.netWeightLabel}
                </label>
                <input
                  type="text"
                  value={netWeight}
                  onChange={(e) => setNetWeight(e.target.value)}
                  placeholder={t.netWeightPlaceholder}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.packagingFormatLabel}
                </label>
                <input
                  type="text"
                  value={packagingFormat}
                  onChange={(e) => setPackagingFormat(e.target.value)}
                  placeholder={t.packagingFormatPlaceholder}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.brandingLabel}
                </label>
                <select
                  value={labelOption}
                  onChange={(e) => setLabelOption(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="Both Private Label & Factory Brand">
                    {t.brandingBoth}
                  </option>
                  <option value="Private Label Only">
                    {t.brandingPrivateLabelOnly}
                  </option>
                  <option value="Factory Brand Only">
                    {t.brandingProducerOnly}
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.unitsPerCaseLabel}
                </label>
                <input
                  type="number"
                  min="1"
                  value={unitsPerCase}
                  onChange={(e) => setUnitsPerCase(e.target.value)}
                  placeholder="e.g. 12"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.casesPerPalletLabel}
                </label>
                <input
                  type="number"
                  min="1"
                  value={casesPerPallet}
                  onChange={(e) => setCasesPerPallet(e.target.value)}
                  placeholder="e.g. 72"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.shelfLifeLabel}
                </label>
                <input
                  type="number"
                  min="1"
                  value={shelfLifeMonths}
                  onChange={(e) => setShelfLifeMonths(e.target.value)}
                  placeholder="18"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
          </div>

          {/* ── Section 4: Certifications & Quality ── */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              {t.sec4Title}
            </h3>
            <p className="text-xs text-slate-500">
              {t.sec4Subtitle}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {CERT_OPTIONS.map((cert) => {
                const active = confirmedCerts.includes(cert);
                return (
                  <button
                    key={cert}
                    type="button"
                    onClick={() => toggleCert(cert)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer ${
                      active
                        ? "bg-orange-600 text-white border-orange-600 shadow-2xs"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {active ? `✓ ${cert}` : cert}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Section 5: Technical Spec Sheet (TDS) & Documents Upload ── */}
          <div className="pt-2 border-t border-slate-100 space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              {t.sec5Title}
            </h3>
            <p className="text-xs text-slate-500">
              {t.sec5Subtitle}
            </p>

            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 px-4 py-2.5 rounded-xl cursor-pointer transition shadow-2xs">
                <span>{uploading ? "⏳" : "📎"}</span>
                <span>{uploading ? t.uploading : t.uploadButton}</span>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
              {uploadError && (
                <span className="text-xs font-semibold text-red-600">
                  ⚠️ {uploadError}
                </span>
              )}
            </div>

            {uploadedFiles.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="text-[11px] font-bold uppercase text-slate-500">
                  {t.uploadedFilesLabel}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {uploadedFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-base">📄</span>
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-slate-800 hover:text-orange-600 truncate max-w-[200px]"
                        >
                          {file.name}
                        </a>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="text-slate-400 hover:text-red-600 font-bold px-2 py-0.5 text-xs cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Section 6: Courier Sample Dispatch (Stage 4 Sync) ── */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              {t.sec6Title}
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t.sampleStatusLabel}
              </label>
              <select
                value={samplesAvailable}
                onChange={(e) => {
                  setSamplesAvailable(e.target.value);
                  if (e.target.value.includes("ready")) setSampleStatus("ready");
                  else if (e.target.value.includes("Already dispatched")) setSampleStatus("dispatched");
                  else if (e.target.value.includes("after initial")) setSampleStatus("on_alignment");
                  else setSampleStatus("digital_only");
                }}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="Yes — Tasting samples ready to dispatch immediately">
                  {t.sampleReady}
                </option>
                <option value="Already dispatched via courier to Tel Aviv">
                  {t.sampleDispatched}
                </option>
                <option value="Available after initial commercial alignment">
                  {t.sampleOnPriceAlignment}
                </option>
                <option value="Digital specifications first">
                  {t.sampleDigitalOnly}
                </option>
              </select>
            </div>

            {(sampleStatus === "ready" || sampleStatus === "dispatched" || samplesAvailable.includes("courier")) && (
              <div className="p-3.5 bg-orange-50/60 border border-orange-200/80 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t.courierServiceLabel}
                  </label>
                  <select
                    value={sampleCourier}
                    onChange={(e) => setSampleCourier(e.target.value)}
                    className="w-full rounded-lg border border-orange-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900"
                  >
                    <option value="DHL Express">DHL Express</option>
                    <option value="FedEx Express">FedEx Express</option>
                    <option value="UPS Express">UPS Express</option>
                    <option value="TNT">TNT</option>
                    <option value="GLS">GLS</option>
                    <option value="Other Courier">Other Courier</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t.courierAwbLabel}
                  </label>
                  <input
                    type="text"
                    value={sampleAwb}
                    onChange={(e) => setSampleAwb(e.target.value)}
                    placeholder={t.courierAwbPlaceholder}
                    className="w-full rounded-lg border border-orange-200 bg-white px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t.dispatchDateLabel}
                  </label>
                  <input
                    type="date"
                    value={sampleDispatchDate}
                    onChange={(e) => setSampleDispatchDate(e.target.value)}
                    className="w-full rounded-lg border border-orange-200 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                  />
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Section 7: Export Department Contact & Notes ── */}
      <div className="pt-2 border-t border-slate-100 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
          {t.sec7Title}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t.contactNameLabel}
            </label>
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder={t.contactNamePlaceholder}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t.contactEmailLabel}
            </label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="export@company.com"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t.contactPhoneLabel}
            </label>
            <input
              type="text"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="+34 / +39..."
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            {t.notesLabel}
          </label>
          <textarea
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t.notesPlaceholder}
            className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 leading-relaxed"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-xs text-red-700 font-semibold">
          ⚠️ {error}
        </div>
      )}

      {/* ── Submit CTA ── */}
      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3.5 px-6 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold text-sm shadow-md transition cursor-pointer flex items-center justify-center gap-2"
      >
        {submitting ? (
          <span>{t.submittingButton}</span>
        ) : (
          <span>{t.submitButton}</span>
        )}
      </button>
    </form>
  );
}
