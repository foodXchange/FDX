import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { buyerOwnsRequest } from "@/lib/matches/buyerAuth";
import { sendBuyerInfoRequestNotification } from "@/lib/email/mailer";
import { logEvent } from "@/lib/events/logEvent";

type MatchRow = {
  id: string;
  company_name: string | null;
  product_name: string | null;
  sourcing_requests: { id: string; email: string | null; buyer_id: string | null } | null;
};

const BodySchema = z.object({
  matchId: z.string().uuid(),
  requestedInfo: z.array(z.string()).default([]),
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

  const { matchId, requestedInfo, message } = parsed.data;

  const { data: rawMatch } = await supabaseAdmin
    .from("sourcing_matches")
    .select("id, company_name, product_name, sourcing_requests(id, email, buyer_id)")
    .eq("id", matchId)
    .maybeSingle();

  const match = rawMatch as unknown as MatchRow | null;
  if (!match || !match.sourcing_requests) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  const authorized = await buyerOwnsRequest(match.sourcing_requests, user.email);
  if (!authorized) return NextResponse.json({ error: "Match not found" }, { status: 404 });

  const { data: buyerProfile } = await supabaseAdmin
    .from("buyer_profiles")
    .select("name")
    .eq("id", user.id)
    .maybeSingle();

  const { data: buyer } = await supabaseAdmin
    .from("buyers")
    .select("id")
    .eq("contact_email", user.email ?? "")
    .maybeSingle();

  const { error } = await supabaseAdmin.from("buyer_actions").insert({
    buyer_id: buyer?.id ?? null,
    match_id: matchId,
    request_id: match.sourcing_requests.id,
    action_type: "request_info",
    requested_info: requestedInfo,
    message: message?.trim() || null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  void sendBuyerInfoRequestNotification({
    buyerName: buyerProfile?.name ?? null,
    buyerEmail: user.email ?? null,
    supplierName: match.company_name ?? null,
    matchedProductName: match.product_name ?? null,
    requestedInfo,
    message: message?.trim() || null,
    matchId: match.id,
  });

  void logEvent(user.id, "buyer", "info_requested", "match", matchId, {
    request_id: match.sourcing_requests.id,
    requested_info: requestedInfo,
  });

  return NextResponse.json({ success: true });
}
