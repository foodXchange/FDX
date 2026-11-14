import { GoogleGenAI } from "@google/genai";

/**
 * Centralized AI Model Configurations.
 * gemini-3.5-flash-lite is Google's high-quota production Flash-Lite model (up to 1,500 RPD on Free Tier).
 * Automatically falls back across the Free Tier model pool AND backup API key if one reaches its daily quota.
 */
export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

export const GEMINI_FALLBACK_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-3.8-flash",
  "gemini-3.6-flash",
  "gemini-3-flash-preview",
  "gemini-3.1-flash-lite-preview",
  "gemini-flash-lite-latest",
];

export const CLAUDE_MODEL = "claude-sonnet-4-5";
export const CLAUDE_HAIKU_MODEL = "claude-haiku-4-5-20251001";
export const XAI_DEFAULT_MODEL = process.env.XAI_MODEL || "grok-4.7";

// Sticky index of the last healthy (clientIdx, model) pair so we never waste latency on exhausted models
let stickyClientIdx = 0;
let stickyModelIdx = 0;

export interface GeminiKeyTier {
  tier: string;
  envVar: string;
  maskedKey: string;
  client: GoogleGenAI;
}

interface TierTelemetry {
  successCalls: number;
  quotaHits: number;
  lastError: string | null;
  lastUsedAt: string | null;
}

const tierStats = new Map<string, TierTelemetry>();
// Cooldown map: key = `${tier}:${model}` -> timestamp (ms) when cooldown expires
const pairCooldownUntil = new Map<string, { until: number; reason: string }>();
let totalFailoverSwitches = 0;
let lastSwitchEvent: string | null = null;

function maskKey(k: string): string {
  if (k.length <= 14) return "***";
  return `${k.slice(0, 12)}...${k.slice(-4)}`;
}

export function getConfiguredGeminiTiers(primaryClient?: GoogleGenAI): GeminiKeyTier[] {
  const rawDefs: Array<{
    tier: string;
    envVar: string;
    key: string | undefined;
  }> = [
    { tier: "PRIMARY", envVar: "GEMINI_API_KEY", key: process.env.GEMINI_API_KEY },
    { tier: "1ST_BACKUP", envVar: "GEMINI_API_KEY_2", key: process.env.GEMINI_API_KEY_2 },
    { tier: "2ND_BACKUP", envVar: "GEMINI_API_KEY_3", key: process.env.GEMINI_API_KEY_3 },
    { tier: "3RD_BACKUP", envVar: "GEMINI_API_KEY_4", key: process.env.GEMINI_API_KEY_4 },
    { tier: "4TH_BACKUP", envVar: "GEMINI_API_KEY_5", key: process.env.GEMINI_API_KEY_5 },
    { tier: "5TH_BACKUP", envVar: "GEMINI_API_KEY_BACKUP", key: process.env.GEMINI_API_KEY_BACKUP },
  ];

  const seenKeys = new Set<string>();
  const tiers: GeminiKeyTier[] = [];

  for (const def of rawDefs) {
    const clean = def.key?.trim();
    if (!clean || seenKeys.has(clean)) continue;
    seenKeys.add(clean);
    if (!tierStats.has(def.tier)) {
      tierStats.set(def.tier, {
        successCalls: 0,
        quotaHits: 0,
        lastError: null,
        lastUsedAt: null,
      });
    }
    tiers.push({
      tier: def.tier,
      envVar: def.envVar,
      maskedKey: maskKey(clean),
      client: def.tier === "PRIMARY" && primaryClient ? primaryClient : new GoogleGenAI({ apiKey: clean }),
    });
  }

  // Fallback if caller passed a custom GoogleGenAI client when env vars weren't matched
  if (tiers.length === 0 && primaryClient) {
    tiers.push({
      tier: "PRIMARY",
      envVar: "GEMINI_API_KEY",
      maskedKey: "custom-client",
      client: primaryClient,
    });
  }

  return tiers;
}

export function getGeminiPoolTelemetry() {
  const tiers = getConfiguredGeminiTiers();
  const now = Date.now();
  const activeTierObj = tiers[stickyClientIdx] || tiers[0] || null;
  const activeModel = GEMINI_FALLBACK_MODELS[stickyModelIdx] || GEMINI_MODEL;

  return {
    activeTier: activeTierObj?.tier ?? "UNCONFIGURED",
    activeEnvVar: activeTierObj?.envVar ?? null,
    activeModel,
    totalKeysConfigured: tiers.length,
    totalFailoverSwitches,
    lastSwitchEvent,
    tiers: tiers.map((t, idx) => {
      const stats = tierStats.get(t.tier) || {
        successCalls: 0,
        quotaHits: 0,
        lastError: null,
        lastUsedAt: null,
      };
      const availableModels = GEMINI_FALLBACK_MODELS.filter((m) => {
        const cd = pairCooldownUntil.get(`${t.tier}:${m}`);
        return !cd || cd.until <= now;
      });
      return {
        tier: t.tier,
        envVar: t.envVar,
        maskedKey: t.maskedKey,
        status:
          availableModels.length === 0
            ? "CREDITS_EXHAUSTED"
            : idx === stickyClientIdx
              ? "ACTIVE"
              : "STANDBY_READY",
        availableModelsCount: availableModels.length,
        totalModelsCount: GEMINI_FALLBACK_MODELS.length,
        successCalls: stats.successCalls,
        quotaHits: stats.quotaHits,
        lastError: stats.lastError,
        lastUsedAt: stats.lastUsedAt,
      };
    }),
  };
}

/**
 * Calls Gemini generateContent with automatic model pool AND ordered multi-key failover
 * (PRIMARY [GEMINI_API_KEY] -> 1ST_BACKUP [GEMINI_API_KEY_2] -> 2ND_BACKUP [GEMINI_API_KEY_BACKUP])
 * whenever free credits or daily/minute quotas are exhausted.
 */
export async function generateGeminiWithFallback(
  ai: GoogleGenAI,
  params: {
    contents: any;
    config?: Record<string, any>;
    preferredModel?: string;
  }
): Promise<{ text: string; modelUsed: string; tierUsed?: string }> {
  const pool = params.preferredModel
    ? [params.preferredModel, ...GEMINI_FALLBACK_MODELS.filter((m) => m !== params.preferredModel)]
    : GEMINI_FALLBACK_MODELS;

  const tiers = getConfiguredGeminiTiers(ai);
  const now = Date.now();

  // Build ordered candidate pairs starting from stickyClientIdx, skipping cooled-down (exhausted) pairs first
  const activeCandidates: Array<{ cIdx: number; mIdx: number }> = [];
  const cooldownCandidates: Array<{ cIdx: number; mIdx: number }> = [];

  for (let c = 0; c < tiers.length; c++) {
    const cIdx = (stickyClientIdx + c) % tiers.length;
    const tierName = tiers[cIdx].tier;
    for (let m = 0; m < pool.length; m++) {
      const mIdx = c === 0 ? (stickyModelIdx + m) % pool.length : m;
      const modelName = pool[mIdx];
      const cd = pairCooldownUntil.get(`${tierName}:${modelName}`);
      if (cd && cd.until > now) {
        cooldownCandidates.push({ cIdx, mIdx });
      } else {
        activeCandidates.push({ cIdx, mIdx });
      }
    }
  }

  // Try non-exhausted pairs first; only retry cooled-down pairs if everything else failed
  const candidates = [...activeCandidates, ...cooldownCandidates];
  let lastError: unknown = null;

  for (const { cIdx, mIdx } of candidates) {
    const tierObj = tiers[cIdx];
    const model = pool[mIdx];
    const stats = tierStats.get(tierObj.tier);

    try {
      const response = await tierObj.client.models.generateContent({
        model,
        contents: params.contents,
        config: params.config,
      });

      if (cIdx !== stickyClientIdx) {
        const prevTier = tiers[stickyClientIdx]?.tier ?? "PRIMARY";
        totalFailoverSwitches++;
        lastSwitchEvent = `Auto-switched from ${prevTier} to ${tierObj.tier} (${tierObj.envVar}) on ${model} at ${new Date().toISOString()}`;
        console.log(`⚡ [GEMINI AUTO-FAILOVER] ${lastSwitchEvent}`);
      }

      stickyClientIdx = cIdx;
      stickyModelIdx = mIdx;
      pairCooldownUntil.delete(`${tierObj.tier}:${model}`);

      if (stats) {
        stats.successCalls++;
        stats.lastUsedAt = new Date().toISOString();
      }

      return {
        text: response.text?.trim() ?? "",
        modelUsed: `${model} [${tierObj.tier}]`,
        tierUsed: tierObj.tier,
      };
    } catch (err: any) {
      lastError = err;
      const msg = err?.message || String(err);

      const is404 = msg.includes("404") || msg.includes("NOT_FOUND");
      const isAuthOrDisabled =
        msg.includes("401") ||
        msg.includes("UNAUTHENTICATED") ||
        msg.includes("ACCOUNT_STATE_INVALID") ||
        msg.includes("deleted or disabled") ||
        msg.includes("API_KEY_INVALID");
      const isDailyOrPrepayDepleted =
        msg.includes("402") ||
        msg.includes("prepayment credits") ||
        msg.includes("GenerateRequestsPerDay") ||
        msg.includes("free_tier_requests") ||
        msg.includes("spending cap");
      const isRateOrTransient =
        msg.includes("429") ||
        msg.includes("503") ||
        msg.includes("UNAVAILABLE") ||
        msg.includes("RESOURCE_EXHAUSTED") ||
        msg.includes("quota");

      if (isAuthOrDisabled) {
        console.warn(
          `⚡ [GEMINI ROTATION] Key tier ${tierObj.tier} (${tierObj.envVar}) unauthenticated/disabled: ${msg.slice(0, 100)}. Disabling tier.`
        );
        if (stats) {
          stats.quotaHits++;
          stats.lastError = "401 Service Account / Key Disabled";
        }
        for (const m of pool) {
          pairCooldownUntil.set(`${tierObj.tier}:${m}`, {
            until: Date.now() + 24 * 60 * 60 * 1000,
            reason: "Service account deleted or disabled (401)",
          });
        }
        if (cIdx === stickyClientIdx) {
          stickyClientIdx = (stickyClientIdx + 1) % tiers.length;
        }
        continue;
      }

      if (is404 || isDailyOrPrepayDepleted || isRateOrTransient) {
        if (stats) {
          stats.quotaHits++;
          stats.lastError = msg.slice(0, 160);
        }
        // Cooldown: 24h for 404 unsupported model, 30m for daily/prepay exhaustion, 90s for RPM burst
        const cooldownMs = is404
          ? 24 * 60 * 60 * 1000
          : isDailyOrPrepayDepleted
            ? 30 * 60 * 1000
            : 90 * 1000;
        pairCooldownUntil.set(`${tierObj.tier}:${model}`, {
          until: Date.now() + cooldownMs,
          reason: msg.slice(0, 120),
        });
        continue;
      }
      throw err;
    }
  }

  // Emergency Failover: If all Gemini keys/models in the pool are exhausted, try xAI Grok (Grok 4.7)
  if (process.env.XAI_API_KEY) {
    try {
      const xaiModel = XAI_DEFAULT_MODEL;
      const promptText = typeof params.contents === "string" ? params.contents : JSON.stringify(params.contents);
      const messages: Array<{ role: "system" | "user"; content: string }> = [];
      if (params.config?.systemInstruction) {
        messages.push({ role: "system", content: String(params.config.systemInstruction) });
      }
      messages.push({ role: "user", content: promptText });

      const requestBody: Record<string, any> = {
        model: xaiModel,
        messages,
        temperature: params.config?.temperature ?? 0.1,
        max_tokens: params.config?.maxOutputTokens ?? 4096,
      };

      if (params.config?.responseMimeType === "application/json") {
        requestBody.response_format = { type: "json_object" };
      }

      const res = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.XAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (res.ok) {
        const xaiData = await res.json();
        const text = xaiData.choices?.[0]?.message?.content?.trim() || "";
        console.log(`[Models] Gemini pool exhausted — smoothly recovered via xAI Grok (${xaiModel})`);
        return {
          text,
          modelUsed: xaiModel,
          tierUsed: "XAI_GROK_FAILOVER",
        };
      }
    } catch (xaiErr) {
      console.warn("[Models] xAI Grok failover also failed:", xaiErr);
    }
  }

  throw lastError || new Error("All Gemini models and backup API keys in failover pool exhausted");
}

/**
 * Direct invocation helper for xAI Grok 4.7
 */
export async function generateGrokCompletion(params: {
  contents: any;
  systemInstruction?: string;
  responseMimeType?: "application/json" | "text/plain";
  temperature?: number;
  maxOutputTokens?: number;
  model?: string;
}): Promise<{ text: string; modelUsed: string; usage?: any }> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    throw new Error("XAI_API_KEY is not configured in environment");
  }

  const model = params.model || XAI_DEFAULT_MODEL;
  const promptText = typeof params.contents === "string" ? params.contents : JSON.stringify(params.contents);
  const messages: Array<{ role: "system" | "user"; content: string }> = [];

  if (params.systemInstruction) {
    messages.push({ role: "system", content: params.systemInstruction });
  }
  messages.push({ role: "user", content: promptText });

  const requestBody: Record<string, any> = {
    model,
    messages,
    temperature: params.temperature ?? 0.1,
    max_tokens: params.maxOutputTokens ?? 4096,
  };

  if (params.responseMimeType === "application/json") {
    requestBody.response_format = { type: "json_object" };
  }

  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`xAI Grok API error (${res.status}): ${errText}`);
  }

  const xaiData = await res.json();
  const text = xaiData.choices?.[0]?.message?.content?.trim() || "";
  return {
    text,
    modelUsed: model,
    usage: xaiData.usage,
  };
}
