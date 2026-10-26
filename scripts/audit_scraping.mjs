import { createClient } from "@supabase/supabase-js";
import fs from "fs";

// Load .env.local manually
const envContent = fs.readFileSync(".env.local", "utf-8");
const envVars = {};
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
    const idx = trimmed.indexOf("=");
    const k = trimmed.slice(0, idx).trim();
    let v = trimmed.slice(idx + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    envVars[k] = v;
  }
}

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log("=== DEEP DIVE: SUPPLIER SCHEMA & SCRAPING RESULTS ===");

  // 1. Column discovery on supplier_offerings
  const { data: sampleRow, error: sampleErr } = await supabase
    .from("supplier_offerings")
    .select("*")
    .limit(1);

  if (sampleRow && sampleRow.length > 0) {
    console.log("\n--- SUPPLIER_OFFERINGS COLUMNS ---");
    console.log(Object.keys(sampleRow[0]).sort().join(", "));
  }

  // 2. Column discovery on supplier_products
  const { data: sampleProd } = await supabase
    .from("supplier_products")
    .select("*")
    .limit(1);

  if (sampleProd && sampleProd.length > 0) {
    console.log("\n--- SUPPLIER_PRODUCTS COLUMNS ---");
    console.log(Object.keys(sampleProd[0]).sort().join(", "));
  }

  // 3. Count null scrape_status
  const { count: nullScrapeCount } = await supabase
    .from("supplier_offerings")
    .select("id", { count: "exact", head: true })
    .is("scrape_status", null);

  console.log(`\nSuppliers with scrape_status IS NULL: ${nullScrapeCount}`);

  // Count suppliers with a valid website
  const { count: withWebsiteCount } = await supabase
    .from("supplier_offerings")
    .select("id", { count: "exact", head: true })
    .not("website", "is", null)
    .neq("website", "");

  console.log(`Suppliers with valid website: ${withWebsiteCount}`);

  // 4. Inspect Failed Scrapes - Why did 630 fail?
  console.log("\n--- FAILED SCRAPES SAMPLE (10 Records) ---");
  const { data: failedSample } = await supabase
    .from("supplier_offerings")
    .select("id, company_name, website, country_of_origin, scrape_status, product_count, notes, internal_notes")
    .eq("scrape_status", "failed")
    .limit(10);

  failedSample?.forEach((f) => {
    console.log(`- ${f.company_name} | URL: ${f.website} | Notes: ${f.notes || f.internal_notes || "No error note"}`);
  });

  // 5. Inspect 10 Most Recently Scraped Suppliers (Success)
  console.log("\n--- RECENTLY SCRAPED SUPPLIERS (SUCCESSFUL) ---");
  const { data: recentScraped } = await supabase
    .from("supplier_offerings")
    .select("id, company_name, website, country_of_origin, categories, certifications, scrape_status, last_scraped_at, product_count, qualification_status, trust_score, verified, logo_url")
    .eq("scrape_status", "scraped")
    .order("last_scraped_at", { ascending: false })
    .limit(10);

  recentScraped?.forEach((s, idx) => {
    console.log(`\n[${idx + 1}] ${s.company_name} (${s.country_of_origin || "N/A"})`);
    console.log(`    Website: ${s.website}`);
    console.log(`    Last Scraped At: ${s.last_scraped_at}`);
    console.log(`    Product Count: ${s.product_count} | Qualification: ${s.qualification_status} | Trust Score: ${s.trust_score}`);
    console.log(`    Categories: ${JSON.stringify(s.categories)}`);
    console.log(`    Certifications: ${JSON.stringify(s.certifications)}`);
    console.log(`    Logo URL: ${s.logo_url ? s.logo_url.slice(0, 60) + "..." : "None"}`);
  });

  // 6. Inspect products linked to one of these recently scraped suppliers
  if (recentScraped && recentScraped.length > 0) {
    const topSupplier = recentScraped.find((s) => (s.product_count || 0) > 0) || recentScraped[0];
    console.log(`\n--- PRODUCTS LINKED TO SUPPLIER: "${topSupplier.company_name}" (${topSupplier.id}) ---`);
    const { data: prods } = await supabase
      .from("supplier_products")
      .select("id, product_name, category, subcategory, certifications, kosher_types, formats, sizes, image_url, scrape_source, embedding")
      .eq("supplier_id", topSupplier.id)
      .limit(6);

    console.log(`Found ${prods?.length || 0} products:`);
    prods?.forEach((p) => {
      const hasEmb = !!p.embedding;
      console.log(`  * "${p.product_name}" | Category: ${p.category} | Sub: ${p.subcategory}`);
      console.log(`    Certs: ${JSON.stringify(p.certifications)} | Kosher: ${JSON.stringify(p.kosher_types)} | Formats: ${JSON.stringify(p.formats)}`);
      console.log(`    Has Embedding: ${hasEmb} | Has Image: ${!!p.image_url} | Image URL: ${p.image_url ? p.image_url.slice(0, 50) + "..." : "None"}`);
    });
  }

  // 7. Check Database Foreign Keys & Indexes using Postgres RPC or information_schema if available
  console.log("\n--- INDEXES & PERFORMANCE AUDIT ---");
  // Check index on supplier_products(supplier_id)
  const { data: indexCheck, error: idxErr } = await supabase.rpc("exec_sql", {
    query: `SELECT tablename, indexname, indexdef FROM pg_indexes WHERE schemaname = 'public' AND tablename IN ('supplier_offerings', 'supplier_products', 'sourcing_matches');`
  });

  if (idxErr) {
    console.log("Note: Direct pg_indexes RPC not exposed (normal for security). Checking via select performance.");
  } else {
    console.log("Indexes found:", indexCheck);
  }

  // Measure query response time for matching & filtering
  const t0 = Date.now();
  const { data: filterTest } = await supabase
    .from("supplier_products")
    .select("id, product_name, category")
    .eq("category", "Dairy")
    .limit(20);
  const t1 = Date.now();
  console.log(`Category filter on 59,115 products: ${t1 - t0}ms (Returned ${filterTest?.length || 0} rows)`);

  const t2 = Date.now();
  const { data: suppFilterTest } = await supabase
    .from("supplier_offerings")
    .select("id, company_name")
    .eq("country_of_origin", "Spain")
    .eq("qualification_status", "strong")
    .limit(20);
  const t3 = Date.now();
  console.log(`Supplier filter on 12,526 suppliers: ${t3 - t2}ms (Returned ${suppFilterTest?.length || 0} rows)`);
}

run().catch(console.error);
