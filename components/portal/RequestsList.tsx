"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { cleanRequestName } from "@/lib/matching/cleanRequestName";
import StatusBadge from "@/components/portal/StatusBadge";

export type PortalRequest = {
  id: string;
  product_name: string | null;
  category: string | null;
  message: string | null;
  status: string | null;
  certifications: string[] | null;
  private_label: boolean | null;
  match_count: number | null;
  created_at: string;
};

type StatusFilter = "all" | "matched" | "pending" | "closed";
type SortOption = "newest" | "most_matches" | "alphabetical";

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "matched", label: "Matched" },
  { value: "pending", label: "Pending" },
  { value: "closed", label: "Closed" },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "most_matches", label: "Most matches" },
  { value: "alphabetical", label: "Alphabetical" },
];

function getTitle(r: PortalRequest): string {
  const productName = r.product_name ?? "";
  const cleanedName = productName ? cleanRequestName(productName) : "";
  return cleanedName || productName || r.message?.slice(0, 60) || "Sourcing request";
}

function matchesStatusFilter(r: PortalRequest, filter: StatusFilter): boolean {
  if (filter === "all") return true;
  if (filter === "matched") return r.status === "matched";
  if (filter === "closed") return r.status === "closed";
  return r.status !== "matched" && r.status !== "closed";
}

export default function RequestsList({ requests }: { requests: PortalRequest[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [sort, setSort] = useState<SortOption>("newest");

  const categories = useMemo(() => {
    return Array.from(
      new Set(requests.map((r) => r.category).filter((c): c is string => !!c))
    ).sort();
  }, [requests]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    let result = requests.filter((r) => {
      if (term && !(r.product_name ?? "").toLowerCase().includes(term)) return false;
      if (!matchesStatusFilter(r, statusFilter)) return false;
      if (categoryFilter && r.category !== categoryFilter) return false;
      return true;
    });

    result = [...result];
    if (sort === "most_matches") {
      result.sort((a, b) => (b.match_count ?? 0) - (a.match_count ?? 0));
    } else if (sort === "alphabetical") {
      result.sort((a, b) => getTitle(a).localeCompare(getTitle(b)));
    } else {
      result.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }

    return result;
  }, [requests, search, statusFilter, categoryFilter, sort]);

  return (
    <div>
      <div className="flex flex-col gap-3 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search your requests..."
          className="w-full text-sm bg-white/5 border border-white/10 text-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder:text-slate-500"
        />

        <div className="flex flex-wrap items-center gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatusFilter(f.value)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full transition ${
                statusFilter === f.value
                  ? "bg-orange-500 text-white"
                  : "bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              {f.label}
            </button>
          ))}

          {categories.length > 0 && (
            <span className="w-px h-5 bg-white/10 mx-1" />
          )}

          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategoryFilter((prev) => (prev === c ? null : c))}
              className={`text-xs font-medium px-3 py-1.5 rounded-full transition ${
                categoryFilter === c
                  ? "bg-orange-500 text-white"
                  : "bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              {c}
            </button>
          ))}

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="ml-auto text-xs font-medium bg-white/5 border border-white/10 text-slate-300 rounded-full px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} className="bg-[#0b1620]">
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="dark-card p-8 text-center">
          <p className="text-slate-200 font-medium">No requests match your filters</p>
          <p className="text-sm text-slate-400 mt-2">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const title = getTitle(r);
            const certs = r.certifications ?? [];
            const hasKosher = certs.some((c) => c.toLowerCase().includes("kosher"));

            return (
              <Link
                key={r.id}
                href={`/en/portal/requests/${r.id}`}
                className="dark-card p-5 flex flex-col gap-2 hover:border-orange-400/40 transition block"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <h3 className="font-semibold text-white">{title}</h3>
                  <StatusBadge status={r.status} />
                </div>

                {(r.category || hasKosher || r.private_label) && (
                  <div className="flex flex-wrap gap-2">
                    {r.category && (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-300">
                        {r.category}
                      </span>
                    )}
                    {hasKosher && (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-300">
                        ✡ Kosher
                      </span>
                    )}
                    {r.private_label && (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-300">
                        Private label
                      </span>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-slate-400 mt-1">
                  <span>
                    {r.match_count
                      ? `${r.match_count} match${r.match_count !== 1 ? "es" : ""}`
                      : "No matches yet"}
                  </span>
                  <span>
                    {new Date(r.created_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
