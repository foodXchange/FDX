import { GoogleGenAI } from "@google/genai";

/**
 * Centralized AI Model Configurations.
 * gemini-3.5-flash-lite is Google's high-quota production Flash-Lite model (up to 1,500 RPD on Free Tier).
 * Automatically falls back across the Free Tier model pool AND backup API key if one reaches its daily quota.
 */
export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

export const GEMINI_FALLBACK_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite-preview",
  "gemini-3-flash-preview",
  "gemini-flash-lite-latest",
];

export const CLAUDE_MODEL = "claude-sonnet-4-5";
export const CLAUDE_HAIKU_MODEL = "claude-haiku-4-5-20251001";

// Sticky index of the last healthy (clientIdx, model) pair so we never waste latency on exhausted models
let stickyClientIdx = 0;
let stickyModelIdx = 0;

/**
 * Calls Gemini generateContent with automatic model pool AND multi-key failover
 * (GEMINI_API_KEY -> GEMINI_API_KEY_2 -> GEMINI_API_KEY_BACKUP) if a single model or project hits a 429 quota limit.
 */
export async function generateGeminiWithFallback(
  ai: GoogleGenAI,
  params: {
    contents: any;
    config?: Record<string, any>;
    preferredModel?: string;
  }
): Promise<{ text: string; modelUsed: string }> {
  const pool = params.preferredModel
    ? [params.preferredModel, ...GEMINI_FALLBACK_MODELS.filter((m) => m !== params.preferredModel)]
    : GEMINI_FALLBACK_MODELS;

  const seenKeys = new Set<string>();
  const clients: GoogleGenAI[] = [ai];
  if (process.env.GEMINI_API_KEY) seenKeys.add(process.env.GEMINI_API_KEY);

  for (const extraKey of [
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GEMINI_API_KEY_BACKUP,
  ]) {
    if (extraKey && !seenKeys.has(extraKey)) {
      seenKeys.add(extraKey);
      clients.push(new GoogleGenAI({ apiKey: extraKey }));
    }
  }

  // Build ordered candidate pairs starting from the sticky healthy pair
  const candidates: Array<{ cIdx: number; mIdx: number }> = [];
  for (let c = 0; c < clients.length; c++) {
    const cIdx = (stickyClientIdx + c) % clients.length;
    for (let m = 0; m < pool.length; m++) {
      const mIdx = c === 0 ? (stickyModelIdx + m) % pool.length : m;
      candidates.push({ cIdx, mIdx });
    }
  }

  let lastError: unknown = null;

  for (const { cIdx, mIdx } of candidates) {
    const client = clients[cIdx];
    const model = pool[mIdx];
    try {
      const response = await client.models.generateContent({
        model,
        contents: params.contents,
        config: params.config,
      });
      stickyClientIdx = cIdx;
      stickyModelIdx = mIdx;
      return {
        text: response.text?.trim() ?? "",
        modelUsed: model,
      };
    } catch (err: any) {
      lastError = err;
      const msg = err?.message || String(err);
      // If 429 quota, 503 high demand, 402 billing, or 404 model unavailable, try next candidate in pool
      if (
        msg.includes("429") ||
        msg.includes("503") ||
        msg.includes("402") ||
        msg.includes("UNAVAILABLE") ||
        msg.includes("RESOURCE_EXHAUSTED") ||
        msg.includes("quota") ||
        msg.includes("404") ||
        msg.includes("NOT_FOUND") ||
        msg.includes("prepayment credits")
      ) {
        continue;
      }
      throw err;
    }
  }

  throw lastError || new Error("All Gemini models and API keys in fallback pool exhausted");
}
