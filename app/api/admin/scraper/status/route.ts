import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

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

    // Circuit breaker state
    const circuitBreakerTripped = true; // Google AI Studio balance is $0 (HTTP 402)
    const circuitBreakerReason =
      "Google AI Studio prepayment credit is depleted (HTTP 402 RESOURCE_EXHAUSTED). Workers are safely paused without dropping suppliers.";

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
          model: "gemini-2.5-flash",
          note: circuitBreakerTripped ? "Quota depleted (HTTP 402)" : "Ready",
        },
        anthropic: {
          name: "Claude AI",
          configured: hasAnthropic,
          status: hasAnthropic ? "operational" : "unconfigured",
          model: "claude-3-5-sonnet",
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
