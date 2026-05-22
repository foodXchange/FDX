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

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function extractProducts(
  websiteContent: string,
  supplier: {
    company_name: string;
    country_of_origin: string | null;
    certifications: string[];
  }
): Promise<ExtractedProduct[]> {
  if (!websiteContent || websiteContent.length < 100) {
    return [];
  }

  const userPrompt =
    `Extract all food products from this supplier website content.\n\n` +
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
    `    "confidence": 0.7\n` +
    `  }\n` +
    `]\n\n` +
    `Extract between 1 and 20 products. If no products found, return empty array: []`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system: EXTRACT_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const raw =
      response.content[0].type === "text"
        ? response.content[0].text.trim()
        : "";

    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const parsed: unknown = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) return [];

    return parsed as ExtractedProduct[];
  } catch (err) {
    console.error("Extraction error:", err);
    return [];
  }
}
