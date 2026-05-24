import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verifySession, COOKIE_NAME } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { buildPipV1 } from "@/lib/pip/buildPipV1";
import type { PipV1 } from "@/lib/pip/buildPipV1";
import { generateOutreachMessage } from "@/lib/workflow/generateOutreachMessage";

async function checkAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;
  return Boolean(session && (await verifySession(session)));
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await checkAuth())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const { action, sent_via, response_note } = body as {
    action?: string;
    sent_via?: string;
    response_note?: string;
  };

  const validActions = ["approve", "reject", "send", "respond", "close"];
  if (!action || !validActions.includes(action)) {
    return Response.json(
      { error: `action must be one of: ${validActions.join(", ")}` },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();

  if (action === "approve") {
    const { error: updateError } = await supabaseAdmin
      .from("sourcing_matches")
      .update({ status: "approved", approved_at: now })
      .eq("id", id);

    if (updateError) {
      return Response.json({ error: updateError.message }, { status: 500 });
    }

    const { data: match } = await supabaseAdmin
      .from("sourcing_matches")
      .select("product_name, company_name, country, match_score, request_id")
      .eq("id", id)
      .single();

    if (!match) return Response.json({ ok: true });

    const matchRow = match as {
      product_name: string;
      company_name: string;
      country: string | null;
      match_score: number;
      request_id: string;
    };

    const { data: request } = await supabaseAdmin
      .from("sourcing_requests")
      .select(
        "intent_json, product_name, message, category, certifications, target_market, private_label, ai_analysis"
      )
      .eq("id", matchRow.request_id)
      .single();

    if (!request) return Response.json({ ok: true });

    const reqRow = request as {
      intent_json: Record<string, unknown> | null;
      product_name: string | null;
      message: string | null;
      category: string | null;
      certifications: string[] | null;
      target_market: string | null;
      private_label: boolean | null;
      ai_analysis: Record<string, unknown> | null;
    };

    const pip: PipV1 = reqRow.intent_json
      ? (reqRow.intent_json as unknown as PipV1)
      : buildPipV1({
          product_name: reqRow.product_name,
          message: reqRow.message,
          category: reqRow.category,
          certifications: reqRow.certifications ?? [],
          target_market: reqRow.target_market,
          private_label: reqRow.private_label,
          ai_analysis: reqRow.ai_analysis,
        });

    const generatedMessage = generateOutreachMessage(pip, {
      company_name: matchRow.company_name,
      product_name: matchRow.product_name,
      country: matchRow.country,
      match_score: matchRow.match_score,
    });

    await supabaseAdmin
      .from("sourcing_matches")
      .update({ whatsapp_message: generatedMessage })
      .eq("id", id);

    return Response.json({ ok: true, whatsapp_message: generatedMessage });
  }

  const updates: Record<string, string | null> = {};

  if (action === "reject") {
    updates.status = "rejected";
    updates.rejected_at = now;
  } else if (action === "send") {
    updates.status = "sent";
    updates.sent_at = now;
    updates.sent_via = sent_via ?? null;
  } else if (action === "respond") {
    updates.status = "responded";
    updates.responded_at = now;
    updates.response_note = response_note ?? null;
  } else if (action === "close") {
    updates.status = "closed";
    updates.closed_at = now;
  }

  const { error } = await supabaseAdmin
    .from("sourcing_matches")
    .update(updates)
    .eq("id", id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
