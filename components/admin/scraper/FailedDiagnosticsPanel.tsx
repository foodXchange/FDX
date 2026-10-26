"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export interface FailureBreakdownStats {
  totalFailed: number;
  noProductsCount: number;
  emptyOrBlockedCount: number;
  timeoutCount: number;
  aiBillingCount: number;
  otherCount: number;
  duplicateOfScrapedCount: number;
}

interface FailedDiagnosticsPanelProps {
  stats: FailureBreakdownStats;
}

export function FailedDiagnosticsPanel({ stats }: FailedDiagnosticsPanelProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(true);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  // Automatically open panel when URL hash has #status=failed or when user clicks the top Failed pill
  useEffect(() => {
    const checkHash = () => {
      if (typeof window === "undefined") return;
      const h = window.location.hash;
      if (h.includes("status=failed") || h.includes("inspect=failed")) {
        setIsOpen(true);
      }
    };
    const handleDocClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest("a");
      if (!target) return;
      const href = target.getAttribute("href") ?? "";
      if (href === "#status=failed") {
        setIsOpen(true);
        window.dispatchEvent(new HashChangeEvent("hashchange"));
        const panel = document.getElementById("failed-diagnostics-panel");
        panel?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      } else if (
        href === "#status=pending" ||
        href === "#status=scraped" ||
        href === "#status=skipped"
      ) {
        setTimeout(() => {
          window.dispatchEvent(new HashChangeEvent("hashchange"));
          const tbl = document.getElementById("suppliers-directory-table");
          tbl?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 50);
      }
    };
    checkHash();
    window.addEventListener("hashchange", checkHash);
    document.addEventListener("click", handleDocClick);
    return () => {
      window.removeEventListener("hashchange", checkHash);
      document.removeEventListener("click", handleDocClick);
    };
  }, []);

  async function runRecoveryAction(
    action:
      | "requeue_ai_billing"
      | "requeue_timeouts"
      | "requeue_no_products"
      | "sync_scraped_duplicates"
  ) {
    setLoadingAction(action);
    setBannerMessage(null);
    try {
      const res = await fetch("/api/admin/scraper/failures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.ok) {
        setBannerMessage(`✓ ${data.message}`);
        router.refresh();
      } else {
        setBannerMessage(`✗ Error: ${data.error ?? "Action failed"}`);
      }
    } catch (err: any) {
      setBannerMessage(`✗ Network error: ${err?.message ?? "Unknown"}`);
    } finally {
      setLoadingAction(null);
    }
  }

  function jumpToTableWithCategory(categoryKey: string) {
    if (typeof window !== "undefined") {
      window.location.hash = `#status=failed&failCat=${encodeURIComponent(categoryKey)}`;
      const el = document.getElementById("suppliers-directory-table");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }

  const total = Math.max(stats.totalFailed, 1);
  const pct = (n: number) => Math.round((n / total) * 100);

  return (
    <div id="failed-diagnostics-panel" className="bg-white border border-red-200 rounded-2xl shadow-2xs overflow-hidden">
      {/* Compact Header Bar (Always visible so user can expand/collapse anytime) */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="px-5 py-3.5 bg-red-50/70 hover:bg-red-50 border-b border-red-100 flex flex-wrap items-center justify-between gap-3 cursor-pointer transition"
      >
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-red-600 text-white text-xs font-bold shadow-2xs">
            !
          </span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Failed Scrape Root-Cause Inspector ({stats.totalFailed.toLocaleString()} Records)
              </h2>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white border border-red-200 text-red-700">
                {(stats.aiBillingCount + stats.timeoutCount + stats.duplicateOfScrapedCount).toLocaleString()} Immediately Recoverable
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Breakdown: <strong>{stats.noProductsCount.toLocaleString()}</strong> No SKUs on Homepage ({pct(stats.noProductsCount)}%) ·{" "}
              <strong>{stats.emptyOrBlockedCount.toLocaleString()}</strong> Dead/Blocked URLs ({pct(stats.emptyOrBlockedCount)}%) ·{" "}
              <strong>{stats.timeoutCount.toLocaleString()}</strong> Timeouts ({pct(stats.timeoutCount)}%) ·{" "}
              <strong>{stats.aiBillingCount.toLocaleString()}</strong> Old AI Billing 402/400 ({pct(stats.aiBillingCount)}%)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              jumpToTableWithCategory("all");
            }}
            className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition"
          >
            ↓ View Failed Rows in Table
          </button>
          <button
            type="button"
            className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition"
          >
            {isOpen ? "Hide Breakdown ▲" : "Inspect Why 47% Failed & Recover ▼"}
          </button>
        </div>
      </div>

      {/* Expanded Root-Cause Breakdown & Recovery Actions */}
      {isOpen && (
        <div className="p-5 space-y-4 bg-white">
          {bannerMessage && (
            <div
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold border ${
                bannerMessage.startsWith("✓")
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-red-50 border-red-200 text-red-800"
              }`}
            >
              {bannerMessage}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* Reason 1: No Products Extracted */}
            <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                    #1 Cause · {pct(stats.noProductsCount)}% of Failures
                  </span>
                  <span className="text-base font-extrabold text-slate-900">
                    {stats.noProductsCount.toLocaleString()}
                  </span>
                </div>
                <h3 className="text-xs font-bold text-slate-900 mb-1">
                  No Individual SKUs Extracted from Homepage
                </h3>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  The website loaded, but it is a B2B factory site that describes general product lines (e.g. <em>&ldquo;We manufacture private-label crackers &amp; biscuits&rdquo;</em>) rather than individual retail SKU names, or its catalog is locked inside a downloadable PDF.
                </p>
                <p className="text-[11px] text-emerald-700 font-medium mt-1.5">
                  ✓ Fixed: Extractor now converts B2B product lines &amp; categories into catalog items.
                </p>
              </div>
              <div className="mt-3 pt-3 border-t border-amber-200/60 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => jumpToTableWithCategory("no_products")}
                  className="px-2.5 py-1 rounded-lg bg-white border border-amber-300 hover:bg-amber-50 text-amber-900 text-[11px] font-semibold transition"
                >
                  🔍 Inspect {stats.noProductsCount.toLocaleString()} in Table
                </button>
                <button
                  type="button"
                  disabled={loadingAction !== null || stats.noProductsCount === 0}
                  onClick={() => runRecoveryAction("requeue_no_products")}
                  className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-semibold transition disabled:opacity-50"
                >
                  {loadingAction === "requeue_no_products"
                    ? "Re-queuing…"
                    : "↻ Move to Pending"}
                </button>
              </div>
            </div>

            {/* Reason 2: Unreachable / Dead / Bot-Blocked */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 bg-slate-200 px-2 py-0.5 rounded-md">
                    #2 Cause · {pct(stats.emptyOrBlockedCount)}% of Failures
                  </span>
                  <span className="text-base font-extrabold text-slate-900">
                    {stats.emptyOrBlockedCount.toLocaleString()}
                  </span>
                </div>
                <h3 className="text-xs font-bold text-slate-900 mb-1">
                  Dead Domain / SSL Error / Cloudflare Challenge
                </h3>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Old exhibition CSV domains that are offline, parked, expired SSL, blocked by strict Cloudflare anti-bot wall, or ran when Firecrawl credits were depleted before Google Search Grounding fallback was active.
                </p>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-200 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => jumpToTableWithCategory("empty_or_blocked")}
                  className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 text-[11px] font-semibold transition"
                >
                  🔍 Inspect {stats.emptyOrBlockedCount.toLocaleString()} in Table
                </button>
              </div>
            </div>

            {/* Reason 3: Timeout (>90s) */}
            <div className="rounded-xl border border-orange-200 bg-orange-50/30 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-orange-800 bg-orange-100 px-2 py-0.5 rounded-md">
                    #3 Cause · {pct(stats.timeoutCount)}% of Failures
                  </span>
                  <span className="text-base font-extrabold text-slate-900">
                    {stats.timeoutCount.toLocaleString()}
                  </span>
                </div>
                <h3 className="text-xs font-bold text-slate-900 mb-1">
                  Slow Factory Website Timeout (&gt;90s)
                </h3>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Heavy overseas manufacturer websites with large images/catalogs that exceeded the old 90-second per-supplier timeout. Timeout is now 120s with fast single-pass `gemini-3.5-flash-lite` extraction.
                </p>
              </div>
              <div className="mt-3 pt-3 border-t border-orange-200/60 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => jumpToTableWithCategory("timeout")}
                  className="px-2.5 py-1 rounded-lg bg-white border border-orange-300 hover:bg-orange-50 text-orange-900 text-[11px] font-semibold transition"
                >
                  🔍 Inspect {stats.timeoutCount.toLocaleString()} in Table
                </button>
                <button
                  type="button"
                  disabled={loadingAction !== null || stats.timeoutCount === 0}
                  onClick={() => runRecoveryAction("requeue_timeouts")}
                  className="px-2.5 py-1 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-[11px] font-semibold transition disabled:opacity-50"
                >
                  {loadingAction === "requeue_timeouts"
                    ? "Re-queuing…"
                    : `↻ Re-queue ${stats.timeoutCount} Timeouts`}
                </button>
              </div>
            </div>

            {/* Reason 4: Historical AI Billing Depletion (402 / 400) */}
            <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800 bg-blue-100 px-2 py-0.5 rounded-md">
                    #4 Cause · {pct(stats.aiBillingCount)}% of Failures
                  </span>
                  <span className="text-base font-extrabold text-slate-900">
                    {stats.aiBillingCount.toLocaleString()}
                  </span>
                </div>
                <h3 className="text-xs font-bold text-slate-900 mb-1">
                  Historical AI Key Credit Depletion (HTTP 402/400)
                </h3>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  These websites did <strong>not</strong> fail to load — they were marked failed during past runs when the old Gemini/Anthropic key ran out of credits before the Circuit Breaker was installed.
                </p>
              </div>
              <div className="mt-3 pt-3 border-t border-blue-200/60 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => jumpToTableWithCategory("ai_billing")}
                  className="px-2.5 py-1 rounded-lg bg-white border border-blue-300 hover:bg-blue-50 text-blue-900 text-[11px] font-semibold transition"
                >
                  🔍 Inspect {stats.aiBillingCount.toLocaleString()} in Table
                </button>
                <button
                  type="button"
                  disabled={loadingAction !== null || stats.aiBillingCount === 0}
                  onClick={() => runRecoveryAction("requeue_ai_billing")}
                  className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold transition disabled:opacity-50"
                >
                  {loadingAction === "requeue_ai_billing"
                    ? "Re-queuing…"
                    : `↻ Re-queue ${stats.aiBillingCount} to Pending`}
                </button>
              </div>
            </div>
          </div>

          {/* Instant Zero-Credit Duplicate Domain Sync Bar */}
          {stats.duplicateOfScrapedCount > 0 && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-emerald-900">
                <strong>⚡ Instant Zero-Credit Recovery Available:</strong>{" "}
                <strong>{stats.duplicateOfScrapedCount}</strong> of these failed records share a website domain with a supplier that is <strong>already successfully scraped</strong> in your database.
              </div>
              <button
                type="button"
                disabled={loadingAction !== null}
                onClick={() => runRecoveryAction("sync_scraped_duplicates")}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition disabled:opacity-50"
              >
                {loadingAction === "sync_scraped_duplicates"
                  ? "Syncing…"
                  : `⚡ Auto-Heal ${stats.duplicateOfScrapedCount} Duplicate Domains Now (0 Credits)`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
