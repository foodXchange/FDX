"use client";

import { useRef, useState } from "react";

interface SourcingWidgetProps {
  source?: string;
  onSuccess?: () => void;
  compact?: boolean;
}

interface UploadedImage {
  url: string;
  filename: string;
  preview: string;
  uploading: boolean;
  error: string | null;
}

interface Analysis {
  product_name: string | null;
  category: string | null;
  packaging_format: string | null;
  approximate_size: string | null;
  certifications_visible: string[];
  private_label_suitable: boolean | null;
  sourcing_keywords: string[];
  confidence: number;
  notes: string | null;
}

const WHATSAPP_NUMBER = "972525222291";

function ProgressBar({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="flex gap-1 mb-6">
      {[1, 2, 3].map((s) => (
        <div
          key={s}
          className={`h-1 flex-1 rounded-full transition-colors ${
            s <= step ? "bg-orange-500" : "bg-slate-100"
          }`}
        />
      ))}
    </div>
  );
}

export default function SourcingWidget({
  source,
  onSuccess,
  compact = false,
}: SourcingWidgetProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [description, setDescription] = useState("");
  const [analysing, setAnalysing] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [chips, setChips] = useState({
    market: "",
    privateLabel: null as boolean | null,
    certifications: [] as string[],
  });
  const [contact, setContact] = useState({
    name: "",
    email: "",
    whatsapp: "",
    company: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  async function analyseImage(url: string) {
    setAnalysing(true);
    try {
      const res = await fetch("/api/sourcing/analyse-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: url, description: description || undefined }),
      });
      const data = await res.json();
      if (data.analysis) setAnalysis(data.analysis);
    } catch {
      // Silent fail — analysis is optional
    } finally {
      setAnalysing(false);
    }
  }

  async function handleFiles(files: FileList) {
    const newFiles = Array.from(files).slice(0, 5 - images.length);

    for (const file of newFiles) {
      const preview = URL.createObjectURL(file);
      const placeholder: UploadedImage = {
        url: "",
        filename: file.name,
        preview,
        uploading: true,
        error: null,
      };
      setImages((prev) => [...prev, placeholder]);

      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch("/api/sourcing/upload-image", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();

        if (data.ok) {
          setImages((prev) =>
            prev.map((img) =>
              img.preview === preview
                ? { ...img, url: data.url, uploading: false }
                : img
            )
          );
          if (images.length === 0) {
            analyseImage(data.url);
          }
        } else {
          setImages((prev) =>
            prev.map((img) =>
              img.preview === preview
                ? { ...img, uploading: false, error: data.error }
                : img
            )
          );
        }
      } catch {
        setImages((prev) =>
          prev.map((img) =>
            img.preview === preview
              ? { ...img, uploading: false, error: "Upload failed" }
              : img
          )
        );
      }
    }
  }

  async function handleSubmit() {
    if (!contact.name || !contact.email) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/sourcing/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: contact.name,
          email: contact.email,
          whatsapp: contact.whatsapp || undefined,
          company: contact.company || undefined,
          description: description || undefined,
          product_name: analysis?.product_name ?? undefined,
          category: (analysis?.category ?? chips.market) || undefined,
          certifications: [
            ...chips.certifications,
            ...(analysis?.certifications_visible ?? []),
          ],
          target_market: chips.market || undefined,
          private_label: chips.privateLabel,
          image_urls: images.filter((i) => i.url).map((i) => i.url),
          ai_analysis: analysis ?? undefined,
          source: source ?? "sourcing-widget",
        }),
      });

      const data = await res.json();

      if (res.status === 429) {
        setError(data.message ?? "Too many requests. Please wait.");
        return;
      }

      if (!data.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }

      setSubmitted(true);
      onSuccess?.();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const cardCls =
    "bg-white rounded-2xl shadow-lg border border-slate-100 p-6 md:p-8 max-w-xl mx-auto";

  const inputCls =
    "border border-slate-200 rounded-xl px-4 py-3 text-sm w-full focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400 transition";

  const continueBtnCls =
    "w-full mt-6 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl text-base transition active:scale-[0.98]";

  // ── SUCCESS STATE ────────────────────────────────────────────
  if (submitted) {
    const waText = encodeURIComponent(
      `Hi, I just submitted a sourcing request on FoodXchange.\n\n` +
        (analysis?.product_name ? `Product: ${analysis.product_name}\n` : "") +
        (description ? `Details: ${description}` : "")
    );
    return (
      <div className={cardCls}>
        <div className="text-center py-12 px-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">✓</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Request received</h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-8 max-w-sm mx-auto">
            We review every request personally and follow up only when we have a relevant
            match — usually within 1–2 business days.
          </p>
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}?text=${waText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-green-500 hover:bg-green-600 text-white font-semibold px-8 py-4 rounded-xl text-base shadow-lg shadow-green-500/20 transition active:scale-95 mb-4"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.121 1.532 5.856L0 24l6.336-1.51A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.885 0-3.65-.488-5.19-1.345l-.37-.217-3.84.915.977-3.717-.24-.386A9.95 9.95 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
            </svg>
            Follow up on WhatsApp
          </a>
          <p className="text-xs text-slate-400">Opens WhatsApp with your request pre-filled</p>
        </div>
      </div>
    );
  }

  // ── STEP 1 ───────────────────────────────────────────────────
  if (step === 1) {
    const canContinue = !(images.every((i) => !i.url) && description.trim().length < 3);
    return (
      <div className={cardCls}>
        {!compact && (
          <>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Found a product you want to source?
            </h2>
            <p className="text-slate-500 text-sm leading-relaxed mb-6">
              Upload a reference photo — a product from a supermarket shelf, trade show, or
              packaging you like. Or simply describe what you need. A photo alone is enough to
              get started.
            </p>
          </>
        )}

        {/* Upload zone */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />

        {images.length === 0 ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFiles(e.dataTransfer.files);
            }}
            className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center cursor-pointer hover:border-orange-400 hover:bg-orange-50/30 transition-all duration-200"
          >
            <div className="text-4xl mb-2">📸</div>
            <p className="font-medium text-slate-700">Upload reference images</p>
            <p className="text-sm text-slate-400 mt-1">Drag and drop or click to browse</p>
            <p className="text-xs text-slate-300 mt-2">
              JPG, PNG, WebP, PDF · Max 5 files · 10MB each
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {images.map((img, idx) => (
              <div
                key={idx}
                className={`relative rounded-xl overflow-hidden aspect-square bg-slate-100 ${
                  img.error ? "ring-2 ring-red-400" : ""
                }`}
              >
                <img
                  src={img.preview}
                  alt={img.filename}
                  className="w-full h-full object-cover"
                />
                {img.uploading && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  </div>
                )}
                {img.error && (
                  <div className="absolute inset-0 bg-red-500/20 flex items-end p-1">
                    <p className="text-xs text-red-700 leading-tight">{img.error}</p>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setImages((prev) => prev.filter((_, i) => i !== idx))}
                  className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs leading-none transition"
                >
                  ×
                </button>
              </div>
            ))}
            {images.length < 5 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-xl border-2 border-dashed border-slate-200 hover:border-orange-400 hover:bg-orange-50/30 flex items-center justify-center text-slate-400 hover:text-orange-500 text-sm transition"
              >
                + Add
              </button>
            )}
          </div>
        )}

        {/* AI analysis result */}
        {(analysis || analysing) && (
          <div className="mt-4 bg-orange-50 border border-orange-100 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide">
                ✦ We detected
              </p>
              {analysing && (
                <span className="text-xs text-orange-500 animate-pulse">Analysing...</span>
              )}
            </div>
            {analysis && (
              <div className="flex flex-wrap gap-2">
                {analysis.product_name && (
                  <span className="bg-white border border-orange-200 text-orange-700 rounded-full px-3 py-1 text-xs font-medium">
                    {analysis.product_name}
                  </span>
                )}
                {analysis.packaging_format && (
                  <span className="bg-white border border-orange-200 text-orange-700 rounded-full px-3 py-1 text-xs">
                    {analysis.packaging_format}
                  </span>
                )}
                {analysis.approximate_size && (
                  <span className="bg-white border border-orange-200 text-orange-700 rounded-full px-3 py-1 text-xs">
                    {analysis.approximate_size}
                  </span>
                )}
                {analysis.certifications_visible.map((cert) => (
                  <span
                    key={cert}
                    className="bg-green-50 border border-green-200 text-green-700 rounded-full px-3 py-1 text-xs"
                  >
                    {cert}
                  </span>
                ))}
              </div>
            )}
            <p className="text-xs text-orange-500 mt-2">Not right? Add more detail below.</p>
          </div>
        )}

        {/* Description */}
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Or describe what you're looking for — product type, packaging, any requirements that matter to you. No need to be precise."
          rows={3}
          maxLength={2000}
          className="w-full mt-4 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-300 resize-none focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400 transition"
        />
        <p className="text-right text-xs text-slate-300 mt-1">{description.length}/2000</p>

        <button
          onClick={() => setStep(2)}
          disabled={!canContinue}
          className={continueBtnCls}
        >
          Continue →
        </button>
        <p className="text-center text-xs text-slate-400 mt-3">
          You can submit with just an image, just text, or both
        </p>
      </div>
    );
  }

  // ── STEP 2 ───────────────────────────────────────────────────
  if (step === 2) {
    const marketOptions = ["Retail", "Foodservice", "Industry"];
    const privateLabelOptions = [
      { label: "Private label", value: true },
      { label: "Branded product", value: false },
      { label: "Either works", value: null },
    ];
    const certOptions = [
      "Kosher",
      "Halal",
      "Organic",
      "BRC / IFS",
      "FSSC 22000",
      "No preference",
    ];

    return (
      <div className={cardCls}>
        <ProgressBar step={2} />
        <button
          type="button"
          onClick={() => setStep(1)}
          className="text-orange-500 text-sm mb-4 hover:text-orange-600 transition"
        >
          ← Back
        </button>
        <h2 className="text-2xl font-bold text-slate-900 mb-1">A few quick details</h2>
        <p className="text-slate-500 text-sm mb-6">
          Optional — tap what applies. Skip anything that does not.
        </p>

        {/* Market */}
        <div className="mb-6">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Target market
          </p>
          <div className="flex flex-wrap gap-2">
            {marketOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() =>
                  setChips((prev) => ({ ...prev, market: prev.market === opt ? "" : opt }))
                }
                className={`px-4 py-2 rounded-full text-sm transition ${
                  chips.market === opt
                    ? "bg-orange-500 text-white"
                    : "border border-slate-200 text-slate-600 hover:border-orange-300"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Private label */}
        <div className="mb-6">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Private label or branded?
          </p>
          <div className="flex flex-wrap gap-2">
            {privateLabelOptions.map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() =>
                  setChips((prev) => ({
                    ...prev,
                    privateLabel: prev.privateLabel === opt.value ? null : opt.value,
                  }))
                }
                className={`px-4 py-2 rounded-full text-sm transition ${
                  chips.privateLabel === opt.value && opt.value !== null
                    ? "bg-orange-500 text-white"
                    : chips.privateLabel === null && opt.value === null
                    ? "bg-orange-500 text-white"
                    : "border border-slate-200 text-slate-600 hover:border-orange-300"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Certifications */}
        <div className="mb-6">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Certifications needed
          </p>
          <div className="flex flex-wrap gap-2">
            {certOptions.map((cert) => (
              <button
                key={cert}
                type="button"
                onClick={() =>
                  setChips((prev) => ({
                    ...prev,
                    certifications: prev.certifications.includes(cert)
                      ? prev.certifications.filter((c) => c !== cert)
                      : [...prev.certifications, cert],
                  }))
                }
                className={`px-4 py-2 rounded-full text-sm transition ${
                  chips.certifications.includes(cert)
                    ? "bg-slate-900 text-white"
                    : "border border-slate-200 text-slate-600 hover:border-slate-400"
                }`}
              >
                {cert}
              </button>
            ))}
          </div>
        </div>

        <button onClick={() => setStep(3)} className={continueBtnCls}>
          Continue →
        </button>
      </div>
    );
  }

  // ── STEP 3 ───────────────────────────────────────────────────
  return (
    <div className={cardCls}>
      <ProgressBar step={3} />
      <button
        type="button"
        onClick={() => setStep(2)}
        className="text-orange-500 text-sm mb-4 hover:text-orange-600 transition"
      >
        ← Back
      </button>
      <h2 className="text-2xl font-bold text-slate-900 mb-1">How should we reach you?</h2>
      <p className="text-slate-500 text-sm mb-6">
        We review every request and follow up only when we have a relevant match.
      </p>

      <div className="space-y-4">
        <div>
          <input
            type="text"
            value={contact.name}
            onChange={(e) => setContact((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Your name *"
            className={inputCls}
            autoComplete="name"
          />
        </div>
        <div>
          <input
            type="email"
            value={contact.email}
            onChange={(e) => setContact((prev) => ({ ...prev, email: e.target.value }))}
            placeholder="Email address *"
            className={inputCls}
            autoComplete="email"
          />
        </div>
        <div>
          <input
            type="tel"
            value={contact.whatsapp}
            onChange={(e) => setContact((prev) => ({ ...prev, whatsapp: e.target.value }))}
            placeholder="+972 50 000 0000 (WhatsApp — fastest way to follow up)"
            className={inputCls}
            autoComplete="tel"
          />
        </div>
        <div>
          <input
            type="text"
            value={contact.company}
            onChange={(e) => setContact((prev) => ({ ...prev, company: e.target.value }))}
            placeholder="Company (optional)"
            className={inputCls}
            autoComplete="organization"
          />
        </div>
      </div>

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting || !contact.name || !contact.email}
        className={`${continueBtnCls} mt-6`}
      >
        {submitting ? "Sending..." : "Send sourcing request →"}
      </button>

      <p className="text-center text-xs text-slate-400 mt-3">
        No spam. We follow up only when there is a real match.
      </p>
    </div>
  );
}
