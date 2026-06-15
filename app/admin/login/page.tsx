'use client';
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/ui/Footer";

const MAX_ATTEMPTS = 3;
const COOLDOWN_SECONDS = 30;

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.243 4.243L9.88 9.88" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 animate-spin">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function AdminLoginContent() {
  const searchParams = useSearchParams();
  const linkError = searchParams.get("error") === "invalid_link";

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  const [forgotOpen, setForgotOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSending, setResetSending] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const [magicEmail, setMagicEmail] = useState("");
  const [magicSending, setMagicSending] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [magicError, setMagicError] = useState("");

  const router = useRouter();

  useEffect(() => {
    if (!cooldownUntil) return;

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
      setCooldownRemaining(remaining);
      if (remaining <= 0) {
        setCooldownUntil(null);
        setFailedAttempts(0);
        setError("");
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [cooldownUntil]);

  const inCooldown = cooldownUntil !== null && cooldownRemaining > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password || loading || success || inCooldown) return;

    setLoading(true);
    setError("");

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      setSuccess(true);
      router.push("/admin/portfolio");
      return;
    }

    const nextAttempts = failedAttempts + 1;
    setFailedAttempts(nextAttempts);

    if (nextAttempts >= MAX_ATTEMPTS) {
      setCooldownUntil(Date.now() + COOLDOWN_SECONDS * 1000);
      setCooldownRemaining(COOLDOWN_SECONDS);
      setError(`Too many incorrect attempts. Please wait ${COOLDOWN_SECONDS} seconds before trying again.`);
    } else {
      const remaining = MAX_ATTEMPTS - nextAttempts;
      setError(`Incorrect password. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining before a temporary lockout.`);
    }

    setLoading(false);
  }

  async function handleForgotPassword() {
    setResetSending(true);
    try {
      await fetch("/api/admin/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail }),
      });
    } catch {
      // best-effort — always show confirmation to avoid leaking auth state
    } finally {
      setResetSending(false);
      setResetSent(true);
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!magicEmail || magicSending) return;

    setMagicSending(true);
    setMagicError("");

    try {
      const res = await fetch("/api/admin/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: magicEmail }),
      });
      if (!res.ok) {
        setMagicError("Something went wrong. Please try again.");
        return;
      }
      setMagicSent(true);
    } catch {
      setMagicError("Something went wrong. Please try again.");
    } finally {
      setMagicSending(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      <Header />

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition mb-4"
          >
            ← Back to home
          </Link>

          <div className="bg-slate-900 border border-white/10 rounded-2xl p-8 shadow-2xl">
            <h1 className="text-lg font-semibold text-white text-center mb-1">Admin sign in</h1>
            <p className="text-sm text-slate-400 text-center mb-6">
              Enter the admin password to access the dashboard.
            </p>

            {linkError && (
              <p className="text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-sm text-center mb-4">
                This sign-in link is invalid or has expired. Please request a new one.
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="admin-password" className="sr-only">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="admin-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    autoFocus
                    autoComplete="current-password"
                    disabled={inCooldown}
                    className="w-full border border-gray-200 bg-white px-4 py-3.5 pr-11 rounded-xl text-base outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-sm text-center">
                  {error}
                  {inCooldown && ` (${cooldownRemaining}s)`}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || success || !password || inCooldown}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-semibold text-sm transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {(loading || success) && <Spinner />}
                {success ? "Redirecting…" : loading ? "Checking…" : inCooldown ? `Locked (${cooldownRemaining}s)` : "Enter →"}
              </button>
            </form>

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setForgotOpen((v) => !v)}
                className="text-xs text-slate-400 hover:text-orange-400 transition"
              >
                Forgot password?
              </button>
            </div>

            {forgotOpen && (
              <div className="mt-4 pt-4 border-t border-white/10">
                {resetSent ? (
                  <p className="text-sm text-green-300 text-center">
                    If an admin account exists, a password reminder has been sent.
                  </p>
                ) : (
                  <>
                    <label htmlFor="reset-email" className="block text-xs font-medium text-slate-300 mb-1.5">
                      Your email
                    </label>
                    <input
                      id="reset-email"
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full border border-gray-200 bg-white px-4 py-2.5 rounded-xl text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 mb-3"
                    />
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      disabled={resetSending}
                      className="w-full bg-white/5 hover:bg-white/10 text-slate-200 py-2.5 rounded-xl font-medium text-sm transition disabled:opacity-60"
                    >
                      {resetSending ? "Sending…" : "Send password reminder"}
                    </button>
                  </>
                )}
              </div>
            )}

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-xs text-slate-500">or</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <div>
              <h2 className="text-sm font-semibold text-white text-center mb-1">Admin magic link</h2>
              <p className="text-xs text-slate-400 text-center mb-4">
                Enter your admin email to receive a sign-in link.
              </p>

              {magicSent ? (
                <div className="text-center">
                  <p className="text-sm text-green-300 mb-1">Check your email ✓</p>
                  <p className="text-xs text-slate-400">
                    We sent a sign-in link to {magicEmail}. Click the link in the email to access the
                    admin dashboard. The link expires in 1 hour.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleMagicLink} className="space-y-3">
                  <label htmlFor="admin-magic-email" className="sr-only">
                    Admin email
                  </label>
                  <input
                    id="admin-magic-email"
                    type="email"
                    value={magicEmail}
                    onChange={(e) => setMagicEmail(e.target.value)}
                    placeholder="you@fdx.trading"
                    autoComplete="email"
                    className="w-full border border-gray-200 bg-white px-4 py-2.5 rounded-xl text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  />

                  {magicError && (
                    <p className="text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-xs text-center">
                      {magicError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={magicSending || !magicEmail}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-semibold text-sm transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {magicSending && <Spinner />}
                    {magicSending ? "Sending…" : "Send magic link →"}
                  </button>
                </form>
              )}

              <p className="text-xs text-slate-500 text-center mt-3">
                Only authorized admin emails can sign in this way.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <AdminLoginContent />
    </Suspense>
  );
}
