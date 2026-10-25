import fs from "fs";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

const env = dotenv.parse(fs.readFileSync(".env.local"));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
  console.log("=================================================");
  console.log("       FDX SCRAPING DATA QUALITY AUDIT          ");
  console.log("          Snapshot: " + new Date().toISOString());
  console.log("=================================================");

  // 1. Overall Database Totals
  const [
    totalProductsRes,
    categorizedProductsRes,
    embeddedProductsRes,
    withImagesRes,
    totalSuppliersRes,
    pendingSuppliersRes,
    scrapedSuppliersRes,
    failedSuppliersRes,
    skippedSuppliersRes,
  ] = await Promise.all([
    sb.from("supplier_products").select("*", { count: "exact", head: true }),
    sb.from("supplier_products").select("*", { count: "exact", head: true }).not("category_id", "is", null),
    sb.from("supplier_products").select("*", { count: "exact", head: true }).not("embedding", "is", null),
    sb.from("supplier_products").select("*", { count: "exact", head: true }).not("image_url", "is", null),
    sb.from("supplier_offerings").select("*", { count: "exact", head: true }),
    sb.from("supplier_offerings").select("*", { count: "exact", head: true }).eq("scrape_status", "pending"),
    sb.from("supplier_offerings").select("*", { count: "exact", head: true }).eq("scrape_status", "scraped"),
    sb.from("supplier_offerings").select("*", { count: "exact", head: true }).eq("scrape_status", "failed"),
    sb.from("supplier_offerings").select("*", { count: "exact", head: true }).eq("scrape_status", "skipped"),
  ]);

  const totalProducts = totalProductsRes.count || 0;
  const categorized = categorizedProductsRes.count || 0;
  const embedded = embeddedProductsRes.count || 0;
  const withImages = withImagesRes.count || 0;

  console.log("\n--- GLOBAL DATABASE TOTALS ---");
  console.log(`Total Suppliers in Database: ${totalSuppliersRes.count}`);
  console.log(`  ✓ Scraped Successfully:    ${scrapedSuppliersRes.count} (${((scrapedSuppliersRes.count / totalSuppliersRes.count) * 100).toFixed(1)}%)`);
  console.log(`  ⏱ Pending Queue:           ${pendingSuppliersRes.count}`);
  console.log(`  ⊘ Skipped (Non-Food/Mach): ${skippedSuppliersRes.count}`);
  console.log(`  ✗ Failed (Dead Domain):    ${failedSuppliersRes.count}`);

  console.log(`\nTotal Products in Catalog:   ${totalProducts}`);
  console.log(`  ✓ AI Categorized:          ${categorized} (${((categorized / totalProducts) * 100).toFixed(1)}%)`);
  console.log(`  ✓ Vector Embedded:         ${embedded} (${((embedded / totalProducts) * 100).toFixed(1)}%)`);
  console.log(`  ✓ Images / Packshots:      ${withImages} (${((withImages / totalProducts) * 100).toFixed(1)}%)`);

  // 2. Last 24 Hours Activity (Since Oct 23 06:30)
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  
  const { data: suppliers24h } = await sb
    .from("supplier_offerings")
    .select("id, company_name, country_of_origin, website, scrape_status, products_found, last_scraped_at, scrape_log")
    .gte("last_scraped_at", twentyFourHoursAgo)
    .order("last_scraped_at", { ascending: false });

  console.log("\n=================================================");
  console.log(`PAST 24 HOURS PERFORMANCE (Since ${twentyFourHoursAgo})`);
  console.log("=================================================");
  console.log(`Suppliers Handled in 24h:    ${suppliers24h ? suppliers24h.length : 0}`);

  if (suppliers24h && suppliers24h.length > 0) {
    const scraped24h = suppliers24h.filter(s => s.scrape_status === "scraped");
    const skipped24h = suppliers24h.filter(s => s.scrape_status === "skipped");
    const failed24h = suppliers24h.filter(s => s.scrape_status === "failed");
    const productsFound24h = suppliers24h.reduce((acc, s) => acc + (s.products_found || 0), 0);

    console.log(`  ✓ Successfully Extracted:  ${scraped24h.length} suppliers`);
    console.log(`  ⊘ Filtered / Skipped:      ${skipped24h.length} (Industrial ovens, packaging, logistics)`);
    console.log(`  ✗ Dead Domain / Errors:    ${failed24h.length}`);
    console.log(`  📦 Total Products Added:   ${productsFound24h}`);

    console.log("\n--- RECENT SUCCESSFUL SUPPLIERS (SAMPLE) ---");
    scraped24h.slice(0, 8).forEach(s => {
      console.log(`✓ ${s.company_name} [${s.country_of_origin || "Europe"}] (${s.website || "No URL"})`);
      console.log(`   Products: ${s.products_found} | Last Scraped: ${s.last_scraped_at}`);
    });

    console.log("\n--- RECENT SKIPPED SUPPLIERS (WHY FILTERED?) ---");
    skipped24h.slice(0, 5).forEach(s => {
      console.log(`⊘ ${s.company_name}: ${s.scrape_log ? s.scrape_log.slice(0, 100) : "Non-food / Industrial"}`);
    });
  }

  // 3. Products extracted in the last 24 hours
  const { data: recentProducts } = await sb
    .from("supplier_products")
    .select(`
      id,
      supplier_id,
      product_name,
      category,
      subcategory,
      category_id,
      description,
      formats,
      sizes,
      certifications,
      shelf_life_months,
      private_label,
      image_url,
      embedding,
      created_at
    `)
    .gte("created_at", twentyFourHoursAgo)
    .order("created_at", { ascending: false });

  const pCount = recentProducts ? recentProducts.length : 0;
  console.log(`\nProducts inserted in the last 24 hours: ${pCount}`);

  if (recentProducts && recentProducts.length > 0) {
    const validNames = recentProducts.filter(p => p.product_name && p.product_name.trim().length > 3).length;
    const withDesc = recentProducts.filter(p => p.description && p.description.trim().length > 15).length;
    const withCategory = recentProducts.filter(p => p.category_id || p.category).length;
    const withSubcat = recentProducts.filter(p => p.subcategory && p.subcategory.trim().length > 0).length;
    const withImages = recentProducts.filter(p => p.image_url && p.image_url.startsWith("http")).length;
    const withSpecs = recentProducts.filter(p => (p.formats && p.formats.length > 0) || (p.sizes && p.sizes.length > 0)).length;
    const withCerts = recentProducts.filter(p => p.certifications && (Array.isArray(p.certifications) ? p.certifications.length > 0 : Object.keys(p.certifications).length > 0)).length;
    const withEmbeddings = recentProducts.filter(p => Boolean(p.embedding)).length;
    const withPrivateLabel = recentProducts.filter(p => p.private_label === true).length;

    console.log("\n=======================================================");
    console.log(`DATA QUALITY BENCHMARKS (24H Batch of ${pCount} Products)`);
    console.log("=======================================================");
    console.log(`- Clean Product Names:        ${validNames}/${pCount} (${((validNames / pCount) * 100).toFixed(1)}%)`);
    console.log(`- Actionable Descriptions:    ${withDesc}/${pCount} (${((withDesc / pCount) * 100).toFixed(1)}%)`);
    console.log(`- Taxonomy Categorized:       ${withCategory}/${pCount} (${((withCategory / pCount) * 100).toFixed(1)}%)`);
    console.log(`- Specific Subcategories:     ${withSubcat}/${pCount} (${((withSubcat / pCount) * 100).toFixed(1)}%)`);
    console.log(`- Packaging / Formats Spec:   ${withSpecs}/${pCount} (${((withSpecs / pCount) * 100).toFixed(1)}%)`);
    console.log(`- Certifications Extracted:   ${withCerts}/${pCount} (${((withCerts / pCount) * 100).toFixed(1)}%)`);
    console.log(`- Private Label Ready:        ${withPrivateLabel}/${pCount} (${((withPrivateLabel / pCount) * 100).toFixed(1)}%)`);
    console.log(`- Images / Packshots:         ${withImages}/${pCount} (${((withImages / pCount) * 100).toFixed(1)}%)`);
    console.log(`- Vector Embedded (Voyage AI): ${withEmbeddings}/${pCount} (${((withEmbeddings / pCount) * 100).toFixed(1)}%)`);

    console.log("\n--- CONCRETE PRODUCT EXAMPLES FROM LAST 24H ---");
    // Show 8 diverse products
    recentProducts.slice(0, 8).forEach((p, idx) => {
      console.log(`\n[#${idx + 1}] ${p.product_name}`);
      console.log(`  Category:       ${p.category || "Unassigned"} > ${p.subcategory || "N/A"}`);
      console.log(`  Formats / Spec: ${JSON.stringify(p.formats || p.sizes || "N/A")}`);
      console.log(`  Certifications: ${JSON.stringify(p.certifications || [])}`);
      console.log(`  Private Label:  ${p.private_label ? "YES" : "NO"}`);
      console.log(`  Description:    ${p.description ? p.description.slice(0, 110) + "..." : "None"}`);
      console.log(`  Image URL:      ${p.image_url ? p.image_url.slice(0, 75) + "..." : "NULL"}`);
      console.log(`  Voyage Vector:  ${Boolean(p.embedding)}`);
    });
  }
}

check();
