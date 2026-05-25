import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { buildPipV1 } from "@/lib/pip/buildPipV1";
import { resolveCategoryId } from "@/lib/pip/resolveCategoryId";

export async function POST(req: NextRequest) {
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
