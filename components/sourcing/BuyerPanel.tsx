"use client";

import { useState, useEffect, useRef } from "react";

interface Props {
  onClose: () => void;
}

const STORAGE_KEY = "fab_buyer_form";

const inputCls =
  "w-full bg-white/5 border border-white/10 rounded-[10px] px-4 py-3 text-white text-[15px] focus:outline-none focus:border-[#E8632A] transition placeholder:text-white/30";
const labelCls =
  "block text-[12px] uppercase tracking-[0.05em] text-white/60 mb-1.5";

const KOSHER_OPTIONS = [
  "Any kosher",
  "Chief Rabbinate",
  "Badatz",
  "Mehadrin",
  "OU",
];

type AnalyseResponse = {
  ok?: boolean;
  analysis?: { product_name?: string | null } | null;
};

type UploadResponse = {
  ok?: boolean;
  url?: string;
  error?: string;
};

type SubmitResponse = {
  ok?: boolean;
  error?: string;
};

type SavedForm = {
  description?: string;
  kosherType?: string;
  whatsapp?: string;
  company?: string;
  contactName?: string;
};

export default function BuyerPanel({ onClose }: Props) {
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [analysing, setAnalysing] = useState(false);
  const [aiDetected, setAiDetected] = useState("");
  const [description, setDescription] = useState("");
  const [kosherType, setKosherType] = useState("Any kosher");
  const [whatsapp, setWhatsapp] = useState("");
  const [company, setCompany] = useState("");
  const [contactName, setContactName] = useState("");
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved) as SavedForm;
        if (data.description) setDescription(data.description);
        if (data.kosherType) setKosherType(data.kosherType);
        if (data.whatsapp) setWhatsapp(data.whatsapp);
        if (data.company) setCompany(data.company);
        if (data.contactName) setContactName(data.contactName);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ description, kosherType, whatsapp, company, contactName })
      );
    } catch {}
  }, [description, kosherType, whatsapp, company, contactName]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setAiDetected("");

    try {
      const fd = new FormData();
      fd.append("file", file);
      const uploadRes = await fetch("/api/sourcing/upload-image", {
        method: "POST",
        body: fd,
      });
      const uploadData = (await uploadRes.json()) as UploadResponse;

      if (!uploadData.ok || !uploadData.url) {
        throw new Error(uploadData.error ?? "Upload failed");
      }

      const url = uploadData.url;
      setImageUrl(url);
      setUploading(false);
      setAnalysing(true);

      const analyseRes = await fetch("/api/sourcing/analyse-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: url }),
      });
      const analyseData = (await analyseRes.json()) as AnalyseResponse;

      if (analyseData.analysis?.product_name) {
        const detected = analyseData.analysis.product_name;
        setDescription(detected);
        setAiDetected(detected);
      }
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setUploading(false);
      setAnalysing(false);
    }
  }

  const canSubmit =
    (description.trim() || imageUrl) && whatsapp.trim() && company.trim();

  async function handleSubmit() {
    if (!canSubmit || status === "submitting") return;
    setStatus("submitting");
    setErrorMsg("");

    try {
      const res = await fetch("/api/sourcing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_name: description.trim() || "Product image submitted",
          kosher_type: kosherType !== "Any kosher" ? kosherType : undefined,
          company: company.trim(),
          whatsapp: whatsapp.trim(),
          contact_name: contactName.trim() || undefined,
          image_url: imageUrl || undefined,
          source: "fab_button",
        }),
      });
      const data = (await res.json()) as SubmitResponse;

      if (!data.ok) throw new Error(data.error ?? "Submission failed");

      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    }
  }

  function resetForm() {
    setImageUrl("");
    setAiDetected("");
    setDescription("");
    setKosherType("Any kosher");
    setWhatsapp("");
    setCompany("");
    setContactName("");
    setStatus("idle");
    setErrorMsg("");
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }

  if (status === "success") {
    return (
      <div className="fixed inset-0 z-50" onClick={onClose}>
        <div className="absolute inset-0 bg-black/60" />
        <div
          className="absolute bottom-0 left-0 right-0 rounded-t-[20px] flex flex-col items-center justify-center py-16 px-6"
          style={{
            maxHeight: "88vh",
            background: "#0f1923",
            borderTop: "1px solid rgba(255,255,255,0.08)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-5">
            <svg
              className="w-8 h-8 text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">
            Request received
          </h2>
          <p className="text-white/60 text-sm text-center max-w-xs">
            We will review and follow up on WhatsApp within 24 hours.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-8 text-white font-semibold px-8 py-3 rounded-xl w-full max-w-xs"
            style={{ background: "#E8632A" }}
          >
            Close
          </button>
          <button
            type="button"
            onClick={resetForm}
            className="mt-3 text-white/40 text-sm hover:text-white/60 transition"
          >
            Submit another request
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="absolute bottom-0 left-0 right-0 rounded-t-[20px] overflow-y-auto"
        style={{
          maxHeight: "88vh",
          background: "#0f1923",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          padding: "20px 20px 40px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center mb-6">
          <button
            type="button"
            onClick={onClose}
            className="text-white/60 hover:text-white transition p-1 -ml-1"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <h2 className="flex-1 text-center text-base font-semibold text-white">
            Source a product
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-white/60 hover:text-white transition p-1 -mr-1 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Step 1 */}
        <div className="mb-6 space-y-4">
          <p className="text-[11px] text-white/40 uppercase tracking-wider font-semibold">
            Step 1 — Product
          </p>

          {/* Upload zone */}
          <div
            className="relative flex flex-col items-center justify-center cursor-pointer"
            style={{
              height: 120,
              border: "2px dashed rgba(255,255,255,0.2)",
              borderRadius: 12,
              background: "rgba(255,255,255,0.03)",
            }}
            onClick={() => !imageUrl && fileInputRef.current?.click()}
          >
            {!imageUrl && !uploading && !analysing && (
              <>
                <svg
                  className="w-6 h-6 text-white/30 mb-1.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <p className="text-white/50 text-sm font-medium">
                  Upload product photo
                </p>
                <p className="text-white/25 text-xs mt-0.5">
                  A shelf photo, packaging, or product image
                </p>
                <p className="text-white/20 text-[11px] mt-0.5">
                  (optional but speeds up matching)
                </p>
              </>
            )}

            {(uploading || analysing) && (
              <div className="flex flex-col items-center gap-2">
                <svg
                  className="w-6 h-6 animate-spin"
                  style={{ color: "#E8632A" }}
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                <p className="text-white/50 text-sm">
                  {uploading ? "Uploading..." : "Analysing..."}
                </p>
              </div>
            )}

            {imageUrl && !uploading && !analysing && (
              <div className="relative w-full h-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt="Uploaded product"
                  className="w-full h-full object-cover rounded-xl"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setImageUrl("");
                    setAiDetected("");
                  }}
                  className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-black/80 transition"
                >
                  ×
                </button>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          {aiDetected && (
            <div
              className="flex items-center gap-2 rounded-lg px-3 py-2"
              style={{
                background: "rgba(232,99,42,0.1)",
                border: "1px solid rgba(232,99,42,0.3)",
              }}
            >
              <span style={{ color: "#E8632A" }} className="text-xs">
                ✓
              </span>
              <span style={{ color: "#E8632A" }} className="text-xs font-medium">
                AI detected: {aiDetected}
              </span>
            </div>
          )}

          <div className="text-center text-xs text-white/25 my-2">
            — or describe it —
          </div>

          <div>
            <label className={labelCls}>What are you looking for?</label>
            <textarea
              className={inputCls}
              rows={3}
              placeholder="e.g. kosher olive oil 750ml glass bottle, Chief Rabbinate certified, Spain or Italy"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label className={labelCls}>Kosher type (optional)</label>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {KOSHER_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setKosherType(opt)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition ${
                    kosherType === opt
                      ? "text-white"
                      : "text-white/60 border border-white/10 hover:border-white/20"
                  }`}
                  style={
                    kosherType === opt
                      ? { background: "#E8632A" }
                      : { background: "rgba(255,255,255,0.05)" }
                  }
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Step 2 */}
        <div
          className="mb-6 pt-6 space-y-4"
          style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
        >
          <p className="text-[11px] text-white/40 uppercase tracking-wider font-semibold">
            Step 2 — Contact
          </p>
          <p className="text-white/50 text-sm -mt-2">
            Where should we reach you?
          </p>

          <div>
            <label className={labelCls}>WhatsApp *</label>
            <input
              type="tel"
              className={inputCls}
              placeholder="+972 5X XXX XXXX"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
            />
            <p className="text-white/30 text-xs mt-1.5">
              We respond on WhatsApp within 24 hours
            </p>
          </div>

          <div>
            <label className={labelCls}>Company *</label>
            <input
              type="text"
              className={inputCls}
              placeholder="Your company name"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
          </div>

          <div>
            <label className={labelCls}>Your name</label>
            <input
              type="text"
              className={inputCls}
              placeholder="Your name"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
            />
          </div>
        </div>

        {errorMsg && (
          <div
            className="mb-4 rounded-lg px-4 py-3 text-red-400 text-sm"
            style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
            }}
          >
            {errorMsg}
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit || status === "submitting"}
          className="w-full font-semibold text-white text-base rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={{ height: 52, background: "#E8632A" }}
        >
          {status === "submitting" ? (
            <>
              <svg
                className="w-4 h-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Sending...
            </>
          ) : (
            "Send sourcing request →"
          )}
        </button>
      </div>
    </div>
  );
}
