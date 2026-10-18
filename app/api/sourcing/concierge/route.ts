import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveCategoryId, CANONICAL_LEAVES } from "@/lib/pip/resolveCategoryId";
import { embedText } from "@/lib/ai/embed";

export interface SelectedSpecsInput {
  benchmarkBrand?: string;
  packagingFormat?: string;
  dispenserHardware?: string;
  unitWeight?: string;
  productCount?: string;
  brandingMode?: "private_label" | "supplier_brand" | "both" | null;
  kosherLevel?: string;
  dietaryClaims?: string[];
  annualVolume?: string;
  targetMarket?: "Retail" | "Foodservice" | "Industry" | null;
}

export interface ConciergeQuestion {
  id:
    | "benchmarkBrand"
    | "packagingFormat"
    | "unitWeight"
    | "brandingMode"
    | "kosherLevel"
    | "dietaryClaims"
    | "productCount";
  question: string;
  whyItMatters: string;
  options: string[];
  multiSelect?: boolean;
}

export interface ConciergeResponse {
  ok: boolean;
  extractedSpecs: {
    productName: string;
    categoryName: string;
    categoryId: string | null;
    benchmarkBrand: string | null;
    benchmarkProfileSummary: string | null;
    packagingFormat: string | null;
    dispenserHardware: string | null;
    unitWeight: string | null;
    productCount: string | null;
    brandingMode: "private_label" | "supplier_brand" | "both" | null;
    kosherLevel: string | null;
    dietaryClaims: string[];
    targetMarket: "Retail" | "Foodservice" | "Industry" | null;
    detectedLanguage: string | null;
    englishTranslation: string | null;
  };
  completenessScore: number;
  missingQuestions: ConciergeQuestion[];
  conciergeMessage: string;
  sellerBrief: {
    headline: string;
    warmIntro: string;
    productSpecsSummary: string[];
    packagingAndHardwareNote: string;
    dietaryAndComplianceNote: string;
    closingCallToAction: string;
    fullFormattedBrief: string;
  };
  liveMatchPreview: {
    matchingSuppliersCount: number;
    topCountries: string[];
    sampleMatches: Array<{
      companyName: string;
      country: string | null;
      productName: string;
    }>;
  };
}

async function fetchImageInline(url: string): Promise<{ data: string; mimeType: string } | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "image/jpeg";
    const mimeType = contentType.split(";")[0].trim() || "image/jpeg";
    const buf = await res.arrayBuffer();
    return { data: Buffer.from(buf).toString("base64"), mimeType };
  } catch {
    return null;
  }
}

const VALID_UI_CATEGORIES = [
  "Oils & Fats",
  "Tomato Products",
  "Canned Foods",
  "Snacks",
  "Frozen Foods",
  "Bakery",
  "Pasta & Grains",
  "Sauces & Condiments",
  "Fish & Seafood",
  "Organic & Natural",
  "Spices & Herbs",
  "Beverages",
  "Dairy",
  "Pulses & Legumes",
  "Meat & Poultry",
  "Ingredients & Additives",
];

export async function POST(req: NextRequest) {
  let body: {
    imageUrls?: string[];
    description?: string;
    selectedSpecs?: SelectedSpecsInput;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const imageUrls = (body.imageUrls ?? []).filter(Boolean).slice(0, 3);
  const description = (body.description ?? "").trim();
  const specs = body.selectedSpecs ?? {};

  if (imageUrls.length === 0 && !description && !specs.benchmarkBrand) {
    return NextResponse.json(
      { ok: false, error: "Provide at least an image, voice/text description, or benchmark brand" },
      { status: 400 }
    );
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return NextResponse.json(
      { ok: false, error: "GEMINI_API_KEY is not configured" },
      { status: 500 }
    );
  }

  try {
    // 1. Fetch up to 3 benchmark images in parallel for multimodal vision
    const inlineImages = (await Promise.all(imageUrls.map(fetchImageInline))).filter(
      (img): img is { data: string; mimeType: string } => img !== null
    );

    const ai = new GoogleGenAI({ apiKey: geminiKey });

    const prompt = `You are the FoodXchange AI Sourcing Concierge & Brief Architect.
Your job is to help a food buyer (who may write/speak in English, Hebrew עברית, or any other language, or upload 1-3 photos of benchmark products) create an ultra-accurate sourcing request and a warm, friendly, appealing Sourcing Brief for manufacturers and sourcing agents.

INPUT PROVIDED BY BUYER:
- Buyer's spoken/written description: ${JSON.stringify(description || "(none provided)")}
- Number of benchmark photos uploaded: ${inlineImages.length}
- Buyer's explicitly selected chip specifications so far: ${JSON.stringify(specs)}

YOUR TASKS:
1. Inspect any uploaded benchmark photos AND the buyer's text/voice input (if in Hebrew or another language, translate accurately to English).
2. Identify the exact product(s), category (choose best fit from: ${VALID_UI_CATEGORIES.join(", ")}), and Benchmark Brand (e.g., if the buyer mentions or uploads "Hellmann's", "Heinz", "Mutti", "Barilla", "Osem", "Balconi", etc., explain the benchmark's culinary/functional profile such as texture, fat content, emulsion style, or quality tier).
3. Extract or merge the 6 core sourcing dimensions:
   - benchmarkBrand & benchmarkProfileSummary
   - packagingFormat (e.g. Plastic Squeeze Bottle, Glass Jar/Bottle, 5kg Catering Plastic Tub/Box, Single-Serve Sachets, Cans, Pouches)
   - dispenserHardware (e.g. Special Catering Dispenser Pump for 5kg plastic box used in QSR/Burger King-style catering stations, flip-top cap, portion control cap, or null)
   - unitWeight (e.g. 400g, 750ml, 5kg catering tub, 10g sachets)
   - productCount (e.g. 1 hero SKU, 2-3 pack sizes, or multi-flavour range)
   - brandingMode ("private_label", "supplier_brand", or "both")
   - kosherLevel (e.g. "Chief Rabbinate", "Badatz Beit Yosef", "Mehadrin", "Any Kosher", "None")
   - dietaryClaims (array of applicable health/dietary attributes: e.g. "Gluten-Free", "Organic", "Sugar-Free", "Diabetic-Friendly", "Protein-Enriched", "Vegan", "Natural / No Preservatives")
   - targetMarket ("Retail", "Foodservice", or "Industry")
4. Calculate completenessScore (0 to 100) based on how well we know: Product+Benchmark (25%), Packaging+Hardware (25%), Unit Weight/Count (15%), Branding Mode (15%), Kosher+Dietary Claims (20%).
5. For any missing or unclear dimension, generate up to 3 smart, product-specific follow-up questions in "missingQuestions" with 4 to 6 clickable chip options tailored to THIS specific product!
   - Example for Mayonnaise / Sauces:
     - benchmarkBrand options: ["Similar to Hellmann's Real", "Similar to Heinz Classic", "Heavy-Duty Chef / Horeca Mayo", "Light / Reduced Fat Profile", "Vegan Mayo Profile"]
     - packagingFormat options: ["Plastic Squeeze Bottle", "Glass Jar", "5kg Catering Plastic Box", "5kg Catering Box + Dispenser Pump (QSR / Burger King style)", "Single-Serve Sachets (10g–15g)"]
     - unitWeight options: ["10g–15g Sachets", "400ml–500ml Retail", "750ml–1L Bottle", "5kg Catering Tub", "10kg+ Industrial Bulk"]
   - Adapt the options intelligently to whatever product the buyer is actually sourcing (e.g. Olive Oil, Tuna, Wafers, Tomato Paste, Mayonnaise, Frozen Fries, etc.)!
6. Write a WARM, FRIENDLY, APPEALING "sellerBrief" addressed to the manufacturer / seller / sourcing agent:
   - It should read like a warm, enthusiastic, partner-oriented invitation from FoodXchange on behalf of a serious buyer — clear, human, respectful, and commercially exciting, while spelling out every technical requirement (benchmark brand similarity, packaging & dispenser pump details, weights, Private Label vs. Branded, Kosher & dietary specs like Gluten-Free / Diabetic-Friendly / Protein-Enriched).

Return STRICT JSON matching this exact structure:
{
  "extractedSpecs": {
    "productName": "string (clear English product title)",
    "categoryName": "string (one of the valid UI categories)",
    "benchmarkBrand": "string or null",
    "benchmarkProfileSummary": "string or null (e.g. Creamy, rich egg-emulsion profile similar to Hellmann's Real Mayonnaise)",
    "packagingFormat": "string or null",
    "dispenserHardware": "string or null",
    "unitWeight": "string or null",
    "productCount": "string or null",
    "brandingMode": "private_label | supplier_brand | both | null",
    "kosherLevel": "string or null",
    "dietaryClaims": ["string"],
    "targetMarket": "Retail | Foodservice | Industry | null",
    "detectedLanguage": "string (e.g. Hebrew, English)",
    "englishTranslation": "string or null (if input was in Hebrew or another language, the clean English translation)"
  },
  "completenessScore": 75,
  "conciergeMessage": "Warm 1-2 sentence conversational response to the buyer acknowledging what we detected from their photos/voice and what 1-2 quick clicks will make their brief 100% complete.",
  "missingQuestions": [
    {
      "id": "benchmarkBrand | packagingFormat | unitWeight | brandingMode | kosherLevel | dietaryClaims | productCount",
      "question": "Short friendly question",
      "whyItMatters": "1 short phrase explaining why this helps match the right factory",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4", "Option 5"],
      "multiSelect": false
    }
  ],
  "sellerBrief": {
    "headline": "Warm, compelling title for the brief (e.g., Partner Opportunity: Private Label Catering Mayonnaise — Hellmann's Benchmark in 5kg Pump Tubs)",
    "warmIntro": "Warm, friendly 2-3 sentence opening to the seller/agent explaining what our buyer is looking to achieve and why we'd love their help.",
    "productSpecsSummary": [
      "Target Product & Benchmark: ...",
      "Packaging & Dispensing Format: ...",
      "Unit Weight & Range: ...",
      "Branding Mode: ...",
      "Kosher & Dietary Requirements: ..."
    ],
    "packagingAndHardwareNote": "Specific friendly note on packaging & any special hardware like catering pumps, sachets, or retail shelf appeal.",
    "dietaryAndComplianceNote": "Clear note on Kosher level and health/dietary claims (Gluten-Free, Sugar-Free, Diabetic-Friendly, Organic, Protein-Enriched, etc.).",
    "closingCallToAction": "Warm, collaborative closing sentence inviting the supplier or agent to share matching SKUs, samples, and pricing."
  }
}`;

    const parts: Array<{ inlineData: { data: string; mimeType: string } } | { text: string }> = [
      ...inlineImages.map((img) => ({
        inlineData: {
          data: img.data,
          mimeType: img.mimeType,
        },
      })),
      { text: prompt },
    ];

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [{ role: "user", parts }],
      config: {
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    });

    const rawText = (response.text ?? "").trim();
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);

    const ex = parsed.extractedSpecs ?? {};
    const productName = ex.productName || description.slice(0, 60) || "Food Product";
    const categoryName = VALID_UI_CATEGORIES.includes(ex.categoryName)
      ? ex.categoryName
      : "Sauces & Condiments";

    // Merge explicit buyer chip selections over AI inferences
    const finalBenchmark = specs.benchmarkBrand || ex.benchmarkBrand || null;
    const finalPackaging = specs.packagingFormat || ex.packagingFormat || null;
    const finalHardware = specs.dispenserHardware || ex.dispenserHardware || null;
    const finalWeight = specs.unitWeight || ex.unitWeight || null;
    const finalProductCount = specs.productCount || ex.productCount || null;
    const finalBranding = specs.brandingMode ?? ex.brandingMode ?? null;
    const finalKosher = specs.kosherLevel || ex.kosherLevel || null;
    const finalDietary = Array.from(
      new Set([...(ex.dietaryClaims ?? []), ...(specs.dietaryClaims ?? [])])
    );
    const finalMarket = specs.targetMarket ?? ex.targetMarket ?? null;

    // Resolve canonical 21-leaf category_id for precision matching
    const classificationInput = [
      productName,
      categoryName,
      finalBenchmark ? `Benchmark: ${finalBenchmark}` : "",
      ex.benchmarkProfileSummary ?? "",
      description,
    ]
      .filter(Boolean)
      .join(" — ");

    const { category_id, category_name: canonicalCategoryName } =
      await resolveCategoryId(classificationInput);

    // Build full formatted warm brief string
    const sb = parsed.sellerBrief ?? {};
    const specBullets = Array.isArray(sb.productSpecsSummary)
      ? sb.productSpecsSummary.map((s: string) => `• ${s}`).join("\n")
      : "";
    const fullFormattedBrief = [
      `🌟 ${sb.headline || `Sourcing Brief: ${productName}`}`,
      "",
      sb.warmIntro ||
        `Hello! We are assisting a verified buyer looking for a trusted manufacturing partner to supply ${productName}.`,
      "",
      "📋 Key Product & Benchmark Specifications:",
      specBullets,
      "",
      sb.packagingAndHardwareNote ? `📦 Packaging & Format: ${sb.packagingAndHardwareNote}` : "",
      sb.dietaryAndComplianceNote ? `🌿 Kosher & Dietary Profile: ${sb.dietaryAndComplianceNote}` : "",
      "",
      sb.closingCallToAction ||
        "We would love to review your closest matching products, packaging options, and indicative pricing!",
    ]
      .filter((line) => line !== null && line !== undefined)
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    // Live Catalog Preview: check how many approved suppliers match this category / vector
    let matchingSuppliersCount = 0;
    let topCountries: string[] = [];
    let sampleMatches: Array<{ companyName: string; country: string | null; productName: string }> =
      [];

    try {
      const embedQuery = [
        productName,
        finalBenchmark ? `similar to ${finalBenchmark}` : "",
        ex.benchmarkProfileSummary ?? "",
        finalPackaging ?? "",
        finalWeight ?? "",
        finalDietary.join(", "),
      ]
        .filter(Boolean)
        .join(". ");

      // Fast preview query against supplier_products in the resolved canonical category (or keyword match)
      let previewQuery = supabaseAdmin
        .from("supplier_products")
        .select(
          "id, product_name, supplier_id, supplier:supplier_offerings!inner(company_name, country_of_origin, status)"
        )
        .eq("supplier.status", "approved")
        .eq("needs_review", false);

      if (category_id) {
        previewQuery = previewQuery.eq("category_id", category_id);
      } else {
        const mainWord = productName.split(/\s+/)[0]?.replace(/[^a-zA-Z]/g, "");
        if (mainWord && mainWord.length >= 3) {
          previewQuery = previewQuery.ilike("product_name", `%${mainWord}%`);
        }
      }

      if (finalBranding === "private_label") {
        previewQuery = previewQuery.eq("private_label", true);
      }

      const { data: previewRows } = await previewQuery.limit(60);

      if (previewRows && previewRows.length > 0) {
        // Prioritize products matching main keyword
        const mainKw = productName.toLowerCase().split(/\s+/)[0] ?? "";
        const sortedRows = [...previewRows].sort((a, b) => {
          const aHit = mainKw && a.product_name.toLowerCase().includes(mainKw) ? 1 : 0;
          const bHit = mainKw && b.product_name.toLowerCase().includes(mainKw) ? 1 : 0;
          return bHit - aHit;
        });

        const uniqueSuppliers = new Map<
          string,
          { companyName: string; country: string | null; productName: string }
        >();

        for (const r of sortedRows) {
          const sup = Array.isArray(r.supplier) ? r.supplier[0] : r.supplier;
          if (!sup) continue;
          if (!uniqueSuppliers.has(r.supplier_id as string)) {
            uniqueSuppliers.set(r.supplier_id as string, {
              companyName: sup.company_name,
              country: sup.country_of_origin,
              productName: r.product_name,
            });
          }
        }

        matchingSuppliersCount = uniqueSuppliers.size;
        const allSups = Array.from(uniqueSuppliers.values());
        sampleMatches = allSups.slice(0, 4);
        topCountries = Array.from(
          new Set(allSups.map((s) => s.country).filter((c): c is string => Boolean(c)))
        ).slice(0, 5);
      }
      void embedQuery;
    } catch (previewErr) {
      console.warn("Live preview query error:", previewErr);
    }

    const result: ConciergeResponse = {
      ok: true,
      extractedSpecs: {
        productName,
        categoryName: canonicalCategoryName || categoryName,
        categoryId: category_id,
        benchmarkBrand: finalBenchmark,
        benchmarkProfileSummary: ex.benchmarkProfileSummary ?? null,
        packagingFormat: finalPackaging,
        dispenserHardware: finalHardware,
        unitWeight: finalWeight,
        productCount: finalProductCount,
        brandingMode: finalBranding,
        kosherLevel: finalKosher,
        dietaryClaims: finalDietary,
        targetMarket: finalMarket,
        detectedLanguage: ex.detectedLanguage ?? "English",
        englishTranslation: ex.englishTranslation ?? null,
      },
      completenessScore:
        typeof parsed.completenessScore === "number"
          ? Math.min(100, Math.max(15, parsed.completenessScore))
          : 60,
      conciergeMessage:
        parsed.conciergeMessage ||
        `We identified ${productName}. Select any missing details below so we can match the most accurate manufacturers.`,
      missingQuestions: Array.isArray(parsed.missingQuestions)
        ? parsed.missingQuestions.slice(0, 4)
        : [],
      sellerBrief: {
        headline: sb.headline || `Sourcing Brief: ${productName}`,
        warmIntro: sb.warmIntro || "",
        productSpecsSummary: Array.isArray(sb.productSpecsSummary) ? sb.productSpecsSummary : [],
        packagingAndHardwareNote: sb.packagingAndHardwareNote || "",
        dietaryAndComplianceNote: sb.dietaryAndComplianceNote || "",
        closingCallToAction: sb.closingCallToAction || "",
        fullFormattedBrief,
      },
      liveMatchPreview: {
        matchingSuppliersCount,
        topCountries,
        sampleMatches,
      },
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("[concierge] error:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Failed to analyze sourcing request",
      },
      { status: 500 }
    );
  }
}

export { CANONICAL_LEAVES, embedText };
