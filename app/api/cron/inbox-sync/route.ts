import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession, COOKIE_NAME } from "@/lib/adminAuth";
import { pollAndSyncInboundEmails } from "@/lib/email/imapPoller";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Allow up to 60s for full inbox scanning and Gemini AI parsing

async function isAuthorized(req: NextRequest): Promise<boolean> {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const authHeader = req.headers.get("authorization");
  const querySecret = req.nextUrl.searchParams.get("secret");

  // 1. Check Bearer token or query param secret
  if (cronSecret && (authHeader === `Bearer ${cronSecret}` || querySecret === cronSecret)) {
    return true;
  }

  // 2. Check admin session cookie
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;
  if (session && (await verifySession(session))) {
    return true;
  }

  // 3. In local development, permit testing without secret if not configured
  if (process.env.NODE_ENV !== "production" && !cronSecret) {
    return true;
  }

  return false;
}

export async function GET(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await pollAndSyncInboundEmails({
      maxMessages: 100,
      daysToLookBack: 7,
    });

    return NextResponse.json(result, { status: result.ok ? 200 : 500 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal poll error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
