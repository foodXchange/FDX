/**
 * Scrape supplier websites and extract structured product data.
 *
 * Run: npx tsx scripts/08-scrape-suppliers.ts
 *   --limit=10       process first N suppliers
 *   --supplier=uuid  process one specific supplier
 *   --force          re-scrape already scraped suppliers
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";
import { crawlSupplier } from "../lib/scraper/crawl";
import { extractProducts } from "../lib/scraper/extract";
import type { ExtractedProduct } from "../lib/scraper/extract";

// ─── Load .env.local ─────────────────────────────────────────────────────────
function loadEnvLocal(): void {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf-8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (key && !process.env[key]) process.env[key] = val;
    }
  } catch {
    // .env.local not found — assume env vars are already set
  }
}

loadEnvLocal();

// ─── Parse CLI args ───────────────────────────────────────────────────────────
const args = (() => {
  const result: {
    limit?: number;
    supplier?: string;
    force: boolean;
  } = { force: false };

  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--limit=")) {
      result.limit = parseInt(arg.slice(8), 10);
    } else if (arg.startsWith("--supplier=")) {
      result.supplier = arg.slice(11);
    } else if (arg === "--force") {
      result.force = true;
    }
  }

  return result;
})();

// ─── Supabase ─────────────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type SupplierRow = {
  id: string;
  company_name: string;
  website: string | null;
  country_of_origin: string | null;
  categories: string[] | null;
  certifications: string[] | null;
  scrape_status: string | null;
};

// ─── Insert products ──────────────────────────────────────────────────────────
async function insertProducts(
  supplierId: string,
  products: ExtractedProduct[],
  scrapeSource: string
): Promise<number> {
  if (products.length === 0) return 0;

  await supabase
    .from("supplier_products")
    .delete()
    .eq("supplier_id", supplierId)
    .eq("manually_verified", false);

  const rows = products.map((p) => ({
    supplier_id: supplierId,
    product_name: p.product_name,
    category: p.category,
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
  }));

  const { error } = await supabase.from("supplier_products").insert(rows);

  if (error) {
    console.error("  Insert error:", error);
    return 0;
  }

  return rows.length;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  if (!process.env.FIRECRAWL_API_KEY) {
    console.error("✗ FIRECRAWL_API_KEY not set");
    process.exit(1);
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("✗ ANTHROPIC_API_KEY not set");
    process.exit(1);
  }

  // Build query — avoid deeply-chained generics by asserting type at the end
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from("supplier_offerings")
    .select(
      "id, company_name, website, country_of_origin, categories, certifications, scrape_status"
    )
    .not("website", "is", null)
    .neq("website", "");

  if (args.supplier) {
    query = query.eq("id", args.supplier);
  } else if (!args.force) {
    query = query.not("scrape_status", "eq", "scraped");
  }

  if (args.limit) {
    query = query.limit(args.limit);
  }

  const { data: suppliers, error } = (await query) as {
    data: SupplierRow[] | null;
    error: { message: string } | null;
  };

  if (error) {
    console.error("✗ Failed to fetch suppliers:", error.message);
    process.exit(1);
  }

  const list = (suppliers ?? []) as SupplierRow[];

  console.log(`\n=== SUPPLIER SCRAPER ===`);
  console.log(`Suppliers to process: ${list.length}\n`);

  let success = 0;
  let failed = 0;
  let totalProducts = 0;

  for (const supplier of list) {
    console.log(`\nProcessing: ${supplier.company_name}`);
    console.log(`  Website: ${supplier.website}`);

    try {
      await supabase
        .from("supplier_offerings")
        .update({ scrape_status: "pending" })
        .eq("id", supplier.id);

      console.log(`  Crawling...`);
      const content = await crawlSupplier(supplier.website!);

      if (!content || content.length < 50) {
        console.log(`  ✗ No content found`);
        await supabase
          .from("supplier_offerings")
          .update({ scrape_status: "failed" })
          .eq("id", supplier.id);
        failed++;
        continue;
      }

      console.log(`  ✓ Fetched ${content.length} chars`);
      console.log(`  Extracting products...`);

      const products = await extractProducts(content, {
        company_name: supplier.company_name,
        country_of_origin: supplier.country_of_origin,
        certifications: supplier.certifications ?? [],
      });

      console.log(`  ✓ Found ${products.length} products`);
      products.forEach((p) => {
        console.log(
          `    - ${p.product_name} (${p.category}) [confidence: ${p.confidence}]`
        );
      });

      const inserted = await insertProducts(
        supplier.id,
        products,
        supplier.website!
      );

      await supabase
        .from("supplier_offerings")
        .update({
          scrape_status: "scraped",
          last_scraped_at: new Date().toISOString(),
          products_found: inserted,
        })
        .eq("id", supplier.id);

      success++;
      totalProducts += inserted;
      console.log(`  ✓ Saved ${inserted} products`);
    } catch (err) {
      console.error(`  ✗ Error:`, err);
      await supabase
        .from("supplier_offerings")
        .update({ scrape_status: "failed" })
        .eq("id", supplier.id);
      failed++;
    }

    await new Promise((r) => setTimeout(r, 2000));
  }

  console.log(`\n=== DONE ===`);
  console.log(`Success: ${success}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total products found: ${totalProducts}`);

  const { count } = await supabase
    .from("supplier_products")
    .select("*", { count: "exact", head: true });
  console.log(`Total products in DB: ${count}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
