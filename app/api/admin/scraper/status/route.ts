import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  GEMINI_MODEL,
  generateGeminiWithFallback,
  getGeminiPoolTelemetry,
} from "@/lib/ai/models";

export const dynamic = "force-dynamic";

let lastGeminiCheck: { isTripped: boolean; reason: string | null; checkedAt: number } = {
  isTripped: false,
  reason: null,
  checkedAt: 0,
};

// 15-second in-memory cache for fast sub-5ms dashboard polling
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cachedStatusPayload: { data: any; fetchedAt: number } | null = null;
const STATUS_CACHE_TTL_MS = 15_000;

export async function GET() {
  try {
    if (cachedStatusPayload && Date.now() - cachedStatusPayload.fetchedAt < STATUS_CACHE_TTL_MS) {
      return NextResponse.json(cachedStatusPayload.data);
    }

    const hasVoyage = Boolean(process.env.VOYAGE_API_KEY);
    const hasFirecrawl = Boolean(process.env.FIRECRAWL_API_KEY);
    const hasGemini = Boolean(process.env.GEMINI_API_KEY);
    const hasAnthropic = Boolean(process.env.ANTHROPIC_API_KEY);

    // Fast catalog & supplier counts in parallel using indexed id column
    const [
      totalRes,
      missingCatRes,
      embeddedRes,
      imagesRes,
      tempRes,
      totalSuppliersRes,
      pendingRes,
      scrapedRes,
      failedRes,
      skippedRes,
      suppliersWithEmailRes,
      suppliersWithLogoRes,
    ] = await Promise.all([
      supabaseAdmin.from("supplier_products").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("supplier_products").select("id", { count: "exact", head: true }).is("category_id", null),
      supabaseAdmin.from("supplier_products").select("id", { count: "exact", head: true }).not("embedding", "is", null),
      supabaseAdmin.from("supplier_products").select("id", { count: "exact", head: true }).not("image_url", "is", null),
      supabaseAdmin.from("supplier_products").select("id", { count: "exact", head: true }).not("storage_temp", "is", null),
      supabaseAdmin.from("supplier_offerings").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("supplier_offerings").select("id", { count: "exact", head: true }).eq("scrape_status", "pending"),
      supabaseAdmin.from("supplier_offerings").select("id", { count: "exact", head: true }).eq("scrape_status", "scraped"),
      supabaseAdmin.from("supplier_offerings").select("id", { count: "exact", head: true }).eq("scrape_status", "failed"),
      supabaseAdmin.from("supplier_offerings").select("id", { count: "exact", head: true }).eq("scrape_status", "skipped"),
      supabaseAdmin.from("supplier_offerings").select("id", { count: "exact", head: true }).eq("scrape_status", "scraped").not("contact_email", "is", null),
      supabaseAdmin.from("supplier_offerings").select("id", { count: "exact", head: true }).eq("scrape_status", "scraped").not("logo_url", "is", null),
    ]);

    const totalProducts = totalRes.count ?? 0;
    const uncategorized = missingCatRes.count ?? 0;
    const categorized = Math.max(0, totalProducts - uncategorized);
    const embedded = embeddedRes.count ?? 0;
    const withImages = imagesRes.count ?? 0;
    const withStorageTemp = tempRes.count ?? 0;
    const catRate = totalProducts > 0 ? Number(((categorized / totalProducts) * 100).toFixed(1)) : 0;
    const embedRate = totalProducts > 0 ? Number(((embedded / totalProducts) * 100).toFixed(1)) : 0;
    const imageRate = totalProducts > 0 ? Number(((withImages / totalProducts) * 100).toFixed(1)) : 0;
    const tempRate = totalProducts > 0 ? Number(((withStorageTemp / totalProducts) * 100).toFixed(1)) : 0;

    const scrapedCount = scrapedRes.count ?? 0;
    const suppliersWithEmail = suppliersWithEmailRes.count ?? 0;
    const suppliersWithLogo = suppliersWithLogoRes.count ?? 0;
    const emailRate = scrapedCount > 0 ? Number(((suppliersWithEmail / scrapedCount) * 100).toFixed(1)) : 0;
    const logoRate = scrapedCount > 0 ? Number(((suppliersWithLogo / scrapedCount) * 100).toFixed(1)) : 0;

    const supplierStatus = {
      pending: pendingRes.count ?? 0,
      scraped: scrapedCount,
      failed: failedRes.count ?? 0,
      skipped: skippedRes.count ?? 0,
      total: totalSuppliersRes.count ?? 0,
      withEmail: suppliersWithEmail,
      emailRate,
      withLogo: suppliersWithLogo,
      logoRate,
    };

    // Dynamic Circuit breaker check (cached for 60 seconds) across the 3-key failover pool
    if (hasGemini && Date.now() - lastGeminiCheck.checkedAt > 60_000) {
      try {
        const { GoogleGenAI } = await import("@google/genai");
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
        await generateGeminiWithFallback(ai, {
          contents: "ping",
        });
        lastGeminiCheck = { isTripped: false, reason: null, checkedAt: Date.now() };
      } catch (err: any) {
        const msg = err?.message || String(err);
        if (msg.includes("402") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("depleted")) {
          const isSpendCap = msg.includes("spending cap") || msg.includes("monthly spending cap");
          const isFreeQuota = msg.includes("free_tier_requests") || msg.includes("GenerateRequestsPerDay");
          let reason = "Google AI Studio prepayment credit is depleted across all configured keys (HTTP 402 RESOURCE_EXHAUSTED).";
          if (isSpendCap) {
            reason = "Google Gemini monthly spending cap reached (or billing propagation pending). Adjust spend cap at https://ai.studio/billing.";
          } else if (isFreeQuota) {
            reason = `Google AI Studio Free Tier daily quota reached across all configured keys (${GEMINI_MODEL} + failover pool).`;
          }
          lastGeminiCheck = {
            isTripped: true,
            reason,
            checkedAt: Date.now(),
          };
        } else {
          lastGeminiCheck = {
            isTripped: false,
            reason: null,
            checkedAt: Date.now(),
          };
        }
      }
    }

    const circuitBreakerTripped = !hasGemini || lastGeminiCheck.isTripped;
    const circuitBreakerReason = !hasGemini
      ? "GEMINI_API_KEY is not configured."
      : lastGeminiCheck.reason;

    const geminiPool = getGeminiPoolTelemetry();

    const payload = {
      ok: true,
      timestamp: new Date().toISOString(),
      providers: {
        voyage: {
          name: "Voyage AI",
          configured: hasVoyage,
          status: hasVoyage ? "operational" : "unconfigured",
          model: "voyage-3",
          dimensions: 1024,
        },
        firecrawl: {
          name: "Firecrawl",
          configured: hasFirecrawl,
          status: hasFirecrawl ? "operational" : "unconfigured",
          type: "Scraper & Grounded Search",
        },
        gemini: {
          name: "Google Gemini",
          configured: hasGemini,
          status: circuitBreakerTripped ? "circuit_breaker_active" : "operational",
          model: `${geminiPool.activeModel} [${geminiPool.activeTier}]`,
          note: circuitBreakerTripped
            ? (circuitBreakerReason || "Quota depleted")
            : `Ready (${geminiPool.activeTier} active · ${geminiPool.totalKeysConfigured} keys in auto-failover pool)`,
          pool: geminiPool,
        },
        anthropic: {
          name: "Claude AI",
          configured: hasAnthropic,
          status: hasAnthropic ? "operational" : "unconfigured",
          model: "claude-sonnet-4-5",
        },
      },
      catalog: {
        totalProducts,
        categorizedProducts: categorized,
        uncategorizedProducts: uncategorized,
        categorizationRate: catRate,
        embeddedProducts: embedded,
        embeddingRate: embedRate,
        withImagesProducts: withImages,
        imageRate,
        withStorageTempProducts: withStorageTemp,
        tempRate,
      },
      suppliers: supplierStatus,
      circuitBreaker: {
        isTripped: circuitBreakerTripped,
        reason: circuitBreakerReason,
      },
    };

    cachedStatusPayload = { data: payload, fetchedAt: Date.now() };
    return NextResponse.json(payload);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: errorMsg }, { status: 500 });
  }
}
