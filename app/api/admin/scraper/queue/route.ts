import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { crawlSupplier } from "@/lib/scraper/crawl";
import {
  extractProducts,
  extractSupplierProfile,
  extractSupplierFull,
} from "@/lib/scraper/extract";
import { classifyCompany, saveClassification, saveCrawlSnapshot } from "@/lib/scraper/classify";
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  products: any[],
  scrapeSource: string,
  crawledContent = "",
  supplierWebsite: string | null = null
): Promise<number> {
  if (products.length === 0) return 0;

  // Additive Smart-Merge & Never-Downgrade Guard:
  // Preserve any existing products that were not re-extracted in this run, and only replace
  // unverified rows that match newly extracted product names (upgrading their photos, specs & embeddings).
  const { data: existingRows } = await supabaseAdmin
    .from("supplier_products")
    .select("id, product_name, manually_verified, image_url")
    .eq("supplier_id", supplierId);

  const existingImageByNormName = new Map<string, string>();
  const verifiedNames = new Set<string>();
  const duplicateUnverifiedIdsToDelete: string[] = [];
  const incomingNormNames = new Set(
    products
      .map((p) => (typeof p?.product_name === "string" ? p.product_name.trim().toLowerCase() : ""))
      .filter(Boolean)
  );

  for (const row of existingRows || []) {
    const norm = (row.product_name || "").trim().toLowerCase();
    if (!norm) continue;
    if (row.image_url && !existingImageByNormName.has(norm)) {
      existingImageByNormName.set(norm, row.image_url);
    }
    if (row.manually_verified) {
      verifiedNames.add(norm);
    } else if (incomingNormNames.has(norm)) {
      duplicateUnverifiedIdsToDelete.push(row.id);
    }
  }

  // Filter out incoming products that already exist as manually_verified
  const dedupedProducts: any[] = [];
  const seenIncoming = new Set<string>();
  for (const p of products) {
    const norm = (typeof p?.product_name === "string" ? p.product_name.trim().toLowerCase() : "");
    if (!norm || verifiedNames.has(norm) || seenIncoming.has(norm)) continue;
    seenIncoming.add(norm);
    dedupedProducts.push(p);
  }

  if (dedupedProducts.length === 0) {
    return existingRows?.length ?? 0;
  }
  products = dedupedProducts;

  if (duplicateUnverifiedIdsToDelete.length > 0) {
    await supabaseAdmin
      .from("supplier_products")
      .delete()
      .in("id", duplicateUnverifiedIdsToDelete);
  }

  const { productImages } = extractImagesFromCrawledContent(
    crawledContent,
    supplierWebsite
  );

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

  let vectors: (number[] | null)[] = [];
  try {
    const embedTexts = products.map((p) => buildRichProductEmbeddingText(p));
    vectors = await embedBatch(embedTexts, "document");
  } catch (e) {
    console.warn("Auto-embedding failed in queue worker:", e);
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
      image_url:
        resolvedImages[i] ??
        existingImageByNormName.get((p.product_name || "").trim().toLowerCase()) ??
        null,
      image_source: resolvedImages[i] ? "scraper" : null,
      embedding: vectors[i] ? JSON.stringify(vectors[i]) : null,
    };
  });

  const { error } = await supabaseAdmin.from("supplier_products").insert(rows);
  if (error) return existingRows?.length ?? 0;

  const { count } = await supabaseAdmin
    .from("supplier_products")
    .select("id", { count: "exact", head: true })
    .eq("supplier_id", supplierId);
  const product_count = count ?? 0;
  const qualification_status =
    product_count >= 3 ? "strong" : product_count >= 1 ? "thin" : "empty";

  // Roll up distinct categories, certifications, and kosher types to the supplier profile
  const distinctCategories = Array.from(
    new Set(products.map((p) => p.category).filter(Boolean))
  );
  const distinctCerts = Array.from(
    new Set(products.flatMap((p) => p.certifications || []).filter(Boolean))
  );
  const distinctKosher = Array.from(
    new Set(products.flatMap((p) => p.kosher_types || []).filter(Boolean))
  );

  await supabaseAdmin
    .from("supplier_offerings")
    .update({
      product_count,
      products_found: product_count,
      qualification_status,
      status: "approved",
      verified: true,
      ...(distinctCategories.length > 0 ? { categories: distinctCategories } : {}),
      ...(distinctCerts.length > 0 ? { certifications: distinctCerts } : {}),
      ...(distinctKosher.length > 0 ? { kosher_types: distinctKosher } : {}),
    })
    .eq("id", supplierId);

  return product_count;
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
      // Fetch next batch of pending suppliers across ALL batches (fresh unclassified food manufacturers first!)
      const { data: pendingSuppliers, error } = await supabaseAdmin
        .from("supplier_offerings")
        .select("id, company_name, website, country_of_origin, categories, certifications, csv_import_batch")
        .eq("scrape_status", "pending")
        .not("website", "is", null)
        .neq("website", "")
        .order("classified_at", { ascending: true, nullsFirst: true })
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
              const copiedCount = newProducts.length;
              globalQueueState.productsFound += copiedCount;

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

              globalQueueState.successCount++;
              globalQueueState.processedCount++;
              continue;
            }
          }
        }

        // Execute Crawl & AI Extraction
        let timerHandle: NodeJS.Timeout | undefined;
        let isTimedOut = false;
        let productsSavedCount = 0;
        const timeoutPromise = new Promise<never>((_, reject) => {
          timerHandle = setTimeout(() => {
            isTimedOut = true;
            reject(new Error("Supplier timeout"));
          }, 120000);
        });

        try {
          await Promise.race([
            (async () => {
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
                existingSnap.content.length >= 250
              ) {
                content = existingSnap.content;
                usedCachedSnapshot = true;
                globalQueueState.lastMessage = `⚡ Using cached website snapshot for ${supplier.company_name} (0 Firecrawl credits)...`;
              } else {
                content = await crawlSupplier(
                  crawlUrl,
                  supplier.company_name,
                  supplier.country_of_origin
                );
              }
              if (isTimedOut) return;
              const isGroundedSearch = content.startsWith("[PERPLEXITY RESEARCH]");

              if (!content || content.length < 50) {
                const { count: prevProds } = await supabaseAdmin
                  .from("supplier_products")
                  .select("id", { count: "exact", head: true })
                  .eq("supplier_id", supplier.id);
                if ((prevProds ?? 0) > 0) {
                  await supabaseAdmin
                    .from("supplier_offerings")
                    .update({
                      scrape_status: "scraped",
                      products_found: prevProds,
                      product_count: prevProds,
                      last_scraped_at: new Date().toISOString(),
                    })
                    .eq("id", supplier.id);
                  globalQueueState.successCount++;
                  return;
                }
                await supabaseAdmin
                  .from("supplier_offerings")
                  .update({ scrape_status: "failed", internal_notes: "No content returned from scraper" })
                  .eq("id", supplier.id);
                globalQueueState.failedCount++;
                return;
              }

              // Classification (sector · role · category)
              if (!usedCachedSnapshot) {
                await saveCrawlSnapshot(
                  supabaseAdmin,
                  supplier.id,
                  content,
                  crawlUrl,
                  isGroundedSearch ? "perplexity" : "firecrawl"
                );
              }
              const cls = await classifyCompany(content, supplier.company_name);
              if (isTimedOut) return;
              await saveClassification(supabaseAdmin, supplier.id, cls, "crawl");

              if (cls.route !== "food_pipeline") {
                const { error: skipErr } = await supabaseAdmin
                  .from("supplier_offerings")
                  .update({
                    scrape_status: "skipped",
                    internal_notes:
                      cls.route === "invalid"
                        ? `Invalid site: ${cls.reason}`
                        : `Profiled: ${cls.sector}/${cls.businessRole ?? "unknown"} — ${cls.reason}`,
                  })
                  .eq("id", supplier.id);
                if (skipErr) {
                  console.error(`[Queue] Failed to update skipped status for ${supplier.company_name}:`, skipErr.message);
                }
                globalQueueState.skippedCount++;
                return;
              }

              // Unified single-pass product & profile extraction
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
              }

              if (products.length === 0) {
                const { count: prevProds } = await supabaseAdmin
                  .from("supplier_products")
                  .select("id", { count: "exact", head: true })
                  .eq("supplier_id", supplier.id);
                if ((prevProds ?? 0) > 0) {
                  await supabaseAdmin
                    .from("supplier_offerings")
                    .update({
                      scrape_status: "scraped",
                      products_found: prevProds,
                      product_count: prevProds,
                      last_scraped_at: new Date().toISOString(),
                    })
                    .eq("id", supplier.id);
                  globalQueueState.successCount++;
                  return;
                }
                await supabaseAdmin
                  .from("supplier_offerings")
                  .update({ scrape_status: "failed", internal_notes: "No products extracted from content" })
                  .eq("id", supplier.id);
                globalQueueState.failedCount++;
                return;
              }

              const scrapeSource = isGroundedSearch ? `google_search:${supplier.website}` : supplier.website!;
              const inserted = await insertProducts(
                supplier.id,
                products,
                scrapeSource,
                content,
                supplier.website
              );
              productsSavedCount = inserted;

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
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          const isCircuitBreaker =
            msg.includes("402") ||
            msg.includes("RESOURCE_EXHAUSTED") ||
            msg.includes("prepayment credits are depleted") ||
            msg.includes("organization_on_hold");

          if (isCircuitBreaker) {
            console.error("⚡ CIRCUIT BREAKER TRIPPED in queue runner:", msg);
            globalQueueState.lastMessage = `⚡ Circuit breaker tripped (Google Gemini / AI quota exhausted). Pausing queue safely.`;
            globalQueueState.isRunning = false;
            globalQueueState.shouldStop = true;
            // Retain supplier as pending — do NOT mark failed!
            break;
          }

          if (productsSavedCount > 0) {
            await supabaseAdmin
              .from("supplier_offerings")
              .update({ scrape_status: "scraped", products_found: productsSavedCount })
              .eq("id", supplier.id);
            globalQueueState.successCount++;
            globalQueueState.productsFound += productsSavedCount;
          } else {
            const { count: prevProds } = await supabaseAdmin
              .from("supplier_products")
              .select("id", { count: "exact", head: true })
              .eq("supplier_id", supplier.id);
            if ((prevProds ?? 0) > 0) {
              await supabaseAdmin
                .from("supplier_offerings")
                .update({
                  scrape_status: "scraped",
                  products_found: prevProds,
                  product_count: prevProds,
                  last_scraped_at: new Date().toISOString(),
                })
                .eq("id", supplier.id);
              globalQueueState.successCount++;
            } else {
              await supabaseAdmin
                .from("supplier_offerings")
                .update({ scrape_status: "failed", internal_notes: "Timeout or network error" })
                .eq("id", supplier.id);
              globalQueueState.failedCount++;
            }
          }
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
