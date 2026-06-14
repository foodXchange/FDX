import { NextRequest, NextResponse } from "next/server";
import { getWeeklyReportData } from "@/lib/metrics/qaMetrics";
import { sendQaMetricsWeeklyReport } from "@/lib/email/qaMetricsReport";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const report = await getWeeklyReportData();
  if (!report) {
    return NextResponse.json({ error: "No snapshots available" }, { status: 404 });
  }

  await sendQaMetricsWeeklyReport(report);

  return NextResponse.json({ ok: true });
}
