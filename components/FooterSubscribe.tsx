"use client";

import { useState } from "react";

type Status = "idle" | "loading" | "success" | "error";

export default function FooterSubscribe({ lang = "en" }: { lang?: string }) {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [msg, setMsg] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) return;

    // ✅ Legal: require consent
    if (!consent) {
      setStatus("error");
      setMsg("Please confirm consent");
      return;
    }

    setStatus("loading");
    setMsg("");

    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: cleanEmail,
          lang,
          source: "footer",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error || "Failed");
      }

      setStatus("success");
      setMsg("✅ Subscribed successfully!");
      setEmail("");
      setConsent(false);

    } catch (err) {
      console.error("Newsletter error:", err);
      setStatus("error");
      setMsg("Something went wrong. Please try again.");
    } finally {
      setTimeout(() => {
        setStatus("idle");
        setMsg("");
      }, 5000);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">

      {/* ✅ Email input */}
      <input
        type="email"
        required
        placeholder="Email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full px-3 py-3 rounded-md bg-slate-800 text-white text-sm border border-slate-700 
        focus:outline-none focus:ring-2 focus:ring-orange-400"
      />

      {/* ✅ Consent checkbox (LEGAL MUST) */}
      <label className="flex items-start gap-2 text-xs text-slate-400 leading-snug">
        <input
          type="checkbox"
          checked={consent}
          onChange={() => setConsent(!consent)}
          className="mt-0.5"
          required
        />
        <span>
          I agree to receive updates from FOODZXCHANGE. I can unsubscribe at any time.
        </span>
      </label>

      {/* ✅ Submit button */}
      <button
        type="submit"
        disabled={status === "loading"}
        className="btn-primary px-4 py-3 w-full text-sm 
        disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {status === "loading" ? "..." : "Subscribe"}
      </button>

      {/* ✅ Message */}
      {msg && (
        <p
          className={`text-xs ${
            status === "success" ? "text-green-400" : "text-red-400"
          }`}
        >
          {msg}
        </p>
      )}

      {/* ✅ Trust line */}
      <p className="text-xs text-slate-500">
        No spam. 1–2 updates per month.
      </p>

    </form>
  );
}