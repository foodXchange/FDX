"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const VOLUMES = [
  "Not sure yet",
  "Less than 1 pallet",
  "1–5 pallets / month",
  "Container quantities (20ft+)",
  "Multiple containers / month",
];

const TIMELINES = ["ASAP", "Within 1 month", "1–3 months", "Just exploring"];

const BUYER_WORDS = [
  "buy", "import", "need", "source", "looking for", "find", "require",
  "purchase", "retail", "distributor", "importer", "supermarket", "want to order",
  "we need", "i need", "supplier", "finding",
];
const SUPPLIER_WORDS = [
  "sell", "export", "manufacture", "offer", "produce", "supply", "factory",
  "manufacturer", "producer", "we make", "we produce", "we export", "we sell",
  "our products", "we offer", "exporter",
];

function detectIntent(text: string): "buyer" | "supplier" | "unclear" {
  const lower = text.toLowerCase();
  const b = BUYER_WORDS.filter((w) => lower.includes(w)).length;
  const s = SUPPLIER_WORDS.filter((w) => lower.includes(w)).length;
  if (b > s) return "buyer";
  if (s > b) return "supplier";
  return "unclear";
}

const DEST = {
  buyer: "/en/buyers",
  supplier: "/en/suppliers/register",
} as const;

type Screen = "main" | "transition" | "fallback";

export default function StartPage() {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>("main");
  const [text, setText] = useState("");
  const [volume, setVolume] = useState("");
  const [timeline, setTimeline] = useState("");
  const [resolvedDest, setResolvedDest] = useState<string>("");

  function handleSubmit() {
    const intent = detectIntent(text);
    if (intent === "unclear") {
      setScreen("fallback");
    } else {
      setResolvedDest(DEST[intent]);
      setScreen("transition");
    }
  }

  function chooseFallback(dest: string) {
    setResolvedDest(dest);
    setScreen("transition");
  }

  // ── TRANSITION SCREEN ─────────────────────────────────────────────────────
  if (screen === "transition") {
    return (
      <section className="px-6 py-24">
        <div className="max-w-md mx-auto">
          <button
            onClick={() => setScreen("main")}
            className="text-xs text-slate-500 hover:text-slate-300 transition mb-10 block"
          >
            ← Back
          </button>

          <h1 className="text-2xl font-bold text-white mb-3">Got it.</h1>
          <p className="text-slate-400 text-sm mb-8">
            We&apos;re reviewing your request now.
          </p>

          <ul className="space-y-3 mb-10">
            {[
              "We'll match you with relevant suppliers",
              "You'll get a clear next step within 24h",
            ].map((line) => (
              <li key={line} className="flex items-start gap-3">
                <span className="text-orange-500 font-bold mt-0.5 shrink-0">→</span>
                <span className="text-sm text-slate-300 leading-relaxed">{line}</span>
              </li>
            ))}
          </ul>

          <button
            onClick={() => router.push(resolvedDest)}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-md text-sm font-semibold transition"
          >
            Continue →
          </button>
        </div>
      </section>
    );
  }

  // ── FALLBACK SCREEN ────────────────────────────────────────────────────────
  if (screen === "fallback") {
    return (
      <section className="px-6 py-24">
        <div className="max-w-md mx-auto">
          <button
            onClick={() => setScreen("main")}
            className="text-xs text-slate-500 hover:text-slate-300 transition mb-10 block"
          >
            ← Back
          </button>

          <h1 className="text-2xl font-bold text-white mb-2">Quick check</h1>
          <p className="text-slate-400 text-sm mb-10">
            Which of these describes you?
          </p>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => chooseFallback(DEST.buyer)}
              className="w-full flex items-start gap-4 rounded-2xl border border-slate-700 hover:border-orange-500/50 bg-slate-800/50 hover:bg-slate-800 p-5 text-left transition-all group"
            >
              <span className="text-2xl shrink-0 mt-0.5">🛒</span>
              <div>
                <p className="text-sm font-semibold text-white group-hover:text-orange-400 transition">
                  I need suppliers
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  I&apos;m sourcing food products for the Israeli market
                </p>
              </div>
            </button>

            <button
              onClick={() => chooseFallback(DEST.supplier)}
              className="w-full flex items-start gap-4 rounded-2xl border border-slate-700 hover:border-orange-500/50 bg-slate-800/50 hover:bg-slate-800 p-5 text-left transition-all group"
            >
              <span className="text-2xl shrink-0 mt-0.5">🏭</span>
              <div>
                <p className="text-sm font-semibold text-white group-hover:text-orange-400 transition">
                  I want to sell
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  I manufacture or export food products
                </p>
              </div>
            </button>
          </div>
        </div>
      </section>
    );
  }

  // ── MAIN SCREEN ────────────────────────────────────────────────────────────
  return (
    <section className="px-6 py-20">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-white mb-2">
          What are you looking for?
        </h1>
        <p className="text-slate-400 text-sm mb-8">
          Write it in your own words — we&apos;ll take it from there.
        </p>

        <div className="space-y-5">
          <div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              placeholder="Frozen vegetables for retail, private label, 2–3 containers/month"
              className="w-full bg-slate-800 border border-slate-700 focus:border-orange-500/50 focus:outline-none focus:ring-1 focus:ring-orange-500/30 rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-slate-500 resize-none transition"
              autoFocus
            />
            <p className="mt-2 text-xs text-slate-500">
              You can be rough. We&apos;ll refine it together.
            </p>
          </div>

          {/* Optional fields */}
          <div>
            <p className="text-xs font-medium text-slate-400 mb-3 uppercase tracking-wider">
              Optional — helps us match faster
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1.5">
                  Estimated volume
                </label>
                <select
                  value={volume}
                  onChange={(e) => setVolume(e.target.value)}
                  className="w-full bg-slate-800/60 border border-slate-700 focus:border-slate-600 focus:outline-none rounded-lg px-3 py-2 text-sm text-slate-300 transition"
                >
                  <option value="">Not sure</option>
                  {VOLUMES.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1.5">
                  Timeline
                </label>
                <select
                  value={timeline}
                  onChange={(e) => setTimeline(e.target.value)}
                  className="w-full bg-slate-800/60 border border-slate-700 focus:border-slate-600 focus:outline-none rounded-lg px-3 py-2 text-sm text-slate-300 transition"
                >
                  <option value="">Not sure</option>
                  {TIMELINES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div>
            <button
              type="button"
              disabled={!text.trim()}
              onClick={handleSubmit}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-6 py-3 rounded-md text-sm font-semibold transition"
            >
              Get matched →
            </button>
            <p className="text-center text-xs text-slate-500 mt-2">
              Takes 30–60 seconds. No obligation.
            </p>
          </div>
        </div>

        <p className="mt-10 text-center text-xs text-slate-500">
          Already on the platform?{" "}
          <Link href="/en/login" className="text-orange-400 hover:text-orange-300">
            Sign in →
          </Link>
        </p>
      </div>
    </section>
  );
}
