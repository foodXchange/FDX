"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";

export interface SopArticle {
  id: string;
  slug: string;
  title: string;
  categoryTitle: string;
  categorySlug: string;
  isPublic: boolean;
  snippet: string;
  updatedAt: string;
}

interface SopCategory {
  id: string;
  slug: string;
  title: string;
  description: string | null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const REGULATORY_CHEAT_SHEETS = [
  {
    title: "CIF Haifa/Ashdod Terms",
    badge: "Incoterms 2020",
    summary: "Factory pays maritime freight and insurance to Haifa/Ashdod port. Israeli buyer clears customs and pays port tariffs & VAT.",
    snippet: "CIF (Cost, Insurance & Freight - Incoterms 2020) Haifa/Ashdod. Supplier handles origin customs, ocean freight booking, and marine insurance (min. 110% CIF value). Consignee handles Israeli customs clearance and port demurrage.",
  },
  {
    title: "Chief Rabbinate Kosher Protocol",
    badge: "Rabbinate Law",
    summary: "Supermarket chains require Chief Rabbinate of Israel kosher certificate. European plants need raw material audit and Rabbi supervision visit.",
    snippet: "Under Israeli Law 5739-1979, products labeled as Kosher in Israeli retail must hold a formal Kosher Certificate issued by the Chief Rabbinate of Israel (Import Division). Batch supervision by approved European Rabbinates (e.g. Kedassia, Badatz, OU, OK) requires advance filing 6 weeks before production.",
  },
  {
    title: "Payment Milestones (30/70)",
    badge: "Commercial Standard",
    summary: "30% advance on PO signature to purchase ingredients & print plates; 70% balance against Bill of Lading copy & SGS pre-shipment COA.",
    snippet: "Payment Terms: 30% advance deposit via SWIFT/TT upon Purchase Order countersignature. Balance 70% payable against clean on-board Bill of Lading (B/L) copy, commercial invoice, packing list, and certified Certificate of Analysis (COA).",
  },
  {
    title: "Hebrew Labeling & Allergens",
    badge: "Public Health Order",
    summary: "Mandatory Hebrew sticker or printed packaging showing importer details, ingredients in descending order, red warning symbols, and allergens.",
    snippet: "Israeli Food Labeling Standard SI 1145 requires: Hebrew product name, ingredients descending by weight, nutritional table per 100g, allergen disclosure in bold box, manufacturer name & country of origin, and Israeli importer name & registered address.",
  },
];

export default function SopHelperDrawer({ isOpen, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [selectedCat, setSelectedCat] = useState("all");
  const [categories, setCategories] = useState<SopCategory[]>([]);
  const [articles, setArticles] = useState<SopArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);

    fetch("/api/admin/docs/quick-search")
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        setCategories(data.categories || []);
        setArticles(data.articles || []);
        setLoading(false);
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Keyboard escape listener
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const filteredArticles = useMemo(() => {
    const q = query.trim().toLowerCase();
    return articles.filter((art) => {
      if (selectedCat !== "all" && art.categorySlug !== selectedCat) {
        return false;
      }
      if (q) {
        const titleMatch = art.title.toLowerCase().includes(q);
        const snippetMatch = art.snippet.toLowerCase().includes(q);
        const catMatch = art.categoryTitle.toLowerCase().includes(q);
        return titleMatch || snippetMatch || catMatch;
      }
      return true;
    });
  }, [articles, query, selectedCat]);

  function copyText(id: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 2000);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over Drawer Panel */}
      <div className="relative w-full max-w-xl bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col h-full text-slate-100 z-10 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold text-base border border-orange-500/30">
              💡
            </span>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Trade SOP & Regulation Helper</span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  54 Specs
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Incoterms, Israeli Rabbinate rules, testing protocols, and SOPs
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Search & Quick Filters */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/40 space-y-3 shrink-0">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Incoterms, Kosher, MoH rules, pricing formulas..."
              className="w-full text-xs bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-8 py-2.5 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
              autoFocus
            />
            <span className="absolute left-3 top-2.5 text-xs text-slate-400 pointer-events-none">🔍</span>
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedCat("all")}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer shrink-0 ${
                selectedCat === "all"
                  ? "bg-orange-500 text-white font-bold"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              All Specs ({articles.length})
            </button>
            {categories.slice(0, 6).map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCat(cat.slug)}
                className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer shrink-0 ${
                  selectedCat === cat.slug
                    ? "bg-orange-500 text-white font-bold"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {cat.title}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Quick Cheat Sheets (Only visible when no search query or explicitly matching) */}
          {!query && selectedCat === "all" && (
            <div className="space-y-2.5">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <span>⚡</span>
                <span>Fast Trade Cheat Sheets (Click to Copy):</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {REGULATORY_CHEAT_SHEETS.map((cs, idx) => {
                  const isCopied = copiedIndex === `cs-${idx}`;
                  return (
                    <div
                      key={idx}
                      className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3 flex flex-col justify-between hover:border-orange-500/40 transition group"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-700 text-orange-300">
                            {cs.badge}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyText(`cs-${idx}`, cs.snippet)}
                            className="text-[10px] font-semibold text-slate-400 hover:text-orange-400 transition cursor-pointer flex items-center gap-1"
                          >
                            <span>{isCopied ? "✓ Copied" : "📋 Copy"}</span>
                          </button>
                        </div>
                        <h4 className="text-xs font-bold text-white group-hover:text-orange-300 transition">
                          {cs.title}
                        </h4>
                        <p className="text-[11px] text-slate-300 mt-1 leading-snug line-clamp-3">
                          {cs.summary}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Search Results / Full Article List */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              <span>{query ? `Search Results (${filteredArticles.length})` : "Standard Operating Procedures:"}</span>
              <Link
                href="/admin/docs"
                target="_blank"
                className="text-orange-400 hover:text-orange-300 normal-case font-medium flex items-center gap-1"
              >
                <span>Full SOP Hub</span>
                <span>↗</span>
              </Link>
            </div>

            {loading ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Loading knowledge base specs...
              </div>
            ) : filteredArticles.length === 0 ? (
              <div className="py-10 text-center bg-slate-800/40 rounded-2xl border border-slate-800">
                <p className="text-xs text-slate-300 font-semibold">No specifications found matching &quot;{query}&quot;</p>
                <p className="text-[11px] text-slate-500 mt-1">Try another term or view the full documentation hub.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredArticles.map((art) => {
                  const isCopied = copiedIndex === art.id;
                  return (
                    <div
                      key={art.id}
                      className="bg-slate-800/70 border border-slate-700/60 rounded-2xl p-3.5 hover:border-slate-600 transition space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700">
                            {art.categoryTitle}
                          </span>
                          <h3 className="text-xs font-bold text-white mt-1.5">
                            {art.title}
                          </h3>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => copyText(art.id, art.snippet)}
                            className="text-[11px] text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-700/50 hover:bg-slate-700 transition cursor-pointer"
                            title="Copy snippet"
                          >
                            {isCopied ? "✓ Copied" : "📋 Copy"}
                          </button>
                          <Link
                            href={`/admin/docs/${art.slug}`}
                            target="_blank"
                            className="text-[11px] font-bold text-orange-400 hover:text-orange-300 px-2 py-1 rounded bg-orange-500/10 hover:bg-orange-500/20 transition flex items-center gap-0.5"
                          >
                            <span>Read</span>
                            <span>↗</span>
                          </Link>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-300 leading-relaxed line-clamp-3">
                        {art.snippet ? `${art.snippet}…` : "No snippet preview available."}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-950/60 text-xs text-slate-400 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-[11px]">Updated live from database</span>
          </div>
          <Link
            href="/admin/docs"
            target="_blank"
            className="text-[11px] font-bold text-orange-400 hover:text-orange-300"
          >
            Open Knowledge Base CMS →
          </Link>
        </div>
      </div>
    </div>
  );
}
