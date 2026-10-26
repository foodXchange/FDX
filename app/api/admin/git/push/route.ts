import { NextResponse } from "next/server";
import { gitPush } from "@/lib/admin/gitEngine";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const result = await gitPush("origin", "main");
    if (!result.success) {
      return NextResponse.json({ ok: false, error: "Push failed", output: result.output }, { status: 500 });
    }

    return NextResponse.json({ ok: true, output: result.output });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || "Push failed" }, { status: 500 });
  }
}
