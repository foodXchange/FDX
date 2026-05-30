import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verifySession, COOKIE_NAME } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { buildPipV1 } from "@/lib/pip/buildPipV1";
import { resolveCategoryId } from "@/lib/pip/resolveCategoryId";
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
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { request_id } = body as { request_id?: string };
  if (!request_id) {
    return Response.json({ error: "request_id is required" }, { status: 400 });
  }

  const { data: row, error: fetchError } = await supabaseAdmin
    .from("sourcing_requests")
    .select(
      "id, product_name, message, category, certifications, target_market, private_label, ai_analysis"
    )
    .eq("id", request_id)
    .single();

  if (fetchError || !row) {
    return Response.json({ error: "Request not found" }, { status: 404 });
  }

  const { data: imageRows } = await supabaseAdmin
    .from("request_images")
    .select("id")
    .eq("request_id", request_id);

  const imageCount = imageRows?.length ?? 0;

  // ── Image path ──
  if (imageCount > 0) {
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
      console.error("groupImages error:", e);
      return Response.json({ error: msg }, { status: 500 });
    }
  }

  // ── Empty path (no images, no text) ──
  const hasText = !!(row.product_name?.trim() || (row.message as string | null)?.trim());
  if (!hasText) {
    return Response.json({ ok: true, pip: null, hint: "no text or image" });
  }

  // ── Text path (existing logic, unchanged) ──
  const pip = buildPipV1({
    product_name: row.product_name ?? null,
    message: row.message ?? null,
    category: row.category ?? null,
    certifications: (row.certifications as string[]) ?? [],
    target_market: row.target_market ?? null,
    private_label: row.private_label ?? null,
    ai_analysis: (row.ai_analysis as Record<string, unknown>) ?? null,
  });

  const { category_id, category_name } = await resolveCategoryId(row.category ?? "");
  pip.category.category_id = category_id;
  pip.category.category_name = category_name;

  // Write to intent_json (existing — matching engine reads this)
  // and UPSERT the v1 pip row so mergePip reads the latest text side next time.
  const [intentResult, existingV1PipResult] = await Promise.all([
    supabaseAdmin
      .from("sourcing_requests")
      .update({ intent_json: pip })
      .eq("id", request_id),
    supabaseAdmin
      .from("pips")
      .select("id")
      .eq("sourcing_request_id", request_id)
      .eq("pip_version", 1)
      .eq("created_from", "text")
      .maybeSingle(),
  ]);

  if (intentResult.error) {
    return Response.json({ error: intentResult.error.message }, { status: 500 });
  }

  if (existingV1PipResult.data?.id) {
    await supabaseAdmin
      .from("pips")
      .update({ data_json: pip })
      .eq("id", existingV1PipResult.data.id);
  } else {
    await supabaseAdmin.from("pips").insert({
      sourcing_request_id: request_id,
      pip_version: 1,
      created_from: "text",
      status: "needs_review",
      data_json: pip,
    });
  }

  return Response.json({ ok: true, pip });
}
