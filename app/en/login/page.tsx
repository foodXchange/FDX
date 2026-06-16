"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
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
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/en/auth/callback`,
      },
    });
    setLoading(false);
    if (error) {
      setError("Something went wrong. Try again or contact us at info@foodz-x.com");
      return;
    }
    setSent(true);
  }

  return (
    <section className="px-6 py-20">
      <div className="max-w-sm mx-auto">
        {sent ? (
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-3">Check your inbox</h1>
            <p className="text-slate-400 text-sm mb-1">We sent a sign-in link to</p>
            <p className="text-white font-medium text-sm mb-8">{email}</p>
            <div className="dark-card p-5 text-sm text-slate-300 text-left leading-relaxed">
              Click the link in your email to sign in. It works for 60 minutes.
            </div>
            <button
              onClick={() => setSent(false)}
              className="mt-6 text-xs text-slate-500 hover:text-slate-300 transition"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <>
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

              <FieldError msg={error} />

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white px-5 py-2.5 rounded-md text-sm font-semibold transition"
              >
                {loading ? "Sending..." : "Send sign-in link →"}
              </button>
            </form>

            <p className="mt-6 text-xs text-slate-500 leading-relaxed">
              Works every time. No password to remember.
            </p>

            <p className="mt-8 text-xs text-slate-500 text-center">
              New here?{" "}
              <Link href="/en/start" className="text-orange-400 hover:text-orange-300">
                Get matched →
              </Link>
            </p>
          </>
        )}
      </div>
    </section>
  );
}
