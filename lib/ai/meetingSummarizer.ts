import { GoogleGenAI } from "@google/genai";
import { GEMINI_MODEL } from "@/lib/ai/models";

export interface ActionItem {
  task: string;
  owner: "Buyer" | "Factory" | "FoodXchange Desk";
  due_date?: string | null;
  status: "pending" | "done";
}

export interface MeetingAiSummary {
  meeting_title: string;
  executive_summary: string;
  commercial_terms: {
    target_unit_price: number | null;
    currency: "EUR" | "USD" | "ILS" | "GBP";
    incoterms: "CIF Haifa" | "CIF Ashdod" | "FOB Port" | "EXW" | "DDP" | string | null;
    target_volume: string | null;
    payment_terms: string | null;
    pricing_notes: string | null;
  };
  sample_commitments: {
    samples_requested: boolean;
    sample_skus: string[];
    sample_quantity: string | null;
    courier_preference: string | null;
    target_dispatch_date: string | null;
  };
  quality_and_compliance: {
    kosher_pathway: string | null;
    gfsi_certifications: string[];
    private_label_readiness: boolean | null;
    packaging_notes: string | null;
  };
  action_items: ActionItem[];
  suggested_stage_advancement?: "proposal" | "sent" | "responded" | "closed" | null;
}

export interface MeetingContext {
  buyer_company?: string;
  supplier_company?: string;
  product_name?: string;
  match_score?: number;
}

export async function summarizeMeetingWithAI(
  transcriptOrNotes: string,
  context: MeetingContext = {}
): Promise<MeetingAiSummary> {
  const buyer = context.buyer_company || "Israeli Retail Buyer";
  const supplier = context.supplier_company || "European Food Factory";
  const product = context.product_name || "Food Product";

  const fallback: MeetingAiSummary = {
    meeting_title: `Commercial Alignment Call: ${product}`,
    executive_summary: transcriptOrNotes.slice(0, 300) || "Discussion regarding commercial terms, product specifications, and sample testing.",
    commercial_terms: {
      target_unit_price: null,
      currency: "EUR",
      incoterms: "CIF Haifa",
      target_volume: "1 x 40ft FCL",
      payment_terms: "30% Advance, 70% vs B/L Copy",
      pricing_notes: null,
    },
    sample_commitments: {
      samples_requested: true,
      sample_skus: [product],
      sample_quantity: "2-4 units for sensory evaluation",
      courier_preference: "DHL Express",
      target_dispatch_date: null,
    },
    quality_and_compliance: {
      kosher_pathway: "Chief Rabbinate of Israel",
      gfsi_certifications: ["BRCGS", "IFS"],
      private_label_readiness: true,
      packaging_notes: "Standard export carton",
    },
    action_items: [
      {
        task: "Factory to confirm sample dispatch details and tracking number",
        owner: "Factory",
        due_date: "Within 3 business days",
        status: "pending",
      },
      {
        task: "Buyer to review commercial CIF terms and prepare sensory tasting panel",
        owner: "Buyer",
        due_date: "Upon sample arrival",
        status: "pending",
      },
    ],
    suggested_stage_advancement: "responded",
  };

  if (!process.env.GEMINI_API_KEY || transcriptOrNotes.trim().length < 10) {
    return fallback;
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const prompt = `You are an elite B2B food trade intelligence analyst for FoodXchange (https://foodxchange.com).
We connect verified Israeli supermarket buyers (e.g. Shufersal, Rami Levy, Yochananof) with European food manufacturers.

Analyze the following call transcript / notes from a video meeting between Buyer "${buyer}" and Factory "${supplier}" regarding "${product}".

Extract structured insights in this exact JSON format:
{
  "meeting_title": "Concise professional title (max 60 chars)",
  "executive_summary": "2-3 clear, executive sentences summarizing key agreements, interest level, and next milestones.",
  "commercial_terms": {
    "target_unit_price": number or null (e.g. 0.85 or null if not specified),
    "currency": "EUR" | "USD" | "ILS" | "GBP",
    "incoterms": "CIF Haifa" | "CIF Ashdod" | "FOB Port" | "EXW" | "DDP" | null,
    "target_volume": "e.g. 1 x 40ft HQ FCL (~24,000 units) or null",
    "payment_terms": "e.g. 30% advance deposit, 70% against B/L copy or null",
    "pricing_notes": "any specific pricing conditions or discounts discussed or null"
  },
  "sample_commitments": {
    "samples_requested": boolean,
    "sample_skus": ["array of SKU names discussed for sampling"],
    "sample_quantity": "e.g. 3 units per SKU or null",
    "courier_preference": "DHL Express" | "FedEx" | "UPS" | null,
    "target_dispatch_date": "YYYY-MM-DD or timeframe like 'By Friday' or null"
  },
  "quality_and_compliance": {
    "kosher_pathway": "e.g. Chief Rabbinate / Badatz / OU / Not Required or null",
    "gfsi_certifications": ["BRCGS", "IFS Food", "ISO 22000", "FSSC 22000"],
    "private_label_readiness": boolean or null,
    "packaging_notes": "e.g. Hebrew translation label needed, 500g bag, shelf life 24m or null"
  },
  "action_items": [
    {
      "task": "Specific actionable next step",
      "owner": "Buyer" | "Factory" | "FoodXchange Desk",
      "due_date": "deadline or timeframe or null",
      "status": "pending"
    }
  ],
  "suggested_stage_advancement": "proposal" | "sent" | "responded" | "closed" | null
}

Transcript / Meeting Notes:
"""
${transcriptOrNotes.slice(0, 8000)}
"""

Return ONLY the raw JSON object. Do not wrap in markdown quotes if possible, or return strictly valid JSON.`;

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
    });

    const text = response.text?.trim() || "";
    const cleanJson = text
      .replace(/^```json/i, "")
      .replace(/^```/i, "")
      .replace(/```$/i, "")
      .trim();

    const parsed = JSON.parse(cleanJson) as MeetingAiSummary;

    // Validate required fields
    if (parsed.executive_summary && parsed.commercial_terms) {
      return parsed;
    }
    return fallback;
  } catch (err) {
    console.warn("AI meeting summarization fallback used:", err);
    return fallback;
  }
}
