"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

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
  const [queueRunning, setQueueRunning] = useState(false);
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
          <div className="flex items-center justify-between font-semibold mb-1.5">
            <span
              className="flex items-center gap-2 cursor-help"
              title="Autonomous background crawler continuously processes pending suppliers using Firecrawl, Gemini 2.5 Flash, and Voyage AI."
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              Autonomous Queue Active (Pending Only)
            </span>
            <span
              className="font-mono bg-emerald-100 px-2 py-0.5 rounded text-emerald-800 cursor-help"
              title="Total pending suppliers waiting to be analyzed across all batches."
            >
              {queueState.totalPending} pending left
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-[11px] font-medium text-emerald-800 bg-white/90 px-3 py-2 rounded-lg border border-emerald-200">
            <div title="Current supplier being crawled or verified right now">
              <span className="text-slate-500">Now:</span>{" "}
              <span className="font-bold text-slate-800">{queueState.currentSupplier || "Next..."}</span>
            </div>
            <div title="The CSV import batch this supplier originated from">
              <span className="text-slate-500">Batch:</span>{" "}
              <span className="font-mono font-medium text-slate-700">{queueState.currentBatch || "All"}</span>
            </div>
            <div
              className="cursor-help border-b border-dotted border-slate-400"
              title="Done = Total suppliers evaluated in this background run (OK + Skipped + Failed)"
            >
              <span className="text-slate-500">Done:</span>{" "}
              <span className="font-bold text-slate-900">{queueState.processedCount}</span>
            </div>
            <div
              className="cursor-help border-b border-dotted border-green-500"
              title="OK = Food & Beverage producers successfully scraped and cataloged with products"
            >
              <span className="text-slate-500">OK:</span>{" "}
              <span className="text-green-700 font-bold">{queueState.successCount}</span>
            </div>
            {queueState.skippedCount > 0 && (
              <div
                className="cursor-help border-b border-dotted border-amber-500"
                title="Skipped = Non-food entities (packaging, machinery, insurance, government booths) filtered out by AI to keep your food catalog clean"
              >
                <span className="text-slate-500">Skipped:</span>{" "}
                <span className="text-amber-700 font-bold">{queueState.skippedCount}</span>
              </div>
            )}
            {queueState.failedCount > 0 && (
              <div
                className="cursor-help border-b border-dotted border-red-500"
                title="Failed = Inaccessible domains (DNS expired, network timeout, or bot-block)"
              >
                <span className="text-slate-500">Failed:</span>{" "}
                <span className="text-red-600 font-bold">{queueState.failedCount}</span>
              </div>
            )}
            <div
              className="cursor-help border-b border-dotted border-blue-500"
              title="Products = Total new food/beverage catalog items extracted, categorized, and vector-embedded in this session"
            >
              <span className="text-slate-500">Products:</span>{" "}
              <span className="text-blue-700 font-bold">{queueState.productsFound}</span>
            </div>
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
