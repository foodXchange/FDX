import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  const startTime = Date.now();
  let dbStatus = "ok";
  let dbLatencyMs = 0;

  try {
    const dbStart = Date.now();
    const { error } = await supabaseAdmin.from("sourcing_requests").select("id").limit(1);
    dbLatencyMs = Date.now() - dbStart;
    if (error) {
      dbStatus = `degraded: ${error.message}`;
    }
  } catch (err: any) {
    dbStatus = `unreachable: ${err.message}`;
  }

  const totalDurationMs = Date.now() - startTime;

  return NextResponse.json(
    {
      status: dbStatus === "ok" ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      service: "FDX.TRADING Commercial Engine",
      version: "2.4.0",
      uptime: process.uptime(),
      latency: {
        database_ms: dbLatencyMs,
        total_ms: totalDurationMs,
      },
      checks: {
        database: dbStatus,
        resend_configured: Boolean(process.env.RESEND_API_KEY),
        supabase_configured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      },
    },
    { status: dbStatus === "ok" ? 200 : 503 }
  );
}
