import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { buyerOwnsRequest } from "@/lib/matches/buyerAuth";
import { getPipelineStatus } from "@/lib/matches/pipelineStatus";
import { sendBuyerQuestionNotification } from "@/lib/email/mailer";
import { logEvent } from "@/lib/events/logEvent";

type MatchRow = {
  id: string;
  company_name: string | null;
  product_name: string | null;
  status: string | null;
  supplier_response: string | null;
  closed_at: string | null;
  sourcing_requests: { id: string; email: string | null; buyer_id: string | null } | null;
};

const BodySchema = z.object({
  matchId: z.string().uuid(),
  questions: z.array(z.string()).default([]),
  message: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { matchId, questions, message } = parsed.data;
  const trimmedMessage = message?.trim() || "";

  if (questions.length === 0 && !trimmedMessage) {
    return NextResponse.json({ error: "Question or message is required" }, { status: 400 });
  }

  const { data: rawMatch } = await supabaseAdmin
    .from("sourcing_matches")
    .select("id, company_name, product_name, status, supplier_response, closed_at, sourcing_requests(id, email, buyer_id)")
    .eq("id", matchId)
    .maybeSingle();

  const match = rawMatch as unknown as MatchRow | null;
  if (!match || !match.sourcing_requests) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  const authorized = await buyerOwnsRequest(match.sourcing_requests, user.email);
  if (!authorized) return NextResponse.json({ error: "Match not found" }, { status: 404 });

  const pipeline = getPipelineStatus(match);
  if (pipeline === "closed" || pipeline === "declined") {
    return NextResponse.json({ error: "This match is no longer open for messages" }, { status: 403 });
  }

  const formattedMessage =
    questions.length > 0
      ? `Questions: ${questions.join(", ")}${trimmedMessage ? `\n\n${trimmedMessage}` : ""}`
      : trimmedMessage;

  const { data: inserted, error } = await supabaseAdmin
    .from("match_messages")
    .insert({
      match_id: matchId,
      sender_id: user.id,
      sender_type: "buyer",
      message: formattedMessage,
    })
    .select("id, sender_id, sender_type, message, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: buyerProfile } = await supabaseAdmin
    .from("buyer_profiles")
    .select("name")
    .eq("id", user.id)
    .maybeSingle();

  void sendBuyerQuestionNotification({
    buyerName: buyerProfile?.name ?? null,
    buyerEmail: user.email ?? null,
    supplierName: match.company_name ?? null,
    matchedProductName: match.product_name ?? null,
    questions,
    message: trimmedMessage || null,
    matchId: match.id,
  });

  void logEvent(user.id, "buyer", "question_asked", "message", inserted.id, {
    match_id: matchId,
    request_id: match.sourcing_requests.id,
    questions,
  });

  return NextResponse.json({ success: true, message: inserted });
}
