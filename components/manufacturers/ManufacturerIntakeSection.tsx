"use client";

import { FormEvent, useRef, useState } from "react";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import MultiImageUpload, { UploadedImage } from "@/components/ui/MultiImageUpload";
import { isValidName } from "@/lib/validation/isValidName";
import { isValidCompanyName } from "@/lib/validation/isValidCompanyName";

// ─── Types ────────────────────────────────────────────────────────────────────

type KosherOption = "chief-rabbinate" | "badatz" | "ou-ok" | "willing" | "none";

export interface RequestPreviewItem {
  id: string;
  product_name: string;
  category: string | null;
  certifications: string[] | null;
  created_at: string;
}

interface Props {
  requestPreview: RequestPreviewItem[];
  referral?: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const KOSHER_CERT_MAP: Record<KosherOption, string[]> = {
  "chief-rabbinate": ["Chief Rabbinate Kosher"],
  "badatz":          ["Badatz Kosher"],
  "ou-ok":           ["OU/OK Kosher"],
  "willing":         [],
  "none":            [],
};

const KOSHER_OPTIONS: { value: KosherOption; label: string }[] = [
  { value: "chief-rabbinate", label: "Yes — Chief Rabbinate" },
  { value: "badatz",          label: "Yes — Badatz" },
  { value: "ou-ok",           label: "Yes — OU / OK / Other" },
  { value: "willing",         label: "No — but willing to obtain" },
  { value: "none",            label: "No — not applicable" },
];

const PRODUCT_CATEGORIES = [
  "Tomato Products", "Oils & Fats", "Canned Foods", "Snacks & Confectionery",
  "Pasta & Grains", "Frozen Foods", "Bakery & Cereals", "Sauces & Condiments",
  "Fish & Seafood", "Dairy", "Beverages", "Spices & Herbs", "Organic & Natural", "Other",
];

const QUALITY_CERTS = [
  "BRC/BRCGS", "IFS", "FSSC 22000", "ISO 22000", "HACCP", "GlobalG.A.P.", "Organic (EU)", "None yet",
];

const EUROPEAN_COUNTRIES = [
  "Italy", "Spain", "Greece", "France", "Netherlands", "Germany", "Poland",
  "Portugal", "Turkey", "Belgium", "Hungary", "Austria", "Romania", "Bulgaria",
  "Croatia", "Czech Republic", "Slovakia",
];

const OTHER_COUNTRIES = [
  "Argentina", "Australia", "Brazil", "Canada", "Chile", "China", "Egypt",
  "India", "Indonesia", "Israel", "Japan", "Mexico", "Morocco", "New Zealand",
  "Peru", "South Africa", "South Korea", "Thailand", "Ukraine", "United Kingdom",
  "United States", "Vietnam", "Other",
];

const MANUFACTURER_EXAMPLE_TYPES = [
  { label: "Product photo", color: "bg-emerald-100" },
  { label: "Packaging", color: "bg-blue-100" },
  { label: "Certification", color: "bg-amber-100" },
  { label: "Factory", color: "bg-violet-100" },
  { label: "Label/barcode", color: "bg-rose-100" },
];

const CATEGORY_COLORS: Record<string, string> = {
  "Tomato Products":        "bg-red-100 text-red-700",
  "Oils & Fats":            "bg-yellow-100 text-yellow-700",
  "Canned Foods":           "bg-slate-100 text-slate-700",
  "Snacks & Confectionery": "bg-orange-100 text-orange-700",
  "Pasta & Grains":         "bg-amber-100 text-amber-800",
  "Frozen Foods":           "bg-blue-100 text-blue-700",
  "Bakery & Cereals":       "bg-yellow-50 text-yellow-800",
  "Sauces & Condiments":    "bg-rose-100 text-rose-700",
  "Fish & Seafood":         "bg-cyan-100 text-cyan-700",
  "Dairy":                  "bg-blue-50 text-blue-600",
  "Beverages":              "bg-purple-100 text-purple-700",
  "Spices & Herbs":         "bg-lime-100 text-lime-700",
  "Organic & Natural":      "bg-green-100 text-green-700",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
}

function hasKosher(certifications: string[] | null): boolean {
  return (certifications ?? []).some((c) => c.toLowerCase().includes("kosher"));
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DarkLabel({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-200 mb-1.5">
      {children}
    </label>
  );
}

function DarkHelper({ children }: { children: React.ReactNode }) {
  return <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">{children}</p>;
}

function DarkTooltip({ text }: { text: string }) {
  return (
    <span className="relative group inline-block ml-1.5 align-middle">
      <button
        type="button"
        aria-label="More info"
        className="w-4 h-4 rounded-full border border-slate-500 text-slate-400 text-[10px] font-bold flex items-center justify-center hover:border-slate-300 hover:text-slate-200 transition-colors focus:outline-none"
      >
        ?
      </button>
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-slate-900 border border-slate-700 text-white text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200 delay-100 z-50 leading-relaxed shadow-xl">
        {text}
      </span>
    </span>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1.5 text-xs text-red-400">{msg}</p>;
}

function inputCls(extra = "") {
  return `w-full bg-[#0d1117] border border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 ${extra}`;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ManufacturerIntakeSection({ requestPreview, referral }: Props) {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [companyName, setCompanyName] = useState("");
  const [country, setCountry] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [products, setProducts] = useState("");
  const [kosher, setKosher] = useState<KosherOption>("chief-rabbinate");
  const [qualityCerts, setQualityCerts] = useState<string[]>([]);
  const [capacity, setCapacity] = useState("");
  const [privateLabel, setPrivateLabel] = useState(false);
  const [contactName, setContactName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const formRef = useRef<HTMLDivElement>(null);
  const anyUploading = images.some((img) => img.uploading);

  function toggleCategory(cat: string) {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

  function toggleQualityCert(cert: string) {
    setQualityCerts((prev) =>
      prev.includes(cert) ? prev.filter((c) => c !== cert) : [...prev, cert]
    );
  }

  function clearFieldError(field: string) {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const errors: Record<string, string> = {};

    if (!isValidCompanyName(companyName)) {
      errors.companyName = "Please enter your company name";
    }
    if (!isValidName(contactName)) {
      errors.contactName = "Please enter your real name (first name is fine)";
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      errors.email = "Please enter a valid email address";
    }
    if (whatsapp && !isValidPhoneNumber(whatsapp)) {
      errors.whatsapp = "Please enter a valid WhatsApp number including country code";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    setError(null);

    const certifications = [
      ...KOSHER_CERT_MAP[kosher],
      ...qualityCerts.filter((c) => c !== "None yet"),
    ];

    let desc = products.trim();
    if (capacity.trim()) desc += `\n\nAnnual production capacity: ${capacity}`;
    if (kosher === "willing") desc += "\n\nKosher: not currently certified but willing to obtain.";

    const payload = {
      company_name: companyName.trim(),
      country: country || undefined,
      contact_name: contactName.trim(),
      contact_email: email.trim(),
      contact_whatsapp: whatsapp || undefined,
      description: desc || undefined,
      categories,
      certifications,
      private_label: privateLabel,
      image_urls: images
        .filter((img) => !img.uploading && !img.error && img.url)
        .map((img) => img.url),
      annual_capacity: capacity.trim() || undefined,
      source: "manufacturer-intake",
      ref: referral,
    };

    try {
      const res = await fetch("/api/supplier/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (res.status === 429) {
        setError("Too many requests — please try again in a few minutes.");
        return;
      }
      if (!data.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Network error — please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section id="manufacturer-intake" className="bg-[#111827] px-6 py-16">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <p className="text-orange-400 text-xs font-semibold uppercase tracking-widest mb-3">
            Apply for Representation
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight">
            Tell us what you manufacture
          </h2>
          <p className="text-slate-300 text-base mt-3 max-w-2xl leading-relaxed">
            We review every submission personally. If there is a fit with our active buyer
            requests, we will contact you within 48 hours.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr_360px] gap-10 items-start">
          {/* ── LEFT: Form ── */}
          <div ref={formRef}>
            {submitted ? (
              // ── Success state ──────────────────────────────────────────────
              <div className="bg-[#1e2533] rounded-2xl p-8 text-center">
                <div
                  className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-5"
                  style={{ animation: "pop 0.4s cubic-bezier(0.175,0.885,0.32,1.275)" }}
                >
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">Application received</h3>
                <p className="text-slate-300 text-sm leading-relaxed mb-6">
                  We have received your submission and will review it against our active buyer
                  requests. If there is a fit, we will contact you within 48 hours.
                </p>
                <p className="text-slate-400 text-sm font-medium mb-4">While you wait:</p>
                <div className="space-y-3 text-left max-w-xs mx-auto">
                  <a href="/en/sourcing-board" className="flex items-center gap-2 text-sm text-orange-400 hover:text-orange-300 transition">
                    <span>→</span> See what Israeli buyers are sourcing
                  </a>
                  <a href="/en/contact" className="flex items-center gap-2 text-sm text-orange-400 hover:text-orange-300 transition">
                    <span>→</span> Browse our Import Guide
                  </a>
                  <a href="https://wa.me/972525222291" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-orange-400 hover:text-orange-300 transition">
                    <span>→</span> WhatsApp us directly if urgent
                  </a>
                </div>
                <style>{`@keyframes pop{0%{transform:scale(0)}80%{transform:scale(1.12)}100%{transform:scale(1)}}`}</style>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-[#1e2533] rounded-2xl p-6 space-y-6">
                {/* Product images */}
                <div>
                  <DarkLabel>Product images</DarkLabel>
                  <div className="[&_.border-slate-200]:border-slate-600 [&_.hover\:border-orange-300:hover]:border-orange-500 [&_.hover\:bg-slate-50:hover]:bg-slate-800/50 [&_.text-slate-700]:text-slate-300 [&_.text-slate-400]:text-slate-500 [&_.bg-slate-100]:bg-slate-700 [&_.hover\:bg-slate-200:hover]:bg-slate-600 [&_.text-slate-600]:text-slate-400 [&_.bg-slate-50]:bg-slate-800/30 [&_.placeholder-slate-300]:placeholder-slate-500 [&_.focus\:ring-orange-200]:focus:ring-orange-500/30">
                    <MultiImageUpload
                      value={images}
                      onChange={setImages}
                      maxImages={5}
                      bucket="suppliers"
                      exampleTypes={MANUFACTURER_EXAMPLE_TYPES}
                    />
                  </div>
                  <DarkHelper>
                    Show us your products. A photo of your packaging or product line tells us
                    more than a description alone.
                  </DarkHelper>
                </div>

                {/* Company name */}
                <div>
                  <DarkLabel htmlFor="company">Your company *</DarkLabel>
                  <input
                    id="company"
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => { setCompanyName(e.target.value); clearFieldError("companyName"); }}
                    placeholder="e.g. Steriltom S.r.l."
                    className={inputCls()}
                  />
                  <FieldError msg={fieldErrors.companyName} />
                  <DarkHelper>Legal company name as it appears on your export documents.</DarkHelper>
                </div>

                {/* Country */}
                <div>
                  <DarkLabel htmlFor="country">Where do you manufacture?</DarkLabel>
                  <select
                    id="country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className={inputCls()}
                  >
                    <option value="">Select country...</option>
                    <optgroup label="Europe">
                      {EUROPEAN_COUNTRIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Rest of world">
                      {OTHER_COUNTRIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </optgroup>
                  </select>
                  <DarkHelper>Country where your factory is located — not headquarters.</DarkHelper>
                </div>

                {/* Product categories */}
                <div>
                  <DarkLabel>What do you produce?</DarkLabel>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {PRODUCT_CATEGORIES.map((cat) => (
                      <label key={cat} className="flex items-center gap-2.5 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={categories.includes(cat)}
                          onChange={() => toggleCategory(cat)}
                          className="w-4 h-4 accent-orange-500 rounded cursor-pointer"
                        />
                        <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                          {cat}
                        </span>
                      </label>
                    ))}
                  </div>
                  <DarkHelper>Select all that apply.</DarkHelper>
                </div>

                {/* Key products */}
                <div>
                  <DarkLabel htmlFor="products">
                    Describe your main products
                    <DarkTooltip text="The more specific you are, the better we can match you to active buyer requests. Include: product names, packaging formats, annual capacity, minimum order quantities." />
                  </DarkLabel>
                  <textarea
                    id="products"
                    rows={3}
                    value={products}
                    onChange={(e) => setProducts(e.target.value)}
                    maxLength={3000}
                    placeholder="e.g. Tomato paste and passata in various formats. BRC AA certified. Available in aseptic bags and drums from 5kg to 1400kg."
                    className={inputCls("resize-none")}
                  />
                  <DarkHelper>Include formats, sizes, and any certifications you already have.</DarkHelper>
                </div>

                {/* Kosher */}
                <div>
                  <DarkLabel>
                    Current kosher certification
                    <DarkTooltip text="You do not need kosher to apply. Many of our manufacturers start the certification process after we confirm commercial fit. We will tell you exactly what is required for your category." />
                  </DarkLabel>
                  <div className="space-y-2 mt-1">
                    {KOSHER_OPTIONS.map((opt) => (
                      <label key={opt.value} className="flex items-center gap-3 cursor-pointer group">
                        <input
                          type="radio"
                          name="kosher"
                          value={opt.value}
                          checked={kosher === opt.value}
                          onChange={() => setKosher(opt.value)}
                          className="w-4 h-4 accent-orange-500 cursor-pointer"
                        />
                        <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                          {opt.label}
                        </span>
                      </label>
                    ))}
                  </div>
                  <DarkHelper>
                    Most Israeli retailers require Chief Rabbinate minimum. We can advise on
                    certification path.
                  </DarkHelper>
                </div>

                {/* Quality certifications */}
                <div>
                  <DarkLabel>Food safety certifications</DarkLabel>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {QUALITY_CERTS.map((cert) => (
                      <label key={cert} className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={qualityCerts.includes(cert)}
                          onChange={() => toggleQualityCert(cert)}
                          className="w-4 h-4 accent-orange-500 cursor-pointer"
                        />
                        <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                          {cert}
                        </span>
                      </label>
                    ))}
                  </div>
                  <DarkHelper>BRC or IFS required by most Israeli retailers.</DarkHelper>
                </div>

                {/* Annual capacity */}
                <div>
                  <DarkLabel htmlFor="capacity">Annual production capacity</DarkLabel>
                  <input
                    id="capacity"
                    type="text"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    placeholder="e.g. 5,000 tons/year"
                    className={inputCls()}
                  />
                  <DarkHelper>Approximate is fine.</DarkHelper>
                </div>

                {/* Private label */}
                <div className="flex items-center justify-between">
                  <div>
                    <DarkLabel>Do you offer private label?</DarkLabel>
                    <DarkHelper>
                      Most Israeli retail is private label — this significantly increases your
                      opportunities.
                    </DarkHelper>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={privateLabel}
                    onClick={() => setPrivateLabel(!privateLabel)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500/50 shrink-0 ml-4 ${
                      privateLabel ? "bg-orange-500" : "bg-slate-600"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        privateLabel ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* Contact name + WhatsApp */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <DarkLabel htmlFor="contact-name">Your name *</DarkLabel>
                    <input
                      id="contact-name"
                      type="text"
                      required
                      value={contactName}
                      onChange={(e) => { setContactName(e.target.value); clearFieldError("contactName"); }}
                      placeholder="Full name"
                      className={inputCls()}
                    />
                    <FieldError msg={fieldErrors.contactName} />
                  </div>
                  <div>
                    <DarkLabel htmlFor="whatsapp">WhatsApp number</DarkLabel>
                    <div
                      className="flex items-center bg-[#0d1117] border border-slate-600 rounded-xl px-4 py-2.5 gap-2"
                      style={{ "--PhoneInputCountrySelectArrow-color": "#94a3b8" } as React.CSSProperties}
                    >
                      <PhoneInput
                        value={whatsapp || undefined}
                        onChange={(v) => { setWhatsapp(v ?? ""); clearFieldError("whatsapp"); }}
                        inputClassName="flex-1 bg-transparent outline-none text-sm text-slate-100 placeholder-slate-500 min-w-0"
                        numberInputProps={{ id: "whatsapp" }}
                      />
                    </div>
                    <FieldError msg={fieldErrors.whatsapp} />
                    <DarkHelper>We respond on WhatsApp — usually within a few hours.</DarkHelper>
                  </div>
                </div>

                {/* Email */}
                <div>
                  <DarkLabel htmlFor="email">Email address *</DarkLabel>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); clearFieldError("email"); }}
                    placeholder="you@company.com"
                    className={inputCls()}
                  />
                  <FieldError msg={fieldErrors.email} />
                </div>

                {/* Error */}
                {error && (
                  <p className="text-sm text-red-400 bg-red-900/30 border border-red-700/50 rounded-lg px-4 py-3">
                    {error}
                  </p>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={submitting || anyUploading}
                  className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl transition-colors text-base flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Submitting...
                    </>
                  ) : anyUploading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Uploading images...
                    </>
                  ) : (
                    "Submit for review →"
                  )}
                </button>

                <p className="text-center text-xs text-slate-500">
                  Every submission is reviewed by a person. No automated responses.
                </p>
              </form>
            )}
          </div>

          {/* ── RIGHT: Opportunity panel ── */}
          <div className="space-y-4 lg:sticky lg:top-6">
            {/* Card 1: Active buyer demand */}
            <div className="border border-slate-700 rounded-2xl p-5">
              <p className="text-sm font-semibold text-white mb-1">Active buyer demand</p>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                These are real requests from Israeli buyers we are working with right now.
              </p>

              {requestPreview.length > 0 ? (
                <div className="space-y-3">
                  {requestPreview.slice(0, 5).map((req) => {
                    const catColor = req.category
                      ? (CATEGORY_COLORS[req.category] ?? "bg-slate-700 text-slate-300")
                      : "bg-slate-700 text-slate-300";
                    return (
                      <div key={req.id} className="border border-slate-700/50 rounded-xl p-3 bg-[#0d1117]/50">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            {req.category && (
                              <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded mb-1 ${catColor}`}>
                                {req.category}
                              </span>
                            )}
                            <p className="text-sm text-slate-200 font-medium truncate">
                              {req.product_name}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            {hasKosher(req.certifications) && (
                              <span className="text-[10px] bg-orange-900/50 text-orange-300 border border-orange-700/50 px-1.5 py-0.5 rounded">
                                ✡ Kosher
                              </span>
                            )}
                            <span className="text-[10px] text-slate-500">{timeAgo(req.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">Loading buyer requests...</p>
              )}

              <p className="text-xs text-slate-500 mt-4">
                {requestPreview.length > 0 ? `${requestPreview.length}+ active sourcing requests` : "Active sourcing requests"} · Updated weekly
              </p>
            </div>

            {/* Card 2: What we look for */}
            <div className="border border-slate-700 rounded-2xl p-5">
              <p className="text-sm font-semibold text-white mb-4">What we look for</p>
              <ul className="space-y-2.5">
                {[
                  "Export-ready manufacturer (not trader or broker)",
                  "BRC or IFS certified (or willing to obtain)",
                  "Minimum 1 container per shipment",
                  "Able to produce private label",
                  "Willing to adapt packaging for Israeli market",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-slate-300">
                    <svg className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
