"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  // Count down the resend cooldown
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function sendMagicLink(emailAddress: string) {
    const res = await fetch("/api/auth/magic-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailAddress }),
    });
    const data = await res.json() as { ok?: boolean; error?: string };
    if (!res.ok) {
      throw new Error(data.error ?? "Something went wrong");
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await sendMagicLink(email);
      setSent(true);
      setCooldown(60);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0 || resending) return;
    setResending(true);
    try {
      await sendMagicLink(email);
      setCooldown(60);
    } catch {
      // silently fail — user can retry
    } finally {
      setResending(false);
    }
  }

  if (sent) {
    return (
      <section className="px-6 py-20">
        <div className="max-w-sm mx-auto text-center">
          <h1 className="text-2xl font-bold text-white mb-3">Check your email</h1>
          <p className="text-slate-400 text-sm mb-1">We sent a sign-in link to</p>
          <p className="text-white font-medium text-sm mb-8">{email}</p>

          <div className="dark-card p-5 text-sm text-slate-300 text-left leading-relaxed mb-2">
            Click the link in your email to sign in. It works for 1 hour.
          </div>
          <p className="text-xs text-slate-500 mb-2">
            Check your spam folder if it doesn&apos;t arrive.
          </p>
          <p className="text-xs text-slate-500 mb-8">
            If you&apos;re new, your account will be created automatically.
          </p>

          {/* Resend with cooldown */}
          <button
            onClick={handleResend}
            disabled={cooldown > 0 || resending}
            className="text-sm text-orange-400 hover:text-orange-300 disabled:text-slate-600 disabled:cursor-not-allowed transition mb-8"
          >
            {resending
              ? "Sending..."
              : cooldown > 0
              ? `Resend in ${cooldown}s`
              : "Resend link"}
          </button>

          {/* Drive to intent */}
          <div className="border-t border-slate-800 pt-8">
            <p className="text-xs text-slate-400 mb-4">Want to move faster?</p>
            <Link
              href="/en/start"
              className="block w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white px-5 py-3 rounded-md text-sm font-semibold transition text-center"
            >
              Tell us what you need →
            </Link>
          </div>

          <button
            onClick={() => { setSent(false); setCooldown(0); }}
            className="mt-6 text-xs text-slate-500 hover:text-slate-300 transition"
          >
            Use a different email
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="px-6 py-20">
      <div className="max-w-sm mx-auto">
        <h1 className="text-2xl font-bold text-white mb-2">Sign in</h1>
        <p className="text-sm text-slate-400 mb-8">
          We&apos;ll email you a one-click link. No password needed.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1.5">
              Work email
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
          </div>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white px-5 py-2.5 rounded-md text-sm font-semibold transition"
          >
            {loading ? "Sending..." : "Send sign-in link →"}
          </button>
        </form>

        <p className="mt-4 text-xs text-slate-500">
          Works every time. No password to remember.
        </p>

        <p className="mt-8 text-xs text-slate-500 text-center">
          New here?{" "}
          <Link href="/en/start" className="text-orange-400 hover:text-orange-300">
            Get matched →
          </Link>
        </p>
      </div>
    </section>
  );
}
