import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

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

  const { error } = await supabaseAdmin
    .from("sourcing_requests")
    .update({ intent_json: pip })
    .eq("id", request_id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
