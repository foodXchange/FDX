"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { bulkUpdateSupplierStatus } from "@/app/admin/suppliers/actions";
import SupplierRowActions from "@/components/admin/SupplierRowActions";

const HEADER_MIN_WIDTHS: Record<string, string> = {
  Company: "min-w-[220px]",
  Country: "min-w-[120px]",
  Categories: "min-w-[200px]",
  Certs: "min-w-[110px]",
  Type: "min-w-[130px]",
  Markets: "min-w-[170px]",
  Qual: "min-w-[110px]",
  Status: "min-w-[110px]",
  Prio: "min-w-[80px]",
  Actions: "min-w-[120px]",
};

type SupplierRow = {
  id: string;
  company_name: string;
  country_of_origin: string | null;
  categories: string[] | null;
  certifications: string[] | null;
  status: string | null;
  priority: number | null;
  verified: boolean | null;
  product_type: string | null;
  markets_served: string[] | null;
  qualification_status: string | null;
};

export function SuppliersTableClient({
  suppliers,
}: {
  suppliers: SupplierRow[];
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [statusValue, setStatusValue] = useState("");
  const [pending, setPending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    setSelectedIds(new Set());
  }, [suppliers]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(timer);
  }, [toast]);

  const allSelected =
    suppliers.length > 0 && suppliers.every((supplier) => selectedIds.has(supplier.id));

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(suppliers.map((supplier) => supplier.id)));
  }

  function toggleRow(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleApplyStatus() {
    if (selectedIds.size === 0 || !statusValue) return;
    setPending(true);
    const ids = [...selectedIds];
    const result = await bulkUpdateSupplierStatus(ids, statusValue);
    setPending(false);

    if (!result.ok) {
      setToast(result.error ?? "Failed to update suppliers");
      return;
    }

    setToast(`✓ Updated ${ids.length} supplier${ids.length !== 1 ? "s" : ""}`);
    setStatusValue("");
    setSelectedIds(new Set());
    router.refresh();
  }

  return (
    <>
      {selectedIds.size > 0 && (
        <div className="mb-4 rounded-3xl bg-amber-50 border border-amber-200 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-amber-900">
              {selectedIds.size} selected
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <label className="block text-sm text-slate-600">
                <span className="sr-only">Set supplier status</span>
                <select
                  value={statusValue}
                  onChange={(event) => setStatusValue(event.target.value)}
                  className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                >
                  <option value="">Set status…</option>
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="sent">Sent</option>
                  <option value="responded">Responded</option>
                  <option value="closed">Closed</option>
                </select>
              </label>
              <button
                type="button"
                onClick={handleApplyStatus}
                disabled={pending || !statusValue}
                className="inline-flex items-center justify-center rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl overflow-x-auto shadow-sm">
        <table className="w-full text-sm min-w-max">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                />
              </th>
              {[
                "Company",
                "Country",
                "Categories",
                "Certs",
                "Type",
                "Markets",
                "Qual",
                "Status",
                "Prio",
                "Actions",
              ].map((header) => (
                <th
                  key={header}
                  className={`px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider ${
                    HEADER_MIN_WIDTHS[header] ?? ""
                  } ${
                    header === "Company"
                      ? "sticky left-0 z-10 bg-gray-50 border-r border-gray-200"
                      : ""
                  }`}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {suppliers.map((supplier) => (
                <tr key={supplier.id} className="group hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(supplier.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleRow(supplier.id);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                    />
                  </td>
                  <td className="px-4 py-3 sticky left-0 z-10 bg-white border-r border-gray-200 group-hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 text-sm">
                        {supplier.company_name}
                      </span>
                      {supplier.verified && (
                        <span
                          className="text-green-500 text-xs font-bold"
                          title="Verified"
                        >
                          ✓
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {supplier.country_of_origin ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {(supplier.categories ?? []).slice(0, 2).map((category) => (
                        <span
                          key={category}
                          className="text-xs bg-slate-100 text-slate-600 rounded-full px-2 py-0.5"
                        >
                          {category}
                        </span>
                      ))}
                      {(supplier.categories?.length ?? 0) > 2 && (
                        <span className="text-xs text-gray-400">
                          +{(supplier.categories?.length ?? 0) - 2}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-orange-50 text-orange-700 border border-orange-200 rounded-full px-2 py-0.5">
                      {supplier.certifications?.length ?? 0} certs
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {supplier.product_type ?? "Unknown"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {(supplier.markets_served ?? []).slice(0, 2).map((market) => (
                        <span
                          key={market}
                          className="text-xs text-gray-500 border border-gray-200 rounded-full px-2 py-0.5"
                        >
                          {market}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                      {supplier.qualification_status ?? "empty"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                      {supplier.status ?? "pending"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {supplier.priority ?? 0}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <SupplierRowActions id={supplier.id} />
                    </div>
                  </td>
                </tr>
            ))}
          </tbody>
        </table>
      </div>

      {toast && (
        <div className="mt-4 rounded-3xl bg-slate-900 px-4 py-3 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </>
  );
}
