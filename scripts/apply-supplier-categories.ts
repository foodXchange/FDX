/**
 * Apply category_id updates from the dry-run CSV produced by backfill-supplier-categories.ts.
 * Reads migrations/reports/supplier_categories_dryrun.csv and writes only the rows
 * where new_category_id is non-empty.
 *
 * Run:
 *   npx tsx --tsconfig tsconfig.json --env-file .env.local scripts/apply-supplier-categories.ts
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";
import { parse } from "csv-parse/sync";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const CHUNK = 100;

async function main(): Promise<void> {
  const csvPath = path.join(process.cwd(), "migrations", "reports", "supplier_categories_dryrun.csv");
  if (!fs.existsSync(csvPath)) {
    console.error("CSV not found:", csvPath);
    process.exit(1);
  }

  const raw = fs.readFileSync(csvPath, "utf8");
  const rows = parse(raw, { columns: true, skip_empty_lines: true, bom: true, trim: true }) as Array<{
    id: string;
    new_category_id: string;
    new_category_name: string;
  }>;

  const toApply = rows.filter((r) => r.new_category_id && r.new_category_id.trim() !== "");
  console.log(`CSV rows: ${rows.length}, to apply: ${toApply.length}\n`);

  let done = 0;
  for (let i = 0; i < toApply.length; i += CHUNK) {
    const chunk = toApply.slice(i, i + CHUNK);
    for (const u of chunk) {
      const { error } = await supabase
        .from("supplier_products")
        .update({ category_id: u.new_category_id })
        .eq("id", u.id);
      if (error) {
        console.error(`\n  UPDATE failed for id=${u.id}: ${error.message}`);
        process.exit(1);
      }
      done++;
    }
    const pct = Math.round((done / toApply.length) * 100);
    process.stdout.write(`\r  Applied ${done}/${toApply.length} (${pct}%)...`);
  }
  process.stdout.write("\n");

  const { count } = await supabase
    .from("supplier_products")
    .select("*", { count: "exact", head: true })
    .is("category_id", null);

  console.log(`\nPost-update: ${count ?? "?"} rows still have category_id IS NULL`);
  console.log(`Applied:     ${done}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
