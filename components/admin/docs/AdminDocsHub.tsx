"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export interface DocCategory {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  display_order: number;
  is_public: boolean;
}

export interface DocArticle {
  id: string;
  slug: string;
  title: string;
  content_text: string | null;
  category_id: string;
  status: string;
  is_public: boolean;
  display_order: number;
  updated_at: string;
}

interface Props {
  categories: DocCategory[];
  articles: DocArticle[];
}

type AudienceFilter = "all" | "internal" | "public";

export default function AdminDocsHub({ categories, articles }: Props) {
  const [audienceFilter, setAudienceFilter] = useState<AudienceFilter>("internal");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [search, setSearch] = useState("");

  const categoryMap = useMemo(() => {
    return new Map(categories.map((c) => [c.id, c]));
  }, [categories]);

  // Counts
  const internalCount = articles.filter((a) => !a.is_public).length;
  const publicCount = articles.filter((a) => a.is_public).length;

  const filteredArticles = useMemo(() => {
    const q = search.trim().toLowerCase();

    return articles.filter((art) => {
      // Audience filter
      if (audienceFilter === "internal" && art.is_public) return false;
      if (audienceFilter === "public" && !art.is_public) return false;

      // Category filter
      if (selectedCategory !== "all" && art.category_id !== selectedCategory) {
        return false;
      }

      // Search term
      if (q) {
        const titleMatch = art.title.toLowerCase().includes(q);
        const snippetMatch = (art.content_text ?? "").toLowerCase().includes(q);
        const cat = categoryMap.get(art.category_id);
        const catMatch = cat?.title.toLowerCase().includes(q);
        if (!titleMatch && !snippetMatch && !catMatch) return false;
      }

      return true;
    });
  }, [articles, audienceFilter, selectedCategory, search, categoryMap]);

  return (
    <div className="space-y-6">
      {/* ── HEADER SUMMARY STATS ── */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-7 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-1/4 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Operating System & Architecture Hub
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Knowledge Base & Standard Operating Procedures
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Explore all 54 technical specifications, matching algorithms, scraper pipelines, and customer operating manuals for the FoodXchange platform.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <Link
              href="/admin/import-guide"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border border-orange-500/40 transition"
            >
              <span>🇮🇱 Import Guide CMS (43)</span>
            </Link>

            <Link
              href="/en/help"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 transition"
            >
              <span>View Public Help Center</span>
              <span className="text-[10px]">↗</span>
            </Link>
          </div>
        </div>

        {/* Quick KPI stats */}
        <div className="mt-6 pt-5 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center sm:text-left">
          <div>
            <div className="text-xs text-slate-400">Total Documentation</div>
            <div className="text-xl font-black text-white mt-0.5">{articles.length} Articles</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">🔒 Internal SOPs & Architecture</div>
            <div className="text-xl font-black text-amber-400 mt-0.5">{internalCount} Articles</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">🌐 Public Customer Guides</div>
            <div className="text-xl font-black text-emerald-400 mt-0.5">{publicCount} Articles</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Categories</div>
            <div className="text-xl font-black text-blue-400 mt-0.5">{categories.length} Sections</div>
          </div>
        </div>
      </div>

      {/* ── 3-PILLAR OPERATING GUIDES QUICK-ACCESS ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Buyer Guide Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm hover:border-amber-500/40 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold uppercase tracking-wider">
                🛒 Retail Buyers
              </span>
              <span className="text-[11px] text-slate-400">Bilingual (HE / EN)</span>
            </div>
            <h3 className="text-sm font-bold text-white mb-1.5">
              Retail Buyer Sourcing Guide
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Step-by-step buyer journey: catalog filtering, express courier tasting sample hub, project tracking (/track/[id]), and SI 1145 compliance.
            </p>
          </div>
          <div className="flex items-center gap-2 pt-3 border-t border-slate-800">
            <Link
              href="/he/guide"
              target="_blank"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition"
            >
              <span>עברית (RTL)</span>
              <span className="text-[10px]">↗</span>
            </Link>
            <Link
              href="/en/guide"
              target="_blank"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 font-medium text-xs hover:text-white hover:border-slate-500 transition"
            >
              <span>English</span>
              <span className="text-[10px]">↗</span>
            </Link>
          </div>
        </div>

        {/* Supplier Guide Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm hover:border-emerald-500/40 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider">
                🏭 European Suppliers
              </span>
              <span className="text-[11px] text-slate-400">English / Global</span>
            </div>
            <h3 className="text-sm font-bold text-white mb-1.5">
              European Supplier Export Guide
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Factory export playbook: quoting CIF Haifa, courier customs waiver invoice template, Chief Rabbinate Kosher, and 30/70 payment security.
            </p>
          </div>
          <div className="flex items-center gap-2 pt-3 border-t border-slate-800">
            <Link
              href="/en/supplier-guide"
              target="_blank"
              className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition"
            >
              <span>Open Export Guide</span>
              <span className="text-[10px]">↗</span>
            </Link>
            <Link
              href="/en/suppliers/register"
              target="_blank"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 font-medium text-xs hover:text-white transition"
            >
              <span>Intake Form</span>
              <span className="text-[10px]">↗</span>
            </Link>
          </div>
        </div>

        {/* Admin SOP Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm hover:border-sky-500/40 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="px-2.5 py-0.5 rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[10px] font-bold uppercase tracking-wider">
                👑 Deal Desk Operations
              </span>
              <span className="text-[11px] text-slate-400">Internal SOP</span>
            </div>
            <h3 className="text-sm font-bold text-white mb-1.5">
              6-Stage Deal Desk & Compliance
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Standard Operating Procedures for inquiry matching, bulk RFQs, sample testing scores, Google Meet AI summaries, and SI 1145 label audits.
            </p>
          </div>
          <div className="flex items-center gap-2 pt-3 border-t border-slate-800">
            <Link
              href="/admin/pipeline"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-500 text-slate-950 font-bold text-xs hover:bg-sky-400 transition"
            >
              <span>Deal Pipeline</span>
              <span className="text-[10px]">→</span>
            </Link>
            <Link
              href="/admin/compliance/label-checker"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 font-medium text-xs hover:text-white transition"
            >
              <span>Label Checker</span>
              <span className="text-[10px]">→</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── CONTROLS: AUDIENCE TABS & SEARCH ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Audience Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setAudienceFilter("internal")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                audienceFilter === "internal"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>🔒 Internal SOPs</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800">
                {internalCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setAudienceFilter("public")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                audienceFilter === "public"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>🌐 Public Guides</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800">
                {publicCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setAudienceFilter("all")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                audienceFilter === "all"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>📑 All Docs</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700">
                {articles.length}
              </span>
            </button>

            <Link
              href="/admin/import-guide"
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold transition text-slate-600 hover:text-orange-700 hover:bg-white flex items-center gap-1.5"
            >
              <span>🇮🇱 Import Guide CMS</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-orange-100 text-orange-800">
                43
              </span>
            </Link>
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search specifications & SOPs..."
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl pl-8 pr-8 py-2 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white"
            />
            <span className="absolute left-2.5 top-2.5 text-xs text-slate-400 pointer-events-none">🔍</span>
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer border ${
              selectedCategory === "all"
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
            }`}
          >
            All Categories ({filteredArticles.length})
          </button>

          {categories.map((cat) => {
            const count = articles.filter(
              (a) =>
                a.category_id === cat.id &&
                (audienceFilter === "all" ||
                  (audienceFilter === "internal" && !a.is_public) ||
                  (audienceFilter === "public" && a.is_public))
            ).length;

            if (count === 0 && audienceFilter !== "all") return null;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer border ${
                  selectedCategory === cat.id
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <span>{cat.title}</span>
                <span className="ml-1.5 text-[10px] opacity-75">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── ARTICLES GRID ── */}
      {filteredArticles.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
          <div className="text-3xl mb-2">🔍</div>
          <p className="text-sm font-bold text-slate-700">No documentation found</p>
          <p className="text-xs text-slate-500 mt-1">
            Try adjusting your search query or switching the audience filter.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setSelectedCategory("all");
              setAudienceFilter("all");
            }}
            className="mt-4 px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition cursor-pointer"
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredArticles.map((art) => {
            const cat = categoryMap.get(art.category_id);
            const isInternal = !art.is_public;
            const snippet = (art.content_text ?? "").slice(0, 140).trim();

            return (
              <Link
                key={art.id}
                href={`/admin/docs/${art.slug}`}
                className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-orange-400 hover:shadow-md transition group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 truncate max-w-[160px]">
                      {cat?.title || "General"}
                    </span>

                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                        isInternal
                          ? "bg-amber-50 text-amber-800 border-amber-200"
                          : "bg-emerald-50 text-emerald-800 border-emerald-200"
                      }`}
                    >
                      {isInternal ? "🔒 Internal SOP" : "🌐 Public"}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-orange-600 transition line-clamp-2 leading-snug">
                    {art.title}
                  </h3>

                  <p className="text-xs text-slate-500 mt-2 line-clamp-3 leading-relaxed">
                    {snippet ? `${snippet}…` : "No description preview available."}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span>
                    Updated: {new Date(art.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                  <span className="font-bold text-orange-500 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                    Read Spec →
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
