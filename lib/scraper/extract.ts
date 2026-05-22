import Anthropic from "@anthropic-ai/sdk";

export interface ExtractedProduct {
  product_name: string;
  category: string;
  subcategory: string | null;
  description: string | null;
  formats: string[];
  sizes: string[];
  brix_level: string | null;
  shelf_life_months: number | null;
  certifications: string[];
  kosher_types: string[];
  product_type: string | null;
  primary_ingredients: string[];
  private_label: boolean;
  tags: string[];
  markets_suitable: string[];
  confidence: number;
  detected_language?: string;
}

export interface ManufacturerDetectionResult {
  isManufacturer: boolean;
  companyType: string;
  reason: string;
  confidence: number;
}

const EXTRACT_SYSTEM_PROMPT =
  "You are a food industry product data extraction expert. You read supplier website content and " +
  "extract structured product information for a B2B food sourcing database.\n\n" +
  "Rules:\n" +
  "- Extract ONLY products clearly mentioned on the website — never invent products\n" +
  "- Be specific about formats and sizes when mentioned\n" +
  "- Certifications must be explicitly stated on the website — never assume\n" +
  "- Product type: pure_ingredient means the product IS the ingredient (olive oil, tomato paste, flour). " +
  "processed_food means it CONTAINS ingredients (pasta sauce, crackers). " +
  "semi_processed means minimally processed (canned fish, jarred vegetables).\n" +
  "- Confidence: how certain you are based on website content quality\n" +
  "  1.0 = product page with full specs\n" +
  "  0.7 = product mentioned with some detail\n" +
  "  0.4 = product implied, little detail\n" +
  "- Output ONLY valid JSON — no explanation";

export async function detectManufacturerType(
  websiteContent: string,
  companyName: string
): Promise<ManufacturerDetectionResult> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 200,
      system:
        "You classify food companies based on their website content. Return JSON only.",
      messages: [
        {
          role: "user",
          content:
            `Classify this food company based on their website content.\n\n` +
            `Company: ${companyName}\n` +
            `Website content (first 3000 chars):\n${websiteContent.slice(0, 3000)}\n\n` +
            `Return ONLY this JSON:\n` +
            `{\n` +
            `  "is_manufacturer": true or false,\n` +
            `  "company_type": "manufacturer" | "trading_company" | "agency" | "wholesaler" | "retailer" | "importer" | "mixed" | "unknown",\n` +
            `  "reason": "one sentence explanation",\n` +
            `  "confidence": 0.0 to 1.0\n` +
            `}\n\n` +
            `manufacturer = company that MAKES the product in their own or contracted factory.\n` +
            `Signs of manufacturer: "our factory", "we produce", "manufacturing", "production facility",\n` +
            `"our plant", "we make", ingredient lists, production capacity, BRC/IFS certs, "private label",\n` +
            `"contract manufacturing".\n\n` +
            `NOT a manufacturer: "we distribute", "we import", "our portfolio of brands",\n` +
            `"exclusive agent", "authorized distributor", "we source from", no production mentioned,\n` +
            `only brand names listed.\n\n` +
            `Signs of manufacturer in other languages:\n` +
            `  Italian: "il nostro stabilimento", "produciamo", "la nostra produzione", "impianto produttivo", "trasformazione", "lavorazione"\n` +
            `  Spanish: "nuestra fábrica", "producimos", "nuestra planta", "fabricación", "elaboración", "procesamiento"\n` +
            `  French: "notre usine", "nous produisons", "notre unité de production", "fabrication", "transformation"\n` +
            `  German: "unsere Fabrik", "wir produzieren", "Produktionsanlage", "Herstellung", "Verarbeitung"\n` +
            `  Polish: "nasza fabryka", "produkujemy", "zakład produkcyjny", "przetwórstwo"\n\n` +
            `Signs of NON-manufacturer in other languages:\n` +
            `  Italian: "distribuiamo", "importiamo", "rappresentiamo", "agenzia"\n` +
            `  Spanish: "distribuimos", "importamos", "representamos", "agencia"\n` +
            `  French: "nous distribuons", "nous importons", "agence", "représentant"\n` +
            `  German: "wir vertreiben", "Importeur", "Handelsvertreter", "Agentur"`,
        },
      ],
    });

    const raw =
      response.content[0].type === "text"
        ? response.content[0].text.trim()
        : "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON in response");

    const parsed = JSON.parse(match[0]) as {
      is_manufacturer: boolean;
      company_type: string;
      reason: string;
      confidence: number;
    };

    return {
      isManufacturer: Boolean(parsed.is_manufacturer),
      companyType: parsed.company_type ?? "unknown",
      reason: parsed.reason ?? "",
      confidence:
        typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
    };
  } catch {
    return {
      isManufacturer: true,
      companyType: "unknown",
      reason: "detection failed",
      confidence: 0,
    };
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function safeParseProducts(raw: string): any[] {
  // Try direct parse first
  try {
    const match = raw.match(/\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]);
  } catch {}

  // Try to extract partial valid JSON by finding complete product objects
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const objects: any[] = [];
    const regex = /\{[^{}]*"product_name"[^{}]*\}/g;
    const matches = raw.match(regex) ?? [];
    for (const m of matches) {
      try {
        objects.push(JSON.parse(m));
      } catch {}
    }
    if (objects.length > 0) return objects;
  } catch {}

  return [];
}

export async function extractProducts(
  websiteContent: string,
  supplier: {
    company_name: string;
    country_of_origin: string | null;
    certifications: string[];
  }
): Promise<ExtractedProduct[]> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!,
  });

  if (!websiteContent || websiteContent.length < 100) {
    return [];
  }

  const userPrompt =
    `Extract all food products from this supplier website content.\n\n` +
    `IMPORTANT: The website may be in ANY language — Italian, Spanish, French, German, ` +
    `Polish, Greek, Turkish, Dutch, Portuguese, Croatian, Czech, Romanian, or others. You must:\n` +
    `- Read and understand content in whatever language it appears\n` +
    `- Extract product information accurately regardless of language\n` +
    `- Output ALL field values in English (translate product names, descriptions, categories)\n` +
    `- Keep original brand names exactly as written (do not translate brand names)\n` +
    `- Recognise certifications in any language:\n` +
    `  Italian: "certificazione kosher", "biologico"\n` +
    `  Spanish: "certificado kosher", "ecológico"\n` +
    `  French: "certifié casher", "biologique"\n` +
    `  German: "koscher zertifiziert", "biologisch"\n` +
    `  Polish: "certyfikat kosher", "ekologiczny"\n` +
    `  Greek: "πιστοποιητικό kosher"\n` +
    `  Always output certifications in English\n\n` +
    `Supplier: ${supplier.company_name}\n` +
    `Country: ${supplier.country_of_origin ?? "Unknown"}\n` +
    `Known certifications: ${supplier.certifications.join(", ") || "None stated"}\n\n` +
    `Website content:\n${websiteContent.slice(0, 40000)}\n\n` +
    `Return ONLY this JSON array — no other text:\n` +
    `[\n` +
    `  {\n` +
    `    "product_name": "specific product name",\n` +
    `    "category": "one of: Tomato Products | Pasta & Grains | Snacks | Dairy | Beverages | Sauces & Condiments | Canned Foods | Frozen Foods | Oils & Fats | Fish & Seafood | Bakery | Spices & Herbs | Meat & Poultry | Pulses & Legumes | Organic & Natural | Ingredients & Additives | Other",\n` +
    `    "subcategory": "specific subcategory or null",\n` +
    `    "description": "1-2 sentence description from website or null",\n` +
    `    "formats": ["e.g. Can 400g", "Bottle 750ml", "Bag-in-box 5kg", "Drum 210kg"],\n` +
    `    "sizes": ["400g", "750ml"],\n` +
    `    "brix_level": "e.g. 28-30° or null",\n` +
    `    "shelf_life_months": 24,\n` +
    `    "certifications": ["BRC", "IFS", "Kosher"],\n` +
    `    "kosher_types": ["Chief Rabbinate"],\n` +
    `    "product_type": "pure_ingredient or processed_food or semi_processed or mixed",\n` +
    `    "primary_ingredients": ["main ingredient"],\n` +
    `    "private_label": true,\n` +
    `    "tags": ["tag1", "tag2"],\n` +
    `    "markets_suitable": ["Retail", "Foodservice", "Industry"],\n` +
    `    "confidence": 0.7,\n` +
    `    "detected_language": "english" or "italian" or "spanish" or "french" or "german" or "polish" or "other"\n` +
    `  }\n` +
    `]\n\n` +
    `Extract a MAXIMUM of 25 most representative products. ` +
    `For large companies, pick the most distinct products across all categories — ` +
    `one entry per product variant, not per SKU. ` +
    `Example: "Tomato Paste" covers all sizes, not "Tomato Paste 70g", "Tomato Paste 115g" ` +
    `separately unless format matters for matching.\n` +
    `If no products found, return empty array: []`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 3000,
      system: EXTRACT_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const raw =
      response.content[0].type === "text"
        ? response.content[0].text.trim()
        : "";

    const parsed = safeParseProducts(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return [];
    return parsed as ExtractedProduct[];
  } catch (err) {
    console.error("Extraction error:", err);
    return [];
  }
}
