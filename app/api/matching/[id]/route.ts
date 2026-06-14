import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verifySession, COOKIE_NAME } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { PipV1 } from "@/lib/pip/buildPipV1";
import { getPipForRequest } from "@/lib/pip/getPipForRequest";
import { generateOutreachMessage } from "@/lib/workflow/generateOutreachMessage";
import { createNotification } from "@/lib/notifications/createNotification";
import { getSupplierContactEmail } from "@/lib/email/supplierOutreach";
import { notifySupplierDealClosed } from "@/lib/email/matchMessages";
import { logEvent } from "@/lib/events/logEvent";

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

    const pip: PipV1 = await getPipForRequest(matchRow.request_id);

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

  if (action === "respond") {
    const { data: match } = await supabaseAdmin
      .from("sourcing_matches")
      .select("supplier_id, request_id, product_name, company_name")
      .eq("id", id)
      .single();

    if (match) {
      void createNotification(
        "response",
        `${match.company_name} responded to your match`,
        response_note,
        { match_id: id, supplier_id: match.supplier_id, response_note: response_note ?? null }
      );
    }
  }

  if (action === "close") {
    const { data: match } = await supabaseAdmin
      .from("sourcing_matches")
      .select("supplier_id, request_id, product_name, company_name, supplier_response")
      .eq("id", id)
      .single();

    if (match?.supplier_response === "accepted") {
      void createNotification(
        "match_reply",
        `Deal closed: ${match.product_name ?? "a product"} with ${match.company_name ?? "a supplier"}`,
        undefined,
        { match_id: id, supplier_id: match.supplier_id }
      );

      void logEvent(null, "admin", "deal_closed", "deal", id, {
        product_name: match.product_name,
        company_name: match.company_name,
        supplier_id: match.supplier_id,
        marked_won: true,
      });

      void (async () => {
        const supplierEmail = await getSupplierContactEmail(match.supplier_id);
        if (supplierEmail) {
          await notifySupplierDealClosed({ supplierEmail, productName: match.product_name });
        }
      })();
    }
  }

  return Response.json({ ok: true });
}
