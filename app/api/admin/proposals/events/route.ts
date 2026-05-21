import { cookies } from "next/headers";
import { verifySession, COOKIE_NAME } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value ?? "";
  if (!(await verifySession(session))) {
    return new Response("Unauthorised", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return Response.json({ ok: false, error: "Missing id" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("proposal_views")
    .select("id,event_type,product_id,user_agent,created_at")
    .eq("proposal_id", id)
    .order("created_at", { ascending: true });

  if (error) {
    return Response.json({ ok: false, error: "Database error" }, { status: 500 });
  }

  return Response.json({ ok: true, events: data ?? [] });
}
