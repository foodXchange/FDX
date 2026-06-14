"use client";

import { useState } from "react";
import { mapProductsToCategoryDirect } from "./actions";
import CategoryCombobox from "@/components/admin/CategoryCombobox";

type UnmappedRow = { category: string; count: number };
type CategoryOption = { id: string; name: string };

const PAGE_SIZE = 50;

export default function CategoryMappingTable({
  unmapped,
  categories,
}: {
  unmapped: UnmappedRow[];
  categories: CategoryOption[];
}) {
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [states, setStates] = useState<Record<string, "idle" | "saving" | "done" | "error">>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

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

  if (visible.length === 0) {
    return (
      <p className="text-sm text-green-600 font-medium py-4">
        All categories mapped.
      </p>
    );
  }

  return (
    <div>
      <input
        type="text"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setVisibleCount(PAGE_SIZE);
        }}
        placeholder="Search category text…"
        className="mb-3 w-full max-w-xs text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
      />

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-400 py-4">No categories match this search.</p>
      ) : (
      <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b border-gray-200">
            <th className="pb-2 pr-4 font-medium text-gray-500 w-1/2">Category text</th>
            <th className="pb-2 pr-4 font-medium text-gray-500 w-16">Products</th>
            <th className="pb-2 pr-4 font-medium text-gray-500">Map to</th>
            <th className="pb-2 font-medium text-gray-500 w-24"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {shown.map((row) => {
            const state = states[row.category] ?? "idle";
            return (
              <tr key={row.category} className="group">
                <td className="py-2 pr-4 text-gray-800 font-mono text-xs">
                  {row.category}
                </td>
                <td className="py-2 pr-4 text-gray-500">{row.count}</td>
                <td className="py-2 pr-4">
                  <CategoryCombobox
                    value={selections[row.category] ?? ""}
                    categories={categories}
                    onChange={(categoryId) =>
                      setSelections((s) => ({ ...s, [row.category]: categoryId }))
                    }
                    disabled={state === "saving" || state === "done"}
                  />
                </td>
                <td className="py-2">
                  {state === "done" ? (
                    <span className="text-xs text-green-600 font-medium">Saved</span>
                  ) : state === "error" ? (
                    <span className="text-xs text-red-500" title={errors[row.category]}>
                      Error
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSave(row.category)}
                      disabled={!selections[row.category] || state === "saving"}
                      className="px-3 py-1 text-xs font-medium rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      {state === "saving" ? "Saving…" : "Save"}
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
            className="px-4 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:border-orange-300 hover:text-orange-600 transition-colors"
          >
            Load more ({filtered.length - shown.length} remaining)
          </button>
        </div>
      )}
    </div>
  );
}
