"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import MultiImageUpload, { UploadedImage } from "@/components/ui/MultiImageUpload";
import { isValidName } from "@/lib/validation/isValidName";
import { isValidCompanyName } from "@/lib/validation/isValidCompanyName";

type KosherOption = "chief-rabbinate" | "badatz" | "mehadrin" | "any" | "none";
type VolumeUnit = "tons" | "kg" | "units" | "containers";

interface Example {
  title: string;
  details: string;
  description: string;
  kosher: KosherOption;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const KOSHER_CERTS: Record<KosherOption, string[]> = {
  "chief-rabbinate": ["Chief Rabbinate Kosher"],
  "badatz":          ["Badatz Beit Yosef Kosher"],
  "mehadrin":        ["Mehadrin Kosher"],
  "any":             ["Kosher"],
  "none":            [],
};

const KOSHER_OPTIONS: { value: KosherOption; label: string }[] = [
  { value: "chief-rabbinate", label: "Yes — Chief Rabbinate" },
  { value: "badatz",          label: "Yes — Badatz Beit Yosef" },
  { value: "mehadrin",        label: "Yes — Mehadrin" },
  { value: "any",             label: "Yes — Any kosher" },
  { value: "none",            label: "No kosher required" },
];

const EXAMPLES: Example[] = [
  {
    title: "Extra virgin olive oil",
    details: "750ml glass · Chief Rabbinate · 20 tons/yr",
    description: "Extra virgin olive oil, 750ml glass bottle, Chief Rabbinate kosher certification, private label packaging, approximately 20 tons per year",
    kosher: "chief-rabbinate",
  },
  {
    title: "Tomato paste in retail cups",
    details: "115g & 200g · Chief Rabbinate · private label",
    description: "Tomato paste in retail portion cups, 115g and 200g sizes, Chief Rabbinate kosher certification, private label production",
    kosher: "chief-rabbinate",
  },
  {
    title: "Organic granola with dried fruit",
    details: "400g bag · Badatz · 10 tons/yr",
    description: "Organic granola with dried fruit mix, 400g resealable bag, Badatz Beit Yosef kosher certification, approximately 10 tons per year",
    kosher: "badatz",
  },
  {
    title: "Frozen potato wedges",
    details: "Chief Rabbinate · 50 tons/yr",
    description: "Frozen potato wedges, retail and foodservice bulk packaging, Chief Rabbinate kosher certification, approximately 50 tons per year",
    kosher: "chief-rabbinate",
  },
  {
    title: "Kalamata olives in brine",
    details: "Glass jar · Chief Rabbinate · 15 tons/yr",
    description: "Kalamata olives preserved in brine, glass jar packaging, Chief Rabbinate kosher certification, approximately 15 tons per year",
    kosher: "chief-rabbinate",
  },
  {
    title: "Tahini 100% sesame",
    details: "Glass jar 500g · Chief Rabbinate",
    description: "Pure 100% sesame tahini, 500ml glass jar, Chief Rabbinate kosher certification",
    kosher: "chief-rabbinate",
  },
];

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
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-65 bg-dark-900 text-slate-200 text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200 delay-100 z-50 leading-relaxed shadow-lg border border-white/10 sm:left-1/2 max-sm:bottom-auto max-sm:top-full max-sm:mt-2 max-sm:mb-0">
        {text}
      </span>
    </span>
  );
}

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
  return <div className="space-y-1">{children}</div>;
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs text-red-400">{msg}</p>;
}

export default function BuyerRequestSection() {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [description, setDescription] = useState("");
  const [descHighlight, setDescHighlight] = useState(false);
  const [kosher, setKosher] = useState<KosherOption>("chief-rabbinate");
  const [volume, setVolume] = useState("");
  const [volumeUnit, setVolumeUnit] = useState<VolumeUnit>("tons");
  const [privateLabel, setPrivateLabel] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [company, setCompany] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const formRef = useRef<HTMLDivElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("buyers_form");
      if (!saved) return;
      const s = JSON.parse(saved) as {
        description?: string;
        kosher?: string;
        volume?: string;
        volumeUnit?: string;
        privateLabel?: boolean;
        name?: string;
        email?: string;
        whatsapp?: string;
        company?: string;
      };
      if (s.description) setDescription(s.description);
      if (s.kosher && ["chief-rabbinate", "badatz", "mehadrin", "any", "none"].includes(s.kosher))
        setKosher(s.kosher as KosherOption);
      if (s.volume) setVolume(s.volume);
      if (s.volumeUnit && ["tons", "kg", "units", "containers"].includes(s.volumeUnit))
        setVolumeUnit(s.volumeUnit as VolumeUnit);
      if (s.privateLabel !== undefined) setPrivateLabel(Boolean(s.privateLabel));
      if (s.name) setName(s.name);
      if (s.email) setEmail(s.email);
      if (s.whatsapp) setWhatsapp(s.whatsapp);
      if (s.company) setCompany(s.company);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(
          "buyers_form",
          JSON.stringify({ description, kosher, volume, volumeUnit, privateLabel, name, email, whatsapp, company })
        );
      } catch { /* ignore */ }
    }, 400);
  }, [description, kosher, volume, volumeUnit, privateLabel, name, email, whatsapp, company]);

  const anyUploading = images.some((img) => img.uploading);

  function prefill(ex: Example) {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setKosher(ex.kosher);
    setDescription("");
    let i = 0;
    const text = ex.description;
    const t = setInterval(() => {
      setDescription(text.slice(0, i + 1));
      i++;
      if (i >= text.length) {
        clearInterval(t);
        descRef.current?.focus();
      }
    }, 50);
    setDescHighlight(true);
    setTimeout(() => setDescHighlight(false), 1400);
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

    if (!isValidName(name)) {
      errors.name = "Please enter your real name (first name is fine)";
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      errors.email = "Please enter a valid email address";
    }
    if (whatsapp && !isValidPhoneNumber(whatsapp)) {
      errors.whatsapp = "Please enter a valid WhatsApp number including country code";
    }
    if (company.trim() && !isValidCompanyName(company)) {
      errors.company = "Please enter your company name";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    if (!description.trim() && images.length === 0) {
      setError("Please describe the product or upload at least one image.");
      return;
    }

    setSubmitting(true);
    setError(null);

    let fullDesc = description.trim();
    if (volume.trim()) fullDesc += `\n\nEstimated annual volume: ${volume} ${volumeUnit}`;

    const payload = {
      name: name.trim(),
      email: email.trim(),
      whatsapp: whatsapp || undefined,
      company: company.trim() || undefined,
      description: fullDesc || undefined,
      certifications: KOSHER_CERTS[kosher],
      private_label: privateLabel || null,
      image_urls: images
        .filter((img) => !img.uploading && !img.error && img.url)
        .map((img) => img.url),
      source: "buyers-page",
    };

    try {
      const res = await fetch("/api/sourcing/submit", {
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
      try { localStorage.removeItem("buyers_form"); } catch { /* ignore */ }
      setSubmitted(true);
    } catch {
      setError("Network error — please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      {/* ── 1. Onboarding Steps ── */}
      <section className="px-6 py-14 border-b border-dark-border">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                n: "①",
                title: "Submit your request",
                body: "Upload a photo or describe what you need. Takes 2 minutes.",
                icon: (
                  <svg className="w-7 h-7 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                ),
              },
              {
                n: "②",
                title: "We find matches",
                body: "Our system searches 500+ verified European manufacturers. You get results within 24 hours.",
                icon: (
                  <svg className="w-7 h-7 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z" />
                  </svg>
                ),
              },
              {
                n: "③",
                title: "We make the introduction",
                body: "We handle the commercial alignment and stay involved through the early commercial discussion.",
                icon: (
                  <svg className="w-7 h-7 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                ),
              },
            ].map((step, i) => (
              <div key={i} className="dark-card flex flex-col items-start gap-3 p-6">
                {step.icon}
                <div>
                  <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider mb-1">{step.n}</p>
                  <h3 className="font-semibold text-dark-text-primary mb-2">{step.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 2. Example Requests ── */}
      <section className="px-6 py-12 border-b border-dark-border">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4 text-center">
            Example requests — click to pre-fill the form
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {EXAMPLES.map((ex, i) => (
              <button
                key={i}
                type="button"
                onClick={() => prefill(ex)}
                className="group text-left p-4 dark-card hover:border-orange-500/40 transition-all hover:shadow-black/30 hover:shadow-md"
              >
                <p className="font-semibold text-dark-text-primary text-sm mb-1">{ex.title}</p>
                <p className="text-xs text-slate-500 leading-relaxed">{ex.details}</p>
                <p className="text-xs text-orange-400 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  Try this example →
                </p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. Social Proof Strip ── */}
      <section className="px-6 py-8 border-b border-dark-border">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
            Trusted by Israel&apos;s leading retailers and importers
          </p>
          <p className="text-sm text-slate-400 font-medium">
            Shufersal &nbsp;·&nbsp; Yochananof &nbsp;·&nbsp; Rami Levy &nbsp;·&nbsp; Ta&apos;aman &nbsp;·&nbsp; H. Cohen Import &nbsp;·&nbsp; Leiman Schlussel
          </p>
          <p className="mt-4 text-xs text-slate-500">
            500+ verified manufacturers &nbsp;·&nbsp; 17 product categories &nbsp;·&nbsp; 24h response time
          </p>
        </div>
      </section>

      {/* ── 4. Form ── */}
      <section className="px-6 py-14">
        <div className="max-w-xl mx-auto">
          <div ref={formRef}>
            <h2 className="text-2xl font-bold text-dark-text-primary mb-2 text-center">
              Tell us what you need to source
            </h2>
            <p className="text-slate-400 text-center text-sm mb-8">
              Be as specific as possible — format, size, certifications, quantity.
            </p>

            {submitted ? (
              <div className="text-center py-14 px-6 bg-green-500/10 rounded-2xl border border-green-500/20">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-5" style={{ animation: "pop 0.4s cubic-bezier(0.175,0.885,0.32,1.275)" }}>
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-dark-text-primary mb-2">Request received</h3>
                <p className="text-slate-400 text-sm mb-6">
                  We&apos;ll be in touch within 24 hours.
                </p>
                <a
                  href="/en/contact"
                  className="text-sm text-orange-400 hover:text-orange-300 font-medium underline underline-offset-2"
                >
                  In the meantime, reach us directly →
                </a>
                <style>{`@keyframes pop{0%{transform:scale(0)}80%{transform:scale(1.12)}100%{transform:scale(1)}}`}</style>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Images */}
                <FieldGroup>
                  <Label>Product images</Label>
                  <MultiImageUpload value={images} onChange={setImages} maxImages={5} bucket="requests" />
                  <Helper>Up to 5 images — drop files or paste a URL. Max 5 MB each.</Helper>
                </FieldGroup>

                {/* Description */}
                <FieldGroup>
                  <Label htmlFor="description">
                    What do you need to source?
                    <Tooltip text="The more detail you provide, the better our matching. Include: product type, packaging format, size/weight, certifications required, annual volume if known, target price range." />
                  </Label>
                  <textarea
                    id="description"
                    ref={descRef}
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={2000}
                    placeholder="e.g. Extra virgin olive oil, 750ml glass bottle, Chief Rabbinate kosher certification, private label"
                    className={`dark-input resize-none ${
                      descHighlight ? "border-orange-500/60" : ""
                    }`}
                  />
                  <Helper>Be as specific as possible — format, size, certifications, quantity.</Helper>
                </FieldGroup>

                {/* Kosher */}
                <FieldGroup>
                  <Label>
                    Kosher certification required?
                    <Tooltip text="Chief Rabbinate (Rabbanut) is accepted by all Israeli retailers. Badatz is a higher standard required by some buyers. Mehadrin is the strictest standard for premium kosher." />
                  </Label>
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
                        <span className="text-sm text-slate-300 group-hover:text-dark-text-primary transition-colors">
                          {opt.label}
                        </span>
                      </label>
                    ))}
                  </div>
                  <Helper>Most Israeli retailers require Chief Rabbinate as minimum.</Helper>
                </FieldGroup>

                {/* Annual volume */}
                <FieldGroup>
                  <Label htmlFor="volume">
                    Estimated annual volume
                    <Tooltip text="Suppliers have minimum order quantities. Knowing your volume helps us filter out suppliers who are too large or too small for your needs." />
                  </Label>
                  <div className="flex gap-2">
                    <input
                      id="volume"
                      type="number"
                      min="0"
                      step="any"
                      value={volume}
                      onChange={(e) => setVolume(e.target.value)}
                      placeholder="e.g. 20"
                      className="dark-input flex-1"
                      style={{ width: undefined }}
                    />
                    <select
                      value={volumeUnit}
                      onChange={(e) => setVolumeUnit(e.target.value as VolumeUnit)}
                      className="dark-input w-auto px-3"
                      style={{ width: undefined }}
                    >
                      <option value="tons">tons</option>
                      <option value="kg">kg</option>
                      <option value="units">units</option>
                      <option value="containers">containers</option>
                    </select>
                  </div>
                  <Helper>Approximate is fine — this helps us match you with suppliers of the right scale.</Helper>
                </FieldGroup>

                {/* Private label */}
                <FieldGroup>
                  <div className="flex items-center justify-between">
                    <Label>Do you need private label?</Label>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={privateLabel}
                      onClick={() => setPrivateLabel(!privateLabel)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500/40 ${
                        privateLabel ? "bg-orange-500" : "bg-dark-500"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                          privateLabel ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                  <Helper>We will only show suppliers who offer private label production.</Helper>
                </FieldGroup>

                {/* Company */}
                <FieldGroup>
                  <Label htmlFor="company">Your company</Label>
                  <input
                    id="company"
                    type="text"
                    value={company}
                    onChange={(e) => { setCompany(e.target.value); clearFieldError("company"); }}
                    placeholder="e.g. Yochananof, ABC Imports"
                    className="dark-input"
                  />
                  <FieldError msg={fieldErrors.company} />
                  <Helper>Retailer, importer, or food service.</Helper>
                </FieldGroup>

                {/* Name + WhatsApp */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <FieldGroup>
                    <Label htmlFor="name">Your name *</Label>
                    <input
                      id="name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => { setName(e.target.value); clearFieldError("name"); }}
                      placeholder="Full name"
                      className="dark-input"
                    />
                    <FieldError msg={fieldErrors.name} />
                  </FieldGroup>
                  <FieldGroup>
                    <Label htmlFor="whatsapp">WhatsApp number</Label>
                    <div
                      className="flex items-center bg-[#162330] border border-white/[0.12] rounded-lg px-3 py-[10px] gap-2"
                      style={{ "--PhoneInputCountrySelectArrow-color": "#94a3b8" } as React.CSSProperties}
                    >
                      <PhoneInput
                        defaultCountry="IL"
                        value={whatsapp || undefined}
                        onChange={(v) => { setWhatsapp(v ?? ""); clearFieldError("whatsapp"); }}
                        inputClassName="flex-1 bg-transparent outline-none text-[#f1f5f9] placeholder-slate-500 text-sm min-w-0"
                        numberInputProps={{ id: "whatsapp" }}
                      />
                    </div>
                    <FieldError msg={fieldErrors.whatsapp} />
                    <Helper>We respond faster on WhatsApp — usually within 2 hours.</Helper>
                  </FieldGroup>
                </div>

                {/* Email */}
                <FieldGroup>
                  <Label htmlFor="email">Email address *</Label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); clearFieldError("email"); }}
                    placeholder="you@company.com"
                    className="dark-input"
                  />
                  <FieldError msg={fieldErrors.email} />
                </FieldGroup>

                {/* Error */}
                {error && (
                  <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                    {error}
                  </p>
                )}

                {/* Submit */}
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

                {/* What happens next */}
                <div className="mt-8 dark-card px-6 py-5">
                  <p className="text-sm font-semibold text-dark-text-primary mb-3">What happens after you submit?</p>
                  <ul className="space-y-2">
                    {[
                      "You receive a confirmation immediately",
                      "Our team reviews your request personally",
                      "We send you matched supplier profiles within 24 hours",
                      "You decide who to connect with — no obligation",
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-400">
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
        </div>
      </section>
    </div>
  );
}
