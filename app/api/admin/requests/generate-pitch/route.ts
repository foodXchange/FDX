import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { generateGeminiWithFallback } from "@/lib/ai/models";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      buyerCompany,
      contactName,
      productName,
      benchmarkBrand,
      category,
      packaging,
      privateLabel,
      certifications,
      targetMarket,
      existingBrief,
    } = body;

    if (!productName && !benchmarkBrand && !existingBrief) {
      return NextResponse.json(
        { error: "Product name, brand, or existing brief is required" },
        { status: 400 }
      );
    }

    const brandingContext =
      privateLabel === true
        ? "Private Label (Buyer's Own Retail Brand OEM)"
        : privateLabel === false
        ? "Factory-Branded Line (Seeking Manufacturer Brand Equity & Retail Distribution)"
        : "Open to both Factory Brands and Private Label";

    const certsStr = Array.isArray(certifications) && certifications.length > 0
      ? certifications.join(", ")
      : "Standard EU Food Safety & Israeli Import Readiness";

    const prompt = `You are the Senior Commercial Food Broker at FoodXchange (FDX.TRADING), connecting verified European food manufacturers with Israeli supermarket chains and food importers.

TASK:
Based on the sourcing parameters below, generate two distinct, professional B2B sections in JSON:
1. "buyer_spec": A structured, precise B2B procurement brief explaining what the buyer is looking for (specifications, quality benchmark, dietary attributes, packaging, and commercial logic).
2. "fdx_pitch": An irresistible, high-conviction commercial pitch from FoodXchange to the buyer explaining what FDX proposes/offers to them (curated European factory options, consolidated mixed containers, CIF Ashdod/Haifa landed logistics, compliance SI 1145 label clearance, and broker margin transparency).
3. "whatsapp_summary": A concise, friendly 3-4 sentence WhatsApp message ready to send directly to the buyer lead.

INPUT SOURCING PARAMETERS:
- Buyer Company: ${buyerCompany || "Verified Israeli Retail Chain / Importer"}
- Buyer Contact Person: ${contactName || "Category Buyer"}
- Product Name: ${productName || "Specialty Food Sourcing"}
- Benchmark Brand: ${benchmarkBrand || "None specified"}
- Product Category: ${category || "Food & Beverages"}
- Packaging & Format: ${packaging || "Standard Retail Packaging"}
- Branding Model: ${brandingContext}
- Target Certifications & Kosher: ${certsStr}
- Target Market: ${targetMarket || "Israel"}
- Buyer's Raw Notes / Context: ${existingBrief || "None provided"}

OUTPUT FORMAT:
Respond with ONLY valid JSON with keys:
{
  "buyer_spec": "...",
  "fdx_pitch": "...",
  "whatsapp_summary": "..."
}`;

    const dummyClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "dummy" });
    const result = await generateGeminiWithFallback(dummyClient, {
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.3,
      },
    });

    let parsed;
    try {
      parsed = JSON.parse(result.text);
    } catch {
      // Fallback regex extraction if raw json formatting wrapped in markdown
      const match = result.text.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    }

    if (!parsed || !parsed.buyer_spec) {
      throw new Error("Invalid model JSON response");
    }

    return NextResponse.json({
      ok: true,
      buyer_spec: parsed.buyer_spec,
      fdx_pitch: parsed.fdx_pitch,
      whatsapp_summary: parsed.whatsapp_summary,
    });
  } catch (err: any) {
    console.error("AI Pitch Generation Error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to generate AI pitch" },
      { status: 500 }
    );
  }
}
