import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type DeltaType = "percent" | "absolute";

export interface SummaryMetric {
  key: string;
  label: string;
  value: number;
  delta: number;
  deltaType: DeltaType;
}

export type FunnelColor = "green" | "yellow" | "red";

export interface FunnelStage {
  key: string;
  label: string;
  count: number;
  conversionPct: number | null;
  color: FunnelColor;
}

export interface SupplierPerfRow {
  id: string;
  companyName: string;
  country: string | null;
  trustScore: number;
  sentCount: number;
  respondedCount: number;
  replyRate: number;
  avgResponseHours: number | null;
  wonCount: number;
}

export type BuyerActivityStatus = "active" | "one_time" | "stalled";

export interface BuyerActivityRow {
  id: string;
  name: string | null;
  email: string;
  company: string | null;
  requestCount: number;
  lastRequestAt: string | null;
  matchesReceived: number;
  status: BuyerActivityStatus;
}

export type AlertSeverity = "red" | "yellow";

export interface BottleneckAlert {
  key: string;
  severity: AlertSeverity;
  title: string;
  detail: string;
  href?: string;
}

export interface OptimizationSuggestion {
  key: string;
  title: string;
  detail: string;
  href?: string;
}

export interface FunnelDropoff {
  id: string;
  label: string;
  subLabel: string | null;
  href: string;
  date: string | null;
}

export interface QaSnapshot {
  rangeDays: number;
  summary: SummaryMetric[];
  funnel: FunnelStage[];
  supplierPerformance: SupplierPerfRow[];
  buyerActivity: BuyerActivityRow[];
  alerts: BottleneckAlert[];
  suggestions: OptimizationSuggestion[];
}

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 24 * 60 * 60 * 1000);
}

function funnelColor(pct: number): FunnelColor {
  if (pct >= 80) return "green";
  if (pct >= 60) return "yellow";
  return "red";
}

export interface QaMetricsTargets {
  targetReplyRate: number;
  targetResponseTimeHours: number;
  targetTimeToCloseDays: number;
  replyRateDropAlertPct: number;
}

const DEFAULT_QA_TARGETS: QaMetricsTargets = {
  targetReplyRate: 70,
  targetResponseTimeHours: 24,
  targetTimeToCloseDays: 14,
  replyRateDropAlertPct: 15,
};

export async function getQaMetricsTargets(): Promise<QaMetricsTargets> {
  const { data } = await supabaseAdmin.from("qa_metrics_targets").select("*").eq("id", 1).maybeSingle();
  if (!data) return DEFAULT_QA_TARGETS;
  return {
    targetReplyRate: data.target_reply_rate as number,
    targetResponseTimeHours: data.target_response_time_hours as number,
    targetTimeToCloseDays: data.target_time_to_close_days as number,
    replyRateDropAlertPct: data.reply_rate_drop_alert_pct as number,
  };
}

async function countInWindow(
  table: string,
  dateColumn: string,
  start: Date,
  end: Date,
  acceptedOnly = false
): Promise<number> {
  let query = supabaseAdmin
    .from(table)
    .select("*", { count: "exact", head: true })
    .gte(dateColumn, start.toISOString())
    .lt(dateColumn, end.toISOString());
  if (acceptedOnly) query = query.eq("supplier_response", "accepted");
  const { count } = await query;
  return count ?? 0;
}

function computeDelta(today: number, yesterday: number): { delta: number; deltaType: DeltaType } {
  if (yesterday === 0) {
    return { delta: today, deltaType: "absolute" };
  }
  return { delta: Math.round(((today - yesterday) / yesterday) * 1000) / 10, deltaType: "percent" };
}

async function computeSummary(): Promise<SummaryMetric[]> {
  const todayStart = startOfUtcDay(new Date());
  const tomorrowStart = addDays(todayStart, 1);
  const yesterdayStart = addDays(todayStart, -1);

  const [
    newRequestsToday,
    newRequestsYesterday,
    matchesSentToday,
    matchesSentYesterday,
    repliesToday,
    repliesYesterday,
    closedToday,
    closedYesterday,
  ] = await Promise.all([
    countInWindow("sourcing_requests", "created_at", todayStart, tomorrowStart),
    countInWindow("sourcing_requests", "created_at", yesterdayStart, todayStart),
    countInWindow("sourcing_matches", "sent_at", todayStart, tomorrowStart),
    countInWindow("sourcing_matches", "sent_at", yesterdayStart, todayStart),
    countInWindow("sourcing_matches", "supplier_responded_at", todayStart, tomorrowStart),
    countInWindow("sourcing_matches", "supplier_responded_at", yesterdayStart, todayStart),
    countInWindow("sourcing_matches", "closed_at", todayStart, tomorrowStart, true),
    countInWindow("sourcing_matches", "closed_at", yesterdayStart, todayStart, true),
  ]);

  return [
    {
      key: "new_requests",
      label: "New requests",
      value: newRequestsToday,
      ...computeDelta(newRequestsToday, newRequestsYesterday),
    },
    {
      key: "matches_sent",
      label: "Matches sent",
      value: matchesSentToday,
      ...computeDelta(matchesSentToday, matchesSentYesterday),
    },
    {
      key: "supplier_replies",
      label: "Supplier replies",
      value: repliesToday,
      ...computeDelta(repliesToday, repliesYesterday),
    },
    {
      key: "deals_closed",
      label: "Deals closed",
      value: closedToday,
      ...computeDelta(closedToday, closedYesterday),
    },
  ];
}

async function computeFunnel(rangeDays: number): Promise<FunnelStage[]> {
  const rangeEnd = new Date();
  const rangeStart = addDays(rangeEnd, -rangeDays);
  const startIso = rangeStart.toISOString();
  const endIso = rangeEnd.toISOString();

  const { count: signupCount } = await supabaseAdmin
    .from("buyer_profiles")
    .select("*", { count: "exact", head: true })
    .gte("created_at", startIso)
    .lte("created_at", endIso);

  const { data: requestsInRange } = await supabaseAdmin
    .from("sourcing_requests")
    .select("id, auth_user_id")
    .gte("created_at", startIso)
    .lte("created_at", endIso);

  const requests = requestsInRange ?? [];
  const requestIds = requests.map((r) => r.id as string);
  const firstRequestCount = new Set(
    requests.filter((r) => r.auth_user_id).map((r) => r.auth_user_id as string)
  ).size;

  let matchedCount = 0;
  if (requestIds.length > 0) {
    const { data: sentMatches } = await supabaseAdmin
      .from("sourcing_matches")
      .select("request_id")
      .not("sent_at", "is", null)
      .in("request_id", requestIds);
    matchedCount = new Set((sentMatches ?? []).map((m) => m.request_id as string)).size;
  }

  const { data: viewedEvents } = await supabaseAdmin
    .from("platform_events")
    .select("entity_id")
    .eq("event_type", "matches_viewed")
    .gte("created_at", startIso)
    .lte("created_at", endIso);
  const matchesViewedCount = new Set(
    (viewedEvents ?? []).map((e) => e.entity_id as string).filter(Boolean)
  ).size;

  const { data: repliedMatches } = await supabaseAdmin
    .from("sourcing_matches")
    .select("request_id")
    .not("supplier_response", "is", null)
    .gte("supplier_responded_at", startIso)
    .lte("supplier_responded_at", endIso);
  const supplierRepliedCount = new Set(
    (repliedMatches ?? []).map((m) => m.request_id as string)
  ).size;

  const { data: closedMatches } = await supabaseAdmin
    .from("sourcing_matches")
    .select("request_id")
    .eq("status", "closed")
    .eq("supplier_response", "accepted")
    .gte("closed_at", startIso)
    .lte("closed_at", endIso);
  const dealClosedCount = new Set((closedMatches ?? []).map((m) => m.request_id as string)).size;

  const base = signupCount ?? 0;
  const stages: { key: string; label: string; count: number }[] = [
    { key: "signup", label: "Signup", count: base },
    { key: "first_request", label: "First request", count: firstRequestCount },
    { key: "matched", label: "Matched", count: matchedCount },
    { key: "matches_viewed", label: "Matches viewed", count: matchesViewedCount },
    { key: "supplier_replied", label: "Supplier replied", count: supplierRepliedCount },
    { key: "deal_closed", label: "Deal closed", count: dealClosedCount },
  ];

  return stages.map((stage, i) => {
    if (i === 0) {
      return { ...stage, conversionPct: null, color: "green" as FunnelColor };
    }
    const pct = base > 0 ? Math.round((stage.count / base) * 1000) / 10 : 0;
    return { ...stage, conversionPct: pct, color: funnelColor(pct) };
  });
}

async function computeSupplierPerformance(rangeDays: number): Promise<SupplierPerfRow[]> {
  const rangeEnd = new Date();
  const rangeStart = addDays(rangeEnd, -rangeDays);

  const { data: matches } = await supabaseAdmin
    .from("sourcing_matches")
    .select("supplier_id, sent_at, supplier_response, supplier_responded_at, status")
    .not("sent_at", "is", null)
    .gte("sent_at", rangeStart.toISOString())
    .lte("sent_at", rangeEnd.toISOString());

  type SupplierAgg = {
    sent: number;
    responded: number;
    won: number;
    responseHoursTotal: number;
    responseHoursCount: number;
  };

  const bySupplier = new Map<string, SupplierAgg>();
  for (const m of matches ?? []) {
    const supplierId = m.supplier_id as string;
    const entry: SupplierAgg =
      bySupplier.get(supplierId) ?? { sent: 0, responded: 0, won: 0, responseHoursTotal: 0, responseHoursCount: 0 };
    entry.sent += 1;
    if (m.supplier_response) entry.responded += 1;
    if (m.status === "closed" && m.supplier_response === "accepted") entry.won += 1;
    if (m.supplier_responded_at && m.sent_at) {
      const hours =
        (new Date(m.supplier_responded_at as string).getTime() - new Date(m.sent_at as string).getTime()) /
        (1000 * 60 * 60);
      entry.responseHoursTotal += hours;
      entry.responseHoursCount += 1;
    }
    bySupplier.set(supplierId, entry);
  }

  const supplierIds = Array.from(bySupplier.keys());
  if (supplierIds.length === 0) return [];

  const { data: suppliers } = await supabaseAdmin
    .from("supplier_offerings")
    .select("id, company_name, country_of_origin, trust_score")
    .in("id", supplierIds);

  const rows: SupplierPerfRow[] = (suppliers ?? []).map((s) => {
    const entry = bySupplier.get(s.id as string) as SupplierAgg;
    return {
      id: s.id as string,
      companyName: s.company_name as string,
      country: s.country_of_origin as string | null,
      trustScore: (s.trust_score as number | null) ?? 0,
      sentCount: entry.sent,
      respondedCount: entry.responded,
      replyRate: entry.sent > 0 ? Math.round((entry.responded / entry.sent) * 1000) / 10 : 0,
      avgResponseHours:
        entry.responseHoursCount > 0
          ? Math.round((entry.responseHoursTotal / entry.responseHoursCount) * 10) / 10
          : null,
      wonCount: entry.won,
    };
  });

  return rows.sort((a, b) => b.replyRate - a.replyRate).slice(0, 15);
}

// All-time (not range-filtered): "Stalled" depends on last_request_at across
// a buyer's whole history, not just the selected window.
async function computeBuyerActivity(): Promise<BuyerActivityRow[]> {
  const { data: buyers } = await supabaseAdmin.from("buyer_profiles").select("id, name, email, company");
  if (!buyers || buyers.length === 0) return [];

  const buyerIds = buyers.map((b) => b.id as string);

  const { data: requests } = await supabaseAdmin
    .from("sourcing_requests")
    .select("id, auth_user_id, created_at")
    .in("auth_user_id", buyerIds);

  const byBuyer = new Map<string, { requestIds: string[]; lastRequestAt: string | null }>();
  for (const r of requests ?? []) {
    const buyerId = r.auth_user_id as string;
    const entry = byBuyer.get(buyerId) ?? { requestIds: [], lastRequestAt: null };
    entry.requestIds.push(r.id as string);
    const createdAt = r.created_at as string;
    if (!entry.lastRequestAt || createdAt > entry.lastRequestAt) {
      entry.lastRequestAt = createdAt;
    }
    byBuyer.set(buyerId, entry);
  }

  const allRequestIds = (requests ?? []).map((r) => r.id as string);
  const matchCountByRequest = new Map<string, number>();
  if (allRequestIds.length > 0) {
    const { data: sentMatches } = await supabaseAdmin
      .from("sourcing_matches")
      .select("request_id")
      .not("sent_at", "is", null)
      .in("request_id", allRequestIds);
    for (const m of sentMatches ?? []) {
      const rid = m.request_id as string;
      matchCountByRequest.set(rid, (matchCountByRequest.get(rid) ?? 0) + 1);
    }
  }

  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  const now = Date.now();

  return buyers
    .map((b) => {
      const entry = byBuyer.get(b.id as string);
      const requestCount = entry?.requestIds.length ?? 0;
      const lastRequestAt = entry?.lastRequestAt ?? null;
      const matchesReceived = (entry?.requestIds ?? []).reduce(
        (sum, rid) => sum + (matchCountByRequest.get(rid) ?? 0),
        0
      );

      let status: BuyerActivityStatus = "active";
      if (requestCount === 1) status = "one_time";
      if (requestCount > 1 && lastRequestAt && now - new Date(lastRequestAt).getTime() > THIRTY_DAYS_MS) {
        status = "stalled";
      }

      return {
        id: b.id as string,
        name: b.name as string | null,
        email: b.email as string,
        company: b.company as string | null,
        requestCount,
        lastRequestAt,
        matchesReceived,
        status,
      };
    })
    .filter((r) => r.requestCount > 0)
    .sort((a, b) => b.requestCount - a.requestCount)
    .slice(0, 15);
}

async function getReplyRateTrend(): Promise<{ current: number; prior: number; drop: number } | null> {
  const now = new Date();
  const sevenDaysAgo = addDays(now, -7);
  const fourteenDaysAgo = addDays(now, -14);

  const [{ data: currentMatches }, { data: priorMatches }] = await Promise.all([
    supabaseAdmin
      .from("sourcing_matches")
      .select("supplier_response")
      .not("sent_at", "is", null)
      .gte("sent_at", sevenDaysAgo.toISOString())
      .lte("sent_at", now.toISOString()),
    supabaseAdmin
      .from("sourcing_matches")
      .select("supplier_response")
      .not("sent_at", "is", null)
      .gte("sent_at", fourteenDaysAgo.toISOString())
      .lt("sent_at", sevenDaysAgo.toISOString()),
  ]);

  const currentRows = currentMatches ?? [];
  const priorRows = priorMatches ?? [];
  if (currentRows.length === 0 || priorRows.length === 0) return null;

  const currentRate = (currentRows.filter((m) => m.supplier_response).length / currentRows.length) * 100;
  const priorRate = (priorRows.filter((m) => m.supplier_response).length / priorRows.length) * 100;

  return {
    current: Math.round(currentRate * 10) / 10,
    prior: Math.round(priorRate * 10) / 10,
    drop: Math.round((priorRate - currentRate) * 10) / 10,
  };
}

interface InactiveSupplier {
  supplierId: string;
  companyName: string;
  sentCount: number;
  oldestPendingAt: string;
}

async function getInactiveSuppliers(responseTimeThresholdMs: number): Promise<InactiveSupplier[]> {
  const thirtyDaysAgo = addDays(new Date(), -30);

  const { data: matches } = await supabaseAdmin
    .from("sourcing_matches")
    .select("supplier_id, sent_at, supplier_response")
    .not("sent_at", "is", null)
    .gte("sent_at", thirtyDaysAgo.toISOString());

  type Agg = { sent: number; responded: number; oldestPending: string | null };
  const bySupplier = new Map<string, Agg>();
  for (const m of matches ?? []) {
    const sid = m.supplier_id as string;
    const entry: Agg = bySupplier.get(sid) ?? { sent: 0, responded: 0, oldestPending: null };
    entry.sent += 1;
    if (m.supplier_response) {
      entry.responded += 1;
    } else {
      const sentAt = m.sent_at as string;
      if (!entry.oldestPending || sentAt < entry.oldestPending) entry.oldestPending = sentAt;
    }
    bySupplier.set(sid, entry);
  }

  const now = Date.now();
  const candidates = Array.from(bySupplier.entries())
    .filter(
      ([, agg]) =>
        agg.sent > 0 &&
        agg.responded === 0 &&
        agg.oldestPending &&
        now - new Date(agg.oldestPending).getTime() > responseTimeThresholdMs
    )
    .sort((a, b) => b[1].sent - a[1].sent)
    .slice(0, 5);

  if (candidates.length === 0) return [];

  const supplierIds = candidates.map(([id]) => id);
  const { data: suppliers } = await supabaseAdmin
    .from("supplier_offerings")
    .select("id, company_name")
    .in("id", supplierIds);

  const nameById = new Map((suppliers ?? []).map((s) => [s.id as string, s.company_name as string]));

  return candidates.map(([id, agg]) => ({
    supplierId: id,
    companyName: nameById.get(id) ?? "Unknown supplier",
    sentCount: agg.sent,
    oldestPendingAt: agg.oldestPending as string,
  }));
}

interface UnmatchedRequest {
  id: string;
  productName: string | null;
  category: string | null;
  createdAt: string;
  ageDays: number;
}

async function getUnmatchedRequests(responseTimeThresholdMs: number): Promise<UnmatchedRequest[]> {
  const cutoff = new Date(Date.now() - responseTimeThresholdMs);

  const { data: requests } = await supabaseAdmin
    .from("sourcing_requests")
    .select("id, product_name, category, created_at")
    .lte("created_at", cutoff.toISOString())
    .order("created_at", { ascending: true });

  const rows = requests ?? [];
  if (rows.length === 0) return [];

  const requestIds = rows.map((r) => r.id as string);
  const { data: sentMatches } = await supabaseAdmin
    .from("sourcing_matches")
    .select("request_id")
    .not("sent_at", "is", null)
    .in("request_id", requestIds);

  const matchedIds = new Set((sentMatches ?? []).map((m) => m.request_id as string));
  const now = Date.now();

  return rows
    .filter((r) => !matchedIds.has(r.id as string))
    .map((r) => ({
      id: r.id as string,
      productName: r.product_name as string | null,
      category: r.category as string | null,
      createdAt: r.created_at as string,
      ageDays: Math.floor((now - new Date(r.created_at as string).getTime()) / (24 * 60 * 60 * 1000)),
    }));
}

async function getTimeToCloseTrend(): Promise<{ current: number; prior: number; pctChange: number } | null> {
  const now = new Date();
  const fourteenDaysAgo = addDays(now, -14);
  const twentyEightDaysAgo = addDays(now, -28);

  type ClosedRow = { sent_at: string | null; closed_at: string | null };

  const [{ data: currentClosed }, { data: priorClosed }] = await Promise.all([
    supabaseAdmin
      .from("sourcing_matches")
      .select("sent_at, closed_at")
      .eq("status", "closed")
      .not("sent_at", "is", null)
      .gte("closed_at", fourteenDaysAgo.toISOString())
      .lte("closed_at", now.toISOString()),
    supabaseAdmin
      .from("sourcing_matches")
      .select("sent_at, closed_at")
      .eq("status", "closed")
      .not("sent_at", "is", null)
      .gte("closed_at", twentyEightDaysAgo.toISOString())
      .lt("closed_at", fourteenDaysAgo.toISOString()),
  ]);

  const avgDays = (rows: ClosedRow[]): number | null => {
    if (rows.length === 0) return null;
    const total = rows.reduce(
      (sum, r) => sum + (new Date(r.closed_at as string).getTime() - new Date(r.sent_at as string).getTime()),
      0
    );
    return total / rows.length / (24 * 60 * 60 * 1000);
  };

  const current = avgDays((currentClosed ?? []) as ClosedRow[]);
  const prior = avgDays((priorClosed ?? []) as ClosedRow[]);

  if (current === null || prior === null || prior === 0) return null;

  return {
    current: Math.round(current * 10) / 10,
    prior: Math.round(prior * 10) / 10,
    pctChange: Math.round(((current - prior) / prior) * 1000) / 10,
  };
}

async function getBuyersWithoutMatchesViewed(buyerActivity: BuyerActivityRow[]): Promise<BuyerActivityRow[]> {
  const candidates = buyerActivity.filter((b) => b.matchesReceived > 0);
  if (candidates.length === 0) return [];

  const { data: viewedEvents } = await supabaseAdmin
    .from("platform_events")
    .select("user_id")
    .eq("event_type", "matches_viewed")
    .in(
      "user_id",
      candidates.map((b) => b.id)
    );

  const viewedUserIds = new Set((viewedEvents ?? []).map((e) => e.user_id as string));
  return candidates.filter((b) => !viewedUserIds.has(b.id));
}

async function computeBottlenecks(
  supplierPerformance: SupplierPerfRow[],
  buyerActivity: BuyerActivityRow[],
  targets: QaMetricsTargets
): Promise<{ alerts: BottleneckAlert[]; suggestions: OptimizationSuggestion[] }> {
  const responseTimeThresholdMs = targets.targetResponseTimeHours * 60 * 60 * 1000;

  const [replyTrend, inactiveSuppliers, unmatchedRequests, timeToCloseTrend, buyersWithoutViews] = await Promise.all([
    getReplyRateTrend(),
    getInactiveSuppliers(responseTimeThresholdMs),
    getUnmatchedRequests(responseTimeThresholdMs),
    getTimeToCloseTrend(),
    getBuyersWithoutMatchesViewed(buyerActivity),
  ]);

  const alerts: BottleneckAlert[] = [];

  if (replyTrend && replyTrend.drop > targets.replyRateDropAlertPct) {
    alerts.push({
      key: "reply_rate_drop",
      severity: replyTrend.drop > targets.replyRateDropAlertPct * 2 ? "red" : "yellow",
      title: `Reply rate dropped ${replyTrend.drop} points`,
      detail: `${replyTrend.prior}% (prior 7d) → ${replyTrend.current}% (last 7d)`,
    });
  }

  for (const s of inactiveSuppliers) {
    alerts.push({
      key: `inactive_supplier_${s.supplierId}`,
      severity: "red",
      title: `${s.companyName}: ${s.sentCount} match${s.sentCount === 1 ? "" : "es"} sent, no replies`,
      detail: `Oldest unanswered since ${new Date(s.oldestPendingAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      })}`,
      href: `/en/admin/qa-metrics/suppliers/${s.supplierId}`,
    });
  }

  for (const r of unmatchedRequests.slice(0, 5)) {
    alerts.push({
      key: `unmatched_request_${r.id}`,
      severity: "yellow",
      title: `${r.productName ?? "Untitled request"}: no matches sent`,
      detail: `${r.ageDays}d old${r.category ? ` · ${r.category}` : ""}`,
      href: `/admin/requests/${r.id}`,
    });
  }

  if (timeToCloseTrend && timeToCloseTrend.pctChange > 20) {
    alerts.push({
      key: "time_to_close_trend",
      severity: timeToCloseTrend.pctChange > 50 ? "red" : "yellow",
      title: `Time-to-close is up ${timeToCloseTrend.pctChange}%`,
      detail: `${timeToCloseTrend.prior}d (prior 14d) → ${timeToCloseTrend.current}d (last 14d)`,
      href: "/en/admin/qa-metrics/funnel/deal_closed",
    });
  }

  const suggestions: OptimizationSuggestion[] = [];

  const zeroReplySupplier = supplierPerformance
    .filter((s) => s.sentCount >= 3 && s.replyRate === 0)
    .sort((a, b) => b.sentCount - a.sentCount)[0];
  if (zeroReplySupplier) {
    suggestions.push({
      key: "zero_reply_supplier",
      title: `${zeroReplySupplier.companyName} has a 0% reply rate over ${zeroReplySupplier.sentCount} matches`,
      detail: "Consider pausing outreach to this supplier or following up directly.",
      href: `/en/admin/qa-metrics/suppliers/${zeroReplySupplier.id}`,
    });
  }

  const byCategory = new Map<string, number>();
  for (const r of unmatchedRequests) {
    const cat = r.category ?? "Uncategorized";
    byCategory.set(cat, (byCategory.get(cat) ?? 0) + 1);
  }
  const topCategories = Array.from(byCategory.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  for (const [category, count] of topCategories) {
    suggestions.push({
      key: `unmatched_category_${category}`,
      title: `${count} request${count === 1 ? "" : "s"} in ${category} have no matches`,
      detail: "Supplier coverage may be thin for this category.",
    });
  }

  if (timeToCloseTrend && timeToCloseTrend.pctChange > 20) {
    suggestions.push({
      key: "time_to_close_review",
      title: "Time-to-close is trending up",
      detail: "Review the deal-closing workflow for delays.",
      href: "/en/admin/qa-metrics/funnel/deal_closed",
    });
  }

  for (const b of buyersWithoutViews.slice(0, 5)) {
    suggestions.push({
      key: `buyer_no_view_${b.id}`,
      title: `${b.name || b.company || b.email} hasn't viewed their matches`,
      detail: `${b.matchesReceived} match${b.matchesReceived === 1 ? "" : "es"} waiting — consider a nudge email.`,
      href: `/en/admin/qa-metrics/buyers/${b.id}`,
    });
  }

  return { alerts, suggestions };
}

export interface WeeklyReplyRate {
  weekStart: string;
  sentCount: number;
  respondedCount: number;
  replyRate: number;
}

export async function getSupplierWeeklyReplyRates(supplierId: string): Promise<WeeklyReplyRate[]> {
  const now = new Date();
  const rangeStart = addDays(now, -56);

  const { data: matches } = await supabaseAdmin
    .from("sourcing_matches")
    .select("sent_at, supplier_response")
    .eq("supplier_id", supplierId)
    .not("sent_at", "is", null)
    .gte("sent_at", rangeStart.toISOString());

  const rows = matches ?? [];
  const weeks: WeeklyReplyRate[] = [];

  for (let i = 7; i >= 0; i--) {
    const weekEnd = addDays(now, -i * 7);
    const weekStart = addDays(weekEnd, -7);
    const inWeek = rows.filter((m) => {
      const sentAt = new Date(m.sent_at as string).getTime();
      return sentAt >= weekStart.getTime() && sentAt < weekEnd.getTime();
    });
    const sentCount = inWeek.length;
    const respondedCount = inWeek.filter((m) => m.supplier_response).length;
    weeks.push({
      weekStart: weekStart.toISOString(),
      sentCount,
      respondedCount,
      replyRate: sentCount > 0 ? Math.round((respondedCount / sentCount) * 100) : 0,
    });
  }

  return weeks;
}

type RequestMatchRow = {
  request_id: string;
  sent_at: string | null;
  supplier_response: string | null;
  status: string | null;
};

export async function getFunnelDropoffs(stage: string, rangeDays: number): Promise<FunnelDropoff[]> {
  const rangeEnd = new Date();
  const rangeStart = addDays(rangeEnd, -rangeDays);
  const startIso = rangeStart.toISOString();
  const endIso = rangeEnd.toISOString();

  if (stage === "signup") return [];

  if (stage === "first_request") {
    const { data: buyers } = await supabaseAdmin
      .from("buyer_profiles")
      .select("id, name, email, company, created_at")
      .gte("created_at", startIso)
      .lte("created_at", endIso);

    const buyerRows = buyers ?? [];
    if (buyerRows.length === 0) return [];

    const buyerIds = buyerRows.map((b) => b.id as string);
    const { data: requests } = await supabaseAdmin
      .from("sourcing_requests")
      .select("auth_user_id")
      .in("auth_user_id", buyerIds);

    const buyersWithRequests = new Set((requests ?? []).map((r) => r.auth_user_id as string));

    return buyerRows
      .filter((b) => !buyersWithRequests.has(b.id as string))
      .map((b) => ({
        id: b.id as string,
        label: (b.name as string | null) || (b.company as string | null) || (b.email as string),
        subLabel: `Joined ${new Date(b.created_at as string).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}`,
        href: `/en/admin/qa-metrics/buyers/${b.id}`,
        date: b.created_at as string,
      }));
  }

  const { data: requests } = await supabaseAdmin
    .from("sourcing_requests")
    .select("id, product_name, company, created_at")
    .gte("created_at", startIso)
    .lte("created_at", endIso);

  const requestRows = requests ?? [];
  if (requestRows.length === 0) return [];

  const requestIds = requestRows.map((r) => r.id as string);

  const [{ data: matches }, { data: viewedEvents }] = await Promise.all([
    supabaseAdmin
      .from("sourcing_matches")
      .select("request_id, sent_at, supplier_response, status")
      .in("request_id", requestIds),
    supabaseAdmin
      .from("platform_events")
      .select("entity_id")
      .eq("event_type", "matches_viewed")
      .in("entity_id", requestIds),
  ]);

  const matchesByRequest = new Map<string, RequestMatchRow[]>();
  for (const m of (matches ?? []) as RequestMatchRow[]) {
    const rid = m.request_id;
    const arr = matchesByRequest.get(rid) ?? [];
    arr.push(m);
    matchesByRequest.set(rid, arr);
  }

  const viewedRequestIds = new Set((viewedEvents ?? []).map((e) => e.entity_id as string));

  const result: FunnelDropoff[] = [];

  for (const r of requestRows) {
    const rid = r.id as string;
    const reqMatches = matchesByRequest.get(rid) ?? [];
    const reachedMatched = reqMatches.some((m) => m.sent_at);
    const reachedMatchesViewed = viewedRequestIds.has(rid);
    const reachedSupplierReplied = reqMatches.some((m) => m.supplier_response);
    const reachedDealClosed = reqMatches.some((m) => m.status === "closed" && m.supplier_response === "accepted");

    let dropped = false;
    if (stage === "matched") {
      dropped = !reachedMatched;
    } else if (stage === "matches_viewed") {
      dropped = reachedMatched && !reachedMatchesViewed;
    } else if (stage === "supplier_replied") {
      dropped = reachedMatchesViewed && !reachedSupplierReplied;
    } else if (stage === "deal_closed") {
      dropped = reachedSupplierReplied && !reachedDealClosed;
    }

    if (dropped) {
      result.push({
        id: rid,
        label: (r.product_name as string | null) ?? "Untitled request",
        subLabel: (r.company as string | null) ?? null,
        href: `/admin/requests/${rid}`,
        date: r.created_at as string,
      });
    }
  }

  return result;
}

export async function computeQaSnapshot(rangeDays: number): Promise<QaSnapshot> {
  const [targets, summary, funnel, supplierPerformance, buyerActivity] = await Promise.all([
    getQaMetricsTargets(),
    computeSummary(),
    computeFunnel(rangeDays),
    computeSupplierPerformance(rangeDays),
    computeBuyerActivity(),
  ]);

  const { alerts, suggestions } = await computeBottlenecks(supplierPerformance, buyerActivity, targets);

  return {
    rangeDays,
    summary,
    funnel,
    supplierPerformance,
    buyerActivity,
    alerts,
    suggestions,
  };
}

export const DEFAULT_RANGE_DAYS = 30;

export interface QaMetricsSnapshotRecord {
  snapshotDate: string;
  data: QaSnapshot;
  createdAt: string;
}

export async function getLatestQaSnapshot(): Promise<QaMetricsSnapshotRecord | null> {
  const { data } = await supabaseAdmin
    .from("qa_metrics_daily_snapshot")
    .select("snapshot_date, data, created_at")
    .order("snapshot_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  return {
    snapshotDate: data.snapshot_date as string,
    data: data.data as QaSnapshot,
    createdAt: data.created_at as string,
  };
}

export async function saveQaMetricsSnapshot(snapshot: QaSnapshot): Promise<void> {
  const snapshotDate = startOfUtcDay(new Date()).toISOString().slice(0, 10);
  await supabaseAdmin
    .from("qa_metrics_daily_snapshot")
    .upsert({ snapshot_date: snapshotDate, data: snapshot }, { onConflict: "snapshot_date" });
}

export type ReportStatus = "healthy" | "degrading" | "critical";

export interface WeeklyReportMetric {
  key: string;
  label: string;
  value: number | null;
  target: number;
  unit: string;
  status: ReportStatus;
}

export interface WeeklyReportData {
  snapshotDate: string;
  metrics: WeeklyReportMetric[];
  alerts: BottleneckAlert[];
  suggestions: OptimizationSuggestion[];
}

function statusForHigherIsBetter(value: number | null, target: number): ReportStatus {
  if (value === null) return "healthy";
  if (value >= target) return "healthy";
  if (value >= target * 0.8) return "degrading";
  return "critical";
}

function statusForLowerIsBetter(value: number | null, target: number): ReportStatus {
  if (value === null) return "healthy";
  if (value <= target) return "healthy";
  if (value <= target * 1.5) return "degrading";
  return "critical";
}

export async function getWeeklyReportData(): Promise<WeeklyReportData | null> {
  const { data: rows } = await supabaseAdmin
    .from("qa_metrics_daily_snapshot")
    .select("snapshot_date, data")
    .order("snapshot_date", { ascending: false })
    .limit(7);

  if (!rows || rows.length === 0) return null;

  const latest = rows[0];
  const snapshot = latest.data as QaSnapshot;
  const targets = await getQaMetricsTargets();

  const suppliersWithReplies = snapshot.supplierPerformance.filter((s) => s.sentCount > 0);
  const totalSent = suppliersWithReplies.reduce((sum, s) => sum + s.sentCount, 0);
  const totalResponded = suppliersWithReplies.reduce((sum, s) => sum + s.respondedCount, 0);
  const overallReplyRate = totalSent > 0 ? Math.round((totalResponded / totalSent) * 1000) / 10 : null;

  const responseTimes = snapshot.supplierPerformance
    .map((s) => s.avgResponseHours)
    .filter((h): h is number => h !== null);
  const avgResponseHours =
    responseTimes.length > 0
      ? Math.round((responseTimes.reduce((sum, h) => sum + h, 0) / responseTimes.length) * 10) / 10
      : null;

  const timeToCloseTrend = await getTimeToCloseTrend();
  const avgTimeToCloseDays = timeToCloseTrend?.current ?? null;

  const metrics: WeeklyReportMetric[] = [
    {
      key: "reply_rate",
      label: "Overall reply rate",
      value: overallReplyRate,
      target: targets.targetReplyRate,
      unit: "%",
      status: statusForHigherIsBetter(overallReplyRate, targets.targetReplyRate),
    },
    {
      key: "response_time",
      label: "Avg. response time",
      value: avgResponseHours,
      target: targets.targetResponseTimeHours,
      unit: "h",
      status: statusForLowerIsBetter(avgResponseHours, targets.targetResponseTimeHours),
    },
    {
      key: "time_to_close",
      label: "Avg. time to close",
      value: avgTimeToCloseDays,
      target: targets.targetTimeToCloseDays,
      unit: "d",
      status: statusForLowerIsBetter(avgTimeToCloseDays, targets.targetTimeToCloseDays),
    },
  ];

  return {
    snapshotDate: latest.snapshot_date as string,
    metrics,
    alerts: snapshot.alerts,
    suggestions: snapshot.suggestions,
  };
}
