import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import PortfolioListClient from "@/components/admin/PortfolioListClient";
import PortfolioQuickEntry from "@/components/admin/PortfolioQuickEntry";
import LeadsTable from "@/components/admin/LeadsTable";
import { getRecentEvents } from "@/lib/analytics/portfolioAnalytics";
import type { EventRow } from "@/lib/analytics/portfolioAnalytics";
import type { LeadRow } from "@/components/admin/LeadSlideOver";

type ListItem = {
  id: string;
  title: string;
  slug: string;
  category: string | null;
  published: boolean;
  priority: number;
  updated_at: string | null;
};


function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  if (sec < 3600) return `${Math.floor(sec / 60)} min ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} hrs ago`;
  if (sec < 604800) return `${Math.floor(sec / 86400)} days ago`;
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default async function AdminPortfolioPage() {
  const [portfolioResult, requestsResult, recentEvents] = await Promise.all([
    supabaseAdmin
      .from("portfolio_items")
      .select("id, title, slug, category, published, priority, updated_at")
      .order("updated_at", { ascending: false })
      .limit(200),
    supabaseAdmin
      .from("sourcing_requests")
      .select("id, name, email, company, message, market, private_label, intent_json, matched_slugs, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
    getRecentEvents(5),
  ]);

  const items = (portfolioResult.data || []) as ListItem[];
  const requests = (requestsResult.data || []) as LeadRow[];

  return (
    <main className="min-h-screen bg-gray-50">
      {/* TOP BAR */}
      <div className="border-b border-gray-200 bg-white px-6 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <span className="text-sm font-semibold text-gray-800">Portfolio CMS</span>
        <div className="flex items-center gap-2">
          <PortfolioQuickEntry />
          <Link
            href="/admin/portfolio/new"
            className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition"
          >
            + New item
          </Link>
        </div>
      </div>

      {/* RECENT MATCH ACTIVITY */}
      <div className="border-b border-gray-200 bg-white px-6 py-3 shadow-sm">
        <span className="text-sm font-semibold text-gray-800">Recent match activity</span>
      </div>
      <div className="px-6 py-4 max-w-6xl mx-auto">
        {recentEvents.length === 0 ? (
          <p className="text-sm text-gray-400">No events yet</p>
        ) : (
          <div className="space-y-2">
            {recentEvents.map((ev: EventRow) => (
              <div key={ev.id} className="flex items-center gap-3 text-sm">
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    ev.event_type === "match_shown"
                      ? "bg-green-100 text-green-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {ev.event_type === "match_shown" ? "shown" : "clicked"}
                </span>
                <span className="text-gray-600 truncate max-w-75">
                  {ev.clicked_slug ?? `${ev.shown_slugs?.length ?? 0} scenarios`}
                </span>
                {ev.query_text && (
                  <span className="text-gray-400 text-xs truncate max-w-50">
                    &ldquo;{ev.query_text.slice(0, 60)}&rdquo;
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

      <PortfolioListClient items={items} />

      {/* SOURCING REQUESTS */}
      <div className="border-t border-gray-200 bg-white px-6 py-3 mt-2 shadow-sm">
        <span className="text-sm font-semibold text-gray-800">Recent sourcing requests</span>
      </div>
      <div className="p-6 max-w-6xl mx-auto">
        <LeadsTable leads={requests} />
      </div>
    </main>
  );
}
