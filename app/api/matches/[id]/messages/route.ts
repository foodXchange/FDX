import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getPipelineStatus } from "@/lib/matches/pipelineStatus";
import { loadMatch, resolveParty } from "@/lib/matches/matchAuth";
import { createNotification } from "@/lib/notifications/createNotification";
import { getSupplierContactEmail } from "@/lib/email/supplierOutreach";
import { notifyBuyerOfMatchMessage, notifySupplierOfMatchMessage } from "@/lib/email/matchMessages";
import { logEvent } from "@/lib/events/logEvent";

type Params = Promise<{ id: string }>;

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const { id: matchId } = await params;

  const match = await loadMatch(matchId);
  if (!match) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const party = await resolveParty(match);
  if (!party) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data, error } = await supabaseAdmin
    .from("match_messages")
    .select("id, sender_id, sender_type, message, created_at")
    .eq("match_id", matchId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ messages: (data ?? []).reverse() });
}

export async function POST(req: NextRequest, { params }: { params: Params }) {
  const { id: matchId } = await params;

  const match = await loadMatch(matchId);
  if (!match) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const party = await resolveParty(match);
  if (!party) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (party.role === "admin") {
    return NextResponse.json({ error: "Admin messaging is not available yet" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!message) return NextResponse.json({ error: "Message is required" }, { status: 400 });

  const pipeline = getPipelineStatus(match);
  if (pipeline === "closed" || pipeline === "declined") {
    return NextResponse.json({ error: "This match is no longer open for messages" }, { status: 403 });
  }

  const { data: inserted, error } = await supabaseAdmin
    .from("match_messages")
    .insert({
      match_id: matchId,
      sender_id: party.userId,
      sender_type: party.role,
      message,
    })
    .select("id, sender_id, sender_type, message, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  void logEvent(party.userId, party.role, "message_sent", "message", inserted.id, {
    match_id: matchId,
    sender_type: party.role,
  });

  if (party.role === "supplier") {
    void createNotification(
      "match_message",
      `${match.company_name ?? "A supplier"} sent a message about ${match.product_name ?? "a match"}`,
      message,
      { match_id: matchId, supplier_id: match.supplier_id }
    );

    const buyerEmail = match.sourcing_requests?.email;
    if (buyerEmail) {
      void notifyBuyerOfMatchMessage({
        buyerEmail,
        productName: match.product_name,
        supplierCompanyName: match.company_name,
        message,
        requestId: match.request_id,
      });
    }
  } else {
    void createNotification(
      "match_message",
      `New buyer message about ${match.product_name ?? "a match"}`,
      message,
      { match_id: matchId, supplier_id: match.supplier_id }
    );

    void (async () => {
      const supplierEmail = await getSupplierContactEmail(match.supplier_id);
      if (supplierEmail) {
        await notifySupplierOfMatchMessage({
          supplierEmail,
          productName: match.product_name,
          message,
        });
      }
    })();
  }

  return NextResponse.json({ message: inserted });
}
