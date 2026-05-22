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
import {
  extractProducts,
  extractSupplierProfile,
  detectManufacturerType,
} from "../lib/scraper/extract";
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
  status: string | null;
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
    needs_review: p.needs_review ?? false,
  }));

  const { error } = await supabase.from("supplier_products").insert(rows);
  if (error) {
    console.error("  Insert error:", error);
    return 0;
  }
  return rows.length;
}

// ─── Display helpers ──────────────────────────────────────────────────────────
const SEP = "━".repeat(52);
const SEP2 = "═".repeat(52);

function confidenceBar(score: number): string {
  const filled = Math.round(score * 10);
  return "█".repeat(filled) + "░".repeat(10 - filled);
}

function pad(str: string, width: number): string {
  return str.length >= width ? str.slice(0, width) : str + " ".repeat(width - str.length);
}

function getHomepage(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return url;
  }
}

function printSummaryTable(
  rows: { col1: string; col2: string; col3?: string }[],
  headers: { col1: string; col2: string; col3?: string },
  widths: { col1: number; col2: number; col3?: number }
): void {
  const hasCol3 = headers.col3 !== undefined;
  const totalWidth =
    widths.col1 + widths.col2 + (hasCol3 && widths.col3 ? widths.col3 : 0) + (hasCol3 ? 6 : 4);

  console.log("┌" + "─".repeat(totalWidth) + "┐");

  const headerLine = hasCol3 && widths.col3
    ? `│ ${pad(headers.col1, widths.col1)} ${pad(headers.col2, widths.col2)} ${pad(headers.col3!, widths.col3)} │`
    : `│ ${pad(headers.col1, widths.col1)} ${pad(headers.col2, widths.col2)} │`;
  console.log(headerLine);

  for (const row of rows) {
    const line = hasCol3 && widths.col3
      ? `│ ${pad(row.col1, widths.col1)} ${pad(row.col2, widths.col2)} ${pad(row.col3 ?? "", widths.col3)} │`
      : `│ ${pad(row.col1, widths.col1)} ${pad(row.col2, widths.col2)} │`;
    console.log(line);
  }

  console.log("└" + "─".repeat(totalWidth) + "┘");
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
      "id, company_name, website, country_of_origin, categories, certifications, scrape_status, status"
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

  const startTime = Date.now();

  const succeeded: { name: string; products: number; avgConfidence: number }[] = [];
  const failed: { name: string; reason: string }[] = [];
  const skipped: { name: string; reason: string; type: string }[] = [];
  let totalProducts = 0;

  console.log(`\n${SEP2}`);
  console.log(`  SUPPLIER SCRAPER`);
  console.log(`  Suppliers to process: ${list.length}`);
  console.log(SEP2);

  for (let i = 0; i < list.length; i++) {
    const supplier = list[i];
    const supplierStart = Date.now();

    console.log(`\n${SEP}`);
    console.log(`[${i + 1}/${list.length}] ${supplier.company_name}`);
    console.log(SEP);
    console.log(`  Country:  ${supplier.country_of_origin ?? "Unknown"}`);
    console.log(`  Website:  ${supplier.website}`);
    console.log(`  Status:   ${supplier.status ?? "unknown"}`);

    try {
      await supabase
        .from("supplier_offerings")
        .update({ scrape_status: "pending" })
        .eq("id", supplier.id);

      // ── Step 1: Crawl ───────────────────────────────────────────────────
      console.log(`\n  → Crawling website...`);
      const crawlUrl = getHomepage(supplier.website!);
      if (crawlUrl !== supplier.website) {
        console.log(`  ℹ Using homepage: ${crawlUrl}`);
      }
      const content = await crawlSupplier(crawlUrl, supplier.company_name, supplier.country_of_origin);
      const isPerplexity = content.startsWith("[PERPLEXITY RESEARCH]");

      if (!content || content.length < 50) {
        console.log(`  ✗ Website blocked or no content`);
        console.log(`  ℹ Try manually: ${supplier.website}`);
        await supabase
          .from("supplier_offerings")
          .update({ scrape_status: "failed" })
          .eq("id", supplier.id);
        failed.push({ name: supplier.company_name, reason: "No content returned" });
        const elapsed = ((Date.now() - supplierStart) / 1000).toFixed(1);
        console.log(`\n  Time taken: ${elapsed}s`);
        await new Promise((r) => setTimeout(r, 25000));
        continue;
      }

      if (isPerplexity) {
        console.log(`  ✓ Content from Perplexity research (${content.length.toLocaleString()} chars)`);
      } else {
        const pageCount = content.split("---PAGE BREAK---").length;
        console.log(
          `  ✓ Fetched ${content.length.toLocaleString()} chars across ${pageCount} page${pageCount !== 1 ? "s" : ""}`
        );
      }

      // ── Step 2: Manufacturer detection ──────────────────────────────────
      console.log(`\n  → Checking if manufacturer...`);
      const mfr = await detectManufacturerType(content, supplier.company_name);

      const shouldSkip =
        !mfr.isManufacturer &&
        !["manufacturer", "mixed", "unknown"].includes(mfr.companyType) &&
        mfr.confidence >= 0.4;

      if (shouldSkip) {
        console.log(`  ✗ SKIPPED — Not a manufacturer: ${mfr.reason}`);
        console.log(`    Type detected: ${mfr.companyType}`);
        await supabase
          .from("supplier_offerings")
          .update({
            scrape_status: "skipped",
            internal_notes: `Auto-skipped: ${mfr.companyType} — ${mfr.reason}`,
          })
          .eq("id", supplier.id);
        skipped.push({
          name: supplier.company_name,
          reason: mfr.reason,
          type: mfr.companyType,
        });
        const elapsed = ((Date.now() - supplierStart) / 1000).toFixed(1);
        console.log(`\n  Time taken: ${elapsed}s`);
        await new Promise((r) => setTimeout(r, 25000));
        continue;
      }

      if (mfr.companyType === "mixed") {
        console.log(`  ⚠ Mixed company — extracting manufacturer products only`);
        console.log(`    ${mfr.reason}`);
      } else if (mfr.confidence < 0.4) {
        console.log(`  ⚠ Cannot determine type (low confidence) — proceeding with extraction`);
        console.log(`    ${mfr.reason}`);
      } else {
        console.log(`  ✓ Confirmed manufacturer: ${mfr.reason}`);
      }

      // ── Step 3: Extract products ─────────────────────────────────────────
      console.log(`\n  → Extracting products...`);
      const products = await extractProducts(content, {
        company_name: supplier.company_name,
        country_of_origin: supplier.country_of_origin,
        certifications: supplier.certifications ?? [],
      });

      if (products.length === 0) {
        console.log(`  ✗ Products not found in content`);
        console.log(`  ℹ Site may be JavaScript-heavy`);
        console.log(`  ℹ Add manually via /admin/suppliers`);
        await supabase
          .from("supplier_offerings")
          .update({ scrape_status: "failed" })
          .eq("id", supplier.id);
        failed.push({ name: supplier.company_name, reason: "No products extracted" });
        const elapsed = ((Date.now() - supplierStart) / 1000).toFixed(1);
        console.log(`\n  Time taken: ${elapsed}s`);
        await new Promise((r) => setTimeout(r, 25000));
        continue;
      }

      const avgConfidence =
        products.reduce((sum, p) => sum + (p.confidence ?? 0), 0) /
        products.length;

      console.log(`  ✓ Found ${products.length} products:`);
      const detectedLang = products[0]?.detected_language;
      if (detectedLang && detectedLang !== "english") {
        console.log(`  🌍 Content language: ${detectedLang}`);
      }
      products.forEach((p, idx) => {
        const formatsStr =
          (p.formats ?? []).length > 0
            ? (p.formats ?? []).join(", ")
            : "—";
        const certsStr =
          (p.certifications ?? []).length > 0
            ? (p.certifications ?? []).join(", ")
            : "—";
        const conf = p.confidence ?? 0;
        const reviewFlag = p.needs_review ? " ⚠ review" : "";
        console.log(`     ${idx + 1}. ${p.product_name} (${p.category})${reviewFlag}`);
        console.log(`        Formats: ${formatsStr}`);
        console.log(`        Certs:   ${certsStr}`);
        console.log(`        Conf:    ${confidenceBar(conf)}  ${conf.toFixed(1)}`);
      });

      // ── Step 4: Save to database ─────────────────────────────────────────
      console.log(`\n  → Saving to database...`);
      const scrapeSource = isPerplexity
        ? `perplexity:${supplier.website}`
        : supplier.website!;
      const inserted = await insertProducts(
        supplier.id,
        products,
        scrapeSource
      );

      const internalNote =
        mfr.companyType === "mixed"
          ? `Mixed company: ${mfr.reason}`
          : undefined;

      await supabase
        .from("supplier_offerings")
        .update({
          scrape_status: "scraped",
          last_scraped_at: new Date().toISOString(),
          products_found: inserted,
          ...(internalNote ? { internal_notes: internalNote } : {}),
        })
        .eq("id", supplier.id);

      console.log(`  ✓ Saved ${inserted} products`);

      // ── Step 5: Extract supplier profile + factories ─────────────────────
      console.log(`\n  → Extracting company profile...`);
      const profile = await extractSupplierProfile(content, supplier.company_name, {
        country: supplier.country_of_origin,
        categories: supplier.categories ?? [],
      });

      await supabase
        .from("supplier_offerings")
        .update({
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
        // Delete existing unverified factories then insert new ones
        await supabase
          .from("supplier_factories")
          .delete()
          .eq("supplier_id", supplier.id);

        await supabase.from("supplier_factories").insert(
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

        console.log(`  🏭 Factories: ${profile.factories.length}`);
        profile.factories.forEach((f) => {
          const kosher =
            f.kosher_types.length > 0
              ? `✡ ${f.kosher_types.join(", ")}`
              : "No kosher";
          const certs = [
            ...f.certifications_quality,
            ...f.certifications_dietary,
          ].join(", ") || "No certs";
          console.log(`     ${f.factory_name} (${f.country ?? "?"})`);
          console.log(`     ${kosher} · ${certs}`);
        });
      }

      succeeded.push({
        name: supplier.company_name,
        products: inserted,
        avgConfidence,
      });
      totalProducts += inserted;
    } catch (err) {
      console.error(`  ✗ Error:`, err);
      await supabase
        .from("supplier_offerings")
        .update({ scrape_status: "failed" })
        .eq("id", supplier.id);
      failed.push({
        name: supplier.company_name,
        reason: err instanceof Error ? err.message : String(err),
      });
    }

    const elapsed = ((Date.now() - supplierStart) / 1000).toFixed(1);
    console.log(`\n  Time taken: ${elapsed}s`);

    await new Promise((r) => setTimeout(r, 25000));
  }

  // ─── Summary ───────────────────────────────────────────────────────────────
  const totalElapsed = Date.now() - startTime;
  const mins = Math.floor(totalElapsed / 60000);
  const secs = Math.floor((totalElapsed % 60000) / 1000);
  const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

  const overallAvgConf =
    succeeded.length > 0
      ? succeeded.reduce((s, r) => s + r.avgConfidence, 0) / succeeded.length
      : 0;

  const successRate =
    list.length > 0
      ? Math.round((succeeded.length / list.length) * 100)
      : 0;

  console.log(`\n${SEP2}`);
  console.log(`  SCRAPER SUMMARY`);
  console.log(SEP2);

  if (succeeded.length > 0) {
    console.log(`\n✓ SUCCEEDED (${succeeded.length} ${succeeded.length === 1 ? "company" : "companies"}):`);
    printSummaryTable(
      succeeded.map((r) => ({
        col1: r.name,
        col2: String(r.products),
        col3: r.avgConfidence.toFixed(1),
      })),
      { col1: "Company", col2: "Products", col3: "Conf" },
      { col1: 32, col2: 8, col3: 5 }
    );
  }

  if (failed.length > 0) {
    console.log(`\n✗ FAILED (${failed.length} ${failed.length === 1 ? "company" : "companies"}):`);
    printSummaryTable(
      failed.map((r) => ({
        col1: r.name,
        col2: r.reason.slice(0, 22),
      })),
      { col1: "Company", col2: "Reason" },
      { col1: 32, col2: 22 }
    );
  }

  if (skipped.length > 0) {
    console.log(`\n⊘ SKIPPED (${skipped.length} ${skipped.length === 1 ? "company" : "companies"}):`);
    printSummaryTable(
      skipped.map((r) => ({
        col1: r.name,
        col2: r.type,
        col3: r.reason.slice(0, 20),
      })),
      { col1: "Company", col2: "Type", col3: "Reason" },
      { col1: 28, col2: 16, col3: 20 }
    );
  }

  console.log(`\n  Total products added to database: ${totalProducts}`);
  console.log(`  Average confidence:               ${overallAvgConf.toFixed(2)}`);
  console.log(`  Success rate:                     ${successRate}%`);
  console.log(`  Time elapsed:                     ${timeStr}`);

  const { count } = await supabase
    .from("supplier_products")
    .select("*", { count: "exact", head: true });
  console.log(`  Total products in DB:             ${count}`);
  console.log(`\n${SEP2}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
