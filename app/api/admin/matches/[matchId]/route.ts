import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verifySession, COOKIE_NAME } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function checkAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;
  return Boolean(session && (await verifySession(session)));
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  if (!(await checkAuth())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { matchId } = await params;
  const body = (await req.json()) as { status: "approved" | "rejected" };

  if (!["approved", "rejected"].includes(body.status)) {
    return Response.json({ error: "Invalid status" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const updates: Record<string, string | null> = {
    status: body.status,
    approved_at: body.status === "approved" ? now : null,
    rejected_at: body.status === "rejected" ? now : null,
  };

  const { error } = await supabaseAdmin
    .from("sourcing_matches")
    .update(updates)
    .eq("id", matchId);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
