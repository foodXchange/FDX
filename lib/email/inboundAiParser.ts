import { GoogleGenAI } from "@google/genai";
import { GEMINI_MODEL } from "@/lib/ai/models";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { logAdminAction } from "@/lib/auditLog";
import { revalidatePath } from "next/cache";

export interface InboundAiParseResult {
  intent:
    | "quote_offer"
    | "sample_dispatch"
    | "qa_compliance"
    | "order_logistics"
    | "general_inquiry"
    | "declined";
  confidence: number;
  english_summary: string;
  detected_supplier_name?: string;
  quote_data?: {
    unit_price?: number | null;
    currency?: string;
    net_weight?: string;
    packaging_format?: string;
    moq?: string;
    incoterm?: string;
    lead_time_weeks?: number;
    kosher_type?: string;
    supplier_notes?: string;
  };
  sample_data?: {
    courier_name?: string;
    awb_tracking_number?: string;
    dispatched_date?: string;
    estimated_arrival_date?: string;
  };
  qa_data?: {
    confirmed_certificates?: string[];
    brc_or_ifs_grade?: string;
    expiry_date?: string;
    kosher_agency_approved?: boolean;
    spec_sheet_link?: string;
  };
  logistics_data?: {
    container_number?: string;
    bill_of_lading?: string;
    shipping_line?: string;
    vessel_name?: string;
    eta_port?: string;
  };
  recommended_stage: "Stage 3 (Decision Board)" | "Stage 4 (Samples)" | "Stage 5 (QA)" | "Stage 7 (Logistics)" | "Inquiry";
}

/**
 * Parses raw incoming supplier text / email body using Gemini 3.8 Flash.
 * Translates multi-lingual emails (Spanish, Italian, German, French, Turkish, Hebrew)
 * and extracts structured commercial parameters.
 */
export async function parseInboundCorrespondenceWithAI(
  rawText: string,
  subject: string,
  fromEmail: string
): Promise<InboundAiParseResult> {
  const fallback: InboundAiParseResult = {
    intent: "general_inquiry",
    confidence: 0.5,
    english_summary: rawText.slice(0, 300),
    recommended_stage: "Inquiry",
  };

  if (!process.env.GEMINI_API_KEY || rawText.trim().length < 5) {
    return fallback;
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const prompt = `You are an expert B2B food trade analyst at FoodXchange (FDX).
Analyze the following supplier email/message from "${fromEmail}" regarding food sourcing.
The message may be in English, Spanish, Italian, French, German, Greek, Portuguese, Turkish, or Hebrew.

Analyze the intent and extract all structured data:
1. Intent:
   - "quote_offer": Supplier provides unit price, MOQ, incoterm, pack weight, or price list.
   - "sample_dispatch": Supplier sent samples via DHL, FedEx, UPS or shares Air Waybill (AWB) tracking number.
   - "qa_compliance": Supplier shares BRC, IFS, ISO, HACCP, specifications (TDS), or Kosher certificate info.
   - "order_logistics": Supplier references container number, Bill of Lading (B/L), vessel name, or port delivery.
   - "declined": Supplier cannot supply or declines the RFQ.
   - "general_inquiry": General questions or comments.

2. Extract structured fields if present.

Subject: ${subject}
Message Body:
${rawText.slice(0, 2500)}

Return ONLY valid JSON matching this exact structure:
{
  "intent": "quote_offer" | "sample_dispatch" | "qa_compliance" | "order_logistics" | "general_inquiry" | "declined",
  "confidence": number between 0.1 and 1.0,
  "english_summary": "1-3 concise sentences summarizing the supplier's message in professional English",
  "detected_supplier_name": "Supplier company name if stated, else null",
  "quote_data": {
    "unit_price": number or null,
    "currency": "EUR" | "USD" | "ILS" | "GBP",
    "net_weight": "e.g. 1L / 400g / 500ml or null",
    "packaging_format": "e.g. PET Bottle / Tin Can / Glass Jar or null",
    "moq": "e.g. 1 x 40ft HQ FCL / 25,000 units or null",
    "incoterm": "e.g. CIF Ashdod / FOB Valencia or null",
    "lead_time_weeks": number of weeks or null,
    "kosher_type": "e.g. Kosher (Chief Rabbinate) or null",
    "supplier_notes": "additional terms mentioned or null"
  },
  "sample_data": {
    "courier_name": "DHL Express" | "FedEx" | "UPS" | "TNT" | "Aramex" | null,
    "awb_tracking_number": "Tracking number string or null",
    "dispatched_date": "YYYY-MM-DD or null",
    "estimated_arrival_date": "YYYY-MM-DD or null"
  },
  "qa_data": {
    "confirmed_certificates": ["BRC", "IFS", "ISO 22000", "HACCP", "Kosher"],
    "brc_or_ifs_grade": "Grade AA / Higher Level or null",
    "expiry_date": "YYYY-MM-DD or null",
    "kosher_agency_approved": boolean or null,
    "spec_sheet_link": "link if mentioned or null"
  },
  "logistics_data": {
    "container_number": "e.g. MSKU-9481029 or null",
    "bill_of_lading": "B/L number or null",
    "shipping_line": "MSC / ZIM / Maersk or null",
    "vessel_name": "vessel name or null",
    "eta_port": "YYYY-MM-DD or null"
  },
  "recommended_stage": "Stage 3 (Decision Board)" | "Stage 4 (Samples)" | "Stage 5 (QA)" | "Stage 7 (Logistics)" | "Inquiry"
}`;

    const res = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    });

    const parsed = JSON.parse(res.text ?? "{}") as InboundAiParseResult;
    return {
      intent: parsed.intent || fallback.intent,
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.85,
      english_summary: parsed.english_summary || fallback.english_summary,
      detected_supplier_name: parsed.detected_supplier_name,
      quote_data: parsed.quote_data,
      sample_data: parsed.sample_data,
      qa_data: parsed.qa_data,
      logistics_data: parsed.logistics_data,
      recommended_stage: parsed.recommended_stage || "Stage 3 (Decision Board)",
    };
  } catch (err) {
    console.error("parseInboundCorrespondenceWithAI error:", err);
    return fallback;
  }
}

/**
 * Applies the AI-parsed inbound message directly to the relevant request stage:
 * - Quote -> Stage 3 (Decision Board & Match quote)
 * - Sample AWB -> Stage 4 (Sample Dispatch Hub)
 * - QA Certs -> Stage 5 (QA Gateway)
 * - Logistics -> Stage 7 (Ocean Container Tracker)
 */
export async function applyInboundParseToRequest(
  requestId: string,
  matchId: string | null,
  parsed: InboundAiParseResult,
  rawSource: {
    fromEmail: string;
    subject: string;
    bodyText: string;
    receivedAt?: string;
  }
): Promise<{ ok: true; updatedStages: string[] } | { ok: false; error: string }> {
  const { data: req, error: reqErr } = await supabaseAdmin
    .from("sourcing_requests")
    .select("id, ai_analysis, company, product_name")
    .eq("id", requestId)
    .single();

  if (reqErr || !req) {
    return { ok: false, error: reqErr?.message || "Request not found" };
  }

  const updatedStages: string[] = [];
  const existingAiAnalysis = (req.ai_analysis as Record<string, any> | null) ?? {};
  let newAiAnalysis = { ...existingAiAnalysis };

  // 1. If Quote Data exists -> Update Sourcing Match & Stage 3 Decision Board
  if (parsed.quote_data?.unit_price && matchId) {
    const { data: match } = await supabaseAdmin
      .from("sourcing_matches")
      .select("id, match_breakdown")
      .eq("id", matchId)
      .single();

    if (match) {
      const existingBreakdown = (match.match_breakdown as Record<string, any>) ?? {};
      const updatedQuote = {
        unit_price: parsed.quote_data.unit_price,
        currency: parsed.quote_data.currency || "EUR",
        net_weight: parsed.quote_data.net_weight || "1L",
        packaging_format: parsed.quote_data.packaging_format || "Standard packaging",
        moq: parsed.quote_data.moq || "1 x 40ft HQ FCL",
        lead_time_weeks: parsed.quote_data.lead_time_weeks || 3,
        incoterm: parsed.quote_data.incoterm || "CIF Ashdod",
        kosher_type: parsed.quote_data.kosher_type || "Kosher (Chief Rabbinate)",
        cooperation_status: parsed.intent === "declined" ? "declined" : "cooperating",
        supplier_notes: parsed.quote_data.supplier_notes || parsed.english_summary,
        quoted_at: rawSource.receivedAt || new Date().toISOString(),
        parsed_by_ai: true,
      };

      await supabaseAdmin
        .from("sourcing_matches")
        .update({
          status: parsed.intent === "declined" ? "rejected" : "responded",
          supplier_response: parsed.intent === "declined" ? "declined" : "accepted",
          supplier_message: parsed.english_summary,
          supplier_responded_at: rawSource.receivedAt || new Date().toISOString(),
          match_breakdown: {
            ...existingBreakdown,
            quote: updatedQuote,
          },
        })
        .eq("id", matchId);

      updatedStages.push("Stage 3 (Decision Board Quote)");
    }
  }

  // 2. If Sample Dispatch AWB exists -> Update Stage 4 Sample Hub
  if (parsed.sample_data?.awb_tracking_number) {
    const existingSample = newAiAnalysis.sample_dispatch || {};
    newAiAnalysis.sample_dispatch = {
      ...existingSample,
      status: "in_transit",
      shipment: {
        ...(existingSample.shipment || {}),
        courier_name: parsed.sample_data.courier_name || existingSample.shipment?.courier_name || "DHL Express",
        awb_tracking_number: parsed.sample_data.awb_tracking_number,
        dispatched_date: parsed.sample_data.dispatched_date || new Date().toISOString().slice(0, 10),
        estimated_arrival_date: parsed.sample_data.estimated_arrival_date || existingSample.shipment?.estimated_arrival_date,
      },
      updated_at: new Date().toISOString(),
      updated_by: "Inbound AI Parser (Gemini)",
    };
    updatedStages.push("Stage 4 (Sample Courier Tracking)");
  }

  // 3. If QA / BRC data exists -> Update Stage 5 QA Gateway
  if (parsed.qa_data && (parsed.qa_data.confirmed_certificates?.length || parsed.qa_data.brc_or_ifs_grade)) {
    const existingQa = newAiAnalysis.qa_regulatory_dossier || {};
    const existingCerts = existingQa.factory_safety?.certificates || [];

    newAiAnalysis.qa_regulatory_dossier = {
      ...existingQa,
      factory_safety: {
        ...(existingQa.factory_safety || {}),
        technical_data_sheet_url: parsed.qa_data.spec_sheet_link || existingQa.factory_safety?.technical_data_sheet_url || "",
      },
      updated_at: new Date().toISOString(),
      updated_by: "Inbound AI Parser (Gemini)",
    };
    updatedStages.push("Stage 5 (QA Dossier)");
  }

  // 4. If Ocean Container / Logistics data exists -> Update Stage 7 Order Logistics
  if (parsed.logistics_data?.container_number || parsed.logistics_data?.bill_of_lading) {
    const existingWorkflow = newAiAnalysis.order_workflow || {};
    newAiAnalysis.order_workflow = {
      ...existingWorkflow,
      container_number: parsed.logistics_data.container_number || existingWorkflow.container_number,
      bill_of_lading: parsed.logistics_data.bill_of_lading || existingWorkflow.bill_of_lading,
      shipping_line: parsed.logistics_data.shipping_line || existingWorkflow.shipping_line,
      vessel_name: parsed.logistics_data.vessel_name || existingWorkflow.vessel_name,
      eta_port: parsed.logistics_data.eta_port || existingWorkflow.eta_port,
      delivery_status: "at_port",
      updated_at: new Date().toISOString(),
      updated_by: "Inbound AI Parser (Gemini)",
    };
    updatedStages.push("Stage 7 (Ocean Container & B/L)");
  }

  // 5. Save updated ai_analysis to request
  if (Object.keys(newAiAnalysis).length > 0) {
    await supabaseAdmin
      .from("sourcing_requests")
      .update({ ai_analysis: newAiAnalysis })
      .eq("id", requestId);
  }

  // 6. Record inbound message log into match_messages if matchId is known
  if (matchId) {
    await supabaseAdmin.from("match_messages").insert({
      match_id: matchId,
      sender_type: "supplier",
      message: `[Inbound Reply from ${rawSource.fromEmail}]\nSubject: ${rawSource.subject}\nAI Summary: ${parsed.english_summary}\nDetected Intent: ${parsed.intent}\n\nFull Body:\n${rawSource.bodyText.slice(0, 1000)}`,
    });
  }

  await logAdminAction({
    adminEmail: "system_ai_inbound",
    action: "inbound_ai_parse_applied",
    targetType: "sourcing_request",
    targetId: requestId,
    metadata: {
      from: rawSource.fromEmail,
      intent: parsed.intent,
      stages: updatedStages,
      summary: parsed.english_summary,
    },
  });

  try {
    revalidatePath(`/admin/requests/${requestId}`);
    revalidatePath("/admin/requests");
  } catch {}

  return { ok: true, updatedStages };
}
