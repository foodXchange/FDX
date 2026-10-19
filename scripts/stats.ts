import { readFileSync } from "fs";
import { resolve } from "path";

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
  } catch {}
}

loadEnvLocal();

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const [pending, scraped, skipped, failed, products, buyers] = await Promise.all([
    supabase.from("supplier_offerings").select("*", { count: "exact", head: true }).eq("scrape_status", "pending"),
    supabase.from("supplier_offerings").select("*", { count: "exact", head: true }).eq("scrape_status", "scraped"),
    supabase.from("supplier_offerings").select("*", { count: "exact", head: true }).eq("scrape_status", "skipped"),
    supabase.from("supplier_offerings").select("*", { count: "exact", head: true }).eq("scrape_status", "failed"),
    supabase.from("supplier_products").select("*", { count: "exact", head: true }),
    supabase.from("buyers").select("*", { count: "exact", head: true }),
  ]);

  console.log("Database Live Counts:");
  console.log({
    pending: pending.count,
    scraped: scraped.count,
    skipped: skipped.count,
    failed: failed.count,
    totalProducts: products.count,
    activeBuyers: buyers.count,
  });
}

main().catch(console.error);
