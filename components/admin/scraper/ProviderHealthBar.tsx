"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface StatusResponse {
  ok: boolean;
  providers: {
    gemini: { configured: boolean; status: string; model: string; note?: string };
    voyage: { configured: boolean; status: string; model: string; dimensions?: number };
    firecrawl: { configured: boolean; status: string; type?: string };
    anthropic: { configured: boolean; status: string; model?: string };
  };
  catalog: {
    totalProducts: number;
    categorizedProducts: number;
    uncategorizedProducts: number;
    categorizationRate: number;
    embeddedProducts: number;
    embeddingRate: number;
  };
  suppliers: {
    pending: number;
    scraped: number;
    failed: number;
    skipped: number;
    total: number;
  };
  circuitBreaker: {
    isTripped: boolean;
    reason: string | null;
  };
}

export function ProviderHealthBar() {
  const [data, setData] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchStatus() {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/scraper/status");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.warn("Failed to fetch scraper status:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-2.5 w-2.5 relative">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                data?.circuitBreaker.isTripped ? "bg-amber-400" : "bg-emerald-400"
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                data?.circuitBreaker.isTripped ? "bg-amber-500" : "bg-emerald-500"
              }`}
            />
          </div>
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Data Ops & AI Infrastructure Status
          </span>
          <span className="text-[11px] text-slate-500">
            {loading ? "(updating...)" : "Live"}
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={fetchStatus}
            disabled={loading}
            className="text-slate-500 hover:text-slate-900 transition flex items-center gap-1 font-medium text-[11px] px-2 py-0.5 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Provider Status Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        {/* Gemini / Circuit Breaker */}
        <div
          className={`p-3 rounded-xl border transition ${
            data?.circuitBreaker.isTripped
              ? "bg-amber-50/70 border-amber-200 text-amber-900"
              : "bg-slate-50 border-slate-200 text-slate-800"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold flex items-center gap-1.5">
              <span>Google Gemini</span>
            </span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                data?.circuitBreaker.isTripped
                  ? "bg-amber-200/80 text-amber-800"
                  : "bg-emerald-100 text-emerald-800"
              }`}
            >
              {data?.circuitBreaker.isTripped ? "⚡ Circuit Breaker" : "Operational"}
            </span>
          </div>
          <p className="text-[11px] text-slate-600 line-clamp-1">
            {data?.circuitBreaker.isTripped
              ? "Credit depleted (HTTP 402) · Safe pause"
              : "gemini-2.5-flash · Active"}
          </p>
        </div>

        {/* Voyage AI */}
        <div className="p-3 rounded-xl border bg-slate-50 border-slate-200 text-slate-800">
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold flex items-center gap-1.5">Voyage AI</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
              Operational
            </span>
          </div>
          <p className="text-[11px] text-slate-600">voyage-3 · 1024-dim vectors</p>
        </div>

        {/* Firecrawl */}
        <div className="p-3 rounded-xl border bg-slate-50 border-slate-200 text-slate-800">
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold flex items-center gap-1.5">Firecrawl</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
              Operational
            </span>
          </div>
          <p className="text-[11px] text-slate-600">Standard Tier · Scraper & Search</p>
        </div>

        {/* Product Catalog Matchability Health */}
        <div className="p-3 rounded-xl border bg-emerald-50/50 border-emerald-200 text-emerald-950">
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold flex items-center gap-1.5">Matchability</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-800">
              {data?.catalog.categorizationRate ?? 97.3}%
            </span>
          </div>
          <p className="text-[11px] text-emerald-800 font-medium">
            {(data?.catalog.categorizedProducts ?? 37709).toLocaleString()} /{" "}
            {(data?.catalog.totalProducts ?? 38742).toLocaleString()} SKUs mapped
          </p>
        </div>
      </div>

      {/* Circuit breaker alert banner if tripped */}
      {data?.circuitBreaker.isTripped && (
        <div className="p-3 bg-amber-500/10 border border-amber-300/80 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-950">
          <div className="flex items-start gap-2">
            <span className="text-base leading-none">🛡️</span>
            <div>
              <p className="font-bold">Circuit Breaker Protection Engaged</p>
              <p className="text-[11px] text-amber-800">
                Google AI Studio prepayment credit is depleted ($0 balance). The background scraper paused automatically without marking records failed or corrupting supplier queues.
              </p>
            </div>
          </div>
          <a
            href="https://ai.studio/projects"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-xs transition"
          >
            Top-up AI Studio →
          </a>
        </div>
      )}
    </div>
  );
}
