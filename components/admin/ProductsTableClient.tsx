"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  deleteProduct,
  bulkUpdateProducts,
  bulkDeleteProducts,
  bulkAddKosher,
  bulkAddCertification,
  bulkMarkVerified,
} from "@/app/admin/products/actions";
import ProductEditSlideOver from "@/components/admin/ProductEditSlideOver";
import ProductImage from "@/components/ProductImage";

export type ProductRow = {
  id: string;
  product_name: string;
  category: string;
  certifications: string[];
  kosher_types: string[];
  formats: string[];
  sizes?: string[];
  description: string | null;
  needs_review: boolean;
  scrape_confidence: number;
  manually_verified: boolean;
  private_label: boolean;
  image_url: string | null;
  supplier_id: string;
  benchmarkMatchScore?: number;
  supplier: {
    company_name: string;
    country_of_origin: string | null;
    status: string | null;
    logo_url?: string | null;
    website?: string | null;
  } | null;
};

export type BuyerRequestOption = {
  id: string;
  product_name: string | null;
  company: string | null;
  category: string | null;
  kosher: string | null;
  certifications: string[] | null;
  quantity: string | null;
  unit: string | null;
  notes: string | null;
  reference_image_urls: string[] | null;
  created_at: string | null;
};

const KOSHER_OPTIONS = [
  "Chief Rabbinate",
  "Badatz Beit Yosef",
  "Badatz Eida Chareidis",
  "Mehadrin",
  "OU Kosher",
  "OK Kosher",
  "KF Kosher",
];

const BULK_CERT_OPTIONS = [
  "BRC",
  "IFS",
  "FSSC 22000",
  "ISO 22000",
  "HACCP",
  "GlobalG.A.P.",
];

function cleanDisplayName(name: string): string {
  return name
    .replace(/(?:ï¿½|)+/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function ConfidenceBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color =
    score >= 0.8
      ? "bg-green-500"
      : score >= 0.5
        ? "bg-orange-400"
        : "bg-red-400";
  return (
    <div className="flex items-center gap-1.5" title={`Scrape confidence: ${pct}%`}>
      <div className="h-1.5 w-12 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] text-slate-400">{pct}%</span>
    </div>
  );
}

interface Props {
  products: ProductRow[];
  buyerRequests?: BuyerRequestOption[];
  initialRequestId?: string;
  showNeedsReviewBanner?: boolean;
  needsReviewCount?: number;
}

export function ProductsTableClient({
  products: initialProducts,
  buyerRequests = [],
  initialRequestId = "",
  showNeedsReviewBanner,
  needsReviewCount,
}: Props) {
  const [products, setProducts] = useState<ProductRow[]>(initialProducts);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkPending, setBulkPending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [slideOverProduct, setSlideOverProduct] = useState<ProductRow | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [displaySearch, setDisplaySearch] = useState("");
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  // Image auto-fetch state
  const [enrichingIds, setEnrichingIds] = useState<Set<string>>(new Set());
  const [batchEnriching, setBatchEnriching] = useState(false);

  // Benchmark Matcher state
  const [selectedRequestId, setSelectedRequestId] = useState(initialRequestId);
  const [customBenchmarkText, setCustomBenchmarkText] = useState("");
  const [benchmarkSearching, setBenchmarkSearching] = useState(false);
  const [benchmarkModeActive, setBenchmarkModeActive] = useState(false);
  const [linkingProductId, setLinkingProductId] = useState<string | null>(null);

  useEffect(() => {
    setProducts(initialProducts);
    setBenchmarkModeActive(false);
  }, [initialProducts]);

  useEffect(() => {
    const t = setTimeout(() => setDisplaySearch(searchQuery), 200);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    function handleScroll() {
      setShowBackToTop(window.scrollY > 400);
    }
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!lightboxImage) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightboxImage(null);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [lightboxImage]);

  const activeBuyerRequest = useMemo(
    () => buyerRequests.find((r) => r.id === selectedRequestId) ?? null,
    [buyerRequests, selectedRequestId]
  );

  const filtered = useMemo(() => {
    if (!displaySearch) return products;
    const q = displaySearch.toLowerCase();
    return products.filter(
      (p) =>
        p.product_name.toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q) ||
        (p.category ?? "").toLowerCase().includes(q) ||
        (p.formats ?? []).some((f) => f.toLowerCase().includes(q)) ||
        (p.supplier?.company_name ?? "").toLowerCase().includes(q)
    );
  }, [products, displaySearch]);

  // ── Image Auto-Fetch ────────────────────────────────────────────────────────
  async function handleFetchImagesForIds(ids: string[]) {
    if (ids.length === 0) return;
    setEnrichingIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
    try {
      const res = await fetch("/api/admin/products/enrich-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: ids }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        foundCount?: number;
        updated?: Record<string, string>;
      };
      if (data.ok && data.updated) {
        const map = data.updated;
        setProducts((prev) =>
          prev.map((p) => (map[p.id] ? { ...p, image_url: map[p.id] } : p))
        );
        setToast(
          `✓ Found & saved ${data.foundCount ?? 0} product photo${
            (data.foundCount ?? 0) !== 1 ? "s" : ""
          }`
        );
      } else {
        setToast("No new product photos found on supplier pages");
      }
    } catch {
      setToast("Failed to fetch product photos");
    } finally {
      setEnrichingIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
    }
  }

  async function handleBatchFetchMissingImages() {
    const missingIds = filtered
      .filter((p) => !p.image_url)
      .slice(0, 15)
      .map((p) => p.id);
    if (missingIds.length === 0) {
      setToast("All visible products already have photos!");
      return;
    }
    setBatchEnriching(true);
    await handleFetchImagesForIds(missingIds);
    setBatchEnriching(false);
  }

  // ── Benchmark Matcher ───────────────────────────────────────────────────────
  async function handleRunBenchmarkSearch() {
    if (!selectedRequestId && !customBenchmarkText.trim()) {
      setToast("Select a Buyer Request or enter a benchmark description first");
      return;
    }
    setBenchmarkSearching(true);
    try {
      const res = await fetch("/api/admin/products/match-benchmark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "search_benchmark",
          requestId: selectedRequestId || undefined,
          benchmarkText: customBenchmarkText.trim() || undefined,
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        products?: ProductRow[];
        error?: string;
      };
      if (data.ok && data.products) {
        setProducts(data.products);
        setBenchmarkModeActive(true);
        setToast(`✓ Ranked ${data.products.length} best-matching products for benchmark`);
      } else {
        setToast(data.error ?? "Benchmark search failed");
      }
    } catch {
      setToast("Benchmark search failed");
    } finally {
      setBenchmarkSearching(false);
    }
  }

  async function handleLinkToBuyerRequest(productIds: string[]) {
    if (!selectedRequestId) {
      setToast("Please select a Buyer Request in the Benchmark Matcher bar above first");
      return;
    }
    setLinkingProductId(productIds[0] ?? "bulk");
    try {
      const res = await fetch("/api/admin/products/match-benchmark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "link_to_request",
          requestId: selectedRequestId,
          productIds,
        }),
      });
      const data = (await res.json()) as { ok: boolean; linkedCount?: number; error?: string };
      if (data.ok) {
        setToast(
          `✓ Linked ${data.linkedCount ?? productIds.length} product(s) to Buyer Request!`
        );
        setSelectedIds(new Set());
      } else {
        setToast(data.error ?? "Failed to link product to request");
      }
    } catch {
      setToast("Failed to link product to request");
    } finally {
      setLinkingProductId(null);
    }
  }

  function toggleAll() {
    const allSelected =
      filtered.length > 0 && filtered.every((p) => selectedIds.has(p.id));
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((p) => next.delete(p.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((p) => next.add(p.id));
        return next;
      });
    }
  }

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleBulkKosher(kosherType: string) {
    const ids = [...selectedIds];
    const count = ids.length;
    const label =
      kosherType === "__remove__"
        ? "Remove all kosher"
        : `Add ${kosherType} kosher`;
    if (!confirm(`${label} for ${count} product${count !== 1 ? "s" : ""}?`))
      return;
    setBulkPending(true);
    if (kosherType === "__remove__") {
      await bulkUpdateProducts(ids, { kosher_types: [] });
      setProducts((prev) =>
        prev.map((p) =>
          ids.includes(p.id) ? { ...p, kosher_types: [] } : p
        )
      );
    } else {
      await bulkAddKosher(ids, kosherType);
      setProducts((prev) =>
        prev.map((p) =>
          ids.includes(p.id)
            ? {
                ...p,
                kosher_types: Array.from(
                  new Set([...p.kosher_types, kosherType])
                ),
              }
            : p
        )
      );
    }
    setBulkPending(false);
    setSelectedIds(new Set());
    setToast(`✓ Updated ${count} product${count !== 1 ? "s" : ""}`);
  }

  async function handleBulkCert(cert: string) {
    const ids = [...selectedIds];
    const count = ids.length;
    if (
      !confirm(
        `Add certification "${cert}" to ${count} product${count !== 1 ? "s" : ""}?`
      )
    )
      return;
    setBulkPending(true);
    await bulkAddCertification(ids, cert);
    setProducts((prev) =>
      prev.map((p) =>
        ids.includes(p.id)
          ? {
              ...p,
              certifications: Array.from(
                new Set([...p.certifications, cert])
              ),
            }
          : p
      )
    );
    setBulkPending(false);
    setSelectedIds(new Set());
    setToast(`✓ Updated ${count} product${count !== 1 ? "s" : ""}`);
  }

  async function handleBulkMarkVerifiedAction() {
    const ids = [...selectedIds];
    const count = ids.length;
    if (
      !confirm(
        `Mark ${count} product${count !== 1 ? "s" : ""} as verified?`
      )
    )
      return;
    setBulkPending(true);
    await bulkMarkVerified(ids);
    setProducts((prev) =>
      prev.map((p) =>
        ids.includes(p.id)
          ? { ...p, manually_verified: true, needs_review: false }
          : p
      )
    );
    setBulkPending(false);
    setSelectedIds(new Set());
    setToast(`✓ Verified ${count} product${count !== 1 ? "s" : ""}`);
  }

  async function handleBulkDeleteAction() {
    const ids = [...selectedIds];
    const count = ids.length;
    if (
      !confirm(
        `Delete ${count} product${count !== 1 ? "s" : ""}? This cannot be undone.`
      )
    )
      return;
    setBulkPending(true);
    await bulkDeleteProducts(ids);
    setProducts((prev) => prev.filter((p) => !ids.includes(p.id)));
    setBulkPending(false);
    setSelectedIds(new Set());
    setToast(`✓ Deleted ${count} product${count !== 1 ? "s" : ""}`);
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this product?")) return;
    deleteProduct(id).then((r) => {
      if (r.ok) setProducts((prev) => prev.filter((p) => p.id !== id));
    });
  }

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((p) => selectedIds.has(p.id));
  const someFilteredSelected = filtered.some((p) => selectedIds.has(p.id));

  return (
    <div className="space-y-4">
      {/* ── BENCHMARK & BUYER REQUEST MATCHER PANEL ──────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-orange-600 bg-orange-50 px-2.5 py-1 rounded-md border border-orange-200">
              🎯 Benchmark Matcher
            </span>
            <span className="text-xs text-slate-500">
              Match catalog products against a Buyer Request benchmark or custom specification
            </span>
          </div>
          {selectedRequestId && (
            <div className="flex items-center gap-2">
              <Link
                href={`/admin/requests/${selectedRequestId}`}
                className="text-xs font-semibold text-blue-600 hover:underline"
              >
                View Request & Brief →
              </Link>
              <Link
                href="/admin/matches"
                className="text-xs font-semibold text-slate-600 hover:underline"
              >
                Match Dashboard →
              </Link>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center">
          {/* Buyer Request Selector */}
          <div className="md:col-span-5">
            <select
              value={selectedRequestId}
              onChange={(e) => setSelectedRequestId(e.target.value)}
              className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-200"
            >
              <option value="">— Select Buyer Request (Benchmark) —</option>
              {buyerRequests.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.product_name || "Unnamed Request"} — {r.company || "Buyer"}
                  {r.category ? ` (${r.category})` : ""}
                  {r.kosher && r.kosher !== "none" ? ` · ✡ ${r.kosher}` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Benchmark Specification Input */}
          <div className="md:col-span-5">
            <input
              type="text"
              value={customBenchmarkText}
              onChange={(e) => setCustomBenchmarkText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRunBenchmarkSearch();
              }}
              placeholder="Or type benchmark spec (e.g. Hellmann's Mayonnaise 5kg plastic tub kosher)…"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-200"
            />
          </div>

          {/* Run Benchmark Search Button */}
          <div className="md:col-span-2 flex gap-1.5">
            <button
              type="button"
              onClick={handleRunBenchmarkSearch}
              disabled={benchmarkSearching}
              className="flex-1 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition disabled:opacity-50 whitespace-nowrap"
            >
              {benchmarkSearching ? "Matching…" : "⚡ Rank Matches"}
            </button>
            {benchmarkModeActive && (
              <button
                type="button"
                onClick={() => {
                  setProducts(initialProducts);
                  setBenchmarkModeActive(false);
                }}
                title="Reset to full catalog list"
                className="px-2.5 py-2 text-xs font-medium rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Selected Buyer Request Benchmark Card */}
        {activeBuyerRequest && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-orange-50/60 border border-orange-200/80 text-xs">
            <div className="flex items-center gap-3 min-w-0">
              {activeBuyerRequest.reference_image_urls?.[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={activeBuyerRequest.reference_image_urls[0]}
                  alt="Benchmark"
                  onClick={() =>
                    setLightboxImage(activeBuyerRequest.reference_image_urls![0])
                  }
                  className="w-12 h-12 rounded-lg object-cover border border-orange-200 cursor-pointer shrink-0 bg-white"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center font-bold shrink-0">
                  🎯
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-900">
                    Benchmark: {activeBuyerRequest.product_name}
                  </span>
                  {activeBuyerRequest.company && (
                    <span className="text-slate-500">
                      by {activeBuyerRequest.company}
                    </span>
                  )}
                  {activeBuyerRequest.category && (
                    <span className="px-2 py-0.5 rounded-full bg-white border border-orange-200 text-orange-800 font-medium">
                      {activeBuyerRequest.category}
                    </span>
                  )}
                  {activeBuyerRequest.kosher &&
                    activeBuyerRequest.kosher !== "none" && (
                      <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 font-semibold">
                        ✡ {activeBuyerRequest.kosher}
                      </span>
                    )}
                </div>
                {activeBuyerRequest.notes && (
                  <p className="text-slate-600 truncate max-w-2xl mt-0.5">
                    {activeBuyerRequest.notes}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] text-orange-800 font-medium">
                Click <strong>+ Match</strong> on any product below to link it to this request
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Needs review banner */}
      {showNeedsReviewBanner && (
        <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl text-xs text-orange-800 flex items-center gap-2">
          <span>⚠</span>
          <span>
            {needsReviewCount} product{needsReviewCount !== 1 ? "s" : ""} need
            review — check confidence scores and verify or delete each one
          </span>
        </div>
      )}

      {/* Search + View Toggle + Auto-Fetch Images Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="relative flex-1 min-w-[240px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter visible products by name, format (e.g. 5kg, bottle, jar), or supplier…"
            className="w-full pl-8 pr-8 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 bg-white"
          />
          <span className="absolute left-2.5 top-2 text-slate-400 text-xs pointer-events-none">
            🔍
          </span>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1.5 text-slate-400 hover:text-slate-600 text-base leading-none"
            >
              ×
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleBatchFetchMissingImages}
            disabled={batchEnriching}
            title="Crawls supplier product pages, OpenFoodFacts, and Google Search Grounding to find and save real product photos for products missing images on this page"
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 transition disabled:opacity-50 flex items-center gap-1.5"
          >
            {batchEnriching ? (
              <>
                <span className="w-3 h-3 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                Fetching Photos…
              </>
            ) : (
              "🖼 Auto-Fetch Missing Photos"
            )}
          </button>

          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === "table"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              ☰ Table
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === "grid"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              ⊞ Grid
            </button>
          </div>
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl flex-wrap">
          <span className="text-xs font-semibold text-blue-800">
            {selectedIds.size} selected
          </span>

          {selectedRequestId && (
            <button
              type="button"
              onClick={() => handleLinkToBuyerRequest([...selectedIds])}
              disabled={linkingProductId !== null}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-orange-500 hover:bg-orange-600 text-white transition"
            >
              + Match Selected to Buyer Request
            </button>
          )}

          <button
            type="button"
            onClick={() => handleFetchImagesForIds([...selectedIds])}
            disabled={enrichingIds.size > 0}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition"
          >
            📷 Fetch Photos for Selected
          </button>

          <select
            value=""
            onChange={(e) => {
              if (e.target.value) handleBulkKosher(e.target.value);
            }}
            disabled={bulkPending}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white disabled:opacity-50 outline-none"
          >
            <option value="">Add kosher…</option>
            {KOSHER_OPTIONS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
            <option value="__remove__">Remove all kosher</option>
          </select>

          <select
            value=""
            onChange={(e) => {
              if (e.target.value) handleBulkCert(e.target.value);
            }}
            disabled={bulkPending}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white disabled:opacity-50 outline-none"
          >
            <option value="">Add cert…</option>
            {BULK_CERT_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleBulkMarkVerifiedAction}
            disabled={bulkPending}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 transition"
          >
            ✓ Verify
          </button>

          <button
            type="button"
            onClick={handleBulkDeleteAction}
            disabled={bulkPending}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 transition"
          >
            Delete
          </button>
        </div>
      )}

      {/* ── GRID VIEW ────────────────────────────────────────────────────────── */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((p) => {
            const isEnriching = enrichingIds.has(p.id);
            return (
              <div
                key={p.id}
                onClick={() => setSlideOverProduct(p)}
                className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-2xs hover:shadow-md transition cursor-pointer flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="relative flex items-center justify-center bg-slate-50 rounded-xl h-40 overflow-hidden border border-slate-100 mb-3">
                    {p.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.image_url}
                        alt={p.product_name}
                        onClick={(e) => {
                          e.stopPropagation();
                          setLightboxImage(p.image_url);
                        }}
                        className="w-full h-full object-contain p-2"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <ProductImage
                          imageUrl={null}
                          categoryName={p.category}
                          productName={p.product_name}
                          size={64}
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFetchImagesForIds([p.id]);
                          }}
                          disabled={isEnriching}
                          className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-[11px] font-semibold text-purple-700 hover:bg-purple-50 shadow-2xs"
                        >
                          {isEnriching ? "Searching…" : "📷 Auto-Fetch Photo"}
                        </button>
                      </div>
                    )}
                    {p.benchmarkMatchScore !== undefined && (
                      <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[11px] font-bold shadow-xs">
                        {p.benchmarkMatchScore}% Match
                      </span>
                    )}
                  </div>

                  <p className="font-semibold text-slate-900 text-sm line-clamp-2">
                    {p.product_name}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{p.category}</p>

                  {p.formats?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {p.formats.slice(0, 3).map((fmt) => (
                        <span
                          key={fmt}
                          className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium"
                        >
                          📦 {fmt}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1 mt-2">
                    {p.kosher_types.map((k) => (
                      <span
                        key={k}
                        className="px-1.5 py-0.5 rounded bg-orange-50 text-orange-700 text-[10px] font-semibold"
                      >
                        ✡ {k}
                      </span>
                    ))}
                    {p.certifications.slice(0, 3).map((c) => (
                      <span
                        key={c}
                        className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-medium"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>

                <div
                  className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="min-w-0">
                    <Link
                      href={`/admin/suppliers/${p.supplier_id}`}
                      className="text-xs font-semibold text-blue-600 hover:underline truncate block"
                    >
                      {p.supplier?.company_name
                        ? cleanDisplayName(p.supplier.company_name)
                        : "Supplier"}
                    </Link>
                    <span className="text-[11px] text-slate-400">
                      {p.supplier?.country_of_origin ?? ""}
                    </span>
                  </div>

                  {selectedRequestId && (
                    <button
                      type="button"
                      onClick={() => handleLinkToBuyerRequest([p.id])}
                      disabled={linkingProductId === p.id}
                      className="px-2.5 py-1 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold shrink-0"
                    >
                      + Match
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── TABLE VIEW ─────────────────────────────────────────────────────── */
        <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-x-auto">
          <table className="w-full min-w-275 text-xs">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-3 py-3 w-8">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    ref={(el) => {
                      if (el)
                        el.indeterminate =
                          someFilteredSelected && !allFilteredSelected;
                    }}
                    onChange={toggleAll}
                    className="rounded"
                  />
                </th>
                {[
                  "Photo",
                  "Product & Description",
                  "Formats / Packaging",
                  "Category",
                  "Supplier",
                  "Kosher & Certs",
                  "Conf",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((p) => {
                const isEnriching = enrichingIds.has(p.id);
                return (
                  <tr
                    key={p.id}
                    onClick={() => setSlideOverProduct(p)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td
                      className="px-3 py-2.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(p.id)}
                        onChange={() => toggle(p.id)}
                        className="rounded"
                      />
                    </td>

                    {/* Photo */}
                    <td
                      className="px-3 py-2.5"
                      onClick={(e) => {
                        if (p.image_url) {
                          e.stopPropagation();
                          setLightboxImage(p.image_url);
                        }
                      }}
                    >
                      <div className="relative group w-14 h-14">
                        <ProductImage
                          imageUrl={p.image_url}
                          categoryName={p.category}
                          productName={p.product_name}
                          size={56}
                        />
                        {!p.image_url && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFetchImagesForIds([p.id]);
                            }}
                            disabled={isEnriching}
                            title="Auto-fetch product photo from supplier website / OpenFoodFacts / Google Search"
                            className="absolute inset-0 bg-slate-900/75 text-white rounded-lg opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-[10px] font-semibold text-center p-1"
                          >
                            {isEnriching ? "…" : "📷 Fetch"}
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Product & Description */}
                    <td className="px-3 py-2.5 max-w-64">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-slate-900 text-xs">
                          {p.product_name}
                        </span>
                        {p.benchmarkMatchScore !== undefined && (
                          <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            {p.benchmarkMatchScore}% Match
                          </span>
                        )}
                        {p.private_label && (
                          <span
                            title="Available for Private Label"
                            className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-medium"
                          >
                            PL
                          </span>
                        )}
                        {p.manually_verified && (
                          <span
                            title="Manually Verified"
                            className="text-green-600 font-bold"
                          >
                            ✓
                          </span>
                        )}
                        {p.needs_review && (
                          <span className="text-[10px] bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded-full">
                            review
                          </span>
                        )}
                      </div>
                      {p.description && (
                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                          {p.description}
                        </p>
                      )}
                    </td>

                    {/* Formats / Packaging */}
                    <td className="px-3 py-2.5 max-w-48">
                      {p.formats && p.formats.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {p.formats.slice(0, 3).map((fmt) => (
                            <span
                              key={fmt}
                              className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium"
                            >
                              {fmt}
                            </span>
                          ))}
                          {p.formats.length > 3 && (
                            <span className="text-[10px] text-slate-400">
                              +{p.formats.length - 3}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>

                    {/* Category */}
                    <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">
                      {p.category}
                    </td>

                    {/* Supplier */}
                    <td
                      className="px-3 py-2.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-2">
                        {p.supplier?.logo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.supplier.logo_url}
                            alt=""
                            className="w-6 h-6 rounded-full object-contain border border-slate-200 bg-white shrink-0"
                          />
                        ) : null}
                        <div className="min-w-0">
                          <Link
                            href={`/admin/suppliers/${p.supplier_id}`}
                            className="text-xs text-blue-600 hover:underline font-semibold truncate block max-w-44"
                          >
                            {p.supplier?.company_name
                              ? cleanDisplayName(p.supplier.company_name)
                              : "—"}
                          </Link>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                            {p.supplier?.country_of_origin && (
                              <span>{p.supplier.country_of_origin}</span>
                            )}
                            {p.supplier?.website && (
                              <a
                                href={p.supplier.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-slate-400 hover:text-blue-600"
                                title={p.supplier.website}
                              >
                                ↗
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Kosher & Certs */}
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {p.kosher_types.length > 0 && (
                          <span className="text-[10px] bg-orange-50 text-orange-700 border border-orange-200 rounded-full px-2 py-0.5 font-semibold">
                            ✡{" "}
                            {p.kosher_types[0]
                              .replace("Chief Rabbinate", "CR")
                              .replace("Badatz Beit Yosef", "BY")
                              .replace("Badatz Eida Chareidis", "EC")}
                          </span>
                        )}
                        {p.certifications.slice(0, 2).map((c) => (
                          <span
                            key={c}
                            className="text-[10px] bg-slate-100 text-slate-600 rounded-full px-1.5 py-0.5 font-medium"
                          >
                            {c.slice(0, 10)}
                          </span>
                        ))}
                        {p.certifications.length > 2 && (
                          <span className="text-[10px] text-slate-400">
                            +{p.certifications.length - 2}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Confidence */}
                    <td className="px-3 py-2.5">
                      <ConfidenceBar score={p.scrape_confidence} />
                    </td>

                    {/* Actions */}
                    <td
                      className="px-3 py-2.5 whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-1.5">
                        {selectedRequestId && (
                          <button
                            type="button"
                            onClick={() => handleLinkToBuyerRequest([p.id])}
                            disabled={linkingProductId === p.id}
                            title="Link this product & supplier to the selected Buyer Request"
                            className="px-2 py-1 rounded-md bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-semibold transition"
                          >
                            + Match
                          </button>
                        )}
                        {!p.image_url && (
                          <button
                            type="button"
                            onClick={() => handleFetchImagesForIds([p.id])}
                            disabled={isEnriching}
                            title="Auto-fetch product photo"
                            className="px-1.5 py-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs"
                          >
                            {isEnriching ? "…" : "📷"}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setSlideOverProduct(p)}
                          className="px-1.5 py-1 text-slate-400 hover:text-slate-700 transition"
                          title="Edit product"
                        >
                          ✏
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(p.id)}
                          className="text-[11px] text-red-400 hover:text-red-600 px-1"
                        >
                          Del
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit slide-over */}
      {slideOverProduct && (
        <ProductEditSlideOver
          product={slideOverProduct}
          onClose={() => setSlideOverProduct(null)}
          onSave={(updated) => {
            setProducts((prev) =>
              prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
            );
            setSlideOverProduct(null);
          }}
          onDelete={(id) => {
            setProducts((prev) => prev.filter((p) => p.id !== id));
            setSlideOverProduct(null);
          }}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 bg-slate-900 text-white text-xs font-medium px-4 py-2.5 rounded-xl shadow-lg z-50">
          {toast}
        </div>
      )}

      {/* Back to top */}
      {showBackToTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Back to top"
          className="fixed bottom-6 right-6 flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg transition hover:opacity-90 z-40"
        >
          ↑
        </button>
      )}

      {/* Image lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 bg-black/75 flex items-center justify-center z-50"
          onClick={() => setLightboxImage(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxImage}
            alt=""
            className="max-w-[85vw] max-h-[85vh] object-contain rounded-xl bg-white p-2"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
