import { NextRequest, NextResponse } from "next/server";
import { computeQaSnapshot, saveQaMetricsSnapshot, DEFAULT_RANGE_DAYS } from "@/lib/metrics/qaMetrics";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const snapshot = await computeQaSnapshot(DEFAULT_RANGE_DAYS);
  await saveQaMetricsSnapshot(snapshot);

  return NextResponse.json({ ok: true });
}
