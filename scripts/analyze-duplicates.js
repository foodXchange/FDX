require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function findDuplicates() {
  console.log("Fetching all suppliers from Supabase...");
  const PAGE = 1000;
  let allRows = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("supplier_offerings")
      .select("id, company_name, website, country_of_origin, scrape_status, csv_import_batch, product_count")
      .range(from, from + PAGE - 1);
    if (error || !data || data.length === 0) break;
    allRows = allRows.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }

  function cleanDomain(url) {
    if (!url) return "";
    try {
      const u = new URL(url.startsWith("http") ? url : "http://" + url);
      return u.hostname.replace(/^www\./, "").toLowerCase().trim();
    } catch {
      return url.toLowerCase().trim();
    }
  }

  const domainMap = new Map();
  for (const row of allRows) {
    const domain = cleanDomain(row.website);
    if (domain && domain.length > 3) {
      if (!domainMap.has(domain)) domainMap.set(domain, []);
      domainMap.get(domain).push(row);
    }
  }

  let dupesWithCount = 0;
  let redundantRows = 0;
  let redundantPending = 0;
  for (const [dom, list] of domainMap.entries()) {
    if (list.length > 1) {
      dupesWithCount++;
      redundantRows += list.length - 1;
      const pendingInList = list.filter((r) => r.scrape_status === "pending").length;
      if (pendingInList > 0 && list.some((r) => r.scrape_status === "scraped")) {
        redundantPending += pendingInList;
      }
    }
  }

  console.log("=== DUPLICATE ANALYSIS SUMMARY ===");
  console.log("Total Supplier Rows in DB:", allRows.length);
  console.log("Unique Domains Appearing More Than Once:", dupesWithCount);
  console.log("Total Redundant Extra Rows:", redundantRows);
  console.log("Pending Rows That Are Already Scraped in Another Batch:", redundantPending);

  const topDupes = Array.from(domainMap.entries())
    .filter(([_, list]) => list.length > 1)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 10);

  console.log("\nTop 10 Duplicate Domains Sample:");
  for (const [dom, list] of topDupes) {
    const scrapedCount = list.filter((r) => r.scrape_status === "scraped").length;
    const pendingCount = list.filter((r) => r.scrape_status === "pending").length;
    console.log(
      `- ${dom}: ${list.length} rows (Scraped: ${scrapedCount}, Pending: ${pendingCount}) across batches: [${Array.from(new Set(list.map((r) => r.csv_import_batch).filter(Boolean))).join(", ")}]`
    );
  }
}

findDuplicates();
