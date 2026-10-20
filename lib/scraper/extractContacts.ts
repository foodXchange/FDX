import { GoogleGenAI } from "@google/genai";
import Anthropic from "@anthropic-ai/sdk";
import type { ContactPage } from "./firecrawlPipeline";
import { GEMINI_MODEL } from "@/lib/ai/models";

export interface ExtractedContact {
  name?: string | null;
  role?: string | null;
  email?: string | null;
  phone?: string | null;
  linkedin_url?: string | null;
  source_url?: string;
  raw_context?: string | null;
  contact_type?: "export_manager" | "sales" | "technical" | "commercial" | "general" | null;
}

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

async function extractFromPage(
  websiteContent: string,
  sourceUrl: string
): Promise<ExtractedContact[]> {
  const gemini = getGeminiClient();
  const anthropic = getAnthropicClient();

  const userPrompt =
    `Extract all real business contacts from this supplier contact/about/team page.\n\n` +
    `CRITICAL RULES:\n` +
    `- Extract ONLY contacts explicitly stated on the page\n` +
    `- NEVER invent emails. Only include emails literally present in the text.\n` +
    `- NEVER guess or pattern-match emails (no firstname@domain fabrication)\n` +
    `- Prefer export, sales, commercial, technical contacts but include all business roles\n` +
    `- Multi-language: parse any language (Italian, Spanish, French, German, Polish, Greek, Turkish, Dutch, Portuguese, Croatian, Czech, Romanian)\n` +
    `- Output role/title in English where possible; keep names as written\n` +
    `- Include raw_context: a 1-2 sentence snippet showing where this contact info came from\n` +
    `- If a field is not present on the page, return null for that field\n\n` +
    `Page content (from ${sourceUrl}):\n${websiteContent.slice(0, 50000)}\n\n` +
    `Return ONLY this JSON array — no other text. If no contacts found, return []:\n` +
    `[\n` +
    `  {\n` +
    `    "name": "full name or null",\n` +
    `    "role": "job title or null",\n` +
    `    "email": "email@example.com or null",\n` +
    `    "phone": "+1-234-567-8900 or null",\n` +
    `    "linkedin_url": "https://linkedin.com/in/... or null",\n` +
    `    "contact_type": "export_manager" | "sales" | "technical" | "commercial" | "general",\n` +
    `    "raw_context": "1-2 sentence snippet from the page showing this contact"\n` +
    `  }\n` +
    `]\n`;

  try {
    let raw = "";

    if (gemini) {
      const response = await gemini.models.generateContent({
        model: GEMINI_MODEL,
        contents: userPrompt,
        config: {
          systemInstruction:
            "You are a business contact extraction expert. Extract real contacts from supplier website content. Output JSON only. Never fabricate contact information. Only include contacts and details explicitly stated on the page.",
          responseMimeType: "application/json",
        },
      });
      raw = response.text?.trim() ?? "";
    } else if (anthropic) {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 2000,
        system:
          "You are a business contact extraction expert. Extract real contacts from supplier website content. " +
          "Output JSON only. Never fabricate contact information. Only include contacts and details explicitly stated on the page.",
        messages: [
          {
            role: "user",
            content: userPrompt,
          },
        ],
      });
      raw =
        response.content[0].type === "text"
          ? response.content[0].text.trim()
          : "";
    } else {
      throw new Error("Neither GEMINI_API_KEY nor ANTHROPIC_API_KEY is configured");
    }

    // Try to extract JSON array
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) return [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let parsed: any[] = [];
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      return [];
    }

    if (!Array.isArray(parsed)) return [];

    // Map and validate
    const contacts: ExtractedContact[] = parsed
      .filter((item) => item && typeof item === "object")
      .map((item) => ({
        name: item.name ?? null,
        role: item.role ?? null,
        email: item.email ?? null,
        phone: item.phone ?? null,
        linkedin_url: item.linkedin_url ?? null,
        source_url: sourceUrl,
        raw_context: item.raw_context ?? null,
        contact_type: item.contact_type ?? null,
      }));

    return contacts;
  } catch (err) {
    console.warn("Contact extraction failed:", err);
    return [];
  }
}

export async function extractSupplierContacts(
  contactPages: ContactPage[]
): Promise<ExtractedContact[]> {
  const all: ExtractedContact[] = [];
  for (const page of contactPages) {
    if (!page.markdown || page.markdown.length < 50) continue;
    const found = await extractFromPage(page.markdown, page.source_url);
    all.push(...found);
  }
  return all;
}

export default { extractSupplierContacts };
