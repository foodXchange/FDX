import { GoogleGenAI } from "@google/genai";
import { GEMINI_MODEL } from "./models";
import { extractImage } from "./extractImage";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { trackApiUsage } from "@/lib/usage/trackUsage";

export interface LayeredProductCard {
  id: string;
  image_urls: string[];
  product_name: string;
  brand_name?: string | null;
  manufacturer?: string | null;
  distributor?: string | null;
  origin_country?: string | null;
  origin_state?: string | null;
  eu_factory_code?: string | null;
  ean_barcode?: string | null;
  category?: string | null;
  category_id?: string | null;
  sub_type?: string | null;
  net_weight?: string | null;
  packaging_format?: string | null;
  sweeteners?: string[];
  dietary_claims?: string[];
  certifications?: string[];
  kosher_marks?: string[];
  ingredients?: string[];
  raw_ocr?: string | null;
  confidence?: number;
  catalog_match?: {
    matched: boolean;
    product_name?: string;
    factory_name?: string;
    supplier_id?: string;
    match_score: number;
    match_reason?: string;
  } | null;
}

export interface LayeredAnalysisResult {
  shared_dna: {
    dietary: string[];
    certifications: string[];
    temperature_regime?: string | null;
    branding_model?: string | null;
    summary?: string;
  };
  category_groups: {
    category_name: string;
    category_id?: string | null;
    product_count: number;
  }[];
  products: LayeredProductCard[];
  conflicts_or_questions?: string[];
  synthesized_brief: string;
}

export async function runLayeredAnalysis(opts: {
  imageUrls: string[];
  briefText?: string | null;
  requestId?: string | null;
}): Promise<LayeredAnalysisResult> {
  const { imageUrls, briefText, requestId } = opts;
  const apiKey = process.env.GEMINI_API_KEY;

  // Pass A: Deep visual extraction per image
  const extractions: any[] = [];
  for (let i = 0; i < imageUrls.length; i++) {
    const url = imageUrls[i];
    try {
      const ext = await extractImage({ imageUrl: url, description: briefText });
      if (ext) {
        extractions.push({ image_index: i + 1, url, ...ext });
      }
    } catch (err) {
      console.warn(`Extraction failed for image #${i + 1}:`, err);
    }
  }

  // If no Gemini API key or extractions failed, return fallback
  if (!apiKey) {
    return {
      shared_dna: { dietary: [], certifications: [] },
      category_groups: [],
      products: [],
      synthesized_brief: briefText || "Sourcing Brief",
    };
  }

  const startTime = Date.now();
  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `You are the Lead Sourcing Intelligence Architect at FoodXchange (B2B food broker between European factories and Middle Eastern / Israeli retail & wholesale buyers).
Your mission is to perform a layered multi-product analysis combining the user's written brief notes and the visual image extractions.

You must output STRICT JSON matching this exact structure:
{
  "shared_dna": {
    "dietary": string[], // The biggest common denominator claims shared across all products (e.g. ["Sugar Free", "Keto Friendly", "Gluten Free", "Organic", "Vegan"])
    "certifications": string[], // Shared quality and religious certifications (e.g. ["Kosher (Chief Rabbinate)", "BRC", "IFS"])
    "temperature_regime": string, // "ambient", "chilled", or "frozen"
    "branding_model": string, // "Supplier Brand", "Private Label", or "Open"
    "summary": string // 1-2 sentence executive summary of the overall request specifications
  },
  "category_groups": [
    {
      "category_name": string,
      "product_count": number
    }
  ],
  "products": [
    {
      "id": string, // e.g. "prod_1", "prod_2"
      "image_urls": string[], // Group all image URLs showing this specific product (e.g. front and back pack shots merged into one product!)
      "product_name": string,
      "brand_name": string or null,
      "manufacturer": string or null, // The legal food producer/factory named on pack (e.g. "Produced by / Hergestellt von / Prodotto da")
      "distributor": string or null,
      "origin_country": string or null, // e.g. "Belgium", "Germany", "Italy"
      "origin_state": string or null, // Specific province/state/region (e.g. "Flanders", "Bavaria", "Modena")
      "eu_factory_code": string or null, // The EU health mark oval code on pack (e.g. "BE 1234 EG", "IT 03 123 CE")
      "ean_barcode": string or null, // Digits of any visible barcode
      "category": string,
      "sub_type": string or null,
      "net_weight": string or null, // e.g. "375g", "85g (12 bars / box)"
      "packaging_format": string or null, // e.g. "Stand-up Pouch", "Flow-wrap bar", "Glass Jar"
      "sweeteners": string[], // Specific sweetener compounds (e.g. ["erythritol", "stevia", "monk fruit"])
      "dietary_claims": string[],
      "certifications": string[],
      "kosher_marks": string[],
      "ingredients": string[],
      "confidence": number // 0 to 1
    }
  ],
  "conflicts_or_questions": string[], // Any discrepancies between buyer notes and packaging visuals
  "synthesized_brief": string // Professional B2B sourcing brief ready for European factory outreach
}

RULES:
1. Deduplicate images showing the same SKU (front shot, back nutrition panel, angled pack shot) into a SINGLE product card with multiple image_urls.
2. If multiple distinct flavors/products are shown (e.g. Milk Chocolate Bark vs Dark Chocolate Bark), create distinct product cards for each.
3. Extract legal manufacturer, EU factory sanitary approval codes, and origin regions whenever visible on packaging.
4. Output ONLY valid JSON, no markdown code fence, no additional commentary.`;

  const userContent = `Buyer Brief Notes:\n${briefText || "No additional text provided."}\n\nVisual Extractions (${extractions.length} images):\n${JSON.stringify(extractions, null, 2)}`;

  let parsedResult: LayeredAnalysisResult;

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          role: "user",
          parts: [{ text: userContent }],
        },
      ],
      config: {
        systemInstruction,
        temperature: 0.1,
        responseMimeType: "application/json",
      },
    });

    const latencyMs = Date.now() - startTime;
    const usage = response.usageMetadata;
    const rawText = response.text || "{}";

    await trackApiUsage({
      provider: "gemini",
      model: GEMINI_MODEL,
      feature: "deal_desk.layered_analysis",
      requestId: requestId || null,
      keyAlias: "GEMINI_API_KEY",
      inputTokens: usage?.promptTokenCount,
      outputTokens: usage?.candidatesTokenCount,
      latencyMs,
      ok: true,
    });

    parsedResult = JSON.parse(rawText) as LayeredAnalysisResult;
  } catch (err: any) {
    console.error("Gemini Layered Analysis error:", err);
    await trackApiUsage({
      provider: "gemini",
      model: GEMINI_MODEL,
      feature: "deal_desk.layered_analysis",
      requestId: requestId || null,
      keyAlias: "GEMINI_API_KEY",
      latencyMs: Date.now() - startTime,
      ok: false,
      error: err.message,
    });

    // Fallback synthesis
    parsedResult = {
      shared_dna: {
        dietary: [],
        certifications: [],
        summary: "Automated analysis completed",
      },
      category_groups: [],
      products: extractions.map((ex, idx) => ({
        id: `prod_${idx + 1}`,
        image_urls: [ex.url],
        product_name: ex.product_name?.value || ex.product_noun?.value || `Product #${idx + 1}`,
        brand_name: ex.benchmark_brand?.value || ex.brand?.value || null,
        manufacturer: ex.manufacturer?.value || null,
        distributor: ex.distributor?.value || null,
        origin_country: ex.origin_country?.value || null,
        origin_state: ex.origin_state?.value || null,
        eu_factory_code: ex.eu_factory_code?.value || null,
        ean_barcode: ex.ean_barcode?.value || null,
        category: ex.category?.category_name || null,
        sub_type: ex.sub_type?.value || null,
        sweeteners: ex.sweeteners?.value || [],
        dietary_claims: ex.nutrition_claims?.value || [],
        certifications: ex.certifications_visible?.value || [],
        kosher_marks: ex.kosher_marks_visible?.value || [],
        confidence: 0.8,
      })),
      synthesized_brief: briefText || "Sourcing Brief",
    };
  }

  // Catalog Matching Check: query existing DB products & factories
  if (Array.isArray(parsedResult.products)) {
    for (const prod of parsedResult.products) {
      try {
        let matchFound = false;

        // 1. Check by EAN Barcode
        if (prod.ean_barcode) {
          const { data: barcodeHit } = await supabaseAdmin
            .from("supplier_products")
            .select("id, product_name, supplier_id")
            .eq("description", prod.ean_barcode)
            .limit(1)
            .maybeSingle();

          if (barcodeHit) {
            prod.catalog_match = {
              matched: true,
              product_name: barcodeHit.product_name,
              supplier_id: barcodeHit.supplier_id,
              match_score: 98,
              match_reason: `Exact EAN barcode match: ${prod.ean_barcode}`,
            };
            matchFound = true;
          }
        }

        // 2. Check by Brand / Product Name
        if (!matchFound && prod.product_name) {
          const cleanName = prod.product_name.replace(/[%_]/g, "").slice(0, 30);
          const { data: nameHits } = await supabaseAdmin
            .from("supplier_products")
            .select("id, product_name, supplier_id, category")
            .ilike("product_name", `%${cleanName}%`)
            .limit(1);

          if (nameHits && nameHits.length > 0) {
            prod.catalog_match = {
              matched: true,
              product_name: nameHits[0].product_name,
              supplier_id: nameHits[0].supplier_id,
              match_score: 88,
              match_reason: `Catalog product match: ${nameHits[0].product_name}`,
            };
            matchFound = true;
          }
        }

        // 3. Check by Manufacturer / Factory Name
        if (!matchFound && prod.manufacturer) {
          const cleanMfr = prod.manufacturer.replace(/[%_]/g, "").slice(0, 30);
          const { data: factoryHits } = await supabaseAdmin
            .from("supplier_factories")
            .select("id, factory_name, supplier_id, country, city")
            .ilike("factory_name", `%${cleanMfr}%`)
            .limit(1);

          if (factoryHits && factoryHits.length > 0) {
            prod.catalog_match = {
              matched: true,
              factory_name: factoryHits[0].factory_name,
              supplier_id: factoryHits[0].supplier_id,
              match_score: 92,
              match_reason: `Known European factory: ${factoryHits[0].factory_name} (${factoryHits[0].country || "EU"})`,
            };
            matchFound = true;
          }
        }

        if (!matchFound) {
          prod.catalog_match = {
            matched: false,
            match_score: 0,
            match_reason: "New European producer (not yet listed in our catalog)",
          };
        }
      } catch (catErr) {
        console.warn("Catalog check failed for product:", catErr);
      }
    }
  }

  return parsedResult;
}
