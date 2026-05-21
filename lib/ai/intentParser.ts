import Anthropic from "@anthropic-ai/sdk";
import { IntentSchema, EMPTY_INTENT } from "@/lib/ai/intentSchema";
import type { IntentResult } from "@/lib/ai/intentSchema";
import { parseIntent as parseIntentV1 } from "@/lib/matching/heuristicIntentParser";

const TIMEOUT_MS = 8000;

const SYSTEM_PROMPT =
  "You are a food industry sourcing analyst. Extract structured sourcing intent " +
  "from buyer requests. Output ONLY valid JSON matching the schema provided. " +
  "Do not include any explanation, markdown, or code blocks. " +
  "Use null for unknown fields. Use empty arrays [] for unknown arrays. " +
  "Normalize strings to lowercase and trim whitespace. " +
  "Confidence values must be between 0 and 1.";

function buildUserMessage(text: string): string {
  return `Extract the sourcing intent from this buyer request and return JSON only:

Schema:
{
  product: string | null,
  product_family: string | null,
  packaging: string[],
  pack_size_g: number | null,
  pack_size_ml: number | null,
  pack_size_kg: number | null,
  market: "Retail" | "Foodservice" | "Industry" | null,
  private_label: boolean | null,
  certifications: string[],
  kosher: boolean | null,
  temperature: "Ambient" | "Chilled" | "Frozen" | null,
  country_preferences: string[],
  attributes: string[],
  keywords: string[],
  notes: string | null,
  confidence: {
    product: 0..1,
    packaging: 0..1,
    size: 0..1,
    market: 0..1,
    private_label: 0..1,
    certifications: 0..1
  }
}

Buyer request: ${text}`;
}

async function anthropicParser(text: string): Promise<IntentResult> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  async function attempt(): Promise<IntentResult> {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 800,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserMessage(text) }],
    });

    const raw = (response.content[0] as { type: string; text: string }).text.trim();
    const parsed = JSON.parse(raw);
    const validated = IntentSchema.safeParse(parsed);
    if (!validated.success) {
      throw new Error(`Validation failed: ${validated.error.issues[0].message}`);
    }
    return validated.data;
  }

  try {
    return await attempt();
  } catch {
    // retry once
    return await attempt();
  }
}

function mapMarketTerm(term: string | undefined): "Retail" | "Foodservice" | "Industry" | null {
  if (!term) return null;
  const l = term.toLowerCase();
  if (l.includes("retail") || l.includes("supermarket")) return "Retail";
  if (
    l.includes("foodservice") ||
    l.includes("food service") ||
    l.includes("restaurant") ||
    l.includes("catering")
  )
    return "Foodservice";
  if (
    l.includes("industrial") ||
    l.includes("ingredient") ||
    l.includes("b2b") ||
    l.includes("wholesale")
  )
    return "Industry";
  return null;
}

function heuristicFallback(text: string): IntentResult {
  const v1 = parseIntentV1(text);
  return {
    product: v1.keywords[0] ?? null,
    product_family: null,
    packaging: v1.packagingTerms,
    pack_size_g: null,
    pack_size_ml: null,
    pack_size_kg: null,
    market: mapMarketTerm(v1.marketTerms[0]),
    private_label: v1.privateLabel,
    certifications: v1.certTerms,
    kosher: v1.certTerms.includes("kosher"),
    temperature: null,
    country_preferences: [],
    attributes: [],
    keywords: v1.keywords,
    notes: null,
    confidence: {
      product: v1.keywords.length > 0 ? 0.5 : 0,
      packaging: v1.packagingTerms.length > 0 ? 0.5 : 0,
      size: 0,
      market: v1.marketTerms.length > 0 ? 0.5 : 0,
      private_label: v1.privateLabel !== null ? 0.5 : 0,
      certifications: v1.certTerms.length > 0 ? 0.5 : 0,
    },
  };
}

export async function parseIntent(text: string): Promise<IntentResult> {
  const provider = process.env.AI_PROVIDER ?? "none";

  if (provider === "none") {
    return heuristicFallback(text);
  }

  if (provider === "openai") {
    console.warn("AI_PROVIDER=openai but openai package is not installed — falling back to heuristic");
    return heuristicFallback(text);
  }

  if (provider === "anthropic") {
    try {
      const result = await Promise.race([
        anthropicParser(text),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("AI timeout")), TIMEOUT_MS)
        ),
      ]);
      return result;
    } catch (err) {
      console.warn("AI intent parser failed, falling back to heuristic:", err);
      return heuristicFallback(text);
    }
  }

  // Unknown provider — safe fallback
  console.warn(`Unknown AI_PROVIDER="${provider}", falling back to heuristic`);
  return heuristicFallback(text);
}

export { EMPTY_INTENT };
