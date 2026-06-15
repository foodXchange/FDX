import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifySession, COOKIE_NAME } from "@/lib/adminAuth";
import { getSupplierContactEmail } from "@/lib/email/supplierOutreach";
import { sendAdminMatchReplyToBuyer, sendAdminMatchReplyToSupplier } from "@/lib/email/mailer";
import { logEvent } from "@/lib/events/logEvent";

type MatchRow = {
  id: string;
  request_id: string;
  supplier_id: string;
  company_name: string | null;
  product_name: string | null;
  sourcing_requests: { id: string; email: string | null; buyer_id: string | null; product_name: string | null } | null;
};

const BodySchema = z.object({
  matchId: z.string().uuid(),
  message: z.string().trim().min(1),
  forwardToSupplier: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const adminCookie = cookieStore.get(COOKIE_NAME)?.value;
  if (!adminCookie || !(await verifySession(adminCookie))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { matchId, message, forwardToSupplier } = parsed.data;

  const { data: rawMatch } = await supabaseAdmin
    .from("sourcing_matches")
    .select(
      "id, request_id, supplier_id, company_name, product_name, sourcing_requests(id, email, buyer_id, product_name)"
    )
    .eq("id", matchId)
    .maybeSingle();

  const match = rawMatch as unknown as MatchRow | null;
  if (!match || !match.sourcing_requests) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  const { data: inserted, error } = await supabaseAdmin
    .from("match_messages")
    .insert({
      match_id: matchId,
      sender_type: "admin",
      message,
    })
    .select("id, sender_id, sender_type, message, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let buyerEmail = match.sourcing_requests.email;
  if (!buyerEmail && match.sourcing_requests.buyer_id) {
    const { data: buyer } = await supabaseAdmin
      .from("buyers")
      .select("contact_email")
      .eq("id", match.sourcing_requests.buyer_id)
      .maybeSingle();
    buyerEmail = buyer?.contact_email ?? null;
  }

  if (buyerEmail) {
    void sendAdminMatchReplyToBuyer({
      buyerEmail,
      productName: match.sourcing_requests.product_name ?? match.product_name,
      supplierName: match.company_name,
      message,
      requestId: match.request_id,
    });
  }

  if (forwardToSupplier) {
    const supplierEmail = await getSupplierContactEmail(match.supplier_id);
    if (supplierEmail) {
      void sendAdminMatchReplyToSupplier({
        supplierEmail,
        productName: match.product_name,
        message,
      });
    }
  }

  void logEvent(null, "admin", "message_sent", "message", inserted.id, {
    match_id: matchId,
    sender_type: "admin",
    forwarded_to_supplier: forwardToSupplier,
  });

  return NextResponse.json({ success: true, message: inserted });
}
