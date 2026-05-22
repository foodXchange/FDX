"use client";

import { useState, useTransition } from "react";
import { deleteProduct, bulkUpdateProducts, bulkDeleteProducts } from "@/app/admin/products/actions";

type ProductRow = {
  id: string;
  product_name: string;
  category: string;
  certifications: string[];
  kosher_types: string[];
  formats: string[];
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

function ConfidenceBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color =
    score >= 0.8 ? "bg-green-500" : score >= 0.5 ? "bg-orange-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1.5 w-14 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-400">{pct}%</span>
    </div>
  );
}

const BULK_KOSHER_OPTIONS = [
  "Add Chief Rabbinate kosher",
  "Add Badatz Beit Yosef kosher",
  "Add Mehadrin kosher",
  "Mark all as verified",
  "Delete selected",
];

export function ProductsTableClient({ products: initialProducts }: { products: ProductRow[] }) {
  const [products, setProducts] = useState<ProductRow[]>(initialProducts);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState("");
  const [pending, startTransition] = useTransition();

  function toggleAll() {
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map((p) => p.id)));
    }
  }

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function applyBulk() {
    if (!bulkAction || selectedIds.size === 0) return;

    const ids = Array.from(selectedIds);

    if (!confirm(`Apply "${bulkAction}" to ${ids.length} selected products?`)) return;

    startTransition(async () => {
      if (bulkAction === "Delete selected") {
        await bulkDeleteProducts(ids);
        setProducts((prev) => prev.filter((p) => !ids.includes(p.id)));
        setSelectedIds(new Set());
      } else if (bulkAction === "Mark all as verified") {
        await bulkUpdateProducts(ids, { manually_verified: true });
        setProducts((prev) =>
          prev.map((p) => (ids.includes(p.id) ? { ...p, manually_verified: true } : p))
        );
      } else if (bulkAction.includes("Chief Rabbinate")) {
        await bulkUpdateProducts(ids, { kosher_types: ["Chief Rabbinate"] });
        setProducts((prev) =>
          prev.map((p) =>
            ids.includes(p.id)
              ? { ...p, kosher_types: Array.from(new Set([...p.kosher_types, "Chief Rabbinate"])) }
              : p
          )
        );
      } else if (bulkAction.includes("Badatz Beit Yosef")) {
        await bulkUpdateProducts(ids, { kosher_types: ["Badatz Beit Yosef"] });
        setProducts((prev) =>
          prev.map((p) =>
            ids.includes(p.id)
              ? { ...p, kosher_types: Array.from(new Set([...p.kosher_types, "Badatz Beit Yosef"])) }
              : p
          )
        );
      } else if (bulkAction.includes("Mehadrin")) {
        await bulkUpdateProducts(ids, { kosher_types: ["Mehadrin"] });
        setProducts((prev) =>
          prev.map((p) =>
            ids.includes(p.id)
              ? { ...p, kosher_types: Array.from(new Set([...p.kosher_types, "Mehadrin"])) }
              : p
          )
        );
      }
      setBulkAction("");
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this product?")) return;
    startTransition(async () => {
      await deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    });
  }

  return (
    <>
      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 mb-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <span className="text-sm text-slate-600">
            {selectedIds.size} selected
          </span>
          <select
            value={bulkAction}
            onChange={(e) => setBulkAction(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none"
          >
            <option value="">— Bulk action —</option>
            {BULK_KOSHER_OPTIONS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <button
            onClick={applyBulk}
            disabled={!bulkAction || pending}
            className={`px-3 py-1.5 text-sm rounded-lg disabled:opacity-50 ${
              bulkAction === "Delete selected"
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-slate-700 hover:bg-slate-800 text-white"
            }`}
          >
            Apply
          </button>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-3 py-3 w-8">
                <input
                  type="checkbox"
                  checked={selectedIds.size === products.length && products.length > 0}
                  onChange={toggleAll}
                  className="rounded"
                />
              </th>
              {["Supplier", "Product", "Category", "Kosher", "Certs", "Conf", "Verified", ""].map(
                (h) => (
                  <th
                    key={h}
                    className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {products.map((p) => (
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
                  <span className="font-medium text-gray-900">{p.product_name}</span>
                </td>
                <td className="px-3 py-2.5 text-xs text-gray-600">{p.category}</td>
                <td className="px-3 py-2.5">
                  {p.kosher_types.length > 0 ? (
                    <span className="text-xs bg-orange-50 text-orange-700 rounded-full px-2 py-0.5">
                      ✡ {p.kosher_types[0].replace("Chief Rabbinate", "CR").replace("Badatz Beit Yosef", "BY")}
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex flex-wrap gap-1">
                    {p.certifications.slice(0, 3).map((c) => (
                      <span key={c} className="text-xs bg-slate-100 text-slate-600 rounded-full px-1.5 py-0.5">
                        {c}
                      </span>
                    ))}
                    {p.certifications.length > 3 && (
                      <span className="text-xs text-gray-400">+{p.certifications.length - 3}</span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <ConfidenceBar score={p.scrape_confidence} />
                </td>
                <td className="px-3 py-2.5">
                  {p.manually_verified ? (
                    <span className="text-green-600 text-xs font-medium">✓</span>
                  ) : (
                    <span className="text-gray-300 text-xs">○</span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="text-xs text-red-400 hover:text-red-600"
                  >
                    Del
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
