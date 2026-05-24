"use client";

import { useState, useEffect, useRef } from "react";

interface Props {
  onClose: () => void;
}

const STORAGE_KEY = "fab_supplier_form";

const inputCls =
  "w-full bg-white/5 border border-white/10 rounded-[10px] px-4 py-3 text-white text-[15px] focus:outline-none focus:border-[#E8632A] transition placeholder:text-white/30";
const labelCls =
  "block text-[12px] uppercase tracking-[0.05em] text-white/60 mb-1.5";

const CATEGORY_OPTIONS = [
  "Oils & Fats",
  "Bakery",
  "Snacks",
  "Frozen Foods",
  "Pasta & Grains",
  "Canned Foods",
  "Sauces",
  "Fish & Seafood",
  "Dairy",
  "Organic & Natural",
  "Other",
];

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
  companyName?: string;
  country?: string;
  categories?: string[];
  kosherCertified?: boolean | null;
  whatsapp?: string;
  email?: string;
  contactName?: string;
  notes?: string;
};

export default function SupplierPanel({ onClose }: Props) {
  const [fileUrl, setFileUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [country, setCountry] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [kosherCertified, setKosherCertified] = useState<boolean | null>(null);
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [contactName, setContactName] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved) as SavedForm;
        if (data.companyName) setCompanyName(data.companyName);
        if (data.country) setCountry(data.country);
        if (data.categories) setCategories(data.categories);
        if (data.kosherCertified !== undefined)
          setKosherCertified(data.kosherCertified ?? null);
        if (data.whatsapp) setWhatsapp(data.whatsapp);
        if (data.email) setEmail(data.email);
        if (data.contactName) setContactName(data.contactName);
        if (data.notes) setNotes(data.notes);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          companyName,
          country,
          categories,
          kosherCertified,
          whatsapp,
          email,
          contactName,
          notes,
        })
      );
    } catch {}
  }, [companyName, country, categories, kosherCertified, whatsapp, email, contactName, notes]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/sourcing/upload-image?bucket=suppliers", {
        method: "POST",
        body: fd,
      });
      const data = (await res.json()) as UploadResponse;
      if (!data.ok || !data.url) throw new Error(data.error ?? "Upload failed");
      setFileUrl(data.url);
      setFileName(file.name);
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setUploading(false);
    }
  }

  function toggleCategory(cat: string) {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

  const canSubmit = companyName.trim() && whatsapp.trim();

  async function handleSubmit() {
    if (!canSubmit || status === "submitting") return;
    setStatus("submitting");

    try {
      const res = await fetch("/api/suppliers/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: companyName.trim(),
          country: country.trim() || undefined,
          categories,
          kosher_certified: kosherCertified,
          whatsapp: whatsapp.trim(),
          email: email.trim() || undefined,
          contact_name: contactName.trim() || undefined,
          notes: notes.trim() || undefined,
          catalogue_url: fileUrl || undefined,
          source: "fab_button",
        }),
      });
      const data = (await res.json()) as SubmitResponse;
      if (!data.ok) throw new Error(data.error ?? "Submission failed");
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
      setStatus("success");
    } catch {
      setStatus("error");
    }
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
          <h2 className="text-xl font-semibold text-white mb-2">Thank you!</h2>
          <p className="text-white/60 text-sm text-center max-w-xs">
            We will review your products and be in touch on WhatsApp within 48
            hours.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-8 text-white font-semibold px-8 py-3 rounded-xl w-full max-w-xs border border-white/10 hover:bg-white/5 transition"
            style={{ background: "rgba(255,255,255,0.05)" }}
          >
            Close
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
            List your products
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-white/60 hover:text-white transition p-1 -mr-1 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* File upload */}
        <div className="mb-6">
          <div
            className="relative flex flex-col items-center justify-center cursor-pointer"
            style={{
              height: 120,
              border: "2px dashed rgba(255,255,255,0.2)",
              borderRadius: 12,
              background: "rgba(255,255,255,0.03)",
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            {!fileUrl && !uploading && (
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
                    d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p className="text-white/50 text-sm font-medium">
                  Upload product catalogue or product photo
                </p>
                <p className="text-white/25 text-xs mt-0.5">
                  PDF, image, or both
                </p>
              </>
            )}
            {uploading && (
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 animate-spin"
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
                <span className="text-white/50 text-sm">Uploading...</span>
              </div>
            )}
            {fileUrl && !uploading && (
              <div className="flex flex-col items-center gap-2 px-4">
                <svg
                  className="w-6 h-6 text-green-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <p className="text-white/60 text-sm truncate max-w-[200px]">
                  {fileName}
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFileUrl("");
                    setFileName("");
                  }}
                  className="text-white/30 text-xs hover:text-white/60 transition"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* Company details */}
        <div className="space-y-4 mb-6">
          <div>
            <label className={labelCls}>Company name *</label>
            <input
              type="text"
              className={inputCls}
              placeholder="Your company name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>Country</label>
            <input
              type="text"
              className={inputCls}
              placeholder="e.g. Italy, Spain, Greece"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            />
          </div>
        </div>

        {/* Categories */}
        <div className="mb-6">
          <label className={labelCls}>Product categories</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {CATEGORY_OPTIONS.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => toggleCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                  categories.includes(cat)
                    ? "text-white"
                    : "text-white/60 border border-white/10 hover:border-white/20"
                }`}
                style={
                  categories.includes(cat)
                    ? { background: "#E8632A" }
                    : { background: "rgba(255,255,255,0.05)" }
                }
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Kosher toggle */}
        <div className="mb-6">
          <label className={labelCls}>Kosher certified</label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() =>
                setKosherCertified(kosherCertified === true ? null : true)
              }
              className="flex-1 py-3 rounded-xl border text-sm font-medium transition"
              style={
                kosherCertified === true
                  ? {
                      background: "rgba(34,197,94,0.15)",
                      borderColor: "rgb(34,197,94)",
                      color: "rgb(74,222,128)",
                    }
                  : {
                      background: "rgba(255,255,255,0.03)",
                      borderColor: "rgba(255,255,255,0.1)",
                      color: "rgba(255,255,255,0.4)",
                    }
              }
            >
              ✓ Yes — kosher certified
            </button>
            <button
              type="button"
              onClick={() =>
                setKosherCertified(kosherCertified === false ? null : false)
              }
              className="flex-1 py-3 rounded-xl border text-sm font-medium transition"
              style={
                kosherCertified === false
                  ? {
                      background: "rgba(255,255,255,0.08)",
                      borderColor: "rgba(255,255,255,0.2)",
                      color: "rgba(255,255,255,0.6)",
                    }
                  : {
                      background: "rgba(255,255,255,0.03)",
                      borderColor: "rgba(255,255,255,0.1)",
                      color: "rgba(255,255,255,0.3)",
                    }
              }
            >
              ✗ Not kosher certified
            </button>
          </div>
        </div>

        {/* Contact */}
        <div
          className="space-y-4 mb-6 pt-6"
          style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
        >
          <p className="text-[11px] text-white/40 uppercase tracking-wider font-semibold">
            Contact
          </p>
          <div>
            <label className={labelCls}>WhatsApp *</label>
            <input
              type="tel"
              className={inputCls}
              placeholder="+39 XXX XXX XXXX"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input
              type="email"
              className={inputCls}
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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

        {/* Notes */}
        <div className="mb-6">
          <label className={labelCls}>Additional notes</label>
          <textarea
            className={inputCls}
            rows={3}
            placeholder="Any additional info about your products, volumes, certifications, or markets you currently export to..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {status === "error" && (
          <div
            className="mb-4 rounded-lg px-4 py-3 text-red-400 text-sm"
            style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
            }}
          >
            Something went wrong. Please try again.
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit || status === "submitting"}
          className="w-full font-semibold text-white text-base rounded-xl border border-white/10 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={{ height: 52, background: "#0f1923" }}
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
            "Send to our team →"
          )}
        </button>
      </div>
    </div>
  );
}
