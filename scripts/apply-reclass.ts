/**
 * Apply the approved category reclassification.
 *
 * Prereqs (run FIRST):
 *   Supabase SQL editor → migrations/20260601_reclassify_categories.sql
 *   (creates snapshot table + renames categories)
 *
 * Then run this script:
 *   npx tsx --tsconfig tsconfig.json --env-file .env.local scripts/apply-reclass.ts
 *
 * What this does:
 *   1. Writes JSON backup of all affected sourcing_requests
 *   2. Batch-updates supplier_products.category_id from the approved CSV
 *   3. Patches sourcing_requests.intent_json.category (category_id + category_name)
 *   4. Prints scorecard + verifies 0 rows remain in dump buckets
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";

const FOCACCIA_ID   = "d1adcc9f-c6a7-40a2-a4a9-5cfbc7d10dad";
const PLANT_PROT_ID = "18f4fb10-0337-45c8-a9d3-d063052db846";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

// ── CSV parser (RFC 4180) ─────────────────────────────────────────────────────

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

type CsvRow = {
  source: string;
  id: string;
  name: string;
  old_category_id: string;
  predicted_category_id: string;
  predicted_name: string;
  confidence: string;
  reason: string;
};

function parseCsv(csvPath: string): CsvRow[] {
  const content = fs.readFileSync(csvPath, "utf8");
  const lines = content.split("\n").filter((l) => l.trim());
  return lines.slice(1).map((line) => {
    const p = parseCsvLine(line);
    return {
      source:                p[0] ?? "",
      id:                    p[1] ?? "",
      name:                  p[2] ?? "",
      old_category_id:       p[3] ?? "",
      predicted_category_id: p[4] ?? "unclassified",
      predicted_name:        p[5] ?? "Unclassified",
      confidence:            p[6] ?? "low",
      reason:                p[7] ?? "",
    };
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function batchUpdate(
  table: "supplier_products",
  ids: string[],
  patch: { category_id: string | null }
): Promise<void> {
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    const { error } = await supabase.from(table).update(patch).in("id", chunk);
    if (error) {
      console.error(`  batchUpdate error (${table}):`, error.message);
      process.exit(1);
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const csvPath = path.join(process.cwd(), "migrations", "reports", "reclass_dryrun.csv");
  if (!fs.existsSync(csvPath)) {
    console.error(`CSV not found: ${csvPath}`);
    process.exit(1);
  }

  const rows = parseCsv(csvPath);
  const supplierRows = rows.filter((r) => r.source === "supplier_products");
  const requestRows  = rows.filter((r) => r.source === "sourcing_requests");
  console.log(`Loaded ${rows.length} rows (${supplierRows.length} products, ${requestRows.length} requests)`);

  const reportsDir = path.join(process.cwd(), "migrations", "reports");
  fs.mkdirSync(reportsDir, { recursive: true });

  // ── Step 1: Rename categories + ensure Unclassified ─────────────────────────
  console.log("\n[1/5] Renaming categories…");

  const TOMATO_ID = "2b5f3c21-1770-4da3-b0ec-6147ffbcc8c7";
  const { data: tomatoCat } = await supabase
    .from("product_categories").select("name").eq("id", TOMATO_ID).maybeSingle();
  if ((tomatoCat as { name: string } | null)?.name !== "Tomato Products") {
    const { error } = await supabase.from("product_categories")
      .update({ name: "Tomato Products" }).eq("id", TOMATO_ID);
    if (error) console.warn("  Tomato rename:", error.message);
    else console.log("  'Tomato & Ketchup-Based' → 'Tomato Products'");
  } else {
    console.log("  Tomato Products: already renamed (no-op)");
  }

  const { data: plantCat } = await supabase
    .from("product_categories").select("name").eq("id", PLANT_PROT_ID).maybeSingle();
  if ((plantCat as { name: string } | null)?.name !== "Plant-Based Proteins") {
    const { error } = await supabase.from("product_categories")
      .update({ name: "Plant-Based Proteins" }).eq("id", PLANT_PROT_ID);
    if (error) console.warn("  Plant rename:", error.message);
    else console.log("  'Other Plant Proteins' → 'Plant-Based Proteins'");
  } else {
    console.log("  Plant-Based Proteins: already renamed (no-op)");
  }

  const { data: uncCat } = await supabase
    .from("product_categories").select("id").eq("name", "Unclassified").maybeSingle();
  if (!uncCat) {
    const { error } = await supabase.from("product_categories").insert({ name: "Unclassified" });
    if (error) console.warn("  Unclassified insert:", error.message);
    else console.log("  Inserted 'Unclassified' category");
  } else {
    console.log(`  'Unclassified' exists (id: ${(uncCat as { id: string }).id})`);
  }

  // ── Step 2: Backup sourcing_requests intent_json ─────────────────────────────
  console.log("\n[2/5] Backing up sourcing_requests…");
  const reqIds = requestRows.map((r) => r.id);
  const { data: reqBackup, error: reqBackupErr } = await supabase
    .from("sourcing_requests")
    .select("id, product_name, intent_json")
    .in("id", reqIds);
  if (reqBackupErr) { console.error("Backup error:", reqBackupErr.message); process.exit(1); }

  const reqBackupPath = path.join(reportsDir, "reclass_requests_backup_20260601.json");
  fs.writeFileSync(reqBackupPath, JSON.stringify(reqBackup, null, 2), "utf8");
  console.log(`  Written: ${reqBackupPath} (${(reqBackup ?? []).length} rows)`);

  // ── Step 3: Update supplier_products ─────────────────────────────────────────
  console.log("\n[3/5] Updating supplier_products…");

  // Group rows by predicted category (null for unclassified)
  const groups = new Map<string | null, { name: string; ids: string[] }>();
  for (const row of supplierRows) {
    const catId   = row.predicted_category_id === "unclassified" ? null : row.predicted_category_id;
    const catName = catId === null ? "null (unclassified)" : row.predicted_name;
    const key     = catId;
    if (!groups.has(key)) groups.set(key, { name: catName, ids: [] });
    groups.get(key)!.ids.push(row.id);
  }

  let spUpdated = 0;
  for (const [catId, { name, ids }] of groups) {
    await batchUpdate("supplier_products", ids, { category_id: catId });
    console.log(`  ${String(ids.length).padStart(4)}  → ${name}`);
    spUpdated += ids.length;
  }
  console.log(`  Total: ${spUpdated} rows`);

  // ── Step 4: Patch sourcing_requests intent_json ───────────────────────────────
  console.log("\n[4/5] Patching sourcing_requests…");

  type ReqRow = { id: string; product_name: string | null; intent_json: Record<string, unknown> | null };
  const reqMap = new Map<string, ReqRow>(
    ((reqBackup ?? []) as ReqRow[]).map((r) => [r.id, r])
  );

  let reqUpdated = 0;
  for (const row of requestRows) {
    const backup = reqMap.get(row.id);
    if (!backup?.intent_json) {
      console.warn(`  Skip ${row.id}: no intent_json found`);
      continue;
    }

    const newCatId   = row.predicted_category_id === "unclassified" ? null : row.predicted_category_id;
    const newCatName = row.predicted_category_id === "unclassified" ? "Unclassified" : row.predicted_name;

    const updatedJson: Record<string, unknown> = {
      ...backup.intent_json,
      category: {
        ...((backup.intent_json.category as Record<string, unknown>) ?? {}),
        category_id:   newCatId,
        category_name: newCatName,
      },
    };

    const { error } = await supabase
      .from("sourcing_requests")
      .update({ intent_json: updatedJson })
      .eq("id", row.id);

    if (error) {
      console.warn(`  WARN ${row.id}: ${error.message}`);
    } else {
      console.log(`  [${reqUpdated + 1}/${requestRows.length}] ${row.name.slice(0, 48)} → ${newCatName}`);
      reqUpdated++;
    }
  }

  // ── Step 5: Verify ────────────────────────────────────────────────────────────
  console.log("\n[5/5] Verifying…");

  const [{ count: focLeft }, { count: plantLeft }] = await Promise.all([
    supabase.from("supplier_products").select("id", { count: "exact", head: true })
      .eq("category_id", FOCACCIA_ID),
    supabase.from("supplier_products").select("id", { count: "exact", head: true })
      .eq("category_id", PLANT_PROT_ID),
  ]);

  // ── Scorecard ─────────────────────────────────────────────────────────────────
  console.log("\n══════════════════════════════════════════════════════════════════");
  console.log("SCORECARD");
  console.log("══════════════════════════════════════════════════════════════════");
  console.log(`  Supplier products updated:   ${spUpdated}  (${supplierRows.length} in CSV)`);
  console.log(`  Sourcing requests patched:   ${reqUpdated} / ${requestRows.length}`);
  console.log(`  Focaccia dump remaining:     ${focLeft ?? "?"} (target: 0)`);
  console.log(`  Plant-Based Proteins count:  ${plantLeft ?? "?"} (should be ≤5 legit items)`);
  console.log("══════════════════════════════════════════════════════════════════");
  console.log("  Rollback supplier_products:  run SQL in migrations/20260601_reclassify_categories.sql");
  console.log("  Rollback sourcing_requests:  migrations/reports/reclass_requests_backup_20260601.json");
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
