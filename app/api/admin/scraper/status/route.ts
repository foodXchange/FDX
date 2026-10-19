import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

let lastGeminiCheck: { isTripped: boolean; reason: string | null; checkedAt: number } = {
  isTripped: true,
  reason: "Google AI Studio prepayment credit is depleted (HTTP 402 RESOURCE_EXHAUSTED).",
  checkedAt: 0,
};

export async function GET() {
  try {
    const hasVoyage = Boolean(process.env.VOYAGE_API_KEY);
    const hasFirecrawl = Boolean(process.env.FIRECRAWL_API_KEY);
    const hasGemini = Boolean(process.env.GEMINI_API_KEY);
    const hasAnthropic = Boolean(process.env.ANTHROPIC_API_KEY);

    // Fast catalog counts in parallel
    const [totalRes, missingCatRes, embeddedRes, suppliersRes] = await Promise.all([
      supabaseAdmin.from("supplier_products").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("supplier_products").select("*", { count: "exact", head: true }).is("category_id", null),
      supabaseAdmin.from("supplier_products").select("*", { count: "exact", head: true }).not("embedding", "is", null),
      supabaseAdmin.from("supplier_offerings").select("scrape_status"),
    ]);

    const totalProducts = totalRes.count ?? 0;
    const uncategorized = missingCatRes.count ?? 0;
    const categorized = Math.max(0, totalProducts - uncategorized);
    const embedded = embeddedRes.count ?? 0;
    const catRate = totalProducts > 0 ? Number(((categorized / totalProducts) * 100).toFixed(1)) : 0;
    const embedRate = totalProducts > 0 ? Number(((embedded / totalProducts) * 100).toFixed(1)) : 0;

    const supplierStatus = { pending: 0, scraped: 0, failed: 0, skipped: 0, total: 0 };
    for (const s of (suppliersRes.data ?? []) as { scrape_status: string | null }[]) {
      const st = s.scrape_status ?? "pending";
      if (st === "scraped") supplierStatus.scraped++;
      else if (st === "failed") supplierStatus.failed++;
      else if (st === "skipped") supplierStatus.skipped++;
      else supplierStatus.pending++;
      supplierStatus.total++;
    }

    // Dynamic Circuit breaker check (cached for 60 seconds)
    if (hasGemini && Date.now() - lastGeminiCheck.checkedAt > 60_000) {
      try {
        const { GoogleGenAI } = await import("@google/genai");
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
        await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: "ping",
        });
        lastGeminiCheck = { isTripped: false, reason: null, checkedAt: Date.now() };
      } catch (err: any) {
        const msg = err?.message || String(err);
        if (msg.includes("402") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("depleted")) {
          lastGeminiCheck = {
            isTripped: true,
            reason: "Google AI Studio prepayment credit is depleted (HTTP 402 RESOURCE_EXHAUSTED). Please top up balance at https://ai.studio/projects.",
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

    return NextResponse.json({
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
          model: "gemini-3.8-flash",
          note: circuitBreakerTripped ? (circuitBreakerReason || "Quota depleted") : "Ready",
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
      },
      suppliers: supplierStatus,
      circuitBreaker: {
        isTripped: circuitBreakerTripped,
        reason: circuitBreakerReason,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: errorMsg }, { status: 500 });
  }
}
