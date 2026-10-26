import { NextRequest, NextResponse } from "next/server";
import { gitDiffFile } from "@/lib/admin/gitEngine";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const file = req.nextUrl.searchParams.get("file");
    if (!file) {
      return NextResponse.json({ ok: false, error: "file query param is required" }, { status: 400 });
    }

    const diff = await gitDiffFile(file);
    return NextResponse.json({ ok: true, file, diff });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || "Diff failed" }, { status: 500 });
  }
}
