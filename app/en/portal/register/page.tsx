"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function FieldError({ msg }: { msg?: string | null }) {
  if (!msg) return null;
  return <p className="mt-1.5 text-xs text-red-400">{msg}</p>;
}

export default function PortalRegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, company },
        emailRedirectTo: `${window.location.origin}/en/portal/auth/callback`,
      },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (data.session) {
      router.push("/en/portal");
      router.refresh();
    } else {
      setCheckEmail(true);
    }
  }

  return (
    <section className="px-6 py-16">
      <div className="max-w-sm mx-auto">
        <h1 className="text-2xl font-bold text-white mb-2">Create your account</h1>
        <p className="text-sm text-slate-400 mb-8">
          Track your sourcing requests and matched suppliers in one place.
        </p>

        {checkEmail ? (
          <div className="dark-card p-5 text-sm text-slate-300">
            Check your email to confirm your account, then sign in.
          </div>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1.5">Name</label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="dark-input"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1.5">Company</label>
              <input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="dark-input"
                placeholder="Company name"
              />
            </div>
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
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="dark-input"
                placeholder="At least 6 characters"
              />
            </div>
            <FieldError msg={error} />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white px-5 py-2.5 rounded-md text-sm font-semibold transition"
            >
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>
        )}

        <p className="text-sm text-slate-400 mt-8 text-center">
          Already have an account?{" "}
          <Link href="/en/portal/login" className="text-orange-400 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </section>
  );
}
