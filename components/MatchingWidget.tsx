'use client';
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import type { IntentResult } from "@/lib/ai/intentSchema";

type MatchResult = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  category: string | null;
  hero_image: string | null;
  score: number;
};

interface MatchingWidgetProps {
  placeholder?: string;
}

function buildSummary(intent: IntentResult): string {
  const parts: string[] = [];
  if (intent.product) parts.push(intent.product);
  if (intent.packaging.length > 0) parts.push(intent.packaging.join(" + "));
  if (intent.pack_size_g) parts.push(`${intent.pack_size_g}g`);
  else if (intent.pack_size_ml) parts.push(`${intent.pack_size_ml}ml`);
  else if (intent.pack_size_kg) parts.push(`${intent.pack_size_kg}kg`);
  if (intent.market) parts.push(intent.market.toLowerCase());
  if (intent.private_label === true) parts.push("private label");
  if (intent.kosher === true) parts.push("kosher");
  const otherCerts = intent.certifications.filter((c) => c !== "kosher");
  if (otherCerts.length > 0) parts.push(otherCerts.join(", "));
  if (parts.length === 0 && intent.keywords.length > 0) {
    parts.push(...intent.keywords.slice(0, 6));
  }
  return parts.join(" · ");
}

export default function MatchingWidget({ placeholder }: MatchingWidgetProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MatchResult[]>([]);
  const [intent, setIntent] = useState<IntentResult | null>(null);
  const [parsedBy, setParsedBy] = useState<string>("none");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string>("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize persistent session ID
  useEffect(() => {
    const key = "fx_session_id";
    let id = localStorage.getItem(key);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(key, id);
    }
    setSessionId(id);
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!query.trim()) {
      setResults([]);
      setIntent(null);
      setParsedBy("none");
      setError(null);
      return;
    }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/match/portfolio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: query, limit: 6, session_id: sessionId }),
        });
        if (!res.ok) throw new Error("Search failed");
        const json = await res.json() as {
          results: MatchResult[];
          intent: IntentResult;
          parsed_by?: string;
        };
        setResults(json.results || []);
        setIntent(json.intent || null);
        setParsedBy(json.parsed_by ?? "none");
      } catch {
        setError("Search unavailable. Please try again.");
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 450);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, sessionId]);

  function trackClick(clickedSlug: string) {
    // Store shown slugs so PortfolioClickTracker on the detail page can verify context
    try {
      sessionStorage.setItem(
        "fx_last_match_slugs",
        JSON.stringify(results.map((r) => r.slug))
      );
    } catch { /* ignore storage errors */ }
    // Fire-and-forget
    fetch("/api/events/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_type: "match_clicked",
        query_text: query.slice(0, 2000),
        intent_json: intent as Record<string, unknown> | null,
        shown_slugs: results.map((r) => r.slug),
        clicked_slug: clickedSlug,
        page_path: window.location.pathname,
        session_id: sessionId,
      }),
    }).catch(() => {});
  }

  const summaryText = intent ? buildSummary(intent) : "";
  const showAiBadge = parsedBy === "anthropic" || parsedBy === "openai";

  return (
    <div>
      <textarea
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        rows={3}
        placeholder={placeholder ?? "Describe what you are sourcing…"}
        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 resize-none"
      />

      {loading && <p className="text-xs text-slate-400 mt-2">Searching…</p>}

      {!loading && error && <p className="text-xs text-red-500 mt-2">{error}</p>}

      {!loading && !error && summaryText && (
        <p className="text-xs text-slate-500 italic mt-2">
          Detected: {summaryText}
          {showAiBadge && (
            <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-200 rounded-full px-2 py-0.5 ml-2 not-italic">
              AI
            </span>
          )}
        </p>
      )}

      {!loading && !error && query.trim() && results.length === 0 && intent && (
        <p className="text-sm text-slate-500 mt-4">
          No matching scenarios found — describe what you need and we will follow up.
        </p>
      )}

      {results.length > 0 && (
        <>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
            {results.map((item) => (
              <article
                key={item.slug}
                onClick={() => trackClick(item.slug)}
                className="group border border-slate-200 rounded-xl overflow-hidden bg-white hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
              >
                <Link href={`/en/portfolio/${item.slug}`} className="block">
                  <div className="relative w-full h-40 overflow-hidden">
                    {item.hero_image ? (
                      <>
                        <Image
                          src={item.hero_image}
                          alt={item.title}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                          quality={70}
                        />
                        <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent opacity-85 group-hover:opacity-95 transition" />
                        <div className="absolute bottom-3 left-3 right-3">
                          <h3 className="text-white text-sm font-semibold leading-tight drop-shadow line-clamp-2">
                            {item.title}
                          </h3>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full bg-slate-800 flex items-end p-3">
                        <h3 className="text-white text-sm font-semibold leading-tight line-clamp-2">
                          {item.title}
                        </h3>
                      </div>
                    )}
                  </div>
                </Link>
                <div className="p-4">
                  {item.category && (
                    <span className="inline-block bg-orange-100 text-orange-700 rounded-full px-3 py-1 text-xs font-medium mb-2">
                      {item.category}
                    </span>
                  )}
                  {item.summary && (
                    <p className="text-slate-600 text-xs leading-relaxed mb-3 line-clamp-2">
                      {item.summary}
                    </p>
                  )}
                  <Link
                    href={`/en/portfolio/${item.slug}`}
                    className="inline-flex items-center text-orange-600 font-medium text-xs hover:text-orange-700 hover:underline"
                  >
                    View scenario →
                  </Link>
                </div>
              </article>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-4 text-center">
            These are examples of similar sourcing scenarios we have worked on.
            We review each request internally and follow up only if there is a clear fit.
          </p>
        </>
      )}
    </div>
  );
}
