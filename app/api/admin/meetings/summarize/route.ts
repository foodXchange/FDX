import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifySession, COOKIE_NAME } from "@/lib/adminAuth";
import { summarizeMeetingWithAI } from "@/lib/ai/meetingSummarizer";
import { logEvent } from "@/lib/events/logEvent";

const SummarizeSchema = z.object({
  matchId: z.string().uuid(),
  transcriptOrNotes: z.string().trim().min(5),
  advanceStage: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;
  if (!session || !(await verifySession(session))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = SummarizeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { matchId, transcriptOrNotes, advanceStage } = parsed.data;

  // Fetch match details
  const { data: match, error: matchErr } = await supabaseAdmin
    .from("sourcing_matches")
    .select(`
      id, request_id, supplier_id, company_name, product_name, match_score, status, match_breakdown,
      sourcing_requests!request_id(company, product_name)
    `)
    .eq("id", matchId)
    .single();

  if (matchErr || !match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  const reqObj = Array.isArray(match.sourcing_requests)
    ? match.sourcing_requests[0]
    : match.sourcing_requests;

  const context = {
    buyer_company: reqObj?.company || undefined,
    supplier_company: match.company_name || undefined,
    product_name: match.product_name || reqObj?.product_name || undefined,
    match_score: match.match_score ?? undefined,
  };

  // Run AI Summarization
  const summary = await summarizeMeetingWithAI(transcriptOrNotes, context);

  const now = new Date().toISOString();
  const prevBreakdown = (match.match_breakdown as Record<string, unknown> | null) ?? {};
  const prevSummaries = Array.isArray(prevBreakdown.meeting_summaries)
    ? prevBreakdown.meeting_summaries
    : [];

  const meetingSummaryRecord = {
    id: `sum_${Date.now()}`,
    ...summary,
    raw_input_snippet: transcriptOrNotes.slice(0, 300),
    summarized_at: now,
  };

  const updatedBreakdown: Record<string, unknown> = {
    ...prevBreakdown,
    latest_meeting_summary: meetingSummaryRecord,
    meeting_summaries: [...prevSummaries, meetingSummaryRecord],
  };

  // Optionally update status if suggested and advanceStage is requested
  let nextStatus = match.status;
  if (advanceStage && summary.suggested_stage_advancement) {
    if (match.status === "suggested" || match.status === "approved" || match.status === "sent") {
      nextStatus = summary.suggested_stage_advancement;
    }
  }

  await supabaseAdmin
    .from("sourcing_matches")
    .update({
      match_breakdown: updatedBreakdown,
      status: nextStatus,
      updated_at: now,
    })
    .eq("id", matchId);

  // Format message for deal history
  const actionItemsText = summary.action_items
    .map((a) => `• [${a.owner}] ${a.task}${a.due_date ? ` (${a.due_date})` : ""}`)
    .join("\n");

  const messageText = `[AI MEETING SUMMARY: ${summary.meeting_title}]
${summary.executive_summary}

Commercial Terms:
${summary.commercial_terms.target_unit_price ? `• Target Price: ${summary.commercial_terms.currency} ${summary.commercial_terms.target_unit_price}` : "• Price: In discussion"}
${summary.commercial_terms.incoterms ? `• Incoterms: ${summary.commercial_terms.incoterms}` : ""}
${summary.commercial_terms.target_volume ? `• Target Volume: ${summary.commercial_terms.target_volume}` : ""}
${summary.commercial_terms.payment_terms ? `• Payment: ${summary.commercial_terms.payment_terms}` : ""}

Action Items:
${actionItemsText || "• Continue deal execution"}`;

  await supabaseAdmin.from("match_messages").insert({
    match_id: matchId,
    sender_type: "admin",
    message: messageText,
  });

  // Log event
  void logEvent(null, "admin", "meeting_summarized", "match", matchId, {
    request_id: match.request_id,
    supplier_id: match.supplier_id,
    suggested_stage: summary.suggested_stage_advancement,
  });

  return NextResponse.json({
    ok: true,
    summary: meetingSummaryRecord,
    advancedToStage: nextStatus !== match.status ? nextStatus : null,
  });
}
