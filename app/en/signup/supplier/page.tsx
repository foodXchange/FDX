"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { WORLD_COUNTRIES } from "@/lib/constants/countries";

const CATEGORIES = [
  "Frozen foods",
  "Ambient / dry grocery",
  "Dairy & cheese",
  "Meat & poultry",
  "Bakery & pastry",
  "Beverages",
  "Snacks",
  "Fresh produce",
  "Organic & specialty",
  "Other",
];

function StepIndicator({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {[1, 2].map((n) => (
        <div key={n} className="flex items-center gap-2">
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
              n === step
                ? "bg-orange-500 text-white"
                : n < step
                ? "bg-green-500 text-white"
                : "bg-slate-700 text-slate-400"
            }`}
          >
            {n < step ? "✓" : n}
          </div>
          {n < 2 && <div className={`w-8 h-px ${step > 1 ? "bg-green-500" : "bg-slate-700"}`} />}
        </div>
      ))}
      <span className="ml-2 text-xs text-slate-500">Step {step} of 2</span>
    </div>
  );
}

type Step = 1 | 2 | "done";

export default function SupplierSignupPage() {
  const [step, setStep] = useState<Step>(1);
  const [companyName, setCompanyName] = useState("");
  const [category, setCategory] = useState("");
  const [country, setCountry] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          company_name: companyName,
          user_type: "supplier",
          category: category || undefined,
          country: country || undefined,
          phone: phone || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setStep("done");
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  if (step === "done") {
    return (
      <section className="px-6 py-20">
        <div className="max-w-sm mx-auto text-center">
          <h1 className="text-2xl font-bold text-white mb-3">Check your inbox</h1>
          <p className="text-slate-400 text-sm mb-1">We sent a sign-in link to</p>
          <p className="text-white font-medium text-sm mb-8">{email}</p>
          <div className="dark-card p-5 text-sm text-slate-300 text-left leading-relaxed mb-6">
            Your profile is in review. We&apos;ll be in touch within 24 hours. In the meantime, click the link to complete your listing.
          </div>
          <ResendButton email={email} userType="supplier" company={companyName} />
        </div>
      </section>
    );
  }

  if (step === 2) {
    return (
      <section className="px-6 py-16">
        <div className="max-w-sm mx-auto">
          <StepIndicator step={2} />
          <h1 className="text-xl font-bold text-white mb-1">Where should we reach you?</h1>
          <p className="text-sm text-slate-400 mb-8">
            We&apos;ll send buyer match alerts here.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1.5">
                Work email <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="dark-input"
                placeholder="you@company.com"
                autoFocus
              />
              <p className="mt-1.5 text-xs text-slate-500">Match alerts sent here. No newsletters.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1.5">
                Phone / WhatsApp
                <span className="ml-1.5 text-xs text-slate-500 font-normal">(optional)</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="dark-input"
                placeholder="+1 234 567 8900"
              />
              <p className="mt-1.5 text-xs text-slate-500">
                Many buyers prefer WhatsApp for first contact.
              </p>
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white px-5 py-3 rounded-md text-sm font-semibold transition mt-2"
            >
              {loading ? "Sending..." : "Show me buyer requests →"}
            </button>
          </form>

          <button
            onClick={() => setStep(1)}
            className="mt-5 text-xs text-slate-500 hover:text-slate-300 transition block mx-auto"
          >
            ← Back
          </button>
        </div>
      </section>
    );
  }

  // Step 1
  return (
    <section className="px-6 py-16">
      <div className="max-w-sm mx-auto">
        <StepIndicator step={1} />
        <h1 className="text-xl font-bold text-white mb-1">Tell us what you produce</h1>
        <p className="text-sm text-slate-400 mb-8">
          We&apos;ll match you with active buyer requests before we ask for anything else.
        </p>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1.5">
              Company name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="dark-input"
              placeholder="Your company name"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1.5">
              Main product category <span className="text-red-400">*</span>
            </label>
            <select
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="dark-input"
            >
              <option value="" disabled>Select category</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-slate-500">
              Pick your main category — you can add more later
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1.5">
              Where are you based? <span className="text-red-400">*</span>
            </label>
            <select
              required
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="dark-input"
            >
              <option value="" disabled>Select country</option>
              {WORLD_COUNTRIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-slate-500">
              Helps us match you with buyers looking in your region
            </p>
          </div>

          <button
            type="button"
            disabled={!companyName || !category || !country}
            onClick={() => setStep(2)}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-5 py-3 rounded-md text-sm font-semibold transition"
          >
            Continue →
          </button>

          <p className="text-center text-xs text-slate-500">
            No account needed yet
          </p>
        </div>

        <p className="mt-10 text-xs text-slate-500 text-center">
          Already on the platform?{" "}
          <Link href="/en/login" className="text-orange-400 hover:text-orange-300">
            Sign in
          </Link>
        </p>
      </div>
    </section>
  );
}

function ResendButton({
  email,
  userType,
  company,
}: {
  email: string;
  userType: "buyer" | "supplier";
  company: string;
}) {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function resend() {
    setLoading(true);
    try {
      await fetch("/api/auth/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, user_type: userType, company_name: company }),
      });
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  if (sent) return <p className="text-xs text-green-400">Sent. Check your inbox.</p>;
  return (
    <button
      onClick={resend}
      disabled={loading}
      className="text-xs text-slate-500 hover:text-slate-300 transition disabled:opacity-50"
    >
      {loading ? "Sending..." : "Resend email"}
    </button>
  );
}
