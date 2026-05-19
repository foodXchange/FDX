"use client";

import { useState } from "react";

export default function NewsletterForm({ lang = "en" }: { lang?: string }) {
  const [email, setEmail] = useState("");
  const [type, setType] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!email) return;

    try {
      // 👉 Replace with your API later
      console.log("Newsletter signup:", { email, type });

      setSubmitted(true);
      setEmail("");
      setType("");
    } catch (err) {
      console.error(err);
    }
  }

  if (submitted) {
    return (
      <div className="text-center py-6">
        <p className="text-green-600 font-semibold">
          ✅ Thanks — you’re in.
        </p>
        <p className="text-sm text-slate-500 mt-2">
          You’ll receive real sourcing insights soon.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 text-left">

      {/* ✅ HEADLINE */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900">
          Get Real Sourcing Insights (No Noise)
        </h3>

        <p className="text-sm text-slate-600 mt-1">
          Practical updates from the Israeli market — suppliers, opportunities, and real signals.
        </p>
      </div>

      {/* ✅ EMAIL */}
      <input
        type="email"
        required
        placeholder="Your business email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full border border-slate-300 px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
      />

      {/* ✅ SEGMENTATION */}
      <select
        value={type}
        onChange={(e) => setType(e.target.value)}
        className="w-full border border-slate-300 px-4 py-2 rounded-md focus:outline-none"
      >
        <option value="">What best describes you?</option>
        <option value="buyer">Buyer / Retailer</option>
        <option value="supplier">Manufacturer / Supplier</option>
        <option value="other">Other</option>
      </select>

      {/* ✅ CTA */}
      <button
        type="submit"
        className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-md font-semibold transition"
      >
        Send me insights →
      </button>

      {/* ✅ TRUST */}
      <p className="text-xs text-slate-500">
        1–2 emails per month. Only practical insights. Unsubscribe anytime.
      </p>

      {/* ✅ AUTHORITY POSITIONING */}
      <p className="text-xs text-slate-400">
        Written by an active sourcing operator — not a marketing team.
      </p>
    </form>
  );
}
