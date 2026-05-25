import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { PipV1 } from "@/lib/pip/buildPipV1";
import { pipV1ToManualV2DataJson } from "@/lib/pip/mergePipFields";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { request_id, pip } = body as {
    request_id?: string;
    pip?: Record<string, unknown>;
  };

  if (!request_id || !pip) {
    return Response.json(
      { error: "request_id and pip are required" },
      { status: 400 }
    );
  }

  // Write to intent_json (existing — matching engine reads this).
  // Concurrently look up v1 and v2 PIP rows so we can keep them in sync.
  const [intentResult, v1PipResult, v2PipResult] = await Promise.all([
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
    supabaseAdmin
      .from("pips")
      .select("id")
      .eq("sourcing_request_id", request_id)
      .eq("pip_version", 2)
      .eq("created_from", "image")
      .maybeSingle(),
  ]);

  if (intentResult.error) {
    return Response.json({ error: intentResult.error.message }, { status: 500 });
  }

  // Keep v1 PIP in sync so mergePip reads the latest text side on next run.
  if (v1PipResult.data?.id) {
    await supabaseAdmin
      .from("pips")
      .update({ data_json: pip })
      .eq("id", v1PipResult.data.id);
  }

  // Admin edits to a v2 PIP must carry provenance: source:"manual",
  // status:"observed", confidence:1.0, evidence:null on every field.
  if (v2PipResult.data?.id) {
    const manualDataJson = pipV1ToManualV2DataJson(pip as unknown as PipV1);
    await supabaseAdmin
      .from("pips")
      .update({ data_json: manualDataJson })
      .eq("id", v2PipResult.data.id);
  }

  return Response.json({ ok: true });
}
