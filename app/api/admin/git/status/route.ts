import { NextResponse } from "next/server";
import { getGitStatus } from "@/lib/admin/gitEngine";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const status = await getGitStatus();
    return NextResponse.json({ ok: true, status });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || "Git status failed" }, { status: 500 });
  }
}
