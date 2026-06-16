"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

const CATEGORIES = [
  "Frozen foods",
  "Ambient grocery",
  "Dairy & cheese",
  "Meat & poultry",
  "Bakery & confectionery",
  "Beverages",
  "Snacks",
  "Private label production",
  "Organic & specialty",
  "Other",
];

const VOLUMES = [
  "Container quantities (20ft+)",
  "Pallet quantities",
  "Trial / sample first",
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

export default function BuyerSignupPage() {
  const [step, setStep] = useState<Step>(1);
  const [category, setCategory] = useState("");
  const [volume, setVolume] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
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
          company_name: company || email.split("@")[0],
          user_type: "buyer",
          category: category || undefined,
          volume: volume || undefined,
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
            Click the link to access your sourcing dashboard. Your first request is already queued.
          </div>
          <ResendButton email={email} userType="buyer" company={company} />
        </div>
      </section>
    );
  }

  if (step === 2) {
    return (
      <section className="px-6 py-16">
        <div className="max-w-sm mx-auto">
          <StepIndicator step={2} />
          <h1 className="text-xl font-bold text-white mb-1">Where should we send matches?</h1>
          <p className="text-sm text-slate-400 mb-8">
            We&apos;ll look for suppliers in{" "}
            <span className="text-slate-200">{category || "your category"}</span> and send results here.
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
              <p className="mt-1.5 text-xs text-slate-500">No newsletters. Only match alerts.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1.5">
                Company
                <span className="ml-1.5 text-xs text-slate-500 font-normal">(optional for now)</span>
              </label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="dark-input"
                placeholder="Your company name"
              />
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white px-5 py-3 rounded-md text-sm font-semibold transition mt-2"
            >
              {loading ? "Sending..." : "Send me matches →"}
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
        <h1 className="text-xl font-bold text-white mb-1">What are you sourcing?</h1>
        <p className="text-sm text-slate-400 mb-8">
          This helps us find the right suppliers before we ask for anything else.
        </p>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1.5">
              Product category <span className="text-red-400">*</span>
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
              Typical order volume
            </label>
            <div className="flex flex-col gap-2">
              {VOLUMES.map((v) => (
                <label
                  key={v}
                  className={`flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer transition-colors ${
                    volume === v
                      ? "border-orange-500 bg-orange-500/10 text-white"
                      : "border-slate-700 text-slate-300 hover:border-slate-500"
                  }`}
                >
                  <input
                    type="radio"
                    name="volume"
                    value={v}
                    checked={volume === v}
                    onChange={() => setVolume(v)}
                    className="accent-orange-500"
                  />
                  <span className="text-sm">{v}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            type="button"
            disabled={!category}
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
