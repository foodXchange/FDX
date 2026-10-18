"use client";

import { useState, useEffect, useTransition } from "react";
import {
  markSupplierDuplicate,
  unmarkSupplierDuplicate,
  approveAllDuplicates,
  getMarkedDuplicates,
  runSupplierDeduplicationScan,
  type MarkedDuplicateRow,
} from "./actions";

export type DuplicateRow = {
  keep_id: string;
  duplicate_id: string;
  company_name: string;
  country: string | null;
  keep_status: string | null;
  dup_status: string | null;
};

const PAGE_SIZE = 50;

export default function DuplicateTable({
  duplicates,
  totalMarkedCount = 0,
}: {
  duplicates: DuplicateRow[];
  totalMarkedCount?: number;
}) {
  const [activeTab, setActiveTab] = useState<"pending" | "marked">(
    duplicates.length > 0 ? "pending" : "marked"
  );

  // --- Pending Duplicates State ---
  const [pendingStates, setPendingStates] = useState<Record<string, "idle" | "saving" | "done" | "error">>({});
  const [hiddenPending, setHiddenPending] = useState<Set<string>>(new Set());
  const [pendingSearch, setPendingSearch] = useState("");
  const [pendingVisibleCount, setPendingVisibleCount] = useState(PAGE_SIZE);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);

  // --- Scan State ---
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  // --- Marked Duplicates State ---
  const [markedRows, setMarkedRows] = useState<MarkedDuplicateRow[]>([]);
  const [markedTotal, setMarkedTotal] = useState(totalMarkedCount);
  const [markedPage, setMarkedPage] = useState(1);
  const [markedSearch, setMarkedSearch] = useState("");
  const [isLoadingMarked, setIsLoadingMarked] = useState(false);
  const [unmarkStates, setUnmarkStates] = useState<Record<string, "idle" | "unmarking" | "done" | "error">>({});
  const [, startTransition] = useTransition();

  // Load marked duplicates
  async function loadMarked(page = 1, search = "") {
    setIsLoadingMarked(true);
    try {
      const res = await getMarkedDuplicates(page, 20, search);
      setMarkedRows(res.rows);
      setMarkedTotal(res.total);
      setMarkedPage(page);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingMarked(false);
    }
  }

  useEffect(() => {
    if (activeTab === "marked" && markedRows.length === 0) {
      loadMarked(1, markedSearch);
    }
  }, [activeTab]);

  async function handleSearchMarkedSubmit(e: React.FormEvent) {
    e.preventDefault();
    loadMarked(1, markedSearch);
  }

  async function handleMark(duplicateId: string, keepId: string) {
    setPendingStates((s) => ({ ...s, [duplicateId]: "saving" }));
    const result = await markSupplierDuplicate(duplicateId, keepId);

    if (result.ok) {
      setPendingStates((s) => ({ ...s, [duplicateId]: "done" }));
      setTimeout(() => {
        setHiddenPending((h) => new Set([...h, duplicateId]));
      }, 800);
      setMarkedTotal((prev) => prev + 1);
    } else {
      setPendingStates((s) => ({ ...s, [duplicateId]: "error" }));
    }
  }

  async function handleUnmark(supplierId: string) {
    setUnmarkStates((s) => ({ ...s, [supplierId]: "unmarking" }));
    const result = await unmarkSupplierDuplicate(supplierId);

    if (result.ok) {
      setUnmarkStates((s) => ({ ...s, [supplierId]: "done" }));
      setMarkedRows((rows) => rows.filter((r) => r.id !== supplierId));
      setMarkedTotal((prev) => Math.max(0, prev - 1));
    } else {
      setUnmarkStates((s) => ({ ...s, [supplierId]: "error" }));
    }
  }

  async function handleApproveAllPending() {
    setBulkSaving(true);
    setBulkMessage(null);
    const visiblePending = duplicates.filter((d) => !hiddenPending.has(d.duplicate_id));
    const pairs = visiblePending.map((d) => ({
      duplicate_id: d.duplicate_id,
      keep_id: d.keep_id,
    }));
    const result = await approveAllDuplicates(pairs);
    if (result.ok) {
      setHiddenPending((h) => new Set([...h, ...visiblePending.map((d) => d.duplicate_id)]));
      setMarkedTotal((prev) => prev + pairs.length);
      setBulkMessage(`Approved ${pairs.length} duplicate suppliers!`);
    } else {
      setBulkMessage(`Error: ${result.error ?? "Failed to approve duplicates"}`);
    }
    setBulkSaving(false);
  }

  async function handleRunScan() {
    setIsScanning(true);
    setScanMessage(null);
    const res = await runSupplierDeduplicationScan();
    if (res.ok) {
      setScanMessage(
        res.markedCount > 0
          ? `Scan complete: Found and marked ${res.markedCount} duplicates!`
          : "Scan complete: No new duplicates found. Catalog is fully deduplicated!"
      );
      if (res.markedCount > 0) {
        setMarkedTotal((m) => m + res.markedCount);
        loadMarked(1, markedSearch);
      }
    } else {
      setScanMessage(`Scan failed: ${res.error}`);
    }
    setIsScanning(false);
  }

  const visiblePending = duplicates.filter((d) => !hiddenPending.has(d.duplicate_id));

  const filteredPending = pendingSearch.trim()
    ? visiblePending.filter((d) => {
        const needle = pendingSearch.trim().toLowerCase();
        return (
          d.company_name.toLowerCase().includes(needle) ||
          (d.country ?? "").toLowerCase().includes(needle)
        );
      })
    : visiblePending;

  const shownPending = filteredPending.slice(0, pendingVisibleCount);

  return (
    <div className="space-y-4">
      {/* Top Controls & Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("pending")}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === "pending"
                ? "bg-orange-500 text-white shadow-sm"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <span>Pending Review</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === "pending"
                  ? "bg-white/20 text-white"
                  : visiblePending.length > 0
                  ? "bg-orange-100 text-orange-700 font-bold"
                  : "bg-gray-200 text-gray-600"
              }`}
            >
              {visiblePending.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("marked")}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === "marked"
                ? "bg-orange-500 text-white shadow-sm"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <span>Deduplicated Suppliers</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === "marked"
                  ? "bg-white/20 text-white"
                  : "bg-gray-200 text-gray-600"
              }`}
            >
              {markedTotal.toLocaleString()}
            </span>
          </button>
        </div>

        {/* Global Scan Button */}
        <button
          type="button"
          onClick={handleRunScan}
          disabled={isScanning}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 shadow-sm disabled:opacity-50 transition-all cursor-pointer"
        >
          {isScanning ? (
            <>
              <svg className="animate-spin h-3.5 w-3.5 text-orange-500" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Scanning Catalog...
            </>
          ) : (
            <>
              <span>🔍</span> Scan for New Duplicates
            </>
          )}
        </button>
      </div>

      {scanMessage && (
        <div className="text-xs text-blue-800 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2">
          <span>ℹ️</span> {scanMessage}
        </div>
      )}

      {/* --- TAB 1: PENDING DUPLICATES --- */}
      {activeTab === "pending" && (
        <div>
          {visiblePending.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 border border-gray-200 rounded-xl">
              <div className="text-3xl mb-2">✨</div>
              <p className="text-sm font-semibold text-gray-800">
                No Pending Duplicate Suppliers Detected
              </p>
              <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                All 9,022 active suppliers have distinct company names and domains.{" "}
                <strong className="text-gray-700">{markedTotal.toLocaleString()}</strong> duplicate
                records have already been identified and deduplicated.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("marked")}
                className="mt-3 inline-flex items-center gap-1 text-xs text-orange-600 font-semibold hover:text-orange-700 underline"
              >
                View Deduplicated Suppliers List →
              </button>
            </div>
          ) : (
            <div>
              <div className="mb-3 flex items-center justify-between gap-3 flex-wrap">
                <input
                  type="text"
                  value={pendingSearch}
                  onChange={(e) => {
                    setPendingSearch(e.target.value);
                    setPendingVisibleCount(PAGE_SIZE);
                  }}
                  placeholder="Filter candidate company or country…"
                  className="w-full max-w-xs text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 shadow-sm"
                />
                <button
                  type="button"
                  onClick={handleApproveAllPending}
                  disabled={bulkSaving}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-orange-500 text-white hover:bg-orange-600 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {bulkSaving ? "Approving…" : `Approve All Pending (${visiblePending.length})`}
                </button>
              </div>

              {bulkMessage && (
                <div className="mb-3 text-xs text-orange-800 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                  {bulkMessage}
                </div>
              )}

              {filteredPending.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">
                  No duplicates match this search filter.
                </p>
              ) : (
                <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left bg-gray-50/80 border-b border-gray-200 text-xs font-semibold text-gray-600">
                        <th className="py-2.5 px-4">Candidate Duplicate Company</th>
                        <th className="py-2.5 px-4">Country</th>
                        <th className="py-2.5 px-4 font-mono text-[11px]">Keep ID</th>
                        <th className="py-2.5 px-4 font-mono text-[11px]">Dup ID</th>
                        <th className="py-2.5 px-4 text-center">Status (Keep/Dup)</th>
                        <th className="py-2.5 px-4 text-right w-36">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {shownPending.map((row) => {
                        const state = pendingStates[row.duplicate_id] ?? "idle";
                        return (
                          <tr key={row.duplicate_id} className="group hover:bg-gray-50/60 transition-colors">
                            <td className="py-2.5 px-4 text-gray-900 font-medium">
                              {row.company_name}
                            </td>
                            <td className="py-2.5 px-4 text-gray-500 text-xs">
                              {row.country ?? "—"}
                            </td>
                            <td className="py-2.5 px-4 text-gray-400 font-mono text-xs">
                              {row.keep_id.slice(0, 8)}…
                            </td>
                            <td className="py-2.5 px-4 text-gray-400 font-mono text-xs">
                              {row.duplicate_id.slice(0, 8)}…
                            </td>
                            <td className="py-2.5 px-4 text-center text-xs">
                              <span className="text-gray-600 font-medium">{row.keep_status}</span>
                              <span className="text-gray-300 mx-1">/</span>
                              <span className="text-gray-600">{row.dup_status}</span>
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              {state === "done" ? (
                                <span className="text-xs text-emerald-600 font-medium">✓ Marked</span>
                              ) : state === "error" ? (
                                <span className="text-xs text-red-500 font-medium">Error</span>
                              ) : (
                                <button
                                  onClick={() => handleMark(row.duplicate_id, row.keep_id)}
                                  disabled={state === "saving"}
                                  className="px-3 py-1 text-xs font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:border-orange-400 hover:text-orange-600 shadow-sm disabled:opacity-40 transition-colors"
                                >
                                  {state === "saving" ? "Saving…" : "Mark duplicate"}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {filteredPending.length > shownPending.length && (
                <div className="mt-3 text-center">
                  <button
                    type="button"
                    onClick={() => setPendingVisibleCount((c) => c + PAGE_SIZE)}
                    className="px-4 py-2 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:border-orange-300 hover:text-orange-600 bg-white transition-colors shadow-sm"
                  >
                    Load more ({filteredPending.length - shownPending.length} remaining)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* --- TAB 2: MARKED DUPLICATES ARCHIVE --- */}
      {activeTab === "marked" && (
        <div className="space-y-3">
          {/* Search bar & info */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <form onSubmit={handleSearchMarkedSubmit} className="flex items-center gap-2 max-w-sm w-full">
              <input
                type="text"
                value={markedSearch}
                onChange={(e) => setMarkedSearch(e.target.value)}
                placeholder="Search archived duplicates (name, domain, country)..."
                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 shadow-sm"
              />
              <button
                type="submit"
                disabled={isLoadingMarked}
                className="px-3 py-2 text-xs font-semibold bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors shadow-sm cursor-pointer"
              >
                Search
              </button>
            </form>

            <span className="text-xs text-gray-500">
              Total Deduplicated: <strong className="text-gray-800">{markedTotal.toLocaleString()}</strong> suppliers
            </span>
          </div>

          {isLoadingMarked ? (
            <div className="py-12 text-center text-sm text-gray-500">
              <svg className="animate-spin h-6 w-6 text-orange-500 mx-auto mb-2" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Loading deduplicated suppliers...
            </div>
          ) : markedRows.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">No marked duplicates found matching this filter.</p>
          ) : (
            <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left bg-gray-50/80 border-b border-gray-200 text-xs font-semibold text-gray-600">
                    <th className="py-2.5 px-4 w-1/3">Duplicate Supplier Record</th>
                    <th className="py-2.5 px-4">Origin</th>
                    <th className="py-2.5 px-4">Primary Supplier (Kept)</th>
                    <th className="py-2.5 px-4 text-center">Status</th>
                    <th className="py-2.5 px-4 text-right w-36">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {markedRows.map((row) => {
                    const state = unmarkStates[row.id] ?? "idle";
                    return (
                      <tr key={row.id} className="group hover:bg-gray-50/60 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-medium text-gray-900">{row.company_name}</div>
                          {row.website && (
                            <a
                              href={row.website.startsWith("http") ? row.website : `https://${row.website}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-gray-400 hover:text-orange-600 transition-colors truncate block max-w-xs"
                            >
                              {row.website}
                            </a>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs text-gray-500">
                          {row.country_of_origin ?? "—"}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="text-emerald-700 font-semibold text-xs bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-md">
                              Keep: {row.primary_name}
                            </span>
                          </div>
                          {row.primary_website && (
                            <div className="text-[11px] text-gray-400 mt-0.5 truncate max-w-xs">
                              {row.primary_website}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center text-xs">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
                            Deduplicated
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {state === "done" ? (
                            <span className="text-xs text-emerald-600 font-medium">Restored</span>
                          ) : state === "error" ? (
                            <span className="text-xs text-red-500 font-medium">Error</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleUnmark(row.id)}
                              disabled={state === "unmarking"}
                              className="px-2.5 py-1 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:border-red-300 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                              title="Unmark duplicate and restore as an active independent supplier"
                            >
                              {state === "unmarking" ? "Restoring…" : "Unmark (Restore)"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination controls */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-gray-500">
              Page {markedPage} of {Math.max(1, Math.ceil(markedTotal / 20))}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => loadMarked(markedPage - 1, markedSearch)}
                disabled={markedPage <= 1 || isLoadingMarked}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-colors"
              >
                ← Previous
              </button>
              <button
                type="button"
                onClick={() => loadMarked(markedPage + 1, markedSearch)}
                disabled={markedPage * 20 >= markedTotal || isLoadingMarked}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
