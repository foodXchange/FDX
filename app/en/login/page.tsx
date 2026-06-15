"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function FieldError({ msg }: { msg?: string | null }) {
  if (!msg) return null;
  return <p className="mt-1.5 text-xs text-red-400">{msg}</p>;
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/en/auth/callback` },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  return (
    <section className="px-6 py-16">
      <div className="max-w-sm mx-auto">
        <h1 className="text-2xl font-bold text-white mb-2">Sign in</h1>
        <p className="text-sm text-slate-400 mb-8">
          Enter your email and we&apos;ll send you a magic link to sign in — works for both
          buyers and suppliers.
        </p>

        {sent ? (
          <div className="dark-card p-5 text-sm text-slate-300">
            Check your email — we sent you a link to sign in.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="dark-input"
                placeholder="you@company.com"
              />
            </div>
            <FieldError msg={error} />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white px-5 py-2.5 rounded-md text-sm font-semibold transition"
            >
              {loading ? "Sending..." : "Send magic link"}
            </button>
          </form>
        )}

        <p className="mt-6 text-xs text-slate-500 leading-relaxed">
          By signing in you agree to our{" "}
          <a href="/en/terms" target="_blank" className="text-orange-400 hover:text-orange-300 underline">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="/en/privacy" target="_blank" className="text-orange-400 hover:text-orange-300 underline">
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </section>
  );
}
