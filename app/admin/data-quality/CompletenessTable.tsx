"use client";

import { useState } from "react";

type CompletenessRow = {
  supplier_id: string;
  company_name: string;
  has_category_id: boolean;
  has_formats: boolean;
  has_certs: boolean;
  product_count: number;
  score: number;
};

const PAGE_SIZE = 50;
const MAX_SCORE = 4;

export default function CompletenessTable({
  rows,
}: {
  rows: CompletenessRow[];
}) {
  const [mode, setMode] = useState<"below" | "above">("below");
  const [threshold, setThreshold] = useState(MAX_SCORE);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filtered = rows.filter((r) =>
    mode === "below" ? r.score < threshold : r.score >= threshold
  );

  const shown = filtered.slice(0, visibleCount);

  function resetPage() {
    setVisibleCount(PAGE_SIZE);
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-2 flex-wrap text-xs text-gray-500">
        <span>Show suppliers with score</span>
        <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
          <button
            type="button"
            onClick={() => {
              setMode("below");
              resetPage();
            }}
            className={`px-2.5 py-1 font-medium transition-colors ${
              mode === "below" ? "bg-orange-500 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            below
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("above");
              resetPage();
            }}
            className={`px-2.5 py-1 font-medium border-l border-gray-200 transition-colors ${
              mode === "above" ? "bg-orange-500 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            ≥
          </button>
        </div>
        <select
          value={threshold}
          onChange={(e) => {
            setThreshold(Number(e.target.value));
            resetPage();
          }}
          className="border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
        >
          {Array.from({ length: MAX_SCORE + 1 }, (_, i) => i).map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <span className="text-gray-400">({filtered.length} suppliers)</span>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-400 py-4">No suppliers match this filter.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-200">
                <th className="pb-2 pr-4 font-medium text-gray-500">Company</th>
                <th className="pb-2 pr-4 font-medium text-gray-500 text-center">Cat ID</th>
                <th className="pb-2 pr-4 font-medium text-gray-500 text-center">Formats</th>
                <th className="pb-2 pr-4 font-medium text-gray-500 text-center">Certs</th>
                <th className="pb-2 pr-4 font-medium text-gray-500 text-center">Products</th>
                <th className="pb-2 font-medium text-gray-500 text-center">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {shown.map((row) => (
                <tr key={row.supplier_id} className="group hover:bg-gray-50">
                  <td className="py-2 pr-4 text-gray-800 font-medium">{row.company_name}</td>
                  <td className="py-2 pr-4 text-center">
                    <Check ok={row.has_category_id} />
                  </td>
                  <td className="py-2 pr-4 text-center">
                    <Check ok={row.has_formats} />
                  </td>
                  <td className="py-2 pr-4 text-center">
                    <Check ok={row.has_certs} />
                  </td>
                  <td className="py-2 pr-4 text-center text-gray-500 text-xs">
                    {row.product_count}
                  </td>
                  <td className="py-2 text-center">
                    <ScoreBar score={row.score} max={MAX_SCORE} />
                  </td>
                </tr>
              ))}
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

function Check({ ok }: { ok: boolean }) {
  return ok ? (
    <span className="text-green-500 text-base">✓</span>
  ) : (
    <span className="text-gray-300 text-base">✗</span>
  );
}

function ScoreBar({ score, max }: { score: number; max: number }) {
  const pct = Math.round((score / max) * 100);
  const color =
    pct >= 75 ? "bg-green-400" : pct >= 50 ? "bg-orange-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-1.5 justify-center">
      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500">{score}/{max}</span>
    </div>
  );
}
