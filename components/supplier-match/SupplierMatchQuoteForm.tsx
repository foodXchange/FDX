"use client";

import { useState } from "react";

interface Props {
  matchId: string;
  companyName: string;
  matchedProductName: string;
  defaultEmail: string;
  defaultPhone: string;
  existingResponse: string | null;
}

const CERT_OPTIONS = [
  "Kosher Certified",
  "Can Arrange Kosher",
  "IFS / BRCGS",
  "ISO 22000 / FSSC",
  "Organic",
  "Halal",
  "Gluten-Free",
];

export default function SupplierMatchQuoteForm({
  matchId,
  companyName,
  matchedProductName,
  defaultEmail,
  defaultPhone,
  existingResponse,
}: Props) {
  const [responseType, setResponseType] = useState<
    "accepted" | "countered" | "declined"
  >("accepted");
  const [indicativePrice, setIndicativePrice] = useState("");
  const [moq, setMoq] = useState("");
  const [leadTime, setLeadTime] = useState("");
  const [labelOption, setLabelOption] = useState(
    "Both Private Label & Branded"
  );
  const [confirmedCerts, setConfirmedCerts] = useState<string[]>([]);
  const [samplesAvailable, setSamplesAvailable] = useState(
    "Yes — samples available"
  );
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState(defaultEmail);
  const [contactPhone, setContactPhone] = useState(defaultPhone);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleCert(cert: string) {
    setConfirmedCerts((prev) =>
      prev.includes(cert) ? prev.filter((c) => c !== cert) : [...prev, cert]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/supplier-match/${matchId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          responseType,
          indicativePrice,
          moq,
          leadTime,
          labelOption,
          confirmedCerts,
          samplesAvailable,
          contactName,
          contactEmail,
          contactPhone,
          message,
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
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center text-2xl mx-auto">
          ✓
        </div>
        <h2 className="text-lg font-bold text-emerald-950">
          Thank you, {companyName}!
        </h2>
        <p className="text-sm text-emerald-800 max-w-md mx-auto leading-relaxed">
          Your commercial response and product details for{" "}
          <strong>{matchedProductName}</strong> have been sent directly to the
          FoodXchange Sourcing Team. We will review your offer with our buyer
          and follow up shortly.
        </p>
        <button
          type="button"
          onClick={() => setSubmitted(false)}
          className="text-xs font-semibold text-emerald-700 underline hover:text-emerald-900"
        >
          Update or add more details
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {existingResponse && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-800">
          <strong>Previous response on file:</strong> You have already responded
          to this inquiry, but you can submit updated pricing or details below
          at any time.
        </div>
      )}

      {/* 1. Availability Decision */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2.5">
          1. Product Availability
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={() => setResponseType("accepted")}
            className={`p-3.5 rounded-xl border text-left transition ${
              responseType === "accepted"
                ? "border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500/20"
                : "border-slate-200 hover:border-slate-300 bg-white"
            }`}
          >
            <div className="text-sm font-bold text-slate-900">
              ✅ Can Supply
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              We manufacture or supply this exact product
            </div>
          </button>

          <button
            type="button"
            onClick={() => setResponseType("countered")}
            className={`p-3.5 rounded-xl border text-left transition ${
              responseType === "countered"
                ? "border-amber-500 bg-amber-50/70 ring-2 ring-amber-500/20"
                : "border-slate-200 hover:border-slate-300 bg-white"
            }`}
          >
            <div className="text-sm font-bold text-slate-900">
              🔄 Similar Option
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              We offer a close alternative format or recipe
            </div>
          </button>

          <button
            type="button"
            onClick={() => setResponseType("declined")}
            className={`p-3.5 rounded-xl border text-left transition ${
              responseType === "declined"
                ? "border-red-500 bg-red-50/70 ring-2 ring-red-500/20"
                : "border-slate-200 hover:border-slate-300 bg-white"
            }`}
          >
            <div className="text-sm font-bold text-slate-900">
              ❌ Cannot Supply
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Not relevant or no export capacity
            </div>
          </button>
        </div>
      </div>

      {responseType !== "declined" && (
        <>
          {/* 2. Commercial Terms */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Indicative Export Price
              </label>
              <input
                type="text"
                value={indicativePrice}
                onChange={(e) => setIndicativePrice(e.target.value)}
                placeholder="e.g. €2.10 / unit EXW"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Minimum Order (MOQ)
              </label>
              <input
                type="text"
                value={moq}
                onChange={(e) => setMoq(e.target.value)}
                placeholder="e.g. 1 pallet / 5,000 pcs"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Production Lead Time
              </label>
              <input
                type="text"
                value={leadTime}
                onChange={(e) => setLeadTime(e.target.value)}
                placeholder="e.g. 3–4 weeks"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          {/* 3. Label & Samples */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Branding / Private Label Capability
              </label>
              <select
                value={labelOption}
                onChange={(e) => setLabelOption(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="Both Private Label & Branded">
                  Both Private Label & Producer Brand
                </option>
                <option value="Private Label Only">Private Label Only</option>
                <option value="Producer Brand Only">Producer Brand Only</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Samples for Buyer Evaluation
              </label>
              <select
                value={samplesAvailable}
                onChange={(e) => setSamplesAvailable(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="Yes — samples available">
                  Yes — samples ready to dispatch
                </option>
                <option value="Available upon commercial alignment">
                  Available after initial price alignment
                </option>
                <option value="Digital specs/catalogue first">
                  Digital spec sheets / catalogue first
                </option>
              </select>
            </div>
          </div>

          {/* 4. Certifications */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Confirmed Certifications for This Product (click all that apply)
            </label>
            <div className="flex flex-wrap gap-2">
              {CERT_OPTIONS.map((cert) => {
                const active = confirmedCerts.includes(cert);
                return (
                  <button
                    key={cert}
                    type="button"
                    onClick={() => toggleCert(cert)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                      active
                        ? "bg-orange-500 text-white border-orange-500"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {active ? `✓ ${cert}` : cert}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* 5. Direct Export Contact */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2 border-t border-slate-100">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Your Name / Export Manager
          </label>
          <input
            type="text"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            placeholder="Full name"
            className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Direct Email
          </label>
          <input
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            placeholder="export@company.com"
            className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Phone / WhatsApp
          </label>
          <input
            type="text"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            placeholder="+39 / +34 ..."
            className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
      </div>

      {/* 6. Notes */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          Additional Details / Packaging Formats / Catalogue Link
        </label>
        <textarea
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Share pack sizes, shelf life, container loading, or paste a link to your product catalogue..."
          className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-xs text-red-700 font-medium">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3.5 px-6 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold text-sm shadow-sm transition cursor-pointer"
      >
        {submitting
          ? "Sending Response..."
          : "Submit Commercial Response to FoodXchange →"}
      </button>
    </form>
  );
}
