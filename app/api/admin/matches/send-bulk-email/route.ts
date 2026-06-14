import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verifySession, COOKIE_NAME } from "@/lib/adminAuth";
import { sendSupplierOutreachEmail } from "@/lib/email/supplierOutreach";

async function checkAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;
  return Boolean(session && (await verifySession(session)));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(req: NextRequest) {
  if (!(await checkAuth())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const { match_ids, message } = body as { match_ids?: string[]; message?: string };

  if (!match_ids || !Array.isArray(match_ids) || match_ids.length === 0) {
    return Response.json({ error: "match_ids must be a non-empty array" }, { status: 400 });
  }

  const results: { match_id: string; success: boolean; sent_at?: string; error?: string }[] = [];
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < match_ids.length; i++) {
    const matchId = match_ids[i];
    const result = await sendSupplierOutreachEmail(matchId, message);

    if (result.success) {
      sent++;
      results.push({ match_id: matchId, success: true, sent_at: result.sent_at });
    } else {
      failed++;
      results.push({ match_id: matchId, success: false, error: result.error });
    }

    if (i < match_ids.length - 1) {
      await sleep(300);
    }
  }

  return Response.json({ sent, failed, results });
}
