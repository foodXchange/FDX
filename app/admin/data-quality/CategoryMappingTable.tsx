"use client";

import { useState } from "react";
import { mapProductsToCategoryDirect, runAutoCategoryMapping } from "./actions";
import CategoryCombobox from "@/components/admin/CategoryCombobox";

type UnmappedRow = { category: string; count: number };
type CategoryOption = { id: string; name: string };

const PAGE_SIZE = 50;

export default function CategoryMappingTable({
  unmapped,
  categories,
  totalProducts = 0,
  mappedProducts = 0,
}: {
  unmapped: UnmappedRow[];
  categories: CategoryOption[];
  totalProducts?: number;
  mappedProducts?: number;
}) {
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [states, setStates] = useState<Record<string, "idle" | "saving" | "done" | "error">>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Auto mapping state
  const [isAutoMapping, setIsAutoMapping] = useState(false);
  const [autoMapFeedback, setAutoMapFeedback] = useState<string | null>(null);

  async function handleAutoMap() {
    setIsAutoMapping(true);
    setAutoMapFeedback(null);
    const res = await runAutoCategoryMapping();
    if (res.ok) {
      setAutoMapFeedback(
        res.mappedCount > 0
          ? `Successfully auto-mapped ${res.mappedCount.toLocaleString()} products!`
          : "All recognized categories are already mapped!"
      );
    } else {
      setAutoMapFeedback(`Auto-mapping error: ${res.error}`);
    }
    setIsAutoMapping(false);
  }

  async function handleSave(categoryText: string) {
    const categoryId = selections[categoryText];
    if (!categoryId) return;

    setStates((s) => ({ ...s, [categoryText]: "saving" }));
    const result = await mapProductsToCategoryDirect(categoryText, categoryId);

    if (result.ok) {
      setStates((s) => ({ ...s, [categoryText]: "done" }));
      setTimeout(() => {
        setHidden((h) => new Set([...h, categoryText]));
      }, 800);
    } else {
      setStates((s) => ({ ...s, [categoryText]: "error" }));
      setErrors((e) => ({ ...e, [categoryText]: result.error ?? "Unknown error" }));
    }
  }

  const visible = unmapped.filter((r) => !hidden.has(r.category));

  const filtered = search.trim()
    ? visible.filter((r) =>
        r.category.toLowerCase().includes(search.trim().toLowerCase())
      )
    : visible;

  const shown = filtered.slice(0, visibleCount);

  const pctMapped =
    totalProducts > 0 ? ((mappedProducts / totalProducts) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-4">
      {/* Coverage Progress Card */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200/80 rounded-xl p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-white text-xs font-bold">
                ✓
              </span>
              <h3 className="text-sm font-semibold text-gray-900">
                Product Taxonomy Coverage: {pctMapped}% Mapped
              </h3>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              <strong className="text-emerald-700">{mappedProducts.toLocaleString()}</strong> of{" "}
              {totalProducts.toLocaleString()} products are mapped to canonical categories.
              {visible.length > 0
                ? ` ${visible.reduce((acc, r) => acc + r.count, 0).toLocaleString()} unmapped items across ${visible.length} category labels.`
                : " Catalog taxonomy is 100% complete!"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAutoMap}
              disabled={isAutoMapping}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm disabled:opacity-50 transition-all cursor-pointer"
            >
              {isAutoMapping ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Auto-Mapping...
                </>
              ) : (
                <>
                  <span>⚡</span> Auto-Map Standard Categories
                </>
              )}
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-3 w-full bg-emerald-200/60 rounded-full h-2 overflow-hidden">
          <div
            className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${pctMapped}%` }}
          />
        </div>

        {autoMapFeedback && (
          <div className="mt-2.5 text-xs text-emerald-800 bg-emerald-100/70 border border-emerald-200 rounded-lg px-3 py-1.5 flex items-center gap-2">
            <span>ℹ️</span> {autoMapFeedback}
          </div>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 border border-gray-200 rounded-xl">
          <div className="text-3xl mb-2">🎉</div>
          <p className="text-sm font-semibold text-gray-800">All Product Categories Mapped!</p>
          <p className="text-xs text-gray-500 mt-1">
            Every product in your database is assigned to a canonical category.
          </p>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setVisibleCount(PAGE_SIZE);
              }}
              placeholder="Filter unmapped category text…"
              className="w-full max-w-xs text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 shadow-sm"
            />
            <span className="text-xs text-gray-500">
              Showing {shown.length} of {filtered.length} unmapped category strings
            </span>
          </div>

          {filtered.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No categories match this search.</p>
          ) : (
            <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left bg-gray-50/80 border-b border-gray-200 text-xs font-semibold text-gray-600">
                    <th className="py-2.5 px-4 w-1/3">Raw Category Label</th>
                    <th className="py-2.5 px-4 w-28 text-center">Affected Products</th>
                    <th className="py-2.5 px-4">Map To Canonical Category</th>
                    <th className="py-2.5 px-4 w-28 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {shown.map((row) => {
                    const state = states[row.category] ?? "idle";
                    const isOther = row.category.toLowerCase() === "other";
                    return (
                      <tr key={row.category} className="group hover:bg-gray-50/60 transition-colors">
                        <td className="py-3 px-4 text-gray-900 font-mono text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{row.category}</span>
                            {isOther && (
                              <span className="text-[10px] bg-amber-100 text-amber-800 font-sans px-1.5 py-0.5 rounded-full font-medium">
                                Generic import tag
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                            {row.count.toLocaleString()}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <CategoryCombobox
                            value={selections[row.category] ?? ""}
                            categories={categories}
                            onChange={(categoryId) =>
                              setSelections((s) => ({ ...s, [row.category]: categoryId }))
                            }
                            disabled={state === "saving" || state === "done"}
                          />
                        </td>
                        <td className="py-3 px-4 text-right">
                          {state === "done" ? (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                              ✓ Saved
                            </span>
                          ) : state === "error" ? (
                            <span className="text-xs text-red-500 font-medium" title={errors[row.category]}>
                              Error
                            </span>
                          ) : (
                            <button
                              onClick={() => handleSave(row.category)}
                              disabled={!selections[row.category] || state === "saving"}
                              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-orange-500 text-white hover:bg-orange-600 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                            >
                              {state === "saving" ? "Saving…" : "Save Map"}
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

          {filtered.length > shown.length && (
            <div className="mt-3 text-center">
              <button
                type="button"
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                className="px-4 py-2 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:border-orange-300 hover:text-orange-600 bg-white transition-colors shadow-sm"
              >
                Load more ({filtered.length - shown.length} remaining)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
