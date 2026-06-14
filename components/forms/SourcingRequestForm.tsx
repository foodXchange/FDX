"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import MultiImageUpload, { UploadedImage } from "@/components/ui/MultiImageUpload";
import ContactFields from "@/components/forms/ContactFields";
import { isValidName } from "@/lib/validation/isValidName";
import { isValidCompanyName } from "@/lib/validation/isValidCompanyName";
import { CATEGORY_COLORS } from "@/lib/products/cleanProductName";

const CATEGORY_OPTIONS = Object.keys(CATEGORY_COLORS);

const VOLUME_UNIT_OPTIONS = [
  { value: "tons", label: "tons / year" },
  { value: "kg", label: "kg / year" },
  { value: "units", label: "units / year" },
  { value: "pallets", label: "pallets / year" },
  { value: "containers", label: "containers / year" },
];

interface SourcingRequestFormProps {
  source?: string;
  heading?: string;
  subheading?: string;
  showExamples?: boolean;
  compact?: boolean;
  initialDescription?: string;
  onSuccess?: () => void;
}

type KosherOption = "chief-rabbinate" | "badatz" | "mehadrin" | "any" | "none";

interface ExampleRequest {
  title: string;
  details: string;
  description: string;
  kosher: KosherOption;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const KOSHER_CERTS: Record<KosherOption, string[]> = {
  "chief-rabbinate": ["Chief Rabbinate Kosher"],
  badatz: ["Badatz Beit Yosef Kosher"],
  mehadrin: ["Mehadrin Kosher"],
  any: ["Kosher"],
  none: [],
};

const KOSHER_OPTIONS: { value: KosherOption; label: string }[] = [
  { value: "chief-rabbinate", label: "Yes — Chief Rabbinate" },
  { value: "badatz", label: "Yes — Badatz Beit Yosef" },
  { value: "mehadrin", label: "Yes — Mehadrin" },
  { value: "any", label: "Yes — Any kosher" },
  { value: "none", label: "No kosher required" },
];

const EXAMPLES: ExampleRequest[] = [
  {
    title: "Extra virgin olive oil",
    details: "750ml glass · Chief Rabbinate · 20 tons/yr",
    description:
      "Extra virgin olive oil, 750ml glass bottle, Chief Rabbinate kosher certification, private label packaging, approximately 20 tons per year",
    kosher: "chief-rabbinate",
  },
  {
    title: "Tomato paste in retail cups",
    details: "115g & 200g · Chief Rabbinate · private label",
    description:
      "Tomato paste in retail portion cups, 115g and 200g sizes, Chief Rabbinate kosher certification, private label production",
    kosher: "chief-rabbinate",
  },
  {
    title: "Organic granola with dried fruit",
    details: "400g bag · Badatz · 10 tons/yr",
    description:
      "Organic granola with dried fruit mix, 400g resealable bag, Badatz Beit Yosef kosher certification, approximately 10 tons per year",
    kosher: "badatz",
  },
  {
    title: "Frozen potato wedges",
    details: "Chief Rabbinate · 50 tons/yr",
    description:
      "Frozen potato wedges, retail and foodservice bulk packaging, Chief Rabbinate kosher certification, approximately 50 tons per year",
    kosher: "chief-rabbinate",
  },
  {
    title: "Kalamata olives in brine",
    details: "Glass jar · Chief Rabbinate · 15 tons/yr",
    description:
      "Kalamata olives preserved in brine, glass jar packaging, Chief Rabbinate kosher certification, approximately 15 tons per year",
    kosher: "chief-rabbinate",
  },
  {
    title: "Tahini 100% sesame",
    details: "Glass jar 500g · Chief Rabbinate",
    description:
      "Pure 100% sesame tahini, 500ml glass jar, Chief Rabbinate kosher certification",
    kosher: "chief-rabbinate",
  },
];

function Label({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-300 mb-1">
      {children}
    </label>
  );
}

function Helper({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-xs text-slate-500 leading-relaxed">{children}</p>;
}

function FieldGroup({ children }: { children: React.ReactNode }) {
  return <div className="space-y-3">{children}</div>;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-400">{message}</p>;
}

function Tooltip({ text }: { text: string }) {
  return (
    <span className="relative group inline-block ml-1.5 align-middle">
      <button
        type="button"
        aria-label="More info"
        className="w-4 h-4 rounded-full border border-white/20 text-slate-500 text-[10px] font-bold flex items-center justify-center hover:border-white/40 hover:text-slate-300 transition-colors focus:outline-none"
      >
        ?
      </button>
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-dark-900 text-slate-200 text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200 delay-100 z-50 leading-relaxed shadow-lg border border-white/10">
        {text}
      </span>
    </span>
  );
}

function inputClass(extra = "") {
  return `w-full rounded-xl border border-white/10 bg-[#0f172a] px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition ${extra}`;
}

function SectionHeader({ n, title, first }: { n: number; title: string; first?: boolean }) {
  return (
    <div className={`${first ? "" : "border-t border-white/10 pt-6"} mb-1`}>
      <h3 className="text-xs font-semibold text-orange-500 uppercase tracking-wider">
        {n}. {title}
      </h3>
    </div>
  );
}

export default function SourcingRequestForm({
  source = "buyers-page",
  heading = "Tell us what you need to source",
  subheading = "Be as specific as possible — format, size, certifications, quantity.",
  showExamples = false,
  compact = false,
  initialDescription,
  onSuccess,
}: SourcingRequestFormProps) {
  const formKey =
    source === "sourcing-page"
      ? "fdx_sourcing_form"
      : source === "buyers-page"
      ? "fdx_buyer_form"
      : source
      ? `fdx_${source}_form`
      : "fdx_buyer_form";
  const searchParams = useSearchParams();
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [description, setDescription] = useState("");
  const [descHighlight, setDescHighlight] = useState(false);
  const [category, setCategory] = useState("");
  const [kosher, setKosher] = useState<KosherOption>("chief-rabbinate");
  const [volume, setVolume] = useState("");
  const [volumeUnit, setVolumeUnit] = useState("tons");
  const [packaging, setPackaging] = useState("");
  const [privateLabel, setPrivateLabel] = useState(false);
  const [name, setName] = useState(searchParams.get("name") ?? "");
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [whatsapp, setWhatsapp] = useState("");
  const [company, setCompany] = useState(searchParams.get("company") ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedSummary, setSubmittedSummary] = useState("");
  const [showAddAnother, setShowAddAnother] = useState(false);
  const [savedBanner, setSavedBanner] = useState(false);
  const [urls, setUrls] = useState<string[]>([""]);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const formRef = useRef<HTMLDivElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(formKey);
      if (saved) {
        const parsed = JSON.parse(saved) as {
          description?: string;
          category?: string;
          kosher?: KosherOption;
          volume?: string;
          volumeUnit?: string;
          packaging?: string;
          privateLabel?: boolean;
          name?: string;
          email?: string;
          whatsapp?: string;
          company?: string;
        };
        if (parsed.description) setDescription(parsed.description);
        if (parsed.category) setCategory(parsed.category);
        if (parsed.kosher) setKosher(parsed.kosher);
        if (parsed.volume) setVolume(parsed.volume);
        if (parsed.volumeUnit) setVolumeUnit(parsed.volumeUnit);
        if (parsed.packaging) setPackaging(parsed.packaging);
        if (parsed.privateLabel !== undefined) setPrivateLabel(parsed.privateLabel);
        if (parsed.name) setName(parsed.name);
        if (parsed.email) setEmail(parsed.email);
        if (parsed.whatsapp) setWhatsapp(parsed.whatsapp);
        if (parsed.company) setCompany(parsed.company);
        const hasData = !!(
          parsed.description ||
          parsed.name ||
          parsed.email ||
          parsed.whatsapp ||
          parsed.company ||
          parsed.volume
        );
        if (hasData) setSavedBanner(true);
      } else {
        const cached = localStorage.getItem("fdx_contact_cache");
        if (cached) {
          const contactCache = JSON.parse(cached) as {
            name?: string;
            email?: string;
            whatsapp?: string;
            company?: string;
          };
          if (contactCache.name) setName(contactCache.name);
          if (contactCache.email) setEmail(contactCache.email);
          if (contactCache.whatsapp) setWhatsapp(contactCache.whatsapp);
          if (contactCache.company) setCompany(contactCache.company);
        }
      }
    } catch {
      // ignore localStorage parsing errors
    }
  }, [formKey]);

  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(
          formKey,
          JSON.stringify({
            description,
            category,
            kosher,
            volume,
            volumeUnit,
            packaging,
            privateLabel,
            name,
            email,
            whatsapp,
            company,
          })
        );
      } catch {
        // ignore write errors
      }
    }, 400);
  }, [formKey, description, category, kosher, volume, volumeUnit, packaging, privateLabel, name, email, whatsapp, company]);

  useEffect(() => {
    if (initialDescription && !description) {
      setDescription(initialDescription);
    }
  }, [initialDescription, description]);

  function clearFieldError(field: string) {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function clearForm() {
    setDescription("");
    setCategory("");
    setKosher("chief-rabbinate");
    setVolume("");
    setVolumeUnit("tons");
    setPackaging("");
    setPrivateLabel(false);
    setImages([]);
    setUrls([""]);
    setSavedBanner(false);
    try {
      localStorage.removeItem(formKey);
    } catch {
      // ignore
    }
  }

  function handleSameCategory() {
    setDescription("");
    setImages([]);
    setUrls([""]);
    setVolume("");
    setVolumeUnit("tons");
    setPackaging("");
    setPrivateLabel(false);
    setSubmitted(false);
    setShowAddAnother(false);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleDifferentProduct() {
    setDescription("");
    setCategory("");
    setImages([]);
    setUrls([""]);
    setVolume("");
    setVolumeUnit("tons");
    setPackaging("");
    setKosher("chief-rabbinate");
    setPrivateLabel(false);
    setSubmitted(false);
    setShowAddAnother(false);
    try {
      localStorage.removeItem(formKey);
    } catch {
      // ignore
    }
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function addUrlInput() {
    if (urls.length < 5) setUrls([...urls, ""]);
  }

  function removeUrlInput(index: number) {
    setUrls(urls.filter((_, idx) => idx !== index));
  }

  function updateUrl(index: number, value: string) {
    setUrls(urls.map((url, idx) => (idx === index ? value : url)));
  }

  function prefill(example: ExampleRequest) {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setKosher(example.kosher);
    setDescription("");
    let i = 0;
    const text = example.description;
    const interval = setInterval(() => {
      setDescription(text.slice(0, i + 1));
      i += 1;
      if (i >= text.length) {
        clearInterval(interval);
        descRef.current?.focus();
      }
    }, 30);
    setDescHighlight(true);
    setTimeout(() => setDescHighlight(false), 1400);
  }

  function validateField(field: "description" | "name" | "email" | "whatsapp" | "company") {
    setFieldErrors((prev) => {
      const next = { ...prev };
      switch (field) {
        case "description":
          if (!description.trim() && images.length === 0) {
            next.description = "Please describe the product you're looking for";
          } else {
            delete next.description;
          }
          break;
        case "name":
          if (!isValidName(name)) {
            next.name = "Please enter your real name (first name is fine)";
          } else {
            delete next.name;
          }
          break;
        case "email":
          if (email.trim() && !EMAIL_REGEX.test(email.trim())) {
            next.email = "Please enter a valid email address";
          } else if (!email.trim() && !whatsapp.trim()) {
            next.email = "Please provide an email or WhatsApp number so we can reach you";
          } else {
            delete next.email;
            if (next.whatsapp === "Please provide an email or WhatsApp number so we can reach you") {
              delete next.whatsapp;
            }
          }
          break;
        case "whatsapp":
          if (whatsapp.trim() && !isValidPhoneNumber(whatsapp)) {
            next.whatsapp = "Please enter a valid WhatsApp number including country code";
          } else if (!whatsapp.trim() && !email.trim()) {
            next.whatsapp = "Please provide an email or WhatsApp number so we can reach you";
          } else {
            delete next.whatsapp;
            if (next.email === "Please provide an email or WhatsApp number so we can reach you") {
              delete next.email;
            }
          }
          break;
        case "company":
          if (company.trim() && !isValidCompanyName(company)) {
            next.company = "Please enter your company name";
          } else {
            delete next.company;
          }
          break;
      }
      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const errors: Record<string, string> = {};
    if (!isValidName(name)) {
      errors.name = "Please enter your real name (first name is fine)";
    }
    if (email.trim() && !EMAIL_REGEX.test(email.trim())) {
      errors.email = "Please enter a valid email address";
    }
    if (whatsapp.trim() && !isValidPhoneNumber(whatsapp)) {
      errors.whatsapp = "Please enter a valid WhatsApp number including country code";
    }
    if (!email.trim() && !whatsapp.trim()) {
      const msg = "Please provide an email or WhatsApp number so we can reach you";
      errors.email = msg;
      errors.whatsapp = msg;
    }
    if (company.trim() && !isValidCompanyName(company)) {
      errors.company = "Please enter your company name";
    }
    if (!description.trim() && images.length === 0) {
      errors.description = "Please describe the product you're looking for";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setError(null);
    setSubmitting(true);

    const extraUrls = urls.filter((url) => url.trim().startsWith("http"));
    let fullDescription = description.trim();
    if (volume.trim()) {
      const unitLabel = VOLUME_UNIT_OPTIONS.find((u) => u.value === volumeUnit)?.label ?? "tons / year";
      fullDescription += `\n\nEstimated annual volume: ${volume} ${unitLabel}`;
    }
    if (packaging.trim()) {
      fullDescription += `\n\nFormat/packaging preference: ${packaging.trim()}`;
    }

    const payload = {
      name: name.trim(),
      email: email.trim() || undefined,
      whatsapp: whatsapp || undefined,
      company: company.trim() || undefined,
      description: fullDescription || undefined,
      category: category || undefined,
      certifications: KOSHER_CERTS[kosher],
      private_label: privateLabel || null,
      image_urls: [
        ...images.filter((img) => !img.uploading && !img.error && img.url).map((img) => img.url),
        ...extraUrls,
      ].slice(0, 5),
      source,
    };

    try {
      const res = await fetch("/api/sourcing/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; message?: string };
      if (res.status === 429) {
        setError(data.message ?? "You've submitted several requests — please wait a few minutes before submitting again.");
        return;
      }
      if (!data.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      try {
        localStorage.removeItem(formKey);
        localStorage.setItem(
          "fdx_contact_cache",
          JSON.stringify({ name, email, whatsapp, company })
        );
      } catch {
        // ignore
      }
      if (onSuccess) {
        onSuccess();
        return;
      }
      const shortDescription = description.trim().slice(0, 80);
      setSubmittedSummary(
        category
          ? `${category}${shortDescription ? `: ${shortDescription}` : ""}`
          : shortDescription
      );
      setSubmitted(true);
      setTimeout(() => setShowAddAnother(true), 2000);
    } catch {
      setError("Network error — please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const anyUploading = images.some((img) => img.uploading);

  return (
    <div ref={formRef} className="space-y-10">
      {showExamples && (
        <section className="px-6 py-10 border-b border-dark-border">
          <div className="max-w-4xl mx-auto">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4 text-center">
              Example requests — click to pre-fill the form
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {EXAMPLES.map((example, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => prefill(example)}
                  className="group text-left p-4 dark-card hover:border-orange-500/40 transition-all hover:shadow-black/30 hover:shadow-md"
                >
                  <p className="font-semibold text-dark-text-primary text-sm mb-1">{example.title}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">{example.details}</p>
                  <p className="text-xs text-orange-400 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    Try this example →
                  </p>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="px-6 py-14">
        <div className="max-w-xl mx-auto">
          {!compact && (
            <>
              <h2 className="text-2xl font-bold text-dark-text-primary mb-2 text-center">{heading}</h2>
              <p className="text-slate-400 text-center text-sm mb-8">{subheading}</p>
            </>
          )}

          {submitted ? (
            <div className="text-center py-14 px-6 bg-green-500/10 rounded-2xl border border-green-500/20">
              <div
                className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-5"
                style={{ animation: "pop 0.4s cubic-bezier(0.175,0.885,0.32,1.275)" }}
              >
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-dark-text-primary mb-2">Request received</h3>
              <p className="text-slate-400 text-sm mb-2">
                We&apos;ll review your request and send you matched suppliers within 24 hours.
              </p>
              {submittedSummary && (
                <p className="text-slate-300 text-sm mb-6 italic">
                  Your request: &ldquo;{submittedSummary}
                  {submittedSummary.length >= 80 ? "…" : ""}&rdquo;
                </p>
              )}

              <button
                type="button"
                onClick={handleDifferentProduct}
                className="btn-brand px-6 py-3 rounded-lg text-sm"
              >
                Submit another request
              </button>

              <div
                className={`transition-all duration-700 ${
                  showAddAnother
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-2 pointer-events-none"
                }`}
              >
                <div className="flex gap-3 justify-center flex-wrap mt-4">
                  <button
                    type="button"
                    onClick={handleSameCategory}
                    className="border border-white/20 text-slate-300 hover:bg-white/5 px-5 py-2.5 rounded-lg text-sm transition"
                  >
                    + Same category
                  </button>
                </div>
                <a href="/" className="block mt-6 text-sm text-slate-500 hover:text-slate-300 transition">
                  ← Go to homepage
                </a>
              </div>
              <style>{`@keyframes pop{0%{transform:scale(0)}80%{transform:scale(1.12)}100%{transform:scale(1)}}`}</style>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {savedBanner && (
                <div className="flex items-center justify-between text-sm bg-blue-500/10 border border-blue-500/20 rounded-lg px-4 py-2.5">
                  <span className="text-slate-300">We saved your progress — continue where you left off</span>
                  <button
                    type="button"
                    onClick={() => setSavedBanner(false)}
                    className="text-slate-500 hover:text-slate-300 ml-3 shrink-0 text-base leading-none"
                  >
                    ×
                  </button>
                </div>
              )}

              <SectionHeader n={1} title="What are you looking for?" first />

              <FieldGroup>
                <Label htmlFor="description">
                  What do you need to source?
                  <Tooltip text="The more detail you provide, the better our matching. Include: product type, packaging format, size/weight, certifications required, annual volume if known, target price range." />
                </Label>
                <textarea
                  id="description"
                  ref={descRef}
                  rows={5}
                  value={description}
                  onChange={(event) => {
                    setDescription(event.target.value);
                    clearFieldError("description");
                  }}
                  onBlur={() => validateField("description")}
                  maxLength={2000}
                  placeholder="e.g. Extra virgin olive oil, 750ml glass bottle, Chief Rabbinate kosher certification, private label"
                  className={`${inputClass("resize-none")} ${descHighlight ? "border-orange-500/60" : ""}`}
                />
                <FieldError message={fieldErrors.description} />
                <Helper>Be as specific as possible — format, size, certifications, quantity.</Helper>
              </FieldGroup>

              <FieldGroup>
                <Label htmlFor="category">Product category</Label>
                <select
                  id="category"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className={inputClass()}
                >
                  <option value="">Select a category…</option>
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <Helper>Helps us route your request to the right suppliers.</Helper>
              </FieldGroup>

              <FieldGroup>
                <Label htmlFor="volume">
                  Estimated annual volume
                  <Tooltip text="Suppliers have minimum order quantities. Knowing your volume helps us filter out suppliers who are too large or too small for your needs." />
                </Label>
                <div className="flex items-center gap-2">
                  <input
                    id="volume"
                    type="number"
                    min={1}
                    max={99999}
                    value={volume}
                    onChange={(event) => setVolume(event.target.value)}
                    placeholder="e.g. 20"
                    className={inputClass()}
                    style={{ maxWidth: "150px" }}
                  />
                  <select
                    value={volumeUnit}
                    onChange={(event) => setVolumeUnit(event.target.value)}
                    className={inputClass()}
                    style={{ maxWidth: "170px" }}
                    aria-label="Volume unit"
                  >
                    {VOLUME_UNIT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <Helper>Approximate is fine — this helps us match you with suppliers of the right scale.</Helper>
              </FieldGroup>

              <FieldGroup>
                <Label>
                  Product images <span className="text-slate-500 font-normal">(optional)</span>
                </Label>
                <MultiImageUpload value={images} onChange={setImages} maxImages={5} bucket="requests" />
                {images.length > 0 && (
                  <p className="mt-1 text-xs text-slate-500">{images.length} of 5 images added</p>
                )}
                <Helper>Up to 5 images — drop files or paste a URL. Max 5 MB each.</Helper>
              </FieldGroup>

              <FieldGroup>
                <Label>
                  Or paste product / catalogue URL <span className="text-slate-500 font-normal">(optional)</span>
                </Label>
                {urls.map((url, index) => (
                  <div key={index} className="flex items-center gap-2 mb-1">
                    <input
                      type="url"
                      value={url}
                      onChange={(event) => updateUrl(index, event.target.value)}
                      placeholder="https://..."
                      className={inputClass()}
                    />
                    {urls.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeUrlInput(index)}
                        className="text-slate-400 hover:text-red-400 text-lg leading-none px-1"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                {urls.length < 5 && (
                  <button
                    type="button"
                    onClick={addUrlInput}
                    className="text-sm text-orange-400 hover:text-orange-300 mt-1"
                  >
                    + Add another URL
                  </button>
                )}
              </FieldGroup>

              <SectionHeader n={2} title="Requirements" />

              <FieldGroup>
                <Label>
                  Kosher certification required?
                  <Tooltip text="Chief Rabbinate (Rabbanut) is accepted by all Israeli retailers. Badatz is a higher standard required by some buyers. Mehadrin is the strictest standard for premium kosher." />
                </Label>
                <div className="space-y-1 mt-1">
                  {KOSHER_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-3 cursor-pointer group rounded-lg px-3 py-2.5 hover:bg-white/5 transition-colors"
                    >
                      <input
                        type="radio"
                        name="kosher"
                        value={option.value}
                        checked={kosher === option.value}
                        onChange={() => setKosher(option.value)}
                        className="w-5 h-5 accent-orange-500 cursor-pointer"
                      />
                      <span className="text-sm text-slate-300 group-hover:text-dark-text-primary transition-colors">
                        {option.label}
                      </span>
                    </label>
                  ))}
                </div>
                <Helper>Most Israeli retailers require Chief Rabbinate as minimum.</Helper>
              </FieldGroup>

              <FieldGroup>
                <div className="flex items-center justify-between">
                  <Label>Do you need private label?</Label>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={privateLabel}
                    onClick={() => setPrivateLabel(!privateLabel)}
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500/40 ${
                      privateLabel ? "bg-orange-500" : "bg-dark-500"
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                        privateLabel ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
                <Helper>We will only show suppliers who offer private label production.</Helper>
              </FieldGroup>

              <FieldGroup>
                <Label htmlFor="packaging">Format / packaging preference</Label>
                <input
                  id="packaging"
                  type="text"
                  value={packaging}
                  onChange={(event) => setPackaging(event.target.value)}
                  placeholder="e.g. 500g jars, 12/case"
                  className={inputClass()}
                />
                <Helper>Optional — let suppliers know your preferred pack size or format.</Helper>
              </FieldGroup>

              <SectionHeader n={3} title="Your details" />

              <ContactFields
                name={name}
                onNameChange={(value) => {
                  setName(value);
                  clearFieldError("name");
                }}
                onNameBlur={() => validateField("name")}
                company={company}
                onCompanyChange={(value) => {
                  setCompany(value);
                  clearFieldError("company");
                }}
                onCompanyBlur={() => validateField("company")}
                whatsapp={whatsapp}
                onWhatsappChange={(value) => {
                  setWhatsapp(value);
                  clearFieldError("whatsapp");
                }}
                onWhatsappBlur={() => validateField("whatsapp")}
                email={email}
                onEmailChange={(value) => {
                  setEmail(value);
                  clearFieldError("email");
                }}
                onEmailBlur={() => validateField("email")}
                errors={fieldErrors}
                defaultCountry="IL"
                companyOptional
              />

              {error && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                  {error}
                </p>
              )}

              <div className="sticky bottom-0 z-20 -mx-6 sm:-mx-8 mt-2 border-t border-white/10 bg-dark-900/95 backdrop-blur px-6 sm:px-8 py-3">
                <button
                  type="submit"
                  disabled={submitting || anyUploading}
                  className="btn-brand w-full justify-center py-3.5 rounded-xl disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Sending...
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
                    "Submit sourcing request →"
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={clearForm}
                className="text-xs text-slate-500 hover:text-slate-300 text-center block mx-auto"
              >
                Clear form
              </button>

              <div className="mt-8 dark-card px-6 py-5">
                <p className="text-sm font-semibold text-dark-text-primary mb-3">What happens after you submit?</p>
                <ul className="space-y-2">
                  {[
                    "You receive a confirmation immediately",
                    "Our team reviews your request personally",
                    "We send you matched supplier profiles within 24 hours",
                    "You decide who to connect with — no obligation",
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-slate-400">
                      <svg className="w-4 h-4 text-green-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-xs text-slate-500 italic">
                  Every request is reviewed by a human. No automated emails. No spam.
                </p>
              </div>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
