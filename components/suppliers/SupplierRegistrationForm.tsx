"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { isValidPhoneNumber } from "react-phone-number-input";
import MultiImageUpload, { UploadedImage } from "@/components/ui/MultiImageUpload";
import ContactFields from "@/components/forms/ContactFields";
import { isValidName } from "@/lib/validation/isValidName";
import { isValidCompanyName } from "@/lib/validation/isValidCompanyName";

// ─── Types & constants ─────────────────────────────────────────────────────

type KosherOption = "chief-rabbinate" | "badatz" | "ou-ok" | "willing" | "none";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const FORM_KEY = "fdx_supplier_register_form";

const STEPS = ["Company Info", "Products", "Certifications", "Contact", "Additional", "Review"];

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

const TARGET_MARKETS = ["Israel", "Europe", "Middle East / Gulf", "North America", "Asia", "Other"];

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

const IMAGE_EXAMPLE_TYPES = [
  { label: "Product photo", color: "bg-emerald-100" },
  { label: "Packaging", color: "bg-blue-100" },
  { label: "Certification", color: "bg-amber-100" },
  { label: "Factory", color: "bg-violet-100" },
];

// ─── Shared helpers ─────────────────────────────────────────────────────────

function Label({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-200 mb-1.5">
      {children}
    </label>
  );
}

function Helper({ children }: { children: React.ReactNode }) {
  return <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">{children}</p>;
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1.5 text-xs text-red-400">{msg}</p>;
}

function inputCls(extra = "") {
  return `w-full bg-[#0d1117] border border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 ${extra}`;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm border-b border-slate-800 last:border-0">
      <span className="text-slate-400 shrink-0">{label}</span>
      <span className="text-slate-100 text-right">{value}</span>
    </div>
  );
}

function SummaryCard({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#0d1117] border border-slate-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <button
          type="button"
          onClick={onEdit}
          className="text-xs text-orange-400 hover:text-orange-300 transition"
        >
          Edit
        </button>
      </div>
      {children}
    </div>
  );
}

function ProgressBar({
  steps,
  current,
  maxReached,
  onStepClick,
}: {
  steps: string[];
  current: number;
  maxReached: number;
  onStepClick: (n: number) => void;
}) {
  return (
    <div className="flex items-center mb-8">
      {steps.map((label, i) => {
        const clickable = i <= maxReached && i !== current;
        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <button
                type="button"
                disabled={!clickable}
                onClick={() => onStepClick(i)}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-colors ${
                  clickable ? "cursor-pointer" : "cursor-default"
                } ${
                  i < current
                    ? "bg-orange-500 text-white"
                    : i === current
                      ? "bg-orange-500 text-white ring-4 ring-orange-500/25"
                      : "bg-slate-700 text-slate-400"
                }`}
              >
                {i < current ? "✓" : i + 1}
              </button>
              <span
                className={`hidden sm:block text-[11px] text-center max-w-22 leading-tight ${
                  i <= current ? "text-slate-200" : "text-slate-500"
                }`}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1.5 ${i < current ? "bg-orange-500" : "bg-slate-700"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function SupplierRegistrationForm() {
  const [step, setStep] = useState(0);
  const [maxStepReached, setMaxStepReached] = useState(0);

  // Company Info
  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [country, setCountry] = useState("");

  // Products
  const [categories, setCategories] = useState<string[]>([]);
  const [productsDescription, setProductsDescription] = useState("");
  const [images, setImages] = useState<UploadedImage[]>([]);

  // Certifications & Compliance
  const [kosher, setKosher] = useState<KosherOption>("chief-rabbinate");
  const [qualityCerts, setQualityCerts] = useState<string[]>([]);
  const [privateLabel, setPrivateLabel] = useState(false);

  // Contact
  const [contactName, setContactName] = useState("");
  const [contactTitle, setContactTitle] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");

  // Additional
  const [annualCapacity, setAnnualCapacity] = useState("");
  const [targetMarkets, setTargetMarkets] = useState<string[]>([]);
  const [additionalNotes, setAdditionalNotes] = useState("");

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const formRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restored = useRef(false);
  const anyUploading = images.some((img) => img.uploading);

  // Restore from localStorage on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(FORM_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Record<string, unknown>;
        if (typeof saved.companyName === "string") setCompanyName(saved.companyName);
        if (typeof saved.website === "string") setWebsite(saved.website);
        if (typeof saved.country === "string") setCountry(saved.country);
        if (Array.isArray(saved.categories)) setCategories(saved.categories as string[]);
        if (typeof saved.productsDescription === "string") setProductsDescription(saved.productsDescription);
        if (typeof saved.kosher === "string") setKosher(saved.kosher as KosherOption);
        if (Array.isArray(saved.qualityCerts)) setQualityCerts(saved.qualityCerts as string[]);
        if (typeof saved.privateLabel === "boolean") setPrivateLabel(saved.privateLabel);
        if (typeof saved.contactName === "string") setContactName(saved.contactName);
        if (typeof saved.contactTitle === "string") setContactTitle(saved.contactTitle);
        if (typeof saved.whatsapp === "string") setWhatsapp(saved.whatsapp);
        if (typeof saved.email === "string") setEmail(saved.email);
        if (typeof saved.annualCapacity === "string") setAnnualCapacity(saved.annualCapacity);
        if (Array.isArray(saved.targetMarkets)) setTargetMarkets(saved.targetMarkets as string[]);
        if (typeof saved.additionalNotes === "string") setAdditionalNotes(saved.additionalNotes);
        if (typeof saved.step === "number") {
          setStep(saved.step);
          setMaxStepReached(saved.step);
        }
      }
    } catch {
      // ignore localStorage parsing errors
    } finally {
      restored.current = true;
    }
  }, []);

  // Debounced save to localStorage (images are excluded — not meaningfully serializable).
  useEffect(() => {
    if (!restored.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(
          FORM_KEY,
          JSON.stringify({
            step,
            companyName, website, country,
            categories, productsDescription,
            kosher, qualityCerts, privateLabel,
            contactName, contactTitle, whatsapp, email,
            annualCapacity, targetMarkets, additionalNotes,
          })
        );
      } catch {
        // ignore write errors
      }
    }, 400);
  }, [
    step, companyName, website, country, categories, productsDescription,
    kosher, qualityCerts, privateLabel, contactName, contactTitle, whatsapp, email,
    annualCapacity, targetMarkets, additionalNotes,
  ]);

  function clearFieldError(field: string) {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function toggleInArray(arr: string[], setArr: (v: string[]) => void, value: string) {
    setArr(arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]);
  }

  function validateStep(n: number): Record<string, string> {
    const errors: Record<string, string> = {};

    if (n === 0) {
      if (!isValidCompanyName(companyName)) {
        errors.companyName = "Please enter your company name";
      }
    }

    if (n === 1) {
      if (categories.length === 0) {
        errors.categories = "Select at least one category";
      }
      if (!productsDescription.trim()) {
        errors.productsDescription = "Please describe your main products";
      }
    }

    if (n === 3) {
      if (!isValidName(contactName)) {
        errors.contactName = "Please enter your real name (first name is fine)";
      }
      if (!EMAIL_REGEX.test(email.trim())) {
        errors.email = "Please enter a valid email address";
      }
      if (whatsapp && !isValidPhoneNumber(whatsapp)) {
        errors.whatsapp = "Please enter a valid WhatsApp number including country code";
      }
    }

    return errors;
  }

  function goToStep(n: number) {
    setFieldErrors({});
    setStep(n);
    setMaxStepReached((prev) => Math.max(prev, n));
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleNext() {
    const errors = validateStep(step);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    if (step < STEPS.length - 1) goToStep(step + 1);
  }

  function handleBack() {
    if (step > 0) goToStep(step - 1);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    // Defensive re-validation of all data-collecting steps.
    const allErrors = { ...validateStep(0), ...validateStep(1), ...validateStep(3) };
    if (Object.keys(allErrors).length > 0) {
      setFieldErrors(allErrors);
      const firstInvalidStep = [0, 1, 3].find((s) => Object.keys(validateStep(s)).length > 0);
      if (firstInvalidStep !== undefined) goToStep(firstInvalidStep);
      return;
    }

    setFieldErrors({});
    setSubmitting(true);
    setError(null);

    const certifications = [
      ...KOSHER_CERT_MAP[kosher],
      ...qualityCerts.filter((c) => c !== "None yet"),
    ];

    let description = productsDescription.trim();
    if (additionalNotes.trim()) description += `\n\n${additionalNotes.trim()}`;

    const payload = {
      company_name: companyName.trim(),
      website: website.trim() || undefined,
      country: country || undefined,
      contact_name: contactName.trim(),
      contact_email: email.trim(),
      contact_whatsapp: whatsapp || undefined,
      contact_title: contactTitle.trim() || undefined,
      description: description || undefined,
      categories,
      certifications,
      markets_target: targetMarkets,
      private_label: privateLabel,
      image_urls: images
        .filter((img) => !img.uploading && !img.error && img.url)
        .map((img) => img.url),
      annual_capacity: annualCapacity.trim() || undefined,
      source: "supplier-registration-page",
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
      try {
        localStorage.removeItem(FORM_KEY);
      } catch {
        // ignore
      }
    } catch {
      setError("Network error — please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div ref={formRef} className="bg-[#1e2533] rounded-2xl p-8 text-center">
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
          We have received your registration and will review it against our active buyer
          requests. If there is a fit, we will contact you within 5 business days.
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
    );
  }

  return (
    <div ref={formRef}>
      <ProgressBar steps={STEPS} current={step} maxReached={maxStepReached} onStepClick={goToStep} />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (step === STEPS.length - 1) {
            handleSubmit(e);
          } else {
            handleNext();
          }
        }}
        className="bg-[#1e2533] rounded-2xl p-6 space-y-6"
      >
        {/* ── Step 0: Company Info ── */}
        {step === 0 && (
          <>
            <div>
              <Label htmlFor="company">Your company *</Label>
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
              <Helper>Legal company name as it appears on your export documents.</Helper>
            </div>

            <div>
              <Label htmlFor="website">Website</Label>
              <input
                id="website"
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://yourcompany.com"
                className={inputCls()}
              />
              <Helper>Optional, but helps us review your products faster.</Helper>
            </div>

            <div>
              <Label htmlFor="country">Where do you manufacture?</Label>
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
              <Helper>Country where your factory is located — not headquarters.</Helper>
            </div>
          </>
        )}

        {/* ── Step 1: Products ── */}
        {step === 1 && (
          <>
            <div>
              <Label>What do you produce? *</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {PRODUCT_CATEGORIES.map((cat) => (
                  <label key={cat} className="flex items-center gap-2.5 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={categories.includes(cat)}
                      onChange={() => {
                        toggleInArray(categories, setCategories, cat);
                        clearFieldError("categories");
                      }}
                      className="w-4 h-4 accent-orange-500 rounded cursor-pointer"
                    />
                    <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                      {cat}
                    </span>
                  </label>
                ))}
              </div>
              <FieldError msg={fieldErrors.categories} />
              <Helper>Select all that apply.</Helper>
            </div>

            <div>
              <Label htmlFor="products">Describe your main products *</Label>
              <textarea
                id="products"
                rows={4}
                value={productsDescription}
                onChange={(e) => { setProductsDescription(e.target.value); clearFieldError("productsDescription"); }}
                maxLength={3000}
                placeholder="e.g. Tomato paste and passata in various formats. BRC AA certified. Available in aseptic bags and drums from 5kg to 1400kg."
                className={inputCls("resize-none")}
              />
              <FieldError msg={fieldErrors.productsDescription} />
              <Helper>Include formats, sizes, and any certifications you already have.</Helper>
            </div>

            <div>
              <Label>Product images</Label>
              <div className="[&_.border-slate-200]:border-slate-600 [&_.hover\:border-orange-300:hover]:border-orange-500 [&_.hover\:bg-slate-50:hover]:bg-slate-800/50 [&_.text-slate-700]:text-slate-300 [&_.text-slate-400]:text-slate-500 [&_.bg-slate-100]:bg-slate-700 [&_.hover\:bg-slate-200:hover]:bg-slate-600 [&_.text-slate-600]:text-slate-400 [&_.bg-slate-50]:bg-slate-800/30 [&_.placeholder-slate-300]:placeholder-slate-500 [&_.focus\:ring-orange-200]:focus:ring-orange-500/30">
                <MultiImageUpload
                  value={images}
                  onChange={setImages}
                  maxImages={5}
                  bucket="suppliers"
                  exampleTypes={IMAGE_EXAMPLE_TYPES}
                />
              </div>
              <Helper>
                Show us your products. A photo of your packaging or product line tells us
                more than a description alone.
              </Helper>
            </div>
          </>
        )}

        {/* ── Step 2: Certifications & Compliance ── */}
        {step === 2 && (
          <>
            <div>
              <Label>Current kosher certification</Label>
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
              <Helper>
                Most Israeli retailers require Chief Rabbinate minimum. We can advise on
                certification path.
              </Helper>
            </div>

            <div>
              <Label>Food safety certifications</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {QUALITY_CERTS.map((cert) => (
                  <label key={cert} className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={qualityCerts.includes(cert)}
                      onChange={() => toggleInArray(qualityCerts, setQualityCerts, cert)}
                      className="w-4 h-4 accent-orange-500 rounded cursor-pointer"
                    />
                    <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                      {cert}
                    </span>
                  </label>
                ))}
              </div>
              <Helper>BRC or IFS required by most Israeli retailers.</Helper>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Do you offer private label?</Label>
                <Helper>
                  Most Israeli retail is private label — this significantly increases your
                  opportunities.
                </Helper>
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
          </>
        )}

        {/* ── Step 3: Contact ── */}
        {step === 3 && (
          <>
            <ContactFields
              name={contactName}
              onNameChange={(value) => { setContactName(value); clearFieldError("contactName"); }}
              whatsapp={whatsapp}
              onWhatsappChange={(value) => { setWhatsapp(value); clearFieldError("whatsapp"); }}
              email={email}
              onEmailChange={(value) => { setEmail(value); clearFieldError("email"); }}
              errors={{
                name: fieldErrors.contactName,
                whatsapp: fieldErrors.whatsapp,
                email: fieldErrors.email,
              }}
              defaultCountry="IT"
            />

            <div>
              <Label htmlFor="contact-title">Your role / title</Label>
              <input
                id="contact-title"
                type="text"
                value={contactTitle}
                onChange={(e) => setContactTitle(e.target.value)}
                placeholder="e.g. Export Manager"
                className={inputCls()}
              />
              <Helper>Optional — helps us address the right person.</Helper>
            </div>
          </>
        )}

        {/* ── Step 4: Additional ── */}
        {step === 4 && (
          <>
            <div>
              <Label htmlFor="capacity">Annual production capacity</Label>
              <input
                id="capacity"
                type="text"
                value={annualCapacity}
                onChange={(e) => setAnnualCapacity(e.target.value)}
                placeholder="e.g. 5,000 tons/year"
                className={inputCls()}
              />
              <Helper>Approximate is fine.</Helper>
            </div>

            <div>
              <Label>Which markets are you most interested in?</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {TARGET_MARKETS.map((market) => (
                  <label key={market} className="flex items-center gap-2.5 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={targetMarkets.includes(market)}
                      onChange={() => toggleInArray(targetMarkets, setTargetMarkets, market)}
                      className="w-4 h-4 accent-orange-500 rounded cursor-pointer"
                    />
                    <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                      {market}
                    </span>
                  </label>
                ))}
              </div>
              <Helper>Select all that apply.</Helper>
            </div>

            <div>
              <Label htmlFor="notes">Anything else we should know?</Label>
              <textarea
                id="notes"
                rows={3}
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                maxLength={1000}
                placeholder="e.g. minimum order quantities, lead times, existing distribution in Israel..."
                className={inputCls("resize-none")}
              />
              <Helper>Optional.</Helper>
            </div>
          </>
        )}

        {/* ── Step 5: Review & Submit ── */}
        {step === 5 && (
          <>
            <div className="space-y-3">
              <SummaryCard title="Company Info" onEdit={() => goToStep(0)}>
                <SummaryRow label="Company" value={companyName || "—"} />
                <SummaryRow label="Website" value={website || "—"} />
                <SummaryRow label="Country" value={country || "—"} />
              </SummaryCard>

              <SummaryCard title="Products" onEdit={() => goToStep(1)}>
                <SummaryRow label="Categories" value={categories.length > 0 ? categories.join(", ") : "—"} />
                <SummaryRow label="Description" value={productsDescription ? `${productsDescription.slice(0, 80)}${productsDescription.length > 80 ? "…" : ""}` : "—"} />
                <SummaryRow label="Images" value={`${images.length} uploaded`} />
              </SummaryCard>

              <SummaryCard title="Certifications & Compliance" onEdit={() => goToStep(2)}>
                <SummaryRow label="Kosher" value={KOSHER_OPTIONS.find((o) => o.value === kosher)?.label ?? "—"} />
                <SummaryRow label="Food safety" value={qualityCerts.length > 0 ? qualityCerts.join(", ") : "—"} />
                <SummaryRow label="Private label" value={privateLabel ? "Yes" : "No"} />
              </SummaryCard>

              <SummaryCard title="Contact" onEdit={() => goToStep(3)}>
                <SummaryRow label="Name" value={contactName || "—"} />
                <SummaryRow label="Role" value={contactTitle || "—"} />
                <SummaryRow label="Email" value={email || "—"} />
                <SummaryRow label="WhatsApp" value={whatsapp || "—"} />
              </SummaryCard>

              <SummaryCard title="Additional" onEdit={() => goToStep(4)}>
                <SummaryRow label="Annual capacity" value={annualCapacity || "—"} />
                <SummaryRow label="Target markets" value={targetMarkets.length > 0 ? targetMarkets.join(", ") : "—"} />
                <SummaryRow label="Notes" value={additionalNotes ? `${additionalNotes.slice(0, 80)}${additionalNotes.length > 80 ? "…" : ""}` : "—"} />
              </SummaryCard>
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-900/30 border border-red-700/50 rounded-lg px-4 py-3">
                {error}
              </p>
            )}

            <p className="text-center text-xs text-slate-500">
              Every submission is reviewed by a person. No automated responses.
            </p>
          </>
        )}

        {/* ── Navigation ── */}
        <div className="flex items-center justify-between gap-3 pt-2">
          {step > 0 ? (
            <button
              type="button"
              onClick={handleBack}
              className="text-sm font-medium text-slate-300 hover:text-white px-5 py-3 rounded-xl transition-colors"
            >
              ← Back
            </button>
          ) : (
            <span />
          )}

          {step < STEPS.length - 1 ? (
            <button
              type="submit"
              className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
            >
              {step === STEPS.length - 2 ? "Review →" : "Next →"}
            </button>
          ) : (
            <button
              type="submit"
              disabled={submitting || anyUploading}
              className="bg-orange-500 hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
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
          )}
        </div>
      </form>
    </div>
  );
}
