import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createNotification } from "@/lib/notifications/createNotification";

const UploadedFileSchema = z.object({
  name: z.string(),
  url: z.string(),
  size: z.number().optional(),
  type: z.string().optional(),
});

const QuoteSchema = z.object({
  responseType: z.enum(["accepted", "countered", "declined"]),

  // Pricing & Terms
  indicativePrice: z.string().trim().optional().default(""),
  unitPrice: z.number().nullable().optional(),
  currency: z.string().trim().optional().default("EUR"),
  priceUnit: z.string().trim().optional().default("unit"),
  incoterm: z.string().trim().optional().default("CIF Ashdod"),
  moq: z.string().trim().optional().default(""),
  leadTime: z.string().trim().optional().default(""),
  leadTimeWeeks: z.number().nullable().optional(),
  paymentTerms: z.string().trim().optional().default(""),

  // Packaging & Logistics
  netWeight: z.string().trim().optional().default(""),
  packagingFormat: z.string().trim().optional().default(""),
  unitsPerCase: z.number().nullable().optional(),
  casesPerPallet: z.number().nullable().optional(),
  shelfLifeMonths: z.number().nullable().optional(),
  labelOption: z.string().trim().optional().default("Both Private Label & Branded"),

  // Certifications
  confirmedCerts: z.array(z.string()).optional().default([]),
  kosherType: z.string().trim().optional().default(""),

  // Uploaded Technical Spec Sheets / Certificates
  uploadedFiles: z.array(UploadedFileSchema).optional().default([]),

  // Samples & Courier Dispatch
  samplesAvailable: z.string().trim().optional().default("yes"),
  sampleStatus: z.string().trim().optional().default(""),
  sampleCourier: z.string().trim().optional().default(""),
  sampleAwb: z.string().trim().optional().default(""),
  sampleDispatchDate: z.string().trim().optional().default(""),

  // Contact
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

  const rawBody = await req.json().catch(() => null);
  const parsed = QuoteSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid submission data", details: parsed.error.issues },
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

  // Extract numeric price if unitPrice wasn't explicitly supplied
  let computedUnitPrice = data.unitPrice ?? null;
  if (computedUnitPrice === null && data.indicativePrice) {
    const matchedNum = data.indicativePrice.match(/([0-9]+(?:[.,][0-9]+)?)/);
    if (matchedNum) {
      computedUnitPrice = parseFloat(matchedNum[1].replace(",", "."));
    }
  }

  // Extract lead time weeks if leadTimeWeeks wasn't explicitly supplied
  let computedLeadTimeWeeks = data.leadTimeWeeks ?? null;
  if (computedLeadTimeWeeks === null && data.leadTime) {
    const matchedWeeks = data.leadTime.match(/([0-9]+)/);
    if (matchedWeeks) {
      computedLeadTimeWeeks = parseInt(matchedWeeks[1], 10);
    }
  }

  // Build structured quote summary for admin dashboard & thread
  const summaryLines: string[] = [];
  const statusLabel =
    data.responseType === "accepted"
      ? "✅ CAN SUPPLY (Exact Match)"
      : data.responseType === "countered"
      ? "🔄 ALTERNATIVE / COUNTER-OFFER"
      : "❌ DECLINED";
  summaryLines.push(statusLabel);

  if (computedUnitPrice !== null) {
    summaryLines.push(`• Price: ${data.currency} ${computedUnitPrice.toFixed(2)} / ${data.priceUnit} (${data.incoterm})`);
  } else if (data.indicativePrice) {
    summaryLines.push(`• Price: ${data.indicativePrice}`);
  }

  if (data.moq) summaryLines.push(`• MOQ: ${data.moq}`);
  if (computedLeadTimeWeeks !== null) {
    summaryLines.push(`• Lead Time: ${computedLeadTimeWeeks} weeks`);
  } else if (data.leadTime) {
    summaryLines.push(`• Lead Time: ${data.leadTime}`);
  }

  if (data.netWeight || data.packagingFormat) {
    summaryLines.push(
      `• Packaging: ${[data.netWeight, data.packagingFormat].filter(Boolean).join(" · ")}`
    );
  }
  if (data.labelOption) summaryLines.push(`• Format: ${data.labelOption}`);
  if (data.confirmedCerts.length > 0) {
    summaryLines.push(`• Certifications: ${data.confirmedCerts.join(", ")}`);
  }

  if (data.uploadedFiles && data.uploadedFiles.length > 0) {
    summaryLines.push(
      `• Technical Documents: ${data.uploadedFiles.map((f) => f.name).join(", ")}`
    );
  }

  if (data.sampleAwb) {
    summaryLines.push(
      `• Courier Samples: ${data.sampleCourier || "Express"} AWB: ${data.sampleAwb}`
    );
  } else if (data.samplesAvailable) {
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

  // Build the structured quote object matching Stage 3 & Buyer Portal specifications
  const structuredQuote = {
    unit_price: computedUnitPrice,
    currency: data.currency || "EUR",
    price_unit: data.priceUnit || "unit",
    incoterm: data.incoterm || "CIF Ashdod",
    moq: data.moq || null,
    lead_time_weeks: computedLeadTimeWeeks,
    net_weight: data.netWeight || null,
    packaging_format: data.packagingFormat || null,
    units_per_case: data.unitsPerCase || null,
    cases_per_pallet: data.casesPerPallet || null,
    shelf_life_months: data.shelfLifeMonths || null,
    kosher_type:
      data.kosherType ||
      data.confirmedCerts.find((c) => c.toLowerCase().includes("kosher")) ||
      "Kosher Certified",
    certifications: data.confirmedCerts,
    cooperation_status: data.responseType === "declined" ? "declined" : "cooperating",
    supplier_notes: data.message || null,
    files: data.uploadedFiles,
    quoted_at: now,
  };

  const sampleTracking = data.sampleAwb
    ? {
        courier: data.sampleCourier || "DHL Express",
        awb: data.sampleAwb,
        dispatched_at: data.sampleDispatchDate || now,
        status: "dispatched",
      }
    : null;

  const updatedBreakdown: Record<string, unknown> = {
    ...prevBreakdown,
    last_reply_snippet: fullSummary.slice(0, 400),
    last_reply_subject: `Supplier Portal Quote (${statusLabel})`,
    last_reply_from: data.contactEmail || undefined,
    last_reply_at: now,
    quote: structuredQuote,
    supplier_quote: {
      response_type: data.responseType,
      unit_price: computedUnitPrice,
      currency: data.currency,
      indicative_price: data.indicativePrice || null,
      price_unit: data.priceUnit,
      incoterm: data.incoterm,
      moq: data.moq || null,
      lead_time: data.leadTime || null,
      lead_time_weeks: computedLeadTimeWeeks,
      net_weight: data.netWeight || null,
      packaging_format: data.packagingFormat || null,
      units_per_case: data.unitsPerCase || null,
      cases_per_pallet: data.casesPerPallet || null,
      shelf_life_months: data.shelfLifeMonths || null,
      label_option: data.labelOption || null,
      confirmed_certs: data.confirmedCerts,
      uploaded_files: data.uploadedFiles,
      samples_available: data.samplesAvailable || null,
      sample_status: data.sampleStatus || null,
      sample_courier: data.sampleCourier || null,
      sample_awb: data.sampleAwb || null,
      sample_dispatch_date: data.sampleDispatchDate || null,
      contact_name: data.contactName || null,
      contact_email: data.contactEmail || null,
      contact_phone: data.contactPhone || null,
      message: data.message || null,
      submitted_at: now,
    },
    ...(sampleTracking ? { sample_tracking: sampleTracking } : {}),
  };

  const statusVal = data.responseType === "declined" ? "declined" : "contacted";
  const updatePayload: Record<string, unknown> = {
    status: statusVal,
    supplier_response: data.responseType,
    supplier_responded_at: now,
    responded_at: now,
    supplier_message: fullSummary.slice(0, 2000),
    response_note: fullSummary.slice(0, 500),
    match_breakdown: updatedBreakdown,
  };

  const { error: updateErr } = await supabaseAdmin
    .from("sourcing_matches")
    .update(updatePayload)
    .eq("id", matchId);

  if (updateErr) {
    console.warn("Primary match update warning, retrying with core columns:", updateErr.message);
    await supabaseAdmin
      .from("sourcing_matches")
      .update({
        status: statusVal,
        supplier_response: data.responseType,
        supplier_message: fullSummary.slice(0, 2000),
        match_breakdown: updatedBreakdown,
      })
      .eq("id", matchId);
  }

  // If sample courier AWB was supplied, auto-sync with request's sample dispatch protocol (Stage 4)
  if (data.sampleAwb && match.request_id) {
    try {
      const { data: reqData } = await supabaseAdmin
        .from("sourcing_requests")
        .select("ai_analysis")
        .eq("id", match.request_id)
        .maybeSingle();

      const existingAi = (reqData?.ai_analysis as Record<string, unknown>) ?? {};
      const existingDispatch = (existingAi.sample_dispatch as Record<string, unknown>) ?? {};

      const updatedDispatch = {
        ...existingDispatch,
        courier_name: data.sampleCourier || "DHL Express",
        tracking_number: data.sampleAwb,
        dispatched_at: data.sampleDispatchDate || now,
        status: "dispatched",
        supplier_id: match.supplier_id,
        supplier_name: match.company_name,
      };

      await supabaseAdmin
        .from("sourcing_requests")
        .update({
          ai_analysis: {
            ...existingAi,
            sample_dispatch: updatedDispatch,
          },
        })
        .eq("id", match.request_id);
    } catch (sampleSyncErr) {
      console.warn("Could not sync sample dispatch to request:", sampleSyncErr);
    }
  }

  // If supplier provided contact info, enrich supplier_offerings
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

  // Create real-time Admin Notification
  try {
    const company = match.company_name || "Supplier";
    const prod = match.product_name || "Food Product";
    const priceText = computedUnitPrice !== null ? `(${data.currency} ${computedUnitPrice.toFixed(2)})` : "";
    await createNotification(
      "response",
      `Offer Submitted: ${company} for ${prod} ${priceText}`,
      `${statusLabel} via Supplier Portal. ${data.uploadedFiles.length > 0 ? `Attached ${data.uploadedFiles.length} file(s).` : ""}${data.sampleAwb ? ` Courier AWB: ${data.sampleAwb}.` : ""}`,
      {
        match_id: matchId,
        request_id: match.request_id,
        supplier_id: match.supplier_id,
        unit_price: computedUnitPrice,
        currency: data.currency,
        incoterm: data.incoterm,
        awb: data.sampleAwb || null,
      }
    );
  } catch (notifErr) {
    console.warn("Could not create admin notification for quote:", notifErr);
  }

  return NextResponse.json({ ok: true });
}
