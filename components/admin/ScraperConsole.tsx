"use client";

import { useEffect, useRef, useState } from "react";

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

interface ScraperConsoleProps {
  supplierId?: string;
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

const LIMIT_OPTIONS = [5, 10, 25, 50];

export function ScraperConsole({ supplierId }: ScraperConsoleProps) {
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [summary, setSummary] = useState<ScraperSummary | null>(null);
  const [limit, setLimit] = useState(10);
  const [filterPending, setFilterPending] = useState(true);
  const eventSourceRef = useRef<EventSource | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logs.length > 0) {
      logEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      eventSourceRef.current?.close();
    };
  }, []);

  function startScraping() {
    setRunning(true);
    setLogs([]);
    setSummary(null);

    const params = new URLSearchParams();
    if (supplierId) {
      params.set("supplierId", supplierId);
    } else {
      params.set("limit", String(limit));
      if (filterPending) params.set("status", "pending");
    }

    const url = `/api/admin/scraper/stream?${params.toString()}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onmessage = (event: MessageEvent<string>) => {
      const data = JSON.parse(event.data) as {
        type: string;
        message?: string;
        data?: ScraperSummary;
      };

      if (data.type === "done") {
        es.close();
        setRunning(false);
        return;
      }

      if (data.type === "summary" && data.data) {
        setSummary(data.data);
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

  const isSingleSupplier = Boolean(supplierId);

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {!isSingleSupplier && (
          <>
            <div className="flex items-center gap-1">
              {LIMIT_OPTIONS.map((n) => (
                <button
                  key={n}
                  onClick={() => setLimit(n)}
                  disabled={running}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-colors disabled:opacity-50
                    ${limit === n
                      ? "bg-slate-800 text-white border-slate-800"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                >
                  {n}
                </button>
              ))}
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={filterPending}
                onChange={(e) => setFilterPending(e.target.checked)}
                disabled={running}
                className="rounded"
              />
              Pending only
            </label>
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

      {/* Log panel */}
      <div
        className={`bg-slate-900 rounded-xl p-4 font-mono text-sm min-h-[300px] max-h-[500px] overflow-y-auto transition-all
          ${summary ? "ring-2 ring-green-500" : ""}`}
      >
        {logs.length === 0 && !running ? (
          <p className="text-slate-600 text-center mt-8">
            Click &apos;{isSingleSupplier ? "Re-scrape now" : "Start scraping"}&apos; to begin.
            Live output will appear here.
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
    </div>
  );
}
