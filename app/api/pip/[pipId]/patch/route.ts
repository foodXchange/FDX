import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verifySession, COOKIE_NAME } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { MergedAttr, PipV2DataJson } from "@/lib/pip/pipTypes";

async function checkAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;
  return Boolean(session && (await verifySession(session)));
}

function manualAttr(value: unknown): MergedAttr {
  return { value, source: "manual", status: "observed", confidence: 1.0, evidence: null };
}

function manualAttrs(values: string[]): MergedAttr[] {
  return values.map((v) => manualAttr(v));
}

type PatchBody = {
  product_name?: string;
  category_raw?: string;
  formats?: string[];
  sizes?: string[];
  kosher_required?: boolean;
  kosher_types?: string[];
  must_have?: string[];
  nice_to_have?: string[];
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ pipId: string }> }
) {
  if (!(await checkAuth())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { pipId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const patch = body as PatchBody;

  const { data: pipRow, error: fetchError } = await supabaseAdmin
    .from("pips")
    .select("data_json")
    .eq("id", pipId)
    .single();

  if (fetchError || !pipRow) {
    return Response.json({ error: "PIP not found" }, { status: 404 });
  }

  const dataJson = pipRow.data_json as PipV2DataJson;

  if (patch.product_name !== undefined) {
    dataJson.product = { ...dataJson.product, name: manualAttr(patch.product_name) };
  }
  if (patch.category_raw !== undefined) {
    dataJson.category = { ...dataJson.category, raw_text: manualAttr(patch.category_raw) };
  }
  if (patch.formats !== undefined) {
    dataJson.specifications = { ...dataJson.specifications, formats: manualAttrs(patch.formats) };
  }
  if (patch.sizes !== undefined) {
    dataJson.specifications = { ...dataJson.specifications, sizes: manualAttrs(patch.sizes) };
  }
  if (patch.kosher_required !== undefined) {
    dataJson.compliance = { ...dataJson.compliance, kosher_required: manualAttr(patch.kosher_required) };
  }
  if (patch.kosher_types !== undefined) {
    dataJson.compliance = { ...dataJson.compliance, kosher_types: manualAttrs(patch.kosher_types) };
  }
  if (patch.must_have !== undefined) {
    dataJson.match_config = { ...dataJson.match_config, must_have: patch.must_have };
  }
  if (patch.nice_to_have !== undefined) {
    dataJson.match_config = { ...dataJson.match_config, nice_to_have: patch.nice_to_have };
  }

  const { error: updateError } = await supabaseAdmin
    .from("pips")
    .update({ data_json: dataJson, updated_at: new Date().toISOString() })
    .eq("id", pipId);

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 });
  }

  return Response.json({ ok: true, data_json: dataJson });
}
