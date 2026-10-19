import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession, COOKIE_NAME } from "@/lib/adminAuth";
import { syncGmailInboxReplies } from "@/lib/email/gmailEngine";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;
  if (!session || !(await verifySession(session))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncGmailInboxReplies();
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error || "Failed to sync Gmail inbox" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      syncedCount: result.syncedCount,
      replies: result.replies,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Internal sync error" },
      { status: 500 }
    );
  }
}
