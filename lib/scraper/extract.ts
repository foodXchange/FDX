import Anthropic from "@anthropic-ai/sdk";

export interface ExtractedFactory {
  factory_name: string;
  country: string | null;
  city: string | null;
  is_primary: boolean;
  kosher_types: string[];
  kosher_certifying_body: string | null;
  certifications_quality: string[];
  certifications_dietary: string[];
  brc_grade: string | null;
  ifs_grade: string | null;
  production_capacity: string | null;
}

export interface SupplierProfile {
  company_description: string | null;
  founded_year: number | null;
  employees_range: string | null;
  export_markets: string[];
  production_capacity: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_name: string | null;
  linkedin_url: string | null;
  factories: ExtractedFactory[];
}

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
  needs_review?: boolean;
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

  const isPerplexity = websiteContent.startsWith("[PERPLEXITY RESEARCH]");
  const sourceNote = isPerplexity
    ? `NOTE: This content is from AI research across multiple web sources, not directly ` +
      `from the supplier website. Extract with slightly lower confidence (max 0.8).`
    : `NOTE: This content is directly from the supplier website.`;

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
    `If no products found, return empty array: []\n\n` +
    sourceNote;

  const CONFIDENCE_THRESHOLD = 0.4;
  const REVIEW_THRESHOLD = 0.6;

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

    const filtered = (parsed as ExtractedProduct[]).filter(
      (p) => (p.confidence ?? 0) >= CONFIDENCE_THRESHOLD
    );
    return filtered.map((p) => ({
      ...p,
      needs_review: (p.confidence ?? 0) < REVIEW_THRESHOLD,
    }));
  } catch (err) {
    console.error("Extraction error:", err);
    return [];
  }
}

const EMPTY_PROFILE: SupplierProfile = {
  company_description: null,
  founded_year: null,
  employees_range: null,
  export_markets: [],
  production_capacity: null,
  contact_email: null,
  contact_phone: null,
  contact_name: null,
  linkedin_url: null,
  factories: [],
};

export async function extractSupplierProfile(
  websiteContent: string,
  companyName: string,
  existingData: { country?: string | null; categories?: string[] }
): Promise<SupplierProfile> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  if (!websiteContent || websiteContent.length < 100) {
    return EMPTY_PROFILE;
  }

  const userPrompt =
    `Extract company profile information from this food supplier website.\n\n` +
    `Company: ${companyName}\n` +
    `Country hint: ${existingData.country ?? "Unknown"}\n` +
    `Website content:\n${websiteContent.slice(0, 30000)}\n\n` +
    `Return ONLY this JSON (no other text):\n` +
    `{\n` +
    `  "company_description": "max 300 word description of what they make and their market position",\n` +
    `  "founded_year": number or null,\n` +
    `  "employees_range": "200-500" or "1000+" or null,\n` +
    `  "export_markets": ["EU", "Middle East", "USA"] — only if explicitly stated,\n` +
    `  "production_capacity": "e.g. 2800 tons/day" or null,\n` +
    `  "contact_email": "email@domain.com" or null,\n` +
    `  "contact_phone": "+39 xxx xxx xxxx" or null,\n` +
    `  "contact_name": "First Last" or null,\n` +
    `  "linkedin_url": "https://linkedin.com/..." or null,\n` +
    `  "factories": [\n` +
    `    {\n` +
    `      "factory_name": "Main Plant" or factory name if stated,\n` +
    `      "country": "Italy",\n` +
    `      "city": "Naples" or null,\n` +
    `      "is_primary": true,\n` +
    `      "kosher_types": [] or ["Chief Rabbinate"] or ["Badatz Beit Yosef"] etc,\n` +
    `      "kosher_certifying_body": "OU" or "KSA" or null,\n` +
    `      "certifications_quality": ["BRC","IFS"] — only explicitly stated,\n` +
    `      "certifications_dietary": ["Organic","Halal"] — only explicitly stated,\n` +
    `      "brc_grade": "AA" or "A" or null,\n` +
    `      "ifs_grade": "Higher" or "Foundation" or null,\n` +
    `      "production_capacity": null\n` +
    `    }\n` +
    `  ]\n` +
    `}\n\n` +
    `Kosher detection — look for:\n` +
    `  English: kosher, OU, OK, KF, Star-K\n` +
    `  Hebrew: כשר, כשרות, הכשרה\n` +
    `  Italian: kasher, certificazione kasher\n` +
    `  Spanish: kosher, certificado kosher\n` +
    `  French: casher, certifié casher\n` +
    `  German: koscher, koscherzertifiziert\n` +
    `  Always check footer, about page, certifications page for kosher logos and badges.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1500,
      system:
        "You are a food industry research analyst. Extract structured company information from food supplier websites. Return JSON only. Never invent data — only extract what is explicitly stated on the website.",
      messages: [{ role: "user", content: userPrompt }],
    });

    const raw =
      response.content[0].type === "text"
        ? response.content[0].text.trim()
        : "";

    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return EMPTY_PROFILE;

    const parsed = JSON.parse(match[0]) as Record<string, unknown>;

    const factories: ExtractedFactory[] = Array.isArray(parsed.factories)
      ? (parsed.factories as Record<string, unknown>[]).map((f, i) => ({
          factory_name:
            typeof f.factory_name === "string"
              ? f.factory_name
              : "Main Factory",
          country:
            typeof f.country === "string" ? f.country : existingData.country ?? null,
          city: typeof f.city === "string" ? f.city : null,
          is_primary: i === 0,
          kosher_types: Array.isArray(f.kosher_types)
            ? (f.kosher_types as string[])
            : [],
          kosher_certifying_body:
            typeof f.kosher_certifying_body === "string"
              ? f.kosher_certifying_body
              : null,
          certifications_quality: Array.isArray(f.certifications_quality)
            ? (f.certifications_quality as string[])
            : [],
          certifications_dietary: Array.isArray(f.certifications_dietary)
            ? (f.certifications_dietary as string[])
            : [],
          brc_grade:
            typeof f.brc_grade === "string" ? f.brc_grade : null,
          ifs_grade:
            typeof f.ifs_grade === "string" ? f.ifs_grade : null,
          production_capacity:
            typeof f.production_capacity === "string"
              ? f.production_capacity
              : null,
        }))
      : [];

    return {
      company_description:
        typeof parsed.company_description === "string"
          ? parsed.company_description
          : null,
      founded_year:
        typeof parsed.founded_year === "number" ? parsed.founded_year : null,
      employees_range:
        typeof parsed.employees_range === "string"
          ? parsed.employees_range
          : null,
      export_markets: Array.isArray(parsed.export_markets)
        ? (parsed.export_markets as string[])
        : [],
      production_capacity:
        typeof parsed.production_capacity === "string"
          ? parsed.production_capacity
          : null,
      contact_email:
        typeof parsed.contact_email === "string" ? parsed.contact_email : null,
      contact_phone:
        typeof parsed.contact_phone === "string" ? parsed.contact_phone : null,
      contact_name:
        typeof parsed.contact_name === "string" ? parsed.contact_name : null,
      linkedin_url:
        typeof parsed.linkedin_url === "string" ? parsed.linkedin_url : null,
      factories,
    };
  } catch (err) {
    console.error("Profile extraction error:", err);
    return EMPTY_PROFILE;
  }
}
