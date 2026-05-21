"use client";

import { useRef, useState } from "react";

interface SupplierWidgetProps {
  source?: string;
  referral?: string;
  onSuccess?: () => void;
}

interface ImageAnalysis {
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

interface UploadedFile {
  url: string;
  filename: string;
  preview: string;
  uploading: boolean;
  error: string | null;
  type: "image" | "pdf";
  analysis: ImageAnalysis | null;
}

const WHATSAPP_NUMBER = "972525222291";

const CATEGORY_OPTIONS = [
  "Tomato Products",
  "Pasta & Grains",
  "Snacks",
  "Dairy",
  "Beverages",
  "Sauces & Condiments",
  "Canned Foods",
  "Frozen Foods",
  "Oils & Fats",
  "Fish & Seafood",
  "Bakery",
  "Spices & Herbs",
  "Organic & Natural",
  "Other",
];

const CERT_OPTIONS = [
  "Kosher",
  "Halal",
  "Organic",
  "BRC",
  "IFS",
  "FSSC 22000",
  "ISO 22000",
  "HACCP",
  "Gluten Free",
  "Vegan",
];

const MARKET_OPTIONS = [
  "Israel",
  "UK",
  "Germany",
  "France",
  "Netherlands",
  "USA",
  "Canada",
  "Australia",
  "Other",
];

const PRIVATE_LABEL_OPTIONS = ["Yes", "No", "On request"];

function ProgressBar({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex gap-1 mb-6">
      {[1, 2].map((s) => (
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

export default function SupplierWidget({
  source,
  referral,
  onSuccess,
}: SupplierWidgetProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [description, setDescription] = useState("");
  const [analysing, setAnalysing] = useState<string | null>(null);
  const [chips, setChips] = useState({
    categories: [] as string[],
    certifications: [] as string[],
    markets: [] as string[],
    privateLabel: null as string | null,
  });
  const [contact, setContact] = useState({
    name: "",
    email: "",
    whatsapp: "",
    company: "",
    country: "",
    website: "",
    title: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const cardCls =
    "bg-white rounded-2xl shadow-lg border border-slate-100 p-6 md:p-8 max-w-2xl mx-auto";

  const inputCls =
    "border border-slate-200 rounded-xl px-4 py-3 text-sm w-full focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400 transition";

  const continueBtnCls =
    "w-full mt-6 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl text-base transition active:scale-[0.98]";

  async function analyseFile(url: string, filename: string) {
    setAnalysing(filename);
    try {
      const res = await fetch("/api/sourcing/analyse-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: url, description: description || undefined }),
      });
      const data = await res.json();
      if (data.analysis) {
        setFiles((prev) =>
          prev.map((f) =>
            f.filename === filename ? { ...f, analysis: data.analysis } : f
          )
        );
      }
    } catch {
      // Silent fail — analysis is optional
    } finally {
      setAnalysing((prev) => (prev === filename ? null : prev));
    }
  }

  async function handleFiles(fileList: FileList) {
    const newFiles = Array.from(fileList).slice(0, 10 - files.length);

    for (const file of newFiles) {
      const isImage = file.type.startsWith("image/");
      const isPdf = file.type === "application/pdf";

      if (!isImage && !isPdf) continue;

      const preview = isImage ? URL.createObjectURL(file) : "";
      const placeholder: UploadedFile = {
        url: "",
        filename: file.name,
        preview,
        uploading: true,
        error: null,
        type: isImage ? "image" : "pdf",
        analysis: null,
      };

      setFiles((prev) => [...prev, placeholder]);

      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch("/api/sourcing/upload-image?bucket=suppliers", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();

        if (data.ok) {
          setFiles((prev) =>
            prev.map((f) =>
              f.filename === file.name && f.uploading
                ? { ...f, url: data.url, uploading: false }
                : f
            )
          );
          if (isImage) {
            analyseFile(data.url, file.name);
          }
        } else {
          setFiles((prev) =>
            prev.map((f) =>
              f.filename === file.name && f.uploading
                ? { ...f, uploading: false, error: data.error ?? "Upload failed" }
                : f
            )
          );
        }
      } catch {
        setFiles((prev) =>
          prev.map((f) =>
            f.filename === file.name && f.uploading
              ? { ...f, uploading: false, error: "Upload failed" }
              : f
          )
        );
      }
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);

    try {
      const analyses = files
        .filter((f) => f.analysis !== null)
        .map((f) => f.analysis as ImageAnalysis);

      const res = await fetch("/api/supplier/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: contact.company,
          website: contact.website || null,
          country: contact.country,
          contact_name: contact.name,
          contact_email: contact.email,
          contact_whatsapp: contact.whatsapp || null,
          contact_title: contact.title || null,
          description: description || null,
          categories: chips.categories,
          certifications: chips.certifications,
          markets_target: chips.markets,
          private_label:
            chips.privateLabel === "Yes"
              ? true
              : chips.privateLabel === "No"
              ? false
              : null,
          image_urls: files.filter((f) => f.url).map((f) => f.url),
          ai_analyses: analyses,
          source: source ?? "manufacturer-widget",
          ref: referral ?? null,
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

  // ── SUCCESS STATE ────────────────────────────────────────────
  if (submitted) {
    const waText = encodeURIComponent(
      `Hi, I just submitted our product range on FoodXchange. Company: ${contact.company}. Products: ${description.slice(0, 100)}. Looking forward to discussing.`
    );
    return (
      <div className={cardCls}>
        <div className="text-center py-12 px-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">✓</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Received — thank you</h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-8 max-w-sm mx-auto">
            We review every submission personally. If there is a fit with buyers we work
            with, we will be in touch within 5 business days.
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
          <p className="text-xs text-slate-400">Opens WhatsApp with your submission pre-filled</p>
        </div>
      </div>
    );
  }

  const allAnalyses = files.filter((f) => f.analysis !== null).map((f) => f.analysis as ImageAnalysis);

  // ── STEP 1 ───────────────────────────────────────────────────
  if (step === 1) {
    const canContinue = files.length > 0 || description.trim().length > 10;

    return (
      <div className={cardCls}>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Show us what you make</h2>
        <p className="text-slate-500 text-sm leading-relaxed mb-6">
          Upload product photos, your catalogue PDF, a price list, or spec sheets — whatever
          you have. You can also just describe your range in text. No need to be precise — we
          analyse everything and come back to you if there is a fit.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />

        {files.length === 0 ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFiles(e.dataTransfer.files);
            }}
            className="border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center cursor-pointer hover:border-orange-400 hover:bg-orange-50/20 transition-all duration-200"
          >
            <div className="flex justify-center gap-4 text-3xl mb-3">
              <span>📸</span>
              <span>🗂️</span>
              <span>📄</span>
            </div>
            <p className="font-medium text-slate-700 text-base mb-2">
              Upload product images, catalogue or price list
            </p>
            <p className="text-sm text-slate-400">
              Photos · PDF catalogue · Price list · Spec sheets · Any format
            </p>
            <p className="text-xs text-slate-300 mt-2">Up to 10 files · 20MB each</p>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-3">
            {files.map((file, idx) => (
              <div
                key={idx}
                className="relative rounded-xl overflow-hidden aspect-square bg-slate-50 border border-slate-100"
              >
                {file.type === "image" ? (
                  <img
                    src={file.preview || file.url}
                    alt={file.filename}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-red-50 flex flex-col items-center justify-center">
                    <span className="text-2xl text-red-400">📄</span>
                    <span className="text-xs text-slate-500 mt-1 px-1 text-center truncate w-full px-2">
                      {file.filename.length > 15
                        ? file.filename.slice(0, 12) + "..."
                        : file.filename}
                    </span>
                  </div>
                )}

                {file.uploading && (
                  <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-slate-200 border-t-orange-500 rounded-full animate-spin" />
                  </div>
                )}

                {!file.uploading && analysing === file.filename && (
                  <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                    <span className="text-xs text-orange-600 font-medium px-2 text-center">
                      Analysing...
                    </span>
                  </div>
                )}

                {file.analysis && (
                  <div className="absolute top-1 right-1 bg-green-500 rounded-full w-5 h-5 flex items-center justify-center">
                    <span className="text-white text-xs leading-none">✓</span>
                  </div>
                )}

                {file.error && (
                  <div className="absolute inset-0 bg-red-500/20 flex items-end p-1">
                    <p className="text-xs text-red-700 leading-tight">{file.error}</p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setFiles((prev) => prev.filter((_, i) => i !== idx))}
                  className="absolute top-1 left-1 bg-black/60 hover:bg-black/80 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs leading-none transition"
                >
                  ×
                </button>
              </div>
            ))}

            {files.length < 10 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-xl border-2 border-dashed border-slate-200 hover:border-orange-400 hover:bg-orange-50/20 flex items-center justify-center text-slate-400 hover:text-orange-500 text-2xl transition cursor-pointer"
              >
                +
              </button>
            )}
          </div>
        )}

        {allAnalyses.length > 0 && (
          <div className="mt-4 space-y-3">
            {allAnalyses.map(
              (analysis, i) =>
                analysis.confidence > 0.4 && (
                  <div
                    key={i}
                    className="bg-orange-50 border border-orange-100 rounded-xl p-4"
                  >
                    <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide mb-2">
                      ✦ Detected in image {i + 1}
                    </p>
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
                      {analysis.certifications_visible.map((cert) => (
                        <span
                          key={cert}
                          className="bg-green-50 border border-green-200 text-green-700 rounded-full px-3 py-1 text-xs"
                        >
                          {cert}
                        </span>
                      ))}
                    </div>
                    {analysis.notes && (
                      <p className="text-xs text-orange-500 mt-2">{analysis.notes}</p>
                    )}
                  </div>
                )
            )}
          </div>
        )}

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe your product range — categories, main products, production capacity, target markets, or anything you want us to know. No need to be formal."
          rows={4}
          maxLength={3000}
          className="w-full mt-4 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-300 resize-none focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400 transition"
        />
        <p className="text-right text-xs text-slate-300 mt-1">{description.length}/3000</p>

        <div className="mt-6">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Product categories (select all that apply)
          </p>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() =>
                  setChips((prev) => ({
                    ...prev,
                    categories: prev.categories.includes(opt)
                      ? prev.categories.filter((c) => c !== opt)
                      : [...prev.categories, opt],
                  }))
                }
                className={`text-xs px-3 py-1.5 rounded-full cursor-pointer transition ${
                  chips.categories.includes(opt)
                    ? "bg-slate-900 text-white"
                    : "border border-slate-200 text-slate-600 hover:border-slate-400"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Certifications you hold
          </p>
          <div className="flex flex-wrap gap-2">
            {CERT_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() =>
                  setChips((prev) => ({
                    ...prev,
                    certifications: prev.certifications.includes(opt)
                      ? prev.certifications.filter((c) => c !== opt)
                      : [...prev.certifications, opt],
                  }))
                }
                className={`text-xs px-3 py-1.5 rounded-full cursor-pointer transition ${
                  chips.certifications.includes(opt)
                    ? "bg-green-600 text-white"
                    : "border border-slate-200 text-slate-600 hover:border-slate-400"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Private label capability
          </p>
          <div className="flex flex-wrap gap-2">
            {PRIVATE_LABEL_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() =>
                  setChips((prev) => ({
                    ...prev,
                    privateLabel: prev.privateLabel === opt ? null : opt,
                  }))
                }
                className={`text-xs px-3 py-1.5 rounded-full cursor-pointer transition ${
                  chips.privateLabel === opt
                    ? "bg-orange-500 text-white"
                    : "border border-slate-200 text-slate-600 hover:border-slate-400"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => setStep(2)}
          disabled={!canContinue}
          className={continueBtnCls}
        >
          Continue →
        </button>
        <p className="text-center text-xs text-slate-400 mt-3">
          You can submit with just images, just text, or both
        </p>
      </div>
    );
  }

  // ── STEP 2 ───────────────────────────────────────────────────
  const canSubmit =
    !!contact.name && !!contact.email && !!contact.company && !!contact.country;

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
      <h2 className="text-2xl font-bold text-slate-900 mb-1">Tell us who you are</h2>
      <p className="text-slate-500 text-sm mb-6">
        We review every submission personally and follow up within 5 business days if
        there is a fit with buyers we work with in Israel.
      </p>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <input
            type="text"
            value={contact.company}
            onChange={(e) => setContact((prev) => ({ ...prev, company: e.target.value }))}
            placeholder="Company name *"
            className={inputCls}
            autoComplete="organization"
          />
          <input
            type="text"
            value={contact.country}
            onChange={(e) => setContact((prev) => ({ ...prev, country: e.target.value }))}
            placeholder="Country *"
            className={inputCls}
            autoComplete="country-name"
          />
        </div>

        <div>
          <input
            type="url"
            value={contact.website}
            onChange={(e) => setContact((prev) => ({ ...prev, website: e.target.value }))}
            placeholder="Website (optional) — yourwebsite.com"
            className={inputCls}
            autoComplete="url"
          />
          <p className="text-xs text-orange-500 mt-1.5 ml-1">
            ✦ We use your website to learn more about your product range automatically
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <input
            type="text"
            value={contact.name}
            onChange={(e) => setContact((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Your name *"
            className={inputCls}
            autoComplete="name"
          />
          <input
            type="text"
            value={contact.title}
            onChange={(e) => setContact((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="Your title (optional)"
            className={inputCls}
            autoComplete="organization-title"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <input
            type="email"
            value={contact.email}
            onChange={(e) => setContact((prev) => ({ ...prev, email: e.target.value }))}
            placeholder="Email *"
            className={inputCls}
            autoComplete="email"
          />
          <input
            type="tel"
            value={contact.whatsapp}
            onChange={(e) => setContact((prev) => ({ ...prev, whatsapp: e.target.value }))}
            placeholder="+39 333 123 4567 (WhatsApp)"
            className={inputCls}
            autoComplete="tel"
          />
        </div>
      </div>

      <div className="mt-6">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Markets you currently export to
        </p>
        <div className="flex flex-wrap gap-2">
          {MARKET_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() =>
                setChips((prev) => ({
                  ...prev,
                  markets: prev.markets.includes(opt)
                    ? prev.markets.filter((m) => m !== opt)
                    : [...prev.markets, opt],
                }))
              }
              className={`text-xs px-3 py-1.5 rounded-full cursor-pointer transition ${
                chips.markets.includes(opt)
                  ? "bg-blue-600 text-white"
                  : "border border-slate-200 text-slate-600 hover:border-slate-400"
              }`}
            >
              {opt}
            </button>
          ))}
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
        disabled={submitting || !canSubmit}
        className={`${continueBtnCls} mt-6`}
      >
        {submitting ? "Sending..." : "Send us your product range →"}
      </button>
    </div>
  );
}
