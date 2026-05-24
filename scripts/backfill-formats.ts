// Run: npx tsx scripts/backfill-formats.ts
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { normalizeFormats } from "../lib/normalization/normalizeFormats";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Fetching supplier_products with formats...");

  const { data: rows, error } = await supabase
    .from("supplier_products")
    .select("id, product_name, formats")
    .not("formats", "is", null);

  if (error) {
    console.error("Fetch error:", error.message);
    process.exit(1);
  }

  if (!rows || rows.length === 0) {
    console.log("No products with formats found.");
    return;
  }

  console.log(`Found ${rows.length} products with formats.`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of rows) {
    const raw = (row.formats as string[] | null) ?? [];
    if (raw.length === 0) {
      skipped++;
      continue;
    }

    const normalized = normalizeFormats(raw);
    const unchanged =
      normalized.length === raw.length &&
      normalized.every((v, i) => v === raw[i]);

    if (unchanged) {
      skipped++;
      continue;
    }

    const { error: updateError } = await supabase
      .from("supplier_products")
      .update({ formats: normalized })
      .eq("id", row.id as string);

    if (updateError) {
      console.error(`  [ERROR] ${row.id} (${row.product_name as string}): ${updateError.message}`);
      errors++;
    } else {
      console.log(`  [OK] ${row.id} — ${raw.join(", ")} → ${normalized.join(", ")}`);
      updated++;
    }
  }

  console.log(`\nDone. Updated: ${updated}, Skipped: ${skipped}, Errors: ${errors}`);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
