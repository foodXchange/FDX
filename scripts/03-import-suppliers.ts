/**
 * Import suppliers from CSV files into supplier_offerings table.
 * Processes all 3 source files by default; pass --file=<name> to process one.
 *
 * Run with: npx tsx scripts/03-import-suppliers.ts
 * Single:   npx tsx scripts/03-import-suppliers.ts --file=Tuna_Manufacturer_Directory.csv
 * Dry-run:  DRY_RUN=true npx tsx scripts/03-import-suppliers.ts
 *
 * Idempotent: deletes existing row by company_name before inserting.
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";
import { parse } from "csv-parse/sync";

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
// Step 1: run with DRY_RUN=true to see available columns for each file.
// Step 2: fill in the values below with the actual CSV header names.

type ColumnMap = {
  company_name: string;
  country_of_origin?: string;
  region?: string;
  headquarters?: string;
  founded?: string;
  company_size?: string;
  website?: string;
  contact_email?: string;
  contact_phone?: string;
  legal_entity?: string;
  product_type?: string;      // "pure_ingredient" | "processed_food" | "semi_processed" | "mixed"
  product_description?: string;
  annual_capacity?: string;
  categories?: string;        // comma-separated
  certifications?: string;    // comma-separated
  formats?: string;           // comma-separated
  markets_served?: string;    // comma-separated
  tags?: string;              // comma-separated
  primary_ingredients?: string; // comma-separated
  private_label?: string;     // "yes"/"true"/"1" → true
  own_brand?: string;
  verified?: string;
  priority?: string;          // integer string
  status?: string;            // "pending" | "approved" | "active" | "inactive"
  price_positioning?: string; // "premium" | "mid-range" | "budget" | "mixed"
  sourcing_notes?: string;
};

const MAPS: Record<string, ColumnMap> = {
  "Suppliers_21_5_2026.csv": {
    company_name: "Company",           // ← replace with actual CSV header
    country_of_origin: "Country",
    categories: "Categories",
    certifications: "Certifications",
    website: "Website",
    product_type: "Type",
    status: "Status",
    priority: "Priority",
    contact_email: "Email",
    sourcing_notes: "Notes",
  },
  "Tuna_Manufacturer_Directory.csv": {
    company_name: "Name",              // ← replace with actual CSV header
    country_of_origin: "Country",
    categories: "Products",
    certifications: "Certifications",
    website: "Website",
    contact_email: "Email",
  },
  "Beetroot_Factory_Recommendations.csv": {
    company_name: "Company",           // ← replace with actual CSV header
    country_of_origin: "Country",
    categories: "Products",
    certifications: "Certifications",
    website: "Website",
    contact_email: "Email",
  },
};

const VALID_PRODUCT_TYPES = ["pure_ingredient", "processed_food", "semi_processed", "mixed"] as const;
const VALID_STATUSES = ["pending", "approved", "active", "inactive"] as const;
const VALID_PRICE_POSITIONS = ["premium", "mid-range", "budget", "mixed"] as const;

const DRY_RUN = process.env.DRY_RUN === "true";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function get(row: Record<string, string>, col: string | undefined): string | null {
  if (!col) return null;
  return row[col]?.trim() || null;
}

function toArray(val: string | null): string[] {
  if (!val) return [];
  return val.split(",").map((s) => s.trim()).filter(Boolean);
}

function toBool(val: string | null): boolean {
  if (!val) return false;
  return ["yes", "true", "1", "y"].includes(val.toLowerCase());
}

function toProductType(val: string | null): (typeof VALID_PRODUCT_TYPES)[number] | null {
  if (!val) return null;
  const lower = val.toLowerCase().trim() as (typeof VALID_PRODUCT_TYPES)[number];
  return VALID_PRODUCT_TYPES.includes(lower) ? lower : null;
}

function toStatus(val: string | null): (typeof VALID_STATUSES)[number] {
  if (!val) return "pending";
  const lower = val.toLowerCase().trim() as (typeof VALID_STATUSES)[number];
  return VALID_STATUSES.includes(lower) ? lower : "pending";
}

function toPricePositioning(val: string | null): (typeof VALID_PRICE_POSITIONS)[number] | null {
  if (!val) return null;
  const lower = val.toLowerCase().trim() as (typeof VALID_PRICE_POSITIONS)[number];
  return VALID_PRICE_POSITIONS.includes(lower) ? lower : null;
}

// ─── Process one file ────────────────────────────────────────────────────────
async function processFile(filename: string): Promise<{ inserted: number; skipped: number }> {
  const map = MAPS[filename];
  if (!map) {
    console.error(`  ✗ No COLUMN_MAP defined for ${filename}`);
    return { inserted: 0, skipped: 0 };
  }

  const filePath = resolve(process.cwd(), "data", filename);
  let content: string;
  try {
    content = readFileSync(filePath, "utf-8");
  } catch {
    console.error(`  ✗ File not found: ${filePath}`);
    return { inserted: 0, skipped: 0 };
  }

  const rows = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];

  if (rows.length === 0) {
    console.log(`  No rows found in ${filename}`);
    return { inserted: 0, skipped: 0 };
  }

  if (DRY_RUN) {
    console.log(`\n── ${filename} ──────────────────────────────────────────`);
    console.log("Columns found:", Object.keys(rows[0]).join(", "));
    console.log("\nFirst 3 mapped rows:");
    rows.slice(0, 3).forEach((row, i) => {
      console.log(`\n  Row ${i + 1}:`);
      for (const [dbKey, csvCol] of Object.entries(map)) {
        if (csvCol) console.log(`    ${dbKey}: "${row[csvCol] ?? "—"}"`);
      }
    });
    return { inserted: 0, skipped: 0 };
  }

  let inserted = 0;
  let skipped = 0;

  for (const row of rows) {
    const company_name = get(row, map.company_name);
    if (!company_name) {
      console.warn(`  ⚠ Skipping row — missing company_name`);
      skipped++;
      continue;
    }

    // Delete existing row (idempotent)
    await Promise.resolve(
      supabaseAdmin.from("supplier_offerings").delete().eq("company_name", company_name)
    ).catch(console.error);

    const record = {
      company_name,
      country_of_origin: get(row, map.country_of_origin),
      region: get(row, map.region),
      headquarters: get(row, map.headquarters),
      founded: get(row, map.founded),
      company_size: get(row, map.company_size),
      website: get(row, map.website),
      contact_email: get(row, map.contact_email),
      contact_phone: get(row, map.contact_phone),
      legal_entity: get(row, map.legal_entity),
      product_type: toProductType(get(row, map.product_type)),
      product_description: get(row, map.product_description),
      annual_capacity: get(row, map.annual_capacity),
      categories: toArray(get(row, map.categories)),
      certifications: toArray(get(row, map.certifications)),
      formats: toArray(get(row, map.formats)),
      markets_served: toArray(get(row, map.markets_served)),
      tags: toArray(get(row, map.tags)),
      primary_ingredients: toArray(get(row, map.primary_ingredients)),
      private_label: toBool(get(row, map.private_label)),
      own_brand: toBool(get(row, map.own_brand)),
      verified: toBool(get(row, map.verified)),
      priority: parseInt(get(row, map.priority) ?? "0", 10) || 0,
      status: toStatus(get(row, map.status)),
      price_positioning: toPricePositioning(get(row, map.price_positioning)),
      sourcing_notes: get(row, map.sourcing_notes),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabaseAdmin.from("supplier_offerings").insert(record);

    if (error) {
      console.error(`  ✗ ${company_name}: ${error.message}`);
      skipped++;
    } else {
      inserted++;
    }
  }

  return { inserted, skipped };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const fileArg = process.argv.find((a) => a.startsWith("--file="))?.slice(7);
  const filesToProcess = fileArg
    ? [fileArg]
    : Object.keys(MAPS);

  if (DRY_RUN) {
    console.log("\n── DRY RUN: column discovery ─────────────────────────────");
  }

  let totalInserted = 0;
  let totalSkipped = 0;

  for (const filename of filesToProcess) {
    if (!DRY_RUN) console.log(`\nProcessing ${filename}…`);
    const { inserted, skipped } = await processFile(filename);
    totalInserted += inserted;
    totalSkipped += skipped;
    if (!DRY_RUN) {
      console.log(`  ✓ ${inserted} inserted  ·  ✗ ${skipped} skipped`);
    }
  }

  if (DRY_RUN) {
    console.log("\n──────────────────────────────────────────────────────────");
    console.log("No changes made. Update MAPS and remove DRY_RUN=true to import.");
  } else {
    console.log(`\nTotal: ✓ ${totalInserted} inserted  ·  ✗ ${totalSkipped} skipped`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
