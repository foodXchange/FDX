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

  const { error: updateError } = await supabaseAdmin
    .from("sourcing_requests")
    .update({ intent_json: pip })
    .eq("id", request_id);

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 });
  }

  return Response.json({ ok: true, pip });
}
