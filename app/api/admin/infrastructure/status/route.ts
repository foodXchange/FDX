import { NextResponse } from "next/server";
import { getFullInfrastructureReport } from "@/lib/admin/infrastructureEngine";
import { getGitStatus } from "@/lib/admin/gitEngine";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [infra, git] = await Promise.all([
      getFullInfrastructureReport(),
      getGitStatus(),
    ]);

    return NextResponse.json({
      ok: true,
      infrastructure: infra,
      git,
    });
  } catch (error: any) {
    console.error("Infrastructure status API error:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Failed to load infrastructure telemetry" },
      { status: 500 }
    );
  }
}
