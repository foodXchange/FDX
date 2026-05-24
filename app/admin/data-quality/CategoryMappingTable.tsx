"use client";

import { useState } from "react";
import { mapProductsToCategoryDirect } from "./actions";

type UnmappedRow = { category: string; count: number };
type CategoryOption = { id: string; name: string };

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

  if (visible.length === 0) {
    return (
      <p className="text-sm text-green-600 font-medium py-4">
        All categories mapped.
      </p>
    );
  }

  return (
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
          {visible.map((row) => {
            const state = states[row.category] ?? "idle";
            return (
              <tr key={row.category} className="group">
                <td className="py-2 pr-4 text-gray-800 font-mono text-xs">
                  {row.category}
                </td>
                <td className="py-2 pr-4 text-gray-500">{row.count}</td>
                <td className="py-2 pr-4">
                  <select
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-400 w-full max-w-xs"
                    value={selections[row.category] ?? ""}
                    onChange={(e) =>
                      setSelections((s) => ({ ...s, [row.category]: e.target.value }))
                    }
                    disabled={state === "saving" || state === "done"}
                  >
                    <option value="">— select category —</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
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
  );
}
