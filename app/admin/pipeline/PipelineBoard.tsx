"use client";

import { useMemo, useState } from "react";
import PipelineTable, { type PipelineRow } from "./PipelineTable";
import CategoryCombobox from "@/components/admin/CategoryCombobox";
import { STAGE_COLORS, STAGE_LABELS, STAGES, statusToStage, type Stage } from "./stage";

const PAGE_SIZE = 50;
const PILL_STAGES: Stage[] = ["matched", "proposal", "sent", "responded", "closed"];

export default function PipelineBoard({ rows }: { rows: PipelineRow[] }) {
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState<Stage | "all">("all");
  const [buyer, setBuyer] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  function resetPage() {
    setVisibleCount(PAGE_SIZE);
  }

  const uniqueBuyers = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      if (r.buyer_company) set.add(r.buyer_company);
    }
    return Array.from(set).sort();
  }, [rows]);

  const stageCounts = useMemo(() => {
    const counts: Record<Stage, number> = {
      matched: 0,
      proposal: 0,
      sent: 0,
      responded: 0,
      closed: 0,
      rejected: 0,
    };
    for (const r of rows) counts[statusToStage(r.status)]++;
    return counts;
  }, [rows]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (stage !== "all" && statusToStage(r.status) !== stage) return false;
      if (buyer && r.buyer_company !== buyer) return false;
      if (needle) {
        const haystack = `${r.buyer_company ?? ""} ${r.company_name} ${r.product_name}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
  }, [rows, search, stage, buyer]);

  const shown = filtered.slice(0, visibleCount);

  function clearAll() {
    setSearch("");
    setStage("all");
    setBuyer("");
    resetPage();
  }

  const hasActiveFilters = !!search || stage !== "all" || !!buyer;

  return (
    <div>
      {/* Summary pills */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        <Pill
          label="Total deals"
          count={rows.length}
          active={stage === "all"}
          color="bg-slate-50 text-slate-600"
          onClick={() => {
            setStage("all");
            resetPage();
          }}
        />
        {PILL_STAGES.map((s) => (
          <Pill
            key={s}
            label={STAGE_LABELS[s]}
            count={stageCounts[s]}
            active={stage === s}
            color={STAGE_COLORS[s]}
            onClick={() => {
              setStage(s);
              resetPage();
            }}
          />
        ))}
      </div>

      {/* Filters bar */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm mb-4 flex items-end gap-3 flex-wrap">
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            resetPage();
          }}
          placeholder="Search buyer, supplier, or product…"
          className="w-full max-w-xs text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
        />

        <select
          value={stage}
          onChange={(e) => {
            setStage(e.target.value as Stage | "all");
            resetPage();
          }}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
        >
          <option value="all">All stages</option>
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {STAGE_LABELS[s]}
            </option>
          ))}
        </select>

        <CategoryCombobox
          value={buyer}
          categories={uniqueBuyers.map((b) => ({ id: b, name: b }))}
          onChange={(v) => {
            setBuyer(v);
            resetPage();
          }}
          placeholder="All buyers"
        />

        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearAll}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:border-orange-300 hover:text-orange-600 transition-colors"
          >
            Clear all filters
          </button>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <PipelineTable rows={shown} />

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
    </div>
  );
}

function Pill({
  label,
  count,
  active,
  color,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full transition-all ${color} ${
        active ? "ring-2 ring-orange-300" : "hover:opacity-80"
      }`}
    >
      {count} {label}
    </button>
  );
}
