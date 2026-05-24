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
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [{ data: matchRows }, { count: totalRequests }] = await Promise.all([
    supabaseAdmin.from("sourcing_matches").select("status, match_score"),
    supabaseAdmin
      .from("sourcing_requests")
      .select("id", { count: "exact", head: true }),
  ]);

  const rows = (matchRows ?? []) as { status: string; match_score: number }[];

  const total_matches = rows.length;
  const pending_approval = rows.filter(
    (r) => r.status === "pending" || r.status === "new"
  ).length;
  const approved = rows.filter((r) => r.status === "approved").length;
  const sent = rows.filter((r) => r.status === "sent").length;
  const responded = rows.filter((r) => r.status === "responded").length;
  const closed = rows.filter((r) => r.status === "closed").length;

  const approvedRows = rows.filter((r) => r.status === "approved");
  const avg_score =
    approvedRows.length > 0
      ? Math.round(
          approvedRows.reduce((sum, r) => sum + r.match_score, 0) /
            approvedRows.length
        )
      : 0;

  const conversion_rate =
    sent > 0 ? Math.round((responded / sent) * 100) : 0;

  return Response.json({
    total_requests: totalRequests ?? 0,
    total_matches,
    pending_approval,
    approved,
    sent,
    responded,
    closed,
    conversion_rate,
    avg_score,
  });
}
