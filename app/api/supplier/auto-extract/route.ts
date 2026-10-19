import { NextRequest } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { crawlSupplier } from "@/lib/scraper/crawl";

export async function POST(req: NextRequest) {
  try {
    const { website } = await req.json();

    if (!website || typeof website !== "string") {
      return Response.json({ error: "Website URL is required" }, { status: 400 });
    }

    let normalizedUrl = website.trim();
    if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
      normalizedUrl = "https://" + normalizedUrl;
    }

    // Crawl or research the supplier website
    const content = await crawlSupplier(normalizedUrl, "", null);

    if (!content || content.length < 50) {
      return Response.json({
        ok: false,
        error: "Could not fetch content from this website. Please fill in details manually.",
      });
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return Response.json({
        ok: false,
        error: "AI extraction engine unavailable.",
      });
    }

    const ai = new GoogleGenAI({ apiKey: geminiKey });

    const prompt = `You are an AI assistant for a global B2B food marketplace.
Analyze the following crawled website text for a food company:
"""
${content.slice(0, 15000)}
"""

Extract structured company information as JSON matching this EXACT schema:
{
  "company_name": string (the formal company or brand name),
  "country": string (the headquarters or factory country, e.g. "Italy", "Spain", "Greece"),
  "categories": array of strings chosen ONLY from these:
    ["Tomato Products", "Oils & Fats", "Canned Foods", "Snacks & Confectionery", "Pasta & Grains", "Frozen Foods", "Bakery & Cereals", "Sauces & Condiments", "Fish & Seafood", "Dairy", "Beverages", "Spices & Herbs", "Organic & Natural", "Other"],
  "products_description": string (concise 2-3 sentence overview of their core food manufacturing lines, packaging sizes, and formats),
  "certifications": array of strings chosen from:
    ["BRC/BRCGS", "IFS", "FSSC 22000", "ISO 22000", "HACCP", "Organic (EU)"],
  "private_label": boolean (true if they mention private label, OEM, co-packing, or own brand manufacturing)
}

Return ONLY valid JSON.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text?.trim() || "{}";
    const parsed = JSON.parse(text);

    return Response.json({
      ok: true,
      data: parsed,
    });
  } catch (err: unknown) {
    console.error("Auto-extract supplier error:", err);
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "Extraction failed" },
      { status: 500 }
    );
  }
}
