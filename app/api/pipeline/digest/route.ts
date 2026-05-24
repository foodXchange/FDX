import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verifySession, COOKIE_NAME } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function checkAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;
  return Boolean(session && (await verifySession(session)));
}

export async function GET(_req: NextRequest) {
  if (!(await checkAuth())) {
    return new Response("Unauthorized", { status: 401 });
  }

  const today = new Date().toISOString().slice(0, 10);

  const [{ data: matchRows }, { data: topPending }] = await Promise.all([
    supabaseAdmin
      .from("sourcing_matches")
      .select("status, created_at, responded_at"),
    supabaseAdmin
      .from("sourcing_matches")
      .select(
        "product_name, company_name, match_score, sourcing_requests!request_id(company)"
      )
      .in("status", ["pending", "new"])
      .order("match_score", { ascending: false })
      .limit(3),
  ]);

  type MatchRow = { status: string; created_at: string | null; responded_at: string | null };
  const rows = (matchRows ?? []) as MatchRow[];

  const newToday = rows.filter(
    (r) => r.created_at?.startsWith(today)
  ).length;
  const awaitingApproval = rows.filter(
    (r) => r.status === "pending" || r.status === "new"
  ).length;
  const sent = rows.filter((r) => r.status === "sent").length;
  const responded = rows.filter((r) => r.responded_at?.startsWith(today)).length;

  type PendingRow = {
    product_name: string;
    company_name: string;
    match_score: number;
    sourcing_requests: { company: string | null } | null;
  };

  const topRows = (topPending ?? []) as unknown as PendingRow[];
  const topLines = topRows
    .map(
      (r) =>
        `- ${r.product_name} for ${r.sourcing_requests?.company ?? "buyer"} → ${r.company_name} (score: ${r.match_score})`
    )
    .join("\n");

  const digest = [
    "FoodXchange Daily Digest",
    "------------------------",
    `New matches today: ${newToday}`,
    `Awaiting your approval: ${awaitingApproval}`,
    `Sent to suppliers: ${sent}`,
    `Responded: ${responded}`,
    "",
    "Top pending:",
    topLines || "- None",
  ].join("\n");

  return new Response(digest, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
