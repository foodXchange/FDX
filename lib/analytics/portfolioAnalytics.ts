import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type EventRow = {
  id: string;
  event_type: string;
  query_text: string | null;
  shown_slugs: string[] | null;
  clicked_slug: string | null;
  page_path: string | null;
  session_id: string | null;
  created_at: string;
};

export async function getItemAnalytics(
  slug: string
): Promise<{ shownCount: number; clickedCount: number }> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  try {
    const [shownResult, clickedResult] = await Promise.all([
      supabaseAdmin
        .from("portfolio_match_events")
        .select("*", { count: "exact", head: true })
        .eq("event_type", "match_shown")
        .filter("shown_slugs", "cs", `{${slug}}`)
        .gte("created_at", thirtyDaysAgo),
      supabaseAdmin
        .from("portfolio_match_events")
        .select("*", { count: "exact", head: true })
        .eq("event_type", "match_clicked")
        .eq("clicked_slug", slug)
        .gte("created_at", thirtyDaysAgo),
    ]);
    return {
      shownCount: shownResult.count ?? 0,
      clickedCount: clickedResult.count ?? 0,
    };
  } catch {
    return { shownCount: 0, clickedCount: 0 };
  }
}

export async function getRecentEvents(limit = 20): Promise<EventRow[]> {
  try {
    const { data } = await supabaseAdmin
      .from("portfolio_match_events")
      .select(
        "id, event_type, query_text, shown_slugs, clicked_slug, page_path, session_id, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(limit);
    return (data || []) as EventRow[];
  } catch {
    return [];
  }
}
