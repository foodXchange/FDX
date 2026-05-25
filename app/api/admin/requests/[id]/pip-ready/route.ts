import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verifySession, COOKIE_NAME } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function checkAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;
  return Boolean(session && (await verifySession(session)));
}

// Returns { ready: boolean }
// ready = true when:
//   - No v2 image PIPs exist (v1-only request — no ops review required), OR
//   - At least one v2 image PIP has status 'confirmed' or 'matched'
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await checkAuth())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const { data: v2Pips, error } = await supabaseAdmin
    .from("pips")
    .select("id, status")
    .eq("sourcing_request_id", id)
    .eq("pip_version", 2)
    .eq("created_from", "image");

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  if (!v2Pips || v2Pips.length === 0) {
    // No v2 PIPs — v1-only request, no review gate
    return Response.json({ ready: true });
  }

  const ready = v2Pips.some(
    (p) => p.status === "confirmed" || p.status === "matched"
  );

  return Response.json({ ready });
}
