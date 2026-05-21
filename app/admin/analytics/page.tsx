import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { IMPORT_GUIDE_CATEGORIES } from "@/types/importGuide";

export const dynamic = "force-dynamic";

type Lead = {
  created_at: string;
  source: string | null;
  matched_slugs: string[] | null;
};

type MatchEvent = {
  event_type: string;
  clicked_slug: string | null;
  shown_slugs: string[] | null;
  query_text: string | null;
  created_at: string;
};

type PortfolioItem = {
  title: string;
  slug: string;
  published: boolean;
  priority: number;
};

type GuideArticle = {
  title: string;
  slug: string;
  category: string;
  published: boolean;
};

type Newsletter = {
  title: string;
  slug: string;
  published: boolean;
  created_at: string;
};

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  if (sec < 3600) return `${Math.floor(sec / 60)} min ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} hrs ago`;
  if (sec < 604800) return `${Math.floor(sec / 86400)} days ago`;
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function sourceLabel(src: string): string {
  if (src === "import-guide") return "Import Guide";
  if (src === "direct") return "Direct / Contact form";
  return src.charAt(0).toUpperCase() + src.slice(1);
}

export default async function AdminAnalyticsPage() {
  const now = Date.now();

  const [
    leadsResult,
    matchEventsResult,
    portfolioResult,
    importGuideResult,
    newsletterResult,
  ] = await Promise.all([
    supabaseAdmin
      .from("sourcing_requests")
      .select("created_at, source, matched_slugs")
      .gte("created_at", new Date(now - 56 * 86400000).toISOString())
      .order("created_at", { ascending: true }),

    supabaseAdmin
      .from("portfolio_match_events")
      .select("event_type, clicked_slug, shown_slugs, query_text, created_at")
      .gte("created_at", new Date(now - 30 * 86400000).toISOString()),

    supabaseAdmin
      .from("portfolio_items")
      .select("title, slug, published, priority"),

    supabaseAdmin
      .from("import_guide_articles")
      .select("title, slug, category, published"),

    supabaseAdmin
      .from("newsletter_issues")
      .select("title, slug, published, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const leads = (leadsResult.data ?? []) as Lead[];
  const events = (matchEventsResult.data ?? []) as MatchEvent[];
  const portfolio = (portfolioResult.data ?? []) as PortfolioItem[];
  const importGuide = (importGuideResult.data ?? []) as GuideArticle[];
  const newsletters = (newsletterResult.data ?? []) as Newsletter[];

  // ── Lead metrics ──────────────────────────────────────────────────────────
  const totalLeads = leads.length;
  const oneWeekAgo = new Date(now - 7 * 86400000).toISOString();
  const leadsThisWeek = leads.filter((l) => l.created_at >= oneWeekAgo).length;

  const leadsBySource = leads.reduce<Record<string, number>>((acc, l) => {
    const src = l.source ?? "direct";
    acc[src] = (acc[src] ?? 0) + 1;
    return acc;
  }, {});

  const leadsByWeek = Array.from({ length: 8 }, (_, i) => {
    const weekStart = new Date(now - (7 - i) * 7 * 86400000);
    const weekEnd = new Date(now - (6 - i) * 7 * 86400000);
    const count = leads.filter((l) => {
      const d = new Date(l.created_at);
      return d >= weekStart && d < weekEnd;
    }).length;
    return {
      week: weekStart.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      count,
    };
  });

  // ── Match event metrics ───────────────────────────────────────────────────
  const clickCounts = events
    .filter((e) => e.event_type === "match_clicked" && e.clicked_slug)
    .reduce<Record<string, number>>((acc, e) => {
      const slug = e.clicked_slug!;
      acc[slug] = (acc[slug] ?? 0) + 1;
      return acc;
    }, {});

  const topScenarios = Object.entries(clickCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([slug, clicks]) => ({
      slug,
      title: portfolio.find((p) => p.slug === slug)?.title ?? slug,
      clicks,
    }));

  const totalShown = events.filter((e) => e.event_type === "match_shown").length;
  const totalClicked = events.filter(
    (e) => e.event_type === "match_clicked"
  ).length;
  const clickRate =
    totalShown > 0 ? Math.round((totalClicked / totalShown) * 100) : 0;

  // ── Content metrics ───────────────────────────────────────────────────────
  const publishedPortfolio = portfolio.filter((p) => p.published).length;
  const publishedGuide = importGuide.filter((a) => a.published).length;

  const guideByCategory = importGuide
    .filter((a) => a.published)
    .reduce<Record<string, number>>((acc, a) => {
      acc[a.category] = (acc[a.category] ?? 0) + 1;
      return acc;
    }, {});

  // ── Chart helpers ─────────────────────────────────────────────────────────
  const maxWeekCount = Math.max(...leadsByWeek.map((w) => w.count), 1);
  const lastUpdated = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const recentEvents = [...events]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, 10);

  const cardCls =
    "bg-white border border-gray-200 rounded-2xl p-5 shadow-sm";

  return (
    <main className="min-h-screen bg-gray-50">
      {/* TOP BAR */}
      <div className="border-b border-gray-200 bg-white px-6 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <span className="text-sm font-semibold text-gray-800">Analytics</span>
        <span className="text-xs text-slate-400">Last updated: {lastUpdated}</span>
      </div>

      <div className="px-6 py-6 max-w-6xl mx-auto space-y-6">
        {/* ── STAT CARDS ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total leads */}
          <div className={cardCls}>
            <p className="text-3xl font-bold text-orange-500">{totalLeads}</p>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-1">
              Total sourcing requests
            </p>
            <p className="text-xs text-gray-400 mt-1">
              +{leadsThisWeek} this week
            </p>
          </div>

          {/* Click rate */}
          <div className={cardCls}>
            <p className="text-3xl font-bold text-blue-600">{clickRate}%</p>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-1">
              Match click rate (30 days)
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {totalShown} shown · {totalClicked} clicked
            </p>
          </div>

          {/* Portfolio */}
          <div className={cardCls}>
            <p className="text-3xl font-bold text-green-600">
              {publishedPortfolio}
              <span className="text-lg text-gray-400 font-normal">
                /{portfolio.length}
              </span>
            </p>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-1">
              Portfolio scenarios
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {portfolio.length - publishedPortfolio} drafts
            </p>
          </div>

          {/* Import guide */}
          <div className={cardCls}>
            <p className="text-3xl font-bold text-slate-700">
              {publishedGuide}
              <span className="text-lg text-gray-400 font-normal">
                /{importGuide.length}
              </span>
            </p>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-1">
              Import guide articles
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {importGuide.length - publishedGuide} drafts
            </p>
          </div>
        </div>

        {/* ── LEADS BY WEEK CHART ─────────────────────────────────────────── */}
        <div className={cardCls}>
          <h2 className="text-sm font-semibold text-gray-700 mb-5">
            Leads by week (last 8 weeks)
          </h2>
          {totalLeads === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">
              No leads yet this period
            </p>
          ) : (
            <div className="flex items-end gap-3 h-32">
              {leadsByWeek.map((w, i) => {
                const heightPct = Math.round(
                  (w.count / maxWeekCount) * 100
                );
                return (
                  <div
                    key={i}
                    className="flex flex-col items-center gap-1 flex-1"
                  >
                    {w.count > 0 && (
                      <span className="text-xs text-slate-500 font-medium">
                        {w.count}
                      </span>
                    )}
                    <div className="w-full flex items-end" style={{ height: "96px" }}>
                      <div
                        className="w-full bg-orange-500 rounded-t-md transition-all duration-300"
                        style={{
                          height:
                            w.count === 0
                              ? "4px"
                              : `${heightPct}%`,
                          opacity: w.count === 0 ? 0.2 : 1,
                        }}
                      />
                    </div>
                    <span
                      className="text-xs text-slate-400 truncate w-full text-center"
                      title={w.week}
                    >
                      {w.week}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── TWO COLUMN: TOP SCENARIOS + LEADS BY SOURCE ─────────────────── */}
        <div className="flex gap-4 flex-col lg:flex-row">
          {/* Top scenarios */}
          <div className={`${cardCls} flex-1`}>
            <h2 className="text-sm font-semibold text-gray-700 mb-4">
              Top matched scenarios (30 days)
            </h2>
            {topScenarios.length === 0 ? (
              <p className="text-sm text-gray-400">No click data yet</p>
            ) : (
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-50">
                  {topScenarios.map((s) => (
                    <tr key={s.slug}>
                      <td className="py-2 pr-4">
                        <Link
                          href={`/en/portfolio/${s.slug}`}
                          target="_blank"
                          className="text-gray-700 hover:text-orange-600 transition text-sm"
                        >
                          {s.title}
                        </Link>
                      </td>
                      <td className="py-2 text-right shrink-0">
                        <span className="bg-orange-100 text-orange-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                          {s.clicks} clicks
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Leads by source */}
          <div className={`${cardCls} lg:w-72`}>
            <h2 className="text-sm font-semibold text-gray-700 mb-4">
              Leads by source
            </h2>
            {Object.keys(leadsBySource).length === 0 ? (
              <p className="text-sm text-gray-400">No leads yet</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(leadsBySource)
                  .sort(([, a], [, b]) => b - a)
                  .map(([src, count]) => (
                    <div key={src}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-600">
                          {sourceLabel(src)}
                        </span>
                        <span className="text-xs font-semibold text-gray-700">
                          {count}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div
                          className="bg-orange-500 rounded-full h-2 transition-all"
                          style={{
                            width: `${Math.round(
                              (count / totalLeads) * 100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* ── RECENT MATCH EVENTS ─────────────────────────────────────────── */}
        <div className={cardCls}>
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            Recent match events (last 30 days)
          </h2>
          {recentEvents.length === 0 ? (
            <p className="text-sm text-gray-400">No match events yet</p>
          ) : (
            <div className="space-y-2">
              {recentEvents.map((ev, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                      ev.event_type === "match_shown"
                        ? "bg-green-100 text-green-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {ev.event_type === "match_shown" ? "shown" : "clicked"}
                  </span>
                  {ev.query_text && (
                    <span className="text-gray-500 text-xs truncate flex-1">
                      &ldquo;{ev.query_text.slice(0, 60)}&rdquo;
                    </span>
                  )}
                  {ev.clicked_slug && (
                    <span className="text-gray-600 text-xs truncate flex-1">
                      {ev.clicked_slug}
                    </span>
                  )}
                  <span className="text-gray-400 text-xs ml-auto shrink-0">
                    {timeAgo(ev.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── IMPORT GUIDE COVERAGE ───────────────────────────────────────── */}
        <div className={cardCls}>
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            Import guide coverage
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {IMPORT_GUIDE_CATEGORIES.map((cat) => {
              const count = guideByCategory[cat.slug] ?? 0;
              const fillPct = Math.min(Math.round((count / 5) * 100), 100);
              return (
                <div key={cat.slug}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`text-xs font-medium ${
                        count === 0 ? "text-slate-400" : "text-gray-700"
                      }`}
                    >
                      {cat.icon} {cat.title}
                    </span>
                    <span
                      className={`text-xs font-semibold ${
                        count === 0 ? "text-slate-300" : "text-gray-500"
                      }`}
                    >
                      {count === 0 ? "Coming soon" : `${count}/5`}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div
                      className="bg-orange-500 rounded-full h-1.5 transition-all"
                      style={{ width: `${fillPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── RECENT NEWSLETTERS ──────────────────────────────────────────── */}
        <div className={cardCls}>
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            Recent newsletter issues
          </h2>
          {newsletters.length === 0 ? (
            <p className="text-sm text-gray-400">No newsletter issues yet</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {newsletters.map((n) => (
                <div
                  key={n.slug}
                  className="flex items-center gap-3 py-2.5"
                >
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
                      n.published
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {n.published ? "Published" : "Draft"}
                  </span>
                  <span className="text-sm text-gray-700 truncate flex-1">
                    {n.title}
                  </span>
                  <span className="text-xs text-gray-400 shrink-0">
                    {new Date(n.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
