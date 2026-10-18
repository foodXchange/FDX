"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { bulkUpdateSupplierStatus } from "@/app/admin/suppliers/actions";
import SupplierRowActions from "@/components/admin/SupplierRowActions";
import TrustScoreBadge from "@/components/admin/TrustScoreBadge";
import ImpersonateButton from "@/components/admin/ImpersonateButton";
import { getInitials, avatarColors } from "@/lib/admin/avatarPalette";

type SortColumn = "company" | "country" | "products" | "categories" | "certs" | "score";
type SortDirection = "asc" | "desc";

const SORTABLE_COLUMNS: Partial<Record<string, SortColumn>> = {
  Company: "company",
  Country: "country",
  Products: "products",
  Categories: "categories",
  Certs: "certs",
  Score: "score",
};

const HEADER_MIN_WIDTHS: Record<string, string> = {
  Logo: "w-14",
  Company: "min-w-[240px]",
  Country: "min-w-[120px]",
  Products: "min-w-[100px]",
  Categories: "min-w-[200px]",
  Certs: "min-w-[140px]",
  Contact: "min-w-[110px]",
  Qual: "min-w-[110px]",
  Status: "min-w-[110px]",
  Score: "min-w-[90px]",
  Actions: "min-w-[120px]",
};

export type SupplierRow = {
  id: string;
  company_name: string;
  website?: string | null;
  logo_url: string | null;
  country_of_origin: string | null;
  categories: string[] | null;
  certifications: string[] | null;
  kosher_status?: string | null;
  status: string | null;
  priority: number | null;
  verified: boolean | null;
  product_type: string | null;
  private_label?: boolean | null;
  product_count?: number | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  linkedin_url?: string | null;
  scrape_status?: string | null;
  markets_served: string[] | null;
  qualification_status: string | null;
  trust_score: number | null;
  supplier_contacts?: { id: string }[];
  supplier_documents?: { id: string }[];
};

function SupplierLogoCell({
  logoUrl,
  companyName,
  onPreview,
}: {
  logoUrl: string | null;
  companyName: string;
  onPreview: (url: string) => void;
}) {
  const [failed, setFailed] = useState(false);
  const { bg, text } = avatarColors(companyName);

  if (logoUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={companyName}
        onError={() => setFailed(true)}
        onClick={(e) => {
          e.stopPropagation();
          onPreview(logoUrl);
        }}
        className="w-10 h-10 rounded-xl object-contain bg-white border border-gray-200 p-1 cursor-pointer hover:scale-105 transition shadow-2xs"
      />
    );
  }

  return (
    <div
      className={`w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center text-xs font-bold ${bg} ${text}`}
    >
      {getInitials(companyName)}
    </div>
  );
}

export function SuppliersTableClient({
  suppliers,
}: {
  suppliers: SupplierRow[];
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [statusValue, setStatusValue] = useState("");
  const [pending, setPending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    setSelectedIds(new Set());
  }, [suppliers]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!lightboxImage) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightboxImage(null);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [lightboxImage]);

  const allSelected =
    suppliers.length > 0 &&
    suppliers.every((supplier) => selectedIds.has(supplier.id));

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

  function handleSort(column: SortColumn) {
    if (sortColumn === column) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  }

  const sortedSuppliers = useMemo(() => {
    if (!sortColumn) return suppliers;
    const dir = sortDirection === "asc" ? 1 : -1;
    return [...suppliers].sort((a, b) => {
      switch (sortColumn) {
        case "company":
          return dir * a.company_name.localeCompare(b.company_name);
        case "country":
          return (
            dir *
            (a.country_of_origin ?? "").localeCompare(
              b.country_of_origin ?? ""
            )
          );
        case "products":
          return dir * ((a.product_count ?? 0) - (b.product_count ?? 0));
        case "categories":
          return (
            dir * ((a.categories?.length ?? 0) - (b.categories?.length ?? 0))
          );
        case "certs":
          return (
            dir *
            ((a.certifications?.length ?? 0) - (b.certifications?.length ?? 0))
          );
        case "score":
          return dir * ((a.trust_score ?? 0) - (b.trust_score ?? 0));
      }
    });
  }, [suppliers, sortColumn, sortDirection]);

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
        <div className="mb-4 rounded-2xl bg-orange-50 border border-orange-200 px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-bold text-orange-900">
              ✓ {selectedIds.size} supplier{selectedIds.size !== 1 ? "s" : ""}{" "}
              selected
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <label className="block text-sm text-slate-600">
                <span className="sr-only">Set supplier status</span>
                <select
                  value={statusValue}
                  onChange={(event) => setStatusValue(event.target.value)}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 outline-none transition focus:border-orange-400"
                >
                  <option value="">Set status…</option>
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="closed">Archived / Closed</option>
                </select>
              </label>
              <button
                type="button"
                onClick={handleApplyStatus}
                disabled={pending || !statusValue}
                className="inline-flex items-center justify-center rounded-xl bg-orange-500 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Apply
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl overflow-x-auto shadow-xs">
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
                "Logo",
                "Company",
                "Country",
                "Products",
                "Categories",
                "Certs",
                "Contact",
                "Qual",
                "Status",
                "Score",
                "Actions",
              ].map((header) => {
                const sortKey = SORTABLE_COLUMNS[header];
                const isActive =
                  sortKey !== undefined && sortColumn === sortKey;
                return (
                  <th
                    key={header}
                    onClick={sortKey ? () => handleSort(sortKey) : undefined}
                    className={`px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider group ${
                      HEADER_MIN_WIDTHS[header] ?? ""
                    } ${
                      header === "Company"
                        ? "sticky left-0 z-10 bg-gray-50 border-r border-gray-200"
                        : ""
                    } ${sortKey ? "cursor-pointer select-none" : ""}`}
                  >
                    <span className="inline-flex items-center gap-1">
                      {header}
                      {sortKey && (
                        <span
                          className={
                            isActive
                              ? "text-orange-600"
                              : "text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
                          }
                        >
                          {isActive
                            ? sortDirection === "asc"
                              ? "↑"
                              : "↓"
                            : "↕"}
                        </span>
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedSuppliers.map((supplier) => {
              const prodCount = supplier.product_count ?? 0;
              const qual = supplier.qualification_status ?? "empty";
              const effStatus = supplier.status ?? "approved";
              const hasContacts =
                !!supplier.contact_email ||
                !!supplier.contact_phone ||
                (supplier.supplier_contacts?.length ?? 0) > 0;

              return (
                <tr
                  key={supplier.id}
                  onClick={() => router.push(`/admin/suppliers/${supplier.id}`)}
                  className="group cursor-pointer hover:bg-orange-50/20 transition-colors"
                >
                  <td
                    className="px-4 py-3"
                    onClick={(e) => e.stopPropagation()}
                  >
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

                  {/* Logo */}
                  <td className="px-4 py-3">
                    <SupplierLogoCell
                      logoUrl={supplier.logo_url}
                      companyName={supplier.company_name}
                      onPreview={(url) => setLightboxImage(url)}
                    />
                  </td>

                  {/* Company + Website */}
                  <td className="px-4 py-3 sticky left-0 z-10 bg-white border-r border-gray-200 group-hover:bg-orange-50/20 transition-colors">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-gray-900 text-sm">
                          {supplier.company_name}
                        </span>
                        {(supplier.verified || effStatus === "approved") && (
                          <span
                            className="text-emerald-600 text-xs font-bold"
                            title="Approved & Verified Manufacturer"
                          >
                            ✓
                          </span>
                        )}
                        {supplier.private_label && (
                          <span className="text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded">
                            PL
                          </span>
                        )}
                      </div>
                      {supplier.website && (
                        <a
                          href={
                            supplier.website.startsWith("http")
                              ? supplier.website
                              : `https://${supplier.website}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs text-gray-400 hover:text-orange-600 hover:underline truncate max-w-[220px]"
                        >
                          {supplier.website
                            .replace(/^https?:\/\/(www\.)?/, "")
                            .replace(/\/$/, "")}{" "}
                          ↗
                        </a>
                      )}
                    </div>
                  </td>

                  {/* Country */}
                  <td className="px-4 py-3 text-xs font-medium text-gray-700">
                    {supplier.country_of_origin ?? "—"}
                  </td>

                  {/* Products Count */}
                  <td
                    className="px-4 py-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {prodCount > 0 ? (
                      <Link
                        href={`/admin/products?q=${encodeURIComponent(
                          supplier.company_name
                        )}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition"
                      >
                        📦 {prodCount}
                      </Link>
                    ) : (
                      <span className="text-xs text-gray-300">0</span>
                    )}
                  </td>

                  {/* Categories */}
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap max-w-[220px]">
                      {(supplier.categories ?? []).slice(0, 2).map((cat) => (
                        <span
                          key={cat}
                          className="text-[11px] bg-slate-100 text-slate-700 rounded-full px-2 py-0.5 truncate max-w-[160px]"
                        >
                          {cat}
                        </span>
                      ))}
                      {(supplier.categories?.length ?? 0) > 2 && (
                        <span className="text-[11px] text-gray-400 font-medium">
                          +{(supplier.categories?.length ?? 0) - 2}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Certifications + Kosher */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 flex-wrap">
                      {supplier.kosher_status &&
                        supplier.kosher_status !== "none" &&
                        supplier.kosher_status !== "unknown" && (
                          <span className="text-[11px] bg-amber-50 text-amber-800 border border-amber-200 rounded-full px-2 py-0.5 font-medium">
                            ✡ Kosher
                          </span>
                        )}
                      {(supplier.certifications?.length ?? 0) > 0 ? (
                        <span
                          title={(supplier.certifications ?? []).join(", ")}
                          className="text-[11px] bg-orange-50 text-orange-700 border border-orange-200 rounded-full px-2 py-0.5 font-medium"
                        >
                          {supplier.certifications?.length} certs
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </div>
                  </td>

                  {/* Contact channels */}
                  <td className="px-4 py-3">
                    {hasContacts ? (
                      <div className="flex items-center gap-1.5 text-xs">
                        {supplier.contact_email && (
                          <span
                            title={supplier.contact_email}
                            className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px]"
                          >
                            ✉
                          </span>
                        )}
                        {supplier.contact_phone && (
                          <span
                            title={supplier.contact_phone}
                            className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[11px]"
                          >
                            📞
                          </span>
                        )}
                        {supplier.linkedin_url && (
                          <span
                            title="LinkedIn"
                            className="px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200 text-[11px] font-bold"
                          >
                            in
                          </span>
                        )}
                        {(supplier.supplier_contacts?.length ?? 0) > 0 && (
                          <span className="text-[11px] text-gray-500">
                            +{supplier.supplier_contacts?.length}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>

                  {/* Qualification */}
                  <td className="px-4 py-3">
                    <span
                      className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                        qual === "strong"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : qual === "thin"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-gray-100 text-gray-500 border-gray-200"
                      }`}
                    >
                      {qual === "strong"
                        ? "★ Strong"
                        : qual === "thin"
                        ? "Review"
                        : "Empty"}
                    </span>
                  </td>

                  {/* Status (Auto-Approved) */}
                  <td className="px-4 py-3">
                    <span
                      className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                        effStatus === "approved" || effStatus === "active"
                          ? "bg-green-100 text-green-700"
                          : effStatus === "pending"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {effStatus === "approved" ? "✓ Approved" : effStatus}
                    </span>
                  </td>

                  {/* Trust Score */}
                  <td className="px-4 py-3">
                    <TrustScoreBadge score={supplier.trust_score} />
                  </td>

                  {/* Actions */}
                  <td
                    className="px-4 py-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-2">
                      <ImpersonateButton
                        kind="supplier"
                        id={supplier.id}
                        label="View as"
                      />
                      <SupplierRowActions id={supplier.id} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {toast && (
        <div className="mt-4 rounded-2xl bg-slate-900 px-4 py-3 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}

      {/* Image lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setLightboxImage(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxImage}
            alt="Supplier Logo"
            className="max-w-[80vw] max-h-[80vh] object-contain bg-white p-4 rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
