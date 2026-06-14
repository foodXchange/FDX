"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { CatalogueProduct } from "@/app/admin/catalogue/actions";
import {
  linkCatalogueProductToRequest,
  duplicateCatalogueProduct,
} from "@/app/admin/catalogue/actions";

type OpenRequest = {
  id: string;
  product_name: string | null;
  company: string | null;
};

interface Props {
  products: CatalogueProduct[];
  openRequests: OpenRequest[];
  linkedCounts: Record<string, number>;
}

const TABS = ["all", "ready", "draft", "archived"] as const;
type Tab = (typeof TABS)[number];

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "ready"
      ? "bg-green-500 text-white"
      : status === "archived"
      ? "bg-gray-400 text-white"
      : "bg-slate-200 text-slate-600";
  return (
    <span
      className={`absolute top-2 right-2 text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${cls}`}
    >
      {status}
    </span>
  );
}

export default function CatalogueGrid({ products, openRequests, linkedCounts }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(timer);
  }, [toast]);

  const filtered =
    activeTab === "all"
      ? products
      : products.filter((p) => p.status === activeTab);

  const counts: Record<Tab, number> = {
    all: products.length,
    ready: products.filter((p) => p.status === "ready").length,
    draft: products.filter((p) => p.status === "draft").length,
    archived: products.filter((p) => p.status === "archived").length,
  };

  async function handleLinkToRequest(product: CatalogueProduct, requestId: string) {
    if (!requestId) return;
    setBusyId(product.id);
    try {
      const result = await linkCatalogueProductToRequest(product.id, requestId);
      if (result.ok) {
        const request = openRequests.find((r) => r.id === requestId);
        setToast(`Linked to ${request?.product_name ?? request?.company ?? "request"}`);
      } else {
        setToast(result.error);
      }
    } finally {
      setBusyId(null);
    }
  }

  async function handleDuplicate(product: CatalogueProduct) {
    setBusyId(product.id);
    try {
      const result = await duplicateCatalogueProduct(product.id);
      setToast(result.ok ? "Duplicated as draft" : result.error);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium capitalize transition ${
              activeTab === tab
                ? "border-b-2 border-orange-500 text-orange-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab} ({counts[tab]})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-sm text-gray-400">
          No {activeTab === "all" ? "" : activeTab} products.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filtered.map((product) => (
            <div
              key={product.id}
              className="border border-slate-200 rounded-2xl overflow-hidden hover:border-orange-300 hover:shadow-md transition-all duration-200 bg-white"
            >
              {/* Image area */}
              <div className="relative aspect-square bg-slate-50">
                {product.catalogue_image_url ? (
                  <img
                    src={product.catalogue_image_url}
                    alt={product.product_name}
                    className="w-full h-full object-contain p-4 bg-white"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                    <span className="text-4xl mb-2">📦</span>
                    <span className="text-xs text-slate-400">No image</span>
                  </div>
                )}
                <StatusBadge status={product.status ?? "draft"} />
              </div>

              {/* Product info */}
              <div className="p-4">
                <p className="font-semibold text-slate-900 text-sm truncate">
                  {product.brand_name ?? product.product_name}
                </p>
                {product.brand_name && (
                  <p className="text-xs text-slate-600 truncate mt-0.5">{product.product_name}</p>
                )}
                {product.category && (
                  <span className="inline-block mt-2 text-xs bg-orange-50 text-orange-700 border border-orange-100 rounded-full px-2.5 py-0.5">
                    {product.category}
                  </span>
                )}
                {(() => {
                  const linkedCount =
                    linkedCounts[`${product.supplier_id}::${product.product_name}`] ?? 0;
                  return linkedCount > 0 ? (
                    <span className="inline-block mt-2 ml-1 text-xs bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-2.5 py-0.5">
                      Linked to {linkedCount} request{linkedCount === 1 ? "" : "s"}
                    </span>
                  ) : null;
                })()}
                {product.format && (
                  <p className="text-xs text-slate-400 mt-1.5 truncate">{product.format}</p>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 mt-3">
                  <Link
                    href={`/admin/catalogue/${product.id}`}
                    className="text-xs text-orange-600 hover:text-orange-700 font-medium transition"
                  >
                    Edit
                  </Link>
                  {!product.brand_name && (
                    <Link
                      href={`/admin/catalogue/${product.id}`}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium transition"
                    >
                      ✦ Generate brand
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDuplicate(product)}
                    disabled={busyId === product.id}
                    className="text-xs text-slate-500 hover:text-slate-700 font-medium transition disabled:opacity-50"
                  >
                    Duplicate
                  </button>
                </div>

                {/* Link to request */}
                <select
                  value=""
                  onChange={(e) => handleLinkToRequest(product, e.target.value)}
                  disabled={!product.supplier_id || busyId === product.id}
                  title={
                    !product.supplier_id
                      ? "Assign a supplier to this product first"
                      : undefined
                  }
                  className="mt-2 w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:border-orange-400"
                >
                  <option value="">Link to request…</option>
                  {openRequests.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.product_name ?? r.company ?? r.id}
                      {r.company ? ` — ${r.company}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-xs text-white shadow-lg z-50">
          {toast}
        </div>
      )}
    </>
  );
}
