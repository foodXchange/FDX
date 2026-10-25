"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

function formatBatchDate(date: Date | string): string {
  const d = new Date(date);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${day}.${month}.${year}`;
}

interface LogLine {
  type: string;
  message: string;
  timestamp: string;
}

interface ScraperSummary {
  succeeded: number;
  failed: number;
  skipped: number;
  totalProducts: number;
}

interface ProgressState {
  current: number;
  total: number;
  succeeded: number;
  failed: number;
  products: number;
  searchGrounding: number;
}

export interface BatchOption {
  batchId: string;
  filename: string;
  rowsTotal: number;
  pendingCount?: number;
  failedCount?: number;
  uploadedAt: string | null;
}

interface ScraperConsoleProps {
  supplierId?: string;
  totalPending?: number;
  totalFailed?: number;
  totalAll?: number;
  defaultBatchId?: string;
  batchOptions?: BatchOption[];
}

const LOG_COLORS: Record<string, string> = {
  start: "text-blue-400",
  supplier: "text-white font-semibold",
  success: "text-green-400",
  error: "text-red-400",
  warning: "text-yellow-400",
  log: "text-slate-400",
  summary: "text-orange-400",
};

const LIMIT_OPTIONS: (number | "all")[] = [10, 50, 100, 200, 500, "all"];

type StatusFilter = "pending" | "failed";

export function ScraperConsole({
  supplierId,
  defaultBatchId,
  batchOptions,
}: ScraperConsoleProps) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [summary, setSummary] = useState<ScraperSummary | null>(null);
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [limit, setLimit] = useState<number | "all">("all");
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("pending");
  const [batchId, setBatchId] = useState(defaultBatchId ?? "");
  const eventSourceRef = useRef<EventSource | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logs.length > 0) {
      logEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  useEffect(() => {
    return () => {
      eventSourceRef.current?.close();
    };
  }, []);

  useEffect(() => {
    const readHashParams = () => {
      if (typeof window === "undefined") return;
      const hash = window.location.hash;
      if (!hash || hash === "#") return;

      const params = new URLSearchParams(hash.slice(1));
      const batchValue = params.get("batchId");
      const statusValue = params.get("status");

      if (batchValue !== null) setBatchId(batchValue);
      if (statusValue === "failed") setFilterStatus("failed");
      else if (statusValue === "pending") setFilterStatus("pending");
    };

    readHashParams();
    window.addEventListener("hashchange", readHashParams);
    return () => window.removeEventListener("hashchange", readHashParams);
  }, []);

  // Autonomous Queue State
  type MetricTab = "all" | "done" | "ok" | "skipped" | "failed" | "products";
  const [queueRunning, setQueueRunning] = useState(false);
  const [showQueueHelp, setShowQueueHelp] = useState(false);
  const [activeStatusTab, setActiveStatusTab] = useState<MetricTab>("all");
  const guideBoxRef = useRef<HTMLDivElement>(null);

  const openStatusGuide = (tab: MetricTab) => {
    setActiveStatusTab(tab);
    setShowQueueHelp(true);
    setTimeout(() => {
      guideBoxRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 60);
  };

  const [queueState, setQueueState] = useState<{
    currentSupplier: string | null;
    currentBatch: string | null;
    processedCount: number;
    totalPending: number;
    successCount: number;
    failedCount: number;
    skippedCount: number;
    productsFound: number;
    lastMessage: string | null;
  } | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function checkQueue() {
      try {
        const res = await fetch("/api/admin/scraper/queue");
        if (!res.ok) return;
        const data = await res.json();
        if (isMounted && data.ok && data.state) {
          setQueueRunning(data.state.isRunning);
          setQueueState(data.state);
        }
      } catch {}
    }

    checkQueue();
    const interval = setInterval(checkQueue, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  async function toggleQueue() {
    try {
      const nextAction = queueRunning ? "stop" : "start";
      const res = await fetch("/api/admin/scraper/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: nextAction }),
      });
      const data = await res.json();
      if (data.ok && data.state) {
        setQueueRunning(data.state.isRunning);
        setQueueState(data.state);
      }
    } catch (e) {
      console.error("Failed to toggle queue:", e);
    }
  }

  useEffect(() => {
    if (batchOptions && batchOptions.length > 0 && !defaultBatchId) {
      const hash = typeof window !== "undefined" ? window.location.hash : "";
      if (!hash || !new URLSearchParams(hash.slice(1)).get("batchId")) {
        const firstWithPending =
          batchOptions.find((b) => (b.pendingCount ?? 0) > 0) ?? batchOptions[0];
        setBatchId(firstWithPending.batchId);
      }
    }
  }, [batchOptions, defaultBatchId]);

  function startScraping() {
    setRunning(true);
    setLogs([]);
    setSummary(null);
    setProgress(null);

    const params = new URLSearchParams();
    const trimmedBatch = batchId.trim();

    if (supplierId) {
      params.set("supplierId", supplierId);
    } else {
      if (trimmedBatch) {
        params.set("batchId", trimmedBatch);
      }
      if (limit !== "all") {
        params.set("limit", String(limit));
      }
      // Strictly Pending or Failed only — never re-scrape already scraped rows
      params.set("status", filterStatus);
    }

    const url = `/api/admin/scraper/stream?${params.toString()}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onmessage = (event: MessageEvent<string>) => {
      const data = JSON.parse(event.data) as {
        type: string;
        message?: string;
        data?: {
          products?: number;
          succeeded?: number;
          failed?: number;
          skipped?: number;
          totalProducts?: number;
        };
      };

      if (data.type === "done") {
        es.close();
        setRunning(false);
        router.refresh();
        return;
      }

      if (data.type === "summary" && data.data) {
        setSummary(data.data as ScraperSummary);
      }

      if (data.type === "supplier" && data.message) {
        const match = data.message.match(/\[(\d+)\/(\d+)\]/);
        if (match) {
          const current = parseInt(match[1], 10);
          const total = parseInt(match[2], 10);
          setProgress((prev) => ({
            current,
            total,
            succeeded: prev?.succeeded ?? 0,
            failed: prev?.failed ?? 0,
            products: prev?.products ?? 0,
            searchGrounding: prev?.searchGrounding ?? 0,
          }));
        }
      }

      if (data.type === "success") {
        const products = data.data?.products ?? 0;
        setProgress((prev) =>
          prev
            ? {
                ...prev,
                succeeded: prev.succeeded + 1,
                products: prev.products + products,
              }
            : null
        );
      }

      if (data.type === "error" && data.message?.trimStart().startsWith("✗")) {
        setProgress((prev) =>
          prev ? { ...prev, failed: prev.failed + 1 } : null
        );
      }

      if (
        data.type === "log" &&
        (data.message?.includes("Google Search Grounding") ||
          data.message?.includes("Perplexity research"))
      ) {
        setProgress((prev) =>
          prev ? { ...prev, searchGrounding: prev.searchGrounding + 1 } : null
        );
      }

      if (data.message) {
        setLogs((prev) => [
          ...prev,
          {
            type: data.type,
            message: data.message!,
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    };

    es.onerror = () => {
      es.close();
      setRunning(false);
      setLogs((prev) => [
        ...prev,
        {
          type: "error",
          message: "Connection closed",
          timestamp: new Date().toISOString(),
        },
      ]);
      router.refresh();
    };
  }

  function stopScraping() {
    eventSourceRef.current?.close();
    setRunning(false);
    setLogs((prev) => [
      ...prev,
      {
        type: "log",
        message: "⏹ Scraping stopped by user",
        timestamp: new Date().toISOString(),
      },
    ]);
    router.refresh();
  }

  function handleCopyLog() {
    const text = logs
      .map((l) => `[${new Date(l.timestamp).toLocaleTimeString()}] ${l.message}`)
      .join("\n");
    navigator.clipboard.writeText(text);
  }

  function handleDownloadLog() {
    const text = logs
      .map((l) => `[${new Date(l.timestamp).toLocaleTimeString()}] ${l.message}`)
      .join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `scrape-${new Date()
      .toISOString()
      .slice(0, 16)
      .replace("T", "-")
      .replace(":", "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const isSingleSupplier = Boolean(supplierId);
  const etaMinutes =
    progress && progress.total > progress.current
      ? Math.ceil(((progress.total - progress.current) * 35) / 60)
      : 0;

  return (
    <div id="scraper-console" className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            {isSingleSupplier ? "Single Supplier Scraper" : "Scraper Console"}
          </h2>
          <span
            className="text-xs text-slate-400 cursor-help border border-slate-200 rounded-full w-4 h-4 inline-flex items-center justify-center"
            title="Scrapes ONLY Pending or Failed records (never re-scrapes already-scraped suppliers). Uses Direct Crawl (Firecrawl/Jina) with automatic fallback to Gemini 3.5 Flash Google Search Grounding."
          >
            ?
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {!isSingleSupplier && (
            <button
              onClick={toggleQueue}
              disabled={running}
              title="Runs continuously in the background across all pending batches even if you close the browser tab"
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg shadow-2xs transition-all flex items-center gap-1.5 ${
                queueRunning
                  ? "bg-emerald-600 text-white hover:bg-emerald-700 animate-pulse"
                  : "bg-slate-900 text-white hover:bg-slate-800"
              }`}
            >
              {queueRunning ? "⚡ Stop Auto-Queue" : "⚡ Auto-Queue (Pending)"}
            </button>
          )}

          {running ? (
            <button
              onClick={stopScraping}
              className="px-3 py-1.5 bg-red-500 text-white text-xs font-semibold rounded-lg hover:bg-red-600 transition"
            >
              ⏹ Stop Stream
            </button>
          ) : (
            <button
              onClick={startScraping}
              disabled={queueRunning}
              title="Run live stream in browser for the selected batch & status filter"
              className="px-3.5 py-1.5 bg-orange-500 text-white text-xs font-semibold rounded-lg hover:bg-orange-600 transition disabled:opacity-50"
            >
              ▶ {isSingleSupplier ? "Re-scrape Now" : `Run ${filterStatus === "failed" ? "Failed" : "Pending"}`}
            </button>
          )}
        </div>
      </div>

      {/* Controls Bar */}
      {!isSingleSupplier && (
        <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
          {/* Batch selector */}
          {batchOptions && batchOptions.length > 0 ? (
            <select
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              disabled={running}
              title="Select a specific CSV batch or all batches"
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 font-medium max-w-64 truncate"
            >
              <option value="">All Batches (Global)</option>
              {batchOptions.map((opt) => (
                <option key={opt.batchId} value={opt.batchId}>
                  {opt.filename}
                  {opt.uploadedAt ? ` (${formatBatchDate(opt.uploadedAt)})` : ""} —{" "}
                  {opt.pendingCount ?? 0} pending / {opt.failedCount ?? 0} failed
                </option>
              ))}
            </select>
          ) : null}

          {/* Strictly Pending vs Failed Toggle */}
          <div
            className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5"
            title="Only Pending or Failed records are eligible — Scraped records are protected from re-scraping"
          >
            <button
              type="button"
              onClick={() => setFilterStatus("pending")}
              disabled={running}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                filterStatus === "pending"
                  ? "bg-orange-500 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              Pending Only
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus("failed")}
              disabled={running}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                filterStatus === "failed"
                  ? "bg-red-600 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              Failed Only
            </button>
          </div>

          {/* Batch size limit */}
          <div
            className="flex items-center gap-1 ml-auto"
            title="Maximum number of suppliers to process in this run"
          >
            <span className="text-[11px] text-slate-400 mr-0.5">Limit:</span>
            {LIMIT_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setLimit(n)}
                disabled={running}
                className={`px-2 py-1 text-[11px] font-medium rounded-md border transition disabled:opacity-50 ${
                  limit === n
                    ? "bg-slate-800 text-white border-slate-800"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {n === "all" ? "All" : n}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Autonomous Background Queue Active Banner */}
      {queueRunning && queueState && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs text-emerald-900 shadow-2xs">
          <div className="flex items-center justify-between font-semibold mb-2 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
              <span>Autonomous Queue Active (Pending Only)</span>
              <button
                type="button"
                onClick={() => setShowQueueHelp(!showQueueHelp)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-100 hover:bg-emerald-200 text-emerald-800 transition-colors cursor-pointer border border-emerald-300/60"
              >
                <span>ℹ️</span>
                <span>{showQueueHelp ? "Hide guide" : "What do these mean?"}</span>
              </button>
            </div>
            <span className="font-mono bg-emerald-100 px-2.5 py-0.5 rounded text-emerald-800 font-bold">
              {queueState.totalPending} pending left
            </span>
          </div>

          {/* Interactive Guide Box & Status Drill-Down */}
          {showQueueHelp && (
            <div
              ref={guideBoxRef}
              className="mb-2.5 p-3.5 bg-white/98 rounded-xl border border-emerald-300 text-[11px] text-slate-700 space-y-2.5 shadow-md animate-fade-in"
            >
              {/* Header & Tabs */}
              <div className="flex items-center justify-between gap-2 border-b border-emerald-100 pb-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-emerald-950 text-xs">
                    Queue Status Explorer & Root Causes:
                  </span>
                  <span className="text-[10px] text-slate-400">
                    (Click any tab to see why status occurred)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowQueueHelp(false)}
                  className="text-slate-400 hover:text-slate-700 text-xs px-1.5 py-0.5 rounded hover:bg-slate-100 cursor-pointer"
                  title="Close explanation"
                >
                  ✕ Close
                </button>
              </div>

              {/* Status Tab Pills */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveStatusTab("all")}
                  className={`px-2.5 py-1 rounded-md text-[10.5px] font-bold transition cursor-pointer ${
                    activeStatusTab === "all"
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  All (Summary)
                </button>

                <button
                  type="button"
                  onClick={() => setActiveStatusTab("failed")}
                  className={`px-2.5 py-1 rounded-md text-[10.5px] font-bold transition cursor-pointer flex items-center gap-1 ${
                    activeStatusTab === "failed"
                      ? "bg-red-600 text-white shadow-xs"
                      : "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                  }`}
                >
                  <span>🔴 Failed ({queueState.failedCount})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveStatusTab("ok")}
                  className={`px-2.5 py-1 rounded-md text-[10.5px] font-bold transition cursor-pointer flex items-center gap-1 ${
                    activeStatusTab === "ok"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
                  }`}
                >
                  <span>🟢 OK ({queueState.successCount})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveStatusTab("skipped")}
                  className={`px-2.5 py-1 rounded-md text-[10.5px] font-bold transition cursor-pointer flex items-center gap-1 ${
                    activeStatusTab === "skipped"
                      ? "bg-amber-600 text-white shadow-xs"
                      : "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
                  }`}
                >
                  <span>🟡 Skipped ({queueState.skippedCount})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveStatusTab("products")}
                  className={`px-2.5 py-1 rounded-md text-[10.5px] font-bold transition cursor-pointer flex items-center gap-1 ${
                    activeStatusTab === "products"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100"
                  }`}
                >
                  <span>📦 Products ({queueState.productsFound})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveStatusTab("done")}
                  className={`px-2.5 py-1 rounded-md text-[10.5px] font-bold transition cursor-pointer ${
                    activeStatusTab === "done"
                      ? "bg-slate-700 text-white shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  ⚪ Done ({queueState.processedCount})
                </button>
              </div>

              {/* Dynamic Drill-Down Content */}
              {activeStatusTab === "failed" && (
                <div className="p-3 bg-red-50/70 rounded-lg border border-red-200 space-y-2">
                  <div className="font-bold text-red-900 text-xs flex items-center gap-1.5">
                    <span>❌ Why Did These Websites Fail?</span>
                  </div>
                  <p className="text-[11px] text-red-800 leading-relaxed">
                    A supplier is marked <strong>Failed</strong> when our web crawlers cannot extract content from their domain. The 4 root causes are:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-[10.5px] text-red-900">
                    <li><strong>Dead / Expired Domain:</strong> The company domain no longer resolves (DNS ENOTFOUND) or points to a registrar parking page.</li>
                    <li><strong>WAF Anti-Bot Challenge:</strong> Cloudflare 403, Incapsula, or Datadome actively blocking automated HTTP scraping requests.</li>
                    <li><strong>Gateway Timeout (&gt;15s):</strong> The factory web server is down or extremely slow to respond.</li>
                    <li><strong>Bot Protection / Captcha:</strong> JavaScript-only splash pages that block standard headless fetching.</li>
                  </ul>
                  <div className="flex items-center gap-2 pt-1 border-t border-red-200/60">
                    <button
                      type="button"
                      onClick={() => {
                        setFilterStatus("failed");
                        setShowQueueHelp(false);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-red-600 text-white font-bold text-[10.5px] hover:bg-red-700 transition cursor-pointer"
                    >
                      <span>↻ Switch Console to &quot;Failed Only&quot; to Retry</span>
                    </button>
                    <a
                      href="#status=failed"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white text-red-700 border border-red-300 font-semibold text-[10.5px] hover:bg-red-50 transition"
                    >
                      <span>📋 Filter Table for Failed Rows</span>
                    </a>
                  </div>
                </div>
              )}

              {activeStatusTab === "ok" && (
                <div className="p-3 bg-emerald-50/70 rounded-lg border border-emerald-200 space-y-2">
                  <div className="font-bold text-emerald-950 text-xs flex items-center gap-1.5">
                    <span>✅ What Does OK Mean?</span>
                  </div>
                  <p className="text-[11px] text-emerald-900 leading-relaxed">
                    <strong>OK</strong> indicates a verified Food &amp; Beverage factory. The crawler successfully reached their domain, confirmed genuine food production, and cataloged discrete retail/foodservice items.
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-[10.5px] text-emerald-900">
                    <li>Factory identity confirmed (IFS/BRC food standards detected).</li>
                    <li>Product catalog scraped and vector-embedded via Voyage AI (<code className="font-mono text-[10px]">voyage-3</code>).</li>
                    <li>Images saved to permanent Supabase CDN storage.</li>
                  </ul>
                  <div className="pt-1 border-t border-emerald-200/60">
                    <Link
                      href="/admin/products"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 text-white font-bold text-[10.5px] hover:bg-emerald-700 transition"
                    >
                      <span>📦 Open Product Catalog (/admin/products) →</span>
                    </Link>
                  </div>
                </div>
              )}

              {activeStatusTab === "skipped" && (
                <div className="p-3 bg-amber-50/70 rounded-lg border border-amber-200 space-y-2">
                  <div className="font-bold text-amber-950 text-xs flex items-center gap-1.5">
                    <span>🟡 Why Were These Suppliers Skipped?</span>
                  </div>
                  <p className="text-[11px] text-amber-900 leading-relaxed">
                    Trade show exhibitor lists (e.g. Alimentaria, Anuga, SIAL) contain many non-food companies:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-[10.5px] text-amber-900">
                    <li><strong>Packaging &amp; Glass:</strong> e.g. glass bottles, cardboard, labeling machinery (like Cerve glass division).</li>
                    <li><strong>Machinery &amp; Equipment:</strong> e.g. commercial ovens, refrigeration, POS receipt printers (like Epson, Irinox).</li>
                    <li><strong>Services &amp; Government:</strong> e.g. insurance brokers (Mapfre), logistics, regional trade pavilions.</li>
                  </ul>
                  <p className="text-[10.5px] text-amber-800">
                    💡 Our AI classifier automatically tags them as <code className="font-mono text-[10px]">skipped</code> so your food buyer catalog remains 100% pure food products!
                  </p>
                </div>
              )}

              {activeStatusTab === "products" && (
                <div className="p-3 bg-blue-50/70 rounded-lg border border-blue-200 space-y-2">
                  <div className="font-bold text-blue-950 text-xs flex items-center gap-1.5">
                    <span>📦 Extracted Products Breakdown</span>
                  </div>
                  <p className="text-[11px] text-blue-900 leading-relaxed">
                    Total discrete food and beverage SKUs parsed from scraped European factory catalogs:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-[10.5px] text-blue-900">
                    <li>Each product includes title, description, package weight, and format.</li>
                    <li>85%+ assigned to deep taxonomy (Pasta, Olive Oil, Bakery, Dairy, Frozen, etc.).</li>
                    <li>93%+ vector-embedded to power natural language semantic buyer searches.</li>
                  </ul>
                  <div className="pt-1 border-t border-blue-200/60">
                    <Link
                      href="/admin/products"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-600 text-white font-bold text-[10.5px] hover:bg-blue-700 transition"
                    >
                      <span>View All Products in Catalog →</span>
                    </Link>
                  </div>
                </div>
              )}

              {activeStatusTab === "done" && (
                <div className="p-3 bg-slate-100 rounded-lg border border-slate-200 space-y-1.5">
                  <div className="font-bold text-slate-900 text-xs">
                    ⚪ Done: Session Evaluation Progress
                  </div>
                  <p className="text-[11px] text-slate-700 leading-relaxed">
                    <strong>Done ({queueState.processedCount})</strong> represents the total suppliers evaluated in this background run. It is calculated as:
                  </p>
                  <div className="p-2 rounded bg-white font-mono text-[11px] text-slate-800 border border-slate-200">
                    Done ({queueState.processedCount}) = OK ({queueState.successCount}) + Skipped ({queueState.skippedCount}) + Failed ({queueState.failedCount})
                  </div>
                </div>
              )}

              {activeStatusTab === "all" && (
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-[10.5px]">
                  <li>
                    <button
                      type="button"
                      onClick={() => setActiveStatusTab("done")}
                      className="text-left hover:underline cursor-pointer"
                    >
                      <strong className="text-slate-900">Done:</strong> Total suppliers evaluated in this run (OK + Skipped + Failed).
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => setActiveStatusTab("ok")}
                      className="text-left hover:underline cursor-pointer"
                    >
                      <strong className="text-green-800">OK:</strong> Verified food/beverage producers with catalog products extracted.
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => setActiveStatusTab("skipped")}
                      className="text-left hover:underline cursor-pointer"
                    >
                      <strong className="text-amber-800">Skipped:</strong> Non-food entities (packaging, machinery, POS printers, insurance) filtered by AI.
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => setActiveStatusTab("failed")}
                      className="text-left hover:underline cursor-pointer"
                    >
                      <strong className="text-red-700">Failed:</strong> Inaccessible websites (DNS expired, network timeout, or bot-block).
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => setActiveStatusTab("products")}
                      className="text-left hover:underline cursor-pointer"
                    >
                      <strong className="text-blue-800">Products:</strong> Total new food catalog items extracted &amp; vector embedded.
                    </button>
                  </li>
                  <li>
                    <strong className="text-slate-900">Pending Left:</strong> Remaining suppliers waiting in the queue.
                  </li>
                </ul>
              )}
            </div>
          )}

          {/* Interactive Metric Pills Strip (Clickable!) */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] font-medium text-emerald-800 bg-white/95 px-3 py-2 rounded-lg border border-emerald-200">
            {/* Now */}
            <div className="relative group/tip cursor-help">
              <span className="text-slate-500">Now:</span>{" "}
              <span className="font-bold text-slate-800 underline decoration-dotted decoration-slate-300">
                {queueState.currentSupplier || "Next..."}
              </span>
              <div className="pointer-events-none absolute bottom-full left-0 mb-1.5 hidden group-hover/tip:flex flex-col items-start z-50 w-52 p-2 bg-slate-900 text-white text-[11px] rounded-lg shadow-xl leading-snug">
                <span>Supplier currently being crawled and analyzed right now.</span>
              </div>
            </div>

            {/* Batch */}
            <div className="relative group/tip cursor-help">
              <span className="text-slate-500">Batch:</span>{" "}
              <span className="font-mono font-medium text-slate-700 underline decoration-dotted decoration-slate-300">
                {queueState.currentBatch || "All"}
              </span>
              <div className="pointer-events-none absolute bottom-full left-0 mb-1.5 hidden group-hover/tip:flex flex-col items-start z-50 w-52 p-2 bg-slate-900 text-white text-[11px] rounded-lg shadow-xl leading-snug">
                <span>The originating CSV import batch this supplier belongs to.</span>
              </div>
            </div>

            {/* Done (CLICKABLE) */}
            <button
              type="button"
              onClick={() => openStatusGuide("done")}
              title="Click to view explanation of Done count"
              className="relative group/tip cursor-pointer hover:bg-emerald-100/80 rounded px-1.5 py-0.5 transition text-left"
            >
              <span className="text-slate-500">Done:</span>{" "}
              <span className="font-bold text-slate-900 underline decoration-dotted decoration-slate-400">
                {queueState.processedCount}
              </span>
              <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/tip:flex flex-col items-center z-50 w-56 p-2 bg-slate-900 text-white text-[11px] rounded-lg shadow-xl leading-snug text-center">
                <span>Click to view why Done is incremented (OK + Skipped + Failed).</span>
              </div>
            </button>

            {/* OK (CLICKABLE) */}
            <button
              type="button"
              onClick={() => openStatusGuide("ok")}
              title="Click to view explanation of OK verified food factories"
              className="relative group/tip cursor-pointer hover:bg-green-100/80 rounded px-1.5 py-0.5 transition text-left"
            >
              <span className="text-slate-500">OK:</span>{" "}
              <span className="text-green-700 font-bold underline decoration-dotted decoration-green-400">
                {queueState.successCount}
              </span>
              <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/tip:flex flex-col items-center z-50 w-60 p-2 bg-slate-900 text-white text-[11px] rounded-lg shadow-xl leading-snug text-center">
                <span>Click to see what OK means (verified Food &amp; Beverage producers).</span>
              </div>
            </button>

            {/* Skipped (CLICKABLE) */}
            {queueState.skippedCount > 0 && (
              <button
                type="button"
                onClick={() => openStatusGuide("skipped")}
                title="Click to view why non-food exhibitors were skipped"
                className="relative group/tip cursor-pointer hover:bg-amber-100/80 rounded px-1.5 py-0.5 transition text-left"
              >
                <span className="text-slate-500">Skipped:</span>{" "}
                <span className="text-amber-700 font-bold underline decoration-dotted decoration-amber-400">
                  {queueState.skippedCount}
                </span>
                <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/tip:flex flex-col items-center z-50 w-64 p-2 bg-slate-900 text-white text-[11px] rounded-lg shadow-xl leading-snug text-center">
                  <span>Click to view why non-food entities (machinery, POS printers) were skipped.</span>
                </div>
              </button>
            )}

            {/* Failed (CLICKABLE) */}
            {queueState.failedCount > 0 && (
              <button
                type="button"
                onClick={() => openStatusGuide("failed")}
                title="Click to view why websites failed (DNS, timeout, bot-block) and retry"
                className="relative group/tip cursor-pointer hover:bg-red-100/80 rounded px-1.5 py-0.5 transition text-left"
              >
                <span className="text-slate-500">Failed:</span>{" "}
                <span className="text-red-600 font-bold underline decoration-dotted decoration-red-400">
                  {queueState.failedCount}
                </span>
                <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/tip:flex flex-col items-center z-50 w-56 p-2 bg-slate-900 text-white text-[11px] rounded-lg shadow-xl leading-snug text-center">
                  <span>Click to see why websites failed and how to retry them.</span>
                </div>
              </button>
            )}

            {/* Products (CLICKABLE) */}
            <button
              type="button"
              onClick={() => openStatusGuide("products")}
              title="Click to view product catalog breakdown"
              className="relative group/tip cursor-pointer hover:bg-blue-100/80 rounded px-1.5 py-0.5 transition text-left"
            >
              <span className="text-slate-500">Products:</span>{" "}
              <span className="text-blue-700 font-bold underline decoration-dotted decoration-blue-400">
                {queueState.productsFound}
              </span>
              <div className="pointer-events-none absolute bottom-full right-0 mb-1.5 hidden group-hover/tip:flex flex-col items-end z-50 w-60 p-2 bg-slate-900 text-white text-[11px] rounded-lg shadow-xl leading-snug text-center">
                <span>Click to view how products are extracted &amp; vector-embedded.</span>
              </div>
            </button>
          </div>

          {queueState.lastMessage && (
            <div
              className="mt-1.5 text-[10px] text-emerald-700 font-mono truncate px-1 cursor-default"
              title={queueState.lastMessage}
            >
              ↳ {queueState.lastMessage}
            </div>
          )}
        </div>
      )}

      {/* Progress bar */}
      {running && progress !== null && (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
          <div className="flex justify-between text-xs font-semibold text-slate-700">
            <span>
              Processing {progress.current} / {progress.total}
            </span>
            <span>{etaMinutes > 0 ? `~${etaMinutes}m left` : "Finishing…"}</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-1.5">
            <div
              className="bg-orange-500 h-1.5 rounded-full transition-all duration-500"
              style={{
                width: `${Math.round(
                  (progress.current / Math.max(progress.total, 1)) * 100
                )}%`,
              }}
            />
          </div>
          <div className="flex gap-3 text-[11px] text-slate-500 flex-wrap">
            <span>✓ {progress.succeeded} scraped</span>
            <span>✗ {progress.failed} failed</span>
            <span>📦 {progress.products} products</span>
            {progress.searchGrounding > 0 && (
              <span title="Fetched via Gemini 3.5 Flash with Google Search Grounding when direct website crawl was blocked">
                🔍 {progress.searchGrounding} via Search Grounding
              </span>
            )}
          </div>
        </div>
      )}

      {/* Live Terminal Log */}
      <div
        className={`bg-slate-900 rounded-xl p-3 font-mono text-xs h-56 overflow-y-auto transition-all ${
          summary ? "ring-2 ring-green-500" : ""
        }`}
      >
        {logs.length === 0 && !running ? (
          <p className="text-slate-500 text-center mt-16 text-xs">
            Select a batch or click{" "}
            <span className="text-slate-300 font-semibold">
              ▶ Run {filterStatus === "failed" ? "Failed" : "Pending"}
            </span>{" "}
            to view live stream output.
          </p>
        ) : (
          <>
            {logs.map((line, i) => (
              <div key={i} className="flex gap-2 py-0.5 leading-relaxed">
                <span className="text-slate-600 text-[11px] shrink-0">
                  {new Date(line.timestamp).toLocaleTimeString()}
                </span>
                <span className={LOG_COLORS[line.type] ?? "text-slate-400"}>
                  {line.message}
                </span>
              </div>
            ))}

            {running && (
              <div className="flex items-center gap-2 py-0.5 mt-1">
                <span className="inline-block h-2 w-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-green-400">Running...</span>
              </div>
            )}

            {summary && (
              <div className="mt-3 p-2.5 bg-slate-800 rounded-lg text-orange-400 text-xs">
                <p className="font-semibold">
                  Summary: ✓ {summary.succeeded} Scraped · ✗ {summary.failed} Failed · ⊘{" "}
                  {summary.skipped} Skipped · 📦 {summary.totalProducts} Products
                </p>
              </div>
            )}
          </>
        )}
        <div ref={logEndRef} />
      </div>

      {/* Log actions */}
      {logs.length > 0 && (
        <div className="flex gap-2 justify-end">
          <button
            onClick={handleCopyLog}
            className="px-2.5 py-1 text-[11px] border border-slate-200 text-slate-600 rounded-md hover:bg-slate-50 transition"
          >
            Copy Log
          </button>
          <button
            onClick={handleDownloadLog}
            className="px-2.5 py-1 text-[11px] border border-slate-200 text-slate-600 rounded-md hover:bg-slate-50 transition"
          >
            Download Log
          </button>
        </div>
      )}
    </div>
  );
}
