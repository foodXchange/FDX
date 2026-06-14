"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function FieldError({ msg }: { msg?: string | null }) {
  if (!msg) return null;
  return <p className="mt-1.5 text-xs text-red-400">{msg}</p>;
}

export default function PortalLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [magicMode, setMagicMode] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePasswordLogin(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/en/portal");
    router.refresh();
  }

  async function handleMagicLink(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/en/portal/auth/callback` },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setMagicSent(true);
  }

  return (
    <section className="px-6 py-16">
      <div className="max-w-sm mx-auto">
        <h1 className="text-2xl font-bold text-white mb-2">Sign in</h1>
        <p className="text-sm text-slate-400 mb-8">
          Access your sourcing requests and matched suppliers.
        </p>

        {magicSent ? (
          <div className="dark-card p-5 text-sm text-slate-300">
            Check your email — we sent you a link to sign in.
          </div>
        ) : magicMode ? (
          <form onSubmit={handleMagicLink} className="space-y-4">
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
            <button
              type="button"
              onClick={() => {
                setMagicMode(false);
                setError(null);
              }}
              className="w-full text-xs text-slate-400 hover:text-white transition"
            >
              ← Back to password sign-in
            </button>
          </form>
        ) : (
          <form onSubmit={handlePasswordLogin} className="space-y-4">
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
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1.5">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="dark-input"
                placeholder="••••••••"
              />
            </div>
            <FieldError msg={error} />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white px-5 py-2.5 rounded-md text-sm font-semibold transition"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
            <button
              type="button"
              onClick={() => {
                setMagicMode(true);
                setError(null);
              }}
              className="w-full text-xs text-orange-400 hover:underline"
            >
              Send me a magic link instead
            </button>
          </form>
        )}

        <p className="text-sm text-slate-400 mt-8 text-center">
          Don&apos;t have an account?{" "}
          <Link href="/en/portal/register" className="text-orange-400 hover:underline">
            Register
          </Link>
        </p>
      </div>
    </section>
  );
}
