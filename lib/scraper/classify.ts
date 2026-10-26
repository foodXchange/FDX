import { GoogleGenAI } from "@google/genai";
import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { GEMINI_MODEL, generateGeminiWithFallback } from "../ai/models";
import {
  BUYER_ROLES,
  isBusinessRole,
  isSector,
  normalizeCategory,
  taxonomyPromptBlock,
  type BusinessRole,
  type Sector,
} from "../taxonomy/companyTaxonomy";

/**
 * What the scraper should do with a company after classification:
 *  - food_pipeline: food/ingredient producer → full product + factory extraction (existing flow)
 *  - profiled:      anyone else useful (packaging, freight, retailers, agencies…) → save profile only
 *  - invalid:       parked domain, dead site, spam → nothing worth keeping
 */
export type ClassificationRoute = "food_pipeline" | "profiled" | "invalid";

export interface CompanyClassification {
  route: ClassificationRoute;
  sector: Sector;
  businessRole: BusinessRole | null;
  category: string | null;
  tags: string[];
  capabilities: string[];
  offeringsSummary: string | null;
  companyDescription: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  isPotentialBuyer: boolean;
  makesFoodProducts: boolean;
  reason: string;
  confidence: number;
  /** True when the AI call failed and we fell back to the safe default. */
  failed: boolean;
}

/** Below this confidence we never discard — the company goes through the food pipeline. */
const MIN_CONFIDENCE_TO_DIVERT = 0.4;
/** Below this confidence a profiled/invalid result is flagged for manual review. */
export const REVIEW_CONFIDENCE = 0.6;

const SYSTEM_PROMPT =
  "You classify companies for a B2B food-trade sourcing platform that also serves buyers' " +
  "non-food needs (packaging, freight, equipment, services). Return JSON only.";

function buildPrompt(companyName: string, evidenceLabel: string, evidence: string): string {
  return (
    `Classify this company.\n\nCompany: ${companyName}\n${evidenceLabel}:\n${evidence}\n\n` +
    `${taxonomyPromptBlock()}\n\n` +
    `Return ONLY this JSON:\n{\n` +
    `  "site_status": "active" | "parked_or_dead" | "spam",\n` +
    `  "sector": one SECTOR key from the list,\n` +
    `  "business_role": one BUSINESS ROLE from the list,\n` +
    `  "category": one CATEGORY from the chosen sector's list (exact text),\n` +
    `  "tags": up to 8 short specific keywords (products, materials, services, e.g. "amber glass jars", "reefer containers", "durum wheat pasta"),\n` +
    `  "makes_food_products": true or false,\n` +
    `  "is_potential_buyer": true or false,\n` +
    `  "offerings_summary": "1-2 concrete sentences on what they sell or do; include sizes/specs/routes if stated",\n` +
    `  "capabilities": up to 8 short items (e.g. "private label", "export to Middle East", "custom moulding", "port clearance Israel"),\n` +
    `  "company_description": "one neutral sentence" or null,\n` +
    `  "contact_email": string or null,\n` +
    `  "contact_phone": string or null,\n` +
    `  "reason": "one sentence explaining the classification",\n` +
    `  "confidence": 0.0 to 1.0\n}\n\n` +
    `Rules:\n` +
    `- makes_food_products = true ONLY if the company itself produces food, beverage or food-ingredient products ` +
    `in its own or contracted factory/farm — including companies that both produce AND distribute. ` +
    `Signs: "our factory", "we produce", "production facility", "il nostro stabilimento", "produciamo", ` +
    `"nuestra fábrica", "producimos", "notre usine", "wir produzieren", "zakład produkcyjny".\n` +
    `- Distributors, importers, agents and brand portfolios ("we distribute", "we import", "distribuiamo", ` +
    `"importamos", "exclusive agent") are NOT food producers → makes_food_products = false, role importer/distributor/trader.\n` +
    `- A packaging, machinery, tableware or software maker is a "manufacturer" role in its own sector, not food_beverage.\n` +
    `- is_potential_buyer = true for supermarkets, retail chains, wholesalers, cash & carry, importers and distributors of food.\n` +
    `- site_status "parked_or_dead" for domain-for-sale, parked, under construction or empty placeholder pages; ` +
    `"spam" for gambling, adult or scam sites. Otherwise "active" (even if unrelated to food — use sector "other").\n` +
    `- Never invent contacts; only return emails/phones literally present in the text.`
  );
}

function getGemini() {
  const key = process.env.GEMINI_API_KEY;
  return key ? new GoogleGenAI({ apiKey: key }) : null;
}

function getAnthropic() {
  const key = process.env.ANTHROPIC_API_KEY;
  return key ? new Anthropic({ apiKey: key }) : null;
}

async function callPerplexity(prompt: string): Promise<string> {
  const key = process.env.PERPLEXITY_API_KEY;
  if (!key) throw new Error("PERPLEXITY_API_KEY is not configured");

  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "sonar",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      temperature: 0.1,
    }),
  });

  if (!res.ok) {
    throw new Error(`Perplexity API error ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

async function callModel(prompt: string): Promise<string> {
  const gemini = getGemini();
  const anthropic = getAnthropic();

  if (gemini) {
    try {
      const { text } = await generateGeminiWithFallback(gemini, {
        contents: prompt,
        config: { systemInstruction: SYSTEM_PROMPT, responseMimeType: "application/json" },
      });
      return text;
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (
        msg.includes("402") ||
        msg.includes("RESOURCE_EXHAUSTED") ||
        msg.includes("prepayment credits are depleted")
      ) {
        throw new Error("Google AI Studio prepayment credits depleted (HTTP 402 RESOURCE_EXHAUSTED). Please top up balance at https://ai.studio/projects.");
      }
      // If other error, only fall through if another provider is explicitly configured
    }
  }

  if (anthropic && process.env.AI_PROVIDER === "anthropic") {
    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 700,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: prompt }],
      });
      return response.content[0].type === "text" ? response.content[0].text.trim() : "";
    } catch {
      // Fall through to Perplexity
    }
  }

  if (process.env.PERPLEXITY_API_KEY && process.env.AI_PROVIDER === "perplexity") {
    return await callPerplexity(prompt);
  }

  throw new Error("GEMINI_API_KEY call failed or quota exhausted");
}

function strList(v: unknown, max: number): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .map((x) => x.trim().slice(0, 80))
    .slice(0, max);
}

function strOrNull(v: unknown, max = 600): string | null {
  return typeof v === "string" && v.trim() && v.trim().toLowerCase() !== "null"
    ? v.trim().slice(0, max)
    : null;
}

/** Safe default when the AI fails: behave exactly like the old detector (don't discard). */
function fallback(reason: string): CompanyClassification {
  return {
    route: "food_pipeline",
    sector: "food_beverage",
    businessRole: null,
    category: null,
    tags: [],
    capabilities: [],
    offeringsSummary: null,
    companyDescription: null,
    contactEmail: null,
    contactPhone: null,
    isPotentialBuyer: false,
    makesFoodProducts: true,
    reason,
    confidence: 0,
    failed: true,
  };
}

function parseClassification(raw: string): CompanyClassification {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON in classifier response");
  const p = JSON.parse(match[0]) as Record<string, unknown>;

  const sector: Sector = isSector(p.sector) ? p.sector : "other";
  const businessRole = isBusinessRole(p.business_role) ? p.business_role : null;
  const confidence =
    typeof p.confidence === "number" ? Math.max(0, Math.min(1, p.confidence)) : 0.5;
  const makesFoodProducts = p.makes_food_products === true;
  const siteStatus = typeof p.site_status === "string" ? p.site_status : "active";

  let route: ClassificationRoute;
  if (confidence < MIN_CONFIDENCE_TO_DIVERT) route = "food_pipeline"; // unsure → keep old behaviour
  else if (siteStatus === "parked_or_dead" || siteStatus === "spam") route = "invalid";
  else if (makesFoodProducts) route = "food_pipeline";
  else route = "profiled";

  return {
    route,
    sector,
    businessRole,
    category: normalizeCategory(sector, p.category),
    tags: strList(p.tags, 8),
    capabilities: strList(p.capabilities, 8),
    offeringsSummary: strOrNull(p.offerings_summary),
    companyDescription: strOrNull(p.company_description),
    contactEmail: strOrNull(p.contact_email, 200),
    contactPhone: strOrNull(p.contact_phone, 60),
    isPotentialBuyer:
      p.is_potential_buyer === true || (businessRole !== null && BUYER_ROLES.includes(businessRole)),
    makesFoodProducts,
    reason: strOrNull(p.reason, 400) ?? "",
    confidence,
    failed: false,
  };
}

/** Classify from crawled website content (replaces detectManufacturerType — still one AI call). */
export async function classifyCompany(
  websiteContent: string,
  companyName: string
): Promise<CompanyClassification> {
  try {
    const raw = await callModel(
      buildPrompt(companyName, "Website content (excerpt)", websiteContent.slice(0, 6000))
    );
    return parseClassification(raw);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (
      msg.includes("402") ||
      msg.includes("RESOURCE_EXHAUSTED") ||
      msg.includes("prepayment credits are depleted") ||
      msg.includes("organization_on_hold")
    ) {
      throw err;
    }
    return fallback(`classification failed: ${msg}`);
  }
}

/**
 * Cheap re-classification without crawling — uses only name, domain and the saved reason
 * from a previous scrape. Used to backfill companies that were skipped before this existed.
 */
export async function classifyFromSummary(input: {
  companyName: string;
  website: string | null;
  country: string | null;
  priorType: string | null;
  priorReason: string | null;
}): Promise<CompanyClassification> {
  const evidence =
    `Website: ${input.website ?? "unknown"}\nCountry: ${input.country ?? "unknown"}\n` +
    `Previous automated assessment: type=${input.priorType ?? "unknown"}; ` +
    `${input.priorReason ?? "no reason saved"}\n` +
    `(No website text available — classify from this summary; contacts must be null.)`;
  try {
    const raw = await callModel(buildPrompt(input.companyName, "Evidence", evidence));
    const c = parseClassification(raw);
    // This path is only used for already-skipped companies — never send them to the food pipeline.
    if (c.route === "food_pipeline") c.route = "profiled";
    c.contactEmail = null;
    c.contactPhone = null;
    return c;
  } catch (err) {
    console.error(`classifyFromSummary(${input.companyName}) error:`, err);
    const c = fallback(`backfill classification failed: ${err instanceof Error ? err.message : String(err)}`);
    c.route = "profiled";
    c.sector = "other";
    return c;
  }
}

/** One-line human summary for scraper logs. */
export function describeClassification(c: CompanyClassification): string {
  const parts = [c.sector, c.businessRole ?? "unknown role", c.category].filter(Boolean);
  return `${parts.join(" · ")}${c.isPotentialBuyer ? " · potential buyer" : ""}`;
}

/**
 * Persist classification fields. Non-fatal: if the migration hasn't been applied yet,
 * the scrape continues and a warning is logged.
 */
export async function saveClassification(
  db: SupabaseClient,
  supplierId: string,
  c: CompanyClassification,
  source: "crawl" | "backfill_summary"
): Promise<{ ok: boolean; error?: string }> {
  const updates: Record<string, unknown> = {
    sector: c.sector,
    business_role: c.businessRole,
    taxonomy_category: c.category,
    taxonomy_tags: c.tags,
    capabilities: c.capabilities,
    offerings_summary: c.offeringsSummary,
    is_potential_buyer: c.isPotentialBuyer,
    classification_route: c.route,
    classification_confidence: c.confidence,
    classification_reason: c.reason,
    classification_source: source,
    needs_classification_review: c.failed || (c.route !== "food_pipeline" && c.confidence < REVIEW_CONFIDENCE),
    classified_at: new Date().toISOString(),
  };

  // For non-food-pipeline companies, also fill basic profile fields if they are empty.
  // (Food-pipeline companies get these from extractSupplierProfile later.)
  if (c.route === "profiled") {
    const { data: current } = await db
      .from("supplier_offerings")
      .select("product_description, contact_email, contact_phone")
      .eq("id", supplierId)
      .single();
    const desc = c.offeringsSummary ?? c.companyDescription;
    if (desc && !current?.product_description) updates.product_description = desc;
    if (c.contactEmail && !current?.contact_email) updates.contact_email = c.contactEmail;
    if (c.contactPhone && !current?.contact_phone) updates.contact_phone = c.contactPhone;
  }

  const { error } = await db.from("supplier_offerings").update(updates).eq("id", supplierId);
  if (error) {
    console.warn(`saveClassification(${supplierId}) failed — is migration 20260622 applied? ${error.message}`);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

const SNAPSHOT_MAX_CHARS = 15_000;

/** Cache crawled content so future re-classification never needs a re-crawl. Non-fatal. */
export async function saveCrawlSnapshot(
  db: SupabaseClient,
  supplierId: string,
  content: string,
  sourceUrl: string | null,
  source: "firecrawl" | "search_grounding" | "perplexity"
): Promise<void> {
  if (!content || content.length < 50) return;
  const trimmed = content.slice(0, SNAPSHOT_MAX_CHARS);
  const { error } = await db.from("crawl_snapshots").upsert(
    {
      supplier_id: supplierId,
      source_url: sourceUrl,
      source,
      content: trimmed,
      content_chars: trimmed.length,
      created_at: new Date().toISOString(),
    },
    { onConflict: "supplier_id" }
  );
  if (error) console.warn(`saveCrawlSnapshot(${supplierId}) failed: ${error.message}`);
}
