import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanPending() {
  console.log("--- Step 1: Collecting all scraped domains ---");
  const allScrapedDomains = new Set<string>();
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data } = await supabase
      .from("supplier_offerings")
      .select("website_domain")
      .eq("scrape_status", "scraped")
      .range(from, from + pageSize - 1);
    if (!data || data.length === 0) break;
    for (const r of data) {
      if (r.website_domain) allScrapedDomains.add(r.website_domain.toLowerCase().trim());
    }
    if (data.length < pageSize) break;
    from += pageSize;
  }
  console.log("Total verified scraped domains:", allScrapedDomains.size);

  console.log("--- Step 2: Finding pending records that match scraped domains or have invalid websites ---");
  const dupIds: string[] = [];
  const blankIds: string[] = [];
  from = 0;

  while (true) {
    const { data } = await supabase
      .from("supplier_offerings")
      .select("id, website, website_domain")
      .eq("scrape_status", "pending")
      .range(from, from + pageSize - 1);
    if (!data || data.length === 0) break;

    for (const r of data) {
      const d = (r.website_domain || "").toLowerCase().trim();
      const w = (r.website || "").trim();

      if (!w || w === "https://" || w === "http://" || d === "facebook.com") {
        blankIds.push(r.id);
      } else if (d && allScrapedDomains.has(d)) {
        dupIds.push(r.id);
      }
    }

    if (data.length < pageSize) break;
    from += pageSize;
  }

  console.log("Duplicate IDs found to update:", dupIds.length);
  console.log("Blank/Invalid IDs found to skip:", blankIds.length);

  console.log("--- Step 3: Updating duplicates to scrape_status = 'scraped' ---");
  const batchSize = 100;
  for (let i = 0; i < dupIds.length; i += batchSize) {
    const slice = dupIds.slice(i, i + batchSize);
    const { error } = await supabase
      .from("supplier_offerings")
      .update({
        scrape_status: "scraped",
        internal_notes: "[Auto-Clean] Domain already scraped in earlier batch.",
      })
      .in("id", slice);
    if (error) console.error("Error updating dups:", error.message);
  }

  console.log("--- Step 4: Updating blank/invalid websites to scrape_status = 'skipped' ---");
  for (let i = 0; i < blankIds.length; i += batchSize) {
    const slice = blankIds.slice(i, i + batchSize);
    const { error } = await supabase
      .from("supplier_offerings")
      .update({
        scrape_status: "skipped",
        internal_notes: "[Auto-Clean] Skipped: No valid factory website provided.",
      })
      .in("id", slice);
    if (error) console.error("Error updating blanks:", error.message);
  }

  console.log("--- Cleanup Finished! Verifying new counts ---");
  const [pending, scraped, skipped] = await Promise.all([
    supabase.from("supplier_offerings").select("*", { count: "exact", head: true }).eq("scrape_status", "pending"),
    supabase.from("supplier_offerings").select("*", { count: "exact", head: true }).eq("scrape_status", "scraped"),
    supabase.from("supplier_offerings").select("*", { count: "exact", head: true }).eq("scrape_status", "skipped"),
  ]);

  console.log("NEW DATABASE COUNTS:");
  console.log("Pending:", pending.count);
  console.log("Scraped:", scraped.count);
  console.log("Skipped:", skipped.count);
}

cleanPending();
