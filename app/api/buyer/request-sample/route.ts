import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { buyerOwnsRequest } from "@/lib/matches/buyerAuth";
import { sendBuyerInterestNotification } from "@/lib/email/mailer";
import { logEvent } from "@/lib/events/logEvent";

const SampleRequestSchema = z.object({
  matchId: z.string().uuid(),
  contactName: z.string().trim().min(1),
  companyName: z.string().trim().min(1),
  phone: z.string().trim().min(6),
  streetAddress: z.string().trim().min(3),
  city: z.string().trim().min(2),
  postalCode: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

type MatchRow = {
  id: string;
  company_name: string | null;
  product_name: string | null;
  match_breakdown: Record<string, unknown> | null;
  sourcing_requests: {
    id: string;
    email: string | null;
    buyer_id: string | null;
    product_name: string | null;
    company: string | null;
  } | null;
};

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = SampleRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const {
    matchId,
    contactName,
    companyName,
    phone,
    streetAddress,
    city,
    postalCode,
    notes,
  } = parsed.data;

  const { data: rawMatch } = await supabaseAdmin
    .from("sourcing_matches")
    .select("id, company_name, product_name, match_breakdown, sourcing_requests(id, email, buyer_id, product_name, company)")
    .eq("id", matchId)
    .maybeSingle();

  const match = rawMatch as unknown as MatchRow | null;
  if (!match || !match.sourcing_requests) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  const authorized = await buyerOwnsRequest(match.sourcing_requests, user.email);
  if (!authorized) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  const now = new Date().toISOString();

  const prevBreakdown = (match.match_breakdown as Record<string, unknown> | null) ?? {};
  const updatedBreakdown: Record<string, unknown> = {
    ...prevBreakdown,
    sample_request: {
      contact_name: contactName,
      company_name: companyName,
      phone,
      delivery_address: `${streetAddress}, ${city}${postalCode ? ` (${postalCode})` : ""}, Israel`,
      notes: notes || null,
      requested_at: now,
      status: "requested",
    },
  };

  // Update match status and sample breakdown
  await supabaseAdmin
    .from("sourcing_matches")
    .update({
      buyer_interest: true,
      buyer_interest_at: now,
      match_breakdown: updatedBreakdown,
      updated_at: now,
    })
    .eq("id", matchId);

  // Insert notification into match_messages
  await supabaseAdmin.from("match_messages").insert({
    match_id: matchId,
    sender_type: "buyer",
    message: `[OFFICIAL SAMPLE REQUEST]\nRecipient: ${contactName} (${companyName})\nPhone: ${phone}\nDelivery Address: ${streetAddress}, ${city}, Israel\nInstructions: ${notes || "Standard sensory evaluation samples requested."}`,
  });

  // Log event
  void logEvent(user.id, "buyer", "sample_requested", "match", matchId, {
    request_id: match.sourcing_requests.id,
    company: companyName,
    city,
  });

  // Re-use interest mailer notification to operations
  void sendBuyerInterestNotification({
    buyerName: contactName,
    buyerEmail: user.email ?? null,
    supplierName: match.company_name ?? null,
    requestProductName: match.sourcing_requests.product_name ?? null,
    matchedProductName: match.product_name ?? null,
    matchId: match.id,
    termsAcceptedAt: now,
  });

  return NextResponse.json({
    ok: true,
    message: "Sample request submitted successfully. Express dispatch initiated.",
  });
}
