"use client";

import { useState } from "react";
import Link from "next/link";

type HelpSearchItem = {
  slug: string;
  title: string;
  summary: string;
  categoryTitle: string;
};

export default function HelpSearch({ items }: { items: HelpSearchItem[] }) {
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const results = q
    ? items.filter(
        (item) =>
          item.title.toLowerCase().includes(q) || item.summary.toLowerCase().includes(q)
      )
    : [];

  return (
    <div className="max-w-lg mx-auto mt-8 relative">
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg pointer-events-none">
          🔍
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the help center..."
          autoComplete="off"
          className="w-full bg-white/10 border border-white/20 text-white placeholder:text-slate-400 rounded-xl px-5 py-4 pl-12 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/40 transition"
        />
      </div>

      {q && (
        <div className="absolute left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden z-10 text-left">
          {results.length === 0 ? (
            <p className="px-5 py-4 text-sm text-slate-400">
              No articles match &ldquo;{query}&rdquo;.
            </p>
          ) : (
            <ul className="divide-y divide-slate-700 max-h-80 overflow-y-auto">
              {results.map((item) => (
                <li key={item.slug}>
                  <Link
                    href={`/en/help/${item.slug}`}
                    className="block px-5 py-3 hover:bg-slate-700/60 transition"
                  >
                    <p className="text-white font-medium">{item.title}</p>
                    <p className="text-slate-400 text-xs mt-0.5">{item.categoryTitle}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
