"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface TelemetryStatusPayload {
  ok: boolean;
  catalog?: {
    totalProducts: number;
    categorizedProducts: number;
    categorizationRate: number;
    embeddedProducts: number;
    embeddingRate: number;
    withImagesProducts?: number;
    imageRate?: number;
    withStorageTempProducts?: number;
    tempRate?: number;
  };
  suppliers?: {
    pending: number;
    scraped: number;
    failed: number;
    skipped: number;
    total: number;
    withEmail?: number;
    emailRate?: number;
    withLogo?: number;
    logoRate?: number;
  };
}

interface QueueState {
  isRunning: boolean;
  currentSupplier: string | null;
  processedCount: number;
  totalPending: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  productsFound: number;
  lastMessage: string | null;
}

export function CatalogTelemetryWidget() {
  const [status, setStatus] = useState<TelemetryStatusPayload | null>(null);
  const [queue, setQueue] = useState<QueueState | null>(null);
  const [toggling, setToggling] = useState(false);

  const fetchTelemetry = useCallback(async () => {
    try {
      const [stRes, qRes] = await Promise.all([
        fetch("/api/admin/scraper/status"),
        fetch("/api/admin/scraper/queue"),
      ]);
      if (stRes.ok) {
        const stJson = await stRes.json();
        setStatus(stJson);
      }
      if (qRes.ok) {
        const qJson = await qRes.json();
        if (qJson?.state) setQueue(qJson.state);
      }
    } catch {
      // silent fallback
    }
  }, []);

  useEffect(() => {
    fetchTelemetry();
    const id = setInterval(fetchTelemetry, 8000);
    return () => clearInterval(id);
  }, [fetchTelemetry]);

  async function toggleQueue(action: "start" | "stop") {
    setToggling(true);
    try {
      const res = await fetch("/api/admin/scraper/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (json?.state) setQueue(json.state);
      await fetchTelemetry();
    } catch {
      // ignore
    } finally {
      setToggling(false);
    }
  }

  const cat = status?.catalog;
  const sup = status?.suppliers;
  const isRunning = queue?.isRunning ?? false;
  const pendingCount = queue?.totalPending ?? sup?.pending ?? 0;

  return (
    <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5">
      {/* Top Header + Autonomous Scraper Live Telemetry Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-base font-bold text-slate-900">
              📊 Catalog Completeness &amp; Autonomous Scraper Telemetry
            </h2>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                isRunning
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : pendingCount > 0
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-slate-100 text-slate-700 border-slate-200"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isRunning ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                }`}
              />
              {isRunning
                ? `Autonomous Queue Active · ${pendingCount.toLocaleString()} Pending`
                : pendingCount > 0
                  ? `Queue Paused · ${pendingCount.toLocaleString()} Pending`
                  : "All Pending Suppliers Processed"}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {isRunning && queue?.currentSupplier
              ? `Currently extracting: ${queue.currentSupplier} (${queue.productsFound.toLocaleString()} new products saved this session)`
              : "Live 6-pillar data quality scorecard across your B2B supplier directory and product catalog."}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {pendingCount > 0 && (
            <button
              type="button"
              disabled={toggling}
              onClick={() => toggleQueue(isRunning ? "stop" : "start")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer disabled:opacity-50 ${
                isRunning
                  ? "bg-red-50 hover:bg-red-100 text-red-700 border border-red-200"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }`}
            >
              {toggling
                ? "Updating…"
                : isRunning
                  ? "⏸ Pause Autonomous Queue"
                  : `▶ Resume Queue (${pendingCount})`}
            </button>
          )}
          <Link
            href="/admin/scraper"
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-2xs"
          >
            🕷️ Open Scraper Command →
          </Link>
          <Link
            href="/admin/data-quality"
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
          >
            🏷️ Data Quality Audit
          </Link>
        </div>
      </div>

      {/* 6-Pillar Completeness Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* 1. Canonical Taxonomy */}
        <div className="rounded-2xl border border-slate-200/90 bg-slate-50/50 p-3.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            1. Taxonomy Mapped
          </div>
          <div className="text-xl font-black text-slate-900 mt-1">
            {cat ? `${cat.categorizationRate}%` : "—"}
          </div>
          <div className="w-full h-1.5 bg-slate-200 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${Math.min(100, cat?.categorizationRate ?? 0)}%` }}
            />
          </div>
          <div className="text-[11px] text-slate-500 mt-1.5">
            {cat ? `${cat.categorizedProducts.toLocaleString()} SKUs` : "Loading…"}
          </div>
        </div>

        {/* 2. Vector Embeddings */}
        <div className="rounded-2xl border border-slate-200/90 bg-slate-50/50 p-3.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            2. AI Vector Indexed
          </div>
          <div className="text-xl font-black text-slate-900 mt-1">
            {cat ? `${cat.embeddingRate}%` : "—"}
          </div>
          <div className="w-full h-1.5 bg-slate-200 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all"
              style={{ width: `${Math.min(100, cat?.embeddingRate ?? 0)}%` }}
            />
          </div>
          <div className="text-[11px] text-slate-500 mt-1.5">
            {cat ? `${cat.embeddedProducts.toLocaleString()} vectors` : "Loading…"}
          </div>
        </div>

        {/* 3. Verified Supplier Logos */}
        <div className="rounded-2xl border border-slate-200/90 bg-slate-50/50 p-3.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            3. Brand Logos
          </div>
          <div className="text-xl font-black text-slate-900 mt-1">
            {sup?.logoRate !== undefined ? `${sup.logoRate}%` : "—"}
          </div>
          <div className="w-full h-1.5 bg-slate-200 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-orange-500 rounded-full transition-all"
              style={{ width: `${Math.min(100, sup?.logoRate ?? 0)}%` }}
            />
          </div>
          <div className="text-[11px] text-slate-500 mt-1.5">
            {sup?.withLogo !== undefined
              ? `${sup.withLogo.toLocaleString()} / ${sup.scraped.toLocaleString()} factories`
              : "Loading…"}
          </div>
        </div>

        {/* 4. Direct Contact Emails */}
        <div className="rounded-2xl border border-slate-200/90 bg-slate-50/50 p-3.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            4. Direct B2B Emails
          </div>
          <div className="text-xl font-black text-slate-900 mt-1">
            {sup?.emailRate !== undefined ? `${sup.emailRate}%` : "—"}
          </div>
          <div className="w-full h-1.5 bg-slate-200 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${Math.min(100, sup?.emailRate ?? 0)}%` }}
            />
          </div>
          <div className="text-[11px] text-slate-500 mt-1.5">
            {sup?.withEmail !== undefined
              ? `${sup.withEmail.toLocaleString()} verified emails`
              : "Loading…"}
          </div>
        </div>

        {/* 5. Rehosted Product Photos */}
        <div className="rounded-2xl border border-slate-200/90 bg-slate-50/50 p-3.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            5. Product Photos
          </div>
          <div className="text-xl font-black text-slate-900 mt-1">
            {cat?.imageRate !== undefined ? `${cat.imageRate}%` : "—"}
          </div>
          <div className="w-full h-1.5 bg-slate-200 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all"
              style={{ width: `${Math.min(100, cat?.imageRate ?? 0)}%` }}
            />
          </div>
          <div className="text-[11px] text-slate-500 mt-1.5">
            {cat?.withImagesProducts !== undefined
              ? `${cat.withImagesProducts.toLocaleString()} hosted photos`
              : "Loading…"}
          </div>
        </div>

        {/* 6. Storage Temp & Specs */}
        <div className="rounded-2xl border border-slate-200/90 bg-slate-50/50 p-3.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            6. Temp &amp; Dietary Specs
          </div>
          <div className="text-xl font-black text-slate-900 mt-1">
            {cat?.tempRate !== undefined ? `${cat.tempRate}%` : "—"}
          </div>
          <div className="w-full h-1.5 bg-slate-200 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-teal-500 rounded-full transition-all"
              style={{ width: `${Math.min(100, cat?.tempRate ?? 0)}%` }}
            />
          </div>
          <div className="text-[11px] text-slate-500 mt-1.5">
            {cat?.withStorageTempProducts !== undefined
              ? `${cat.withStorageTempProducts.toLocaleString()} normalized`
              : "Loading…"}
          </div>
        </div>
      </div>
    </section>
  );
}
