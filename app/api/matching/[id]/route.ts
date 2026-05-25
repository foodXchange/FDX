import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verifySession, COOKIE_NAME } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { buildPipV1 } from "@/lib/pip/buildPipV1";
import type { PipV1 } from "@/lib/pip/buildPipV1";
import type { PipV2DataJson, MergedAttr } from "@/lib/pip/pipTypes";
import { generateOutreachMessage } from "@/lib/workflow/generateOutreachMessage";

async function checkAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;
  return Boolean(session && (await verifySession(session)));
}

// Converts v2 PipV2DataJson (MergedAttr-wrapped) to the PipV1 shape that
// generateOutreachMessage expects. Array fields need .map(a => a.value),
// not just field.value — each element is a MergedAttr object.
function v2DataJsonToPipV1Shape(dj: PipV2DataJson): PipV1 {
  const str = (attr: MergedAttr): string | null =>
    typeof attr.value === "string" ? attr.value : null;

  const bool = (attr: MergedAttr): boolean =>
    attr.value === true;

  const boolNullable = (attr: MergedAttr): boolean | null =>
    attr.value === true ? true : attr.value === false ? false : null;

  const strArr = (attrs: MergedAttr[]): string[] =>
    attrs
      .map((a) => (typeof a.value === "string" ? a.value : null))
      .filter((v): v is string => v !== null);

  return {
    version: "1.0",
    generated_at: dj.merged_at,
    product: {
      name: str(dj.product.name) ?? "",
      raw_description: str(dj.product.raw_description) ?? "",
    },
    category: {
      raw_text: str(dj.category.raw_text) ?? "",
      category_id: str(dj.category.category_id),
      category_name: str(dj.category.category_name),
    },
    specifications: {
      formats: strArr(dj.specifications.formats),
      packaging: str(dj.specifications.packaging),
      sizes: strArr(dj.specifications.sizes),
    },
    compliance: {
      kosher_required: bool(dj.compliance.kosher_required),
      kosher_types: strArr(dj.compliance.kosher_types),
      certifications: strArr(dj.compliance.certifications),
      halal: bool(dj.compliance.halal),
      organic: bool(dj.compliance.organic),
    },
    commercial: {
      private_label: boolNullable(dj.commercial.private_label),
      volume: str(dj.commercial.volume),
      urgency: str(dj.commercial.urgency),
      target_market: str(dj.commercial.target_market),
      budget: str(dj.commercial.budget),
    },
    match_config: {
      must_have: dj.match_config.must_have,
      nice_to_have: dj.match_config.nice_to_have,
      dealbreakers: dj.match_config.dealbreakers,
    },
  };
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

    // Prefer v2 PIP (image-merged data) for the outreach message.
    // Fall back to sourcing_requests.intent_json for v1-only requests.
    const { data: v2Pip } = await supabaseAdmin
      .from("pips")
      .select("data_json")
      .eq("sourcing_request_id", matchRow.request_id)
      .eq("pip_version", 2)
      .eq("created_from", "image")
      .maybeSingle();

    let pip: PipV1;

    if (v2Pip?.data_json && (v2Pip.data_json as { version?: string }).version === "2.0") {
      pip = v2DataJsonToPipV1Shape(v2Pip.data_json as unknown as PipV2DataJson);
    } else {
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

      pip = reqRow.intent_json
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
    }

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
