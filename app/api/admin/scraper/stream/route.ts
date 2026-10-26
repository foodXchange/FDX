import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { crawlSupplier } from "@/lib/scraper/crawl";
import {
  extractProducts,
  extractSupplierProfile,
  extractSupplierFull,
} from "@/lib/scraper/extract";
import type { ExtractedProduct } from "@/lib/scraper/extract";
import {
  classifyCompany,
  describeClassification,
  saveClassification,
  saveCrawlSnapshot,
} from "@/lib/scraper/classify";
import { embedBatch } from "@/lib/ai/embed";
import { mapScraperCategoryToCanonicalId } from "@/lib/pip/resolveCategoryId";
import { isBlockedOrEmptyContent } from "@/lib/scraper/cleanContent";
import { GEMINI_MODEL, generateGeminiWithFallback } from "@/lib/ai/models";

export const dynamic = "force-dynamic";

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function getHomepage(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return url;
  }
}

// Buffer for batch logging to reduce DB writes
class LogBuffer {
  private buffer: Array<{
    batch_id: string;
    supplier_id?: string;
    row_index?: number;
    result?: string;
    products_found?: number;
    message?: string;
    source?: string;
    meta?: Record<string, unknown>;
  }> = [];
  private flush_interval = 10; // Flush every 10 logs or on demand

  add(log: {
    batch_id: string;
    supplier_id?: string;
    row_index?: number;
    result?: string;
    products_found?: number;
    message?: string;
    source?: string;
    meta?: Record<string, unknown>;
  }) {
    this.buffer.push(log);
    if (this.buffer.length >= this.flush_interval) {
      return this.flushAsync();
    }
    return Promise.resolve();
  }

  async flushAsync() {
    if (this.buffer.length === 0) return;
    const toInsert = this.buffer.splice(0);
    try {
      await supabaseAdmin.from("scrape_batch_logs").insert(toInsert);
    } catch (err) {
      console.error("Failed to flush logs:", err);
    }
  }

  async flush() {
    return this.flushAsync();
  }
}

import {
  extractImagesFromCrawledContent,
  matchProductToCrawledImage,
  rehostProductImageToStorage,
  rehostSupplierLogoToStorage,
  toAbsoluteUrl,
  getDomainFaviconUrl,
  deriveProductQualityFields,
  buildRichProductEmbeddingText,
} from "@/lib/scraper/mediaHelper";

async function insertProducts(
  supplierId: string,
  products: ExtractedProduct[],
  scrapeSource: string,
  crawledContent = "",
  supplierWebsite: string | null = null
): Promise<{ count: number; imagesSaved: number }> {
  if (products.length === 0) return { count: 0, imagesSaved: 0 };

  async function recomputeSupplierQualification(supplierId: string) {
    const { data: prods, count, error } = await supabaseAdmin
      .from("supplier_products")
      .select("category, certifications, kosher_types", { count: "exact" })
      .eq("supplier_id", supplierId);
    if (error) return;
    const product_count = count ?? 0;
    const qualification_status =
      product_count >= 3 ? "strong" : product_count >= 1 ? "thin" : "empty";

    const distinctCategories = Array.from(
      new Set(prods?.map((p) => p.category).filter(Boolean) || [])
    );
    const distinctCerts = Array.from(
      new Set(prods?.flatMap((p) => p.certifications || []).filter(Boolean) || [])
    );
    const distinctKosher = Array.from(
      new Set(prods?.flatMap((p) => p.kosher_types || []).filter(Boolean) || [])
    );

    await supabaseAdmin
      .from("supplier_offerings")
      .update({
        product_count,
        qualification_status,
        status: "approved",
        verified: true,
        ...(distinctCategories.length > 0 ? { categories: distinctCategories } : {}),
        ...(distinctCerts.length > 0 ? { certifications: distinctCerts } : {}),
        ...(distinctKosher.length > 0 ? { kosher_types: distinctKosher } : {}),
      })
      .eq("id", supplierId);
  }

  await supabaseAdmin
    .from("supplier_products")
    .delete()
    .eq("supplier_id", supplierId)
    .eq("manually_verified", false);

  const { productImages } = extractImagesFromCrawledContent(
    crawledContent,
    supplierWebsite
  );

  // Match and re-host product images in parallel
  const resolvedImages = await Promise.all(
    products.map(async (p, idx) => {
      const candidateUrl = matchProductToCrawledImage(
        p,
        productImages,
        supplierWebsite
      );
      if (!candidateUrl) return null;
      return rehostProductImageToStorage(supplierId, candidateUrl, idx);
    })
  );

  const imagesSaved = resolvedImages.filter(Boolean).length;

  // Generate vector embeddings via Voyage AI for immediate semantic matching
  let vectors: (number[] | null)[] = [];
  try {
    const embedTexts = products.map((p) => buildRichProductEmbeddingText(p));
    vectors = await embedBatch(embedTexts, "document");
  } catch (e) {
    console.warn("Auto-embedding failed, inserting without vectors:", e);
  }

  const rows = products.map((p, i) => {
    const enriched = deriveProductQualityFields(p, supplierWebsite);
    return {
      supplier_id: supplierId,
      product_name: p.product_name,
      category: p.category,
      category_id: mapScraperCategoryToCanonicalId(p.category, p.subcategory, p.product_name),
      subcategory: p.subcategory ?? null,
      description: p.description ?? null,
      formats: p.formats ?? [],
      sizes: p.sizes ?? [],
      brix_level: p.brix_level ?? null,
      shelf_life_months: typeof p.shelf_life_months === "number" ? p.shelf_life_months : null,
      storage_temp: enriched.storage_temp,
      temperature_regime: enriched.temperature_regime,
      processing_type: enriched.processing_type,
      ingredients: enriched.ingredients,
      source_url: enriched.source_url,
      is_organic: enriched.is_organic,
      is_halal: enriched.is_halal,
      is_gluten_free: enriched.is_gluten_free,
      is_sugar_free: enriched.is_sugar_free,
      kosher_level: enriched.kosher_level,
      certifications: p.certifications ?? [],
      kosher_types: p.kosher_types ?? [],
      product_type: p.product_type ?? null,
      primary_ingredients: p.primary_ingredients ?? [],
      private_label: p.private_label ?? false,
      tags: p.tags ?? [],
      markets_suitable: p.markets_suitable ?? [],
      scrape_source: scrapeSource,
      scrape_confidence: p.confidence ?? 0.5,
      last_scraped_at: new Date().toISOString(),
      manually_verified: false,
      needs_review: p.needs_review ?? false,
      is_published: true,
      image_url: resolvedImages[i] ?? null,
      image_source: resolvedImages[i] ? "scraper" : null,
      embedding: vectors[i] ? JSON.stringify(vectors[i]) : null,
    };
  });

  const { error } = await supabaseAdmin.from("supplier_products").insert(rows);
  if (error) return { count: 0, imagesSaved: 0 };
  await recomputeSupplierQualification(supplierId);
  return { count: rows.length, imagesSaved };
}

type SupplierRow = {
  id: string;
  company_name: string;
  website: string | null;
  country_of_origin: string | null;
  categories: string[] | null;
  certifications: string[] | null;
  scrape_status: string | null;
};

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const limitParam = searchParams.get("limit");
  const statusParam = searchParams.get("status");
  const supplierIdParam = searchParams.get("supplierId");
  const batchIdParam = searchParams.get("batchId");
  const batchUuidParam = searchParams.get("batchUuid");

  // Parse limit: "all" means no limit (default)
  let queryLimit: number | undefined;
  if (limitParam && limitParam !== "all") {
    const parsed = parseInt(limitParam, 10);
    if (!isNaN(parsed) && parsed > 0) {
      queryLimit = parsed;
    }
  }
  // If limitParam is "all" or missing, queryLimit stays undefined (no limit)

  const encoder = new TextEncoder();
  const logBuffer = new LogBuffer();

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: Record<string, unknown>) {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          // client disconnected
        }
      }

      async function logEvent(
        result: string,
        supplierId: string | undefined,
        message: string,
        productsFound = 0,
        source?: string,
        meta?: Record<string, unknown>
      ) {
        if (batchUuidParam) {
          await logBuffer.add({
            batch_id: batchUuidParam,
            supplier_id: supplierId,
            result,
            products_found: productsFound,
            message,
            source,
            meta,
          });
        }
      }

      send({ type: "start", message: "Starting scraper..." });

      // Update batch status to running
      if (batchUuidParam) {
        await supabaseAdmin
          .from("scrape_batches")
          .update({ status: "running", updated_at: new Date().toISOString() })
          .eq("id", batchUuidParam);
      }

      // Fetch suppliers
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query: any = supabaseAdmin
        .from("supplier_offerings")
        .select(
          "id, company_name, website, country_of_origin, categories, certifications, scrape_status"
        )
        .not("website", "is", null)
        .neq("website", "");

      if (supplierIdParam) {
        query = query.eq("id", supplierIdParam);
      }

      if (batchIdParam) {
        query = query.eq("csv_import_batch", batchIdParam);
      }

      if (!supplierIdParam) {
        if (statusParam === "pending") {
          query = query.eq("scrape_status", "pending");
        } else if (statusParam === "failed") {
          query = query.eq("scrape_status", "failed");
        } else {
          // Never re-scrape already scraped or skipped suppliers
          query = query.in("scrape_status", ["pending", "failed"]);
        }
      }

      if (queryLimit) {
        query = query.limit(queryLimit);
      }

      const { data, error } = (await query) as {
        data: SupplierRow[] | null;
        error: { message: string } | null;
      };

      if (error || !data) {
        send({
          type: "error",
          message: `Failed to fetch suppliers: ${error?.message ?? "unknown"}`,
        });
        send({ type: "done" });
        controller.close();
        return;
      }

      const suppliers = data as SupplierRow[];
      send({ type: "log", message: `Found ${suppliers.length} suppliers to process` });
      await logEvent("info", undefined, `Found ${suppliers.length} suppliers to process`);

      // Pre-flight AI check to protect Firecrawl credits and avoid partial runs if AI is depleted
      if (process.env.GEMINI_API_KEY) {
        try {
          const { GoogleGenAI } = await import("@google/genai");
          const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
          const { modelUsed } = await generateGeminiWithFallback(ai, {
            contents: "ping",
          });
          send({ type: "log", message: `✓ AI Pre-flight passed (${modelUsed} active)` });
        } catch (err: any) {
          const msg = err?.message || String(err);
          if (
            msg.includes("402") ||
            msg.includes("RESOURCE_EXHAUSTED") ||
            msg.includes("prepayment credits are depleted") ||
            msg.includes("organization_on_hold")
          ) {
            const isSpendCap = msg.includes("spending cap") || msg.includes("monthly spending cap");
            const isFreeQuota = msg.includes("free_tier_requests") || msg.includes("GenerateRequestsPerDay");
            let breakerNotice = "⚡ CIRCUIT BREAKER: AI Prepayment credits are depleted (HTTP 402). Pausing scraper safely — no suppliers were modified or crawled. Top up at https://ai.studio/projects.";
            if (isSpendCap) {
              breakerNotice = "⚡ CIRCUIT BREAKER: Monthly spending cap reached on Google AI Studio (or newly upgraded billing is still propagating). Please check or raise your Spend Cap at https://ai.studio/billing (or wait 5-15m for Google billing sync). Pausing scraper safely — no suppliers were modified.";
            } else if (isFreeQuota) {
              breakerNotice = `⚡ CIRCUIT BREAKER: Gemini Free Tier daily limit reached across all models (${GEMINI_MODEL} + fallback pool). Pausing scraper safely — no suppliers were modified.`;
            }
            send({
              type: "error",
              message: breakerNotice,
            });
            send({ type: "done" });
            controller.close();
            return;
          }
        }
      }

      const succeeded: { name: string; products: number }[] = [];
      const failed: { name: string; reason: string }[] = [];
      const skippedList: { name: string; type: string }[] = [];
      let perplexityCount = 0;

      for (let i = 0; i < suppliers.length; i++) {
        const supplier = suppliers[i];

        send({
          type: "supplier",
          message: `[${i + 1}/${suppliers.length}] ${supplier.company_name}`,
        });
        send({ type: "log", message: `  Website: ${supplier.website}` });

        // Skip emails and social media URLs before wasting API credits
        const siteUrl = supplier.website ?? "";
        const isBadUrl =
          siteUrl.includes("@") ||
          siteUrl.includes("youtube.com") ||
          siteUrl.includes("linkedin.com") ||
          siteUrl.includes("facebook.com");

        if (isBadUrl) {
          const badReason = siteUrl.includes("@")
            ? "Email address stored as URL"
            : "Social media URL";
          send({ type: "warning", message: `  ✗ SKIPPED — ${badReason}` });
          await supabaseAdmin
            .from("supplier_offerings")
            .update({ scrape_status: "skipped", internal_notes: badReason })
            .eq("id", supplier.id);
          skippedList.push({ name: supplier.company_name, type: "bad_url" });
          await logEvent("skipped", supplier.id, badReason);
          continue;
        }

        // Domain Deduplication Guard: if already scraped in another batch, sync and skip crawl
        let normalizedHost = "";
        try {
          const u = new URL(siteUrl.startsWith("http") ? siteUrl : "http://" + siteUrl);
          normalizedHost = u.hostname.replace(/^www\./, "").toLowerCase().trim();
        } catch {}

        if (normalizedHost && normalizedHost.length > 3) {
          const { data: existingScraped } = await supabaseAdmin
            .from("supplier_offerings")
            .select("id, product_count, products_found, qualification_status, product_description, contact_email, contact_phone, contact_name, linkedin_url, export_markets, founded_year, employees_range")
            .ilike("website", `%${normalizedHost}%`)
            .eq("scrape_status", "scraped")
            .gt("products_found", 0)
            .neq("id", supplier.id)
            .order("products_found", { ascending: false })
            .limit(1);

          if (existingScraped && existingScraped.length > 0) {
            const src = existingScraped[0];
            const { data: srcProducts } = await supabaseAdmin
              .from("supplier_products")
              .select("product_name, category, category_id, subcategory, description, formats, sizes, brix_level, shelf_life_months, certifications, kosher_types, product_type, primary_ingredients, private_label, tags, markets_suitable, scrape_source, scrape_confidence, embedding")
              .eq("supplier_id", src.id);

            if (srcProducts && srcProducts.length > 0) {
              send({
                type: "log",
                message: `  ⚡ Duplicate domain (${normalizedHost}) — syncing ${srcProducts.length} products from already scraped supplier...`,
              });

              const newProducts = srcProducts.map((p) => ({
                ...p,
                supplier_id: supplier.id,
                manually_verified: false,
                needs_review: false,
                is_published: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }));
              await supabaseAdmin.from("supplier_products").insert(newProducts);
              const copiedCount = newProducts.length;

              await supabaseAdmin
                .from("supplier_offerings")
                .update({
                  scrape_status: "scraped",
                  qualification_status: src.qualification_status ?? "strong",
                  product_count: copiedCount,
                  products_found: copiedCount,
                  product_description: src.product_description,
                  contact_email: src.contact_email,
                  contact_phone: src.contact_phone,
                  contact_name: src.contact_name,
                  linkedin_url: src.linkedin_url,
                  export_markets: src.export_markets,
                  founded_year: src.founded_year,
                  employees_range: src.employees_range,
                  internal_notes: `Synced duplicate domain from supplier (${src.id})`,
                  last_scraped_at: new Date().toISOString(),
                })
                .eq("id", supplier.id);

              send({
                type: "success",
                message: `  ✓ Synced ${copiedCount} products without re-crawling (0 credits used)`,
                data: { products: copiedCount, supplier: supplier.company_name },
              });

              succeeded.push({ name: supplier.company_name, products: copiedCount });
              await logEvent("duplicate_sync", supplier.id, `Synced from ${src.id}`, copiedCount, "dedup");
              continue;
            }
          }
        }

        let timerHandle: NodeJS.Timeout | undefined;
        let isTimedOut = false;
        let productsSavedCount = 0;
        const supplierTimeout = new Promise<never>((_, reject) => {
          timerHandle = setTimeout(() => {
            isTimedOut = true;
            reject(new Error("Supplier timeout"));
          }, 120000);
        });

        try {
          await supabaseAdmin
            .from("supplier_offerings")
            .update({ scrape_status: "pending" })
            .eq("id", supplier.id);

          await Promise.race([
            (async () => {
              // ── CRAWL (WITH ZERO-CREDIT SNAPSHOT CACHE CHECK) ─────────────
              const crawlUrl = getHomepage(supplier.website!);
              let content = "";
              let usedCachedSnapshot = false;

              const { data: existingSnap } = await supabaseAdmin
                .from("crawl_snapshots")
                .select("content, content_chars")
                .eq("supplier_id", supplier.id)
                .maybeSingle();

              if (
                existingSnap?.content &&
                existingSnap.content.length >= 250 &&
                !isBlockedOrEmptyContent(existingSnap.content)
              ) {
                content = existingSnap.content;
                usedCachedSnapshot = true;
                send({
                  type: "log",
                  message: `  ⚡ Loaded cached website snapshot (${content.length.toLocaleString()} chars — 0 Firecrawl credits used)`,
                });
              } else {
                send({ type: "log", message: "  → Crawling website..." });
                content = await crawlSupplier(
                  crawlUrl,
                  supplier.company_name,
                  supplier.country_of_origin
                );
              }
              if (isTimedOut) return;
              const isGroundedSearch = content.startsWith("[PERPLEXITY RESEARCH]");

              if (!content || isBlockedOrEmptyContent(content)) {
                send({ type: "warning", message: `  ✗ Website blocked by challenge or no readable content (${content?.length ?? 0} chars)` });
                await supabaseAdmin
                  .from("supplier_offerings")
                  .update({ scrape_status: "failed", internal_notes: "Website blocked by bot challenge or no content returned" })
                  .eq("id", supplier.id);
                failed.push({ name: supplier.company_name, reason: "Website blocked or no content" });
                await logEvent(
                  "failed",
                  supplier.id,
                  "Website blocked or no content"
                );
                return;
              }

              if (!usedCachedSnapshot) {
                if (isGroundedSearch) {
                  perplexityCount++;
                  send({
                    type: "log",
                    message: `  ✓ Content from Google Search Grounding (${content.length.toLocaleString()} chars)`,
                  });
                  await logEvent(
                    "search_grounding_fallback",
                    supplier.id,
                    `Fetched ${content.length.toLocaleString()} chars via Google Search Grounding`,
                    0,
                    "google_search"
                  );
                } else {
                  const pageCount = content.split("---PAGE BREAK---").length;
                  send({
                    type: "log",
                    message: `  ✓ Fetched ${content.length.toLocaleString()} chars across ${pageCount} page${pageCount !== 1 ? "s" : ""}`,
                  });
                }

                await saveCrawlSnapshot(
                  supabaseAdmin,
                  supplier.id,
                  content,
                  crawlUrl,
                  isGroundedSearch ? "search_grounding" : "firecrawl"
                );
              }

              // ── CLASSIFICATION (sector · role · category) ─────────────────
              send({ type: "log", message: "  → Classifying company..." });
              const cls = await classifyCompany(content, supplier.company_name);
              if (isTimedOut) return;
              await saveClassification(supabaseAdmin, supplier.id, cls, "crawl");

              if (cls.route === "invalid") {
                send({
                  type: "warning",
                  message: `  ✗ INVALID SITE — ${cls.reason}`,
                });
                await supabaseAdmin
                  .from("supplier_offerings")
                  .update({ scrape_status: "skipped", internal_notes: `Invalid site: ${cls.reason}` })
                  .eq("id", supplier.id);
                skippedList.push({ name: supplier.company_name, type: "invalid" });
                await logEvent("skipped", supplier.id, `Invalid site: ${cls.reason}`);
                return;
              }

              if (cls.route === "profiled") {
                send({
                  type: "log",
                  message: `  📇 PROFILED (not a food producer) — ${describeClassification(cls)}`,
                });
                if (cls.offeringsSummary) {
                  send({ type: "log", message: `     ${cls.offeringsSummary}` });
                }
                const { error: skipErr } = await supabaseAdmin
                  .from("supplier_offerings")
                  .update({
                    scrape_status: "skipped",
                    internal_notes: `Profiled: ${cls.sector}/${cls.businessRole ?? "unknown"} — ${cls.reason}`,
                  })
                  .eq("id", supplier.id);
                if (skipErr) {
                  console.error(`[Stream] Failed to update skipped status for ${supplier.company_name}:`, skipErr.message);
                }
                skippedList.push({
                  name: supplier.company_name,
                  type: `${cls.sector}/${cls.businessRole ?? "unknown"}`,
                });
                await logEvent(
                  "skipped",
                  supplier.id,
                  `Profiled (${describeClassification(cls)}): ${cls.reason}`,
                  0,
                  undefined,
                  { sector: cls.sector, business_role: cls.businessRole, category: cls.category }
                );
                return;
              }

              if (cls.failed) {
                send({ type: "warning", message: `  ⚠ Classification unavailable — continuing as food producer` });
              } else if (cls.businessRole && cls.businessRole !== "manufacturer") {
                send({ type: "warning", message: `  ⚠ Mixed company (${cls.businessRole}) — ${cls.reason}` });
              } else {
                send({ type: "log", message: `  ✓ Food producer — ${describeClassification(cls)}` });
              }

              // ── UNIFIED EXTRACT: PRODUCTS & PROFILE IN SINGLE PASS ───────
              send({ type: "log", message: "  → Extracting products & company profile..." });
              const { products, profile } = await extractSupplierFull(content, {
                company_name: supplier.company_name,
                country_of_origin: supplier.country_of_origin,
                certifications: supplier.certifications ?? [],
                categories: supplier.categories ?? [],
              });
              if (isTimedOut) return;

              // Fallback for confirmed food producers whose site only describes general product lines
              if (
                products.length === 0 &&
                !cls.failed &&
                (cls.sector === "food_beverage" || cls.sector === "ingredients_additives") &&
                (cls.offeringsSummary || cls.category || profile.company_description)
              ) {
                const synthesizedName =
                  cls.offeringsSummary?.split(/[.;,]/)[0]?.trim()?.slice(0, 80) ||
                  (cls.category ? `${cls.category} Products` : `${supplier.company_name} Food Line`);
                products.push({
                  product_name: synthesizedName,
                  category: cls.category || (supplier.categories?.[0] ?? "Other"),
                  subcategory: null,
                  description:
                    cls.offeringsSummary ||
                    profile.company_description?.slice(0, 240) ||
                    null,
                  formats: [],
                  sizes: [],
                  brix_level: null,
                  shelf_life_months: null,
                  certifications: supplier.certifications ?? [],
                  kosher_types: [],
                  product_type: "processed_food",
                  primary_ingredients: [],
                  private_label: cls.capabilities?.includes("private_label") ?? false,
                  tags: cls.tags ?? [],
                  markets_suitable: ["Retail", "Foodservice"],
                  confidence: 0.55,
                  needs_review: true,
                });
                send({
                  type: "log",
                  message: `  ℹ Synthesized B2B product line from company profile: "${synthesizedName}"`,
                });
              }

              if (products.length === 0) {
                send({ type: "error", message: "  ✗ No products extracted" });
                await supabaseAdmin
                  .from("supplier_offerings")
                  .update({ scrape_status: "failed", internal_notes: "No products extracted from content" })
                  .eq("id", supplier.id);
                failed.push({ name: supplier.company_name, reason: "No products extracted" });
                await logEvent(
                  "failed",
                  supplier.id,
                  "No products extracted"
                );
                return;
              }

              const detectedLang = products[0]?.detected_language;
              if (detectedLang && detectedLang !== "english") {
                send({
                  type: "log",
                  message: `  🌍 Content language: ${detectedLang}`,
                });
              }

              // ── SAVE PRODUCTS & IMAGES ────────────────────────────────────
              const scrapeSource = isGroundedSearch
                ? `google_search:${supplier.website}`
                : supplier.website!;
              const { count: inserted, imagesSaved } = await insertProducts(
                supplier.id,
                products,
                scrapeSource,
                content,
                supplier.website
              );
              productsSavedCount = inserted;

              // Resolve supplier logo from profile or crawled content or domain favicon
              const { logoCandidates } = extractImagesFromCrawledContent(
                content,
                supplier.website
              );
              const rawLogo =
                toAbsoluteUrl(profile.logo_url, supplier.website) ??
                logoCandidates[0] ??
                getDomainFaviconUrl(supplier.website);
              const hostedLogo = rawLogo
                ? await rehostSupplierLogoToStorage(supplier.id, rawLogo)
                : null;

              await supabaseAdmin
                .from("supplier_offerings")
                .update({
                  scrape_status: "scraped",
                  status: "approved",
                  verified: true,
                  last_scraped_at: new Date().toISOString(),
                  products_found: inserted,
                  internal_notes: null,
                  ...(hostedLogo ? { logo_url: hostedLogo } : {}),
                  ...(profile.company_description
                    ? { product_description: profile.company_description }
                    : {}),
                  ...(profile.contact_email ? { contact_email: profile.contact_email } : {}),
                  ...(profile.contact_phone ? { contact_phone: profile.contact_phone } : {}),
                  ...(profile.contact_name ? { contact_name: profile.contact_name } : {}),
                  ...(profile.linkedin_url ? { linkedin_url: profile.linkedin_url } : {}),
                  ...(profile.export_markets.length > 0
                    ? { export_markets: profile.export_markets }
                    : {}),
                  ...(profile.founded_year ? { founded_year: profile.founded_year } : {}),
                  ...(profile.employees_range
                    ? { employees_range: profile.employees_range }
                    : {}),
                })
                .eq("id", supplier.id);

              if (profile.factories.length > 0) {
                await supabaseAdmin
                  .from("supplier_factories")
                  .delete()
                  .eq("supplier_id", supplier.id);

                await supabaseAdmin.from("supplier_factories").insert(
                  profile.factories.map((f, idx) => ({
                    supplier_id: supplier.id,
                    factory_name: f.factory_name,
                    country: f.country,
                    city: f.city,
                    is_primary: idx === 0,
                    kosher_types: f.kosher_types,
                    kosher_certifying_body: f.kosher_certifying_body,
                    certifications_quality: f.certifications_quality,
                    certifications_dietary: f.certifications_dietary,
                    brc_grade: f.brc_grade,
                    ifs_grade: f.ifs_grade,
                    production_capacity: f.production_capacity,
                  }))
                );

                if (!isTimedOut) {
                  send({
                    type: "log",
                    message: `  🏭 ${profile.factories.length} factory/factories found`,
                  });
                }
              }

              if (!isTimedOut) {
                send({
                  type: "success",
                  message: `  ✓ ${inserted} products saved${imagesSaved > 0 ? ` (${imagesSaved} with images)` : ""}`,
                  data: { products: inserted, supplier: supplier.company_name },
                });
              }

              succeeded.push({ name: supplier.company_name, products: inserted });
              if (timerHandle) clearTimeout(timerHandle);
              await logEvent(
                "success",
                supplier.id,
                `${inserted} products saved`,
                inserted,
                scrapeSource
              );
            })(),
            supplierTimeout,
          ]);
        } catch (err) {
          if (timerHandle) clearTimeout(timerHandle);
          const msg = err instanceof Error ? err.message : String(err);
          if (err instanceof Error && err.message === "Supplier timeout") {
            if (productsSavedCount > 0) {
              send({
                type: "success",
                message: `  ✓ ${productsSavedCount} products saved (profile step timed out)`,
                data: { products: productsSavedCount, supplier: supplier.company_name },
              });
              await supabaseAdmin
                .from("supplier_offerings")
                .update({ scrape_status: "scraped", products_found: productsSavedCount })
                .eq("id", supplier.id);
              succeeded.push({ name: supplier.company_name, products: productsSavedCount });
            } else {
              send({ type: "warning", message: "  ⏱ Timeout — moving to next supplier" });
              await supabaseAdmin
                .from("supplier_offerings")
                .update({
                  scrape_status: "failed",
                  internal_notes: "Timeout: exceeded time limit",
                })
                .eq("id", supplier.id);
              failed.push({ name: supplier.company_name, reason: "Timeout" });
              await logEvent("failed", supplier.id, "Timeout");
            }
          } else {
            const isCircuitBreaker =
              msg.includes("402") ||
              msg.includes("RESOURCE_EXHAUSTED") ||
              msg.includes("prepayment credits are depleted") ||
              msg.includes("organization_on_hold");

            if (isCircuitBreaker) {
              const isSpendCap = msg.includes("spending cap") || msg.includes("monthly spending cap");
              const isFreeQuota = msg.includes("free_tier_requests") || msg.includes("GenerateRequestsPerDay");
              let breakerNotice = "  ⚡ CIRCUIT BREAKER TRIPPED: Google AI Studio prepayment credits depleted (HTTP 402). Pausing scraper safely — remaining suppliers retained as pending.";
              if (isSpendCap) {
                breakerNotice = "  ⚡ CIRCUIT BREAKER TRIPPED: Google Gemini monthly spending cap reached. Check or raise your Spend Cap at https://ai.studio/billing. Pausing scraper safely — remaining suppliers retained as pending.";
              } else if (isFreeQuota) {
                breakerNotice = `  ⚡ CIRCUIT BREAKER TRIPPED: Gemini Free Tier daily limit reached for model ${GEMINI_MODEL}. Pausing scraper safely — remaining suppliers retained as pending.`;
              }
              send({
                type: "error",
                message: breakerNotice,
              });
              // Retain current supplier as pending — do NOT mark failed!
              break;
            }

            send({ type: "error", message: `  ✗ Error: ${msg}` });
            await supabaseAdmin
              .from("supplier_offerings")
              .update({ scrape_status: "failed", internal_notes: msg.slice(0, 500) })
              .eq("id", supplier.id);
            failed.push({ name: supplier.company_name, reason: msg });
            await logEvent("failed", supplier.id, `Error: ${msg}`);
          }
        }

        // Update batch progress in real-time
        if (batchUuidParam) {
          await supabaseAdmin
            .from("scrape_batches")
            .update({
              processed: i + 1,
              success_count: succeeded.length,
              failed_count: failed.length,
              skipped_count: skippedList.length,
              perplexity_fallback_count: perplexityCount,
              products_found: succeeded.reduce((s, r) => s + r.products, 0),
              updated_at: new Date().toISOString(),
            })
            .eq("id", batchUuidParam);
        }

        if (i < suppliers.length - 1) {
          send({ type: "log", message: "  ⚡ Standard Plan: quick 1.5s pause before next supplier..." });
          await sleep(1500);
        }
      }

      // Flush remaining logs
      await logBuffer.flush();

      // Final summary and batch status
      const summaryMsg = `Done — ${succeeded.length} succeeded, ${failed.length} failed, ${skippedList.length} skipped`;
      send({
        type: "summary",
        message: summaryMsg,
        data: {
          succeeded: succeeded.length,
          failed: failed.length,
          skipped: skippedList.length,
          totalProducts: succeeded.reduce((s, r) => s + r.products, 0),
          perplexityFallback: perplexityCount,
        },
      });

      if (batchUuidParam) {
        await supabaseAdmin
          .from("scrape_batches")
          .update({
            status: "finished",
            processed: suppliers.length,
            success_count: succeeded.length,
            failed_count: failed.length,
            skipped_count: skippedList.length,
            perplexity_fallback_count: perplexityCount,
            products_found: succeeded.reduce((s, r) => s + r.products, 0),
            updated_at: new Date().toISOString(),
          })
          .eq("id", batchUuidParam);

        await logEvent(
          "info",
          undefined,
          summaryMsg,
          succeeded.reduce((s, r) => s + r.products, 0)
        );
        await logBuffer.flush();
      }

      send({ type: "done" });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
