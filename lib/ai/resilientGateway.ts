import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";
import {
  GEMINI_MODEL,
  CLAUDE_HAIKU_MODEL,
  generateGeminiWithFallback,
} from "./models";
import { trackApiUsage } from "@/lib/usage/trackUsage";

export type AITaskCategory =
  | "extract_quote"       // Inbound supplier emails, quote & MOQ parsing
  | "classify_intent"     // Buyer request intent parsing & normalization
  | "ocr_label"           // Packaging image OCR & visual spec extraction
  | "summarize_meeting"   // Call transcript & meeting notes extraction
  | "match_suppliers"     // Multi-criteria supplier matching & ranking
  | "layered_analysis"    // Multi-product DNA & catalog synthesis
  | "negotiate_terms";    // High-stakes commercial & regulatory trade-offs

export interface TaskRoutePlan {
  preferredModel: string;
  thinkingLevel: "low" | "medium" | "high";
  maxOutputTokens: number;
  allowClaudeFallback: boolean;
}

/**
 * Automatically selects the most token-efficient model and thinking budget
 * based on task complexity and input payload size.
 */
export function resolveOptimalModelForTask(
  task: AITaskCategory,
  estimatedInputTokens: number = 500
): TaskRoutePlan {
  // Large payloads (> 15k tokens) always route to high-efficiency Flash-Lite
  if (estimatedInputTokens > 15_000) {
    return {
      preferredModel: "gemini-3.5-flash-lite",
      thinkingLevel: "low",
      maxOutputTokens: 4096,
      allowClaudeFallback: false,
    };
  }

  switch (task) {
    case "extract_quote":
    case "classify_intent":
    case "ocr_label":
    case "summarize_meeting":
      return {
        preferredModel: GEMINI_MODEL, // defaults to gemini-3.5-flash-lite
        thinkingLevel: "low",
        maxOutputTokens: 2048,
        allowClaudeFallback: true,
      };

    case "match_suppliers":
    case "layered_analysis":
      return {
        preferredModel: "gemini-3.5-flash",
        thinkingLevel: "low",
        maxOutputTokens: 4096,
        allowClaudeFallback: true,
      };

    case "negotiate_terms":
      return {
        preferredModel: "gemini-3.5-flash",
        thinkingLevel: "medium",
        maxOutputTokens: 4096,
        allowClaudeFallback: true,
      };
  }
}

export interface ResilientTaskOptions<T = string> {
  task: AITaskCategory;
  featureName?: string;
  contents: any;
  systemInstruction?: string;
  responseMimeType?: "application/json" | "text/plain";
  temperature?: number;
  requestId?: string | null;
  /** Optional deterministic fallback if all AI tiers & keys are exhausted */
  deterministicFallback?: () => T | Promise<T>;
  /** Optional JSON parser/validator transform */
  parseOutput?: (rawText: string) => T;
}

export interface ResilientTaskResult<T = string> {
  data: T;
  rawText: string;
  modelUsed: string;
  tierUsed: string;
  degradedToFallback: boolean;
}

/**
 * Executes an AI request through the multi-key, multi-model Gemini pool,
 * automatically downgrading models or failing over to backup keys / Haiku / deterministic logic
 * when tokens, credits, or rate limits (429 / 402 / 503) are hit.
 */
export async function executeResilientTask<T = string>(
  opts: ResilientTaskOptions<T>
): Promise<ResilientTaskResult<T>> {
  const startTime = Date.now();
  const contentStr =
    typeof opts.contents === "string"
      ? opts.contents
      : JSON.stringify(opts.contents);
  const estimatedInputTokens = Math.ceil(contentStr.length / 4);
  const plan = resolveOptimalModelForTask(opts.task, estimatedInputTokens);

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "unconfigured" });
  const config: Record<string, any> = {
    temperature: opts.temperature ?? 0.1,
    maxOutputTokens: plan.maxOutputTokens,
  };
  if (opts.systemInstruction) {
    config.systemInstruction = opts.systemInstruction;
  }
  if (opts.responseMimeType) {
    config.responseMimeType = opts.responseMimeType;
  }

  // 1. Primary + Multi-Key / Multi-Model Gemini Failover Pool
  try {
    const result = await generateGeminiWithFallback(ai, {
      contents: opts.contents,
      config,
      preferredModel: plan.preferredModel,
    });

    const latencyMs = Date.now() - startTime;
    const outputTokensEst = Math.ceil(result.text.length / 4);

    await trackApiUsage({
      provider: "gemini",
      model: result.modelUsed,
      feature: opts.featureName || `ai.${opts.task}`,
      requestId: opts.requestId || null,
      keyAlias: result.tierUsed || "PRIMARY",
      inputTokens: estimatedInputTokens,
      outputTokens: outputTokensEst,
      latencyMs,
      ok: true,
    });

    const data = opts.parseOutput
      ? opts.parseOutput(result.text)
      : (result.text as unknown as T);

    return {
      data,
      rawText: result.text,
      modelUsed: result.modelUsed,
      tierUsed: result.tierUsed || "PRIMARY",
      degradedToFallback: false,
    };
  } catch (geminiErr: any) {
    console.warn(
      `[ResilientGateway] Gemini pool exhausted for task=${opts.task}:`,
      geminiErr?.message || geminiErr
    );
  }

  // 2. Secondary Emergency Failover: Claude Haiku (Ultra-low token cost, only if ANTHROPIC_API_KEY is present and task is text-compatible)
  if (
    plan.allowClaudeFallback &&
    process.env.ANTHROPIC_API_KEY &&
    typeof opts.contents === "string"
  ) {
    try {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const response = await anthropic.messages.create({
        model: CLAUDE_HAIKU_MODEL,
        max_tokens: Math.min(plan.maxOutputTokens, 2048),
        system: opts.systemInstruction,
        messages: [{ role: "user", content: opts.contents }],
      });

      const rawText =
        response.content[0]?.type === "text" ? response.content[0].text.trim() : "";

      await trackApiUsage({
        provider: "anthropic",
        model: CLAUDE_HAIKU_MODEL,
        feature: opts.featureName || `ai.${opts.task}`,
        requestId: opts.requestId || null,
        inputTokens: response.usage?.input_tokens ?? estimatedInputTokens,
        outputTokens: response.usage?.output_tokens ?? Math.ceil(rawText.length / 4),
        latencyMs: Date.now() - startTime,
        ok: true,
      });

      const data = opts.parseOutput
        ? opts.parseOutput(rawText)
        : (rawText as unknown as T);

      return {
        data,
        rawText,
        modelUsed: CLAUDE_HAIKU_MODEL,
        tierUsed: "ANTHROPIC_BACKUP",
        degradedToFallback: true,
      };
    } catch (claudeErr: any) {
      console.warn(
        `[ResilientGateway] Claude Haiku backup also failed for task=${opts.task}:`,
        claudeErr?.message || claudeErr
      );
    }
  }

  // 3. Final Deterministic Heuristic Fallback (Zero-Token Survival Mode)
  if (opts.deterministicFallback) {
    const fallbackData = await opts.deterministicFallback();
    return {
      data: fallbackData,
      rawText: typeof fallbackData === "string" ? fallbackData : JSON.stringify(fallbackData),
      modelUsed: "deterministic-heuristic",
      tierUsed: "ZERO_TOKEN_FALLBACK",
      degradedToFallback: true,
    };
  }

  throw new Error(
    `[ResilientGateway] All AI keys and fallback models exhausted for task "${opts.task}".`
  );
}
