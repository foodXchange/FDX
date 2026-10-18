import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const QuoteSchema = z.object({
  responseType: z.enum(["accepted", "countered", "declined"]),
  indicativePrice: z.string().trim().optional().default(""),
  moq: z.string().trim().optional().default(""),
  leadTime: z.string().trim().optional().default(""),
  labelOption: z.string().trim().optional().default("both"),
  confirmedCerts: z.array(z.string()).optional().default([]),
  samplesAvailable: z.string().trim().optional().default("yes"),
  contactName: z.string().trim().optional().default(""),
  contactEmail: z.string().trim().optional().default(""),
  contactPhone: z.string().trim().optional().default(""),
  message: z.string().trim().optional().default(""),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: matchId } = await context.params;
  if (!matchId) {
    return NextResponse.json({ error: "Missing match ID" }, { status: 400 });
  }

  const parsed = QuoteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid submission data" },
      { status: 400 }
    );
  }

  const data = parsed.data;

  const { data: match, error: matchErr } = await supabaseAdmin
    .from("sourcing_matches")
    .select("id, supplier_id, request_id, company_name, product_name, match_breakdown")
    .eq("id", matchId)
    .maybeSingle();

  if (matchErr || !match) {
    return NextResponse.json({ error: "Inquiry not found" }, { status: 404 });
  }

  const now = new Date().toISOString();

  // Build structured quote summary for admin dashboard & thread
  const summaryLines: string[] = [];
  const statusLabel =
    data.responseType === "accepted"
      ? "✅ CAN SUPPLY (Confirmed)"
      : data.responseType === "countered"
      ? "🔄 ALTERNATIVE / COUNTER-OFFER"
      : "❌ DECLINED";
  summaryLines.push(statusLabel);

  if (data.indicativePrice) summaryLines.push(`• Price: ${data.indicativePrice}`);
  if (data.moq) summaryLines.push(`• MOQ: ${data.moq}`);
  if (data.leadTime) summaryLines.push(`• Lead Time: ${data.leadTime}`);
  if (data.labelOption) summaryLines.push(`• Format: ${data.labelOption}`);
  if (data.confirmedCerts.length > 0) {
    summaryLines.push(`• Certifications: ${data.confirmedCerts.join(", ")}`);
  }
  if (data.samplesAvailable) {
    summaryLines.push(`• Samples: ${data.samplesAvailable}`);
  }
  if (data.contactName || data.contactEmail || data.contactPhone) {
    summaryLines.push(
      `• Contact: ${[data.contactName, data.contactEmail, data.contactPhone]
        .filter(Boolean)
        .join(" · ")}`
    );
  }
  if (data.message) {
    summaryLines.push(`\nNotes:\n${data.message}`);
  }

  const fullSummary = summaryLines.join("\n");
  const prevBreakdown =
    match.match_breakdown && typeof match.match_breakdown === "object"
      ? (match.match_breakdown as Record<string, unknown>)
      : {};

  const updatedBreakdown: Record<string, unknown> = {
    ...prevBreakdown,
    last_reply_snippet: fullSummary.slice(0, 400),
    last_reply_subject: `Portal Quote Response (${statusLabel})`,
    last_reply_from: data.contactEmail || undefined,
    last_reply_at: now,
    supplier_quote: {
      response_type: data.responseType,
      indicative_price: data.indicativePrice || null,
      moq: data.moq || null,
      lead_time: data.leadTime || null,
      label_option: data.labelOption || null,
      confirmed_certs: data.confirmedCerts,
      samples_available: data.samplesAvailable || null,
      contact_name: data.contactName || null,
      contact_email: data.contactEmail || null,
      contact_phone: data.contactPhone || null,
      message: data.message || null,
      submitted_at: now,
    },
  };

  await supabaseAdmin
    .from("sourcing_matches")
    .update({
      status: data.responseType === "declined" ? "rejected" : "responded",
      supplier_response: data.responseType,
      supplier_responded_at: now,
      responded_at: now,
      supplier_message: fullSummary.slice(0, 2000),
      response_note: fullSummary.slice(0, 500),
      match_breakdown: updatedBreakdown,
    })
    .eq("id", matchId);

  // If supplier provided an email or phone and supplier_offerings is missing it, enrich supplier_offerings
  if (match.supplier_id && (data.contactEmail || data.contactPhone)) {
    const { data: sup } = await supabaseAdmin
      .from("supplier_offerings")
      .select("contact_email, contact_phone")
      .eq("id", match.supplier_id)
      .maybeSingle();

    const supUpdates: Record<string, string> = {};
    if (data.contactEmail && (!sup?.contact_email || !sup.contact_email.trim())) {
      supUpdates.contact_email = data.contactEmail.trim().toLowerCase();
    }
    if (data.contactPhone && (!sup?.contact_phone || !sup.contact_phone.trim())) {
      supUpdates.contact_phone = data.contactPhone.trim();
    }
    if (Object.keys(supUpdates).length > 0) {
      await supabaseAdmin
        .from("supplier_offerings")
        .update(supUpdates)
        .eq("id", match.supplier_id);
    }
  }

  // Insert into match_messages so it appears in the conversation thread
  await supabaseAdmin.from("match_messages").insert({
    match_id: matchId,
    sender_type: "supplier",
    message: `[Supplier Portal Response]\n${fullSummary}`,
  });

  return NextResponse.json({ ok: true });
}
