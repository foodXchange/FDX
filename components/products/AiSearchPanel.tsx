"use client";

import { useState } from "react";
import type { PublicCatalogueProduct } from "@/app/en/products/page";
import { toCategorySlug } from "@/lib/products/categorySlug";
import Link from "next/link";

interface Props {
  category?: string;
  onResults: (products: PublicCatalogueProduct[]) => void;
  onClear: () => void;
}

const EXAMPLE_QUERIES = [
  "Kosher EVOO 750ml Spain",
  "Organic granola Badatz",
  "Frozen potato wedges kosher",
  "Canned tuna Chief Rabbinate",
];

export default function AiSearchPanel({ category, onResults, onClear }: Props) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resultMeta, setResultMeta] = useState<{
    query: string;
    count: number;
    suggestion: string | null;
  } | null>(null);

  async function search(q: string) {
    const trimmed = q.trim();
    if (!trimmed) return;
    setLoading(true);
    setError("");
    setResultMeta(null);
    onClear();
    try {
      const res = await fetch("/api/products/ai-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed, category }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        results?: PublicCatalogueProduct[];
        category_suggestion?: string | null;
        error?: string;
      };
      if (!json.ok) throw new Error(json.error ?? "Search failed");
      const results = (json.results ?? []) as PublicCatalogueProduct[];
      onResults(results);
      setResultMeta({
        query: trimmed,
        count: results.length,
        suggestion: json.category_suggestion ?? null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    setQuery("");
    setResultMeta(null);
    setError("");
    onClear();
  }

  return (
    <div className="dark-card p-4 mb-6">
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") search(query);
          }}
          placeholder="Describe what you need… e.g. kosher olive oil 750ml glass Chief Rabbinate private label"
          className="dark-input flex-1 rounded-xl py-2.5"
          style={{ width: undefined }}
        />
        <button
          type="button"
          onClick={() => search(query)}
          disabled={loading || !query.trim()}
          className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition whitespace-nowrap"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Searching…
            </span>
          ) : (
            "Find products ↗"
          )}
        </button>
      </div>

      {/* Example chips */}
      {!resultMeta && !loading && (
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_QUERIES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => {
                setQuery(ex);
                search(ex);
              }}
              className="text-xs bg-white/4 border border-white/10 text-slate-400 hover:border-orange-500/50 hover:text-orange-400 px-3 py-1 rounded-full transition"
            >
              {ex}
            </button>
          ))}
        </div>
      )}

      {/* Error */}
      {error && <p className="text-sm text-red-400 mt-2">{error}</p>}

      {/* Result meta */}
      {resultMeta && (
        <div className="flex items-start justify-between gap-3 mt-1">
          <div>
            <p className="text-sm text-slate-400">
              <span className="font-semibold text-dark-text-primary">
                AI found {resultMeta.count} match{resultMeta.count !== 1 ? "es" : ""}
              </span>{" "}
              for &ldquo;{resultMeta.query}&rdquo;
            </p>
            {resultMeta.suggestion && (
              <div className="mt-2 bg-[rgba(232,93,38,0.10)] border border-[rgba(232,93,38,0.25)] rounded-xl px-3 py-2 flex items-center justify-between gap-3">
                <p className="text-xs text-orange-300">
                  Best matches are in{" "}
                  <strong>{resultMeta.suggestion}</strong>
                </p>
                <Link
                  href={`/en/products/${toCategorySlug(resultMeta.suggestion)}`}
                  className="text-xs font-semibold text-orange-400 hover:text-orange-300 whitespace-nowrap transition"
                >
                  View {resultMeta.suggestion} →
                </Link>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="text-sm text-slate-500 hover:text-slate-300 transition shrink-0"
          >
            Clear search
          </button>
        </div>
      )}
    </div>
  );
}
