import { GoogleGenAI } from "@google/genai";
import Anthropic from "@anthropic-ai/sdk";
import { cleanScrapedContent } from "./cleanContent";
import { GEMINI_MODEL, generateGeminiWithFallback } from "@/lib/ai/models";

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
  logo_url?: string | null;
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
  processing_type?: string | null;
  ingredients?: string | null;
  product_type: string | null;
  primary_ingredients: string[];
  private_label: boolean;
  tags: string[];
  markets_suitable: string[];
  confidence: number;
  detected_language?: string;
  needs_review?: boolean;
  image_url?: string | null;
  storage_temp?: string | null;
  source_url?: string | null;
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

function getGeminiClient() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  return new GoogleGenAI({ apiKey: key });
}

function getAnthropicClient() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  return new Anthropic({ apiKey: key });
}

export async function detectManufacturerType(
  websiteContent: string,
  companyName: string
): Promise<ManufacturerDetectionResult> {
  const gemini = getGeminiClient();
  const anthropic = getAnthropicClient();

  const userPrompt =
    `Classify this food company based on their website content.\n\n` +
    `Company: ${companyName}\n` +
    `Website content (first 3000 chars):\n${websiteContent.slice(0, 3000)}\n\n` +
    `Return ONLY this JSON:\n` +
    `{\n` +
    `  "is_manufacturer": true or false,\n` +
    `  "company_type": "manufacturer" | "trading_company" | "agency" | "wholesaler" | "retailer" | "importer" | "mixed" | "unknown" | "non_food",\n` +
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
    `  German: "wir vertreiben", "Importeur", "Handelsvertreter", "Agentur"\n\n` +
    `IMPORTANT — If the website is completely unrelated to food manufacturing, set company_type = "non_food" and is_manufacturer = false:\n` +
    `  - Certification / testing / inspection agency (e.g. SGS, Bureau Veritas, kosher certifying body)\n` +
    `  - Domain for sale, parked page, "Under construction", or placeholder site\n` +
    `  - Casino, gambling, sports betting, or gaming site\n` +
    `  - Logistics, shipping, freight forwarding, or customs broker\n` +
    `  - Packaging manufacturer (cardboard, plastic bags, bottles, labels) — NOT food itself\n` +
    `  - Software, SaaS, ERP, or technology company\n` +
    `  - Marketing, PR, branding, or advertising agency\n` +
    `  - Law firm, legal services, or compliance consultancy\n` +
    `  - Financial services, banking, insurance, or investment firm\n` +
    `Use "non_food" for any site where food manufacturing is clearly not the business.`;

  try {
    let raw = "";

    if (gemini) {
      const { text } = await generateGeminiWithFallback(gemini, {
        contents: userPrompt,
        config: {
          systemInstruction:
            "You classify food companies based on their website content. Return JSON only.",
          responseMimeType: "application/json",
        },
      });
      raw = text;
    } else if (anthropic) {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 200,
        system:
          "You classify food companies based on their website content. Return JSON only.",
        messages: [{ role: "user", content: userPrompt }],
      });
      raw =
        response.content[0].type === "text"
          ? response.content[0].text.trim()
          : "";
    } else {
      throw new Error("Neither GEMINI_API_KEY nor ANTHROPIC_API_KEY is configured");
    }

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

let extractionDebugLogged = false;

function safeParseProducts(raw: string): unknown[] {
  const trimmed = raw.trim();

  // Try direct parse first, even if there is surrounding text.
  try {
    const match = trimmed.match(/\[[\s\S]*\]/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}

  // Try to parse an array-like response with single-quoted strings or trailing commas.
  try {
    const arrayLike = trimmed
      .replace(/\r\n/g, "\n")
      .replace(/,\s*\]/g, "]")
      .replace(/,\s*\}/g, "}");
    const match = arrayLike.match(/\[[\s\S]*\]/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}

  // Try to extract partial valid JSON by finding complete product objects.
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const objects: any[] = [];
    const regex = /\{[^{}]*"product_name"[^{}]*\}/g;
    const matches = trimmed.match(regex) ?? [];
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
    certifications?: string[];
  }
): Promise<ExtractedProduct[]> {
  const gemini = getGeminiClient();
  const anthropic = getAnthropicClient();

  if (!websiteContent || websiteContent.length < 100) {
    return [];
  }

  const isPerplexity = websiteContent.startsWith("[PERPLEXITY RESEARCH]");
  const sourceNote = isPerplexity
    ? `NOTE: This content is from AI research across multiple web sources, not directly ` +
      `from the supplier website. Extract with slightly lower confidence (max 0.8).`
    : `NOTE: This content is directly from the supplier website.`;

  const cleaned = cleanScrapedContent(websiteContent, 22000);

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
    `Known certifications: ${(supplier.certifications ?? []).join(", ") || "None stated"}\n\n` +
    `Website content:\n${cleaned}\n\n` +
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
    `    "processing_type": "canned | dried | frozen | smoked | fresh | vacuum | ambient | other — or null",\n` +
    `    "ingredients": "comma-separated main ingredients in English or null",\n` +
    `    "product_type": "pure_ingredient or processed_food or semi_processed or mixed",\n` +
    `    "primary_ingredients": ["main ingredient"],\n` +
    `    "private_label": true,\n` +
    `    "tags": ["tag1", "tag2"],\n` +
    `    "markets_suitable": ["Retail", "Foodservice", "Industry"],\n` +
    `    "confidence": 0.7,\n` +
    `    "detected_language": "english" or "italian" or "spanish" or "french" or "german" or "polish" or "other",\n` +
    `    "image_url": "direct product photo URL from markdown ![alt](url) if clearly corresponding to this product (NOT a logo, icon, or flag), or null"\n` +
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
    let raw = "";

    if (gemini) {
      const { text } = await generateGeminiWithFallback(gemini, {
        contents: userPrompt,
        config: {
          systemInstruction: EXTRACT_SYSTEM_PROMPT,
          responseMimeType: "application/json",
        },
      });
      raw = text;
    } else if (anthropic) {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 3000,
        system: EXTRACT_SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      });
      raw = response.content
        .filter((item) => item.type === "text")
        .map((item) => ("text" in item ? item.text : ""))
        .join("")
        .trim();
    } else {
      throw new Error("Neither GEMINI_API_KEY nor ANTHROPIC_API_KEY is configured");
    }

    const parsed = safeParseProducts(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      if (!extractionDebugLogged) {
        extractionDebugLogged = true;
        console.error("EXTRACT_PRODUCTS_RAW_RESPONSE: first failed extraction raw text below");
        console.error(raw || "<empty response>");
        console.error("EXTRACT_PRODUCTS_RAW_LENGTH:", raw.length);
        console.error("EXTRACT_PRODUCTS_PROMPT_LENGTH:", userPrompt.length);
      }
      return [];
    }

    const filtered = (parsed as ExtractedProduct[]).filter(
      (p) => (p.confidence ?? 0) >= CONFIDENCE_THRESHOLD
    );
    return filtered.map((p) => ({
      ...p,
      needs_review: (p.confidence ?? 0) < REVIEW_THRESHOLD,
    }));
  } catch (err) {
    console.error("Extraction error:", err);
    throw err;
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
  logo_url: null,
  factories: [],
};

export async function extractSupplierProfile(
  websiteContent: string,
  companyName: string,
  existingData: { country?: string | null; categories?: string[] }
): Promise<SupplierProfile> {
  const gemini = getGeminiClient();
  const anthropic = getAnthropicClient();

  if (!websiteContent || websiteContent.length < 100) {
    return EMPTY_PROFILE;
  }

  const cleaned = cleanScrapedContent(websiteContent, 16000);

  const userPrompt =
    `Extract company profile information from this food supplier website.\n\n` +
    `Company: ${companyName}\n` +
    `Country hint: ${existingData.country ?? "Unknown"}\n` +
    `Website content:\n${cleaned}\n\n` +
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
    `  "logo_url": "direct image URL of the company brand logo if found in markdown or OG_IMAGE, or null",\n` +
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
    let raw = "";

    if (gemini) {
      const { text } = await generateGeminiWithFallback(gemini, {
        contents: userPrompt,
        config: {
          systemInstruction:
            "You are a food industry research analyst. Extract structured company information from food supplier websites. Return JSON only. Never invent data — only extract what is explicitly stated on the website.",
          responseMimeType: "application/json",
        },
      });
      raw = text;
    } else if (anthropic) {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 1500,
        system:
          "You are a food industry research analyst. Extract structured company information from food supplier websites. Return JSON only. Never invent data — only extract what is explicitly stated on the website.",
        messages: [{ role: "user", content: userPrompt }],
      });
      raw =
        response.content[0].type === "text"
          ? response.content[0].text.trim()
          : "";
    } else {
      throw new Error("Neither GEMINI_API_KEY nor ANTHROPIC_API_KEY is configured");
    }

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
      logo_url:
        typeof parsed.logo_url === "string" ? parsed.logo_url : null,
      factories,
    };
  } catch (err) {
    console.error("Profile extraction error:", err);
    return EMPTY_PROFILE;
  }
}

/**
 * Unified single-pass extraction of both products and company profile/factories.
 * This cuts LLM calls by 50% while improving cross-context accuracy (e.g. Kosher logos in footer matched to products).
 */
export async function extractSupplierFull(
  websiteContent: string,
  supplier: {
    company_name: string;
    country_of_origin: string | null;
    certifications?: string[];
    categories?: string[];
  }
): Promise<{ products: ExtractedProduct[]; profile: SupplierProfile }> {
  if (!websiteContent || websiteContent.length < 100) {
    return { products: [], profile: EMPTY_PROFILE };
  }

  const cleaned = cleanScrapedContent(websiteContent, 22000);

  const isPerplexity = websiteContent.startsWith("[PERPLEXITY RESEARCH]");
  const sourceNote = isPerplexity
    ? "NOTE: Content is from AI web research across sources. Extract with max confidence 0.8."
    : "NOTE: Content is directly from the supplier website.";

  const prompt =
    `You are a senior food industry data specialist. Extract structured company profile and all products from this website.\n\n` +
    `Company: ${supplier.company_name}\n` +
    `Country: ${supplier.country_of_origin ?? "Unknown"}\n` +
    `Known certifications: ${(supplier.certifications ?? []).join(", ") || "None stated"}\n` +
    `${sourceNote}\n\n` +
    `IMPORTANT FOR B2B FOOD MANUFACTURERS & MULTILINGUAL SITES:\n` +
    `- Many B2B food manufacturers describe their product lines, bulk ingredients, or product families (e.g., "Private Label Crackers", "Extruded Corn Snacks", "Organic Extra Virgin Olive Oil", "IQF Frozen Berries") rather than individual retail SKU names.\n` +
    `- If individual SKUs are not listed, ALWAYS extract each food product line, category offering, or bulk food product mentioned on the website as an entry in the "products" array.\n` +
    `- Read content in ANY language (Italian, Spanish, French, German, Dutch, Polish, Latvian, Turkish, Greek, etc.) and translate all extracted text fields into English (keep brand names as written).\n` +
    `- IMAGE MATCHING: Look carefully for markdown images ![alt](url) near each product section. Even if the image filename or alt text is in Italian/Spanish/French/German, match the direct photo URL to "image_url" (exclude logos, flags, or icons). For "logo_url", pick the company's main brand logo URL or OG_IMAGE if it represents the brand.\n` +
    `- CERTIFICATIONS & KOSHER: Scan headers, footers, and quality sections for BRC (and grade AA/A), IFS, ISO 22000, FSSC 22000, HACCP, Organic (Bio/Biologico/Ecológico), Halal, Gluten-Free, Vegan, and Kosher (OU, OK, Star-K, KF, Badatz, Rabbinate, Kasher, Casher, כשר). Propagate factory-wide certifications to the products manufactured there.\n` +
    `- PACKAGING & SPECS: Extract all packaging formats (Bottle, Jar, Can, Tin, Pouch, Bag, Carton, Bulk Drum, IBC, HoReCa) and sizes/weights (e.g., 250ml, 400g, 5kg, 200L) mentioned in titles or text.\n\n` +
    `Website Content:\n${cleaned}\n\n` +
    `Return ONLY a JSON object with this exact structure:\n` +
    `{\n` +
    `  "profile": {\n` +
    `    "company_description": "concise description of production activities, specialties, and B2B/private-label capabilities",\n` +
    `    "founded_year": number or null,\n` +
    `    "employees_range": "e.g. 50-200" or null,\n` +
    `    "export_markets": ["EU", "Middle East", "USA", "Asia"],\n` +
    `    "production_capacity": "e.g. 5,000 tons/year or 20,000 bottles/day if stated, or null",\n` +
    `    "contact_email": "export or general email@domain.com if found, or null",\n` +
    `    "contact_phone": "+xx xxx xxx xxxx if found, or null",\n` +
    `    "contact_name": "contact person name if stated, or null",\n` +
    `    "linkedin_url": "https://www.linkedin.com/company/... if found in content, or null",\n` +
    `    "logo_url": "direct image URL of the company brand logo from markdown ![logo](url) or OG_IMAGE, or null",\n` +
    `    "factories": [\n` +
    `      {\n` +
    `        "factory_name": "Main Plant or stated facility name",\n` +
    `        "country": "${supplier.country_of_origin ?? "Unknown"}",\n` +
    `        "city": "city/region name if stated in address/footer, or null",\n` +
    `        "is_primary": true,\n` +
    `        "kosher_types": ["Chief Rabbinate", "Badatz Beit Yosef", "OU", "OK", "Star-K", "KF"] or [],\n` +
    `        "kosher_certifying_body": "OU | OK | Star-K | KF | Badatz | Rabbinate or null",\n` +
    `        "certifications_quality": ["BRC", "IFS", "ISO 22000", "FSSC 22000", "HACCP"],\n` +
    `        "certifications_dietary": ["Organic", "Halal", "Vegan", "Gluten-Free", "Kosher", "PDO", "PGI"],\n` +
    `        "brc_grade": "AA+ | AA | A | B if stated, or null",\n` +
    `        "ifs_grade": "Higher Level | Foundation if stated, or null",\n` +
    `        "production_capacity": "stated plant output or null"\n` +
    `      }\n` +
    `    ]\n` +
    `  },\n` +
    `  "products": [\n` +
    `    {\n` +
    `      "product_name": "specific product name in English",\n` +
    `      "category": "one of: Tomato Products | Pasta & Grains | Snacks | Dairy | Beverages | Sauces & Condiments | Canned Foods | Frozen Foods | Oils & Fats | Fish & Seafood | Bakery | Spices & Herbs | Meat & Poultry | Pulses & Legumes | Organic & Natural | Ingredients & Additives | Other",\n` +
    `      "subcategory": "specific subcategory (e.g. Extra Virgin Olive Oil, Canned Tuna, Durum Wheat Pasta) or null",\n` +
    `      "description": "1-2 sentence factual description including key characteristics and B2B/retail suitability",\n` +
    `      "formats": ["Bottle 500ml", "Jar 350g", "Bag 1kg", "Tin 400g", "Bulk Foodservice 5kg"],\n` +
    `      "sizes": ["500ml", "350g", "1kg"],\n` +
    `      "brix_level": "e.g. 28-30° (if stated for tomato/fruit/syrup products) or null",\n` +
    `      "shelf_life_months": "number of months if stated (e.g. 12, 18, 24, 36) or null",\n` +
    `      "storage_temp": "ambient | chilled | frozen (infer from product & processing_type: e.g. frozen foods -> frozen, fresh dairy/meat -> chilled, canned/dry/oil/snacks -> ambient)",\n` +
    `      "certifications": ["BRC", "IFS", "Kosher", "Organic", "Halal", "Gluten-Free", "PDO", "PGI"],\n` +
    `      "kosher_types": ["OU", "OK", "Badatz", "Chief Rabbinate"] or [],\n` +
    `      "processing_type": "canned | dried | frozen | smoked | fresh | vacuum | ambient | other",\n` +
    `      "ingredients": "comma-separated main ingredients in English",\n` +
    `      "product_type": "pure_ingredient | processed_food | semi_processed",\n` +
    `      "primary_ingredients": ["ingredient1", "ingredient2"],\n` +
    `      "private_label": true or false,\n` +
    `      "tags": ["tag1", "tag2", "tag3"],\n` +
    `      "markets_suitable": ["Retail", "Foodservice", "Industry"],\n` +
    `      "confidence": 0.85,\n` +
    `      "detected_language": "english | italian | spanish | french | german | polish | greek | other",\n` +
    `      "source_url": "specific URL from the 'URL: https://...' section where this product appears, or null",\n` +
    `      "image_url": "direct product photo URL from markdown ![alt](url) corresponding to this product (NOT a logo, icon, or flag), or null"\n` +
    `    }\n` +
    `  ]\n` +
    `}`;

  const gemini = getGeminiClient();
  const anthropic = getAnthropicClient();

  let raw = "";
  if (gemini) {
    try {
      const { text } = await generateGeminiWithFallback(gemini, {
        contents: prompt,
        config: {
          systemInstruction: "Extract structured B2B food products and company profile. Output JSON only.",
          responseMimeType: "application/json",
        },
      });
      raw = text;
    } catch (e: any) {
      const msg = e?.message || String(e);
      if (
        msg.includes("402") ||
        msg.includes("RESOURCE_EXHAUSTED") ||
        msg.includes("prepayment credits are depleted")
      ) {
        throw new Error("Google AI Studio prepayment credits depleted (HTTP 402 RESOURCE_EXHAUSTED). Please top up balance at https://ai.studio/projects.");
      }
      if (anthropic && process.env.AI_PROVIDER === "anthropic") {
        const resp = await anthropic.messages.create({
          model: "claude-sonnet-4-5",
          max_tokens: 3500,
          system: "Extract structured B2B food products and company profile. Output JSON only.",
          messages: [{ role: "user", content: prompt }],
        });
        raw = resp.content.filter((c) => c.type === "text").map((c) => ("text" in c ? c.text : "")).join("");
      } else {
        throw e;
      }
    }
  } else if (anthropic && process.env.AI_PROVIDER === "anthropic") {
    const resp = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 3500,
      system: "Extract structured B2B food products and company profile. Output JSON only.",
      messages: [{ role: "user", content: prompt }],
    });
    raw = resp.content.filter((c) => c.type === "text").map((c) => ("text" in c ? c.text : "")).join("");
  } else {
    throw new Error("GEMINI_API_KEY is not configured or available");
  }

  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return { products: [], profile: EMPTY_PROFILE };
    const parsed = JSON.parse(match[0]) as {
      profile?: Record<string, unknown>;
      products?: ExtractedProduct[];
    };

    const parsedProducts = Array.isArray(parsed.products) ? parsed.products : [];
    const p = parsed.profile ?? {};

    const factories: ExtractedFactory[] = Array.isArray(p.factories)
      ? (p.factories as Record<string, unknown>[]).map((f, i) => ({
          factory_name: typeof f.factory_name === "string" ? f.factory_name : "Main Factory",
          country: typeof f.country === "string" ? f.country : supplier.country_of_origin ?? null,
          city: typeof f.city === "string" ? f.city : null,
          is_primary: i === 0,
          kosher_types: Array.isArray(f.kosher_types) ? (f.kosher_types as string[]) : [],
          kosher_certifying_body: typeof f.kosher_certifying_body === "string" ? f.kosher_certifying_body : null,
          certifications_quality: Array.isArray(f.certifications_quality) ? (f.certifications_quality as string[]) : [],
          certifications_dietary: Array.isArray(f.certifications_dietary) ? (f.certifications_dietary as string[]) : [],
          brc_grade: typeof f.brc_grade === "string" ? f.brc_grade : null,
          ifs_grade: typeof f.ifs_grade === "string" ? f.ifs_grade : null,
          production_capacity: typeof f.production_capacity === "string" ? f.production_capacity : null,
        }))
      : [];

    const profile: SupplierProfile = {
      company_description: typeof p.company_description === "string" ? p.company_description : null,
      founded_year: typeof p.founded_year === "number" ? p.founded_year : null,
      employees_range: typeof p.employees_range === "string" ? p.employees_range : null,
      export_markets: Array.isArray(p.export_markets) ? (p.export_markets as string[]) : [],
      production_capacity: typeof p.production_capacity === "string" ? p.production_capacity : null,
      contact_email: typeof p.contact_email === "string" ? p.contact_email : null,
      contact_phone: typeof p.contact_phone === "string" ? p.contact_phone : null,
      contact_name: typeof p.contact_name === "string" ? p.contact_name : null,
      linkedin_url: typeof p.linkedin_url === "string" ? p.linkedin_url : null,
      logo_url: typeof p.logo_url === "string" ? p.logo_url : null,
      factories,
    };

    return { products: parsedProducts, profile };
  } catch (err) {
    console.error("Unified extraction parse error:", err);
    return { products: [], profile: EMPTY_PROFILE };
  }
}

