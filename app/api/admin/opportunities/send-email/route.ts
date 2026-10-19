import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifySession, COOKIE_NAME } from "@/lib/adminAuth";
import { sendSupplierEmailSmart, getMatchRefTag } from "@/lib/email/gmailEngine";
import { logEvent } from "@/lib/events/logEvent";
import { createNotification } from "@/lib/notifications/createNotification";

const SendOpportunityEmailSchema = z.object({
  matchId: z.string().uuid(),
  recipientType: z.enum(["buyer", "supplier"]),
  to: z.string().email(),
  cc: z.string().email().optional().or(z.literal("")),
  subject: z.string().trim().min(1),
  bodyText: z.string().trim().min(1),
  targetSku: z.string().optional(),
  retailPrice: z.string().optional(),
  factoryName: z.string().optional(),
  factoryCountry: z.string().optional(),
  marginGain: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;
  if (!session || !(await verifySession(session))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = SendOpportunityEmailSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request data", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const {
    matchId,
    recipientType,
    to,
    subject,
    bodyText,
    targetSku,
    retailPrice,
    factoryName,
    factoryCountry,
    marginGain,
  } = parsed.data;

  // Build high-impact branded benchmark card HTML
  const benchmarkCardHtml = `
    <div style="margin:20px 0;padding:16px;border:1px solid #fed7aa;border-radius:12px;background:#fff7ed;">
      <p style="margin:0 0 10px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#ea580c;">
        FDX Commercial Opportunity Intelligence
      </p>
      <table style="width:100%;font-size:13px;color:#334155;border-collapse:collapse;">
        ${targetSku ? `<tr><td style="padding:4px 0;font-weight:600;color:#64748b;width:140px;">Target Retail Line:</td><td style="font-weight:700;color:#0f172a;">${targetSku}</td></tr>` : ""}
        ${retailPrice ? `<tr><td style="padding:4px 0;font-weight:600;color:#64748b;">Current Shelf Benchmark:</td><td style="font-weight:600;color:#0f172a;">${retailPrice}</td></tr>` : ""}
        ${factoryName ? `<tr><td style="padding:4px 0;font-weight:600;color:#64748b;">Verified Factory Parity:</td><td style="font-weight:700;color:#0f172a;">${factoryName} (${factoryCountry || "Europe"})</td></tr>` : ""}
        ${marginGain ? `<tr><td style="padding:4px 0;font-weight:600;color:#64748b;">Projected Margin Spread:</td><td style="font-weight:700;color:#16a34a;">${marginGain}</td></tr>` : ""}
      </table>
    </div>
  `;

  try {
    const sendResult = await sendSupplierEmailSmart({
      matchId,
      to,
      subject,
      bodyText,
      benchmarkCardHtml,
    });

    if (!sendResult.success) {
      return NextResponse.json(
        { error: sendResult.error || "Failed to send email via outbound provider" },
        { status: 502 }
      );
    }

    // Update match status accordingly
    const newStatus = recipientType === "buyer" ? "pitched" : "reviewed";
    await supabaseAdmin
      .from("assortment_matches")
      .update({ status: newStatus })
      .eq("id", matchId);

    // Log the event
    void logEvent(null, "admin", recipientType === "buyer" ? "match_sent" : "rfq_sent", "match", matchId, {
      match_id: matchId,
      recipient: to,
      recipient_type: recipientType,
      via: sendResult.via,
      message_id: sendResult.messageId,
      subject: sendResult.subjectUsed || subject,
    });

    // Create notification in unified Notification Hub
    const isBuyer = recipientType === "buyer";
    const refTag = getMatchRefTag(matchId);
    await createNotification(
      isBuyer ? "match_sent" : "follow_up",
      isBuyer
        ? `Retailer Pitch: ${targetSku || "Commercial Opportunity"}`
        : `Factory RFQ: ${factoryName || "Supplier Parity Inquiry"}`,
      `${isBuyer ? "Dispatched pitch proposal" : "Dispatched factory specs inquiry"} to ${to} (${sendResult.subjectUsed || subject})`,
      {
        match_id: matchId,
        target_sku: targetSku,
        recipient_type: recipientType,
        to,
        via: sendResult.via,
        message_id: sendResult.messageId,
        subject: sendResult.subjectUsed || subject,
        body_text: bodyText,
        factory_name: factoryName,
        factory_country: factoryCountry,
        retail_price: retailPrice,
        margin_gain: marginGain,
        ref_tag: refTag,
        action_url: `/admin/opportunities?search=${encodeURIComponent(targetSku || "")}`,
        priority: "normal",
      }
    );

    return NextResponse.json({
      ok: true,
      via: sendResult.via,
      messageId: sendResult.messageId,
      subjectUsed: sendResult.subjectUsed,
      newStatus,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Outreach dispatch failed" },
      { status: 500 }
    );
  }
}
