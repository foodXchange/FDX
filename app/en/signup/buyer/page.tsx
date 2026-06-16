"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

function FieldError({ msg }: { msg?: string | null }) {
  if (!msg) return null;
  return <p className="mt-1.5 text-xs text-red-400">{msg}</p>;
}

export default function BuyerSignupPage() {
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (!agreed) {
      setError("Please accept the Terms of Service to continue");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          company_name: companyName,
          phone: phone || undefined,
          user_type: "buyer",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setDone(true);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <section className="px-6 py-20">
        <div className="max-w-sm mx-auto text-center">
          <div className="dark-card p-8">
            <div className="text-3xl mb-4">✓</div>
            <h2 className="text-xl font-bold text-white mb-3">Account created!</h2>
            <p className="text-sm text-slate-300 mb-6">
              Welcome to FoodXchange. Use the sign-in link below to access your buyer portal.
            </p>
            <Link
              href="/en/login"
              className="inline-block bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-md text-sm font-semibold transition"
            >
              Sign in →
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="px-6 py-16">
      <div className="max-w-sm mx-auto">
        <div className="mb-8">
          <p className="text-xs font-semibold text-orange-400 uppercase tracking-widest mb-1">Buyer signup</p>
          <h1 className="text-2xl font-bold text-white">Create your buyer account</h1>
          <p className="text-sm text-slate-400 mt-1">
            Submit sourcing requests and receive matched suppliers.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1.5">
              Company Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="dark-input"
              placeholder="Your company name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1.5">
              Email <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="dark-input"
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1.5">
              Phone / WhatsApp <span className="text-red-400">*</span>
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="dark-input"
              placeholder="+1 234 567 8900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1.5">
              Password <span className="text-red-400">*</span>
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="dark-input"
              placeholder="Min. 8 characters"
              minLength={8}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1.5">
              Confirm Password <span className="text-red-400">*</span>
            </label>
            <input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="dark-input"
              placeholder="Repeat password"
            />
          </div>

          <label className="flex items-start gap-3 cursor-pointer mt-2">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 accent-orange-500"
            />
            <span className="text-xs text-slate-400 leading-relaxed">
              I agree to the{" "}
              <a href="/en/terms" target="_blank" className="text-orange-400 hover:text-orange-300 underline">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="/en/privacy" target="_blank" className="text-orange-400 hover:text-orange-300 underline">
                Privacy Policy
              </a>
            </span>
          </label>

          <FieldError msg={error} />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white px-5 py-2.5 rounded-md text-sm font-semibold transition mt-2"
          >
            {loading ? "Creating account..." : "Create Account →"}
          </button>
        </form>

        <p className="mt-6 text-xs text-slate-500 text-center">
          Already have an account?{" "}
          <Link href="/en/login" className="text-orange-400 hover:text-orange-300">
            Sign in
          </Link>
        </p>
      </div>
    </section>
  );
}
