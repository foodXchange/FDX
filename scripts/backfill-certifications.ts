// Run: npx tsx scripts/backfill-certifications.ts
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { normalizeCertifications } from "../lib/normalization/normalizeCertifications";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function arraysEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

async function backfillTable(
  table: "supplier_products" | "supplier_offerings"
): Promise<{ updated: number; skipped: number; errors: number }> {
  const { data: rows, error } = await supabase
    .from(table)
    .select("id, certifications")
    .not("certifications", "is", null);

  if (error) throw new Error(`${table} fetch error: ${error.message}`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of rows ?? []) {
    const raw = (row.certifications as string[] | null) ?? [];
    if (raw.length === 0) {
      skipped++;
      continue;
    }

    const normalized = normalizeCertifications(raw);
    if (arraysEqual(normalized, raw)) {
      skipped++;
      continue;
    }

    const { error: updateError } = await supabase
      .from(table)
      .update({ certifications: normalized })
      .eq("id", row.id as string);

    if (updateError) {
      console.error(`  [ERROR] ${table}/${row.id}: ${updateError.message}`);
      errors++;
    } else {
      console.log(`  [OK] ${table}/${row.id} — ${raw.join(", ")} → ${normalized.join(", ")}`);
      updated++;
    }
  }

  return { updated, skipped, errors };
}

async function main() {
  console.log("Backfilling certifications...\n");

  console.log("--- supplier_products ---");
  const products = await backfillTable("supplier_products");
  console.log(`Updated: ${products.updated}, Skipped: ${products.skipped}, Errors: ${products.errors}\n`);

  console.log("--- supplier_offerings ---");
  const offerings = await backfillTable("supplier_offerings");
  console.log(`Updated: ${offerings.updated}, Skipped: ${offerings.skipped}, Errors: ${offerings.errors}\n`);

  const totalErrors = products.errors + offerings.errors;
  console.log(
    `Done. Total updated: ${products.updated + offerings.updated}, Errors: ${totalErrors}`
  );
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
