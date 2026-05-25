import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verifySession, COOKIE_NAME } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { groupImages } from "@/lib/pip/groupImages";

async function checkAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;
  return Boolean(session && (await verifySession(session)));
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

  const { request_id } = body as { request_id?: string };
  if (!request_id) {
    return Response.json({ error: "request_id is required" }, { status: 400 });
  }

  try {
    await groupImages(request_id);

    const { data: pips, error } = await supabaseAdmin
      .from("pips")
      .select("id, product_family_key, data_json, status")
      .eq("sourcing_request_id", request_id)
      .eq("pip_version", 2)
      .eq("created_from", "image")
      .order("created_at", { ascending: true });

    if (error) throw new Error(error.message);

    return Response.json({ ok: true, pips: pips ?? [] });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Regroup error:", e);
    return Response.json({ error: msg }, { status: 500 });
  }
}
