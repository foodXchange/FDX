import { supabaseAdmin } from "@/lib/supabaseAdmin";

export interface ApiUsageRecord {
  provider: "gemini" | "voyage" | "resend" | "firecrawl" | "anthropic" | "perplexity" | "supabase";
  model?: string | null;
  feature: string;
  keyAlias?: string | null;
  requestId?: string | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  units?: number | null;
  estCostUsd?: number | null;
  latencyMs?: number | null;
  ok?: boolean;
  error?: string | null;
}

// Pricing constants (USD per 1M tokens / per unit)
const PRICING = {
  gemini_flash: { inputPer1M: 0.1, outputPer1M: 0.4 },
  gemini_pro: { inputPer1M: 1.25, outputPer1M: 5.0 },
  resend_email: { perEmail: 0.0006 }, // ~$20 for 40k emails
};

export function estimateGeminiCost(
  model: string | undefined,
  inputTokens: number = 0,
  outputTokens: number = 0
): number {
  const isPro = model?.toLowerCase().includes("pro");
  const rates = isPro ? PRICING.gemini_pro : PRICING.gemini_flash;
  const inputCost = (inputTokens / 1_000_000) * rates.inputPer1M;
  const outputCost = (outputTokens / 1_000_000) * rates.outputPer1M;
  return Number((inputCost + outputCost).toFixed(6));
}

export async function trackApiUsage(record: ApiUsageRecord): Promise<void> {
  try {
    let estCost = record.estCostUsd;
    if (estCost === undefined || estCost === null) {
      if (record.provider === "gemini") {
        estCost = estimateGeminiCost(record.model ?? "gemini-2.5-flash", record.inputTokens ?? 0, record.outputTokens ?? 0);
      } else if (record.provider === "resend") {
        estCost = (record.units ?? 1) * PRICING.resend_email.perEmail;
      }
    }

    await supabaseAdmin.from("api_usage_log").insert({
      provider: record.provider,
      model: record.model ?? null,
      feature: record.feature,
      key_alias: record.keyAlias ?? null,
      request_id: record.requestId ?? null,
      input_tokens: record.inputTokens ?? null,
      output_tokens: record.outputTokens ?? null,
      units: record.units ?? null,
      est_cost_usd: estCost ?? null,
      latency_ms: record.latencyMs ?? null,
      ok: record.ok !== false,
      error: record.error ?? null,
    });
  } catch (err) {
    // Fail-safe: Metering must never crash primary business flows
    console.warn("api_usage_log insertion skipped:", err);
  }
}
