import { NextResponse } from "next/server";
import { gitPull } from "@/lib/admin/gitEngine";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const result = await gitPull("origin", "main");
    if (!result.success) {
      return NextResponse.json({ ok: false, error: "Pull failed", output: result.output }, { status: 500 });
    }

    return NextResponse.json({ ok: true, output: result.output });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || "Pull failed" }, { status: 500 });
  }
}
