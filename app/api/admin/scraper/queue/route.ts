import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { crawlSupplier } from "@/lib/scraper/crawl";
import {
  extractProducts,
  extractSupplierProfile,
  detectManufacturerType,
} from "@/lib/scraper/extract";
import { embedBatch } from "@/lib/ai/embed";
import { mapScraperCategoryToCanonicalId } from "@/lib/pip/resolveCategoryId";

export const dynamic = "force-dynamic";

interface QueueStatus {
  isRunning: boolean;
  currentSupplier: string | null;
  currentBatch: string | null;
  processedCount: number;
  totalPending: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  productsFound: number;
  lastMessage: string | null;
  startedAt: string | null;
  shouldStop: boolean;
}

// Global in-memory singleton state for the server worker
const globalQueueState: QueueStatus = {
  isRunning: false,
  currentSupplier: null,
  currentBatch: null,
  processedCount: 0,
  totalPending: 0,
  successCount: 0,
  failedCount: 0,
  skippedCount: 0,
  productsFound: 0,
  lastMessage: null,
  startedAt: null,
  shouldStop: false,
};

function getHomepage(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return url;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function insertProducts(
  supplierId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  products: any[],
  scrapeSource: string
): Promise<number> {
  if (products.length === 0) return 0;

  let vectors: (number[] | null)[] = [];
  try {
    const embedTexts = products.map((p) => {
      const parts = [
        p.product_name?.trim(),
        p.description?.trim(),
        p.subcategory?.trim(),
        p.tags?.filter(Boolean).join(". ").trim() || null,
      ].filter(Boolean).join(". ");
      return (parts.replace(/\.{2,}/g, ".").replace(/\.\s*$/, "") + ".").replace(/\s+\./g, ".");
    });
    vectors = await embedBatch(embedTexts, "document");
  } catch (e) {
    console.warn("Auto-embedding failed in queue worker:", e);
  }

  const rows = products.map((p, i) => ({
    supplier_id: supplierId,
    product_name: p.product_name,
    category: p.category,
    category_id: mapScraperCategoryToCanonicalId(p.category),
    subcategory: p.subcategory ?? null,
    description: p.description ?? null,
    formats: p.formats ?? [],
    sizes: p.sizes ?? [],
    brix_level: p.brix_level ?? null,
    shelf_life_months: p.shelf_life_months ?? null,
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
    embedding: vectors[i] ? JSON.stringify(vectors[i]) : null,
  }));

  const { error } = await supabaseAdmin.from("supplier_products").insert(rows);
  if (error) return 0;

  const { count } = await supabaseAdmin
    .from("supplier_products")
    .select("id", { count: "exact", head: true })
    .eq("supplier_id", supplierId);
  const product_count = count ?? 0;
  const qualification_status =
    product_count >= 3 ? "strong" : product_count >= 1 ? "thin" : "empty";

  await supabaseAdmin
    .from("supplier_offerings")
    .update({ product_count, qualification_status })
    .eq("id", supplierId);

  return rows.length;
}

// Background processing loop that runs asynchronously
async function runBackgroundQueue() {
  if (globalQueueState.isRunning) return;
  globalQueueState.isRunning = true;
  globalQueueState.shouldStop = false;
  globalQueueState.startedAt = new Date().toISOString();
  globalQueueState.processedCount = 0;
  globalQueueState.successCount = 0;
  globalQueueState.failedCount = 0;
  globalQueueState.skippedCount = 0;
  globalQueueState.productsFound = 0;

  try {
    while (!globalQueueState.shouldStop) {
      // Fetch next batch of pending suppliers across ALL batches
      const { data: pendingSuppliers, error } = await supabaseAdmin
        .from("supplier_offerings")
        .select("id, company_name, website, country_of_origin, categories, certifications, csv_import_batch")
        .eq("scrape_status", "pending")
        .not("website", "is", null)
        .neq("website", "")
        .limit(20);

      if (error || !pendingSuppliers || pendingSuppliers.length === 0) {
        globalQueueState.lastMessage = "All pending suppliers across all batches processed!";
        break;
      }

      // Update remaining pending count
      const { count: remainingCount } = await supabaseAdmin
        .from("supplier_offerings")
        .select("id", { count: "exact", head: true })
        .eq("scrape_status", "pending")
        .not("website", "is", null)
        .neq("website", "");
      globalQueueState.totalPending = remainingCount ?? 0;

      for (const supplier of pendingSuppliers) {
        if (globalQueueState.shouldStop) {
          globalQueueState.lastMessage = "Queue stopped by user.";
          break;
        }

        globalQueueState.currentSupplier = supplier.company_name;
        globalQueueState.currentBatch = supplier.csv_import_batch;
        globalQueueState.lastMessage = `Processing ${supplier.company_name} (${supplier.website})...`;

        const siteUrl = supplier.website ?? "";
        const isBadUrl =
          siteUrl.includes("@") ||
          siteUrl.includes("youtube.com") ||
          siteUrl.includes("linkedin.com") ||
          siteUrl.includes("facebook.com");

        if (isBadUrl) {
          await supabaseAdmin
            .from("supplier_offerings")
            .update({ scrape_status: "skipped", internal_notes: "Social / Email URL" })
            .eq("id", supplier.id);
          globalQueueState.skippedCount++;
          globalQueueState.processedCount++;
          continue;
        }

        // Domain Deduplication Guard
        let normalizedHost = "";
        try {
          const u = new URL(siteUrl.startsWith("http") ? siteUrl : "http://" + siteUrl);
          normalizedHost = u.hostname.replace(/^www\./, "").toLowerCase().trim();
        } catch {}

        if (normalizedHost && normalizedHost.length > 3) {
          const { data: existingScraped } = await supabaseAdmin
            .from("supplier_offerings")
            .select("id, product_count, qualification_status, product_description, contact_email, contact_phone, contact_name, linkedin_url, export_markets, founded_year, employees_range")
            .ilike("website", `%${normalizedHost}%`)
            .eq("scrape_status", "scraped")
            .neq("id", supplier.id)
            .limit(1);

          if (existingScraped && existingScraped.length > 0) {
            const src = existingScraped[0];
            await supabaseAdmin
              .from("supplier_offerings")
              .update({
                scrape_status: "scraped",
                qualification_status: src.qualification_status ?? "strong",
                product_count: src.product_count ?? 0,
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

            const { data: srcProducts } = await supabaseAdmin
              .from("supplier_products")
              .select("product_name, category, subcategory, description, formats, sizes, brix_level, shelf_life_months, certifications, kosher_types, product_type, primary_ingredients, private_label, tags, markets_suitable, scrape_source, scrape_confidence, embedding")
              .eq("supplier_id", src.id);

            if (srcProducts && srcProducts.length > 0) {
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
              globalQueueState.productsFound += newProducts.length;
            }

            globalQueueState.successCount++;
            globalQueueState.processedCount++;
            continue;
          }
        }

        // Execute Crawl & AI Extraction
        let timerHandle: NodeJS.Timeout | undefined;
        const timeoutPromise = new Promise<never>((_, reject) => {
          timerHandle = setTimeout(() => reject(new Error("Supplier timeout")), 75000);
        });

        try {
          await Promise.race([
            (async () => {
              const crawlUrl = getHomepage(supplier.website!);
              const content = await crawlSupplier(
                crawlUrl,
                supplier.company_name,
                supplier.country_of_origin
              );
              const isPerplexity = content.startsWith("[PERPLEXITY RESEARCH]");

              if (!content || content.length < 50) {
                await supabaseAdmin
                  .from("supplier_offerings")
                  .update({ scrape_status: "failed", internal_notes: "No content returned from scraper" })
                  .eq("id", supplier.id);
                globalQueueState.failedCount++;
                return;
              }

              // Manufacturer Detection
              const mfr = await detectManufacturerType(content, supplier.company_name);
              const shouldSkip =
                !mfr.isManufacturer &&
                !["manufacturer", "mixed", "unknown"].includes(mfr.companyType) &&
                mfr.confidence >= 0.4;

              if (shouldSkip) {
                await supabaseAdmin
                  .from("supplier_offerings")
                  .update({
                    scrape_status: "skipped",
                    internal_notes: `Auto-skipped: ${mfr.companyType}`,
                    ...(mfr.companyType === "non_food" ? { supplier_type: "non_food" } : {}),
                  })
                  .eq("id", supplier.id);
                globalQueueState.skippedCount++;
                return;
              }

              // Product Extraction
              const products = await extractProducts(content, {
                company_name: supplier.company_name,
                country_of_origin: supplier.country_of_origin,
                certifications: supplier.certifications ?? [],
              });

              if (products.length === 0) {
                await supabaseAdmin
                  .from("supplier_offerings")
                  .update({ scrape_status: "failed", internal_notes: "No products extracted from content" })
                  .eq("id", supplier.id);
                globalQueueState.failedCount++;
                return;
              }

              const scrapeSource = isPerplexity ? `research:${supplier.website}` : supplier.website!;
              const inserted = await insertProducts(supplier.id, products, scrapeSource);

              // Profile Extraction
              const profile = await extractSupplierProfile(content, supplier.company_name, {
                country: supplier.country_of_origin,
              });

              await supabaseAdmin
                .from("supplier_offerings")
                .update({
                  scrape_status: "scraped",
                  last_scraped_at: new Date().toISOString(),
                  products_found: inserted,
                  ...(profile.company_description ? { product_description: profile.company_description } : {}),
                  ...(profile.contact_email ? { contact_email: profile.contact_email } : {}),
                  ...(profile.contact_phone ? { contact_phone: profile.contact_phone } : {}),
                  ...(profile.contact_name ? { contact_name: profile.contact_name } : {}),
                  ...(profile.linkedin_url ? { linkedin_url: profile.linkedin_url } : {}),
                  ...(profile.export_markets.length > 0 ? { export_markets: profile.export_markets } : {}),
                  ...(profile.founded_year ? { founded_year: profile.founded_year } : {}),
                  ...(profile.employees_range ? { employees_range: profile.employees_range } : {}),
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
              }

              globalQueueState.successCount++;
              globalQueueState.productsFound += inserted;
            })(),
            timeoutPromise,
          ]);
        } catch {
          await supabaseAdmin
            .from("supplier_offerings")
            .update({ scrape_status: "failed", internal_notes: "Timeout or network error" })
            .eq("id", supplier.id);
          globalQueueState.failedCount++;
        } finally {
          if (timerHandle) clearTimeout(timerHandle);
          globalQueueState.processedCount++;
        }

        // Fast 1.5s interval between requests on Firecrawl Standard
        await sleep(1500);
      }
    }
  } catch (err) {
    console.error("Queue worker fatal error:", err);
    globalQueueState.lastMessage = `Worker error: ${err instanceof Error ? err.message : String(err)}`;
  } finally {
    globalQueueState.isRunning = false;
    globalQueueState.currentSupplier = null;
  }
}

// GET: Returns current background queue state
export async function GET() {
  const { count: pendingCount } = await supabaseAdmin
    .from("supplier_offerings")
    .select("id", { count: "exact", head: true })
    .eq("scrape_status", "pending")
    .not("website", "is", null)
    .neq("website", "");

  globalQueueState.totalPending = pendingCount ?? 0;

  return NextResponse.json({
    ok: true,
    state: globalQueueState,
  });
}

// POST: Start or Stop the queue
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action;

    if (action === "start") {
      if (globalQueueState.isRunning) {
        return NextResponse.json({ ok: true, message: "Queue is already running", state: globalQueueState });
      }
      // Start background worker without blocking the HTTP response
      runBackgroundQueue().catch((e) => console.error("Background queue error:", e));
      return NextResponse.json({ ok: true, message: "Autonomous queue started", state: globalQueueState });
    }

    if (action === "stop") {
      globalQueueState.shouldStop = true;
      globalQueueState.lastMessage = "Stopping queue after current supplier...";
      return NextResponse.json({ ok: true, message: "Queue stop requested", state: globalQueueState });
    }

    return NextResponse.json({ ok: false, error: "Invalid action. Use 'start' or 'stop'." }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
