import { NextRequest, NextResponse } from "next/server";
import { gitCommit } from "@/lib/admin/gitEngine";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, skipCi, prefix } = body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ ok: false, error: "Commit message is required" }, { status: 400 });
    }

    const result = await gitCommit({
      message: message.trim(),
      skipCi: Boolean(skipCi),
      prefix: prefix || "feat",
      stageAll: true,
    });

    if (!result.success) {
      return NextResponse.json({ ok: false, error: result.message, output: result.output }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      commitHash: result.commitHash,
      message: result.message,
      output: result.output,
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || "Commit failed" }, { status: 500 });
  }
}
