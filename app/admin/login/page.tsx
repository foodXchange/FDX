'use client';
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/ui/Footer";

const MAX_ATTEMPTS = 3;
const COOLDOWN_SECONDS = 30 * 60; // 30 minutes lockout
const LOCKOUT_KEY = "fdx_admin_login_lockout_until";
const ATTEMPTS_KEY = "fdx_admin_login_failed_attempts";

function formatCooldown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s < 10 ? "0" : ""}${s}s`;
}

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
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const redirectTarget = nextParam && nextParam.startsWith("/") ? nextParam : "/admin";

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCKOUT_KEY);
      const attempts = localStorage.getItem(ATTEMPTS_KEY);
      const ts = stored ? parseInt(stored, 10) : null;
      if (ts && ts > Date.now()) {
        setCooldownUntil(ts);
        const rem = Math.ceil((ts - Date.now()) / 1000);
        setCooldownRemaining(rem);
        setFailedAttempts(MAX_ATTEMPTS);
        setError(`Security lockout active (3 bad attempts). Please wait ${formatCooldown(rem)} before trying again.`);
      } else if (ts && ts <= Date.now()) {
        localStorage.removeItem(LOCKOUT_KEY);
        localStorage.removeItem(ATTEMPTS_KEY);
      } else if (attempts) {
        setFailedAttempts(parseInt(attempts, 10));
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!cooldownUntil) return;

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
      setCooldownRemaining(remaining);
      if (remaining <= 0) {
        setCooldownUntil(null);
        setFailedAttempts(0);
        setError("");
        try {
          localStorage.removeItem(LOCKOUT_KEY);
          localStorage.removeItem(ATTEMPTS_KEY);
        } catch {}
      } else {
        setError(`Security lockout active (3 bad attempts). Please wait ${formatCooldown(remaining)} before trying again.`);
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

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        setSuccess(true);
        try {
          localStorage.removeItem(LOCKOUT_KEY);
          localStorage.removeItem(ATTEMPTS_KEY);
        } catch {}
        router.push(redirectTarget);
        return;
      }

      const nextAttempts = failedAttempts + 1;
      setFailedAttempts(nextAttempts);

      if (nextAttempts >= MAX_ATTEMPTS) {
        const lockUntil = Date.now() + COOLDOWN_SECONDS * 1000;
        setCooldownUntil(lockUntil);
        setCooldownRemaining(COOLDOWN_SECONDS);
        setError(`Too many incorrect attempts. Account locked for 30 minutes (${formatCooldown(COOLDOWN_SECONDS)}).`);
        try {
          localStorage.setItem(LOCKOUT_KEY, String(lockUntil));
          localStorage.setItem(ATTEMPTS_KEY, String(MAX_ATTEMPTS));
        } catch {}
      } else {
        const remaining = MAX_ATTEMPTS - nextAttempts;
        setError(`Incorrect password. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining before 30-minute lockout.`);
        try {
          localStorage.setItem(ATTEMPTS_KEY, String(nextAttempts));
        } catch {}
      }
    } catch {
      setError("An unexpected network error occurred. Please try again.");
    } finally {
      setLoading(false);
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
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>

            <h1 className="text-xl font-bold text-white text-center mb-1">Admin Portal</h1>
            <p className="text-xs text-slate-400 text-center mb-6">
              Restricted access. Enter your admin password to continue.
            </p>

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
                    placeholder="Enter admin password"
                    autoFocus
                    autoComplete="current-password"
                    disabled={inCooldown}
                    className="w-full border border-slate-700 bg-slate-800/80 text-white placeholder-slate-400 px-4 py-3.5 pr-11 rounded-xl text-base outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-xs text-center">
                  {error}
                  {inCooldown && ` (${cooldownRemaining}s)`}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || success || !password || inCooldown}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-semibold text-sm transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
              >
                {(loading || success) && <Spinner />}
                {success ? "Entering dashboard…" : loading ? "Verifying…" : inCooldown ? `Locked (${cooldownRemaining}s)` : "Sign In →"}
              </button>
            </form>
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
