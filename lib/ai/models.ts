import type { GoogleGenAI } from "@google/genai";

/**
 * Centralized AI Model Configurations.
 * gemini-3.5-flash-lite is Google's high-quota production Flash-Lite model (up to 1,500 RPD on Free Tier).
 * Automatically falls back across the Free Tier pool if one model reaches its daily quota.
 */
export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite-preview";

export const GEMINI_FALLBACK_MODELS = [
  "gemini-3.1-flash-lite-preview",
  "gemini-3.1-flash-lite",
  "gemini-3-flash-preview",
  "gemini-flash-latest",
  "gemini-2.5-flash-lite",
  "gemini-3.5-flash-lite",
  "gemini-3.8-flash",
  "gemini-3.5-flash",
  "gemini-flash-lite-latest",
];

export const CLAUDE_MODEL = "claude-sonnet-4-5";
export const CLAUDE_HAIKU_MODEL = "claude-haiku-4-5-20251001";

/**
 * Calls Gemini generateContent with automatic model pool failover if a single model hits a 429 quota limit.
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

  let lastError: unknown = null;

  for (const model of pool) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config: params.config,
      });
      return {
        text: response.text?.trim() ?? "",
        modelUsed: model,
      };
    } catch (err: any) {
      lastError = err;
      const msg = err?.message || String(err);
      // If it's a 402 billing account block, don't retry other models on the same blocked project
      if (msg.includes("402") || msg.includes("prepayment credits are depleted") || msg.includes("organization_on_hold")) {
        throw err;
      }
      // If 429 quota, 503 high demand, or 404 model unavailable, try next model in pool
      if (
        msg.includes("429") ||
        msg.includes("503") ||
        msg.includes("UNAVAILABLE") ||
        msg.includes("RESOURCE_EXHAUSTED") ||
        msg.includes("quota") ||
        msg.includes("404") ||
        msg.includes("NOT_FOUND")
      ) {
        continue;
      }
      throw err;
    }
  }

  throw lastError || new Error("All Gemini models in fallback pool exhausted");
}
