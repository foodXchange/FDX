require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function cleanDomain(url) {
  if (!url) return "";
  try {
    const u = new URL(url.startsWith("http") ? url : "http://" + url);
    return u.hostname.replace(/^www\./, "").toLowerCase().trim();
  } catch {
    return url.toLowerCase().trim();
  }
}

async function syncDuplicates() {
  console.log("Fetching all suppliers to build scraped domain map...");
  const PAGE = 1000;
  let allRows = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("supplier_offerings")
      .select("id, company_name, website, country_of_origin, scrape_status, product_count, product_description, contact_email, contact_phone, contact_name, linkedin_url, export_markets, founded_year, employees_range")
      .range(from, from + PAGE - 1);
    if (error || !data || data.length === 0) break;
    allRows = allRows.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }

  console.log(`Fetched ${allRows.length} total rows.`);

  // Build map of domains that are ALREADY successfully scraped
  const scrapedDomainMap = new Map();
  for (const row of allRows) {
    if (row.scrape_status === "scraped" && row.website) {
      const dom = cleanDomain(row.website);
      if (dom && dom.length > 3 && !scrapedDomainMap.has(dom)) {
        scrapedDomainMap.set(dom, row);
      }
    }
  }

  console.log(`Found ${scrapedDomainMap.size} unique successfully scraped domains.`);

  // Find pending rows that match an already scraped domain
  const toSync = [];
  for (const row of allRows) {
    if (row.scrape_status === "pending" && row.website) {
      const dom = cleanDomain(row.website);
      if (dom && scrapedDomainMap.has(dom)) {
        const source = scrapedDomainMap.get(dom);
        // Ensure not syncing against itself
        if (source.id !== row.id) {
          toSync.push({ pendingRow: row, sourceRow: source });
        }
      }
    }
  }

  console.log(`Found ${toSync.length} pending rows that are duplicate of already scraped suppliers.`);

  if (toSync.length === 0) {
    console.log("No pending duplicates to sync. Done!");
    return;
  }

  console.log(`Syncing ${toSync.length} duplicate suppliers in Supabase...`);
  let synced = 0;
  for (const item of toSync) {
    const target = item.pendingRow;
    const src = item.sourceRow;

    // 1. Update the pending supplier offering to match the scraped profile
    const { error: upErr } = await supabase
      .from("supplier_offerings")
      .update({
        scrape_status: "scraped",
        qualification_status: src.product_count >= 3 ? "strong" : src.product_count >= 1 ? "thin" : "empty",
        product_count: src.product_count,
        product_description: src.product_description,
        contact_email: src.contact_email,
        contact_phone: src.contact_phone,
        contact_name: src.contact_name,
        linkedin_url: src.linkedin_url,
        export_markets: src.export_markets,
        founded_year: src.founded_year,
        employees_range: src.employees_range,
        internal_notes: `Synced from duplicate supplier (${src.id})`,
        last_scraped_at: new Date().toISOString(),
      })
      .eq("id", target.id);

    if (!upErr) {
      // 2. Fetch and duplicate products from source to target so this supplier has full catalog and vectors
      const { data: srcProducts } = await supabase
        .from("supplier_products")
        .select("product_name, category, subcategory, description, formats, sizes, brix_level, shelf_life_months, certifications, kosher_types, product_type, primary_ingredients, private_label, tags, markets_suitable, scrape_source, scrape_confidence, embedding")
        .eq("supplier_id", src.id);

      if (srcProducts && srcProducts.length > 0) {
        const newProducts = srcProducts.map((p) => ({
          ...p,
          supplier_id: target.id,
          manually_verified: false,
          needs_review: false,
          is_published: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));
        await supabase.from("supplier_products").insert(newProducts);
      }

      synced++;
    }
  }

  console.log(`\n🎉 SUCCESS! Synced ${synced}/${toSync.length} duplicate suppliers with full products and vectors.`);
}

syncDuplicates();
