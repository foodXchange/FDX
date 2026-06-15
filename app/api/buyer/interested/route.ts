import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { buyerOwnsRequest } from "@/lib/matches/buyerAuth";
import { sendBuyerInterestNotification } from "@/lib/email/mailer";
import { logEvent } from "@/lib/events/logEvent";

type MatchRow = {
  id: string;
  company_name: string | null;
  product_name: string | null;
  sourcing_requests: { id: string; email: string | null; buyer_id: string | null; product_name: string | null } | null;
};

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { matchId?: string; terms_accepted?: boolean };
  const matchId = body.matchId;
  if (!matchId) return NextResponse.json({ error: "matchId is required" }, { status: 400 });
  if (!body.terms_accepted) return NextResponse.json({ error: "Terms must be accepted" }, { status: 400 });

  const { data: rawMatch } = await supabaseAdmin
    .from("sourcing_matches")
    .select("id, company_name, product_name, sourcing_requests(id, email, buyer_id, product_name)")
    .eq("id", matchId)
    .maybeSingle();

  const match = rawMatch as unknown as MatchRow | null;
  if (!match || !match.sourcing_requests) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  const authorized = await buyerOwnsRequest(match.sourcing_requests, user.email);
  if (!authorized) return NextResponse.json({ error: "Match not found" }, { status: 404 });

  const now = new Date().toISOString();

  await supabaseAdmin
    .from("sourcing_matches")
    .update({ buyer_interest: true, buyer_interest_at: now, terms_accepted_at: now })
    .eq("id", matchId);

  const { data: buyerProfile } = await supabaseAdmin
    .from("buyer_profiles")
    .select("name")
    .eq("id", user.id)
    .maybeSingle();

  void sendBuyerInterestNotification({
    buyerName: buyerProfile?.name ?? null,
    buyerEmail: user.email ?? null,
    supplierName: match.company_name ?? null,
    requestProductName: match.sourcing_requests.product_name ?? null,
    matchedProductName: match.product_name ?? null,
    matchId: match.id,
    termsAcceptedAt: now,
  });

  void logEvent(user.id, "buyer", "match_interest", "match", matchId, {
    request_id: match.sourcing_requests.id,
  });

  return NextResponse.json({ success: true });
}
