import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  parseInboundCorrespondenceWithAI,
  applyInboundParseToRequest,
} from "@/lib/email/inboundAiParser";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const fromEmail = typeof body.fromEmail === "string" ? body.fromEmail.trim() : "supplier@factory.eu";
    const subject = typeof body.subject === "string" ? body.subject : "Re: Sourcing Inquiry";
    const bodyText = typeof body.bodyText === "string" ? body.bodyText : "";
    const autoApply = body.autoApply !== false;

    if (!bodyText && !subject) {
      return NextResponse.json({ ok: false, error: "Missing email subject or bodyText" }, { status: 400 });
    }

    let resolvedRequestId = body.requestId as string | undefined;
    let resolvedMatchId = body.matchId as string | undefined;

    // 1. Try to detect project tag [FDX-REQ-XXXXXXXX] in subject or body
    const reqTagMatch = `${subject} ${bodyText}`.match(/FDX-REQ-([A-F0-9]{8})/i);
    if (reqTagMatch && !resolvedRequestId) {
      const shortId = reqTagMatch[1].toLowerCase();
      const { data: matchedReq } = await supabaseAdmin
        .from("sourcing_requests")
        .select("id")
        .ilike("id", `${shortId}%`)
        .maybeSingle();

      if (matchedReq) {
        resolvedRequestId = matchedReq.id;
      }
    }

    // 2. Try to detect match tag [FDX-XXXXXXXX] in subject or body
    const matchTag = `${subject} ${bodyText}`.match(/FDX-([A-F0-9]{8})/i);
    if (matchTag && !resolvedMatchId) {
      const shortMatchId = matchTag[1].toLowerCase();
      const { data: matchRow } = await supabaseAdmin
        .from("sourcing_matches")
        .select("id, request_id")
        .ilike("id", `${shortMatchId}%`)
        .maybeSingle();

      if (matchRow) {
        resolvedMatchId = matchRow.id;
        if (!resolvedRequestId) resolvedRequestId = matchRow.request_id;
      }
    }

    // 3. Fallback: Lookup by supplier contact email if still unresolved
    if (!resolvedMatchId && fromEmail) {
      const { data: contactRow } = await supabaseAdmin
        .from("supplier_contacts")
        .select("supplier_id")
        .eq("email", fromEmail.toLowerCase())
        .maybeSingle();

      if (contactRow) {
        const query = supabaseAdmin
          .from("sourcing_matches")
          .select("id, request_id")
          .eq("supplier_id", contactRow.supplier_id)
          .order("created_at", { ascending: false })
          .limit(1);

        if (resolvedRequestId) {
          query.eq("request_id", resolvedRequestId);
        }

        const { data: mRows } = await query;
        if (mRows && mRows.length > 0) {
          resolvedMatchId = mRows[0].id;
          if (!resolvedRequestId) resolvedRequestId = mRows[0].request_id;
        }
      }
    }

    // 4. Parse incoming message with Gemini 3.8 Flash
    const parsed = await parseInboundCorrespondenceWithAI(bodyText, subject, fromEmail);

    let updatedStages: string[] = [];

    // 5. Auto-apply to request if resolved
    if (autoApply && resolvedRequestId) {
      const applyRes = await applyInboundParseToRequest(resolvedRequestId, resolvedMatchId || null, parsed, {
        fromEmail,
        subject,
        bodyText,
        receivedAt: body.receivedAt || new Date().toISOString(),
      });

      if (applyRes.ok) {
        updatedStages = applyRes.updatedStages;
      }
    }

    return NextResponse.json({
      ok: true,
      parsed,
      resolvedRequestId: resolvedRequestId || null,
      resolvedMatchId: resolvedMatchId || null,
      updatedStages,
      applied: updatedStages.length > 0,
    });
  } catch (err: any) {
    console.error("inbound correspondence route error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to process inbound message" },
      { status: 500 }
    );
  }
}
