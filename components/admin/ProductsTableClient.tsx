"use client";

import { useState, useEffect, useMemo } from "react";
import {
  deleteProduct,
  bulkUpdateProducts,
  bulkDeleteProducts,
  bulkAddKosher,
  bulkAddCertification,
  bulkMarkVerified,
} from "@/app/admin/products/actions";
import ProductEditSlideOver from "@/components/admin/ProductEditSlideOver";

type ProductRow = {
  id: string;
  product_name: string;
  category: string;
  certifications: string[];
  kosher_types: string[];
  formats: string[];
  description: string | null;
  needs_review: boolean;
  scrape_confidence: number;
  manually_verified: boolean;
  private_label: boolean;
  supplier_id: string;
  supplier: {
    company_name: string;
    country_of_origin: string | null;
    status: string | null;
  } | null;
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

function ConfidenceBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color =
    score >= 0.8
      ? "bg-green-500"
      : score >= 0.5
      ? "bg-orange-400"
      : "bg-red-400";
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1.5 w-14 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-400">{pct}%</span>
    </div>
  );
}

function completenessScore(p: ProductRow): number {
  let s = 0;
  if (p.product_name) s += 20;
  if (p.category) s += 20;
  if ((p.kosher_types ?? []).length > 0) s += 20;
  if ((p.formats ?? []).length > 0) s += 15;
  if ((p.certifications ?? []).length > 0) s += 15;
  if (p.description) s += 10;
  return s;
}

function CompletenessBar({ score }: { score: number }) {
  const color =
    score >= 80 ? "bg-green-500" : score >= 50 ? "bg-orange-400" : "bg-red-400";
  const textColor =
    score >= 80
      ? "text-green-700"
      : score >= 50
      ? "text-orange-600"
      : "text-red-500";
  return (
    <div>
      <span className={`text-xs font-medium ${textColor}`}>{score}%</span>
      <div className="h-1 w-14 bg-gray-100 rounded-full mt-0.5 overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

interface Props {
  products: ProductRow[];
  showNeedsReviewBanner?: boolean;
  needsReviewCount?: number;
}

export function ProductsTableClient({
  products: initialProducts,
  showNeedsReviewBanner,
  needsReviewCount,
}: Props) {
  const [products, setProducts] = useState<ProductRow[]>(initialProducts);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkPending, setBulkPending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [slideOverProduct, setSlideOverProduct] = useState<ProductRow | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [displaySearch, setDisplaySearch] = useState("");

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDisplaySearch(searchQuery), 200);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  // Filtered list (search applied client-side on top of server-filtered data)
  const filtered = useMemo(
    () =>
      !displaySearch
        ? products
        : products.filter(
            (p) =>
              p.product_name
                .toLowerCase()
                .includes(displaySearch.toLowerCase()) ||
              (p.supplier?.company_name ?? "")
                .toLowerCase()
                .includes(displaySearch.toLowerCase())
          ),
    [products, displaySearch]
  );

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
      next.has(id) ? next.delete(id) : next.add(id);
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
    <>
      {/* Needs review banner */}
      {showNeedsReviewBanner && (
        <div className="mb-3 p-3 bg-orange-50 border border-orange-200 rounded-xl text-sm text-orange-800 flex items-center gap-2">
          <span>⚠</span>
          <span>
            {needsReviewCount} product{needsReviewCount !== 1 ? "s" : ""} need
            review — check confidence scores and verify or delete each one
          </span>
        </div>
      )}

      {/* Search box */}
      <div className="relative mb-3">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search products or suppliers..."
          className="w-full pl-8 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-200 bg-white"
        />
        <span className="absolute left-2.5 top-2 text-gray-400 text-sm pointer-events-none">
          🔍
        </span>
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-2.5 top-1.5 text-gray-400 hover:text-gray-600 text-lg leading-none"
          >
            ×
          </button>
        )}
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 mb-3 p-3 bg-blue-50 border border-blue-200 rounded-xl flex-wrap">
          <span className="text-sm font-medium text-blue-800">
            {selectedIds.size} selected
          </span>

          <select
            value=""
            onChange={(e) => {
              if (e.target.value) handleBulkKosher(e.target.value);
            }}
            disabled={bulkPending}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white disabled:opacity-50 outline-none"
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
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white disabled:opacity-50 outline-none"
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
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-green-500 hover:bg-green-600 text-white disabled:opacity-50 transition"
          >
            Mark verified
          </button>

          <button
            type="button"
            onClick={handleBulkDeleteAction}
            disabled={bulkPending}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 transition"
          >
            Delete
          </button>

          {bulkPending && (
            <span className="text-xs text-blue-500 flex items-center gap-1">
              <span className="inline-block w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              Working…
            </span>
          )}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
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
                "Supplier",
                "Product",
                "Category",
                "Kosher",
                "Certs",
                "Conf",
                "Complete",
                "Verified",
                "",
              ].map((h) => (
                <th
                  key={h}
                  className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(p.id)}
                    onChange={() => toggle(p.id)}
                    className="rounded"
                  />
                </td>
                <td className="px-3 py-2.5">
                  <a
                    href={`/admin/suppliers/${p.supplier_id}`}
                    className="text-xs text-blue-600 hover:underline font-medium"
                  >
                    {p.supplier?.company_name ?? "—"}
                  </a>
                  {p.supplier?.country_of_origin && (
                    <span className="block text-xs text-gray-400">
                      {p.supplier.country_of_origin}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <span className="font-medium text-gray-900">
                    {p.product_name}
                  </span>
                  {p.needs_review && (
                    <span className="ml-1.5 text-xs bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded-full">
                      review
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-xs text-gray-600">
                  {p.category}
                </td>
                <td className="px-3 py-2.5">
                  {p.kosher_types.length > 0 ? (
                    <span className="text-xs bg-orange-50 text-orange-700 rounded-full px-2 py-0.5">
                      ✡{" "}
                      {p.kosher_types[0]
                        .replace("Chief Rabbinate", "CR")
                        .replace("Badatz Beit Yosef", "BY")
                        .replace("Badatz Eida Chareidis", "EC")}
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex flex-wrap gap-1">
                    {p.certifications.slice(0, 2).map((c) => (
                      <span
                        key={c}
                        className="text-xs bg-slate-100 text-slate-600 rounded-full px-1.5 py-0.5"
                      >
                        {c.slice(0, 8)}
                      </span>
                    ))}
                    {p.certifications.length > 2 && (
                      <span className="text-xs text-gray-400">
                        +{p.certifications.length - 2}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <ConfidenceBar score={p.scrape_confidence} />
                </td>
                <td className="px-3 py-2.5">
                  <CompletenessBar score={completenessScore(p)} />
                </td>
                <td className="px-3 py-2.5">
                  {p.manually_verified ? (
                    <span className="text-green-600 text-xs font-medium">
                      ✓
                    </span>
                  ) : (
                    <span className="text-gray-300 text-xs">○</span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSlideOverProduct(p)}
                      className="text-gray-400 hover:text-gray-600 transition"
                      title="Edit"
                    >
                      ✏
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(p.id)}
                      className="text-xs text-red-400 hover:text-red-600"
                    >
                      Del
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit slide-over */}
      {slideOverProduct && (
        <ProductEditSlideOver
          product={slideOverProduct}
          onClose={() => setSlideOverProduct(null)}
          onSave={(updated) => {
            setProducts((prev) =>
              prev.map((p) => (p.id === updated.id ? updated : p))
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
        <div className="fixed bottom-4 right-4 bg-slate-800 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg z-50">
          {toast}
        </div>
      )}
    </>
  );
}
