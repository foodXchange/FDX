import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verifySession, COOKIE_NAME } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { buildPipV1Full } from "@/lib/pip/buildPipV1";
import { runMatchV2 } from "@/lib/matching/runMatchV2";

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

  // Fetch request row and check for a v2 PIP in parallel.
  const [requestResult, v2PipResult] = await Promise.all([
    supabaseAdmin
      .from("sourcing_requests")
      .select(
        "id, product_name, message, category, certifications, target_market, private_label, ai_analysis, intent_json"
      )
      .eq("id", request_id)
      .single(),
    supabaseAdmin
      .from("pips")
      .select("id")
      .eq("sourcing_request_id", request_id)
      .eq("pip_version", 2)
      .eq("created_from", "image")
      .maybeSingle(),
  ]);

  const { data: request, error: fetchError } = requestResult;
  const { data: v2Pip } = v2PipResult;

  if (fetchError || !request) {
    return Response.json({ error: "Request not found" }, { status: 404 });
  }

  // A v2 image PIP or a populated intent_json is sufficient to proceed.
  // Generate a v1 PIP inline only when neither exists.
  const hasPip = v2Pip !== null || Boolean(request.intent_json);

  if (!hasPip) {
    try {
      const pip = await buildPipV1Full({
        product_name: (request.product_name as string | null) ?? null,
        message: (request.message as string | null) ?? null,
        category: (request.category as string | null) ?? null,
        certifications: (request.certifications as string[] | null) ?? [],
        target_market: (request.target_market as string | null) ?? null,
        private_label: (request.private_label as boolean | null) ?? null,
        ai_analysis: (request.ai_analysis as Record<string, unknown> | null) ?? null,
      });
      await supabaseAdmin
        .from("sourcing_requests")
        .update({ intent_json: pip })
        .eq("id", request_id);
    } catch (e) {
      console.error("PIP generation failed before matching:", e);
      return Response.json({ error: "Failed to generate PIP" }, { status: 500 });
    }
  }

  try {
    const result = await runMatchV2(request_id);
    return Response.json({ ok: true, inserted: result.inserted, topScore: result.topScore });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ error: msg }, { status: 500 });
  }
}
