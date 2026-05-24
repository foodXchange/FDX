"use client";

import { useState } from "react";
import { markSupplierDuplicate } from "./actions";

type DuplicateRow = {
  keep_id: string;
  duplicate_id: string;
  company_name: string;
  country: string | null;
  keep_status: string | null;
  dup_status: string | null;
};

export default function DuplicateTable({
  duplicates,
}: {
  duplicates: DuplicateRow[];
}) {
  const [states, setStates] = useState<Record<string, "idle" | "saving" | "done" | "error">>({});
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  async function handleMark(duplicateId: string, keepId: string) {
    setStates((s) => ({ ...s, [duplicateId]: "saving" }));
    const result = await markSupplierDuplicate(duplicateId, keepId);

    if (result.ok) {
      setStates((s) => ({ ...s, [duplicateId]: "done" }));
      setTimeout(() => {
        setHidden((h) => new Set([...h, duplicateId]));
      }, 800);
    } else {
      setStates((s) => ({ ...s, [duplicateId]: "error" }));
    }
  }

  const visible = duplicates.filter((d) => !hidden.has(d.duplicate_id));

  if (visible.length === 0) {
    return (
      <p className="text-sm text-green-600 font-medium py-4">
        No duplicate suppliers detected.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b border-gray-200">
            <th className="pb-2 pr-4 font-medium text-gray-500">Company</th>
            <th className="pb-2 pr-4 font-medium text-gray-500">Country</th>
            <th className="pb-2 pr-4 font-medium text-gray-500">Keep ID</th>
            <th className="pb-2 pr-4 font-medium text-gray-500">Dup ID</th>
            <th className="pb-2 pr-4 font-medium text-gray-500">Status</th>
            <th className="pb-2 font-medium text-gray-500 w-36"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {visible.map((row) => {
            const state = states[row.duplicate_id] ?? "idle";
            return (
              <tr key={row.duplicate_id} className="group">
                <td className="py-2 pr-4 text-gray-800 font-medium">
                  {row.company_name}
                </td>
                <td className="py-2 pr-4 text-gray-500 text-xs">
                  {row.country ?? "—"}
                </td>
                <td className="py-2 pr-4 text-gray-400 font-mono text-xs">
                  {row.keep_id.slice(0, 8)}…
                </td>
                <td className="py-2 pr-4 text-gray-400 font-mono text-xs">
                  {row.duplicate_id.slice(0, 8)}…
                </td>
                <td className="py-2 pr-4 text-xs">
                  <span className="text-gray-500">{row.keep_status}</span>
                  <span className="text-gray-300 mx-1">/</span>
                  <span className="text-gray-500">{row.dup_status}</span>
                </td>
                <td className="py-2">
                  {state === "done" ? (
                    <span className="text-xs text-green-600 font-medium">Marked</span>
                  ) : state === "error" ? (
                    <span className="text-xs text-red-500">Error</span>
                  ) : (
                    <button
                      onClick={() => handleMark(row.duplicate_id, row.keep_id)}
                      disabled={state === "saving"}
                      className="px-3 py-1 text-xs font-medium rounded-lg border border-gray-300 text-gray-700 hover:border-orange-400 hover:text-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
  );
}
