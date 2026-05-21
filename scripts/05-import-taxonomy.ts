/**
 * Import product taxonomy from XLSX and CSV into product_categories table.
 *
 * Run with: npx tsx scripts/05-import-taxonomy.ts
 * Dry-run:  DRY_RUN=true npx tsx scripts/05-import-taxonomy.ts
 *
 * SQL required (run once in Supabase SQL editor):
 *   CREATE TABLE IF NOT EXISTS public.product_categories (
 *     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *     name text NOT NULL,
 *     slug text UNIQUE,
 *     parent_name text,
 *     description text,
 *     tags text[] DEFAULT '{}',
 *     created_at timestamptz DEFAULT now()
 *   );
 *
 * Idempotent: upserts on slug — updates existing records if slug matches.
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";
import { parse } from "csv-parse/sync";
import * as XLSX from "xlsx";

// ─── Load .env.local ─────────────────────────────────────────────────────────
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
  } catch {
    // .env.local not found — assume env vars are already set
  }
}

loadEnvLocal();

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── CONFIG ───────────────────────────────────────────────────────────────────
// Step 1: run with DRY_RUN=true to print available columns for each file.
// Step 2: fill in the values below with the actual column header names.

const XLSX_MAP = {
  name: "Name",               // ← replace with actual XLSX header
  parent_name: "Parent",
  description: "Description",
  tags: "Tags",               // comma-separated → string[]
} as const;

const CSV_MAP = {
  name: "Category",           // ← replace with actual CSV header
  parent_name: "Parent Category",
  description: "Description",
  tags: "Tags",               // comma-separated → string[]
} as const;

const DRY_RUN = process.env.DRY_RUN === "true";
const XLSX_FILE = resolve(process.cwd(), "data/Products_21_5_2026.xlsx");
const CSV_FILE = resolve(process.cwd(), "data/Untitled_spreadsheet.csv");

// ─── Helpers ──────────────────────────────────────────────────────────────────
function get(row: Record<string, string>, col: string): string | null {
  return row[col]?.toString().trim() || null;
}

function toArray(val: string | null): string[] {
  if (!val) return [];
  return val.split(",").map((s) => s.trim()).filter(Boolean);
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ─── Parse XLSX ───────────────────────────────────────────────────────────────
function parseXlsx(filePath: string): Record<string, string>[] {
  const wb = XLSX.readFile(filePath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
    defval: "",
    raw: false,
  });
}

// ─── Process rows ─────────────────────────────────────────────────────────────
type CategoryRecord = {
  name: string;
  slug: string;
  parent_name: string | null;
  description: string | null;
  tags: string[];
};

function mapRows(
  rows: Record<string, string>[],
  map: typeof XLSX_MAP | typeof CSV_MAP,
  source: string
): { records: CategoryRecord[]; skipped: number } {
  const records: CategoryRecord[] = [];
  let skipped = 0;

  for (const row of rows) {
    const name = get(row, map.name);
    if (!name) { skipped++; continue; }

    const slug = slugify(name);
    if (!slug) { skipped++; continue; }

    records.push({
      name,
      slug,
      parent_name: get(row, map.parent_name),
      description: get(row, map.description),
      tags: toArray(get(row, map.tags)),
    });
  }

  if (DRY_RUN) {
    console.log(`\n── ${source} ──────────────────────────────────────────────`);
    if (rows.length > 0) {
      console.log("Columns found:", Object.keys(rows[0]).join(", "));
      console.log("\nFirst 3 mapped rows:");
      rows.slice(0, 3).forEach((row, i) => {
        console.log(`\n  Row ${i + 1}:`);
        for (const [dbKey, csvCol] of Object.entries(map)) {
          console.log(`    ${dbKey}: "${row[csvCol] ?? "—"}"`);
        }
      });
    }
  }

  return { records, skipped };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const allRecords: CategoryRecord[] = [];
  let totalSkipped = 0;

  // ── XLSX source ──────────────────────────────────────────────────────────
  if (existsSync(XLSX_FILE)) {
    const xlsxRows = parseXlsx(XLSX_FILE);
    const { records, skipped } = mapRows(xlsxRows, XLSX_MAP, "Products_21_5_2026.xlsx");
    allRecords.push(...records);
    totalSkipped += skipped;
  } else {
    console.warn(`⚠ XLSX file not found, skipping: ${XLSX_FILE}`);
  }

  // ── CSV source ───────────────────────────────────────────────────────────
  if (existsSync(CSV_FILE)) {
    const content = readFileSync(CSV_FILE, "utf-8");
    const csvRows = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as Record<string, string>[];
    const { records, skipped } = mapRows(csvRows, CSV_MAP, "Untitled_spreadsheet.csv");
    allRecords.push(...records);
    totalSkipped += skipped;
  } else {
    console.warn(`⚠ CSV file not found, skipping: ${CSV_FILE}`);
  }

  if (DRY_RUN) {
    console.log("\n──────────────────────────────────────────────────────────");
    console.log(`Total rows to import: ${allRecords.length}  ·  Skipped: ${totalSkipped}`);
    console.log("No changes made. Update XLSX_MAP/CSV_MAP and remove DRY_RUN=true to import.");
    return;
  }

  if (allRecords.length === 0) {
    console.log("No records to import.");
    return;
  }

  // Deduplicate by slug (last occurrence wins if same slug appears in both files)
  const deduped = new Map<string, CategoryRecord>();
  for (const rec of allRecords) {
    deduped.set(rec.slug, rec);
  }
  const records = Array.from(deduped.values());

  let inserted = 0;
  let skipped = 0;

  // Upsert in batches of 50
  const BATCH = 50;
  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH);
    const { error } = await supabaseAdmin
      .from("product_categories")
      .upsert(batch, { onConflict: "slug" });

    if (error) {
      console.error(`  ✗ Batch ${Math.floor(i / BATCH) + 1} failed: ${error.message}`);
      skipped += batch.length;
    } else {
      inserted += batch.length;
    }
  }

  console.log(`\n✓ ${inserted} upserted  ·  ✗ ${skipped} skipped  (${allRecords.length} total rows, ${deduped.size} unique slugs)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
