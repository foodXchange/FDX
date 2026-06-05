"use client";

import { useEffect, useRef, useState } from "react";

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
  perplexity: number;
}

interface BatchOption {
  batchId: string;
  filename: string;
  rowsTotal: number;
  uploadedAt: string | null;
}

interface ScraperConsoleProps {
  supplierId?: string;
  totalPending?: number;
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

type StatusFilter = "pending" | "failed" | "";

export function ScraperConsole({ supplierId, defaultBatchId, batchOptions }: ScraperConsoleProps) {
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [summary, setSummary] = useState<ScraperSummary | null>(null);
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [limit, setLimit] = useState<number | "all">("all");
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("pending");
  const [batchId, setBatchId] = useState(defaultBatchId ?? "");
  const [batchInfo, setBatchInfo] = useState<string | null>(null);
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

      // Parse hash as URLSearchParams (strip leading #)
      const params = new URLSearchParams(hash.slice(1));
      const batchValue = params.get("batchId");
      const statusValue = params.get("status");

      if (batchValue) setBatchId(batchValue);
      if (statusValue === "failed") setFilterStatus("failed");
      else if (statusValue === "pending") setFilterStatus("pending");
    };

    readHashParams();
    window.addEventListener("hashchange", readHashParams);
    return () => window.removeEventListener("hashchange", readHashParams);
  }, []);

  // Initialize batchId from first option when options are provided and no hash/default is set
  useEffect(() => {
    if (batchOptions && batchOptions.length > 0 && !defaultBatchId) {
      const hash = typeof window !== "undefined" ? window.location.hash : "";
      if (!hash || !new URLSearchParams(hash.slice(1)).get("batchId")) {
        setBatchId(batchOptions[0].batchId);
      }
    }
  }, [batchOptions, defaultBatchId]);

  function startScraping() {
    setRunning(true);
    setLogs([]);
    setSummary(null);
    setProgress(null);
    setBatchInfo(null);

    const params = new URLSearchParams();
    const trimmedBatch = batchId.trim();

    if (supplierId) {
      params.set("supplierId", supplierId);
    }

    if (trimmedBatch) {
      params.set("batchId", trimmedBatch);
      const statusLabel = filterStatus === "failed" ? "failed" : "pending";
      setBatchInfo(`Batch run: only ${statusLabel} rows from ${trimmedBatch}`);
    }

    if (!supplierId) {
      if (limit !== "all") params.set("limit", String(limit));
      // When a batch is selected, default to the chosen filter; otherwise respect filterStatus
      const effectiveStatus = filterStatus || (trimmedBatch ? "pending" : "");
      if (effectiveStatus) params.set("status", effectiveStatus);
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
        return;
      }

      if (data.type === "summary" && data.data) {
        setSummary(data.data as ScraperSummary);
      }

      // Progress tracking
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
            perplexity: prev?.perplexity ?? 0,
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
        data.message?.includes("Perplexity research")
      ) {
        setProgress((prev) =>
          prev ? { ...prev, perplexity: prev.perplexity + 1 } : null
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
          message: "Connection lost",
          timestamp: new Date().toISOString(),
        },
      ]);
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
      ? Math.ceil((progress.total - progress.current) * 45 / 60)
      : 0;

  const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
    { value: "pending", label: "Pending only" },
    { value: "failed", label: "Failed only" },
    { value: "", label: "All" },
  ];

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {!isSingleSupplier && (
          <>
            <div className="flex items-center gap-1 flex-wrap">
              {LIMIT_OPTIONS.map((n) => (
                <button
                  key={n}
                  onClick={() => setLimit(n)}
                  disabled={running}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-colors disabled:opacity-50
                    ${
                      limit === n
                        ? "bg-slate-800 text-white border-slate-800"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                >
                  {n === "all" ? "All" : n}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-sm text-slate-600 flex flex-col gap-1">
                Batch
                {batchOptions && batchOptions.length > 0 ? (
                  <select
                    value={batchId}
                    onChange={(e) => setBatchId(e.target.value)}
                    disabled={running}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm w-72 bg-white"
                  >
                    <option value="">— All pending (no batch filter) —</option>
                    {batchOptions.map((opt) => (
                      <option key={opt.batchId} value={opt.batchId}>
                        {opt.filename}
                        {opt.uploadedAt
                          ? ` — ${formatBatchDate(opt.uploadedAt)}`
                          : ""}
                        {` — ${opt.rowsTotal} rows`}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={batchId}
                    onChange={(e) => setBatchId(e.target.value)}
                    disabled={running}
                    placeholder="csv-1234567890"
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm w-60"
                  />
                )}
              </label>
              {batchId.trim() ? (
                <p className="text-xs text-slate-500">
                  This will run only{" "}
                  {filterStatus === "failed" ? "failed" : filterStatus === "pending" ? "pending" : "all"}{" "}
                  rows for the selected upload batch.
                </p>
              ) : null}
            </div>

            {/* Status filter: Pending only / Failed only / All */}
            <div className="flex items-center gap-1">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFilterStatus(opt.value)}
                  disabled={running}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-colors disabled:opacity-50
                    ${
                      filterStatus === opt.value
                        ? opt.value === "failed"
                          ? "bg-red-600 text-white border-red-600"
                          : "bg-slate-800 text-white border-slate-800"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </>
        )}

        {running ? (
          <button
            onClick={stopScraping}
            className="px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors"
          >
            ⏹ Stop
          </button>
        ) : (
          <button
            onClick={startScraping}
            className="px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors"
          >
            ▶ {isSingleSupplier ? "Re-scrape now" : "Start scraping"}
          </button>
        )}
      </div>

      {batchInfo && (
        <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          {batchInfo}
        </div>
      )}

      {/* Progress bar */}
      {running && progress !== null && (
        <div className="mb-4 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
          <div className="flex justify-between text-sm font-medium text-slate-700">
            <span>
              Running — {progress.current} of {progress.total}
            </span>
            <span>
              {etaMinutes > 0 ? `ETA ~${etaMinutes}m` : "Almost done"}
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className="bg-orange-500 h-2 rounded-full transition-all duration-500"
              style={{
                width: `${Math.round(
                  (progress.current / Math.max(progress.total, 1)) * 100
                )}%`,
              }}
            />
          </div>
          <div className="flex gap-4 text-xs text-slate-500 flex-wrap">
            <span>✓ {progress.succeeded} succeeded</span>
            <span>✗ {progress.failed} failed</span>
            <span>📦 {progress.products} products</span>
            {progress.perplexity > 0 && (
              <span>🔍 {progress.perplexity} via Perplexity</span>
            )}
          </div>
        </div>
      )}

      {/* Log panel */}
      <div
        className={`bg-slate-900 rounded-xl p-4 font-mono text-sm min-h-75 max-h-125 overflow-y-auto transition-all
          ${summary ? "ring-2 ring-green-500" : ""}`}
      >
        {logs.length === 0 && !running ? (
          <p className="text-slate-600 text-center mt-8">
            Click &apos;{isSingleSupplier ? "Re-scrape now" : "Start scraping"}
            &apos; to begin. Live output will appear here.
          </p>
        ) : (
          <>
            {logs.map((line, i) => (
              <div key={i} className="flex gap-2 py-0.5">
                <span className="text-slate-600 text-xs shrink-0 mt-0.5">
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
              <div className="mt-4 p-3 bg-slate-800 rounded-lg text-orange-400">
                <p className="font-semibold">── Summary ──</p>
                <p>✓ Succeeded: {summary.succeeded}</p>
                <p>✗ Failed:    {summary.failed}</p>
                <p>⊘ Skipped:   {summary.skipped}</p>
                <p>📦 Products:  {summary.totalProducts}</p>
              </div>
            )}
          </>
        )}
        <div ref={logEndRef} />
      </div>

      {/* Log actions */}
      {logs.length > 0 && (
        <div className="flex gap-2 mt-2">
          <button
            onClick={handleCopyLog}
            className="px-3 py-1.5 text-xs border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition"
          >
            Copy log
          </button>
          <button
            onClick={handleDownloadLog}
            className="px-3 py-1.5 text-xs border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition"
          >
            Download log
          </button>
        </div>
      )}
    </div>
  );
}
