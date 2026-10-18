"use client";

import { useMemo, useState } from "react";
import PipelineTable, { type PipelineRow } from "./PipelineTable";
import PipelineKanban from "./PipelineKanban";
import DealActionModal from "./DealActionModal";
import CategoryCombobox from "@/components/admin/CategoryCombobox";
import {
  STAGE_COLORS,
  STAGE_LABELS,
  STAGE_ICONS,
  STAGES,
  statusToStage,
  getNextStatus,
  type Stage,
} from "./stage";
import { updateMatchStage, autoApproveHighMatches } from "./actions";

const PAGE_SIZE = 50;
const PILL_STAGES: Stage[] = ["matched", "proposal", "sent", "responded", "closed"];

export default function PipelineBoard({
  rows,
  totalPipelineDeals = 0,
}: {
  rows: PipelineRow[];
  totalPipelineDeals?: number;
}) {
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState<Stage | "all">("all");
  const [buyer, setBuyer] = useState("");
  const [minScore, setMinScore] = useState<number | "all">("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Match statuses state for optimistic / instant UI updates
  const [statuses, setStatuses] = useState<Record<string, string>>(
    Object.fromEntries(rows.map((r) => [r.id, r.status]))
  );
  const [loading, setLoading] = useState<Set<string>>(new Set());

  // Modal state
  const [modalDeal, setModalDeal] = useState<PipelineRow | null>(null);
  const [modalMode, setModalMode] = useState<"send" | "respond" | "details" | "reject" | null>(null);

  // Auto-approval state
  const [isAutoApproving, setIsAutoApproving] = useState(false);
  const [autoApproveMessage, setAutoApproveMessage] = useState<string | null>(null);

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
    for (const r of rows) {
      const curr = statuses[r.id] ?? r.status;
      counts[statusToStage(curr)]++;
    }
    return counts;
  }, [rows, statuses]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows.filter((r) => {
      const currentStatus = statuses[r.id] ?? r.status;
      if (stage !== "all" && statusToStage(currentStatus) !== stage) return false;
      if (buyer && r.buyer_company !== buyer) return false;
      if (minScore !== "all" && r.match_score < minScore) return false;
      if (needle) {
        const haystack = `${r.buyer_company ?? ""} ${r.company_name} ${r.product_name} ${r.country ?? ""}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
  }, [rows, statuses, search, stage, buyer, minScore]);

  const shown = filtered.slice(0, visibleCount);

  function clearAll() {
    setSearch("");
    setStage("all");
    setBuyer("");
    setMinScore("all");
    resetPage();
  }

  const hasActiveFilters = !!search || stage !== "all" || !!buyer || minScore !== "all";

  // Advance to next status
  async function handleAdvance(row: PipelineRow) {
    const currentStatus = statuses[row.id] ?? row.status;
    const next = getNextStatus(currentStatus);
    if (!next) return;

    // If next is "sent", open outreach modal
    if (next === "sent") {
      setModalDeal(row);
      setModalMode("send");
      return;
    }
    // If next is "responded", open log response modal
    if (next === "responded") {
      setModalDeal(row);
      setModalMode("respond");
      return;
    }

    setLoading((prev) => new Set([...prev, row.id]));
    setStatuses((prev) => ({ ...prev, [row.id]: next }));

    try {
      const res = await updateMatchStage(row.id, next);
      if (!res.ok) {
        setStatuses((prev) => ({ ...prev, [row.id]: currentStatus }));
      }
    } catch {
      setStatuses((prev) => ({ ...prev, [row.id]: currentStatus }));
    } finally {
      setLoading((prev) => {
        const copy = new Set(prev);
        copy.delete(row.id);
        return copy;
      });
    }
  }

  function handleOpenModal(
    deal: PipelineRow,
    mode: "send" | "respond" | "details" | "reject"
  ) {
    setModalDeal(deal);
    setModalMode(mode);
  }

  function handleModalSuccess(dealId: string, nextStatus: string) {
    setStatuses((prev) => ({ ...prev, [dealId]: nextStatus }));
  }

  async function handleAutoApprove() {
    setIsAutoApproving(true);
    setAutoApproveMessage(null);
    const res = await autoApproveHighMatches(90);
    if (res.ok) {
      setAutoApproveMessage(
        res.count > 0
          ? `Successfully approved ${res.count} high-match deals (score 90+) into Proposal stage!`
          : "All 90+ score matches are already approved!"
      );
    } else {
      setAutoApproveMessage(`Auto-approve error: ${res.error}`);
    }
    setIsAutoApproving(false);
  }

  return (
    <div className="space-y-4">
      {/* Top Filter and Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-wrap">
        {/* Stage Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setStage("all");
              resetPage();
            }}
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
              stage === "all"
                ? "bg-gray-900 text-white border-gray-900 shadow-xs"
                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
            }`}
          >
            <span>All Deals</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                stage === "all" ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
              }`}
            >
              {rows.length}
            </span>
          </button>

          {PILL_STAGES.map((s) => {
            const isActive = stage === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setStage(s);
                  resetPage();
                }}
                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
                  isActive
                    ? "bg-orange-500 text-white border-orange-500 shadow-xs"
                    : `${STAGE_COLORS[s]} hover:opacity-80`
                }`}
              >
                <span>{STAGE_ICONS[s]}</span>
                <span>{STAGE_LABELS[s]}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isActive ? "bg-white/20 text-white" : "bg-white/60 text-gray-700"
                  }`}
                >
                  {stageCounts[s]}
                </span>
              </button>
            );
          })}
        </div>

        {/* View Switcher & 1-Click Action */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleAutoApprove}
            disabled={isAutoApproving}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors disabled:opacity-50 shadow-xs cursor-pointer"
          >
            {isAutoApproving ? (
              "Approving…"
            ) : (
              <>
                <span>⚡</span> Auto-Approve 90+ Matches
              </>
            )}
          </button>

          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 shadow-xs">
            <button
              type="button"
              onClick={() => setView("kanban")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                view === "kanban"
                  ? "bg-orange-500 text-white shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Kanban ▥
            </button>
            <button
              type="button"
              onClick={() => setView("table")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                view === "table"
                  ? "bg-orange-500 text-white shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Table ☰
            </button>
          </div>
        </div>
      </div>

      {autoApproveMessage && (
        <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 flex items-center gap-2">
          <span>ℹ️</span> {autoApproveMessage}
        </div>
      )}

      {/* Search and Secondary Filter Bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-xs flex items-center gap-3 flex-wrap">
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            resetPage();
          }}
          placeholder="Search by buyer, supplier, product, country…"
          className="w-full max-w-xs text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 shadow-xs"
        />

        <select
          value={minScore}
          onChange={(e) => {
            setMinScore(e.target.value === "all" ? "all" : Number(e.target.value));
            resetPage();
          }}
          className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 shadow-xs"
        >
          <option value="all">All Match Scores</option>
          <option value="90">90%+ Super Match</option>
          <option value="80">80%+ High Match</option>
          <option value="70">70%+ Good Match</option>
          <option value="50">50%+ Fair Match</option>
        </select>

        <div className="w-52">
          <CategoryCombobox
            value={buyer}
            categories={uniqueBuyers.map((b) => ({ id: b, name: b }))}
            onChange={(v) => {
              setBuyer(v);
              resetPage();
            }}
            placeholder="All Buyers"
          />
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearAll}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg text-gray-500 hover:text-orange-600 transition-colors ml-auto"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Main Content Area */}
      {view === "kanban" ? (
        <PipelineKanban
          rows={shown}
          statuses={statuses}
          loading={loading}
          onAdvance={handleAdvance}
          onOpenModal={handleOpenModal}
        />
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs">
          <PipelineTable
            rows={shown}
            statuses={statuses}
            loading={loading}
            onAdvance={handleAdvance}
            onOpenModal={handleOpenModal}
          />

          {filtered.length > shown.length && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-gray-200 text-gray-600 hover:border-orange-300 hover:text-orange-600 bg-white transition-colors shadow-xs"
              >
                Load more ({filtered.length - shown.length} remaining)
              </button>
            </div>
          )}
        </div>
      )}

      {/* Interactive Deal Action Modal */}
      <DealActionModal
        deal={modalDeal}
        mode={modalMode}
        onClose={() => {
          setModalDeal(null);
          setModalMode(null);
        }}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
}
